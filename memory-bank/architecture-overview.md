# Quatrix Architecture Overview (Updated)

Quatrix is a CS2 Server Management Panel designed for high performance and minimal infrastructure overhead.

## Core Principles

1.  **Gaming First**: CS2 servers run as native host processes to ensure minimum latency and maximum CPU/RAM efficiency.
2.  **Zero-Infrastucture**: Using SQLite for the database eliminates the need for external database servers (Docker/PostgreSQL).
3.  **Cross-Platform Ready**: Designed for Windows/Linux hosts.

## Tech Stack

-   **Backend**: Node.js (v20 LTS), Express, Socket.io, Prisma ORM.
-   **Database**: SQLite (Native file-based).
-   **Frontend**: React 18, Ant Design 5, TypeScript, Vite.
-   **Real-time**: Socket.io for terminal streaming and stats.
-   **Process Management**: Node.js `child_process`.

## Data Flow

```
[Browser] <--- (Socket.io) ---> [Backend] <--- (child_process) ---> [CS2 Process]
    |                               |
    +--------- (HTTP/REST) ---------+
                                    |
                                [SQLite DB]
```

## Setup Summary
- No Docker required for development.
- Database is a local file: `backend/prisma/dev.db`.
- Everything runs on the host for maximum control.
