
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { serverManager } from '../serverManager';

// Mock database and other dependencies if necessary, or just test the logic isolated
// Since serverManager is a class instance, we might need to mock things it depends on.
// However, the methods listFiles, readFile, writeFile mainly rely on fs and path.

// We need to mock fs to avoid actual file system operations and to control test scenarios.
// But verifying path logic is easier if we just spy on path.resolve?
// Actually, we want to test that it throws error on invalid paths.

describe('ServerManager Path Traversal Security', () => {

    // We'll mock the installDir getter to return a fixed path
    beforeEach(() => {
        // Mock getSetting to return a fixed install dir
        vi.spyOn(serverManager as any, 'getSetting').mockImplementation((key: string) => {
            if (key === 'install_dir') return path.resolve('/tmp/server_install');
            return '';
        });

        // Mock fs.existsSync to always return true so we reach the security check
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);
        // Mock fs.readdirSync
        vi.spyOn(fs, 'readdirSync').mockReturnValue([]);
        // Mock fs.readFileSync
        vi.spyOn(fs, 'readFileSync').mockReturnValue('content');
        // Mock fs.writeFileSync
        vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const instanceId = '1';
    // The expected base dir: /tmp/server_install/1/game/csgo
    const baseDir = path.join(path.resolve('/tmp/server_install'), instanceId, 'game', 'csgo');

    it('should allow access to valid subdirectories', async () => {
        const subDir = 'addons';
        await expect(serverManager.listFiles(instanceId, subDir)).resolves.toBeDefined();
    });

    it('should allow access to root directory', async () => {
        await expect(serverManager.listFiles(instanceId, '')).resolves.toBeDefined();
    });

    it('should prevent access to parent directory via ..', async () => {
        const subDir = '..';
        await expect(serverManager.listFiles(instanceId, subDir)).rejects.toThrow("Access denied");
    });

    it('should prevent access to absolute paths outside base directory', async () => {
        // On Linux/Mac
        const subDir = '/etc/passwd';
        // On Windows it might just be C:\Windows
        await expect(serverManager.listFiles(instanceId, subDir)).rejects.toThrow("Access denied");
    });

    it('should prevent partial path traversal (sibling directory)', async () => {
        // Construct a path that starts with baseDir string but is a sibling
        // e.g. /tmp/server_install/1/game/csgo_backup

        // Note: We need to feed a relative path that resolves to that.
        // If baseDir is .../csgo
        // We want .../csgo_backup
        // So input: ../csgo_backup

        const subDir = '../csgo_backup';
        await expect(serverManager.listFiles(instanceId, subDir)).rejects.toThrow("Access denied");
    });

    it('should prevent readFile from accessing outside files', async () => {
        const filePath = '../../secret.txt';
        await expect(serverManager.readFile(instanceId, filePath)).rejects.toThrow("Access denied");
    });

    it('should prevent writeFile from accessing outside files', async () => {
        const filePath = '../../secret.txt';
        await expect(serverManager.writeFile(instanceId, filePath, 'data')).rejects.toThrow("Access denied");
    });
});
