import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileSystemService } from '../FileSystemService.js';
import db from '../../db.js';

export class RuntimeLogWatcher {
  private watchers: Map<string, fs.FSWatcher> = new Map();

  constructor() {
    // Periodic check for log rotation (Every 10 minutes)
    setInterval(() => this.rotateLogs(), 600000).unref();
  }

  /**
   * Starts watching a console.log file for an instance
   */
  startWatching(id: string, logFilePath: string, onData: (buffer: Buffer) => void): void {
    // Stop existing watcher if any
    this.stopWatching(id);

    if (!fs.existsSync(logFilePath)) {
      fs.writeFileSync(logFilePath, '');
    }

    let currentSize = fs.statSync(logFilePath).size;

    try {
      const watcher = fs.watch(logFilePath, (event) => {
        if (event === 'change') {
          try {
            if (!fs.existsSync(logFilePath)) return; // File might be rotating

            const stats = fs.statSync(logFilePath);
            const newSize = stats.size;

            if (newSize > currentSize) {
              const bufferSize = newSize - currentSize;
              // Safety check for huge jumps
              if (bufferSize > 5 * 1024 * 1024) {
                currentSize = newSize;
                return;
              }

              const buffer = Buffer.alloc(bufferSize);
              const fd = fs.openSync(logFilePath, 'r');
              fs.readSync(fd, buffer, 0, bufferSize, currentSize);
              fs.closeSync(fd);

              currentSize = newSize;
              onData(buffer);
            } else if (newSize < currentSize) {
              // File was truncated or rotated
              currentSize = newSize;
            }
          } catch {
            // Silent fail for log read errors to prevent backend crash
          }
        }
      });

      this.watchers.set(id, watcher);
    } catch (error: unknown) {
      console.error(`[LogWatcher] Failed to start log watcher for ${id}:`, error);
    }
  }

  /**
   * Stops watching an instance's log file
   */
  stopWatching(id: string): void {
    const watcher = this.watchers.get(id);
    if (watcher) {
      watcher.close();
      this.watchers.delete(id);
    }
  }

  /**
   * Rotates large logs and cleans up old round backups
   */
  public async rotateLogs(): Promise<void> {
    const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_RETENTION = 5; // Keep last 5 files

    try {
      const servers = db.prepare('SELECT id FROM servers').all() as { id: number }[];
      for (const server of servers) {
        const id = server.id.toString();
        const instancePath = fileSystemService.getInstancePath(id);
        const logPath = path.join(instancePath, 'console.log');
        const logsDir = path.join(instancePath, 'logs');

        // 1. Check Console Log Size
        if (fs.existsSync(logPath)) {
          const stats = fs.statSync(logPath);
          if (stats.size > MAX_LOG_SIZE) {
            console.log(
              `[LogWatcher] Rotating log for instance ${id} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`
            );

            // Ensure logs directory exists
            if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

            // Generate timestamped filename
            const date = new Date();
            const timestamp = date.toISOString().replace(/[:.]/g, '-');
            const archiveName = `console-${timestamp}.log`;
            const archivePath = path.join(logsDir, archiveName);

            try {
              // Rename current log (Fast)
              // We copy and truncate instead of rename to avoid breaking the file handle of the running process?
              // Actually, since we use 'fs.openSync(..., 'a')' in RuntimeService for every spawn,
              // the process holds the FD. Renaming/Deleting works on Linux (inode preserved),
              // but writing to it continues to the old inode (rotated file).
              // We MUST copytruncate or restart the process.
              // BUT: NodeJS 'fs.watch' might lose track if we rename.
              // TRICK: Truncate is risky for data integrity but safer for process continuity if we can't signal SIGHUP.
              // Since CS2 is a child process writing to an FD we passed:
              //   - If we rename, CS2 keeps writing to the renamed file.
              //   - We need to tell CS2 to switch? We can't easily.
              //   - So we have to accept that CS2 will write to the old file?
              //   - WAIT: RuntimeService passes 'logFd' to spawn.
              //   - Linux: 'mv console.log old.log' -> CS2 continues writing to 'old.log'.
              //   - We want CS2 to write to a NEW 'console.log'.
              //   - Without restarting CS2, we cannot change its STDOUT FD easily.
              //   - STANDARD TRICK: "copytruncate".
              //     1. Copy console.log -> archive.log
              //     2. Truncate console.log to 0.
              //     *Risk*: Data written between copy and truncate is lost. Accepted in high-throughput logs.

              // 1. Read content
              const content = fs.readFileSync(logPath);
              // 2. Write to archive
              fs.writeFileSync(archivePath, content);
              // 3. Truncate original
              fs.truncateSync(logPath, 0);

              // 4. Compress archive async
              this.compressFile(archivePath);
            } catch (err) {
              console.error(`[LogWatcher] Rotation error for ${id}:`, err);
            }
          }
        }

        // 2. Cleanup Old Logs (Retention Policy)
        if (fs.existsSync(logsDir)) {
          const files = fs
            .readdirSync(logsDir)
            .filter((f) => f.startsWith('console-') && f.endsWith('.gz'))
            .map((f) => ({
              name: f,
              time: fs.statSync(path.join(logsDir, f)).mtime.getTime(),
            }))
            .sort((a, b) => b.time - a.time); // Newest first

          if (files.length > MAX_RETENTION) {
            const toDelete = files.slice(MAX_RETENTION);
            for (const file of toDelete) {
              try {
                fs.unlinkSync(path.join(logsDir, file.name));
                console.log(`[LogWatcher] Deleted old log: ${file.name}`);
              } catch {
                /* ignore */
              }
            }
          }
        }

        // 3. Cleanup Round Backups (backup_round*.txt)
        const csgoDir = path.join(instancePath, 'game', 'csgo');
        if (fs.existsSync(csgoDir)) {
          const files = fs.readdirSync(csgoDir);
          const backups = files.filter((f) => f.startsWith('backup_round') && f.endsWith('.txt'));
          for (const f of backups) {
            try {
              fs.unlinkSync(path.join(csgoDir, f));
            } catch {
              /* ignore */
            }
          }
        }
      }
    } catch (error: unknown) {
      console.warn('[LogWatcher] Maintenance failed:', error);
    }
  }

  private compressFile(filePath: string) {
    const gzip = zlib.createGzip();
    const source = fs.createReadStream(filePath);
    const destination = fs.createWriteStream(`${filePath}.gz`);

    source
      .pipe(gzip)
      .pipe(destination)
      .on('finish', () => {
        try {
          fs.unlinkSync(filePath); // Remove uncompressed archive after success
        } catch (err) {
          console.error(`[LogWatcher] Failed to delete raw archive ${filePath}:`, err);
        }
      });
  }
}

export const runtimeLogWatcher = new RuntimeLogWatcher();
