import express from "express";
import { createServer } from "http";
import { Server, type Socket } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import si from "systeminformation";
import db from "./db.js";
import { serverManager } from "./serverManager.js";
import { apiLimiter } from "./middleware/rateLimiter.js";

// Routes
import authRouter from "./routes/auth.js";
import serversRouter from "./routes/servers.js";
import commandsRouter from "./routes/commands.js";
import configRouter from "./routes/config.js";
import filesRouter from "./routes/files.js";
import pluginsRouter from "./routes/plugins.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Make io accessible to routes
app.set('io', io);

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/api', apiLimiter);

// --- Register Routes ---
app.use('/api', authRouter);
app.use('/api', configRouter); // /api/settings, /api/system-info, etc.
app.use('/api/servers', serversRouter); // /api/servers (base)
app.use('/api/servers', commandsRouter); // /api/servers/:id/start, etc.
app.use('/api/servers', filesRouter); // /api/servers/:id/files
app.use('/api/servers', pluginsRouter); // /api/servers/:id/plugins

// --- Background Tasks ---

// WebSocket client counter
let connectedClients = 0;
io.on('connection', (socket: Socket) => {
  connectedClients++;
  socket.on('disconnect', () => {
    connectedClients--;
  });
});

// 1. Stats Collection (Every 2 seconds)
let lastNetworkStats: any = null;
setInterval(async () => {
  if (connectedClients === 0) return;
  try {
    const [cpu, mem, net] = await Promise.all([
      si.currentLoad().catch(() => ({ currentLoad: 0 })),
      si.mem().catch(() => ({ active: 0, total: 1 })),
      si.networkStats().catch(() => [])
    ]);
    
    let netIn = 0, netOut = 0;
    if (lastNetworkStats && net?.length > 0) {
      const currentNet = net[0];
      const lastNet = lastNetworkStats[0];
      if (currentNet?.rx_bytes !== undefined) {
        netIn = Math.max(0, (currentNet.rx_bytes - lastNet.rx_bytes) / 1024 / 1024 / 2);
        netOut = Math.max(0, (currentNet.tx_bytes - lastNet.tx_bytes) / 1024 / 1024 / 2);
      }
    }
    lastNetworkStats = net;

    io.emit("stats", {
      cpu: typeof cpu.currentLoad === 'number' ? cpu.currentLoad.toFixed(1) : "0",
      ram: (mem.total > 0) ? ((mem.active / mem.total) * 100).toFixed(1) : "0",
      memUsed: (mem.active / 1024 / 1024 / 1024).toFixed(1),
      memTotal: (mem.total / 1024 / 1024 / 1024).toFixed(1),
      netIn: netIn.toFixed(2),
      netOut: netOut.toFixed(2)
    });
  } catch (err) { /* silent stats fail */ }
}, 2000);

// 2. Map Sync Task (Every 30 seconds)
setInterval(async () => {
  try {
    const servers = db.prepare("SELECT id, map FROM servers WHERE status = 'ONLINE'").all() as any[];
    await Promise.all(servers.map(async (server) => {
      const currentMap = await serverManager.getCurrentMap(server.id);
      if (currentMap && currentMap !== server.map) {
        db.prepare("UPDATE servers SET map = ? WHERE id = ?").run(currentMap, server.id);
        io.emit('server_update', { serverId: server.id });
      }
    }));
  } catch (err) { /* silent map sync fail */ }
}, 30000);

// 3. System Initialization
serverManager.ensureSteamCMD().then(success => {
    console.log(success ? "🚀 System Ready: SteamCMD is active." : "⚠️ Warning: SteamCMD not found.");
});

// --- Server Lifecycle ---
httpServer.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') console.error(`❌ Port ${PORT} in use.`);
  else console.error("❌ Server Error:", err);
  process.exit(1);
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Quatrix Backend refined and ready on port ${PORT}`);
});

// Catch-all
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});
