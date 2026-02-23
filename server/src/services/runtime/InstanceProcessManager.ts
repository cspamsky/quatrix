import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileSystemService } from '../FileSystemService.js';
import type { InstanceOptions } from '../RuntimeService.js';

export class InstanceProcessManager {
  /**
   * Spawns a new game server process
   */
  async spawnProcess(
    id: string,
    instancePath: string,
    options: InstanceOptions,
    logFd: number
  ): Promise<ChildProcess> {
    const { executable, args, env } = await this.prepareLaunchConfig(id, instancePath, options);

    // Prepare Environment Variables (Crucial for host-launch without wrapper)
    const homeDir = process.env.HOME || '/home/quatrix';
    const steamSdk64 = path.join(homeDir, '.steam', 'sdk64');
    const binDir = path.join(instancePath, 'game', 'bin', 'linuxsteamrt64');
    const gameBinDir = path.join(instancePath, 'game', 'csgo', 'bin', 'linuxsteamrt64');

    const spawnEnv = {
      ...env,
      LD_LIBRARY_PATH: `${binDir}:${gameBinDir}:${steamSdk64}:${env.LD_LIBRARY_PATH || ''}`,
      HOME: homeDir,
      DOTNET_ROOT: '/usr/share/dotnet', // Standard path, can be adjusted
    };

    const proc = spawn(executable, args, {
      cwd: path.join(instancePath, 'game'),
      env: spawnEnv,
      detached: true,
      shell: false,
      stdio: ['ignore', logFd, logFd],
    });

    if (!proc.pid) {
      throw new Error('Failed to spawn process');
    }

    proc.unref();
    return proc;
  }

  /**
   * Terminates an instance process and all its children
   */
  async killProcess(pid: number, processHandle?: ChildProcess): Promise<void> {
    try {
      console.log(`[ProcessManager] Attempting to kill process ${pid} and its children`);

      // First, try graceful shutdown with SIGTERM
      if (processHandle) {
        processHandle.kill('SIGTERM');
      } else {
        // Kill entire process group (negative PID kills process tree on Linux)
        try {
          process.kill(-pid, 'SIGTERM');
        } catch {
          // Fallback to single process if process group fails
          process.kill(pid, 'SIGTERM');
        }
      }

      // Wait up to 5 seconds for graceful shutdown
      const gracefulShutdownSuccess = await this.waitForProcessDeath(pid, 5000);

      if (gracefulShutdownSuccess) {
        console.log(`[ProcessManager] Process ${pid} terminated gracefully`);
        return;
      }

      // If still alive, force kill with SIGKILL
      console.warn(`[ProcessManager] Process ${pid} did not terminate gracefully, forcing SIGKILL`);
      if (processHandle) {
        processHandle.kill('SIGKILL');
      } else {
        try {
          process.kill(-pid, 'SIGKILL');
        } catch {
          process.kill(pid, 'SIGKILL');
        }
      }

      // Wait up to 2 seconds for force kill
      const forceKillSuccess = await this.waitForProcessDeath(pid, 2000);

      if (!forceKillSuccess) {
        console.error(`[ProcessManager] Process ${pid} still alive after SIGKILL!`);
      } else {
        console.log(`[ProcessManager] Process ${pid} force killed successfully`);
      }
    } catch (e) {
      console.warn(`[ProcessManager] Error killing process ${pid}:`, e);
    }
  }

  /**
   * Waits for a process to die, checking periodically
   */
  private async waitForProcessDeath(pid: number, timeoutMs: number): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 100; // Check every 100ms

    while (Date.now() - startTime < timeoutMs) {
      if (!this.isProcessAlive(pid)) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    return !this.isProcessAlive(pid);
  }

  /**
   * Checks if a process is still running
   */
  private isProcessAlive(pid: number): boolean {
    try {
      // Sending signal 0 doesn't kill the process, just checks if it exists
      process.kill(pid, 0);
      return true;
    } catch (e: unknown) {
      // ESRCH means process doesn't exist
      return (e as { code?: string }).code !== 'ESRCH';
    }
  }

  /**
   * Checks if a PID is still alive
   */
  isAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Prepares arguments and environment for launch
   */
  private async prepareLaunchConfig(id: string, instancePath: string, options: InstanceOptions) {
    const relativeBinPath = path.join('game', 'bin', 'linuxsteamrt64', 'cs2');
    const cs2BinLocal = path.join(instancePath, relativeBinPath);

    let cpuPriority = options.cpu_priority !== undefined ? Number(options.cpu_priority) : 0;
    if (isNaN(cpuPriority) || !isFinite(cpuPriority)) cpuPriority = 0;

    let ramLimitMb = options.ram_limit !== undefined ? Number(options.ram_limit) : 0;
    if (isNaN(ramLimitMb) || !isFinite(ramLimitMb)) ramLimitMb = 0;

    let executable = cs2BinLocal;

    if (!fileSystemService.isPathSafe(executable) && executable !== 'nice') {
      throw new Error(
        `Security Error: Executable path ${executable} is outside allowed directories.`
      );
    }

    const finalArgs: string[] = [];
    if (cpuPriority !== 0) {
      // Priority between -20 and 19. Only root can set negative values.
      // If the user is not root and tries to set a negative value, nice will fail with EPERM.
      // We wrap it in a subshell to fall back to standard priority if nice fails.
      const niceVal = Math.round(cpuPriority).toString();
      const originalExecutable = executable;

      executable = 'sh';
      finalArgs.push(
        '-c',
        `nice -n ${niceVal} "${originalExecutable}" "$@" || exec "${originalExecutable}" "$@"`,
        '--',
        originalExecutable
      );
    }

    const mapName = options.map || 'de_dust2';
    const isWorkshopID = (m: string) => /^\d+$/.test(m);

    const args: string[] = [];

    args.push('-dedicated', '-console', '-usercon', '-game', 'csgo');
    args.push('--graphics-provider', 'none');

    if (options.auto_update) args.push('-autoupdate');
    if (options.steam_api_key) args.push('-authkey', options.steam_api_key);

    args.push('-maxplayers', (options.max_players || 16).toString());
    args.push('-tickrate', (options.tickrate || 128).toString());

    if (options.vac_enabled === false) args.push('-insecure');

    args.push('-ip', options.ip || '0.0.0.0');
    args.push('-port', options.port.toString());

    // Game Mode & Alias Logic (Using hyphens for engine parameters)
    let gameType = options.game_type ?? 0;
    let gameMode = options.game_mode ?? 0;

    if (options.game_alias) {
      const alias = options.game_alias.toLowerCase();
      const aliasMap: Record<string, { type: number; mode: number }> = {
        casual: { type: 0, mode: 0 },
        competitive: { type: 0, mode: 1 },
        wingman: { type: 0, mode: 2 },
        armsrace: { type: 1, mode: 0 },
        demolition: { type: 1, mode: 1 },
        deathmatch: { type: 1, mode: 2 },
        training: { type: 2, mode: 0 },
        custom: { type: 3, mode: 0 },
      };

      if (aliasMap[alias]) {
        gameType = aliasMap[alias]!.type;
        gameMode = aliasMap[alias]!.mode;
        console.log(
          `[ProcessManager] Alias matched: ${alias} -> type: ${gameType}, mode: ${gameMode}`
        );
      } else {
        console.warn(
          `[ProcessManager] Unknown alias: ${alias}. Using defaults: type ${gameType}, mode ${gameMode}`
        );
      }
    } else {
      console.log(
        `[ProcessManager] No alias provided. Using values: type ${gameType}, mode ${gameMode}`
      );
    }

    // Use convar format (+) for game settings as CS2 treats them as ConVars, not engine switches
    args.push('+game_type', gameType.toString());
    args.push('+game_mode', gameMode.toString());

    // Add default mapgroup and ensure it's a convar
    args.push('+mapgroup', 'mg_active');

    if (options.gslt_token) args.push('+sv_setsteamaccount', options.gslt_token);
    if (options.name) args.push('+hostname', options.name);
    if (options.password) args.push('+sv_password', options.password);
    if (options.rcon_password) args.push('+rcon_password', options.rcon_password);

    if (options.hibernate !== undefined) {
      args.push('+sv_hibernate_when_empty', String(options.hibernate));
    }

    if (options.tv_enabled) {
      args.push('+tv_enable', '1');
      args.push('+tv_port', (options.port + 1).toString());
      args.push('+tv_autorecord', '0');
    }

    if (options.additional_args) {
      const extraArgs = options.additional_args.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
      args.push(...extraArgs);
    }

    args.push(isWorkshopID(mapName) ? '+host_workshop_map' : '+map', mapName);

    let combinedArgs = [...finalArgs, ...args];

    if (ramLimitMb > 0) {
      const limitKb = ramLimitMb * 1024;
      const originalExecutable = executable;
      const originalArgs = combinedArgs;

      executable = 'sh';
      combinedArgs = [
        '-c',
        `ulimit -v ${limitKb} && exec "$@"`,
        '--',
        originalExecutable,
        ...originalArgs,
      ];
    }

    return { executable, args: combinedArgs, env: process.env };
  }

  /**
   * Redacts sensitive information from launch arguments for safe logging
   */
  getRedactedArgs(combinedArgs: string[], options: InstanceOptions): string[] {
    const sensitiveValues = new Set<string>();
    if (options.steam_api_key) sensitiveValues.add(options.steam_api_key);
    if (options.password) sensitiveValues.add(options.password);
    if (options.rcon_password) sensitiveValues.add(options.rcon_password);
    if (options.gslt_token) sensitiveValues.add(options.gslt_token);

    const safeArgs: string[] = [];
    let skipNext = false;

    for (let i = 0; i < combinedArgs.length; i++) {
      if (skipNext) {
        skipNext = false;
        continue;
      }

      const arg = combinedArgs[i]!;
      if (sensitiveValues.has(arg)) {
        safeArgs.push('[REDACTED_VAL]');
        continue;
      }

      const argLower = typeof arg === 'string' ? arg.toLowerCase() : '';
      if (
        argLower === '+sv_setsteamaccount' ||
        argLower === '+sv_password' ||
        argLower === '+rcon_password' ||
        argLower === '+tv_password' ||
        argLower === '-authkey'
      ) {
        safeArgs.push(arg);
        if (i + 1 < combinedArgs.length) {
          safeArgs.push('[REDACTED]');
          skipNext = true;
        }
        continue;
      }

      if (
        argLower.startsWith('+sv_setsteamaccount') ||
        argLower.startsWith('+sv_password') ||
        argLower.startsWith('+rcon_password') ||
        argLower.startsWith('+tv_password') ||
        argLower.startsWith('-authkey')
      ) {
        safeArgs.push('[REDACTED]');
        continue;
      }

      safeArgs.push(arg);
    }
    return safeArgs;
  }
}

export const instanceProcessManager = new InstanceProcessManager();
