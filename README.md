# 🎮 Quatrix - CS2 Server Management Panel

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18.x-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

**Modern, powerful web-based management platform for Counter-Strike 2 dedicated servers**

[Features](#-features) • [Quick Start](#-quick-start) • [Screenshots](#-screenshots) • [Documentation](#-documentation)

</div>

---

## 🌟 Overview

**Quatrix** is a premium, high-performance web panel designed for managing **Counter-Strike 2** dedicated servers. Deploy, configure, and monitor your CS2 servers through an intuitive web interface with real-time updates and advanced features.

> **⚠️ Development Status:** Active development - some features may be incomplete or unstable.

---

## ✨ Features

### 🎯 Core Features
- **🚀 One-Click Deployment** - Install CS2 servers instantly via SteamCMD
- **🎮 RCON Console** - Full-featured RCON with player management (kick/ban)
- **📁 File Manager** - Web-based file browser with Monaco editor, zip support, and drag & drop
- **🌍 Workshop Integration** - Manage Steam Workshop collections and maps
- **📊 Real-Time Monitoring** - Live CPU, RAM, and disk usage tracking
- **💻 Live Terminal** - Xterm.js console with real-time server logs

### 🎨 User Experience
- **🌓 Dark/Light Themes** - Seamless theme switching
- **🌍 Multi-Language** - English and Turkish support (i18n)
- **📱 Responsive Design** - Works on desktop, tablet, and mobile
- **🎨 Modern UI** - Built with Ant Design 5
- **👤 User Management** - Secure JWT authentication with role-based access

### 🔧 Technical Features
- **⚡ Real-Time Updates** - WebSocket-based live data
- **🗄️ SQLite Database** - Lightweight and portable
- **🔒 Secure** - Bcrypt password hashing, JWT tokens
- **🎯 Native Performance** - Direct process management
- **📦 Easy Setup** - One-command installation

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/cspamsky/quatrix.git
cd quatrix

# Run automated setup
npm run setup

# Start the application
npm run dev
```

**Access Points:**
- 🎨 **Frontend:** http://localhost:3001
- ⚙️ **Backend API:** http://localhost:3000

### Prerequisites

- **Node.js** v20.0+ ([Download](https://nodejs.org/))
- **npm** v10.0+
- **Git**
- **Windows OS** (optimized for Windows, Linux support planned)
- **SteamCMD** (optional - can be installed via Setup Wizard)

---

## 📖 Documentation

### Installation Options

<details>
<summary><b>Option 1: Automated Setup (Recommended)</b></summary>

```bash
# 1. Clone and navigate
git clone https://github.com/cspamsky/quatrix.git
cd quatrix

# 2. Run setup script
npm run setup

# 3. Start the application
npm run dev
```

The setup script will:
- ✅ Install all dependencies (backend + frontend)
- ✅ Generate Prisma Client
- ✅ Set up the database
- ✅ Verify the installation

</details>

<details>
<summary><b>Option 2: Manual Setup</b></summary>

```bash
# 1. Clone the repository
git clone https://github.com/cspamsky/quatrix.git
cd quatrix

# 2. Install dependencies
npm install

# 3. Setup database
cd backend
npx prisma generate
npx prisma migrate deploy
cd ..

# 4. Start the application
npm run dev
```

</details>

### First-Time Configuration

1. **Open** http://localhost:3001 in your browser
2. **Register** an admin account
3. **Complete** the Setup Wizard:
   - Set SteamCMD installation path
   - Configure CS2 servers root directory
4. **Create** your first CS2 server!

---

## 📸 Screenshots

<details>
<summary>Click to view screenshots</summary>

### Dashboard
![Dashboard](screenshots/dashboard.png)

### Login Page
![Login](screenshots/login.png)

### Settings
![Settings](screenshots/settings.png)

</details>

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Ant Design 5, Socket.io-client, Xterm.js, Monaco Editor |
| **Backend** | Node.js (ESM), TypeScript, Express, Socket.io, Prisma ORM |
| **Database** | SQLite |
| **Real-Time** | WebSockets (Socket.io) |
| **Automation** | SteamCMD, Native Process Management |

---

## 📁 Project Structure

```
quatrix/
├── backend/              # Node.js API & Services
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic (SteamCMD, RCON, etc.)
│   │   └── middleware/  # Auth, validation, etc.
│   └── prisma/          # Database schema & migrations
│
├── frontend/            # React Application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API clients
│   │   └── store/       # State management (Zustand)
│   └── public/
│       └── locales/     # i18n translations
│
├── scripts/             # Utility scripts
│   └── setup.js        # Automated setup script
│
└── screenshots/         # Documentation images
```

---

## 🎯 Feature Highlights

### Server Management
- ✅ Create servers with custom configurations
- ✅ Start/Stop/Restart with one click
- ✅ Import existing server installations
- ✅ Real-time status monitoring
- ✅ Force stop for unresponsive servers

### File Manager
- ✅ Browse server files in web interface
- ✅ Edit configs with Monaco Editor (VS Code engine)
- ✅ Upload/Download files
- ✅ Create/Extract ZIP archives
- ✅ Cut/Copy/Paste operations
- ✅ Recycle bin for deleted files

### RCON Console
- ✅ Execute server commands
- ✅ View live server logs
- ✅ Player management (kick/ban)
- ✅ Real-time player list
- ✅ Command history

### Workshop Management
- ✅ Add Workshop collections
- ✅ Set Workshop start maps
- ✅ Database-persisted configurations

---

## 🛣️ Roadmap

- [x] Core server management (Start/Stop/Restart)
- [x] RCON console integration
- [x] Advanced file manager
- [x] Steam Workshop support
- [x] Real-time monitoring
- [x] Multi-language support (EN/TR)
- [ ] Plugin manager (Metamod/SourceMod)
- [ ] Automated backups
- [ ] Scheduled tasks
- [ ] Multi-user support with permissions
- [ ] Linux support
- [ ] Docker deployment

---

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

**Database Issues**
```bash
cd backend
npx prisma migrate reset --force
npx prisma migrate deploy
```

**Server Won't Start**
- Verify you have a valid GSLT token from [Steam Game Server Account Management](https://steamcommunity.com/dev/managegameservers)
- Check that port 27015 is not in use
- Ensure SteamCMD is properly configured

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with ❤️ using modern web technologies
- Powered by [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD)
- UI components from [Ant Design](https://ant.design/)
- Terminal powered by [Xterm.js](https://xtermjs.org/)

---

<div align="center">

**Quatrix** - Professional CS2 Server Management

*Not affiliated with Valve Corporation*

[⬆ Back to Top](#-quatrix---cs2-server-management-panel)

</div>
