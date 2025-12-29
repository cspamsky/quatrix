import { rconService } from './rcon.service';
import { logger } from '../utils/logger';

export interface Player {
    index: string;
    id: string;
    name: string;
    steamId: string;
    connected: string;
    ping: string;
    loss: string;
    state: string;
    address: string;
}

class PlayerService {
    /**
     * Get player list for a server
     */
    public async getPlayers(serverId: string): Promise<Player[]> {
        try {
            const statusOutput = await rconService.execute(serverId, 'status');
            return this.parseStatus(statusOutput);
        } catch (error: any) {
            logger.error(`Error getting players for ${serverId}: ${error.message}`);
            // If RCON is not connected, return empty list instead of throwing
            if (error.message.includes('not connected')) {
                return [];
            }
            throw error;
        }
    }

    /**
     * Parse the 'status' command output
     */
    private parseStatus(output: string): Player[] {
        const players: Player[] = [];
        const lines = output.split('\n');

        // Find the line starting with # id or similar to start parsing after it
        let startParsing = false;

        // CS2 pattern usually: # index id name uniqueid connected ping loss state adr
        // Example: # 2 1 "Player" [U:1:123456] 01:23 15 0 active 127.0.0.1:1234

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('# id') || trimmedLine.startsWith('# index')) {
                startParsing = true;
                continue;
            }

            if (startParsing && trimmedLine.startsWith('#')) {
                // Regex to capture: # index id name steamid connected ping loss state adr
                // Group 1: index
                // Group 2: id
                // Group 3: name (within quotes)
                // Group 4: steamid ([U:1:123] or STEAM_...)
                // Group 5: connected
                // Group 6: ping
                // Group 7: loss
                // Group 8: state
                // Group 9: adr

                const regex = /^#\s+(\d+)\s+(\d+)\s+"(.+)"\s+(\[U:\d+:\d+\]|STEAM_\d+:\d+:\d+|BOT)\s+(\d+:\d+|)\s+(\d+)\s+(\d+)\s+(\w+)\s+(.+)$/;
                const match = trimmedLine.match(regex);

                if (match) {
                    players.push({
                        index: match[1],
                        id: match[2],
                        name: match[3],
                        steamId: match[4],
                        connected: match[5],
                        ping: match[6],
                        loss: match[7],
                        state: match[8],
                        address: match[9]
                    });
                } else {
                    // Try a more flexible regex if the first one fails (e.g. for bots or different versions)
                    const flexRegex = /^#\s+(\d+)\s+(\d+)\s+"(.+)"\s+(\S+)\s+(\d+:\d+|)\s+(\d+)\s+(\d+)\s+(\w+)/;
                    const flexMatch = trimmedLine.match(flexRegex);
                    if (flexMatch) {
                        players.push({
                            index: flexMatch[1],
                            id: flexMatch[2],
                            name: flexMatch[3],
                            steamId: flexMatch[4],
                            connected: flexMatch[5] || '00:00',
                            ping: flexMatch[6],
                            loss: flexMatch[7],
                            state: flexMatch[8],
                            address: 'unknown'
                        });
                    }
                }
            }
        }

        return players;
    }

    /**
     * Kick a player
     */
    public async kickPlayer(serverId: string, userId: string, reason: string = 'Kicked by admin'): Promise<string> {
        return rconService.execute(serverId, `kickid ${userId} "${reason}"`);
    }

    /**
     * Ban a player
     */
    public async banPlayer(serverId: string, userId: string, minutes: number = 0, reason: string = 'Banned by admin'): Promise<string> {
        // Source ban commands can vary. 'banid' is common.
        // For CS2, often we use kickid and then handle ban via external list or just 'banid <minutes> <userid>'
        await rconService.execute(serverId, `banid ${minutes} ${userId}`);
        return rconService.execute(serverId, `kickid ${userId} "${reason}"`);
    }
}

export const playerService = new PlayerService();
