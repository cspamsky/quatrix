import { Router } from 'express';
import type { Request, Response } from 'express';
import db from '../db.js';
import { serverManager } from '../serverManager.js';
import { authenticateToken } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { systemService } from '../services/SystemService.js';
import si from 'systeminformation';
import type { AuthenticatedRequest, Settings } from '../types/index.js';

const router = Router();

// Cache for public IP - Passed from index.ts or handled locally
let cachedPublicIp = '127.0.0.1';
const fetchPublicIp = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = (await response.json()) as { ip: string };
    cachedPublicIp = data.ip;
  } catch {
    console.warn('Could not fetch public IP in route, using default.');
  }
};
fetchPublicIp();

router.use(authenticateToken);

// GET /api/settings
router.get('/settings', authorize('settings.manage'), (req: Request, res: Response) => {
  try {
    const settings = db.prepare('SELECT * FROM settings').all() as Array<{
      key: string;
      value: string;
    }>;
    const settingsObj = settings.reduce((acc: Settings, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
    res.json(settingsObj);
  } catch {
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

// GET /api/stats - Global dashboard stats (Optimized with SQL aggregation)
router.get('/stats', authorize('dashboard.view'), (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    // Single SQL query with aggregation - offloads work to SQLite engine
    const stats = db
      .prepare(
        `
            SELECT 
                COUNT(*) as totalServers,
                COALESCE(SUM(CASE WHEN status = 'ONLINE' THEN 1 ELSE 0 END), 0) as activeServers,
                COALESCE(SUM(current_players), 0) as totalPlayers
            FROM servers 
            WHERE user_id = ?
        `
      )
      .get(authReq.user.id) as {
      totalServers: number;
      activeServers: number;
      totalPlayers: number;
    };

    res.json(stats);
  } catch {
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

// PUT /api/settings
router.put('/settings', authorize('settings.manage'), (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

    const transaction = db.transaction((items: Record<string, string>) => {
      for (const [key, value] of Object.entries(items)) {
        stmt.run(key, value);
      }
    });

    transaction(updates);

    // Refresh manager settings to pick up changes
    serverManager.refreshSettings();

    res.json({ message: 'Settings updated successfully' });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Settings update error:', err);
    res.status(500).json({ message: 'Failed to update settings', error: err.message });
  }
});

// GET /api/system/health
router.get('/system/health', authorize('settings.manage'), async (req: Request, res: Response) => {
  try {
    const health = await serverManager.getSystemHealth();
    res.json(health);
  } catch {
    res.status(500).json({ message: 'Failed to fetch system health' });
  }
});

// POST /api/system/health/repair
router.post(
  '/system/health/repair',
  authorize('settings.manage'),
  async (req: Request, res: Response) => {
    try {
      const result = await serverManager.repairSystemHealth();
      res.json(result);
    } catch {
      res.status(500).json({ message: 'Failed to perform system repair' });
    }
  }
);

// GET /api/system-info
router.get('/system-info', async (req: Request, res: Response) => {
  try {
    const [os, mem, cpu, systemStatus, networkInterfaces] = await Promise.all([
      si.osInfo().catch((e) => {
        console.error('[SI] OS Error:', e);
        return { distro: 'Generic', release: 'OS', hostname: 'unknown', arch: 'x64' } as any;
      }),
      si.mem().catch((e) => {
        console.error('[SI] MEM Error:', e);
        return { total: 0 } as any;
      }),
      si.cpu().catch((e) => {
        console.error('[SI] CPU Error:', e);
        return { manufacturer: '', brand: '' } as any;
      }),
      systemService.getSystemStatus().catch((e) => {
        console.error('[SYSTEM] Status Error:', e);
        return { timezone: 'UTC', time: new Date().toISOString() };
      }),
      si.networkInterfaces().catch((e) => {
        console.error('[SI] Network Error:', e);
        return [];
      }),
    ]);

    // Filter and format network interfaces to get only active IPv4 addresses
    const interfaces = Array.isArray(networkInterfaces)
      ? (networkInterfaces as si.Systeminformation.NetworkInterfacesData[])
          .filter((iface) => iface.ip4 && iface.ip4 !== '127.0.0.1')
          .map((iface) => ({ name: iface.iface, ip: iface.ip4 }))
      : [];

    // Better CPU String logic from index.ts
    let cpuModel = 'Processor';
    if (cpu.brand || cpu.manufacturer) {
      cpuModel = `${cpu.manufacturer || ''} ${cpu.brand || ''}`.trim();
    } else if (process.env.PROCESSOR_IDENTIFIER) {
      cpuModel = process.env.PROCESSOR_IDENTIFIER;
    }

    // Memory Guard for Windows
    let totalMemMB = Math.round((mem.total || 0) / (1024 * 1024));
    if (totalMemMB === 0 && process.platform === 'win32') {
      try {
        const osMem = (os as any).totalmem;
        if (osMem) totalMemMB = Math.round(osMem / (1024 * 1024));
      } catch {
        // Fallback to 0 if totalmem is not available
      }
    }

    res.json({
      os: `${os.distro} ${os.release}`,
      arch: os.arch,
      hostname: os.hostname,
      publicIp: cachedPublicIp,
      cpuModel,
      totalMemory: totalMemMB,
      timezone: systemStatus.timezone,
      serverTime: systemStatus.time,
      interfaces,
    });
  } catch (error) {
    console.error('[API] system-info critical failure:', error);
    res.status(500).json({ message: 'Failed to fetch system info' });
  }
});

// POST /api/settings/steamcmd/download
router.post(
  '/settings/steamcmd/download',
  authorize('settings.manage'),
  async (req: Request, res: Response) => {
    try {
      const { path: steamPath } = req.body;
      if (!steamPath) return res.status(400).json({ message: 'Path is required' });

      // Update DB
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
        'steamcmd_path',
        steamPath
      );

      // Refresh manager settings to pick up new path
      serverManager.refreshSettings();

      // Simple validation or trigger download
      const success = await serverManager.ensureSteamCMD();
      if (success) {
        res.json({ message: 'SteamCMD is ready' });
      } else {
        res.status(500).json({ message: 'SteamCMD download/verification failed' });
      }
    } catch {
      res.status(500).json({ message: 'Failed to process SteamCMD download' });
    }
  }
);

// GET /api/system/timezones
router.get(
  '/system/timezones',
  authorize('settings.manage'),
  async (req: Request, res: Response) => {
    try {
      const timezones = await systemService.getTimezones();
      const current = await systemService.getCurrentTimezone();
      res.json({ timezones, current });
    } catch {
      res.status(500).json({ message: 'Failed to fetch timezones' });
    }
  }
);

// POST /api/system/timezone
router.post(
  '/system/timezone',
  authorize('settings.manage'),
  async (req: Request, res: Response) => {
    try {
      const { timezone } = req.body;
      if (!timezone) return res.status(400).json({ message: 'Timezone is required' });

      const result = await systemService.setTimezone(timezone);
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch {
      res.status(500).json({ message: 'Failed to set timezone' });
    }
  }
);

export default router;
