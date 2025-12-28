# System Patterns: CS2 Server Web Panel

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   React 18 + TypeScript + Ant Design                 │   │
│  │   - Dashboard UI                                      │   │
│  │   - Terminal (Xterm.js)                              │   │
│  │   - Configuration Forms                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                    HTTP/WebSocket
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   Node.js + Express + Socket.io                      │   │
│  │   ┌────────────┐  ┌────────────┐  ┌────────────┐    │   │
│  │   │   Auth     │  │   Server   │  │  Terminal  │    │   │
│  │   │ Controller │  │ Controller │  │  Service   │    │   │
│  │   └────────────┘  └────────────┘  └────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                    Docker API / Process
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │    Docker    │  │   CS2 Game   │      │
│  │   Database   │  │   Containers │  │    Servers   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

#### Frontend Architecture (React)

```
src/
├── App.tsx                    # Root component, routing
├── main.tsx                   # Entry point
│
├── pages/                     # Route-level components
│   ├── Dashboard/
│   │   └── Dashboard.tsx      # Server overview
│   ├── ServerDetail/
│   │   ├── ServerDetail.tsx   # Server management page
│   │   ├── Terminal.tsx       # Terminal tab
│   │   ├── Configuration.tsx  # Config editor tab
│   │   └── Monitoring.tsx     # Metrics tab
│   ├── Auth/
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   └── Settings/
│       └── Settings.tsx
│
├── components/                # Reusable components
│   ├── Layout/
│   │   ├── AppLayout.tsx      # Main layout wrapper
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── ServerCard/
│   │   └── ServerCard.tsx     # Server status card
│   ├── Terminal/
│   │   └── WebTerminal.tsx    # Xterm.js wrapper
│   ├── ConfigEditor/
│   │   ├── FormEditor.tsx     # Visual config editor
│   │   └── TextEditor.tsx     # Raw text editor
│   └── Charts/
│       ├── ResourceChart.tsx  # CPU/RAM graphs
│       └── NetworkChart.tsx
│
├── hooks/                     # Custom React hooks
│   ├── useAuth.ts             # Authentication state
│   ├── useWebSocket.ts        # WebSocket connection
│   ├── useServer.ts           # Server operations
│   └── useTerminal.ts         # Terminal management
│
├── services/                  # API clients
│   ├── api.ts                 # Axios instance
│   ├── authService.ts         # Auth endpoints
│   ├── serverService.ts       # Server CRUD
│   └── wsService.ts           # WebSocket client
│
├── store/                     # State management
│   ├── authStore.ts           # User/auth state (Zustand)
│   ├── serverStore.ts         # Server list state
│   └── uiStore.ts             # UI preferences
│
├── types/                     # TypeScript definitions
│   ├── server.ts
│   ├── user.ts
│   └── api.ts
│
└── utils/                     # Helper functions
    ├── formatters.ts          # Data formatting
    └── validators.ts          # Input validation
```

#### Backend Architecture (Node.js)

```
src/
├── server.ts                  # Entry point, app initialization
│
├── routes/                    # Express routes
│   ├── index.ts               # Route aggregator
│   ├── auth.routes.ts         # /api/auth/*
│   ├── server.routes.ts       # /api/servers/*
│   └── user.routes.ts         # /api/users/*
│
├── controllers/               # Request handlers
│   ├── auth.controller.ts     # Login, register, logout
│   ├── server.controller.ts   # CRUD operations
│   └── user.controller.ts     # User management
│
├── services/                  # Business logic
│   ├── authService.ts         # JWT generation, validation
│   ├── serverService.ts       # Server lifecycle management
│   ├── dockerService.ts       # Docker API interactions
│   ├── steamcmdService.ts     # SteamCMD operations
│   └── terminalService.ts     # PTY management
│
├── middleware/                # Express middleware
│   ├── auth.middleware.ts     # JWT verification
│   ├── error.middleware.ts    # Error handling
│   ├── validate.middleware.ts # Request validation
│   └── rateLimit.middleware.ts
│
├── sockets/                   # WebSocket handlers
│   ├── index.ts               # Socket.io setup
│   ├── terminal.socket.ts     # Terminal events
│   └── server.socket.ts       # Server status events
│
├── models/                    # Prisma models (generated)
│   └── index.ts
│
├── types/                     # TypeScript definitions
│   ├── express.d.ts           # Express extensions
│   ├── server.ts
│   └── user.ts
│
└── utils/                     # Helper functions
    ├── logger.ts              # Winston logger
    ├── crypto.ts              # Encryption helpers
    └── validators.ts          # Zod schemas
```

## Key Technical Decisions

### 1. Monorepo vs Multi-Repo
**Decision**: Monorepo (single repository)  
**Rationale**: 
- Shared TypeScript types between frontend/backend
- Simplified dependency management
- Easier atomic commits across stack
- Better for small-medium teams

### 2. State Management
**Decision**: React Query + Zustand  
**Rationale**:
- React Query: Server state (API data, caching, refetching)
- Zustand: Client state (UI preferences, temporary data)
- Avoids Redux complexity
- Better TypeScript support

### 3. Real-Time Communication
**Decision**: Socket.io (not native WebSocket)  
**Rationale**:
- Automatic reconnection
- Fallback to long-polling
- Room/namespace support
- Built-in event system

### 4. Database ORM
**Decision**: Prisma  
**Rationale**:
- Type-safe database queries
- Auto-generated TypeScript types
- Migration management
- Excellent DX with Prisma Studio

### 5. Terminal Implementation
**Decision**: Xterm.js + node-pty  
**Rationale**:
- Industry-standard terminal emulator (used by VS Code)
- Full ANSI support
- node-pty provides real PTY (not just stdout/stderr)

### 6. Containerization Strategy
**Decision**: Docker-in-Docker (DinD) approach  
**Rationale**:
- Isolation: Each game server in separate container
- Resource limits: CPU/memory constraints per server
- Portability: Same environment dev/prod
- Security: Limited access to host system

## Design Patterns

### 1. Repository Pattern (Backend)

```typescript
// services/serverService.ts
class ServerService {
  async createServer(data: CreateServerDto) {
    // Business logic
    const server = await prisma.server.create({ data });
    await this.dockerService.createContainer(server);
    return server;
  }
  
  async startServer(id: string) {
    const server = await this.getServerById(id);
    await this.dockerService.startContainer(server.containerId);
    await this.updateServerStatus(id, 'running');
  }
}
```

### 2. Custom Hooks Pattern (Frontend)

```typescript
// hooks/useServer.ts
export function useServer(serverId: string) {
  const { data: server, isLoading } = useQuery({
    queryKey: ['server', serverId],
    queryFn: () => serverService.getServer(serverId),
  });
  
  const startMutation = useMutation({
    mutationFn: () => serverService.startServer(serverId),
    onSuccess: () => queryClient.invalidateQueries(['server', serverId]),
  });
  
  return {
    server,
    isLoading,
    startServer: startMutation.mutate,
    isStarting: startMutation.isLoading,
  };
}
```

### 3. Middleware Chain Pattern (Backend)

```typescript
// routes/server.routes.ts
router.post(
  '/servers',
  authMiddleware,           // 1. Verify JWT
  validateMiddleware(createServerSchema), // 2. Validate input
  serverController.create   // 3. Handle request
);
```

### 4. Event-Driven Pattern (WebSocket)

```typescript
// sockets/terminal.socket.ts
export function setupTerminalSocket(io: Server) {
  io.of('/terminal').on('connection', (socket) => {
    socket.on('attach', async ({ serverId }) => {
      const pty = await terminalService.attachToServer(serverId);
      
      pty.onData((data) => {
        socket.emit('data', data);
      });
      
      socket.on('input', (data) => {
        pty.write(data);
      });
    });
  });
}
```

### 5. Factory Pattern (Docker Containers)

```typescript
// services/dockerService.ts
class DockerService {
  createContainerConfig(server: Server): ContainerCreateOptions {
    return {
      Image: 'cs2-server:latest',
      name: `cs2-${server.id}`,
      Env: [
        `SERVER_NAME=${server.name}`,
        `MAX_PLAYERS=${server.maxPlayers}`,
      ],
      HostConfig: {
        PortBindings: {
          '27015/tcp': [{ HostPort: server.port.toString() }],
        },
        Memory: server.memoryLimit * 1024 * 1024,
        NanoCpus: server.cpuLimit * 1e9,
      },
    };
  }
}
```

## Component Relationships

### Authentication Flow

```
┌──────────┐     1. Login      ┌──────────────┐
│  Client  │ ───────────────▶  │   Backend    │
│ (React)  │                   │  (Express)   │
└──────────┘                   └──────────────┘
     │                                │
     │                         2. Verify credentials
     │                                │
     │                         3. Generate JWT
     │                                │
     │      4. Return token           │
     │ ◀───────────────────────────── │
     │                                │
     │  5. Store token (localStorage) │
     │                                │
     │  6. Set Authorization header   │
     │                                │
     │  7. Protected API calls        │
     │ ───────────────────────────▶   │
     │                                │
     │  8. Verify JWT middleware      │
     │                                │
     │  9. Return data                │
     │ ◀───────────────────────────── │
```

### Server Lifecycle Flow

```
User Action          Frontend              Backend              Docker
    │                   │                     │                    │
    │  Click "Create"   │                     │                    │
    ├──────────────────▶│                     │                    │
    │                   │  POST /api/servers  │                    │
    │                   ├────────────────────▶│                    │
    │                   │                     │  Create container  │
    │                   │                     ├───────────────────▶│
    │                   │                     │                    │
    │                   │                     │  Container ID      │
    │                   │                     │◀───────────────────│
    │                   │                     │                    │
    │                   │                     │  Save to DB        │
    │                   │                     │                    │
    │                   │  Server object      │                    │
    │                   │◀────────────────────│                    │
    │  Show success     │                     │                    │
    │◀──────────────────│                     │                    │
    │                   │                     │                    │
    │  Click "Start"    │                     │                    │
    ├──────────────────▶│                     │                    │
    │                   │  POST /api/servers/:id/start             │
    │                   ├────────────────────▶│                    │
    │                   │                     │  Start container   │
    │                   │                     ├───────────────────▶│
    │                   │                     │                    │
    │                   │                     │  WebSocket: status │
    │                   │◀─────────────────────────────────────────│
    │  Update UI        │                     │                    │
    │◀──────────────────│                     │                    │
```

### Real-Time Terminal Flow

```
Client              WebSocket Server        PTY Process         Docker Container
  │                       │                      │                     │
  │  Connect to /terminal │                      │                     │
  ├──────────────────────▶│                      │                     │
  │                       │                      │                     │
  │  Emit: attach         │                      │                     │
  ├──────────────────────▶│                      │                     │
  │                       │  Spawn PTY           │                     │
  │                       ├─────────────────────▶│                     │
  │                       │                      │  Attach to container│
  │                       │                      ├────────────────────▶│
  │                       │                      │                     │
  │                       │                      │  Shell output       │
  │                       │                      │◀────────────────────│
  │                       │  Emit: data          │                     │
  │  Display in Xterm.js  │◀─────────────────────│                     │
  │◀──────────────────────│                      │                     │
  │                       │                      │                     │
  │  User types command   │                      │                     │
  │  Emit: input          │                      │                     │
  ├──────────────────────▶│                      │                     │
  │                       │  Write to PTY        │                     │
  │                       ├─────────────────────▶│                     │
  │                       │                      │  Execute in container│
  │                       │                      ├────────────────────▶│
  │                       │                      │                     │
  │                       │                      │  Command output     │
  │                       │                      │◀────────────────────│
  │                       │  Emit: data          │                     │
  │  Display output       │◀─────────────────────│                     │
  │◀──────────────────────│                      │                     │
```

## Critical Implementation Paths

### Path 1: User Authentication
1. User submits login form
2. Frontend validates input
3. POST to `/api/auth/login`
4. Backend validates credentials (bcrypt compare)
5. Generate JWT with user payload
6. Return token + user data
7. Frontend stores token in localStorage
8. Set Axios default Authorization header
9. Redirect to dashboard

### Path 2: Server Creation
1. User fills create server form
2. Frontend validates input (Zod schema)
3. POST to `/api/servers`
4. Backend validates request (auth + input)
5. Create database record (Prisma)
6. Generate Docker container config
7. Create container via Docker API
8. Store container ID in database
9. Return server object
10. Frontend updates server list (React Query cache)

### Path 3: Real-Time Monitoring
1. User navigates to server detail page
2. Frontend establishes WebSocket connection
3. Join server-specific room (`server:${id}`)
4. Backend starts monitoring loop:
   - Query Docker stats API every 5s
   - Calculate CPU/RAM/Network usage
   - Emit to room: `stats` event
5. Frontend receives stats
6. Update Recharts graphs
7. Display in UI

### Path 4: Terminal Interaction
1. User opens Terminal tab
2. Frontend connects to `/terminal` namespace
3. Emit `attach` event with server ID
4. Backend:
   - Verify user has access to server
   - Spawn PTY process
   - Attach PTY to Docker container
   - Listen to PTY data stream
5. PTY data → WebSocket → Frontend → Xterm.js
6. User types command in Xterm.js
7. Frontend emits `input` event
8. Backend writes to PTY stdin
9. Container executes command
10. Output flows back through chain

## Error Handling Strategy

### Frontend Error Boundaries
```typescript
<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>
```

### API Error Handling
```typescript
// services/api.ts
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      authStore.logout();
      navigate('/login');
    }
    return Promise.reject(error);
  }
);
```

### Backend Error Middleware
```typescript
// middleware/error.middleware.ts
export function errorHandler(err, req, res, next) {
  logger.error(err);
  
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }
  
  if (err instanceof UnauthorizedError) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
}
```

## Performance Optimization Patterns

### 1. Code Splitting (Frontend)
```typescript
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ServerDetail = lazy(() => import('./pages/ServerDetail'));
```

### 2. Memoization
```typescript
const ServerCard = memo(({ server }) => {
  // Component only re-renders if server prop changes
});
```

### 3. Debouncing
```typescript
const debouncedSearch = useMemo(
  () => debounce((query) => searchServers(query), 300),
  []
);
```

### 4. Connection Pooling (Backend)
```typescript
// Prisma handles this automatically
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

**Document Status**: Initial Draft  
**Last Updated**: 2025-12-27  
**Next Review**: After architecture validation and initial implementation
