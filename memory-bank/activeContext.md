# Active Context

## Current Focus

**Phase 6: Player & Plugin Management**

- [ ] **Real-time Player Management** implementation (Gamedig + RCON)
- [ ] **Actual Plugin Installation/Management** logic
- [ ] **User Activity logging** backend system (CRUD for logs)

- **Demo & Deployment Optimization (Phase 5 Completion)**:

  - ✅ **High-Fidelity Demo Mode**: Implemented a comprehensive mock data engine and Socket.IO simulation layer.
  - ✅ **Smart Environment Detection**: Automatic Demo Mode activation for Vercel/Netlify hosting; strictly disabled on localhost to prevent dev interference.
  - ✅ **Simplified User Schema**: Stripped legacy `email` and `fullname` fields from the database and authentication logic for a leaner, security-focused architecture.
  - ✅ **Instant Demo Login**: Added an "Explore Demo" button on the login page (hosted environments only) for frictionless exploration.
  - ✅ **Unified Quatrix Branding**: Finalized branding consistency across all UI components, sidebars, and documentation.

  - ✅ **RCON Protocol Overhaul**: Switched from `srcds-rcon` to `rcon-client` for superior modern Source 2 support and robustness.
  - ✅ **Public IP Detection & Caching**: Implemented automatic WAN IP detection using `ipify.org` with a backend caching layer to ensure instant and accurate server addresses.
  - ✅ **Smart Console Auto-scroll**: Implemented intelligent auto-scroll that pauses when the user scrolls up and resumes when they "catch up" to the bottom.
  - ✅ **Real-time Performance Metrics**: Expanded dashboard telemetry to include detailed RAM (Used/Total GB) and live Network Traffic (Incoming/Outgoing MB/s).
  - ✅ **Dynamic WebSocket Monitoring**: Updated the dashboard to reflect real-time connection status with the backend socket.
  - ✅ **Log Processing Optimization**: Implemented buffering and line-splitting for SteamCMD output to prevent fragmented messages.
  - ✅ **Progress Update Deduplication**: Added frontend logic to replace the last progress line with the newest update instead of appending.
  - ✅ **Console Formatting & Coloring**: Preserved multi-line RCON formatting and added color-coding for `[ERROR]`, `[SUCCESS]`, and `[WARN]` messages.
  - ✅ **Real-time State Sync**: Integrated `status_update` socket events for immediate UI state transitions.
  - ✅ **Backend Resilience**: Added automatic server status reset to 'OFFLINE' on backend startup to prevent stale 'ONLINE' states after crashes.
  - ✅ **SteamCMD Path Self-Healing**: Implemented startup logic to automatically correct invalid `steamcmd_path` in DB (appending `.exe` to directories).
  - ✅ **Crash Prevention**: Added error handling for `spawn` processes to prevent backend termination when executables are missing.
  - ✅ **Smart Settings Logic**: Updated Settings API to intelligently handle directory vs executable inputs for SteamCMD path.
  - ✅ **Module Resolution Fix**: Switched `adm-zip` to static import and enabled `esModuleInterop` to resolve TS500 compilation errors in `nodenext` environment.
  - ✅ **Console Rendering Optimization**: Implemented unique UUID-based keys for log entries to prevent unnecessary React re-renders when log array is sliced (performance boost for high-frequency updates).
  - ✅ **Real-time Status Synchronization**: Added Socket.IO `status_update` listeners to Instances page and proper event emissions in stop/restart endpoints for instant UI updates across all pages.
  - ✅ **Modern Notification System**: Implemented toast notifications (success/error/warning/info) and confirmation dialogs to replace all `alert()` and `confirm()` calls with premium UI components.
  - ✅ **Complete File Deletion**: Enhanced server deletion to remove physical files from disk (`server/data/servers/{id}`) in addition to database cleanup.
  - ✅ **Dynamic Map Images**: Implemented map-specific themed images for all CS2 maps using Unsplash CDN with fallback mechanism.
  - ✅ **RCON Map Detection**: Added periodic RCON `status` polling to detect map changes made via console commands, with CS2 spawngroup format parsing.
  - ✅ **Console Noise Reduction**: Optimized the map check interval to only execute and log when servers are actually ONLINE, preventing terminal clutter when the system is idle.
  - ✅ **Interval Optimization**: Set a 30-second production interval for map checks to balance real-time sync with system performance.
  - ✅ **Server Settings Update Endpoint**: Created `PUT /api/servers/:id` endpoint with Socket.IO emission for real-time UI synchronization on settings changes.

- **Jules API Integration & AI Collaboration**:

  - ✅ **Log Reading Optimization**: Jules implemented reverse chunked file reading (4KB chunks).
  - ✅ **Successful Merge**: Jules's performance optimization merged to main branch.
  - ✅ **AI-to-AI Workflow**: Established pattern where Antigravity manages project context and Jules handles performance tasks.

- **Advanced Server Management (Phase 5 Completed)**:

  - ✅ **Server Restart**: Implemented backend logic and frontend buttons for quick instance recycling.
  - ✅ **File Manager**: Built a web-based file explorer allows browsing and live editing of server configuration files (`.cfg`, `.json`, etc.).
  - ✅ **Improved RCON Integration**: Refined command sending logic in `ServerManager` for more robust console interactions.
  - ✅ **Dynamic Dashboard Stats**: Connected the UI to live server health metrics (CPU, RAM) and user-specific server/player counts.
  - ✅ **Secure API Utility**: Created a central `apiFetch` frontend wrapper to ensure JWT tokens are automatically injected into all management requests.

- **Stabilization & Dev-Loop Improvements**:

  - ✅ **Dev Script Update**: Moved from `tsx` to `npx tsc && node --watch` due to instability on Windows (esbuild/nodenext conflict).
  - ✅ **is_installed Persistence**: Added `is_installed` column to database and ensured it updates upon successful SteamCMD installation.
  - ✅ **Naming Convention Fix**: Aliased `is_installed` (SQL) to `isInstalled` (JS) in API responses for frontend compatibility.

- **Critical Security & Synchronization**:

  - ✅ **JWT Ownership Fix**: Resolved authorization issues where GitHub pull operations partially reverted user ownership (`user_id`) checks on critical endpoints.
  - ✅ **Steamworks SDK Persistence**: Re-verified and re-applied Steam DLL fixes in `ServerManager` after project pull synchronization.
  - ✅ **Socket.IO Namespace Fix**: Renamed console events to `console:id` format for better consistency.

- **Authentication & Security Overhaul**:

  - ✅ Implemented `/api/register` and `/api/login` endpoints with **bcrypt** password hashing.
  - ✅ Protected all server management API routes with **JWT** (JSON Web Token) middleware.
  - ✅ Eliminated hardcoded JWT secrets; system now requires `JWT_SECRET` environment variable.
  - ✅ Implemented data isolation: users can only manage servers they created (`user_id` tracking).

- **Professionalization & Automation (Elite Repository Standards)**:
  - ✅ **Setup Automation**: Created `setup.js` to automatically generate `.env` and strong `JWT_SECRET` during `npm run install-all`.
  - ✅ **Full Documentation Hub**: Authored comprehensive `README.md` (with roadmap/tech stack), `CONTRIBUTING.md`, and MIT `LICENSE`.
  - ✅ **Elite Asset Management**: Organized screenshots and branding assets into a dedicated `assets/` directory.
  - ✅ **Open-Source Readiness**: Refined `.gitignore` and repository structure for public distribution.
  - ✅ **Branding Consistency**: Standardized all internal and external references to "Quatrix".

### Technical Implementation Details

**Key Files Modified**:

- `server/src/index.ts`: Added `PUT /api/servers/:id` endpoint, periyodik map check interval, enhanced delete endpoint with file removal, socket emissions for `server_update` events. Updated auth routes for simplified schema.
- `server/src/db.ts`: Simplified `users` table schema (removed email/fullname).
- `client/src/utils/api.ts`: Enhanced `apiFetch` with Demo Mode interception and smart environment detection.
- `client/src/utils/socket.ts`: Created unified socket utility with `MockSocket` for simulated telemetry in Demo Mode.
- `client/src/utils/demoData.ts`: Centralized high-fidelity mock data for servers, logs, and system info.
- `client/src/pages/Login.tsx`: Added Conditional "Explore Demo" button and updated registration/login forms for simplified schema.
- `client/src/components/Layout.tsx`: Updated sidebar branding and user display logic.
- `client/src/pages/Instances.tsx`: Integrated with centralized socket utility for real-time updates.
- `README.md` & `CONTRIBUTING.md`: Overhauled project documentation hub.
- `setup.js`: Automated environment and secret configuration script.
- `.gitignore`: Refined for asset organization and added rules for temporary `.bak`/`.tmp` files.
- `LICENSE`: Added MIT license.

**Jules API Integration**:

- API Key: Stored securely, used for programmatic session management
- Session Management: Can create, monitor, and approve Jules's optimization plans
- Workflow: Antigravity identifies issues → Jules implements optimizations → Antigravity tests and merges

## Next Steps

1. **Live Player Control (Phase 6)**:
   - Implement real-time player list (Name, Ping, SteamID) via RCON and Gamedig.
   - Add frontend UI for Kick, Ban, and Mute actions.
2. **One-Click Plugin Manager**:
   - Create Metamod/CounterStrikeSharp auto-installer.
   - Implement a plugin gallery/marketplace for easy one-click installations.
3. **Steam Workshop Integration**:
   - Integrate Steam Web API for map searching and installation via Workshop IDs.
4. **Smart Backup System (Snapshots)**:
   - Implement ZIP-based backup mechanism for server configurations and user data.
5. **Advanced Analytics & Charts**:
   - Create historical usage charts for CPU/RAM and player counts using Chart.js.
6. **Activity Logging**:
   - Implement a backend audit trail system to track user actions across the panel.

- **Build-Based Dev loop**: Use `npx tsc && node --watch dist/index.js` for backend development on Windows to ensure maximum stability and proper ECMA module resolution.
- **Path Confinement**: All file manager operations must use `path.resolve` and check `startsWith(baseDir)` to prevent directory traversal attacks.
- **Centralized API Handling**: Use `apiFetch` wrapper for all frontend requests to handle token injection and 401 redirects systematically.
- **Console Spam Filtering**: Filter `CTextConsoleWin::GetLine` messages at backend to prevent frontend freeze.
- **isInstalled Aliasing**: Always alias database underscores to camelCase in API responses to match React state patterns.
- **AI Collaboration Pattern**: Use Jules API for performance optimizations and refactoring. Antigravity handles feature implementation, testing, and project context management.
- **PR Conflict Awareness**: Monitor GitHub Pull Request #2 (`Extract InstanceCard`). It currently lacks 'Restart' and 'File Manager' buttons. Must ensure these features are ported to the new component structure before merging or immediately after.

## Learnings & Project Insights

### Environment Specifics

- **esbuild/tsx on Windows**: Experiences frequent "TransformError: The service was stopped" when used with `nodenext` module resolution in monorepos. Standard `tsc` is more reliable.
- **SteamCMD Success Codes**: App '730' installation succeeds with code 0, but verified persistence in DB via `is_installed` is necessary for UI logic.
- **Socket.IO Event Naming**: Using colons (e.g., `console:id`) is cleaner than underscores and follows standard namespacing conventions.

### Jules API Integration Insights

- **API Session Lifecycle**: Sessions are temporary and auto-cleanup after completion. No persistent session history via API.
- **Response Times**: API sessions can take 2-5 minutes to process complex tasks. Patience required.
- **Best Use Cases**: Performance optimizations, refactoring, code quality improvements. Not ideal for feature implementation.
- **Collaboration Model**: Jules excels at "Bolt" (performance) tasks. Antigravity better for feature logic and user requirements.
