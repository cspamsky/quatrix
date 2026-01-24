import { Router } from "express";
import db from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

router.use(authenticateToken);

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
router.post("/workshop", (req, res) => {
    const { workshop_id, name, image_url } = req.body;
    
    if (!workshop_id) {
        return res.status(400).json({ message: "Workshop ID is required" });
    }

    try {
        db.prepare(`
            INSERT INTO workshop_maps (workshop_id, name, image_url)
            VALUES (?, ?, ?)
            ON CONFLICT(workshop_id) DO UPDATE SET
                name = excluded.name,
                image_url = excluded.image_url
        `).run(workshop_id, name || `Workshop Map ${workshop_id}`, image_url || null);
        
        res.status(201).json({ message: "Workshop map added successfully" });
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
