import db from "../db.js";

export async function registerWorkshopMap(workshopId: string) {
    if (!workshopId) return;

    try {
        // Fetch details from Steam Web API
        let name = `Workshop Map ${workshopId}`;
        let image_url: string | null = null;
        let map_file: string | null = null;

        try {
            const steamResponse = await fetch('https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `itemcount=1&publishedfileids[0]=${workshopId}`
            });

            const data = (await steamResponse.json()) as any;
            const details = data?.response?.publishedfiledetails?.[0];

            if (details && details.result === 1) {
                name = details.title || name;
                image_url = (details.preview_url as string) || null;
                // Extract map filename from Steam data
                map_file = (details.filename as string) || null;
                
                // If filename has path, extract just the map name
                if (map_file && map_file.includes('/')) {
                    const parts = map_file.split('/');
                    const lastPart = parts.pop();
                    if (lastPart) {
                        map_file = lastPart.replace('.vpk', '').replace('.bsp', '');
                    }
                }
            }
        } catch (steamErr) {
            console.warn("Failed to fetch Steam workshop details:", steamErr);
        }

        db.prepare(`
            INSERT INTO workshop_maps (workshop_id, name, image_url, map_file)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(workshop_id) DO UPDATE SET
                name = excluded.name,
                image_url = excluded.image_url,
                map_file = excluded.map_file
        `).run(workshopId, name, image_url, map_file);

        return { name, image_url, map_file };
    } catch (error) {
        console.error("Add workshop map error:", error);
        throw error;
    }
}
