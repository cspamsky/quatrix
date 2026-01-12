# Technical Context

## Technologies Used

### Frontend

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 3.4
- **Icons**: Lucide React
- **Routing**: React Router DOM 7
- **Context Providers**: `NotificationProvider` (Toast), `ConfirmDialogProvider` (Modal)
- **Real-time**: Socket.IO Client 4.8 + Custom Socket Simulation for Demo Mode
- **Typography**: Inter (UI), JetBrains Mono (Terminal/Console)

### Backend

- **Runtime**: Node.js with TypeScript
- **Framework**: Express 5
- **Real-time**: Socket.IO 4.8
- **Database**: better-sqlite3 (SQLite)
- **Authentication**: bcryptjs, jsonwebtoken
- **Server Monitoring**: systeminformation
- **CS2 Integration**: rcon-client (Primary), gamedig, child_process (spawn)
- **External APIs**: ipify.org (WAN IP Detection)
- **Dev Tools**: tsc (build), node --watch (stable execution), dotenv, PowerShell

## Development Setup

- **Node Version**: 18+ recommended
- **Package Manager**: npm
- **Environment**: `.env` files for JWT secrets, ports, and future RCON credentials
- **Database**: SQLite file (`database.sqlite`) auto-created on first run
- **Dev Servers**:
  - Client: `http://localhost:5173` or `http://localhost:5174` (Vite automatic fallback)
  - Backend: `http://localhost:3001` (Express)
- **Demo Detection**: Domain-based (Vercel/Netlify) automatic mock activation.
- **Monitoring Tools**: Console accessibility auditing, MIME-type compliance checks (webhint/axe)

## Project Structure

```
quatrix/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/  # Reusable components (Layout, ProtectedRoute, etc.)
│   │   ├── pages/       # Page components (Dashboard, Login, etc.)
│   │   └── App.tsx      # Main app with routing
│   └── package.json
├── server/               # Node.js backend
│   ├── src/                  # TypeScript source files
│   ├── dist/                 # Compiled JavaScript output (ignored by git)
│   ├── data/                 # Game server data & SteamCMD
│   ├── .env                  # Environment variables
│   └── package.json
└── memory-bank/          # Project documentation (Project Structure)
```

## Technical Constraints

- RCON requires the CS2 server to have a password set
- The backend must have network access to the CS2 server ports
- Real-time monitoring uses a 30-second polling interval (Production Policy) to balance UI sync and CPU load
- CS2 Installation requires ~35-40GB of disk space per instance
- SQLite is used for simplicity but may need migration to PostgreSQL for multi-user production
- JWT tokens stored in localStorage (consider httpOnly cookies for production)

## Key Dependencies

- **bcryptjs**: Password hashing (10 rounds)
- **jsonwebtoken**: JWT generation and validation (24h expiry)
- **better-sqlite3**: Synchronous SQLite database
- **Socket.IO**: Bidirectional real-time communication
- **systeminformation**: System metrics (CPU, RAM, Network)
