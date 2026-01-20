import { execSync } from 'child_process';
import os from 'os';

const isWindows = os.platform() === 'win32';

function killProcesses() {
    console.log(`[STOP] Detecting and terminating processes on ${os.platform()}...`);

    if (isWindows) {
        // Windows cleanup
        const targets = ['node.exe', 'cs2.exe', 'cmd.exe'];
        targets.forEach(target => {
            try {
                // Taskkill /F /IM kills by image name
                // Adding 'node.exe' will stop both Vite and Backend
                execSync(`taskkill /F /IM ${target} /T`, { stdio: 'ignore' });
            } catch (e) {}
        });
    } else {
        // Linux cleanup (More aggressive)
        
        // 1. Try to kill by port (Requires lsof or fuser)
        const ports = [3001, 5173, 27015];
        ports.forEach(port => {
            try {
                console.log(`[STOP] Checking port ${port}...`);
                execSync(`lsof -t -i:${port} | xargs -r kill -9`, { stdio: 'ignore' });
            } catch (e) {
                try {
                    execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
                } catch (e2) {}
            }
        });

        // 2. Kill by process name/pattern
        const patterns = ['tsx', 'vite', 'cs2', 'node'];
        patterns.forEach(pattern => {
            try {
                // pkill -9 is the nuclear option
                execSync(`pkill -9 -f '${pattern}'`, { stdio: 'ignore' });
            } catch (e) {}
        });
    }
    
    console.log('[STOP] Cleanup complete. You can now run "npm run dev".');
}

killProcesses();
