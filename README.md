# <img src=".github/assets/logo.png" width="38" height="38" /> Quatrix CS2 Server Manager

**NOTE:** Quatrix panel is still under development.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.6.0-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

![Quatrix Demo](.github/assets/quatrix.gif)

A web-based management panel for Counter-Strike 2 dedicated servers. Quatrix provides real-time monitoring, RCON console, player management, and **hybrid orchestration** (Local VDS + Pterodactyl) support through a modern web interface.

**Target users:** CS2 server administrators running Linux dedicated servers  
**Scope:** Server-side management only (no client modifications or exploits)

---

## Why Quatrix

Quatrix addresses common pain points in CS2 server management:

- **Multi-instance efficiency**: Run multiple CS2 server instances without duplicating 60GB+ game files
- **Plugin management**: Centralized plugin pool with per-instance configuration
- **Real-time control**: WebSocket-based live updates for console, chat, and player data
- **Modern interface**: React-based UI with responsive design and dark mode

---

## ✨ Features

### Core Functionality

- **Dashboard**: Real-time CPU, RAM, and network usage monitoring
- **RCON Console (v3)**: Interactive command execution with time-stamp stripping, advanced noise filtering, and persistent history
- **Player Management**: Live player list with Steam profiles, connection times, and kick/ban controls _(Requires [SimpleAdmin](https://github.com/daffyyyy/CS2-SimpleAdmin))_
- **Chat Monitor**: Real-time in-game chat with player avatars and historical infinite-scroll support
- **File Manager**: Web-based config editor (supports `.cfg`, `.json`, `.txt`, `.toml`)
- **Analytics Dashboard**: Historical system performance metrics with customizable time ranges (24h, 7d, 30d)

### Instance Management

- **Hybrid Orchestration**: Manage both local VDS instances and remote Pterodactyl panels from a single dashboard
- **Granular symlinking**: Shares game files while isolating configs/plugins using the "Isolation Performance Engine"
- **Plugin Management**: Smart Sync engine that intelligently distributes files to standard CSS directories
- **Auto-repair**: Proactive maintenance that excludes vital framework configs (like `core.json`)
- **Automated backups**: External portability via direct file streaming (Download/Upload)

### Administration

- **ACL Permission System**: Granular access control with permissions like `servers.create`, `servers.update`, `users.manage`
- **Transparent Observer Mode**: All users can view all pages, but actions are restricted based on permissions
- **User authentication**: JWT-based sessions with optional 2FA (TOTP)
- **Admin system**: Integrated with CounterStrikeSharp's ecosystem _(compatible with [SimpleAdmin](https://github.com/daffyyyy/CS2-SimpleAdmin) for user management)_
- **Multi-language**: English and Turkish localization (i18next)

---

## 🏗️ Architecture

```
┌─────────────┐
│  React UI   │ ← WebSocket/REST → ┌──────────────┐
└─────────────┘                     │  Node.js API │
                                    └──────┬───────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
              ┌─────▼─────┐          ┌────▼────┐           ┌─────▼─────┐
              │ SQLite DB │          │ Plugins │           │ CS2 Core  │
              └───────────┘          │  Pool   │           │  (60GB+)  │
                                     └─────────┘           └─────┬─────┘
                                                                 │
                                                    ┌────────────┴────────────┐
                                                    │                         │
                                              ┌─────▼──────┐          ┌──────▼─────┐
                                              │ Instance 1 │          │ Instance 2 │
                                              │ (symlinks) │          │ (symlinks) │
                                              └────────────┘          └────────────┘
```

**Stack:**

- **Frontend**: React 19, Vite 7, Tailwind CSS, Socket.IO client
- **Backend**: Node.js 20+, Express, Socket.IO 4.8, better-sqlite3
- **Automation**: SteamCMD integration, systemd service management

---

## 📦 Installation

### Prerequisites

- Ubuntu 20.04+ or Debian 11+ (64-bit)
- Root or sudo access
- At least 70GB free disk space (for CS2 server files)

### Automated Installation

```bash
curl -sSL https://raw.githubusercontent.com/cspamsky/quatrix/main/install.sh | sudo bash
```

This script will:

1. Install Node.js 20, .NET 8 SDK, and required 32-bit libraries
2. Create a `quatrix` system user
3. Clone the repository to `/home/quatrix/quatrix`
4. Install dependencies and build the frontend
5. Configure a systemd service
6. Set up UFW firewall rules for CS2 ports

### Manual Installation

```bash
# Install dependencies
sudo apt update
sudo apt install -y curl git build-essential lib32gcc-s1

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Clone and setup
git clone https://github.com/cspamsky/quatrix.git
cd quatrix
npm install
cd client && npm install && npm run build && cd ..

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start the server
npm start
```

### Post-Installation

Access the panel at `http://your-server-ip:3001`

Default credentials are created on first run. Check the console output for login details.

---

## 🎮 Usage

### Managing Servers

1. **Create an instance**: Dashboard → Instances → Add New
2. **Configure settings**: Set server name, port, game mode, and map
3. **Install plugins**: Use the plugin pool to deploy Metamod:Source and CounterStrikeSharp
4. **Start server**: Click Start button in the instance card

### RCON Console

Execute commands directly from the web interface:

```
changelevel de_dust2
sv_cheats 1
mp_warmup_end
```

### Plugin Management

- Upload plugins to the central pool: `Plugins → Upload`
- Deploy to instances: Select plugin → Choose instances → Deploy
- Edit configs: File Manager → Navigate to plugin folder → Edit `.json`/`.cfg`

### User Permissions

Quatrix uses a granular ACL (Access Control List) system. Available permissions:

- `*` - Root access (all permissions)
- `servers.create` - Create new server instances
- `servers.delete` - Delete server instances
- `servers.update` - Modify server settings
- `servers.console` - Access RCON console
- `servers.files` - Manage server files
- `servers.maps` - Change maps and workshop settings
- `servers.players` - Manage live players (kick/ban)
- `servers.backups` - Create and restore backups
- `servers.database` - Access database management
- `plugins.manage` - Install and configure plugins
- `analytics.view` - View historical system metrics
- `users.manage` - Manage users and permissions

Users without specific permissions can view pages in read-only mode (Transparent Observer).

---

## 📁 Project Structure

```
quatrix/
├── client/              # React frontend (Vite + React 19)
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Route-based page components
│       ├── contexts/    # React context providers
│       ├── hooks/       # Custom React hooks
│       ├── utils/       # Client-side utilities
│       ├── config/      # Frontend configuration
│       ├── locales/     # i18n translation files
│       └── types/       # TypeScript type definitions
├── server/              # Node.js backend (Express + Socket.IO)
│   └── src/
│       ├── routes/      # API endpoint definitions
│       ├── services/    # Business logic and integrations
│       ├── middleware/  # Express middleware (auth, rate limiting)
│       ├── utils/       # Server-side utilities
│       ├── config/      # Backend configuration
│       └── types/       # TypeScript type definitions
├── data/                # Application data (database, SteamCMD)
└── install.sh           # Automated installation script
```

---

## 🗺️ Roadmap

**Completed:**

- ✅ Multi-instance management with "Isolation Performance Engine"
- ✅ Hybrid Orchestration (Local VDS + Pterodactyl Adapter)
- ✅ Real-time Console v3 (Filter/Clean View) and Chat Monitor
- ✅ Infinite Scroll & Historical Chat Archives
- ✅ Workshop Map Downloader & Configuration Manager
- ✅ External Database (MariaDB/MySQL) Orchestrator
- ✅ Steam profile integration & Avatar proxy
- ✅ Standardized "Pool-Only" Plugin Smart Sync
- ✅ 2FA authentication & Granular ACL system
- ✅ System analytics with historical resource trends
- ✅ Portable Backup System (Direct Stream Up/Down)

- ✅ Native Egg Runner (Run Pterodactyl eggs locally with dynamic variable support)
- ✅ Custom Egg Import System (Import Pterodactyl .json egg files directly from UI)
- [ ] Multi-server cluster wide commands
- [ ] Discord Webhook Rich Notifications (Bans/Crashes)
- [ ] Advanced server performance alerting

---

## 🤝 Contributing

Contributions are welcome. Please follow these guidelines:

1. **Fork the repository** and create a feature branch
2. **Follow existing code style**: ESLint for JS/TS, Prettier for formatting
3. **Test your changes**: Ensure the panel builds and runs without errors
4. **Write clear commit messages**: Use conventional commits format
5. **Submit a pull request**: Describe what your changes do and why

### Development Setup

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Run in development mode
npm run dev          # Backend (port 3001)
cd client && npm run dev  # Frontend (port 5173)
```

### Reporting Issues

- Check existing issues before creating a new one
- Include CS2 server version, OS version, and Node.js version
- Provide error logs from `journalctl -u quatrix` or console output

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

**Author:** cspamsky  
**Repository:** [github.com/cspamsky/quatrix](https://github.com/cspamsky/quatrix)

---

## ⚠️ Disclaimer

This project is not affiliated with Valve Corporation. Counter-Strike 2 is a trademark of Valve Corporation.

Quatrix is designed for legitimate server administration only. Do not use this software for cheating, exploits, or any activities that violate Valve's terms of service.
