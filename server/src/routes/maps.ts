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
