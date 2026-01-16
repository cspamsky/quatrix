import { Router } from "express";
import db from "../db.js";
import { serverManager } from "../serverManager.js";
import { authenticateToken } from "../middleware/auth.js";
import { strictLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.use(authenticateToken);

// GET /api/servers/:id/files - List files
router.get("/:id/files", async (req: any, res) => {
    const { id } = req.params;
    const { path: subDir } = req.query;
    try {
        const server: any = db.prepare("SELECT id FROM servers WHERE id = ? AND user_id = ?").get(id, req.user.id);
        if (!server) return res.status(404).json({ message: "Server not found" });

        const files = await serverManager.listFiles(id, (subDir as string) || '');
        res.json(files);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/servers/:id/files/read - Read file content
router.get("/:id/files/read", async (req: any, res) => {
    const { id } = req.params;
    const { path: filePath } = req.query;
    try {
        const server: any = db.prepare("SELECT id FROM servers WHERE id = ? AND user_id = ?").get(id, req.user.id);
        if (!server) return res.status(404).json({ message: "Server not found" });

        const content = await serverManager.readFile(id, filePath as string);
        res.json({ content });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/servers/:id/files/write - Write file content
router.post("/:id/files/write", strictLimiter, async (req: any, res) => {
    const { id } = req.params;
    const { path: filePath, content } = req.body;
    try {
        const server: any = db.prepare("SELECT id FROM servers WHERE id = ? AND user_id = ?").get(id, req.user.id);
        if (!server) return res.status(404).json({ message: "Server not found" });

        await serverManager.writeFile(id, filePath, content);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
