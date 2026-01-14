### 🔎 Project Feature Analysis

#### 🔴 Must-Have Features
1. **Live Player Intelligence & RCON Control**
   - **Problem it solves:** The current "Players" page (`client/src/pages/Players.tsx`) is using **mocked data**, providing zero actual visibility into who is on the server. Admins cannot kick/ban troublemakers without using the raw console.
   - **Proposed solution:** Implement a `PlayerManager` service in the backend that periodically sends the `status` command via RCON (every 30s). Parse the unique CS2 status output (SteamID, Name, Score, Time) and update a transient `server_players` store or cache. Expose this via a real API (`GET /api/servers/:id/players`) and implement action endpoints (`POST /kick`, `POST /ban`) that execute the corresponding RCON commands.
   - **Affected area:** Backend (`serverManager.ts`, `index.ts`), Frontend (`Players.tsx`), Database (optional, for session history).
   - **Expected impact:** Transforms the application from a monitoring tool into a functional administration platform. Essential for the "Product & User Value" dimension.

2. **Auto-Healing & Crash Recovery**
   - **Problem it solves:** Currently, if the `cs2.exe` process crashes or exits unexpectedly, the `ServerManager` simply marks it as `OFFLINE` in the database. Users must manually notice and restart it.
   - **Proposed solution:** Add a `restart_policy` column to the `servers` table (options: `no`, `on-failure`, `always`). Modify the `serverProcess.on('exit')` handler in `serverManager.ts` to check this policy. If enabled and the exit code is non-zero (or policy is `always`), schedule a `startServer` call after a short backoff delay (e.g., 10 seconds).
   - **Affected area:** Backend (`serverManager.ts`, `db.ts`).
   - **Expected impact:** dramatically improves reliability and uptime, reducing the burden on server admins.

#### 🟠 High-Impact Features
1. **Steam Workshop Bridge**
   - **Problem it solves:** Users are currently limited to standard maps (`de_dust2`, etc.) unless they manually manage files via FTP/File Manager, which is error-prone and tedious. CS2 relies heavily on the Workshop for content.
   - **Proposed solution:** Add `workshop_collection_id` and `workshop_start_map_id` fields to the server configuration. Update the `startServer` arguments to include `+host_workshop_collection` and `+workshop_start_map`. Create a frontend "Map Selector" that uses the Steam Web API to search and select Workshop maps.
   - **Impact:** Unlocks the vast library of community content, significantly increasing user retention and platform utility.

2. **Automated Snapshot Backups**
   - **Problem it solves:** Game servers are fragile; bad config changes or corrupted plugins can break them. There is currently no way to roll back to a known good state.
   - **Proposed solution:** Create a `BackupManager` class. Implement a scheduled task (cron-style) or manual trigger endpoint that creates a timestamped `.zip` archive of critical directories (`game/csgo/cfg`, `game/csgo/addons`). Store these in a `backups/` directory and provide a UI to "Restore" from a list of snapshots.
   - **Impact:** Provides a critical safety net for users, encouraging them to experiment with plugins and configs without fear of permanent breakage.

#### 🟡 Nice-to-Have Features
1. **Dynamic Plugin Marketplace**
   - **Problem it solves:** The current "Plugins" page has hardcoded entries and the backend `serverManager.ts` has a hardcoded `pluginRegistry`. Adding a new plugin requires code changes and a redeploy.
   - **Proposed solution:** Decouple the plugin registry into a remote JSON file (hosted on GitHub or S3) or a database table. The frontend should fetch this manifest dynamically to render the available plugins card grid. This allows the platform developers to add new supported plugins without updating the core application software.

2. **Discord Webhook Notifications**
   - **Problem it solves:** Admins have to actively check the dashboard to know if the server is online or if players are joining.
   - **Proposed solution:** Add a global or per-server `discord_webhook_url` setting. Trigger POST requests to this webhook on specific events: "Server Started", "Server Crashed", "Player Count > X", "Admin Joined".

#### 🟢 Optional / Experimental
1. **Timeseries Analytics Engine**
   - **Idea summary:** Currently, the dashboard only shows "Live" CPU/RAM stats. Implement a lightweight timeseries store (or use a separate table `server_stats_history`) to record metrics every minute. Use `Chart.js` or `Recharts` on the dashboard to visualize "CPU Usage (Last 24h)" or "Player Activity (Last 7 Days)".

---

### 🧠 Technical Notes
- **RCON Parsing Complexity:** CS2 `status` output formatting can vary. The regex logic in `PlayerManager` must be robust and handle potential changes in Valve's output format.
- **SteamCMD Latency:** Workshop maps download on server start. This can delay the "Ready" state. The UI needs a "Downloading Maps..." intermediate status (distinct from "Installing" or "Starting") to prevent users from thinking the server is stuck.
- **Node.js `spawn` Limitations:** The current process management relies on `child_process.spawn`. For true enterprise resilience, moving to a containerized approach (Docker) eventually would be superior, but the "Auto-Healing" feature is a good stopgap within the current architecture.

---

### 🗺️ Roadmap Suggestion
- **Short-term (Next Sprint):**
  - Implement **Auto-Healing** (low effort, high reliability win).
  - Implement **Live Player Intelligence** backend logic to replace the mocked frontend.
- **Mid-term:**
  - Build the **Steam Workshop Bridge** (requires DB schema changes + UI work).
  - Add **Automated Backups**.
- **Long-term:**
  - **Timeseries Analytics**.
  - **Dynamic Plugin Registry** refactor.
