# 🎮 Quatrix - CS2 Server Management Panel

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-18.x-blue.svg)](https://reactjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-blueviolet.svg)](https://www.prisma.io/)
[![Ant Design](https://img.shields.io/badge/UI-Ant%20Design-0170fe.svg)](https://ant.design/)

**Quatrix** is a premium, high-performance web-based management platform designed for **Counter-Strike 2** dedicated servers. Built with a focus on **native performance**, Quatrix allows you to deploy, manage, and monitor your servers directly on your host machine with an industry-leading user interface.

> [!WARNING]
> **Work in Progress:** This project is currently under active development. Some features may be incomplete or contain stability issues.

![Quatrix Dashboard](screenshots/dashboard.png)

---

## ✨ Key Features

- 🚀 **One-Click Deployment**: Deploy CS2 servers instantly using integrated SteamCMD automation.
- 📊 **Real-Time Monitoring**: Live tracking of System Resources (CPU, RAM, Storage) via WebSockets.
- 💻 **Pro Terminal**: Robust Xterm.js console integration for live logs and bi-directional RCON commands.
- 📝 **Visual Config Editor**: Manage `.cfg` and `.ini` files through a secure, web-based editor.
- 🌓 **Dynamic Themes**: Seamless switching between **Dark** and **Light** modes across all pages.
- 🌍 **Bilingual Support**: Full support for **English** and **Turkish** languages.
- 📱 **Responsive Design**: Fully optimized for Desktop, Tablet, and Mobile devices.
- 👤 **User Management**: Secure authentication system (JWT + Bcrypt) with individualized server ownership.
- 🛠️ **Server Operations**: Rename, Start, Stop, Delete, and Validate game files directly from the dashboard.

---

## 📸 Screenshots

<details>
<summary>View More Screenshots</summary>

### Login Page
![Login](screenshots/login.png)

### Register Page
![Register](screenshots/register.png)

### Settings Page
![Settings](screenshots/settings.png)

</details>

---

## 🏗️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, Ant Design 5, Socket.io-client, Xterm.js |
| **Backend** | Node.js, TypeScript, Express, Socket.io, Systeminformation |
| **Database** | SQLite, Prisma ORM |
| **Automation** | SteamCMD (Valve Corporation) |

---

## 🚀 Installation & Setup

### 1. Prerequisites
- **Node.js**: v18.0 or higher
- **SteamCMD**: Installed on the host system
- **OS**: Windows or Linux

### 2. Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Initial Configuration
1. Open `http://localhost:5173` (or your local dev port).
2. Register/Login.
3. Use the **Setup Wizard** or go to **Settings** to configure:
   - **SteamCMD Path**: Path to your `steamcmd.exe` directory.
   - **Servers Root Path**: Directory where game files will be stored.

---

## 📁 Project Structure

```text
quatrix/
├── backend/            # Express API & Server Management Logic
│   ├── src/services/   # SteamCMD, Process, and Terminal services
│   └── prisma/         # SQLite Schema and Migrations
├── frontend/           # React Dashboard
│   ├── src/components/ # Reusable UI Components
│   └── src/pages/      # Dashboard, Auth, and Settings views
├── screenshots/        # Visual documentation
└── README.md           # Project Overview
```

---

## 🛣️ Roadmap

- [ ] **Phase 6**: Steam Workshop Integration (Workshop Map Manager).
- [ ] **Phase 6**: RCON-based Player Management (Kick/Ban UI).
- [ ] **Phase 7**: Plugin Manager (Metamod/Sourcemod auto-installer).
- [ ] **Phase 8**: Detailed Server Backups & Automatic Updates.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Developed with ❤️ by the Quatrix Team.**  
*Disclaimer: This project is not affiliated with Valve Corporation.*
