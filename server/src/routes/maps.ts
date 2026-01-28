import { Router } from "express";
import db from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import { serverManager } from "../serverManager.js";
import path from "path";
import fs from "fs";

const router = Router();

router.use(authenticateToken);

const MAP_CFG_DIR = "cfg/maps_cfg";

// GET /api/maps/config/:serverId/:mapName
router.get("/config/:serverId/:mapName", async (req: any, res) => {
    const { serverId, mapName } = req.params;
    try {
        const server = db.prepare("SELECT id FROM servers WHERE id = ? AND user_id = ?").get(serverId, req.user.id);
        if (!server) return res.status(404).json({ message: "Server not found" });

        const filePath = `${MAP_CFG_DIR}/${mapName}.cfg`;
        try {
            const content = await serverManager.readFile(serverId, filePath);
            res.json({ content });
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return res.json({ content: "" });
            }
            throw error;
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message || "Failed to fetch map config" });
    }
});

// POST /api/maps/config/:serverId/:mapName
router.post("/config/:serverId/:mapName", async (req: any, res) => {
    const { serverId, mapName } = req.params;
    const { content } = req.body;

    try {
        const server = db.prepare("SELECT id, map FROM servers WHERE id = ? AND user_id = ?").get(serverId, req.user.id) as any;
        if (!server) return res.status(404).json({ message: "Server not found" });

        // AUTOMATIC DISCOVERY: If mapName is just a workshop ID, check if we know the real filename
        let finalMapName = mapName;
        const workshopMap = db.prepare("SELECT map_file FROM workshop_maps WHERE workshop_id = ?").get(mapName) as any;
        
        if (workshopMap?.map_file) {
            finalMapName = workshopMap.map_file;
        } else if (/^\d+$/.test(mapName)) {
            // It's a workshop ID but we don't have the file name in DB.
            // Let's ask the server directly via RCON what the current map filename is
            try {
                const currentMap = await serverManager.getCurrentMap(serverId);
                if (currentMap && (currentMap.includes(mapName) || server.map.includes(mapName))) {
                    // Extract actual map name (e.g., from "workshop/123/awp_lego" to "awp_lego")
                    const parts = currentMap.split('/');
                    finalMapName = parts[parts.length - 1];
                    // Update DB so we don't have to ask again
                    db.prepare("UPDATE workshop_maps SET map_file = ? WHERE workshop_id = ?").run(finalMapName, mapName);
                    console.log(`[AUTO-DISCOVERY] Linked Workshop ID ${mapName} to filename ${finalMapName}`);
                }
            } catch (rconErr) {
                console.warn("[AUTO-DISCOVERY] Failed to reach server for map name resolution");
            }
        }

        // Ensure directory exists
        const serverDir = serverManager.getFilePath(serverId, "");
        const cfgDirPath = path.join(serverDir, "game/csgo", MAP_CFG_DIR);

        if (!fs.existsSync(cfgDirPath)) {
            fs.mkdirSync(cfgDirPath, { recursive: true, mode: 0o755 });
        }

        const relativeFilePath = MAP_CFG_DIR + "/" + finalMapName + ".cfg";
        await serverManager.writeFile(serverId, relativeFilePath, content);
        
        res.json({ success: true, message: `Configuration saved for ${finalMapName}`, discoveredName: finalMapName });
    } catch (error: any) {
        console.error("Map config save error:", error);
        res.status(500).json({ message: error.message || "Failed to save map config" });
    }
});

// GET /api/maps/workshop - Get all saved workshop maps
router.get("/workshop", (req, res) => {
    try {
        const maps = db.prepare("SELECT * FROM workshop_maps ORDER BY created_at DESC").all();
        res.json(maps);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch workshop maps" });
    }
});

// POST /api/maps/workshop - Add a new workshop map
router.post("/workshop", async (req, res) => {
    const { workshop_id } = req.body;
    
    if (!workshop_id) {
        return res.status(400).json({ message: "Workshop ID is required" });
    }

    try {
        const { registerWorkshopMap } = await import("../utils/workshop.js");
        const details = await registerWorkshopMap(workshop_id);
        
        res.status(201).json({ 
            message: "Workshop map added successfully",
            details
        });
    } catch (error) {
        console.error("Add workshop map error:", error);
        res.status(500).json({ message: "Failed to add workshop map" });
    }
});

// DELETE /api/maps/workshop/:id - Remove a workshop map
router.delete("/workshop/:id", (req, res) => {
    try {
        db.prepare("DELETE FROM workshop_maps WHERE id = ?").run(req.params.id);
        res.json({ message: "Workshop map removed" });
    } catch (error) {
        res.status(500).json({ message: "Failed to remove workshop map" });
    }
});

export default router;

