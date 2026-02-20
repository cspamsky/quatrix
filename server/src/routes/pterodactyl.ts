import { Router } from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { pterodactylAdapter } from '../services/adapters/PterodactylAdapter.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(authenticateToken);

/**
 * GET /api/pterodactyl/panels
 * List all registered panels
 */
router.get('/panels', authorize('users.manage'), (req, res) => {
  try {
    const panels = db
      .prepare(
        'SELECT id, name, base_url, api_key, client_api_key, created_at FROM pterodactyl_panels'
      )
      .all();
    res.json(panels);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch panels' });
  }
});

/**
 * POST /api/pterodactyl/panels
 * Register a new Pterodactyl panel
 */
router.post('/panels', authorize('users.manage'), (req, res) => {
  const { name, base_url, api_key, client_api_key } = req.body;
  if (!name || !base_url || !api_key) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const id = uuidv4();
    db.prepare(
      'INSERT INTO pterodactyl_panels (id, name, base_url, api_key, client_api_key) VALUES (?, ?, ?, ?, ?)'
    ).run(id, name, base_url, api_key, client_api_key || null);
    res.json({ id, name, base_url });
  } catch (error) {
    res.status(500).json({ message: 'Failed to register panel' });
  }
});

/**
 * DELETE /api/pterodactyl/panels/:id
 */
router.delete('/panels/:id', authorize('users.manage'), (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM pterodactyl_panels WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete panel' });
  }
});

/**
 * GET /api/pterodactyl/panels/:id/servers
 * List servers from the panel using the panel's API key
 */
router.get('/panels/:id/servers', authorize('users.manage'), async (req, res) => {
  const { id } = req.params;
  try {
    const panel = db.prepare('SELECT * FROM pterodactyl_panels WHERE id = ?').get(id) as any;
    if (!panel) return res.status(404).json({ message: 'Panel not found' });

    pterodactylAdapter.registerPanel(panel.id, {
      baseUrl: panel.base_url,
      apiKey: panel.api_key,
      clientApiKey: panel.client_api_key,
    });

    const response = await pterodactylAdapter.listServers(panel.id);
    const remoteServers = response.data || [];

    // Get imported server IDs for this panel to mark them in the UI
    const importedServers = db
      .prepare('SELECT remote_id FROM servers WHERE remote_panel_id = ?')
      .all(id) as { remote_id: string }[];
    const importedIds = new Set(importedServers.map((s) => s.remote_id));

    const enrichedServers = remoteServers.map((s: any) => {
      if (!s || !s.attributes) return s;
      return {
        ...s,
        is_imported: importedIds.has(s.attributes.identifier) || importedIds.has(s.attributes.uuid),
      };
    });

    res.json(enrichedServers);
  } catch (error: any) {
    const isAuthError = error.message.includes('401') || error.message.includes('Unauthorized');
    const helpMessage = isAuthError
      ? 'Unauthorized. Please check your API keys. Make sure to include the "ptla_" or "ptlc_" prefix.'
      : error.message || 'Failed to list remote servers';

    console.error('[Pterodactyl API Error Details]:', {
      message: error.message,
      isAuthError,
      response: error.response?.data,
    });

    res.status(isAuthError ? 400 : 500).json({
      message: helpMessage,
      error: error.toString(),
      suggestion: isAuthError
        ? 'Check if you entered the Application API key or Client API key correctly with their prefixes (ptla_ or ptlc_).'
        : undefined,
    });
  }
});

/**
 * POST /api/pterodactyl/import
 * Import a server into Quatrix
 */
router.post('/import', authorize('users.manage'), async (req, res) => {
  const { panel_id, remote_id, name, port, ip } = req.body;
  const user_id = (req as any).user.id;

  if (!panel_id || !remote_id || !name || !port) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // 1. Check if server already exists (ID check)
    const existingById = db
      .prepare('SELECT 1 FROM servers WHERE remote_id = ? AND remote_panel_id = ?')
      .get(remote_id, panel_id);
    if (existingById) {
      return res.status(400).json({ message: 'This server is already imported' });
    }

    // 2. Check if port is in use
    const existingByPort = db.prepare('SELECT name FROM servers WHERE port = ?').get(port) as
      | { name: string }
      | undefined;
    if (existingByPort) {
      return res
        .status(400)
        .json({ message: `Port ${port} is already in use by instance: ${existingByPort.name}` });
    }

    const stmt = db.prepare(`
      INSERT INTO servers (user_id, name, port, ip, status, remote_id, remote_panel_id, is_installed)
      VALUES (?, ?, ?, ?, 'OFFLINE', ?, ?, 1)
    `);

    const result = stmt.run(user_id, name, port, ip || null, remote_id, panel_id);
    res.json({ id: result.lastInsertRowid, name, remote_id });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to import server' });
  }
});

export default router;
