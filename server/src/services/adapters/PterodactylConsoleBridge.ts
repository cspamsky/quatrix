import { WebSocket } from 'ws';
import { pterodactylAdapter } from './PterodactylAdapter.js';
import { serverManager } from '../../serverManager.js';
import { Server as SocketServer } from 'socket.io';

class PterodactylConsoleBridge {
  private activeConnections: Map<string, WebSocket> = new Map();
  private io: SocketServer | null = null;

  public setIo(io: SocketServer) {
    this.io = io;
  }

  /**
   * Connect to a remote server's console via WebSocket
   */
  public async connect(serverId: string, panelId: string, remoteId: string) {
    if (this.activeConnections.has(serverId)) return;

    try {
      const config = pterodactylAdapter.getPanelConfig(panelId);
      const { token, socket: socketUrl } = await pterodactylAdapter.getConsoleDetails(
        panelId,
        remoteId
      );

      const ws = new WebSocket(socketUrl, {
        origin: config?.baseUrl || socketUrl.split('/api/')[0],
      });

      ws.on('open', () => {
        console.log(`[Pterodactyl Bridge] Connected to Wings for server ${serverId}`);
        // Authenticate
        ws.send(JSON.stringify({ event: 'auth', args: [token] }));
      });

      ws.on('message', (data: string) => {
        try {
          const payload = JSON.parse(data.toString());

          if (payload.event === 'console output') {
            payload.args.forEach((line: string) => {
              if (this.io) {
                this.io.emit(`console:${serverId}`, line);
              }
            });
          }

          if (payload.event === 'status') {
            if (this.io) {
              this.io.emit('status_update', {
                serverId: parseInt(serverId),
                status: payload.args[0].toUpperCase(),
              });
            }
          }
        } catch (e) {
          // Non-JSON or handleable errors
        }
      });

      ws.on('close', () => {
        console.log(`[Pterodactyl Bridge] Connection closed for server ${serverId}`);
        this.activeConnections.delete(serverId);
      });

      ws.on('error', (err) => {
        console.error(`[Pterodactyl Bridge] ERROR for server ${serverId}:`, err.message);
      });

      this.activeConnections.set(serverId, ws);
    } catch (error: any) {
      console.error(
        `[Pterodactyl Bridge] Failed to establish connection for ${serverId}:`,
        error.message
      );
    }
  }

  /**
   * Disconnect from a server's console
   */
  public disconnect(serverId: string) {
    const ws = this.activeConnections.get(serverId);
    if (ws) {
      ws.close();
      this.activeConnections.delete(serverId);
    }
  }

  /**
   * Check if we are connected
   */
  public isConnected(serverId: string): boolean {
    return this.activeConnections.has(serverId);
  }
}

export const pterodactylConsoleBridge = new PterodactylConsoleBridge();
