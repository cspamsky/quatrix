import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';
import { steamcmdService } from './steamcmd.service';
import { terminalService } from './terminal.service';

interface StartServerOptions {
    id: string;
    port: number;
    map: string;
    maxPlayers: number;
    gameMode: string;
    gsltToken: string;
    workshopCollection?: string;
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

        const args = [
            '-dedicated',
            '-usercon', // Required for RCON
            '-console',
            '+port', options.port.toString(),
            '+map', options.map,
            '+maxplayers', options.maxPlayers.toString(),
            '+sv_setsteamaccount', options.gsltToken,
        ];

        // Add Workshop Collection if provided
        if (options.workshopCollection) {
            args.push('+host_workshop_collection', options.workshopCollection);
        }

        if (!fullExePath) {
            throw new Error(`Could not determine executable path for platform ${process.platform}`);
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
            logger.warn(`Failed to setup Steam environment: ${error.message}`);
        }
        // FIX: End

        logger.info(`Launching CS2 server ${options.id}`);
        logger.info(`  > Executable: ${fullExePath}`);
        logger.info(`  > Working Dir: ${workDir}`);
        logger.info(`  > Args: ${args.join(' ')}`);

        const serverProcess = spawn(fullExePath, args, {
            cwd: workDir,
            shell: false,
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                // Do not pass ...process.env to avoid pollution from development environment
                // But we MUST pass basic Windows user environment variables
                SystemRoot: process.env.SystemRoot,
                PATH: process.env.PATH,
                USERPROFILE: process.env.USERPROFILE,
                APPDATA: process.env.APPDATA,
                LOCALAPPDATA: process.env.LOCALAPPDATA,
                TEMP: process.env.TEMP,
                TMP: process.env.TMP,
                HOMEDRIVE: process.env.HOMEDRIVE,
                HOMEPATH: process.env.HOMEPATH,

                // Steam specific
                SteamAppId: '730',
                SteamGameId: '730',
                SteamClientLaunch: '1' // Sometimes helps emulate launch from Steam
            }
        });

        this.activeProcesses.set(options.id, serverProcess);

        // Dynamic output forwarding to Socket.io
        terminalService.attachOutputForwarding(options.id);

        serverProcess.stdout?.on('data', (data) => {
            logger.debug(`[Server ${options.id}]: ${data.toString().trim()}`);
        });

        serverProcess.stderr?.on('data', (data) => {
            logger.error(`[Server ${options.id} Error]: ${data.toString().trim()}`);
        });

        serverProcess.on('close', (code) => {
            logger.info(`Server ${options.id} process exited with code ${code}`);
            this.activeProcesses.delete(options.id);
        });

        serverProcess.on('error', (err) => {
            logger.error(`Failed to start server ${options.id}: ${err.message}`);
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

        logger.info(`Stopping server ${serverId}...`);

        // Try graceful shutdown first
        serverProcess.kill('SIGTERM');

        // Force kill if not stopped after 10s
        setTimeout(() => {
            if (this.activeProcesses.has(serverId)) {
                logger.warn(`Server ${serverId} didn't stop gracefully, force killing...`);
                serverProcess.kill('SIGKILL');
            }
        }, 10000);
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
