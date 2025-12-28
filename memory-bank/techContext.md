# Technical Context: CS2 Server Web Panel

## Technology Stack

### Frontend Stack

#### Core Framework
- **React 18.2+**
  - Concurrent rendering features
  - Automatic batching
  - Suspense for data fetching
  - Server Components (future consideration)

- **TypeScript 5.0+**
  - Strict mode enabled
  - Path aliases for clean imports
  - Type-safe API contracts

#### UI Framework
- **Ant Design 5.x**
  - Component library: Button, Form, Table, Modal, etc.
  - Layout components: Layout, Menu, Breadcrumb
  - Data display: Card, Statistic, Badge, Tag
  - Feedback: Message, Notification, Spin
  - Theme customization with CSS-in-JS

#### Key Libraries
- **React Router v6**: Client-side routing
- **Xterm.js**: Terminal emulation
  - xterm-addon-fit: Responsive terminal sizing
  - xterm-addon-web-links: Clickable URLs in terminal
- **Socket.io-client**: WebSocket communication
- **Axios**: HTTP client for REST API calls
- **React Query (TanStack Query)**: Server state management
- **Zustand**: Client state management (lightweight alternative to Redux)
- **Recharts**: Data visualization for monitoring graphs
- **Day.js**: Date/time manipulation (lightweight alternative to Moment.js)

#### Development Tools
- **Vite**: Build tool and dev server
  - Fast HMR (Hot Module Replacement)
  - Optimized production builds
  - TypeScript support out-of-the-box
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Vitest**: Unit testing
- **Playwright**: E2E testing

### Backend Stack

#### Runtime & Framework
- **Node.js 18+ LTS**
  - Native ES modules support
  - Built-in test runner (optional)
  
- **Express.js 4.x**
  - RESTful API routing
  - Middleware architecture
  - Static file serving

#### Key Libraries
- **TypeScript 5.0+**
  - Shared types with frontend
  - ts-node-dev for development

- **Authentication & Security**
  - jsonwebtoken: JWT generation/verification
  - bcrypt: Password hashing
  - helmet: Security headers
  - cors: Cross-origin resource sharing
  - express-rate-limit: Rate limiting

- **WebSocket**
  - Socket.io: Real-time bidirectional communication
  - Namespaces for different event channels

- **Database & ORM**
  - Prisma: Type-safe ORM
  - PostgreSQL: Primary database (or SQLite for development)
  - Redis: Session storage, caching (optional)

- **Process Management**
  - child_process: Spawning Docker/SteamCMD processes
  - node-pty: Pseudo-terminal for interactive shells

- **Docker Integration**
  - dockerode: Docker API client for Node.js
  - Container lifecycle management

- **Validation**
  - Zod: Schema validation (shared with frontend)
  - express-validator: Request validation middleware

- **Logging**
  - Winston: Structured logging
  - Morgan: HTTP request logging

#### Development Tools
- **ts-node-dev**: TypeScript execution with auto-reload
- **Jest**: Unit testing
- **Supertest**: API endpoint testing
- **ESLint**: Code linting
- **Prettier**: Code formatting

### Infrastructure

#### Containerization
- **Docker**
  - Multi-stage builds for optimization
  - Docker Compose for local development
  - Separate containers: frontend, backend, database, game servers

- **Docker Images**
  - Node.js official images (alpine for production)
  - PostgreSQL official image
  - Custom CS2 server image (based on Ubuntu/Debian)

#### Deployment
- **Development**: Docker Compose
- **Production**: Docker Swarm or Kubernetes (future)
- **CI/CD**: GitHub Actions (assumed)

### External Dependencies

#### Steam/Game Server
- **SteamCMD**: Command-line Steam client
  - Automated game server installation
  - Updates and verification

- **CS2 Dedicated Server**
  - Source engine server binaries
  - Configuration files (server.cfg, autoexec.cfg)
  - RCON protocol for remote administration

#### APIs & Services
- **Steam Web API**: Server query (optional)
- **RCON**: Remote console for game server commands

## Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher (or pnpm/yarn)
- **Docker**: v24.0.0 or higher
- **Docker Compose**: v2.20.0 or higher
- **Git**: Version control

### Environment Variables

#### Frontend (.env)
```
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

#### Backend (.env)
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/quatrix
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
DOCKER_SOCKET=/var/run/docker.sock
```

### Project Structure

```
quatrix/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route pages
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API client services
│   │   ├── store/           # State management
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Utility functions
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/                  # Node.js backend
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Express middleware
│   │   ├── models/          # Database models (Prisma)
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── sockets/         # WebSocket handlers
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Utility functions
│   │   └── server.ts        # Entry point
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   └── tsconfig.json
│
├── docker/                   # Docker configurations
│   ├── frontend.Dockerfile
│   ├── backend.Dockerfile
│   └── cs2-server.Dockerfile
│
├── memory-bank/             # Project documentation
│   ├── projectbrief.md
│   ├── productContext.md
│   ├── systemPatterns.md
│   ├── techContext.md
│   ├── activeContext.md
│   └── progress.md
│
├── docker-compose.yml
├── docker-compose.dev.yml
├── .gitignore
└── README.md
```

## Technical Constraints

### Performance Requirements
- **Frontend**
  - Initial load: < 2 seconds
  - Time to Interactive (TTI): < 3 seconds
  - Bundle size: < 500KB (gzipped)

- **Backend**
  - API response time: < 200ms (p95)
  - WebSocket latency: < 100ms
  - Concurrent connections: 100+ users

- **Database**
  - Query response time: < 50ms (p95)
  - Connection pool: 20-50 connections

### Browser Support
- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- No IE11 support

### Server Requirements
- **Minimum**: 2 CPU cores, 4GB RAM, 50GB storage
- **Recommended**: 4 CPU cores, 8GB RAM, 100GB SSD

## Security Considerations

### Authentication
- JWT tokens with short expiration (7 days)
- Refresh token mechanism (future)
- Password requirements: min 8 chars, complexity rules
- bcrypt rounds: 10

### Authorization
- Role-based access control (RBAC)
- Roles: Admin, User, Viewer
- Permission checks on all protected routes

### API Security
- HTTPS only in production
- CORS whitelist
- Rate limiting: 100 requests/15min per IP
- Input validation on all endpoints
- SQL injection prevention (Prisma ORM)
- XSS protection (React auto-escaping, helmet)

### Docker Security
- Non-root user in containers
- Read-only file systems where possible
- Resource limits (CPU, memory)
- Network isolation between containers

## Tool Usage Patterns

### Development Workflow
1. **Local Development**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   
   # Terminal 3: Database
   docker-compose up postgres
   ```

2. **Docker Development**
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

3. **Testing**
   ```bash
   # Unit tests
   npm test
   
   # E2E tests
   npm run test:e2e
   ```

### Database Management
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Open Prisma Studio
npx prisma studio
```

### Docker Commands
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Remove volumes
docker-compose down -v
```

## Dependencies Management

### Version Pinning
- Lock files committed (package-lock.json, pnpm-lock.yaml)
- Major versions pinned, minor/patch updates allowed
- Regular dependency audits: `npm audit`

### Update Strategy
- Security updates: Immediate
- Minor updates: Monthly review
- Major updates: Quarterly evaluation

## Known Technical Limitations

1. **Docker Dependency**: Requires Docker daemon running
2. **Platform Compatibility**: CS2 servers Linux-only (Windows via WSL2)
3. **Resource Intensive**: Each CS2 server requires ~2GB RAM
4. **Network Ports**: Each server needs unique port (conflict management needed)
5. **SteamCMD**: Requires Steam account for downloads (anonymous login has limits)

## Future Technical Considerations

### Scalability
- Horizontal scaling with load balancer
- Database read replicas
- Redis for distributed caching
- Message queue (RabbitMQ/Redis) for background jobs

### Monitoring
- Prometheus + Grafana for metrics
- Sentry for error tracking
- ELK stack for log aggregation

### Advanced Features
- GraphQL API (alternative to REST)
- Server-Sent Events (SSE) as WebSocket fallback
- WebAssembly for performance-critical operations

---

**Document Status**: Initial Draft  
**Last Updated**: 2025-12-27  
**Next Review**: After initial setup and dependency installation
