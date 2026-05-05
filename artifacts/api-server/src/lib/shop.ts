export type ShopItemType = "background" | "frame" | "nametag";

export interface ShopItem {
  key: string;
  name: string;
  type: ShopItemType;
  price: number;
  description: string;
  emoji?: string;
  colors?: string[];
  developerOnly?: boolean;
  spinOnly?: boolean;
}

export const SHOP_ITEMS: ShopItem[] = [
  // ── Backgrounds ──────────────────────────────────────────────────────────
  { key: "bg_mint",       name: "Mint",          type: "background", price: 40,   description: "Fresh cool mint",               colors: ["#34D399", "#67E8F9"] },
  { key: "bg_candy",      name: "Candy",          type: "background", price: 60,   description: "Sweet pastel vibes",             colors: ["#F9A8D4", "#C084FC"] },
  { key: "bg_sunset",     name: "Sunset",         type: "background", price: 80,   description: "Warm orange and pink gradient",  colors: ["#F97316", "#EC4899"] },
  { key: "bg_ocean",      name: "Ocean",          type: "background", price: 80,   description: "Deep blue ocean vibes",          colors: ["#3B82F6", "#06B6D4"] },
  { key: "bg_coffee",     name: "Coffee",         type: "background", price: 72,   description: "Cozy warm coffee tones",         colors: ["#92400E", "#D97706"] },
  { key: "bg_pastel",     name: "Pastel Dream",   type: "background", price: 80,   description: "Soft lavender and sky blue",     colors: ["#C4B5FD", "#93C5FD"] },
  { key: "bg_cherry",     name: "Cherry Blossom", type: "background", price: 100,  description: "Gentle pink sakura petals",      colors: ["#FBCFE8", "#F472B6"] },
  { key: "bg_forest",     name: "Forest",         type: "background", price: 100,  description: "Lush green forest calm",         colors: ["#10B981", "#16A34A"] },
  { key: "bg_golden",     name: "Golden Hour",    type: "background", price: 112,  description: "Warm amber afternoon glow",      colors: ["#F59E0B", "#FCD34D"] },
  { key: "bg_arctic",     name: "Arctic",         type: "background", price: 100,  description: "Icy cool polar winds",           colors: ["#BAE6FD", "#E0F2FE"] },
  { key: "bg_storm",      name: "Thunderstorm",   type: "background", price: 112,  description: "Dark dramatic storm clouds",     colors: ["#374151", "#1E3A5F"] },
  { key: "bg_fire",       name: "Flame",          type: "background", price: 120,  description: "Bold fiery gradient",            colors: ["#EF4444", "#F97316"] },
  { key: "bg_aurora",     name: "Aurora",         type: "background", price: 120,  description: "Northern lights dancing",        colors: ["#064E3B", "#4ADE80", "#38BDF8"] },
  { key: "bg_neon",       name: "Neon City",      type: "background", price: 120,  description: "Electric neon cityscape",        colors: ["#FDE047", "#22D3EE"] },
  { key: "bg_galaxy",     name: "Galaxy",         type: "background", price: 140,  description: "Dark space with purple nebula",  colors: ["#4F46E5", "#7C3AED"] },
  { key: "bg_lava",       name: "Lava",           type: "background", price: 140,  description: "Molten lava flows",              colors: ["#1C0505", "#DC2626", "#F97316"] },
  { key: "bg_midnight",   name: "Midnight",       type: "background", price: 160,  description: "Deep midnight blue luxury",      colors: ["#1E1B4B", "#0F172A"] },
  { key: "bg_rainbow",    name: "Rainbow Wave",   type: "background", price: 200,  description: "Full vibrant spectrum",          colors: ["#F97316", "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6"] },
  { key: "bg_celestial",  name: "✦ Celestial Void", type: "background", price: 1000, description: "Ultimate — the cosmos beyond all stars", colors: ["#020617", "#1e1b4b", "#c084fc", "#facc15"] },

  // ── Frames ────────────────────────────────────────────────────────────────
  { key: "frame_bronze",   name: "Bronze",       type: "frame", price: 40,   description: "Classic bronze ring",           colors: ["#92400E", "#D97706"] },
  { key: "frame_gold",     name: "Golden",       type: "frame", price: 60,   description: "Classic shining gold border",   colors: ["#F59E0B", "#D97706"] },
  { key: "frame_rose",     name: "Rose",         type: "frame", price: 72,   description: "Soft rosy pink glow",           colors: ["#FB7185", "#F43F5E"] },
  { key: "frame_cherry",   name: "Cherry",       type: "frame", price: 80,   description: "Delicate cherry blossom pink",  colors: ["#FBCFE8", "#F472B6"] },
  { key: "frame_crystal",  name: "Crystal",      type: "frame", price: 80,   description: "Icy crystal blue shimmer",      colors: ["#BAE6FD", "#7DD3FC"] },
  { key: "frame_emerald",  name: "Emerald",      type: "frame", price: 80,   description: "Rich vivid emerald green",      colors: ["#059669", "#34D399"] },
  { key: "frame_neon",     name: "Neon",         type: "frame", price: 120,  description: "Electric neon glow",            colors: ["#22D3EE", "#10B981"] },
  { key: "frame_fire",     name: "Fire Ring",    type: "frame", price: 112,  description: "Blazing hot fire ring",         colors: ["#EF4444", "#F97316"] },
  { key: "frame_electric", name: "Electric",     type: "frame", price: 120,  description: "Bright electric yellow bolt",   colors: ["#FDE047", "#FBBF24"] },
  { key: "frame_cosmic",   name: "Cosmic",       type: "frame", price: 140,  description: "Deep cosmic nebula ring",       colors: ["#4F46E5", "#7C3AED", "#EC4899"] },
  { key: "frame_platinum", name: "Platinum",     type: "frame", price: 160,  description: "Sleek silver metallic ring",    colors: ["#CBD5E1", "#94A3B8"] },
  { key: "frame_diamond",  name: "Diamond",      type: "frame", price: 160,  description: "Brilliant diamond shimmer",     colors: ["#E0F2FE", "#BAE6FD", "#FFFFFF"] },
  { key: "frame_rainbow",  name: "Rainbow",      type: "frame", price: 180,  description: "Full spectrum rainbow ring",    colors: ["#F97316", "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6"] },
  { key: "frame_holo",     name: "Holographic",  type: "frame", price: 220,  description: "Dazzling holographic shimmer",  colors: ["#EC4899", "#22D3EE", "#FDE047"] },
  { key: "frame_divine",   name: "✦ Divine Aura", type: "frame", price: 1000, description: "Ultimate — radiant golden divine light", colors: ["#fef08a", "#fbbf24", "#ffffff", "#fef08a"] },

  // ── Nametags ──────────────────────────────────────────────────────────────
  { key: "tag_rookie",     name: "Rookie",       type: "nametag", price: 20,   description: "New to the grind",              emoji: "🌱" },
  { key: "tag_bookworm",   name: "Bookworm",     type: "nametag", price: 32,   description: "Always in the books",           emoji: "📖" },
  { key: "tag_scholar",    name: "Scholar",      type: "nametag", price: 40,   description: "A classic academic title",      emoji: "📚" },
  { key: "tag_dreamer",    name: "Dreamer",      type: "nametag", price: 40,   description: "Head in the clouds",            emoji: "💫" },
  { key: "tag_explorer",   name: "Explorer",     type: "nametag", price: 48,   description: "Curious and adventurous",       emoji: "🌍" },
  { key: "tag_grinder",    name: "Grinder",      type: "nametag", price: 48,   description: "Never stops working",           emoji: "💪" },
  { key: "tag_music",      name: "Music Lover",  type: "nametag", price: 52,   description: "Studies with the beat",         emoji: "🎵" },
  { key: "tag_artist",     name: "Artist",       type: "nametag", price: 60,   description: "Creative and expressive",       emoji: "🎨" },
  { key: "tag_nightowl",   name: "Night Owl",    type: "nametag", price: 60,   description: "Comes alive after midnight",    emoji: "🦉" },
  { key: "tag_wordsmith",  name: "Wordsmith",    type: "nametag", price: 64,   description: "Master of language",            emoji: "✍️" },
  { key: "tag_scientist",  name: "Scientist",    type: "nametag", price: 72,   description: "Lab coat always on",            emoji: "🔬" },
  { key: "tag_genius",     name: "Genius",       type: "nametag", price: 80,   description: "For the big brains",            emoji: "🧠" },
  { key: "tag_speedster",  name: "Speedster",    type: "nametag", price: 80,   description: "Fast learner, faster typer",    emoji: "⚡" },
  { key: "tag_strategist", name: "Strategist",   type: "nametag", price: 88,   description: "Always thinking ten steps ahead", emoji: "♟️" },
  { key: "tag_champion",   name: "Champion",     type: "nametag", price: 100,  description: "For the competitive spirit",    emoji: "🏆" },
  { key: "tag_quizking",   name: "Quiz King",    type: "nametag", price: 120,  description: "Dominator of every quiz",       emoji: "👑" },
  { key: "tag_legend",     name: "Legend",       type: "nametag", price: 200,  description: "Reserved for the very best",    emoji: "⚡" },
  { key: "tag_celestial",  name: "Celestial",    type: "nametag", price: 1000, description: "Ultimate — only the truly chosen bear this mark", emoji: "✨" },
  { key: "tag_backer",     name: "Backer",         type: "nametag", price: 0,    description: "Exclusive to those who've donated to Mind Forge.", emoji: "🙌", developerOnly: false },
  { key: "tag_luckiest",   name: "Luckiest Person", type: "nametag", price: 0,    description: "Awarded to the rarest of the lucky — only from the Wheel of Fortune.", emoji: "🍀", developerOnly: false, spinOnly: true },
  { key: "tag_developer",  name: "Developer",      type: "nametag", price: 0,    description: "Reserved for the one who built this. That's you.", emoji: "🛠️", developerOnly: true },

];

export function getItem(key: string): ShopItem | undefined {
  return SHOP_ITEMS.find(i => i.key === key);
}

export function getItemsByType(type: ShopItemType): ShopItem[] {
  return SHOP_ITEMS.filter(i => i.type === type);
}
