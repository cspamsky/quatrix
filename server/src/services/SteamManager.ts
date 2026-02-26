import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { taskService } from './TaskService.js';

export class SteamManager {
  async ensureSteamCMD(steamCmdExe: string, _taskId?: string): Promise<boolean> {
    try {
      await fs.promises.access(steamCmdExe);
      return true;
    } catch {
      return false;
    }
  }

  async downloadSteamCmd(targetExe: string, _taskId?: string): Promise<void> {
    const steamCmdDir = path.dirname(targetExe);

    try {
      await fs.promises.mkdir(steamCmdDir, { recursive: true });
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code !== 'EEXIST') throw error;
    }

    const archiveName = 'steamcmd_linux.tar.gz';
    const archivePath = path.join(steamCmdDir, archiveName);
    const url = 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz';

    console.log(`Downloading Linux SteamCMD to ${steamCmdDir}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download SteamCMD: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    await fs.promises.writeFile(archivePath, Buffer.from(arrayBuffer));

    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    console.log(`Extracting Linux SteamCMD...`);
    await execFileAsync('tar', ['-xzf', archivePath, '-C', steamCmdDir]);

    await fs.promises.unlink(archivePath);
    console.log('[STEAM] SteamCMD installation complete.');
  }

  async installOrUpdateServer(
    instanceId: string | number,
    steamCmdExe: string,
    installDir: string,
    onLog?: (data: string) => void,
    taskId?: string
  ): Promise<void> {
    const id = instanceId.toString();
    const serverPath = path.join(installDir, id);
    return this.installToPath(serverPath, steamCmdExe, onLog, taskId);
  }

  async installToPath(
    targetPath: string,
    steamCmdExe: string,
    onLog?: (data: string) => void,
    taskId?: string
  ): Promise<void> {
    try {
      await fs.promises.mkdir(targetPath, { recursive: true });
      if (process.platform === 'linux') {
        // Ensure SteamCMD can write regardless of current user/mask
        await fs.promises.chmod(targetPath, 0o777);
      }
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code !== 'EEXIST') throw error;
    }

    // Recursive chmod on Linux to handle nested permission issues
    if (process.platform === 'linux') {
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        await execAsync(`chmod -R 777 "${targetPath}"`);
        await execAsync(`chmod -R 777 "${path.dirname(steamCmdExe)}"`);
      } catch (e) {
        console.warn('[STEAM] Non-critical: Failed to recursive chmod:', e);
      }
    }

    return new Promise((resolve, reject) => {
      const steamCmdParams = [
        '+force_install_dir',
        targetPath,
        '+login',
        'anonymous',
        '+app_update',
        '730',
        'validate',
        '+quit',
      ];

      // Use a dedicated HOME for steamcmd to avoid root/permission issues in ~/.steam
      const steamHome = path.dirname(steamCmdExe);

      const steamCmdProcess = spawn(steamCmdExe, steamCmdParams, {
        env: {
          ...process.env,
          HOME: steamHome,
        },
      });

      let stdoutBuffer = '';
      steamCmdProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          console.error(`[STEAMCMD ERROR] ${message}`);
          if (onLog) onLog(message);
        }
      });

      steamCmdProcess.stdout.on('data', (data) => {
        stdoutBuffer += data.toString();
        const lines = stdoutBuffer.split(/\r?\n|\r/);
        stdoutBuffer = lines.pop() || '';
        lines.forEach((line) => {
          if (line.trim()) {
            const message = line.trim();
            console.log(`[STEAMCMD] ${message}`);
            if (onLog) onLog(message);

            if (taskId) {
              // Pattern: Update state (0x3) downloading, progress: 1.23 (123456 / 1234567)
              // Pattern: Update state (0x5) verifying, progress: 50.00 (123456 / 246912)
              const progressMatch = message.match(/progress: ([\d.]+)/);
              const currentTaskId = taskId;
              if (progressMatch && progressMatch[1] && typeof currentTaskId === 'string') {
                const progress = parseFloat(progressMatch[1]);
                let statusMsg = 'tasks.messages.downloading';
                if (message.includes('verifying')) statusMsg = 'tasks.messages.verifying';
                if (message.includes('preallocating')) statusMsg = 'tasks.messages.preallocating';

                taskService.updateTask(currentTaskId, {
                  progress,
                  status: 'running',
                  message: statusMsg,
                });
              }
            }
          }
        });
      });

      steamCmdProcess.on('close', (code) => {
        const finalTaskId = taskId;
        if (code === 0) {
          if (typeof finalTaskId === 'string') {
            taskService.completeTask(finalTaskId, 'tasks.messages.server_install_success');
          }
          resolve();
        } else {
          const error = `SteamCMD failed with code ${code}`;
          if (typeof finalTaskId === 'string') {
            taskService.failTask(finalTaskId, 'tasks.messages.install_failed');
          }
          reject(new Error(error));
        }
      });
    });
  }
}

export const steamManager = new SteamManager();
