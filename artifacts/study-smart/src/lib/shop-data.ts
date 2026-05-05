export interface ShopItemDef {
  key: string;
  name: string;
  type: "background" | "frame" | "nametag";
  colors?: string[];
  emoji?: string;
}

export const SHOP_ITEM_DEFS: ShopItemDef[] = [
  { key: "bg_mint",       name: "Mint",          type: "background", colors: ["#34D399", "#67E8F9"] },
  { key: "bg_candy",      name: "Candy",          type: "background", colors: ["#F9A8D4", "#C084FC"] },
  { key: "bg_sunset",     name: "Sunset",         type: "background", colors: ["#F97316", "#EC4899"] },
  { key: "bg_ocean",      name: "Ocean",          type: "background", colors: ["#3B82F6", "#06B6D4"] },
  { key: "bg_coffee",     name: "Coffee",         type: "background", colors: ["#92400E", "#D97706"] },
  { key: "bg_pastel",     name: "Pastel Dream",   type: "background", colors: ["#C4B5FD", "#93C5FD"] },
  { key: "bg_cherry",     name: "Cherry Blossom", type: "background", colors: ["#FBCFE8", "#F472B6"] },
  { key: "bg_forest",     name: "Forest",         type: "background", colors: ["#10B981", "#16A34A"] },
  { key: "bg_golden",     name: "Golden Hour",    type: "background", colors: ["#F59E0B", "#FCD34D"] },
  { key: "bg_arctic",     name: "Arctic",         type: "background", colors: ["#BAE6FD", "#E0F2FE"] },
  { key: "bg_storm",      name: "Thunderstorm",   type: "background", colors: ["#374151", "#1E3A5F"] },
  { key: "bg_fire",       name: "Flame",          type: "background", colors: ["#EF4444", "#F97316"] },
  { key: "bg_aurora",     name: "Aurora",         type: "background", colors: ["#064E3B", "#4ADE80", "#38BDF8"] },
  { key: "bg_neon",       name: "Neon City",      type: "background", colors: ["#FDE047", "#22D3EE"] },
  { key: "bg_galaxy",     name: "Galaxy",         type: "background", colors: ["#4F46E5", "#7C3AED"] },
  { key: "bg_lava",       name: "Lava",           type: "background", colors: ["#1C0505", "#DC2626", "#F97316"] },
  { key: "bg_midnight",   name: "Midnight",       type: "background", colors: ["#1E1B4B", "#0F172A"] },
  { key: "bg_rainbow",    name: "Rainbow Wave",   type: "background", colors: ["#F97316", "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6"] },
  { key: "bg_celestial",  name: "✦ Celestial Void", type: "background", colors: ["#020617", "#1e1b4b", "#c084fc", "#facc15"] },
  { key: "frame_bronze",   name: "Bronze",        type: "frame", colors: ["#92400E", "#D97706"] },
  { key: "frame_gold",     name: "Golden",        type: "frame", colors: ["#F59E0B", "#D97706"] },
  { key: "frame_rose",     name: "Rose",          type: "frame", colors: ["#FB7185", "#F43F5E"] },
  { key: "frame_cherry",   name: "Cherry",        type: "frame", colors: ["#FBCFE8", "#F472B6"] },
  { key: "frame_crystal",  name: "Crystal",       type: "frame", colors: ["#BAE6FD", "#7DD3FC"] },
  { key: "frame_emerald",  name: "Emerald",       type: "frame", colors: ["#059669", "#34D399"] },
  { key: "frame_neon",     name: "Neon",          type: "frame", colors: ["#22D3EE", "#10B981"] },
  { key: "frame_fire",     name: "Fire Ring",     type: "frame", colors: ["#EF4444", "#F97316"] },
  { key: "frame_electric", name: "Electric",      type: "frame", colors: ["#FDE047", "#FBBF24"] },
  { key: "frame_cosmic",   name: "Cosmic",        type: "frame", colors: ["#4F46E5", "#7C3AED", "#EC4899"] },
  { key: "frame_platinum", name: "Platinum",      type: "frame", colors: ["#CBD5E1", "#94A3B8"] },
  { key: "frame_diamond",  name: "Diamond",       type: "frame", colors: ["#E0F2FE", "#BAE6FD", "#FFFFFF"] },
  { key: "frame_rainbow",  name: "Rainbow",       type: "frame", colors: ["#F97316", "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6"] },
  { key: "frame_holo",     name: "Holographic",   type: "frame", colors: ["#EC4899", "#22D3EE", "#FDE047"] },
  { key: "frame_divine",   name: "✦ Divine Aura", type: "frame", colors: ["#fef08a", "#fbbf24", "#ffffff", "#fef08a"] },
  { key: "tag_rookie",     name: "Rookie",        type: "nametag", emoji: "🌱" },
  { key: "tag_bookworm",   name: "Bookworm",      type: "nametag", emoji: "📖" },
  { key: "tag_scholar",    name: "Scholar",       type: "nametag", emoji: "📚" },
  { key: "tag_dreamer",    name: "Dreamer",       type: "nametag", emoji: "💫" },
  { key: "tag_explorer",   name: "Explorer",      type: "nametag", emoji: "🌍" },
  { key: "tag_grinder",    name: "Grinder",       type: "nametag", emoji: "💪" },
  { key: "tag_music",      name: "Music Lover",   type: "nametag", emoji: "🎵" },
  { key: "tag_artist",     name: "Artist",        type: "nametag", emoji: "🎨" },
  { key: "tag_nightowl",   name: "Night Owl",     type: "nametag", emoji: "🦉" },
  { key: "tag_wordsmith",  name: "Wordsmith",     type: "nametag", emoji: "✍️" },
  { key: "tag_scientist",  name: "Scientist",     type: "nametag", emoji: "🔬" },
  { key: "tag_genius",     name: "Genius",        type: "nametag", emoji: "🧠" },
  { key: "tag_speedster",  name: "Speedster",     type: "nametag", emoji: "⚡" },
  { key: "tag_strategist", name: "Strategist",    type: "nametag", emoji: "♟️" },
  { key: "tag_champion",   name: "Champion",      type: "nametag", emoji: "🏆" },
  { key: "tag_quizking",   name: "Quiz King",     type: "nametag", emoji: "👑" },
  { key: "tag_legend",     name: "Legend",        type: "nametag", emoji: "⚡" },
  { key: "tag_celestial",  name: "Celestial",     type: "nametag", emoji: "✨" },
  { key: "tag_backer",     name: "Backer",        type: "nametag", emoji: "🙌" },
  { key: "tag_developer",  name: "Developer",     type: "nametag", emoji: "🛠️" },
];

export function getItemDef(key: string | null | undefined): ShopItemDef | undefined {
  if (!key) return undefined;
  return SHOP_ITEM_DEFS.find(i => i.key === key);
}

export function getBgStyle(key: string | null | undefined): string {
  if (!key) return "";
  const item = getItemDef(key);
  if (!item?.colors) return "";
  return `linear-gradient(135deg, ${item.colors.join(", ")})`;
}

export function getFrameGradient(key: string | null | undefined): string | null {
  const item = getItemDef(key);
  if (!item?.colors) return null;
  return `linear-gradient(135deg, ${item.colors.join(", ")})`;
}
