import { execSync } from 'child_process';
import os from 'os';

const isWindows = os.platform() === 'win32';

function killProcesses() {
    console.log(`[STOP] Detecting and terminating processes on ${os.platform()}...`);

    if (isWindows) {
        // Windows: Kill by image name
        const targets = ['node.exe', 'cs2.exe'];
        targets.forEach(target => {
            try {
                // We use /F to force and /T to kill child processes
                // Filtering by 'node.exe' might be too broad, but since it's a dev environment cleanup it's usually what's needed
                // Better approach: check for specific keywords in command line if possible, but taskkill is limited
                execSync(`taskkill /F /IM ${target} /T`, { stdio: 'ignore' });
                console.log(`[STOP] Terminated ${target} instances.`);
            } catch (e) {
                // ignore errors if process not found
            }
        });
    } else {
        // Linux/Mac: Use pkill
        const targets = ['tsx', 'vite', 'cs2'];
        targets.forEach(target => {
            try {
                execSync(`pkill -f '${target}'`, { stdio: 'ignore' });
                console.log(`[STOP] Terminated ${target} instances.`);
            } catch (e) {
                // ignore
            }
        });
    }
    
    console.log('[STOP] Cleanup complete.');
}

killProcesses();
