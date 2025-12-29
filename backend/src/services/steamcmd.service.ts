import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import AdmZip from 'adm-zip';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

class SteamCMDService {
    private steamcmdPath: string = '';
    private serversRoot: string = '';
    private activeInstalls: Map<string, ChildProcess> = new Map();

    constructor() {
        this.init();
    }

    private async init() {
        await this.loadSettings();
    }

    /**
     * Refreshes paths from database settings
     */
    public async loadSettings(): Promise<void> {
        const settings = await prisma.settings.findFirst();

        const steamcmdPath = settings?.steamcmdPath || './steamcmd';
        const serversPath = settings?.serversPath || './cs2-servers';

        this.steamcmdPath = path.isAbsolute(steamcmdPath)
            ? steamcmdPath
            : path.join(process.cwd(), steamcmdPath);

        this.serversRoot = path.isAbsolute(serversPath)
            ? serversPath
            : path.join(process.cwd(), serversPath);

        // Ensure directories exist
        if (!fs.existsSync(this.steamcmdPath)) {
            fs.mkdirSync(this.steamcmdPath, { recursive: true });
        }
        if (!fs.existsSync(this.serversRoot)) {
            fs.mkdirSync(this.serversRoot, { recursive: true });
        }

        logger.info(`SteamCMD Service initialized with: SteamCMD=${this.steamcmdPath}, Servers=${this.serversRoot}`);
    }

    /**
     * Checks if steamcmd executable exists
     */
    public isInstalled(): boolean {
        const exeName = process.platform === 'win32' ? 'steamcmd.exe' : 'steamcmd.sh';
        return fs.existsSync(path.join(this.steamcmdPath, exeName));
    }

    /**
     * Installs or updates a CS2 server
     */
    public async installOrUpdateServer(
        serverId: string,
        onProgress?: (data: string) => void
    ): Promise<void> {
        await this.loadSettings(); // Always refresh before use

        const installDir = path.join(this.serversRoot, serverId);
        if (!fs.existsSync(installDir)) {
            fs.mkdirSync(installDir, { recursive: true });
        }

        const exeName = process.platform === 'win32' ? 'steamcmd.exe' : './steamcmd.sh';
        const steamcmdExe = path.join(this.steamcmdPath, exeName);

        if (!this.isInstalled()) {
            throw new Error(`SteamCMD not found at ${steamcmdExe}. Please install it first.`);
        }

        return new Promise((resolve, reject) => {
            logger.info(`Starting CS2 installation/update for server: ${serverId}`);
            logger.info(`SteamCMD Executable: ${steamcmdExe}`);
            logger.info(`Install Directory: ${installDir}`);

            const args = [
                '+force_install_dir', installDir,
                '+login', 'anonymous',
                '+app_update', '730', 'validate',
                '+quit'
            ];

            const child = spawn(steamcmdExe, args, {
                cwd: this.steamcmdPath,
                shell: false, // Changed from true to false for stability
                windowsHide: true
            });

            this.activeInstalls.set(serverId, child);

            // Track output to detect successful update completion
            child.stdout.on('data', (data: Buffer) => {
                const output = data.toString('utf8');
                if (onProgress) onProgress(output);
                logger.debug(`SteamCMD [${serverId}]: ${output.trim()}`);
            });

            child.stderr.on('data', (data) => {
                logger.error(`SteamCMD Error [${serverId}]: ${data.toString()}`);
            });

            child.on('close', (code) => {
                this.activeInstalls.delete(serverId);
                if (code === 0 || code === 7) {
                    logger.info(`CS2 server ${serverId} installed/updated successfully (code ${code}).`);
                    resolve();
                } else if (code === null) {
                    logger.info(`SteamCMD for ${serverId} was terminated.`);
                    reject(new Error('Installation stopped by user'));
                } else {
                    logger.error(`SteamCMD exited with code ${code}`);
                    reject(new Error(`SteamCMD failed with code ${code}`));
                }
            });
        });
    }

    /**
     * Terminates an ongoing installation
     */
    public stopInstallation(serverId: string) {
        const child = this.activeInstalls.get(serverId);
        if (child && child.pid) {
            logger.info(`Terminating SteamCMD installation for server: ${serverId} (PID: ${child.pid})`);

            if (process.platform === 'win32') {
                // Kill the entire process tree on Windows
                spawn('taskkill', ['/F', '/T', '/PID', child.pid.toString()]);
            } else {
                child.kill('SIGKILL');
            }

            this.activeInstalls.delete(serverId);
            return true;
        }
        return false;
    }

    /**
     * Downloads and extracts SteamCMD
     */
    public async downloadSteamCMD(): Promise<void> {
        await this.loadSettings();

        const isWin = process.platform === 'win32';
        const url = isWin
            ? 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip'
            : 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz';

        const tempFile = path.join(this.steamcmdPath, isWin ? 'steamcmd.zip' : 'steamcmd.tar.gz');

        logger.info(`Downloading SteamCMD from ${url}...`);

        try {
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'arraybuffer'
            });

            fs.writeFileSync(tempFile, Buffer.from(response.data));
            logger.info('SteamCMD download complete.');

            if (isWin) {
                logger.info('Extracting SteamCMD (Windows)...');
                const zip = new AdmZip(tempFile);
                zip.extractAllTo(this.steamcmdPath, true);
            } else {
                logger.info('Extracting SteamCMD (Linux)...');
                // Use built-in tar command for Linux
                await new Promise<void>((resolve, reject) => {
                    const tar = spawn('tar', ['-xzf', tempFile, '-C', this.steamcmdPath]);
                    tar.on('close', (code) => {
                        if (code === 0) resolve();
                        else reject(new Error(`Tar process exited with code ${code}`));
                    });
                });
            }

            // Cleanup temp file
            fs.unlinkSync(tempFile);
            logger.info('SteamCMD extraction complete and cleaned up.');
        } catch (error: any) {
            logger.error(`Failed to download/extract SteamCMD: ${error.message}`);
            throw new Error(`SteamCMD installation failed: ${error.message}`);
        }
    }

    public getServerPath(serverId: string): string {
        return path.join(this.serversRoot, serverId);
    }

    public getSteamCMDPath(): string {
        return this.steamcmdPath;
    }
}

export const steamcmdService = new SteamCMDService();
