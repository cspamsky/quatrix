import fetch from 'node-fetch';
import { logActivity } from '../../index.js';

interface PterodactylConfig {
  baseUrl: string;
  apiKey?: string | null | undefined; // Application Key (ptla_)
  clientApiKey?: string | null | undefined; // Client Key (ptlc_)
}

export interface PterodactylServer {
  id: string;
  uuid: string;
  name: string;
  node: string;
  status: string | null;
}

export class PterodactylAdapter {
  private static instance: PterodactylAdapter;
  private configs: Map<string, PterodactylConfig> = new Map();

  private constructor() {}

  public static getInstance(): PterodactylAdapter {
    if (!PterodactylAdapter.instance) {
      PterodactylAdapter.instance = new PterodactylAdapter();
    }
    return PterodactylAdapter.instance;
  }

  /**
   * Register a Pterodactyl Panel configuration
   */
  public registerPanel(panelId: string, config: PterodactylConfig) {
    this.configs.set(panelId, {
      ...config,
      baseUrl: config.baseUrl.replace(/\/$/, ''), // Ensure no trailing slash
      apiKey: config.apiKey?.trim(), // Application Key
      clientApiKey: config.clientApiKey?.trim(), // Client Key
    });
  }

  /**
   * Get a Pterodactyl Panel configuration
   */
  public getPanelConfig(panelId: string): PterodactylConfig | undefined {
    return this.configs.get(panelId);
  }

  /**
   * Generic API request helper
   */
  private async request<T = any>(
    panelId: string,
    endpoint: string,
    method: string = 'GET',
    body?: any,
    apiType: 'client' | 'application' = 'client'
  ): Promise<T> {
    const config = this.configs.get(panelId);
    if (!config) throw new Error(`Pterodactyl Panel ${panelId} not configured.`);

    const url = `${config.baseUrl}/api/${apiType}${endpoint}`;

    // Choose the right key based on API type
    const authKey = apiType === 'client' ? config.clientApiKey || config.apiKey : config.apiKey;

    if (!authKey) {
      throw new Error(
        `Missing ${apiType.toUpperCase()} API Key for Pterodactyl Panel ${panelId}. Please check your settings.`
      );
    }

    console.log(
      `[Pterodactyl] Requesting: ${method} ${url} (Key prefix: ${authKey.substring(0, 10)}...)`
    );

    const isRaw = method === 'GET' && endpoint.includes('/files/contents');

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${authKey}`,
        'Content-Type': 'application/json',
        Accept: isRaw ? 'text/plain' : 'application/json',
      },
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    } as any);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Pterodactyl ${apiType.toUpperCase()} API Error: ${response.statusText} (${JSON.stringify(errorData)})`
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    const text = await response.text();
    if (isRaw) return text as any;
    return (text ? JSON.parse(text) : {}) as T;
  }

  /**
   * List all servers accessible by the API key
   * Smart Fallback: Tries Application API first, then Client API if unauthorized
   */
  public async listServers(panelId: string): Promise<any> {
    const config = this.configs.get(panelId);
    if (!config) throw new Error(`Pterodactyl Panel ${panelId} not configured.`);

    // Heuristics: If the main key starts with ptlc_, try client API first
    const likelyClient = config.apiKey?.startsWith('ptlc_');

    if (likelyClient) {
      console.log(`[Pterodactyl] Detected Client Key prefix. Trying Client API list...`);
      try {
        const response = await this.request(panelId, '', 'GET', undefined, 'client');
        return response;
      } catch (err) {
        console.warn(
          `[Pterodactyl] Client API list failed, trying Application API as last resort...`
        );
      }
    }

    try {
      // Endpoint for Application API is /servers
      return await this.request(
        panelId,
        '/servers?include=allocations',
        'GET',
        undefined,
        'application'
      );
    } catch (error: any) {
      // Fallback to Client API listing if Application API fails with Auth error
      if (error.message.includes('401') || error.message.includes('403')) {
        console.log(
          `[Pterodactyl] Application API list failed (${error.message}). Falling back to Client API...`
        );
        // Endpoint for Client API list is just the root
        return await this.request(panelId, '', 'GET', undefined, 'client');
      }
      throw error;
    }
  }

  /**
   * Change power state of a remote server
   */
  public async setPowerState(
    panelId: string,
    serverId: string,
    signal: 'start' | 'stop' | 'restart' | 'kill'
  ) {
    return this.request(panelId, `/servers/${serverId}/power`, 'POST', { signal });
  }

  /**
   * Send a command to the remote server console
   */
  public async sendCommand(panelId: string, serverId: string, command: string) {
    return this.request(panelId, `/servers/${serverId}/command`, 'POST', { command });
  }

  /**
   * Get remote server details (Client API)
   */
  public async getServerDetails(panelId: string, serverId: string) {
    return this.request(panelId, `/servers/${serverId}`);
  }

  /**
   * Get WebSocket credentials for server console
   */
  public async getConsoleDetails(
    panelId: string,
    serverId: string
  ): Promise<{ token: string; socket: string }> {
    const response = await this.request(
      panelId,
      `/servers/${serverId}/websocket`,
      'GET',
      undefined,
      'client'
    );
    return response.data;
  }

  /**
   * Get resource usage of a remote server
   */
  public async getResources(panelId: string, serverId: string) {
    return this.request(panelId, `/servers/${serverId}/resources`);
  }

  /**
   * List files in a directory
   */
  public async listFiles(panelId: string, serverId: string, subPath: string = ''): Promise<any> {
    const encodedPath = encodeURIComponent(subPath || '/');
    const response = await this.request(
      panelId,
      `/servers/${serverId}/files/list?directory=${encodedPath}`,
      'GET',
      undefined,
      'client'
    );
    return response.data; // Pterodactyl returns files in a 'data' array
  }

  /**
   * Get file content
   */
  public async getFileContent(
    panelId: string,
    serverId: string,
    filePath: string
  ): Promise<string> {
    const encodedPath = encodeURIComponent(filePath);
    return await this.request(
      panelId,
      `/servers/${serverId}/files/contents?file=${encodedPath}`,
      'GET',
      undefined,
      'client'
    );
  }

  /**
   * Write file content
   */
  public async writeFileContent(
    panelId: string,
    serverId: string,
    filePath: string,
    content: string
  ): Promise<void> {
    const encodedPath = encodeURIComponent(filePath);
    await this.request(
      panelId,
      `/servers/${serverId}/files/write?file=${encodedPath}`,
      'POST',
      content,
      'client'
    );
  }

  /**
   * Delete file or directory
   */
  public async deleteFile(
    panelId: string,
    serverId: string,
    root: string,
    files: string[]
  ): Promise<void> {
    await this.request(
      panelId,
      `/servers/${serverId}/files/delete`,
      'POST',
      { root, files },
      'client'
    );
  }

  /**
   * Create directory
   */
  public async createDirectory(
    panelId: string,
    serverId: string,
    root: string,
    name: string
  ): Promise<void> {
    await this.request(
      panelId,
      `/servers/${serverId}/files/create-folder`,
      'POST',
      { root, name },
      'client'
    );
  }

  /**
   * Rename file or directory
   */
  public async renameFile(
    panelId: string,
    serverId: string,
    root: string,
    files: { from: string; to: string }[]
  ): Promise<void> {
    await this.request(
      panelId,
      `/servers/${serverId}/files/rename`,
      'POST',
      { root, files },
      'client'
    );
  }
}

export const pterodactylAdapter = PterodactylAdapter.getInstance();
