export const MOCK_INSTANCES = [
  {
    id: 1,
    name: "Elite Competitive | 128 Tick",
    map: "de_mirage",
    status: "ONLINE",
    current_players: 8,
    max_players: 10,
    port: 27015,
    isInstalled: true,
  },
  {
    id: 2,
    name: "Retakes Only #1 | Mirage/Inferno",
    map: "de_inferno",
    status: "ONLINE",
    current_players: 5,
    max_players: 10,
    port: 27016,
    isInstalled: true,
  },
  {
    id: 3,
    name: "Surfing Heaven - Noob Friendly",
    map: "surf_skyworld",
    status: "OFFLINE",
    current_players: 0,
    max_players: 32,
    port: 27017,
    isInstalled: true,
  },
  {
    id: 4,
    name: "CS2 Training Hub",
    map: "de_dust2",
    status: "INSTALLING",
    current_players: 0,
    max_players: 10,
    port: 27018,
    isInstalled: false,
  }
];

export const MOCK_SYSTEM_INFO = {
  publicIp: "123.456.78.90",
  cpu: { load: 12.5 },
  mem: { used: 4.2, total: 16.0 },
  net: { rx_sec: 250000, tx_sec: 180000 },
  servers: 4,
  players: 13
};

export const MOCK_LOGS = [
  { id: "1", type: "info", content: "Initializing server instance..." },
  { id: "2", type: "success", content: "RCON connection established." },
  { id: "3", type: "info", content: "Loading map de_mirage..." },
  { id: "4", type: "warn", content: "Player 'Antigravity' joined with high latency (120ms)" },
  { id: "5", type: "info", content: "Match started: Elite Competitive vs Global Elites" },
  { id: "6", type: "error", content: "Failed to load plugin: CustomAntiCheat.dll (Missing dependency)" }
];

export const MOCK_PLUGINS = {
    metamod: true,
    cssharp: false
};
