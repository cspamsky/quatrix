// CS2 Map Images - Using official Steam CDN assets only
export const mapImages: Record<string, string> = {
  'de_dust2': 'https://cdn.cloudflare.steamstatic.com/apps/730/icons/econ/map_icons/map_de_dust2_png.png',
  'de_mirage': 'https://cdn.cloudflare.steamstatic.com/apps/730/icons/econ/map_icons/map_de_mirage_png.png',
  'de_inferno': 'https://cdn.cloudflare.steamstatic.com/apps/730/icons/econ/map_icons/map_de_inferno_png.png',
  'de_nuke': 'https://cdn.cloudflare.steamstatic.com/apps/730/icons/econ/map_icons/map_de_nuke_png.png',
  'de_ancient': 'https://cdn.cloudflare.steamstatic.com/apps/730/icons/econ/map_icons/map_de_ancient_png.png',
  'de_anubis': 'https://cdn.cloudflare.steamstatic.com/apps/730/icons/econ/map_icons/map_de_anubis_png.png',
  'de_vertigo': 'https://cdn.cloudflare.steamstatic.com/apps/730/icons/econ/map_icons/map_de_vertigo_png.png',
  'de_overpass': 'https://cdn.cloudflare.steamstatic.com/apps/730/icons/econ/map_icons/map_de_overpass_png.png',
  'de_train': 'https://cdn.cloudflare.steamstatic.com/apps/730/icons/econ/map_icons/map_de_train_png.png',
  'de_cache': 'https://cdn.cloudflare.steamstatic.com/apps/730/icons/econ/map_icons/map_de_cache_png.png',
  'de_cbble': 'https://cdn.cloudflare.steamstatic.com/apps/730/icons/econ/map_icons/map_de_cbble_png.png',
  'cs_italy': 'https://cdn.cloudflare.steamstatic.com/apps/730/icons/econ/map_icons/map_cs_italy_png.png',
  'cs_office': 'https://cdn.cloudflare.steamstatic.com/apps/730/icons/econ/map_icons/map_cs_office_png.png',
  // Default fallback - Official CS2 key art/background from Steam
  'default': 'https://cdn.cloudflare.steamstatic.com/apps/730/icons/econ/map_icons/map_de_dust2_png.png'
}

export const getMapImage = (mapName: string): string => {
  if (!mapName) return mapImages['default'];

  // Clean the map name (extract filename from potential paths like workshop/123/de_dust2)
  const parts = mapName.split(/[/\\]/);
  let actualMapName = parts.pop() || mapName;
  
  // Handle case where it might end with .vpk or .bsp (sometimes seen in RCON)
  actualMapName = actualMapName.replace(/\.(vpk|bsp)$/i, '');
  
  const lowerMap = actualMapName.toLowerCase();

  // 1. Check if exact match exists for the cleaned name
  if (mapImages[actualMapName]) return mapImages[actualMapName];
  if (mapImages[lowerMap]) return mapImages[lowerMap];
  
  // 2. Workshop Check (If it has a workshop path or looks like an ID)
  const isWorkshop = mapName.includes('workshop') || /^\d{8,}$/.test(actualMapName);
  if (isWorkshop) {
     // If it's a workshop map but we don't have the API image yet, 
     // we return the default Steam icon
     return mapImages['default'];
  }
  
  // Final fallback (Official asset)
  return mapImages['default'];
}
