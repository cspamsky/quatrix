import { Router } from "express";
import db from "../db.js";
import { serverManager } from "../serverManager.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

router.use(authenticateToken);

// GET /api/servers/:id/plugins/status
router.get("/:id/plugins/status", async (req: any, res) => {
    const { id } = req.params;
    try {
        const server: any = db.prepare("SELECT id FROM servers WHERE id = ? AND user_id = ?").get(id, req.user.id);
        if (!server) return res.status(404).json({ message: "Server not found" });

        const status = await serverManager.getPluginStatus(id);
        res.json(status);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/servers/:id/plugins/updates
router.get("/:id/plugins/updates", async (req: any, res) => {
    const { id } = req.params;
    try {
        const server: any = db.prepare("SELECT id FROM servers WHERE id = ? AND user_id = ?").get(id, req.user.id);
        if (!server) return res.status(404).json({ message: "Server not found" });

        const updates = await Promise.all([
            serverManager.checkPluginUpdate('metamod'),
            serverManager.checkPluginUpdate('cssharp'),
            serverManager.checkPluginUpdate('matchzy'),
            serverManager.checkPluginUpdate('simpleadmin')
        ]);

        res.json({
            metamod: updates[0],
            cssharp: updates[1],
            matchzy: updates[2],
            simpleadmin: updates[3]
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// Generic Install/Uninstall Action Handler
router.post("/:id/plugins/:plugin/:action", async (req: any, res) => {
    const { id, plugin, action } = req.params;
    try {
        const server: any = db.prepare("SELECT id FROM servers WHERE id = ? AND user_id = ?").get(id, req.user.id);
        if (!server) return res.status(404).json({ message: "Server not found" });

        // Normalize action function names
        let methodName = '';
        if (action === 'install') {
            if (plugin === 'matchzy') methodName = 'installMatchZy';
            else if (plugin === 'simpleadmin') methodName = 'installSimpleAdmin';
            else if (plugin === 'metamod') methodName = 'installMetamod';
            else if (plugin === 'cssharp') methodName = 'installCounterStrikeSharp';
        } else if (action === 'uninstall') {
            if (plugin === 'matchzy') methodName = 'uninstallMatchZy';
            else if (plugin === 'simpleadmin') methodName = 'uninstallSimpleAdmin';
            else if (plugin === 'metamod') methodName = 'uninstallMetamod';
            else if (plugin === 'cssharp') methodName = 'uninstallCounterStrikeSharp';
        } else if (action === 'update') {
             methodName = 'updatePlugin';
        }

        if (!methodName || !(serverManager as any)[methodName]) {
            return res.status(400).json({ message: "Invalid plugin or action" });
        }

        if (action === 'update') {
            await serverManager.updatePlugin(id, plugin);
        } else {
            await (serverManager as any)[methodName](id);
        }

        res.json({ message: `${plugin} ${action}ed successfully` });
    } catch (error: any) {
        console.error(`Plugin ${action} error:`, error);
        res.status(500).json({ message: error.message });
    }
});

export default router;
