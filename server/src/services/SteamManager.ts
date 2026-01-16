import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import db from '../db.js';

export class SteamManager {
    private isWindows = process.platform === 'win32';

    async ensureSteamCMD(steamCmdExe: string): Promise<boolean> {
        return fs.existsSync(steamCmdExe);
    }

    async downloadSteamCmd(targetExe: string): Promise<void> {
        const steamCmdDir = path.dirname(targetExe);
        if (!fs.existsSync(steamCmdDir)) {
            fs.mkdirSync(steamCmdDir, { recursive: true });
        }

        const zipPath = path.join(steamCmdDir, 'steamcmd.zip');
        const url = 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip';

        console.log(`Downloading SteamCMD to ${steamCmdDir}`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to download SteamCMD: ${response.statusText}`);
        
        const arrayBuffer = await response.arrayBuffer();
        fs.writeFileSync(zipPath, Buffer.from(arrayBuffer));

        const AdmZip = (await import('adm-zip')).default;
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(steamCmdDir, true);

        fs.unlinkSync(zipPath);
    }

    async installOrUpdateServer(instanceId: string | number, steamCmdExe: string, installDir: string, onLog?: (data: string) => void): Promise<void> {
        const id = instanceId.toString();
        const serverPath = path.join(installDir, id);
        
        if (!fs.existsSync(serverPath)) {
            fs.mkdirSync(serverPath, { recursive: true });
        }

        return new Promise((resolve, reject) => {
            const steamCmdParams = [
                '+force_install_dir', serverPath,
                '+login', 'anonymous',
                '+app_update', '730', 'validate',
                '+quit'
            ];

            const steamCmdProcess = spawn(steamCmdExe, steamCmdParams);

            let stdoutBuffer = '';
            steamCmdProcess.stdout.on('data', (data) => {
                stdoutBuffer += data.toString();
                const lines = stdoutBuffer.split(/\r?\n|\r/);
                stdoutBuffer = lines.pop() || '';
                lines.forEach(line => {
                    if (line.trim() && onLog) onLog(line.trim());
                });
            });

            steamCmdProcess.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`SteamCMD failed with code ${code}`));
            });
        });
    }
}

export const steamManager = new SteamManager();
