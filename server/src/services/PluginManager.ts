import path from 'path';
import fs from 'fs';
import type { Statement } from 'better-sqlite3';
import { pluginRegistry, type PluginId } from '../config/plugins.js';
import db from '../db.js';
import { fileURLToPath } from 'url';

// Import modular services
import { pluginDiscovery } from './plugin/PluginDiscovery.js';
import { pluginConfigManager } from './plugin/PluginConfigManager.js';
import { pluginInstaller } from './plugin/PluginInstaller.js';
import { updateService } from './plugin/UpdateService.js';
import { taskService } from './TaskService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../../../');
const POOL_DIR = path.join(PROJECT_ROOT, 'data', 'plugin_pool');

export interface PluginMetadata {
  name: string;
  version: string;
  currentVersion?: string | undefined;
  folderName?: string | undefined;
  downloadUrl?: string | undefined;
  category: 'cssharp' | 'metamod' | 'core';
  description: string;
  inPool: boolean;
  isCustom: boolean;
  githubRepo?: string | undefined;
}

export interface PluginRegistryItem {
  name: string;
  currentVersion?: string;
  folderName?: string;
  category: 'cssharp' | 'metamod' | 'core';
  tags?: readonly string[];
  description?: string;
  downloadUrl?: string;
  githubRepo?: string | undefined;
}

/**
 * PluginManager - Orchestrator Service
 *
 * This is the main entry point for plugin management.
 * It delegates work to specialized services:
 * - PluginDiscovery: Pool scanning and metadata extraction
 * - PluginInstaller: Installation, uninstallation, and Smart Sync
 * - PluginConfigManager: Configuration file management
 */
export class PluginManager {
  public pluginRegistry = pluginRegistry;
  private manifest: Record<string, PluginMetadata> | null = null;
  private checkAllStmt: Statement;
  private checkOneStmt: Statement;

  constructor() {
    this.checkAllStmt = db.prepare(
      'SELECT plugin_id, version FROM server_plugins WHERE server_id = ?'
    );
    this.checkOneStmt = db.prepare(
      'SELECT version FROM server_plugins WHERE server_id = ? AND plugin_id = ?'
    );

    // Ensure pool directory exists
    if (!fs.existsSync(POOL_DIR)) {
      fs.mkdirSync(POOL_DIR, { recursive: true });
    }
  }

  /**
   * Gets the registry of all available plugins
   * Delegates to PluginDiscovery service
   */
  async getRegistry(_serverId?: string | number): Promise<Record<string, PluginMetadata>> {
    return await pluginDiscovery.scanPool(
      this.pluginRegistry as unknown as Record<string, PluginRegistryItem>
    );
  }

  /**
   * Syncs the static registry (legacy method, kept for compatibility)
   */
  async syncRegistry(): Promise<Record<string, PluginMetadata>> {
    const manifest: Record<string, PluginMetadata> = {};
    for (const [id, info] of Object.entries(this.pluginRegistry)) {
      const pInfo = info as unknown as PluginRegistryItem;
      manifest[id] = {
        name: pInfo.name,
        version: pInfo.currentVersion || 'latest',
        folderName: pInfo.folderName || undefined,
        category: pInfo.category,
        description: pInfo.description || '',
        inPool: false,
        isCustom: false,
      };
    }
    this.manifest = manifest;
    return manifest;
  }

  /**
   * Gets plugin installation status for a server
   */
  async getPluginStatus(
    installDir: string,
    instanceId: string | number
  ): Promise<Record<string, { installed: boolean; hasConfigs: boolean }>> {
    const id = instanceId.toString();
    const csgoDir = path.join(installDir, id, 'game', 'csgo');
    const addonsDir = path.join(csgoDir, 'addons');
    const cssPluginsDir = path.join(addonsDir, 'counterstrikesharp', 'plugins');
    const cssSharedDir = path.join(addonsDir, 'counterstrikesharp', 'shared');
    const status: Record<string, { installed: boolean; hasConfigs: boolean }> = {};

    const dirCache = new Map<string, Promise<{ raw: string; lower: string }[]>>();
    const getDirItems = (dir: string): Promise<{ raw: string; lower: string }[]> => {
      if (!dirCache.has(dir)) {
        dirCache.set(
          dir,
          fs.promises
            .readdir(dir)
            .then((items) => items.map((i) => ({ raw: i, lower: i.toLowerCase() })))
            .catch(() => [])
        );
      }
      return dirCache.get(dir)!;
    };

    const [hasMetaVdf, hasMetaX64Vdf, hasCSS] = await Promise.all([
      fs.promises
        .access(path.join(addonsDir, 'metamod.vdf'))
        .then(() => true)
        .catch(() => false),
      fs.promises
        .access(path.join(addonsDir, 'metamod_x64.vdf'))
        .then(() => true)
        .catch(() => false),
      fs.promises
        .access(path.join(addonsDir, 'counterstrikesharp'))
        .then(() => true)
        .catch(() => false),
    ]);

    status.metamod = { installed: hasMetaVdf || hasMetaX64Vdf, hasConfigs: false };
    status.cssharp = { installed: hasCSS, hasConfigs: false };

    const checkExists = async (dir: string, name: string) => {
      const items = await getDirItems(dir);
      const lowerName = name.toLowerCase();
      return items.some((item) => {
        return (
          item.lower === lowerName ||
          item.lower === lowerName + '.vdf' ||
          item.lower === lowerName + '.dll' ||
          (lowerName.length > 3 && item.lower.includes(lowerName))
        );
      });
    };

    const registry = await this.getRegistry(instanceId);
    for (const pid of Object.keys(registry)) {
      const info = registry[pid];
      if (!info) continue;

      if (info.category === 'core') {
        if (!status[pid]) status[pid] = { installed: false, hasConfigs: false };
        continue;
      }

      let installed = false;
      if (info.category === 'metamod') {
        installed =
          (await checkExists(addonsDir, pid)) ||
          (await checkExists(addonsDir, info.folderName || '')) ||
          (await checkExists(addonsDir, info.name));
      } else if (info.category === 'cssharp') {
        installed =
          (await checkExists(cssPluginsDir, pid)) ||
          (await checkExists(cssPluginsDir, info.folderName || '')) ||
          (await checkExists(cssPluginsDir, info.name)) ||
          (await checkExists(cssSharedDir, pid)) ||
          (await checkExists(cssSharedDir, info.folderName || '')) ||
          (await checkExists(cssSharedDir, info.name));

        if (!installed) {
          installed =
            (await checkExists(csgoDir, pid)) ||
            (await checkExists(csgoDir, info.folderName || '')) ||
            (await checkExists(csgoDir, info.name));
        }
      }

      let hasConfigs = false;
      if (installed) {
        const configs = await this.getPluginConfigFiles(
          installDir,
          instanceId,
          pid,
          info.folderName
        );
        hasConfigs = configs.length > 0;
      }

      status[pid] = { installed, hasConfigs };
    }

    return status;
  }

  /**
   * Installs a plugin
   * Delegates to PluginInstaller service
   */
  async installPlugin(
    installDir: string,
    instanceId: string | number,
    pluginId: string,
    taskId?: string
  ): Promise<void> {
    const registry = await this.getRegistry(instanceId);
    const pluginInfo = registry[pluginId];

    if (!pluginInfo) {
      console.error('[PLUGIN] Attempted to install unknown plugin:', pluginId);
      return;
    }

    await pluginInstaller.install(installDir, instanceId, pluginId, pluginInfo, taskId);
  }

  /**
   * Uninstalls a plugin
   * Delegates to PluginInstaller service
   */
  async uninstallPlugin(
    installDir: string,
    instanceId: string | number,
    pluginId: string,
    taskId?: string
  ): Promise<void> {
    const registry = await this.getRegistry(instanceId);
    const pluginInfo = registry[pluginId];

    if (!pluginInfo) {
      console.error('[PLUGIN] Attempted to uninstall unknown plugin:', pluginId);
      if (taskId) taskService.failTask(taskId, `Unknown plugin: ${pluginId}`);
      return;
    }

    // Special handling for core plugins
    if (pluginId === 'metamod') {
      await this.uninstallMetamod(installDir, instanceId);
    } else if (pluginId === 'cssharp') {
      await this.uninstallCounterStrikeSharp(installDir, instanceId);
    }

    await pluginInstaller.uninstall(installDir, instanceId, pluginId, pluginInfo, taskId);
  }

  /**
   * Uploads a plugin to the pool
   * Delegates to PluginInstaller service
   */
  async uploadToPool(pluginId: string, filePath: string, originalName: string): Promise<void> {
    await pluginInstaller.uploadToPool(pluginId, filePath, originalName);
  }

  /**
   * Gets plugin configuration files
   * Delegates to PluginConfigManager service
   */
  async getPluginConfigFiles(
    installDir: string,
    instanceId: string | number,
    pluginId: string,
    folderName?: string
  ): Promise<string[]> {
    let finalFolderName = folderName;
    if (!finalFolderName) {
      const registry = await this.getRegistry(instanceId);
      finalFolderName = registry[pluginId]?.folderName;
    }
    return await pluginConfigManager.discoverConfigs(
      installDir,
      instanceId,
      pluginId,
      finalFolderName
    );
  }

  /**
   * Reads a plugin configuration file
   * Delegates to PluginConfigManager service
   */
  async readPluginConfigFile(filePath: string): Promise<string> {
    return await pluginConfigManager.readConfig(filePath);
  }

  /**
   * Saves a plugin configuration file
   * Delegates to PluginConfigManager service
   */
  async savePluginConfigFile(
    installDir: string,
    instanceId: string | number,
    pluginId: string,
    relativeFilePath: string,
    content: string
  ): Promise<void> {
    await pluginConfigManager.writeConfig(
      installDir,
      instanceId,
      pluginId,
      relativeFilePath,
      content
    );
  }

  /**
   * Checks for plugin updates
   */
  async checkAllPluginUpdates(instanceId: string | number): Promise<
    Record<
      string,
      {
        hasUpdate: boolean;
        latestVersion: string | undefined;
        currentVersion: string | undefined;
        name: string | undefined;
      }
    >
  > {
    const registry = await this.getRegistry(instanceId);
    const rows = this.checkAllStmt.all(instanceId) as { plugin_id: string; version: string }[];

    const updates: Record<
      string,
      {
        hasUpdate: boolean;
        latestVersion: string | undefined;
        currentVersion: string | undefined;
        name: string | undefined;
      }
    > = {};

    for (const row of rows) {
      const pid = row.plugin_id as PluginId;
      const info = registry[pid];
      if (!info) continue;

      const currentVersion = row.version;
      const latestVersion = info.version || info.currentVersion || 'latest';
      const hasUpdate = currentVersion !== latestVersion && latestVersion !== 'latest';

      updates[pid] = {
        hasUpdate,
        currentVersion,
        latestVersion,
        name: info.name,
      };
    }

    return updates;
  }

  /**
   * Checks for a single plugin update
   */
  async checkPluginUpdate(
    instanceId: string | number,
    pluginId: PluginId
  ): Promise<{
    hasUpdate: boolean;
    currentVersion: string | undefined;
    latestVersion: string | undefined;
  }> {
    const registry = await this.getRegistry(instanceId);
    const info = registry[pluginId];

    if (!info) {
      return { hasUpdate: false, currentVersion: undefined, latestVersion: undefined };
    }

    const row = this.checkOneStmt.get(instanceId, pluginId) as { version: string } | undefined;
    const currentVersion = row?.version;
    const latestVersion = info.version || info.currentVersion || 'latest';
    const hasUpdate =
      !!currentVersion && currentVersion !== latestVersion && latestVersion !== 'latest';

    return { hasUpdate, currentVersion, latestVersion };
  }

  /**
   * Updates a plugin (reinstalls with latest version)
   */
  async updatePlugin(
    installDir: string,
    instanceId: string | number,
    pluginId: string,
    taskId?: string
  ): Promise<void> {
    await this.uninstallPlugin(installDir, instanceId, pluginId, taskId);
    await this.installPlugin(installDir, instanceId, pluginId, taskId);
  }

  /**
   * Checks for remote updates on GitHub for all plugins in registry
   */
  async checkRemoteUpdates(): Promise<
    Record<string, { hasUpdate: boolean; latestVersion: string; currentVersion: string }>
  > {
    const registry = await this.getRegistry();
    const results: Record<
      string,
      { hasUpdate: boolean; latestVersion: string; currentVersion: string }
    > = {};

    // Check all plugins that have either a GitHub repo or a direct downloadUrl (e.g. AlliedModders)
    const reposToCheck = Object.entries(registry).filter(
      ([, info]) => !!info.githubRepo || !!info.downloadUrl
    );

    console.log(`[PLUGIN] Checking ${reposToCheck.length} remote repositories in parallel...`);

    const updatePromises = reposToCheck.map(async ([id, info]) => {
      try {
        // Prioritize the version in our pool/cache over the hardcoded registry version
        const currentVersion = (info.version || info.currentVersion || '0.0.0').replace(/^v/, '');
        let latestVersion: string;

        if (info.githubRepo) {
          // --- GitHub source ---
          const release = await updateService.getLatestRelease(info.githubRepo);
          if (!release) return;
          latestVersion = release.version.replace(/^v/, '');
        } else if (info.downloadUrl) {
          // --- AlliedModders (or other direct-URL) source ---
          // directory listing URL (ends with '/') → scrape for latest file
          const isListing = info.downloadUrl.endsWith('/');
          if (!isListing) return; // direct file URL, can't compare version without downloading
          const release = await updateService.getLatestAlliedModsRelease(info.downloadUrl);
          if (!release) return;
          latestVersion = release.version.replace(/^v/, '');
        } else {
          return;
        }

        results[id] = {
          hasUpdate: currentVersion !== latestVersion && latestVersion !== 'latest',
          latestVersion,
          currentVersion,
        };
      } catch (err: unknown) {
        const error = err as Error;
        console.error(`[PLUGIN] Failed to check remote update for ${id}:`, error.message);
      }
    });

    await Promise.all(updatePromises);
    console.log(
      `[PLUGIN] Remote update check complete. Found ${Object.keys(results).length} results.`
    );
    return results;
  }

  /**
   * Syncs a plugin from remote source (GitHub or AlliedModders) to the local pool
   */
  async syncPluginFromRemote(pluginId: string): Promise<void> {
    const registry = await this.getRegistry();
    const info = registry[pluginId];

    if (!info) {
      throw new Error(`Plugin ${pluginId} not found in registry.`);
    }

    if (!info.githubRepo && !info.downloadUrl) {
      throw new Error(
        `Plugin ${pluginId} has no remote source configured (no githubRepo or downloadUrl).`
      );
    }

    let assetUrl: string;
    let version: string;
    let fileName: string;

    if (info.githubRepo) {
      // --- GitHub flow ---
      const release = await updateService.getLatestRelease(info.githubRepo);
      if (!release) {
        throw new Error(`Could not find latest release for ${info.githubRepo}`);
      }
      assetUrl = release.assetUrl;
      version = release.version;
      fileName = `${pluginId}_${release.version}.zip`;
      console.log(`[PLUGIN] Downloading ${pluginId} (${version}) from GitHub...`);
    } else {
      // --- AlliedModders / direct URL flow ---
      const isListing = info.downloadUrl!.endsWith('/');
      if (isListing) {
        // Scrape directory listing for latest file (shell: curl | grep ... | tail -1)
        const release = await updateService.getLatestAlliedModsRelease(info.downloadUrl!);
        if (!release) {
          throw new Error(`Could not find latest release at ${info.downloadUrl}`);
        }
        assetUrl = release.assetUrl;
        version = release.version;
        fileName = release.assetUrl.split('/').pop() || `${pluginId}.tar.gz`;
        console.log(`[PLUGIN] Downloading ${pluginId} (${version}) from AlliedModders...`);
      } else {
        // Direct file URL — download as-is
        assetUrl = info.downloadUrl!;
        fileName = info.downloadUrl!.split('/').pop() || `${pluginId}.tar.gz`;
        const urlVersionMatch = fileName.match(/[\d]+\.[\d]+\.[\d]+-git[\d]+/);
        version = urlVersionMatch ? urlVersionMatch[0] : info.currentVersion || 'latest';
        console.log(`[PLUGIN] Downloading ${pluginId} from direct URL...`);
      }
    }

    const buffer = await updateService.downloadAsset(assetUrl);
    console.log(`[PLUGIN] Download complete (${buffer.length} bytes). Processing archive...`);

    // Save to temp file and use existing uploadToPool logic
    const tempDir = path.join(PROJECT_ROOT, 'data', 'temp', 'uploads');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const tempPath = path.join(tempDir, fileName);
    await fs.promises.writeFile(tempPath, buffer);

    try {
      console.log(`[PLUGIN] Extracting and installing ${pluginId} to pool...`);
      await pluginInstaller.uploadToPool(pluginId, tempPath, fileName, version);
      console.log(`[PLUGIN] ${pluginId} sync complete (${version}).`);
    } finally {
      if (fs.existsSync(tempPath)) await fs.promises.unlink(tempPath).catch(() => {});
    }
  }

  /**
   * Uninstalls Metamod and all dependent plugins
   */
  async uninstallMetamod(installDir: string, instanceId: string | number): Promise<void> {
    const csgoDir = path.join(installDir, instanceId.toString(), 'game', 'csgo');
    const addonsDir = path.join(csgoDir, 'addons');
    console.log(`[PLUGIN] Performing deep cleanup of Metamod and dependencies...`);
    const metaFiles = ['metamod', 'metamod.vdf', 'metamod_x64.vdf'];
    await Promise.all(
      metaFiles.map((p) =>
        fs.promises.rm(path.join(addonsDir, p), { recursive: true, force: true }).catch(() => {})
      )
    );
    // We do NOT remove CS# automatically when removing Metamod.
    // Metamod is a dependency, but removing it shouldn't delete user's CS# configs/plugins.
    /* 
    const cssDir = path.join(addonsDir, 'counterstrikesharp');
    try {
      await fs.promises.rm(cssDir, { recursive: true, force: true });
      db.prepare(`DELETE FROM server_plugins WHERE server_id = ? AND plugin_id != 'metamod'`).run(
        instanceId
      );
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code !== 'ENOENT') throw new Error('Cannot remove CS#: Files in use.');
    }
    */
    const gameinfo = path.join(csgoDir, 'gameinfo.gi');
    try {
      let content = await fs.promises.readFile(gameinfo, 'utf8');
      content = content.replace(/\s*Game\tcsgo\/addons\/metamod/g, '');
      await fs.promises.writeFile(gameinfo, content);
    } catch {
      /* ignore */
    }
    try {
      await fs.promises.rm(addonsDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  /**
   * Uninstalls CounterStrikeSharp
   */
  async uninstallCounterStrikeSharp(
    installDir: string,
    instanceId: string | number
  ): Promise<void> {
    const cssDir = path.join(
      installDir,
      instanceId.toString(),
      'game',
      'csgo',
      'addons',
      'counterstrikesharp'
    );
    await fs.promises.rm(cssDir, { recursive: true, force: true }).catch(() => {});
  }

  /**
   * Deletes a plugin from the pool
   */
  async deleteFromPool(pluginId: string): Promise<void> {
    // 1. Sanitize the pluginId (only allow alphanumeric, dash, underscore)
    // This prevents basic path traversal attempts like ../../secret
    if (!/^[a-zA-Z0-9\-_]+$/.test(pluginId)) {
      throw new Error(`Invalid plugin ID format: ${pluginId}`);
    }

    const registry = await this.getRegistry();
    const pluginInfo = registry[pluginId];

    if (!pluginInfo) {
      throw new Error(`Plugin "${pluginId}" not found in registry`);
    }

    // 2. Resolve and verify the path is within the pool directory
    const folderName = pluginInfo.folderName || pluginId;
    const poolPath = path.resolve(POOL_DIR, folderName);

    if (!poolPath.startsWith(POOL_DIR)) {
      throw new Error('Access denied: Unauthorized path access attempted.');
    }

    if (!fs.existsSync(poolPath)) {
      throw new Error(`Plugin "${pluginId}" not found in pool`);
    }

    await fs.promises.rm(poolPath, { recursive: true, force: true });
    console.log('[POOL] Deleted plugin from pool:', pluginId);
  }
}

export const pluginManager = new PluginManager();
