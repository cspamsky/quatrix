# <img src="client/public/vite.svg" width="32" height="32" /> Quatrix CS2 Manager

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF.svg)](https://vitejs.dev/)

**Quatrix** is an elite, real-time web orchestration platform for Counter-Strike 2 server clusters. Designed for professional administrators who demand a premium, high-performance interface with zero-latency feedback.

![Quatrix Dashboard](assets/Dashboard.png)

## 🔥 Why Quatrix?

Game server management shouldn't feel like 1999. Quatrix bridges the gap between raw CLI power and modern UI aesthetics, offering a "glassmorphism" inspired dashboard that puts total control at your fingertips.

### 🚀 Core Performance Features

- **Elite Dashboard**: Live telemetry streams (CPU/RAM/Network) with delta-accurate traffic monitoring.
- **Smart RCON Orchestration**: High-speed console with intelligent auto-scroll, full ANSI color support, and spawngroup-aware status parsing.
- **Dynamic Asset Engine**: Real-time map synchronization with automated themed visuals for the entire official CS2 map pool.
- **Unified File Manager**: A web-native explorer for live configuration editing without SFTP baggage.
- **Self-Healing Deployment**: Intelligent setup scripts with automated SteamCMD provisioning and dependency resolution.

### � Enterprise-Grade Security

- **Data Isolation**: Multi-tenant architecture ensuring users only access their authorized server nodes.
- **JWT-Powered Auth**: Stateless, secure authentication with bcrypt password hashing.
- **Path Confinement**: Strict directory traversal protection for all file system operations.

---

## �️ Technology Stack

| Layer              | Technology                                           |
| :----------------- | :--------------------------------------------------- |
| **Frontend**       | React 19, Vite 7, Tailwind CSS, Lucide Icons         |
| **Backend**        | Node.js (ESM), Express 5, Socket.IO 4.8              |
| **Database**       | Better-SQLite3 (Synchronous Performance)             |
| **Protocols**      | RCON (High-Speed Library), WebSockets                |
| **Infrastructure** | SystemInformation API, SteamCMD, Child Process Spawn |

---

## 🏃 Quick Start

### 1. Prerequisites

- **Node.js**: v18.x or v20.x (Recommended)
- **OS**: Windows (Optimized) / Linux (Testing in progress)

### 2. Rapid Installation

Quatrix features a "One-Click-Style" installation process:

```bash
# Clone the vision
git clone https://github.com/yourusername/quatrix.git
cd quatrix

# Automated Setup & Dependency Resolution
# This will: Initialize .env, Generate Secrets, and Install all Packages
npm run install-all
```

### 3. Launching the Hub

```bash
npm run dev
```

- **Frontend Hub**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`

---

## � Architecture Overview

```text
quatrix/                     # Root Hub
├── client/                  # Frontend Application (React Hub)
│   └── src/                 # Source Code
├── server/                  # Backend Engine (Node Service)
│   ├── data/                # Server Instances & SteamCMD Binaries
│   └── src/                 # Core Logic & ServerManager
└── memory-bank/             # High-Level Documentation & State
```

---

## 🗺️ Roadmap: The Future of Server Management

- [ ] **Live Player Intelligence**: Interactive player cards with Ping/Score/SteamID and UI-driven moderator actions.
- [ ] **Plugin Marketplace**: One-click installation for Metamod, CounterStrikeSharp, and popular community scripts.
- [ ] **Steam Workshop Bridge**: Native workshop browser for automated map deployments.
- [ ] **Snapshot Backups**: Automated backups of configurations and player progress database.
- [ ] **Timeseries Analytics**: Advanced historical charting for server growth tracking.

## 🤝 Contribution & Support

Quatrix is built by specialists for specialists. Whether it's a bug report, a feature request, or a PR, follow our [Contribution Guidelines](CONTRIBUTING.md).

Developed with precision for the CS2 community. ⚡

---

_License: [MIT](LICENSE)_
