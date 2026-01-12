# System Patterns

## Architecture

### Overall Structure

- **Client-Server Architecture**: Dual-folder monorepo with separate client and server projects
- **Communication Layers**:
  - **RCON**: Backend communication with CS2 game servers via `rcon-client` for command execution and management (Fully Operational)
  - **Telemetry**: Advanced system metrics (CPU, RAM, Network Traffic MB/s) pushed via Socket.io delta calculation.
  - **Demo Engine**: Simulated telemetry and RCON response layer for zero-backend environments.
  - **Dynamic Addressing**: Automatic WAN IP detection with backend caching for persistent server instance addressing.

### Authentication Flow

```
User → Login/Register → Backend API → JWT Token → localStorage
                                    ↓
                              Database (SQLite)
                                    ↓
                         Protected Routes (Frontend Guard)
```

### Data Flow

```
CS2 Server → RCON/Gamedig → Backend → Socket.IO → Frontend Dashboard
System Metrics → systeminformation → Backend → Socket.IO → Frontend
```

## Key Technical Decisions

### Backend Choices

- **Node.js + TypeScript**: Excellent ecosystem for RCON, Socket.IO, and real-time operations
- **Express 5**: Lightweight, flexible HTTP server
- **SQLite (better-sqlite3)**: Synchronous, portable database for rapid development
- **JWT Authentication**: Stateless, scalable session management
- **bcryptjs**: Industry-standard password hashing

### Frontend Choices

- **React 19 + TypeScript**: Type-safe component development
- **Vite**: Lightning-fast HMR and optimized builds
- **Tailwind CSS**: Utility-first styling for "glassmorphism" design system
- **React Router**: Client-side routing with protected route guards
- **Socket.IO Client**: Real-time bidirectional communication

## Design Patterns

### Authentication Patterns

- **Protected Routes**: Higher-order component pattern for route guarding
- **Public Routes**: Redirect authenticated users away from auth pages
- **JWT Storage**: localStorage for client-side session persistence
- **Dual Login**: Username OR email authentication for flexibility

### Component Patterns

- **Layout Wrapper**: Shared sidebar/navigation for authenticated pages
- **Compound Components**: Complex UI elements broken into smaller, reusable pieces
- **Controlled Components**: Form inputs with React state management
- **Loading States**: Async operations with loading indicators and error handling

### Backend Patterns

- **Observer Pattern**: Socket.IO for distributing real-time data to multiple clients
- **Repository Pattern**: Database operations abstracted through prepared statements
- **Middleware Pattern**: Express middleware for CORS, JSON parsing, etc.
- **Error Handling**: Try-catch blocks with user-friendly error messages

### Database Schema (Simplified)

- **Users**: Lean authentication data (id, username, password, created_at)
- **Servers**: Multi-instance tracking (id, user_id, name, map, max_players, port, status, players, is_installed)
- **Settings**: Global configuration (key, value) (SteamCMD path, Install directory)

### Process Management Patterns

- **Child Process (Spawn)**: Backend manages game servers as child processes for direct OS control.
- **PowerShell Integration**: Windows-specific automation for downloading and extracting SteamCMD.
- **Process Guard Pattern**: Frontend implementation to prevent race conditions during long-running async operations.
- **Real-time Logging Pattern (Socket.IO)**: Pushing child process stdout/stderr directly to namespace-specific Socket.IO events (e.g., `console:{id}`) for live feedback.
- **Progress Update Replacement (Frontend)**: To prevent console clutter during SteamCMD updates, the frontend identifies progress lines and replaces the previous progress entry instead of appending, ensuring a clean "live" update feel.
- **Line-Buffering (Backend)**: Backend buffers stdout/stderr chunks and splits by `\r` and `\n` before emitting to Socket.IO, ensuring logs are sent as full, readable lines.

### Security Patterns (Updated)

- **Password Hashing**: bcrypt with 10 rounds
- **JWT Signing**: Secret-based token generation (24h)
- **CORS Management**: Wildcard/Specific origin allow-listing for cross-port support (5173/5174)
- **Security Headers**: Content-Security-Policy (frame-ancestors), X-Content-Type-Options (nosniff)
- **Input Sanitization**: Parameterized queries via better-sqlite3
- **Secure File Access**: All File Manager operations use `path.resolve` + `startsWith(baseDir)` validation to prevent directory traversal.

### Frontend Patterns (Updated)

- **Centralized API Handling**: All requests use an `apiFetch` utility that injects JWT tokens from localStorage and automatically redirects to `/login` on 401/403 errors.
- **Dynamic Icons**: Component-mapped icon selection based on file extensions in the File Manager.
- **Optimized List Rendering**: Use stable unique IDs (UUID) as React keys instead of array indices, especially for dynamic lists that undergo slice/filter operations, to prevent unnecessary DOM reconciliation.
- **Toast Notification System**: Context-based notification provider with auto-dismiss, manual close, and 4 severity types (success/error/warning/info).
- **Promise-based Confirmation Dialogs**: Modal dialogs that return promises for async user confirmation, replacing browser-native `confirm()`.
- **Dynamic Content Mapping**: Utility functions that map data (e.g., map names) to visual assets (e.g., themed images) for rich UI presentation.

### Backend Lifecycle Patterns (Updated)

- **Installation Orchestration**: SteamCMD completion triggers both a status change and a persistent `is_installed` database update to ensure UI persistence.
- **Alias Mapping**: Backend SQL queries pre-map database underscores to frontend camelCase.
- **Public IP Caching**: Backend fetches WAN IP once on startup and caches it to provide instant, zero-latency system address to the frontend.
- **Stats Delta Calculation**: Network traffic is calculated by comparing total bytes over a 2-second interval to provide accurate MB/s metrics.
- **Smart Auto-scroll**: Frontend terminal logic that intelligently manages scroll state based on user interaction.
- **Self-Healing Configuration**: Backend performs startup checks to validate and correct critical database settings (e.g. correcting directory paths to executable paths) without user intervention.
- **Resilient Process Management**: Spawned processes (SteamCMD, CS2) include explicit 'error' event listeners to prevent unhandled exceptions (like file not found) from crashing the main Node.js process.
- **Periyodik RCON Polling**: Background interval (30 seconds in production) that queries ONLINE servers via RCON `status` command to detect state changes (e.g., map changes) made outside the management interface.
- **CS2 Output Parsing**: Regex patterns tailored to CS2's specific console output format (e.g., spawngroup lines) for reliable data extraction.
- **Recursive File Cleanup**: Server deletion includes `fs.rmSync()` with `recursive: true` to completely remove server directories and prevent disk space leaks.

### Elite Repository Patterns

- **Initialization Orchestration**: A root-level `setup.js` script handles automatic `.env` creation and cryptographic secret generation (JWT_SECRET) before the main `install-all` routine.
- **Professional Asset Management**: Static documentation assets (screenshots, diagrams) are isolated in a root `assets/` directory to maintain a clean, high-standard open-source repository structure.
- **Standardized Documentation**: Adherence to industry standards with comprehensive `README.md`, `CONTRIBUTING.md`, and MIT `LICENSE` files.

## Critical Implementation Paths

### User Registration Flow

1. User submits form (username, password)
2. Frontend validates and sends to `/api/register`
3. Backend checks for existing username
4. Password hashed with bcrypt
5. User inserted into database
6. JWT token generated and returned
7. Frontend stores token and user data in localStorage
8. User redirected to dashboard

### User Login Flow

1. User submits identity (username) and password
2. Frontend sends to `/api/login`
3. Backend queries database for matching username
4. Password verified with bcrypt.compare
5. JWT token generated and returned
6. Frontend stores token and user data
7. User redirected to dashboard

### Protected Page Access

1. User navigates to protected route
2. ProtectedRoute component checks localStorage for token
3. If no token: redirect to /login
4. If token exists: render requested page
5. Layout component displays user profile from localStorage
