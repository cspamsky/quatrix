import db from '../db.js';
import { fileSystemService } from './FileSystemService.js';
import { taskService } from './TaskService.js';
import { databaseManager } from './DatabaseManager.js';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export interface BackupMetadata {
  id: string;
  serverId: string | number;
  filename: string;
  size: number;
  createdAt: number;
  type: 'manual' | 'auto';
  comment?: string;
}

interface BackupRow {
  id: string;
  server_id: number;
  filename: string;
  size: number;
  type: 'manual' | 'auto';
  comment: string | null;
  created_at: string;
}

interface ServerRow {
  id: number;
  is_installed: number;
}

class BackupService {
  private backupDir: string;
  private tempDir: string;

  constructor() {
    this.backupDir = path.join(process.cwd(), 'data', 'backups');
    this.tempDir = path.join(process.cwd(), 'data', 'temp');
    this.init();
  }

  private init() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY,
        server_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        size INTEGER NOT NULL,
        type TEXT NOT NULL,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  public async createBackup(
    serverId: string | number,
    type: 'manual' | 'auto' = 'manual',
    comment?: string,
    taskId?: string
  ): Promise<string> {
    const safeServerId = serverId.toString().replace(/[^a-zA-Z0-9]/g, '');
    if (!safeServerId) throw new Error('Invalid server ID');

    const dataDir = path.resolve(process.cwd(), 'data');
    const id = Date.now().toString();
    const filename = `backup_${safeServerId}_${id}.zip`;
    const targetPath = path.resolve(this.backupDir, filename);

    if (!targetPath.startsWith(this.backupDir))
      throw new Error('Security Error: Invalid backup target path');

    if (taskId)
      taskService.updateTask(taskId, { progress: 5, message: 'tasks.messages.backup_starting' });

    try {
      const zip = new AdmZip();
      const instancePath = fileSystemService.getInstancePath(serverId);
      if (!fs.existsSync(instancePath)) throw new Error('Server folder not found.');

      if (taskId)
        taskService.updateTask(taskId, { progress: 20, message: 'tasks.messages.packaging_files' });

      // Exclusion patterns: Added .sql and .sqlite to exclude clutter, but server_database.sql is handled separately
      const excludePatterns = ['.log', '.tmp', '.tar.gz', '.zip', 'backups'];

      const addFolderRecursive = (localPath: string, zipPath: string) => {
        if (!fs.existsSync(localPath)) return;
        const files = fs.readdirSync(localPath);
        for (const file of files) {
          if (excludePatterns.some((p) => file.includes(p))) continue;
          if (file === 'core' || /^core\.\d+$/.test(file)) continue;

          const fullPath = path.join(localPath, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            addFolderRecursive(fullPath, path.join(zipPath, file));
          } else {
            zip.addLocalFile(fullPath, zipPath);
          }
        }
      };

      const csgoCfgPath = path.join(instancePath, 'game', 'csgo', 'cfg');
      if (fs.existsSync(csgoCfgPath)) addFolderRecursive(csgoCfgPath, 'game/csgo/cfg');

      const csgoAddonsPath = path.join(instancePath, 'game', 'csgo', 'addons');
      if (fs.existsSync(csgoAddonsPath)) addFolderRecursive(csgoAddonsPath, 'game/csgo/addons');

      // 2. Panel Database Backup (SQLite)
      const sqlitePath = path.resolve(dataDir, 'database.sqlite');
      if (fs.existsSync(sqlitePath)) {
        const sqliteBackupPath = path.resolve(dataDir, `database_temp_${id}.sqlite`);
        fs.copyFileSync(sqlitePath, sqliteBackupPath);
        zip.addLocalFile(sqliteBackupPath, '', 'panel_database.sqlite');
      }

      // 3. CS2 Server Database Backup (MySQL)
      const creds = await databaseManager.getDatabaseCredentials(serverId);
      let mysqlBackupFile = '';
      if (creds && (await databaseManager.isAvailable())) {
        if (taskId)
          taskService.updateTask(taskId, { progress: 50, message: 'tasks.messages.dumping_mysql' });
        mysqlBackupFile = path.resolve(dataDir, `mysql_dump_${safeServerId}_${id}.sql`);

        try {
          const dumpProcess = spawn('mysqldump', [
            '-h',
            creds.host,
            '-P',
            creds.port.toString(),
            '-u',
            creds.user,
            `-p${creds.password}`,
            creds.database,
          ]);
          const writeStream = fs.createWriteStream(mysqlBackupFile);
          dumpProcess.stdout.pipe(writeStream);

          await new Promise<void>((resolve, reject) => {
            dumpProcess.on('close', (code) =>
              code === 0 ? resolve() : reject(new Error(`mysqldump exited with code ${code}`))
            );
            dumpProcess.on('error', reject);
            writeStream.on('error', reject);
          });
          if (fs.existsSync(mysqlBackupFile))
            zip.addLocalFile(mysqlBackupFile, '', 'server_database.sql');
        } catch (dumpErr) {
          console.error('[BackupService] MySQL Dump failed:', dumpErr);
        }
      }

      if (taskId)
        taskService.updateTask(taskId, {
          progress: 80,
          message: 'tasks.messages.creating_archive',
        });
      await zip.writeZipPromise(targetPath);

      if (taskId)
        taskService.updateTask(taskId, { progress: 95, message: 'tasks.messages.finalizing' });

      // Cleanup temp files
      const sqliteTemp = path.resolve(dataDir, `database_temp_${id}.sqlite`);
      if (fs.existsSync(sqliteTemp)) fs.unlinkSync(sqliteTemp);
      if (mysqlBackupFile && fs.existsSync(mysqlBackupFile)) fs.unlinkSync(mysqlBackupFile);

      const stats = fs.statSync(targetPath);
      db.prepare(
        `INSERT INTO backups (id, server_id, filename, size, type, comment) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(id, serverId, filename, stats.size, type, comment || '');

      if (type === 'auto') await this.cleanupOldBackups(serverId);
      if (taskId) taskService.completeTask(taskId, 'tasks.messages.backup_success');

      return id;
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[BackupService] Backup error:', err);
      if (taskId) taskService.failTask(taskId, `tasks.messages.backup_failed`);
      throw err;
    }
  }

  public async handleExternalUpload(
    serverId: string | number,
    tempPath: string,
    originalName: string,
    comment?: string,
    taskId?: string
  ) {
    const safeServerId = serverId.toString().replace(/[^a-zA-Z0-9]/g, '');
    const resolvedTempPath = path.resolve(tempPath);
    const id = Date.now().toString();
    // Ensure the temporary path is within the expected temp directory
    if (!resolvedTempPath.startsWith(this.tempDir + path.sep)) {
      throw new Error('Invalid temporary upload path');
    }

    const filename = `backup_${safeServerId}_${id}.zip`;
    const targetPath = path.resolve(this.backupDir, filename);

    try {
      if (taskId)
        taskService.updateTask(taskId, { progress: 50, message: 'tasks.messages.moving_files' });

      // Move temp file to backup directory
      fs.copyFileSync(resolvedTempPath, targetPath);
      fs.unlinkSync(resolvedTempPath);

      const stats = fs.statSync(targetPath);
      db.prepare(
        `INSERT INTO backups (id, server_id, filename, size, type, comment) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(id, serverId, filename, stats.size, 'manual', comment || `Uploaded: ${originalName}`);

      return id;
    } catch (error) {
      if (fs.existsSync(resolvedTempPath)) fs.unlinkSync(resolvedTempPath);
      if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
      throw error;
    }
  }

  public getBackups(serverId: string | number): BackupMetadata[] {
    const rows = db
      .prepare('SELECT * FROM backups WHERE server_id = ? ORDER BY created_at DESC')
      .all(serverId) as BackupRow[];
    return rows.map((row) => {
      const metadata: BackupMetadata = {
        id: row.id,
        serverId: row.server_id,
        filename: row.filename,
        size: row.size,
        type: row.type,
        createdAt: new Date(row.created_at).getTime(),
      };
      if (row.comment) metadata.comment = row.comment;
      return metadata;
    });
  }

  public async deleteBackup(id: string) {
    const row = db.prepare('SELECT filename FROM backups WHERE id = ?').get(id) as
      | { filename: string }
      | undefined;
    if (row) {
      const filePath = path.resolve(this.backupDir, row.filename);
      if (fs.existsSync(filePath)) await fs.promises.unlink(filePath);
      db.prepare('DELETE FROM backups WHERE id = ?').run(id);
    }
  }

  public getBackupPath(id: string): string {
    const row = db.prepare('SELECT filename FROM backups WHERE id = ?').get(id) as
      | { filename: string }
      | undefined;
    if (!row) throw new Error('Backup not found.');
    const filePath = path.resolve(this.backupDir, row.filename);
    if (!fs.existsSync(filePath)) throw new Error('Backup file not found physically.');
    return filePath;
  }

  public async restoreBackup(id: string, taskId?: string) {
    const row = db.prepare('SELECT * FROM backups WHERE id = ?').get(id) as
      | { server_id: number; filename: string }
      | undefined;
    if (!row) throw new Error('Backup not found.');

    const serverId = row.server_id;
    const filePath = path.resolve(this.backupDir, row.filename);
    const instancePath = fileSystemService.getInstancePath(serverId);
    if (!fs.existsSync(filePath)) throw new Error('Backup file not found physically.');

    if (taskId)
      taskService.updateTask(taskId, { progress: 10, message: 'tasks.messages.opening_backup' });
    const tempExtractPath = path.resolve(process.cwd(), 'data', `restore_temp_${Date.now()}`);

    try {
      const zip = new AdmZip(filePath);
      if (taskId)
        taskService.updateTask(taskId, {
          progress: 30,
          message: 'tasks.messages.extracting_files',
        });

      if (!fs.existsSync(tempExtractPath)) fs.mkdirSync(tempExtractPath, { recursive: true });
      zip.extractAllTo(tempExtractPath, true);

      if (taskId)
        taskService.updateTask(taskId, { progress: 50, message: 'tasks.messages.moving_files' });
      const copyFolderRecursive = (src: string, dest: string) => {
        if (!fs.existsSync(src)) return;
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);
          if (entry.isDirectory()) copyFolderRecursive(srcPath, destPath);
          else fs.copyFileSync(srcPath, destPath);
        }
      };

      const gamePath = path.join(tempExtractPath, 'game');
      if (fs.existsSync(gamePath)) copyFolderRecursive(gamePath, path.join(instancePath, 'game'));

      // 3. MySQL Restore
      const serverDatabaseFile = path.join(tempExtractPath, 'server_database.sql');
      if (fs.existsSync(serverDatabaseFile)) {
        if (taskId)
          taskService.updateTask(taskId, {
            progress: 70,
            message: 'tasks.messages.restoring_mysql',
          });
        const creds = await databaseManager.getDatabaseCredentials(serverId);
        if (creds && (await databaseManager.isAvailable())) {
          console.log(`[BackupService] Starting MySQL restore for server ${serverId}...`);
          const restoreProcess = spawn('mysql', [
            '-h',
            creds.host,
            '-P',
            creds.port.toString(),
            '-u',
            creds.user,
            `-p${creds.password}`,
            creds.database,
          ]);
          const readStream = fs.createReadStream(serverDatabaseFile);
          readStream.pipe(restoreProcess.stdin);

          let errorOutput = '';
          restoreProcess.stderr.on('data', (d) => (errorOutput += d.toString()));

          await new Promise<void>((resolve, reject) => {
            restoreProcess.on('close', (code) => {
              if (code === 0) {
                console.log(`[BackupService] MySQL database successfully restored for ${serverId}`);
                resolve();
              } else {
                console.error(
                  `[BackupService] MySQL import failed with code ${code}. Error: ${errorOutput}`
                );
                reject(new Error(`mysql import failed: ${errorOutput}`));
              }
            });
            restoreProcess.on('error', reject);
            readStream.on('error', reject);
          });
        }
      }

      if (taskId) taskService.completeTask(taskId, 'tasks.messages.restore_success');
    } catch (error: unknown) {
      console.error('[BackupService] Restore error:', error);
      if (taskId) taskService.failTask(taskId, `tasks.messages.restore_failed`);
      throw error;
    } finally {
      if (fs.existsSync(tempExtractPath))
        fs.rmSync(tempExtractPath, { recursive: true, force: true });
    }
  }

  private async cleanupOldBackups(serverId: string | number) {
    const limitSetting = db
      .prepare("SELECT value FROM settings WHERE key = 'backup_retention_limit'")
      .get() as { value: string } | undefined;
    const limit = parseInt(limitSetting?.value || '7');
    const backups = db
      .prepare(
        "SELECT id, filename FROM backups WHERE server_id = ? AND type = 'auto' ORDER BY created_at ASC"
      )
      .all(serverId) as Pick<BackupRow, 'id' | 'filename'>[];
    if (backups.length > limit) {
      for (const backup of backups.slice(0, backups.length - limit))
        await this.deleteBackup(backup.id);
    }
  }

  public startScheduledBackups() {
    console.log('\x1b[32m[SYSTEM]\x1b[0m Scheduled Backup Service initialized.');
    setInterval(async () => {
      const now = new Date();
      const autoEnabled = db
        .prepare("SELECT value FROM settings WHERE key = 'backup_auto_enabled'")
        .get() as { value: string } | undefined;
      if (autoEnabled?.value !== 'true') return;

      const timeSetting = db
        .prepare("SELECT value FROM settings WHERE key = 'backup_schedule_time'")
        .get() as { value: string } | undefined;
      const [schedHours, schedMinutes] = (timeSetting?.value || '03:00')
        .split(':')
        .map((n) => parseInt(n));

      if (now.getHours() === schedHours && now.getMinutes() === schedMinutes) {
        const freqSetting = db
          .prepare("SELECT value FROM settings WHERE key = 'backup_frequency'")
          .get() as { value: string } | undefined;
        const shouldRun =
          freqSetting?.value === 'daily' ||
          (freqSetting?.value === 'weekly' && now.getDay() === 0) ||
          (freqSetting?.value === 'monthly' && now.getDate() === 1);

        if (shouldRun) {
          const servers = db.prepare('SELECT id, is_installed FROM servers').all() as ServerRow[];
          for (const s of servers)
            if (s.is_installed) await this.createBackup(s.id, 'auto', `Automated Backup`);
        }
      }
    }, 60000);
  }
}

export const backupService = new BackupService();
