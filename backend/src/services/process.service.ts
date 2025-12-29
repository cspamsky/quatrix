import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';
import { steamcmdService } from './steamcmd.service';
import { terminalService } from './terminal.service';
import { prisma } from '../utils/prisma';

interface StartServerOptions {
    id: string;
    port: number;
    map: string;
    maxPlayers: number;
    gameMode: string;
    gsltToken: string;
    steamAuthKey?: string;
    rconPassword?: string;
    workshopCollection?: string;
    workshopMapId?: string;
}

class ProcessService {
    private activeProcesses: Map<string, ChildProcess> = new Map();

    /**
     * Starts a CS2 server process
     */
    public async startServer(options: StartServerOptions): Promise<void> {
        if (this.activeProcesses.has(options.id)) {
            throw new Error(`Server ${options.id} is already running.`);
        }

        const serverPath = steamcmdService.getServerPath(options.id);

        // Determine the executable path based on OS
        // CS2 structure: game/bin/win64/cs2.exe or game/bin/linuxsteamrt64/cs2
        const isWin = process.platform === 'win32';
        const relativeExePath = isWin
            ? path.join('game', 'bin', 'win64', 'cs2.exe')
            : path.join('game', 'bin', 'linuxsteamrt64', 'cs2');

        const fullExePath = path.join(serverPath, relativeExePath);

        // Engine Parameters (-)
        const engineArgs = [
            '-dedicated',
            '-usercon',
            '-ip', '0.0.0.0',
            '-port', options.port.toString(),
            '-maxplayers', options.maxPlayers.toString(),
            '-insecure',
            '-allow_third_party_software',
            '-nobreakpad',
            '-nomessagebox'
        ];

        if (options.steamAuthKey) {
            engineArgs.push('-authkey', options.steamAuthKey);
        } else if (options.workshopCollection || options.workshopMapId) {
            logger.warn(`Server ${options.id} is using Workshop features but no steamAuthKey (-authkey) is provided. This may fail.`);
        }

        // Console Variables (+)
        const conVars = [
            '+sv_visiblemaxplayers', options.maxPlayers.toString(),
            '+sv_setsteamaccount', options.gsltToken,
            '+rcon_password', options.rconPassword || ''
        ];

        // Add Workshop Collection if provided
        if (options.workshopCollection) {
            conVars.push('+host_workshop_collection', options.workshopCollection);
        }

        // If Workshop Map is provided, use it as starting map. Otherwise fallback to local map.
        if (options.workshopMapId) {
            conVars.push('+host_workshop_map', options.workshopMapId);
        } else {
            conVars.push('+map', options.map);
        }

        const args = [...engineArgs, ...conVars];

        if (!fs.existsSync(fullExePath)) {
            throw new Error(`Executable not found at ${fullExePath}`);
        }

        const workDir = path.dirname(fullExePath); // Run from bin directory

        // FIX: Start - Ensure Steam environment is correct
        try {
            // 1. Create steam_appid.txt
            const appIdPath = path.join(workDir, 'steam_appid.txt');
            if (!fs.existsSync(appIdPath)) {
                fs.writeFileSync(appIdPath, '730');
                logger.info(`Created steam_appid.txt at ${appIdPath}`);
            }

            // 2. Create userdata folder to prevent USRLOCAL error
            const userDataPath = path.join(workDir, 'userdata');
            if (!fs.existsSync(userDataPath)) {
                fs.mkdirSync(userDataPath, { recursive: true });
                logger.info(`Created userdata folder at ${userDataPath}`);
            }
        } catch (error: any) {
            logger.warn(`Steam setup warning: ${error.message}`);
        }
        // FIX: End

        logger.info(`Launching CS2 server ${options.id} on port ${options.port}`);
        logger.info(`  > Executable: ${fullExePath}`);
        logger.info(`  > Working Dir: ${workDir}`);
        logger.info(`  > Args: ${args.join(' ')}`);

        const serverProcess = spawn(fullExePath, args, {
            cwd: workDir,
            shell: false,
            windowsHide: true, // Reverting to true for cleaner background operation
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env, // Pass full environment to avoid missing critical Windows vars
                // Steam specific overrides
                SteamAppId: '730',
                SteamGameId: '730',
                SteamClientLaunch: '1'
            }
        });

        this.activeProcesses.set(options.id, serverProcess);

        // Output is handled manually below with filtering and decoding
        // terminalService.attachOutputForwarding(options.id);

        const filterSpam = (data: Buffer): string | null => {
            const output = data.toString('utf8');
            const lines = output.split(/\r?\n/);
            const filtered = lines
                .filter(l => l.trim().length > 0)
                .filter(l => !l.includes('CTextConsoleWin::GetLine: !GetNumberOfConsoleInputEvents'))
                .filter(l => !l.includes('Could not PreloadLibrary')); // Also filter these confusing warnings

            return filtered.length > 0 ? filtered.join('\r\n') + '\r\n' : null;
        };

        serverProcess.stdout?.on('data', (data: Buffer) => {
            const filtered = filterSpam(data);
            if (filtered) {
                logger.debug(`[Server ${options.id}]: ${filtered.trim()}`);
                terminalService.streamOutput(options.id, filtered);
            }
        });

        serverProcess.stderr?.on('data', (data: Buffer) => {
            const filtered = filterSpam(data);
            if (filtered) {
                logger.error(`[Server ${options.id} Error]: ${filtered.trim()}`);
                terminalService.streamOutput(options.id, `\x1b[31m${filtered}\x1b[0m`);
            }
        });

        serverProcess.on('close', async (code) => {
            const exitMsg = code === 3221225786 ? 'Kullanıcı tarafından veya sistemce kapatıldı' : `Exit code: ${code}`;
            logger.info(`Server ${options.id} process exited. ${exitMsg}`);
            terminalService.streamOutput(options.id, `\x1b[31m\n[Quatrix] Sunucu kapandı (${exitMsg})\x1b[0m\n`);
            this.activeProcesses.delete(options.id);

            // Update status in database
            try {
                await prisma.server.update({
                    where: { id: options.id },
                    data: { status: 'STOPPED' }
                });
            } catch (err) {
                logger.error(`Failed to update server status after exit: ${err}`);
            }
        });

        serverProcess.on('error', (err) => {
            logger.error(`Failed to start server ${options.id}: ${err.message}`);
            terminalService.streamOutput(options.id, `\x1b[31m\n[Quatrix] Başlatma hatası: ${err.message}\x1b[0m\n`);
            this.activeProcesses.delete(options.id);
        });
    }

    /**
     * Stops a CS2 server process
     */
    public async stopServer(serverId: string): Promise<void> {
        const serverProcess = this.activeProcesses.get(serverId);
        if (!serverProcess) {
            logger.warn(`Attempted to stop server ${serverId} but it's not in active list.`);
            return;
        }

        return new Promise((resolve) => {
            const forceKillTimeout = setTimeout(() => {
                if (this.activeProcesses.has(serverId)) {
                    logger.warn(`Server ${serverId} didn't stop gracefully, force killing...`);
                    serverProcess.kill('SIGKILL');
                }
            }, 10000);

            serverProcess.once('close', () => {
                clearTimeout(forceKillTimeout);
                resolve();
            });

            logger.info(`Stopping server ${serverId}...`);
            serverProcess.kill('SIGTERM');
        });
    }

    /**
     * Checks if a server process is currently tracked as active
     */
    public isRunning(serverId: string): boolean {
        return this.activeProcesses.has(serverId);
    }

    /**
     * Get the process instance for advanced control (like terminal streaming)
     */
    public getProcess(serverId: string): ChildProcess | undefined {
        return this.activeProcesses.get(serverId);
    }
}

export const processService = new ProcessService();
