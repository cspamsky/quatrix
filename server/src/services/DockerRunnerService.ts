import { spawn, ChildProcess } from 'child_process';
import { fileSystemService } from './FileSystemService.js';
import path from 'path';

export interface DockerContainerOptions {
  image: string;
  name: string;
  cwd: string;
  env: Record<string, string>;
  ports: Record<number, number>; // host: container
  command: string;
  memory?: number; // in MB
}

class DockerRunnerService {
  /**
   * Checks if an image exists locally, and pulls it if not.
   */
  async ensureImage(image: string, logFd?: number): Promise<void> {
    console.log(`[Docker] Checking image: ${image}`);
    
    // Check if image exists
    const check = spawn('docker', ['inspect', '--type=image', image]);
    const exists = await new Promise<boolean>((resolve) => {
      check.on('close', (code) => resolve(code === 0));
    });

    if (exists) {
      console.log(`[Docker] Image ${image} already exists.`);
      return;
    }

    console.log(`[Docker] Pulling image: ${image}`);
    const pull = spawn('docker', ['pull', image], {
      stdio: ['ignore', logFd || 'pipe', logFd || 'pipe']
    });

    return new Promise((resolve, reject) => {
      pull.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Failed to pull image ${image} (exit code ${code})`));
      });
    });
  }

  /**
   * Runs a container and returns the process handle (mapping to docker logs -f)
   */
  async runContainer(options: DockerContainerOptions, logFd: number): Promise<ChildProcess> {
    const { image, name, cwd, env, ports, command, memory } = options;

    await this.ensureImage(image, logFd);

    console.log(`[Docker] Starting container ${name} from ${image}`);

    // Prepare docker run arguments
    const args = [
      'run',
      '--rm', // Remove container on stop
      '--name', name,
      '--workdir', '/home/container',
      '--user', '1000:1000', // Pterodactyl standard
    ];

    if (memory && memory > 0) {
      args.push('--memory', `${memory}m`);
    }

    // Environment variables
    Object.entries(env).forEach(([key, val]) => {
      args.push('-e', `${key}=${val}`);
    });

    // Port mappings
    Object.entries(ports).forEach(([host, container]) => {
      args.push('-p', `${host}:${container}/udp`); // Mostly UDP for games
      args.push('-p', `${host}:${container}/tcp`);
    });

    // Volume mapping: host instance path -> /home/container
    args.push('-v', `${cwd}:/home/container`);

    // The image and startup command
    args.push(image);
    
    // Split command for sh -c execution
    args.push('sh', '-c', command);

    console.log(`[Docker] Launching: docker ${args.join(' ')}`);

    const proc = spawn('docker', args, {
      detached: true,
      stdio: ['ignore', logFd, logFd]
    });

    if (!proc.pid) {
      throw new Error('Failed to spawn docker process');
    }

    // Wait a bit to see if it crashes immediately
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (proc.exitCode !== null) {
        throw new Error(`Container failed to start (exit code ${proc.exitCode})`);
    }

    proc.unref();
    return proc;
  }

  /**
   * Stops a running container
   */
  async stopContainer(name: string): Promise<void> {
    console.log(`[Docker] Stopping container ${name}`);
    const stop = spawn('docker', ['stop', '-t', '10', name]);
    
    return new Promise((resolve) => {
      stop.on('close', () => {
        // We ignore errors here as the container might already be stopped
        resolve();
      });
    });
  }

  /**
   * Forces removal of a container
   */
  async killContainer(name: string): Promise<void> {
    console.log(`[Docker] Killing container ${name}`);
    spawn('docker', ['rm', '-f', name]);
  }
}

export const dockerRunnerService = new DockerRunnerService();
