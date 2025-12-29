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
    vacEnabled: boolean;
    installPath: string;
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

        const serverPath = options.installPath;

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
            '-allow_third_party_software',
            '-condebug', // Enable console logging
            '-conclearlog', // Clear log on start
            '-nomessagebox'
        ];

        if (!options.vacEnabled) {
            engineArgs.push('-insecure');
        }

        if (options.steamAuthKey) {
            engineArgs.push('-authkey', options.steamAuthKey);
        } else if (options.workshopCollection || options.workshopMapId) {
            logger.warn(`Server ${options.id} is using Workshop features but no steamAuthKey (-authkey) is provided. This may fail.`);
        }

        // Console Variables (+)
        const conVars = [
            '+sv_lan', '0', // Ensure internet mode (not LAN)
            '+sv_visiblemaxplayers', options.maxPlayers.toString(),
            '+sv_setsteamaccount', options.gsltToken,
            '+rcon_password', options.rconPassword || '',
            '+game_type', '0', // Classic
            '+game_mode', '1'  // Competitive
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

        const workDir = serverPath; // Run from server root, not bin directory

        // FIX: Start - Ensure Steam environment is correct
        try {
            // 1. Create steam_appid.txt in server root
            const appIdPath = path.join(serverPath, 'steam_appid.txt');
            if (!fs.existsSync(appIdPath)) {
                fs.writeFileSync(appIdPath, '730');
                logger.info(`Created steam_appid.txt at ${appIdPath}`);
            }

            // 2. Create userdata folder in server root to prevent USRLOCAL error
            const userDataPath = path.join(serverPath, 'userdata');
            if (!fs.existsSync(userDataPath)) {
                fs.mkdirSync(userDataPath, { recursive: true });
                logger.info(`Created userdata folder at ${userDataPath}`);
            }

            // 3. Copy steamclient.dll from SteamCMD to server bin folder (CRITICAL FIX)
            const steamcmdPath = steamcmdService.getSteamCMDPath();
            const serverBinPath = path.join(serverPath, 'game', 'bin', 'win64');

            const requiredDlls = ['steamclient64.dll', 'tier0_s64.dll', 'vstdlib_s64.dll'];

            for (const dllName of requiredDlls) {
                const sourceDll = path.join(steamcmdPath, dllName);
                const targetDll = path.join(serverBinPath, dllName);

                if (fs.existsSync(sourceDll) && !fs.existsSync(targetDll)) {
                    fs.copyFileSync(sourceDll, targetDll);
                    logger.info(`Copied ${dllName} from SteamCMD to server bin folder`);
                }
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
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                // Steam specific overrides
                SteamAppId: '730',
                SteamGameId: '730'
            }
        });

        // Store PID in database
        if (serverProcess.pid) {
            await prisma.server.update({
                where: { id: options.id },
                data: { processId: serverProcess.pid }
            });
            logger.debug(`Stored PID ${serverProcess.pid} for server ${options.id}`);
        }

        this.activeProcesses.set(options.id, serverProcess);

        // Output is handled manually below with filtering and decoding
        // terminalService.attachOutputForwarding(options.id);

        const filterSpam = (data: Buffer): string | null => {
            const output = data.toString('utf8');
            const lines = output.split(/\r?\n/);
            const filtered = lines
                .filter(l => l.trim().length > 0)
                .filter(l => !l.includes('CTextConsoleWin::GetLine: !GetNumberOfConsoleInputEvents'))
                .filter(l => !l.includes('Could not PreloadLibrary'))
                .filter(l => !l.toLowerCase().includes('breakpad'))
                .filter(l => !l.toLowerCase().includes('minidump'));

            return filtered.length > 0 ? filtered.join('\r\n') + '\r\n' : null;
        };

        serverProcess.stdout?.on('data', (data: Buffer) => {
            const filtered = filterSpam(data);
            if (filtered) {
                logger.debug(`[Server ${options.id}]: ${filtered.trim()}`);
                terminalService.streamOutput(options.id, filtered);
            }
        });

        serverProcess.stdout?.on('error', (err) => {
            logger.warn(`[Server ${options.id}] stdout error: ${err.message}`);
        });

        serverProcess.stderr?.on('data', (data: Buffer) => {
            const filtered = filterSpam(data);
            if (filtered) {
                // Note: Steam/CS2 sends many normal info messages to stderr.
                // We keep them as debug in backend but stream to console.
                logger.debug(`[Server ${options.id} Stderr]: ${filtered.trim()}`);
                terminalService.streamOutput(options.id, `\x1b[31m${filtered}\x1b[0m`);
            }
        });

        serverProcess.stderr?.on('error', (err) => {
            logger.warn(`[Server ${options.id}] stderr error: ${err.message}`);
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
            let resolved = false;

            const cleanup = () => {
                if (!resolved) {
                    resolved = true;
                    this.activeProcesses.delete(serverId);
                    resolve();
                }
            };

            const forceKillTimeout = setTimeout(() => {
                if (this.activeProcesses.has(serverId)) {
                    logger.warn(`Server ${serverId} force killing...`);
                    try {
                        serverProcess.kill('SIGKILL');
                    } catch (err) {
                        logger.error(`Force kill failed: ${err}`);
                    }
                    cleanup();
                }
            }, 3000);

            serverProcess.once('exit', () => {
                clearTimeout(forceKillTimeout);
                cleanup();
            });

            serverProcess.once('close', () => {
                clearTimeout(forceKillTimeout);
                cleanup();
            });

            serverProcess.once('error', (err) => {
                logger.error(`Process error during stop: ${err.message}`);
                clearTimeout(forceKillTimeout);
                cleanup();
            });

            logger.info(`Stopping server ${serverId}...`);

            // Clean up streams to prevent ECONNRESET
            try {
                if (serverProcess.stdout) {
                    serverProcess.stdout.removeAllListeners('data');
                    serverProcess.stdout.on('error', () => { });
                }
                if (serverProcess.stderr) {
                    serverProcess.stderr.removeAllListeners('data');
                    serverProcess.stderr.on('error', () => { });
                }
                if (serverProcess.stdin) {
                    serverProcess.stdin.on('error', () => { });
                }
            } catch (err) {
                logger.warn(`Stream cleanup warning: ${err}`);
            }

            // Windows: use SIGKILL directly, SIGTERM doesn't work well with CS2
            try {
                if (process.platform === 'win32') {
                    serverProcess.kill('SIGKILL');
                } else {
                    serverProcess.kill('SIGTERM');
                }
            } catch (err) {
                logger.error(`Kill failed: ${err}`);
                cleanup();
            }
        });
    }

    /**
     * Synchronize server statuses by checking if stored PIDs are still running.
     * Called on backend startup.
     */
    public async syncStatuses(): Promise<void> {
        logger.info('🔍 Syncing server statuses with OS processes...');
        const servers = await prisma.server.findMany({
            where: {
                OR: [
                    { status: 'RUNNING' },
                    { status: 'STARTING' },
                    { status: 'STOPPING' },
                    { processId: { not: null } }
                ]
            }
        });

        for (const server of servers) {
            if (!server.processId) {
                // No PID stored, but DB says running? Mark as stopped.
                if (server.status !== 'STOPPED' && server.status !== 'ERROR' && server.status !== 'CREATING') {
                    await prisma.server.update({
                        where: { id: server.id },
                        data: { status: 'STOPPED' }
                    });
                }
                continue;
            }

            let isAlive = false;
            try {
                // signal 0 checks for existence without killing
                process.kill(server.processId, 0);
                isAlive = true;
            } catch (e) {
                isAlive = false;
            }

            if (isAlive) {
                if (server.status !== 'RUNNING') {
                    await prisma.server.update({
                        where: { id: server.id },
                        data: { status: 'RUNNING' }
                    });
                }
                logger.info(`  > Server ${server.name} (${server.id}) is alive at PID ${server.processId}`);
            } else {
                if (server.status !== 'STOPPED' && server.status !== 'ERROR' && server.status !== 'CREATING') {
                    await prisma.server.update({
                        where: { id: server.id },
                        data: { status: 'STOPPED', processId: null }
                    });
                }
                logger.debug(`  > Server ${server.name} (${server.id}) process ${server.processId} no longer exists.`);
            }
        }
        logger.info('✅ Server status sync completed.');
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
