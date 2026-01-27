import { Router } from "express";
import db from "../db.js";
import { serverManager } from "../serverManager.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

router.use(authenticateToken);

// GET /api/servers/:id/players
router.get("/:id/players", async (req: any, res) => {
    try {
        const id = req.params.id;
        const players = await serverManager.getPlayers(id);
        res.json(players);
    } catch (error: any) {
        res.status(500).json({ message: error.message || "Failed to fetch players" });
    }
});

// POST /api/servers/:id/players/:userId/kick
router.post("/:id/players/:userId/kick", async (req: any, res) => {
    try {
        const { id, userId } = req.params;
        const { reason } = req.body;
        const cmd = `kickid ${userId} "${reason || 'Kicked by administrator'}"`;
        await serverManager.sendCommand(id, cmd);
        res.json({ success: true, message: `Player ${userId} kicked` });
    } catch (error: any) {
        res.status(500).json({ message: error.message || "Failed to kick player" });
    }
});

// POST /api/servers/:id/players/:userId/ban
router.post("/:id/players/:userId/ban", async (req: any, res) => {
    try {
        const { id, userId } = req.params;
        const { duration, reason, playerName, steamId, ipAddress } = req.body; // duration in minutes, 0 for permanent
        
        // Use CSS ban for persistent bans (requires CounterStrikeSharp)
        // Format: css_ban <steamid|name|userid> <duration> <reason>
        const durationMinutes = parseInt(duration) || 0;
        const banReason = reason || 'Banned by admin';
        
        let banCmd = '';
        let kickCmd = '';
        
        if (steamId && steamId !== 'Hidden/Pending') {
            // Prefer Steam ID for accuracy
            banCmd = `css_ban ${steamId} ${durationMinutes} "${banReason}"`;
            kickCmd = `css_kick ${steamId} "${banReason}"`;
        } else {
            // Fallback to user ID
            banCmd = `css_ban #${userId} ${durationMinutes} "${banReason}"`;
            kickCmd = `css_kick #${userId} "${banReason}"`;
        }
        
        // Execute ban command
        await serverManager.sendCommand(id, banCmd);
        
        // Kick player from server
        try {
            await serverManager.sendCommand(id, kickCmd);
        } catch (kickError) {
            console.error('[BAN] Failed to kick player after ban:', kickError);
            // Continue anyway, ban is still applied
        }
        
        // Record ban in database
        const expiresAt = durationMinutes > 0 
            ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
            : null;
        
        db.prepare(`
            INSERT INTO ban_history (
                server_id, player_name, steam_id, ip_address, reason, 
                duration, banned_by, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            playerName || `User #${userId}`,
            steamId || null,
            ipAddress || null,
            banReason,
            durationMinutes,
            req.user?.username || 'Admin',
            expiresAt
        );
        
        res.json({ success: true, message: `Player ${userId} banned and kicked` });
    } catch (error: any) {
        res.status(500).json({ message: error.message || "Failed to ban player" });
    }
});

export default router;
