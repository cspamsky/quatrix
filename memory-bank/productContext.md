# Product Context: CS2 Server Web Panel

## Why This Project Exists

### The Problem
Managing Counter-Strike 2 game servers traditionally requires:
- **Technical Expertise**: Command-line knowledge, Linux administration skills
- **Manual Configuration**: Editing complex config files via SSH/FTP
- **Limited Visibility**: No real-time monitoring without third-party tools
- **Time-Consuming Setup**: Manual installation of SteamCMD, dependencies, and game files
- **Poor User Experience**: Juggling multiple tools (SSH clients, FTP clients, monitoring tools)

### The Solution
Quatrix provides a unified, web-based platform that:
- **Abstracts Complexity**: One-click deployment hides technical details
- **Centralizes Management**: All server operations in one interface
- **Provides Visibility**: Real-time monitoring and live terminal access
- **Simplifies Configuration**: Visual editors replace manual file editing
- **Improves Accessibility**: Manage servers from any device with a browser

## Target Audience

### Primary Users
1. **Gaming Community Administrators**
   - Need: Easy server management for clan/community servers
   - Pain Point: Limited technical knowledge, time constraints
   - Value: Quick setup, intuitive interface, reliable uptime

2. **Game Server Hosting Providers**
   - Need: Scalable management solution for multiple clients
   - Pain Point: Manual provisioning, customer support overhead
   - Value: Automation, multi-tenancy, resource efficiency

3. **Individual Gamers**
   - Need: Private server for friends
   - Pain Point: Intimidated by technical setup
   - Value: Simplicity, guided setup, low maintenance

### Secondary Users
1. **Server Developers/Modders**
   - Need: Testing environment for plugins/mods
   - Value: Quick deployment, easy configuration changes

## How It Should Work

### User Journey: First-Time Setup

1. **Account Creation**
   - User registers with email/password
   - Email verification (optional for MVP)
   - Redirected to dashboard

2. **Server Deployment**
   - Click "Create New Server" button
   - Select game (CS2) from template
   - Configure basic settings:
     - Server name
     - Max players
     - Map selection
     - Game mode (Competitive, Casual, Deathmatch)
   - Click "Deploy" - system handles:
     - Docker container creation
     - SteamCMD installation
     - CS2 server download
     - Initial configuration

3. **Server Management**
   - View server status (Online/Offline/Starting)
   - Start/Stop/Restart buttons
   - Access web terminal for advanced commands
   - Edit configuration through visual forms
   - Monitor resource usage (CPU, RAM, Network)

4. **Ongoing Operations**
   - View live console output
   - Execute RCON commands
   - Update server files
   - Manage plugins/mods (future)
   - Schedule automated tasks (future)

### Key User Flows

#### Flow 1: Starting a Server
```
Dashboard → Select Server → Click "Start" → 
Watch real-time logs → Server status changes to "Online" → 
View connection details (IP:Port)
```

#### Flow 2: Editing Configuration
```
Server Details → Configuration Tab → 
Select config file (server.cfg) → 
Edit in visual form OR raw text editor → 
Save → Prompt to restart server → 
Changes applied
```

#### Flow 3: Monitoring Performance
```
Dashboard → Server Card shows live stats →
Click server → Detailed metrics page →
View graphs (CPU, RAM, Network over time) →
Identify performance issues
```

#### Flow 4: Using Terminal
```
Server Details → Terminal Tab →
Terminal loads with Xterm.js →
Type commands (e.g., "status", "changelevel de_dust2") →
See real-time output →
Execute RCON commands
```

## User Experience Goals

### Design Principles
1. **Simplicity First**: Complex operations should feel simple
2. **Immediate Feedback**: Users should always know what's happening
3. **Progressive Disclosure**: Show basic options first, advanced features on demand
4. **Error Prevention**: Validate inputs, confirm destructive actions
5. **Consistency**: Uniform UI patterns across all features

### Visual Design
- **Modern & Clean**: Ant Design provides professional aesthetics
- **Dark Mode Support**: Essential for gamers and developers
- **Responsive Layout**: Works on desktop, tablet, mobile
- **Information Hierarchy**: Most important info (server status) prominently displayed
- **Color Coding**: 
  - Green: Online/Success
  - Red: Offline/Error
  - Yellow: Warning/Starting
  - Blue: Information

### Interaction Design
- **Quick Actions**: Common tasks (start/stop) accessible with one click
- **Keyboard Shortcuts**: Power users can navigate efficiently
- **Real-Time Updates**: No manual page refreshes needed
- **Loading States**: Clear indicators during async operations
- **Notifications**: Toast messages for success/error feedback

## Core User Stories

### MVP Stories
1. **As a user**, I want to create an account so I can manage my servers
2. **As a user**, I want to deploy a CS2 server with one click so I don't need technical knowledge
3. **As a user**, I want to start/stop my server so I can control when it's running
4. **As a user**, I want to see my server's status in real-time so I know if it's online
5. **As a user**, I want to access a web terminal so I can execute server commands
6. **As a user**, I want to edit server configuration so I can customize gameplay
7. **As a user**, I want to see resource usage so I can monitor performance

### Phase 2 Stories
1. **As a user**, I want to manage multiple servers from one dashboard
2. **As an admin**, I want to create user roles so I can delegate responsibilities
3. **As a user**, I want to schedule server restarts so I can automate maintenance
4. **As a user**, I want to backup my server data so I can restore if needed
5. **As a user**, I want to install plugins so I can extend server functionality

## Success Metrics

### User Satisfaction
- Time to deploy first server: < 5 minutes
- User retention: > 60% after 30 days
- Support ticket volume: < 10% of users need help

### Technical Performance
- Server deployment success rate: > 95%
- WebSocket connection uptime: > 99%
- Page load time: < 2 seconds
- Terminal latency: < 100ms

### Business Goals
- User acquisition: TBD
- Active servers: TBD
- Community engagement: TBD

## Competitive Landscape

### Existing Solutions
1. **Pterodactyl Panel**: General game server management (complex, feature-rich)
2. **LinuxGSM**: Command-line tool (technical, not web-based)
3. **TCAdmin**: Commercial solution (expensive, outdated UI)
4. **AMP (Application Management Panel)**: Paid, Windows-focused

### Our Differentiation
- **CS2-Optimized**: Tailored specifically for Counter-Strike 2
- **Modern Stack**: React 18 + TypeScript (easier to extend)
- **Docker-Native**: Better isolation and resource management
- **Open Source**: Community-driven development (if applicable)
- **Better UX**: Focus on simplicity and modern design

## Future Vision

### 6-Month Roadmap
- Multi-game support (TF2, Garry's Mod, Rust)
- Plugin marketplace
- Advanced analytics dashboard
- Mobile app (React Native)

### 12-Month Vision
- White-label solution for hosting providers
- Kubernetes deployment option
- AI-powered server optimization
- Community features (server browser, ratings)

---

**Document Status**: Initial Draft  
**Last Updated**: 2025-12-27  
**Next Review**: After user research/feedback
