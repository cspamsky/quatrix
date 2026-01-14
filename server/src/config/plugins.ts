export interface PluginConfig {
    name: string;
    currentVersion: string;
    githubRepo: string | null;
    downloadUrl?: string;
    downloadUrlPattern?: string;
    assetNamePattern?: string;
    customVersionCheck?: any;
    matchAsset?: (asset: any) => boolean;
}

const metamod: PluginConfig = {
    name: 'Metamod:Source',
    currentVersion: '2.0-git1380',
    githubRepo: null,
    downloadUrl: 'https://mms.alliedmods.net/mmsdrop/2.0/mmsource-2.0.0-git1380-windows.zip',
    customVersionCheck: null
};

const cssharp: PluginConfig = {
    name: 'CounterStrikeSharp',
    currentVersion: 'v1.0.355',
    githubRepo: 'roflmuffin/CounterStrikeSharp',
    downloadUrlPattern: 'https://github.com/roflmuffin/CounterStrikeSharp/releases/download/{version}/counterstrikesharp-with-runtime-windows-{version_clean}.zip',
    assetNamePattern: 'counterstrikesharp-with-runtime-windows-*.zip',
    matchAsset: (asset: any) => asset.name.includes('counterstrikesharp-with-runtime-windows')
};

const matchzy: PluginConfig = {
    name: 'MatchZy',
    currentVersion: '0.8.15',
    githubRepo: 'shobhit-pathak/MatchZy',
    downloadUrlPattern: 'https://github.com/shobhit-pathak/MatchZy/releases/download/{version}/MatchZy-{version}.zip',
    assetNamePattern: 'MatchZy-*.zip',
    matchAsset: (asset: any) => asset.name.startsWith('MatchZy-') && asset.name.endsWith('.zip')
};

const simpleadmin: PluginConfig = {
    name: 'CS2-SimpleAdmin',
    currentVersion: 'v1.7.8-beta-8',
    githubRepo: 'daffyyyy/CS2-SimpleAdmin',
    downloadUrlPattern: 'https://github.com/daffyyyy/CS2-SimpleAdmin/releases/download/{version}/CS2-SimpleAdmin-{version}.zip',
    assetNamePattern: 'CS2-SimpleAdmin-*.zip',
    matchAsset: (asset: any) => asset.name.startsWith('CS2-SimpleAdmin-') && asset.name.endsWith('.zip')
};

export const PLUGIN_REGISTRY = {
    metamod,
    cssharp,
    matchzy,
    simpleadmin
};
