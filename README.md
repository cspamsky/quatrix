# 🎮 Quatrix - Advanced CS2 Server Management Panel

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-18.x-blue.svg)](https://reactjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-blueviolet.svg)](https://www.prisma.io/)
[![Ant Design](https://img.shields.io/badge/UI-Ant%20Design-0170fe.svg)](https://ant.design/)

![Quatrix Banner](https://via.placeholder.com/1200x400/1890ff/ffffff?text=Quatrix+CS2+Manager)

**Quatrix** is a premium, high-performance web-based management platform designed for **Counter-Strike 2** dedicated servers. Built with a focus on **native performance**, Quatrix allows you to deploy, manage, and monitor your servers directly on your host machine with an industry-leading user interface.

> [!WARNING]
> **Development Stage:** This project is built with **Vibecoding** and is currently in the active development phase. Some features may be incomplete or contains stability issues.

![Quatrix Dashboard](screenshots/dashboard.png)

---

## ✨ Key Features

- 🚀 **One-Click Deployment**: Deploy CS2 servers instantly using integrated SteamCMD automation.
- 🎮 **Advanced RCON Management**: Dedicated RCON console with live player management (Kick/Ban UI) through a native RCON implementation.
- 📁 **Advanced File Manager**: High-performance filesystem management with bulk operations, Recycle Bin (`.quatrix_trash`), bi-directional Zip support, and clipboard (Cut/Paste) functionality.
- 🌍 **Steam Workshop Support**: Seamlessly manage Workshop collections and maps with database persistence and visual configuration.
- 📊 **Real-Time Monitoring**: Live tracking of System Resources (CPU, RAM, Storage) via WebSockets with optimized card layouts.
- 💻 **Pro Terminal**: Robust Xterm.js console integration for live logs and bi-directional RCON commands.
- 📝 **Visual Config Editor**: Manage `.cfg`, `.json`, and `.txt` files through a secure, full-screen web-based editor.
- 🎨 **Premium UI/UX Design System**: 
  - Unified card design language with soft shadows and borderless variants
  - Optimized Dashboard with compact layouts and hidden scrollbars
  - Consistent Settings page with standardized spacing and button dimensions
  - Fixed navigation with sticky sidebar and header
  - Global scrollbar customization (hidden but functional)
- 🌓 **Dynamic Themes**: Seamless switching between **Dark** and **Light** modes across all pages.
- 🌍 **Bilingual Support**: Full support for **English** and **Turkish** languages with complete i18n coverage.
- 📱 **Responsive UI 2.0**: Fully adaptive dashboard optimized for Desktop, Tablet, and Mobile devices without horizontal overflow.
- 👤 **User Management**: Secure authentication system (JWT + Bcrypt) with individualized server ownership.

---

## 📸 Screenshots

<details>
<summary>View Screenshots</summary>

### Login Page
![Login](screenshots/login.png)

### Register Page
![Register](screenshots/register.png)

### Settings Page
![Settings](screenshots/settings.png)

</details>

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, Ant Design 5, Socket.io-client, Xterm.js |
| **Backend** | Node.js (ESM), TypeScript, Express, Socket.io, Multer, Systeminformation |
| **Database** | SQLite, Prisma ORM |
| **Automation** | SteamCMD (Native Integration) |

---

## ⚡ Quick Start

### Prerequisites
- **Node.js**: v18.0 or higher
- **SteamCMD**: Installed on the host system (Windows)
- **Git**: For cloning the repository
- **Windows OS**: Currently optimized for Windows process management

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/cspamsky/quatrix.git
    cd quatrix
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # This automatically installs dependencies for root, backend, and frontend
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    # Runs backend (3000) and frontend (5173) concurrently
    ```

4.  **Initial Configuration:**
    - Open `http://localhost:5173`.
    - Register an admin account.
    - Follow the **Setup Wizard** to configure your SteamCMD and Server Storage paths.

---

## 📖 Feature Guide

### 🚀 Server Management
- **Dashboard**: Real-time overview of all your servers, including status, players, and resource usage.
- **One-Click Install**: Automatically download and install CS2 servers via SteamCMD.
- **Existing Server Import**: Easily add pre-installed servers by just pointing to their folder path.
- **Force Stop & Restart**: Reliable server control using Windows-native process management (SIGKILL).

### 📂 Advanced File Manager
- **Web-Based Editor**: Integrated **Monaco Editor** (VS Code engine) for editing `.cfg` and `.json` files.
- **Drag & Drop Upload**: Support for dragging files directly into the browser.
- **Zip/Unzip**: Create backups or extract mods on the fly.
- **Context Menu**: Right-click for common actions (Rename, Cut, Download).

---

## 📁 Project Structure

```text
quatrix/
├── backend/            # Node.js ESM API & Process Management
│   ├── src/services/   # SteamCMD, RCON, and Terminal logic
│   └── prisma/         # SQLite Schema and Migrations
├── frontend/           # React 18 Dashboard
│   ├── src/components/ # Advanced UI Components (FileManager, Console)
│   └── src/pages/      # Dashboard and Auth views
├── screenshots/        # Visual documentation
└── README.md           # Project Overview
```

---

## 🛣️ Roadmap

- [x] **Phase 1-5**: Core Server Management (Start/Stop, RCON, SteamCMD).
- [x] **Phase 6**: Advanced File Manager (Zip, Drag&Drop, Monaco Editor).
- [x] **Phase 6**: Steam Workshop Integration.
- [ ] **Phase 7**: Plugin Manager (Metamod/Sourcemod auto-installer).
- [ ] **Phase 8**: Detailed Server Backups & Scheduled Tasks.

---

## 🛑 Troubleshooting

- **Server Won't Start?**
  - Ensure you have a valid GSLT token.
  - Check that no other process is using port 27015.
- **"Breakpad" Errors:**
  - These are standard CS2 log messages and are automatically filtered by Quatrix to keep your console clean.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Developed with ❤️ with Vibecoding.**  
*Disclaimer: This project is not affiliated with Valve Corporation.*
