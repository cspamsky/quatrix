# 🎮 Quatrix - Advanced CS2 Server Management Panel

![Quatrix Banner](https://via.placeholder.com/1200x400/1890ff/ffffff?text=Quatrix+CS2+Manager)

**Quatrix** is a modern, high-performance, and open-source web panel designed to simplify the management of **Counter-Strike 2** dedicated servers on Windows. Built with a focus on **Premium UX**, **Stability**, and **Automation**, Quatrix allows you to deploy, configure, and monitor your game servers with ease.

---

## ✨ Key Features

### 🚀 Server Management
- **Dashboard**: Real-time overview of all your servers, including status, players, and resource usage.
- **One-Click Install**: Automatically download and install CS2 servers via SteamCMD.
- **Existing Server Import**: Easily add pre-installed servers by just pointing to their folder path.
- **Force Stop & Restart**: Reliable server control using Windows-native process management (SIGKILL).
- **Auto-Discovery**: Intelligent detection of server configurations and paths.

### 📂 Advanced File Manager
- **Web-Based Editor**: Integrated **Monaco Editor** (VS Code engine) for editing `.cfg`, `.json`, and `.ini` files with syntax highlighting.
- **Drag & Drop Upload**: Upload files, maps, and configs simply by dragging them into the browser.
- **Zip/Unzip Support**: Compress folders for backup or extract downloaded mods directly on the server.
- **Smart Navigation**: **Breadcrumb Drag & Drop** for moving files, Grid/List views, and a dedicated **Recycle Bin**.
- **Context Menu**: Right-click actions for Rename, Cut, Copy, Paste, Delete, and Download.

### 🔧 Tools & Configuration
- **RCON Console**: Send commands directly to your server and view live logs with spam filtering.
- **Workshop Integration**: Manage Steam Workshop collections and startup maps effortlessly.
- **Steamworks SDK**: Automatic handling of required DLLs for smooth server operation.
- **Setup Wizard**: Guided first-time setup for configuring SteamCMD and server paths.

### 🌍 Application
- **Internationalization (i18n)**: Full support for **English** and **Turkish** languages.
- **Dark/Light Mode**: Beautiful, responsive UI that adapts to your preference.
- **Secure**: JWT-based authentication for all API routes.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Ant Design 5, TypeScript, Vite, Monaco Editor, Zustand.
- **Backend**: Node.js (ESM), Express, Socket.io, Prisma ORM, SQLite.
- **System**: Windows Process Management (child_process), SteamCMD interaction.

---

## ⚡ Quick Start

### Prerequisites
- **Node.js** (v18 or higher)
- **Windows OS** (Linux support planned)
- **Git**

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/cspamsky/quatrix.git
    cd quatrix
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```
    *This will install dependencies for both the root, backend, and frontend workspaces.*

3.  **Start the development server:**
    ```bash
    npm run dev
    ```
    *This command runs both the backend (port 3000) and frontend (port 5173) concurrently.*

4.  **Access the panel:**
    Open your browser and navigate to `http://localhost:5173`.

---

## 📖 Setup Guide

1.  **First Login**: Create an admin account on the registration page.
2.  **Wizard**: Follow the on-screen Setup Wizard to point Quatrix to your **SteamCMD** folder and **Server Storage** directory.
    - If you don't have SteamCMD, the wizard can guide you.
3.  **Create Server**:
    - Click **"Create Server"** on the dashboard.
    - Choose **"New Install"** to download fresh files, or **"Existing Path"** to import a server you already have.
    - Enter your **GSLT Token** (Game Server Login Token) if you want the server to be public.

---

## 🛑 Troubleshooting

- **Server Won't Start?**
  - Ensure you have a valid GSLT token.
  - Check the **Console** tab for error messages.
  - Verify that no other process is using the server port (Default: 27015).

- **"Breakpad" Errors in Console?**
  - Quatrix automatically filters these spam messages to keep your log clean. They are usually harmless.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
