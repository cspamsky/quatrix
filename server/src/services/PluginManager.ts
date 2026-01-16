import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import AdmZip from 'adm-zip';
import { pluginRegistry, type PluginId } from '../config/plugins.js';

export class PluginManager {
    private pluginRegistry = pluginRegistry;

    async downloadAndExtract(url: string, targetDir: string): Promise<void> {
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const zipPath = path.join(targetDir, 'temp_plugin.zip');
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to download from ${url}: ${response.statusText}`);
            if (!response.body) throw new Error(`Response body is empty for ${url}`);
            
            // @ts-ignore
            await pipeline(Readable.fromWeb(response.body as any), fs.createWriteStream(zipPath));

            const zip = new AdmZip(zipPath);
            zip.extractAllTo(targetDir, true);
        } finally {
            if (fs.existsSync(zipPath)) {
                await fs.promises.unlink(zipPath).catch(() => {});
            }
        }
    }

    async getPluginStatus(installDir: string, instanceId: string | number): Promise<{ metamod: boolean, cssharp: boolean, matchzy: boolean, simpleadmin: boolean }> {
        const id = instanceId.toString();
        const csgoDir = path.join(installDir, id, 'game', 'csgo');
        
        const metamodValues = path.join(csgoDir, 'addons', 'metamod.vdf');
        const metamodBin = path.join(csgoDir, 'addons', 'metamod', 'bin');
        const hasMetamod = fs.existsSync(metamodValues) && fs.existsSync(metamodBin);

        const cssharpDir = path.join(csgoDir, 'addons', 'counterstrikesharp');
        const hasCssharp = fs.existsSync(cssharpDir);

        const matchZyDir = path.join(csgoDir, 'addons', 'counterstrikesharp', 'plugins', 'MatchZy');
        const hasMatchZy = fs.existsSync(matchZyDir);

        const simpleAdminDir = path.join(csgoDir, 'addons', 'counterstrikesharp', 'plugins', 'CS2-SimpleAdmin');
        const hasSimpleAdmin = fs.existsSync(simpleAdminDir);

        return { metamod: hasMetamod, cssharp: hasCssharp, matchzy: hasMatchZy, simpleadmin: hasSimpleAdmin };
    }

    async checkPluginUpdate(pluginId: PluginId): Promise<any> {
        const plugin = this.pluginRegistry[pluginId];
        if (!plugin.githubRepo) {
            return {
                name: plugin.name,
                currentVersion: plugin.currentVersion,
                latestVersion: null,
                hasUpdate: false,
                downloadUrl: ('downloadUrl' in plugin) ? plugin.downloadUrl : null,
                error: 'No GitHub repository available'
            };
        }

        try {
            const apiUrl = `https://api.github.com/repos/${plugin.githubRepo}/releases/latest`;
            const response = await fetch(apiUrl, {
                headers: {
                    'User-Agent': 'Quatrix-CS2-Manager',
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);

            const data = await response.json() as any;
            const latestVersion = data.tag_name;
            
            let downloadUrl = null;
            if (data.assets && Array.isArray(data.assets)) {
                const asset = data.assets.find((a: any) => {
                    if (pluginId === 'cssharp') return a.name.includes('counterstrikesharp-with-runtime-windows');
                    if (pluginId === 'matchzy') return a.name.startsWith('MatchZy-') && a.name.endsWith('.zip');
                    if (pluginId === 'simpleadmin') return a.name.startsWith('CS2-SimpleAdmin-') && a.name.endsWith('.zip');
                    return false;
                });
                downloadUrl = asset?.browser_download_url || null;
            }

            return {
                name: plugin.name,
                currentVersion: plugin.currentVersion,
                latestVersion,
                hasUpdate: latestVersion !== plugin.currentVersion,
                downloadUrl,
                error: null
            };
        } catch (error: any) {
            return {
                name: plugin.name,
                currentVersion: plugin.currentVersion,
                latestVersion: null,
                hasUpdate: false,
                downloadUrl: null,
                error: error.message
            };
        }
    }

    async installMetamod(installDir: string, instanceId: string | number): Promise<void> {
        const id = instanceId.toString();
        const csgoDir = path.join(installDir, id, 'game', 'csgo');
        const metamodUrl = this.pluginRegistry.metamod.downloadUrl;
        if (!metamodUrl) throw new Error("Metamod URL not found");

        await this.downloadAndExtract(metamodUrl, csgoDir);

        const gameinfoPath = path.join(csgoDir, 'gameinfo.gi');
        if (fs.existsSync(gameinfoPath)) {
            let content = fs.readFileSync(gameinfoPath, 'utf8');
            if (!content.includes('csgo/addons/metamod')) {
                if (content.match(/Game_LowViolence\s+csgo_lv/)) {
                    content = content.replace(/(Game_LowViolence\s+csgo_lv[^\r\n]*)/, '$1\n\t\t\tGame\tcsgo/addons/metamod');
                } else if (content.includes('SearchPaths')) {
                    content = content.replace(/(SearchPaths\s*\{)/, '$1\n\t\t\tGame\tcsgo/addons/metamod');
                }
                fs.writeFileSync(gameinfoPath, content);
            }
        }
    }

    async uninstallMetamod(installDir: string, instanceId: string | number): Promise<void> {
        const id = instanceId.toString();
        const csgoDir = path.join(installDir, id, 'game', 'csgo');
        const metamodDir = path.join(csgoDir, 'addons', 'metamod');
        const vdfPath = path.join(csgoDir, 'addons', 'metamod.vdf');

        if (fs.existsSync(metamodDir)) fs.rmSync(metamodDir, { recursive: true, force: true });
        if (fs.existsSync(vdfPath)) fs.unlinkSync(vdfPath);

        const gameinfoPath = path.join(csgoDir, 'gameinfo.gi');
        if (fs.existsSync(gameinfoPath)) {
            let content = fs.readFileSync(gameinfoPath, 'utf8');
            if (content.includes('csgo/addons/metamod')) {
                content = content.replace(/^\s*Game\s+csgo\/addons\/metamod\s*$/gm, '');
                content = content.replace(/SearchPaths\s*{\s*Game\s+csgo\/addons\/metamod/g, 'SearchPaths\n\t\t{');
                content = content.replace(/\s*Game\tcsgo\/addons\/metamod/g, '');
                fs.writeFileSync(gameinfoPath, content);
            }
        }
    }

    async installCounterStrikeSharp(installDir: string, instanceId: string | number): Promise<void> {
        const id = instanceId.toString();
        const csgoDir = path.join(installDir, id, 'game', 'csgo');
        const cssUrl = this.pluginRegistry.cssharp.downloadUrlPattern.replace('{version}', this.pluginRegistry.cssharp.currentVersion).replace('{version_clean}', this.pluginRegistry.cssharp.currentVersion.replace('v', ''));
        await this.downloadAndExtract(cssUrl, csgoDir);
    }

    async uninstallCounterStrikeSharp(installDir: string, instanceId: string | number): Promise<void> {
        const id = instanceId.toString();
        const cssDir = path.join(installDir, id, 'game', 'csgo', 'addons', 'counterstrikesharp');
        if (fs.existsSync(cssDir)) fs.rmSync(cssDir, { recursive: true, force: true });
    }

    async installMatchZy(installDir: string, instanceId: string | number): Promise<void> {
        const id = instanceId.toString();
        const csgoDir = path.join(installDir, id, 'game', 'csgo');
        const matchZyUrl = 'https://github.com/shobhit-pathak/MatchZy/releases/download/0.8.15/MatchZy-0.8.15.zip';
        await this.downloadAndExtract(matchZyUrl, csgoDir);
    }

    async uninstallMatchZy(installDir: string, instanceId: string | number): Promise<void> {
        const id = instanceId.toString();
        const matchZyDir = path.join(installDir, id, 'game', 'csgo', 'addons', 'counterstrikesharp', 'plugins', 'MatchZy');
        if (fs.existsSync(matchZyDir)) fs.rmSync(matchZyDir, { recursive: true, force: true });
    }

    async installSimpleAdmin(installDir: string, instanceId: string | number): Promise<void> {
        const id = instanceId.toString();
        const csgoDir = path.join(installDir, id, 'game', 'csgo');
        const addonsDir = path.join(csgoDir, 'addons');
        const deps = [
            'https://github.com/NickFox007/AnyBaseLibCS2/releases/latest/download/AnyBaseLib.zip',
            'https://github.com/NickFox007/PlayerSettingsCS2/releases/latest/download/PlayerSettings.zip',
            'https://github.com/NickFox007/MenuManagerCS2/releases/latest/download/MenuManager.zip'
        ];
        for (const dep of deps) await this.downloadAndExtract(dep, csgoDir);
        await this.downloadAndExtract('https://github.com/daffyyyy/CS2-SimpleAdmin/releases/latest/download/CS2-SimpleAdmin-1.7.8-beta-8.zip', addonsDir);
    }

    async uninstallSimpleAdmin(installDir: string, instanceId: string | number): Promise<void> {
        const id = instanceId.toString();
        const csgoDir = path.join(installDir, id, 'game', 'csgo');
        const base = path.join(csgoDir, 'addons', 'counterstrikesharp');
        
        ['plugins/CS2-SimpleAdmin', 'plugins/CS2-SimpleAdmin_FunCommands', 'plugins/CS2-SimpleAdmin_StealthModule', 'plugins/MenuManagerCore', 'plugins/PlayerSettings', 'shared/AnyBaseLib', 'shared/CS2-SimpleAdminApi', 'shared/MenuManagerApi', 'shared/PlayerSettingsApi', 'configs/plugins/CS2-SimpleAdmin'].forEach(p => {
            const dir = path.join(base, p);
            if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
        });
    }

    async updatePlugin(installDir: string, instanceId: string | number, pluginId: PluginId): Promise<void> {
        const updateInfo = await this.checkPluginUpdate(pluginId);
        if (!updateInfo.hasUpdate || !updateInfo.downloadUrl) return;

        if (pluginId === 'matchzy') await this.uninstallMatchZy(installDir, instanceId);
        else if (pluginId === 'simpleadmin') await this.uninstallSimpleAdmin(installDir, instanceId);

        const csgoDir = path.join(installDir, instanceId.toString(), 'game', 'csgo');
        if (pluginId === 'simpleadmin') await this.installSimpleAdmin(installDir, instanceId);
        else await this.downloadAndExtract(updateInfo.downloadUrl, csgoDir);

        this.pluginRegistry[pluginId].currentVersion = updateInfo.latestVersion!;
    }
}

export const pluginManager = new PluginManager();
