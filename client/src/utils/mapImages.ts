// CS2 Map Images - Using themed gradient backgrounds (reliable, always works)
export const mapImages: Record<string, string> = {
  'de_dust2': 'https://images.unsplash.com/photo-1509023464722-18d996393ca8?auto=format&fit=crop&q=80&w=800', // Desert/sand theme
  'de_mirage': 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?auto=format&fit=crop&q=80&w=800', // Middle Eastern architecture
  'de_inferno': 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&q=80&w=800', // Italian village
  'de_nuke': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800', // Industrial/tech
  'de_ancient': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=800', // Ancient ruins
  'de_anubis': 'https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&q=80&w=800', // Egyptian theme
  'de_vertigo': 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&q=80&w=800', // Skyscraper
  'de_overpass': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800', // Urban/bridge
  'de_train': 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&q=80&w=800', // Train/railway
  'de_cache': 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=800', // Industrial
  'de_cbble': 'https://images.unsplash.com/photo-1465146633011-14f8e0781093?auto=format&fit=crop&q=80&w=800', // Medieval castle
  // Default fallback
  'default': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800'
}

export const getMapImage = (mapName: string): string => {
  return mapImages[mapName] || mapImages['default']
}
