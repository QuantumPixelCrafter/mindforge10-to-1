/**
 * Leaderboard bots — purely visual, injected at response time only.
 * No DB entries are created. Reward distribution operates on real DB
 * scores only, so bots never receive XP or coins.
 *
 * WEEKLY CALIBRATION:
 *   Each Monday, check top human scores per board and nudge stand-out
 *   bot scores (~5–10% above the human peak) to keep boards competitive
 *   but beatable. All scores live in this one file.
 *
 * Current calibration: week of 2025-03-28 (testing baseline — conservative).
 */

import { getLevelProgress } from "./xp";

export interface BotScore {
  userId: string;
  displayName: string;
  isBot: true;
  score: number;
  userLevel?: string;
}

export interface LevelBoardBot {
  userId: string;
  displayName: string;
  isBot: true;
  xp: number;
  gameLevel: number;
  level: string | null;
}

// ─── Bot personas ─────────────────────────────────────────────────────────────

const B = (id: string, name: string) =>
  ({ userId: `bot_${id}`, displayName: name, isBot: true as const });

// Shared across multiple boards
const ZARA   = B("zara_m",   "Zara M.");
const TYLER  = B("tylerw",   "TylerW");
const SOPHIE = B("sophie_j", "Sophie_J");
const LIAM   = B("liam_r",   "Liam R.");
const EMMA   = B("emma_c",   "Emma C.");
const PRIYA  = B("priya_s",  "Priya_S");
const ALEX   = B("alex99",   "alex99");
const NOAH   = B("noah_k",   "NoahK");
const MIA    = B("mia_ht",   "mia_ht");

// Quiz-only personas
const CHARLIE = B("charlie_p", "charlie_p");
const LUNA    = B("luna_w",    "luna_w");
const AVA     = B("ava_ms",    "Ava M.");
const BEN     = B("ben_lt",    "ben_lt");
const LEO     = B("leo_h",     "Leo H.");
const FINN    = B("finn_a",    "finn_a");
const MAYA    = B("maya_b",    "Maya B.");
const ETHAN   = B("ethan_s",   "EthanS");
const JADE    = B("jade_n",    "Jade N.");
const RIVER   = B("river_d",   "river_d");
const SASHA   = B("sasha_m",   "Sasha M.");
const QUINN   = B("quinn_f",   "QuinnF");
const MORGAN  = B("morgan_k",  "Morgan K.");
const THEO    = B("theo_p",    "theo_p");
const REESE   = B("reese_b",   "Reese B.");
const AVERY   = B("avery_l",   "Avery L.");
const SKYLER  = B("skyler_n",  "Skyler N.");
const DREW    = B("drew_c",    "DrewC");
const ALEX_R  = B("alex_r",    "Alex R.");
const CASEY   = B("casey_w",   "casey_w");

// Level-board-only personas
const NINA    = B("nina_k",    "Nina K.");
const MARK    = B("mark_h",    "Mark H.");
const DEREK   = B("derek_y",   "Derek Y.");
const CAITLIN = B("caitlin_p", "Caitlin P.");
const KAI_M   = B("kai_m",     "KaiM");
const BELLA   = B("bella_r",   "Bella R.");

// ─── Bubble Pop bots ──────────────────────────────────────────────────────────
// Top 30% (top 3 of 9) in 70–110 range to motivate real users.

export const BUBBLE_POP_BOTS: BotScore[] = [
  { ...ZARA,   score: 105 }, // ★ stand-out
  { ...TYLER,  score: 88  }, // ★ stand-out
  { ...SOPHIE, score: 72  }, // ★ stand-out  ← top 3 are all in 70–110
  { ...LIAM,   score: 55  },
  { ...EMMA,   score: 42  },
  { ...PRIYA,  score: 40  },
  { ...ALEX,   score: 38  },
  { ...NOAH,   score: 36  },
  { ...MIA,    score: 35  },
];

// ─── Memory Match bots ────────────────────────────────────────────────────────

export const MEMORY_MATCH_BOTS: BotScore[] = [
  { ...EMMA,  score: 28 }, // ★ stand-out
  { ...LIAM,  score: 24 }, // ★ stand-out
  { ...PRIYA, score: 19 },
  { ...NOAH,  score: 15 },
  { ...ALEX,  score: 11 },
  { ...MIA,   score: 8  },
];

// ─── Quiz bots (accumulated weekly total, 1–3 per level) ─────────────────────
// Scores represent the SUM of all quiz scores in the period.
// Shared bots (LIAM, EMMA, PRIYA, ALEX) appear in both this and Bubble Pop.

export const QUIZ_BOTS: BotScore[] = [
  // P1
  { ...CHARLIE, score: 42, userLevel: "P1" }, // ★
  { ...LUNA,    score: 22, userLevel: "P1" },
  // P2
  { ...AVA,     score: 55, userLevel: "P2" }, // ★
  { ...BEN,     score: 30, userLevel: "P2" },
  // P3
  { ...LEO,     score: 68, userLevel: "P3" }, // ★
  // P4
  { ...FINN,    score: 78, userLevel: "P4" }, // ★
  { ...LIAM,    score: 45, userLevel: "P4" }, // shared with Bubble Pop
  // P5
  { ...MAYA,    score: 88, userLevel: "P5" }, // ★
  { ...ETHAN,   score: 52, userLevel: "P5" },
  // P6
  { ...JADE,    score: 95, userLevel: "P6" }, // ★
  { ...ALEX,    score: 58, userLevel: "P6" }, // shared with Bubble Pop
  // S1
  { ...RIVER,   score: 108, userLevel: "S1" }, // ★
  { ...EMMA,    score: 62,  userLevel: "S1" }, // shared with Bubble Pop
  { ...SASHA,   score: 45,  userLevel: "S1" },
  // S2
  { ...QUINN,   score: 122, userLevel: "S2" }, // ★
  { ...PRIYA,   score: 72,  userLevel: "S2" }, // shared with Bubble Pop
  // S3
  { ...MORGAN,  score: 135, userLevel: "S3" }, // ★
  { ...THEO,    score: 80,  userLevel: "S3" },
  // S4
  { ...REESE,   score: 148, userLevel: "S4" }, // ★
  { ...AVERY,   score: 90,  userLevel: "S4" },
  // S5
  { ...SKYLER,  score: 158, userLevel: "S5" }, // ★
  { ...DREW,    score: 95,  userLevel: "S5" },
  // Uni
  { ...ALEX_R,  score: 172, userLevel: "Uni" }, // ★
  { ...CASEY,   score: 108, userLevel: "Uni" },
];

// ─── Math Blitz bots ─────────────────────────────────────────────────────────

export const MATH_BLITZ_EASY_BOTS: BotScore[] = [
  { ...ALEX,  score: 18 }, // ★
  { ...EMMA,  score: 16 }, // ★
  { ...LIAM,  score: 12 },
  { ...PRIYA, score: 10 },
  { ...MIA,   score: 8  },
  { ...MIA,   score: 6  },
];

export const MATH_BLITZ_NORMAL_BOTS: BotScore[] = [
  { ...ZARA,   score: 13 }, // ★
  { ...TYLER,  score: 11 }, // ★
  { ...NOAH,   score: 8  },
  { ...SOPHIE, score: 6  },
  { ...LIAM,   score: 5  },
  { ...ALEX,   score: 4  },
];

export const MATH_BLITZ_HARD_BOTS: BotScore[] = [
  { ...MIA,   score: 9 }, // ★
  { ...PRIYA, score: 7 }, // ★
  { ...TYLER, score: 5 },
  { ...EMMA,  score: 4 },
  { ...MIA,   score: 3 },
];

// ─── Level board bots ────────────────────────────────────────────────────────
// Sorted by XP descending. Shared personas (Zara, Sophie, Tyler) tie the boards
// together so the same "player" appears across multiple leaderboards.

export const LEVEL_BOARD_BOTS: LevelBoardBot[] = [
  { ...NINA,    xp: 3500, gameLevel: 30, level: "Uni" },  // ★ stand-out
  { ...MARK,    xp: 2750, gameLevel: 25, level: "S5"  },  // ★ stand-out
  { ...ZARA,    xp: 2050, gameLevel: 20, level: "S3"  },  // shared with Bubble Pop
  { ...DEREK,   xp: 1550, gameLevel: 17, level: "S2"  },
  { ...CAITLIN, xp: 1250, gameLevel: 15, level: "S1"  },
  { ...SOPHIE,  xp: 920,  gameLevel: 12, level: "P6"  },  // shared with Bubble Pop
  { ...KAI_M,   xp: 650,  gameLevel: 9,  level: "S1"  },
  { ...BELLA,   xp: 430,  gameLevel: 7,  level: "P4"  },
  { ...TYLER,   xp: 205,  gameLevel: 5,  level: "P5"  },  // shared with Bubble Pop
];

// ─── Bot profiles (for clickable profile pages) ───────────────────────────────

export interface BotProfile {
  userId: string;
  displayName: string;
  username: string;
  level: string | null;
  gameLevel: number;
  xp: number;
  country: string;
  gradeIndex: number;
  equippedBackground: string | null;
  equippedFrame: string | null;
  equippedNametag: string | null;
  isPublic: boolean;
  scores: { bubble: number | null; memory: number | null; quiz: number | null };
  createdAt: string;
}

// Country grade indices (0-based position in each country's grades array):
// US:  P1=2 P2=3 P3=4 P4=5 P5=6 P6=7  S1=8  S2=9  S3=10 S4=11 S5=12 Uni=14
// GB:  P1=2 P2=3 P3=4 P4=5 P5=6 P6=7  S1=8  S2=9  S3=10 S4=11 S5=12 Uni=15 UniY2=16
// AU:  P1=1 P2=2 P3=3 P4=4 P5=5 P6=6  S1=7  S2=8  S3=9  S4=10 S5=11 Uni=13
// CA:  P1=2 P2=3 P3=4 P4=5 P5=6 P6=7  S1=8  S2=9  S3=10 S4=11 S5=12 Uni=14
// SG:  P1=4 P2=5 P3=6 P4=7 P5=8 P6=9  S1=10 S2=11 S3=12 S4=13 S5=14 Uni=17

export const BOT_PROFILES: Record<string, BotProfile> = {
  // ── Shared bots (appear on multiple boards) ──
  zara_m:   { userId:"bot_zara_m",   displayName:"Zara M.",    username:"zara_m",   level:"S3",  gameLevel:20, xp:2050, country:"US", gradeIndex:10, equippedBackground:"bg_galaxy",   equippedFrame:"frame_cosmic",   equippedNametag:"tag_genius",     isPublic:true,  scores:{ bubble:105, memory:null, quiz:null  }, createdAt:"2024-08-15T00:00:00.000Z" },
  tylerw:   { userId:"bot_tylerw",   displayName:"TylerW",     username:"tylerw",   level:"P5",  gameLevel:5,  xp:205,  country:"GB", gradeIndex:6,  equippedBackground:"bg_golden",   equippedFrame:"frame_bronze",   equippedNametag:"tag_speedster",  isPublic:true,  scores:{ bubble:88,  memory:null, quiz:null  }, createdAt:"2024-11-20T00:00:00.000Z" },
  sophie_j: { userId:"bot_sophie_j", displayName:"Sophie_J",   username:"sophie_j", level:"P6",  gameLevel:12, xp:920,  country:"AU", gradeIndex:6,  equippedBackground:"bg_cherry",   equippedFrame:"frame_rose",     equippedNametag:"tag_dreamer",    isPublic:true,  scores:{ bubble:72,  memory:null, quiz:null  }, createdAt:"2024-09-03T00:00:00.000Z" },
  liam_r:   { userId:"bot_liam_r",   displayName:"Liam R.",    username:"liam_r",   level:"P4",  gameLevel:8,  xp:480,  country:"GB", gradeIndex:5,  equippedBackground:"bg_forest",   equippedFrame:null,             equippedNametag:"tag_grinder",    isPublic:true,  scores:{ bubble:55,  memory:null, quiz:45   }, createdAt:"2024-10-10T00:00:00.000Z" },
  emma_c:   { userId:"bot_emma_c",   displayName:"Emma C.",    username:"emma_c",   level:"S1",  gameLevel:11, xp:870,  country:"US", gradeIndex:8,  equippedBackground:"bg_sunset",   equippedFrame:"frame_emerald",  equippedNametag:"tag_scholar",    isPublic:true,  scores:{ bubble:42,  memory:28,   quiz:62   }, createdAt:"2024-07-22T00:00:00.000Z" },
  priya_s:  { userId:"bot_priya_s",  displayName:"Priya_S",    username:"priya_s",  level:"S2",  gameLevel:14, xp:1120, country:"SG", gradeIndex:11, equippedBackground:"bg_pastel",   equippedFrame:"frame_crystal",  equippedNametag:"tag_dreamer",    isPublic:false, scores:{ bubble:40,  memory:19,   quiz:72   }, createdAt:"2024-06-18T00:00:00.000Z" },
  alex99:   { userId:"bot_alex99",   displayName:"alex99",     username:"alex99",   level:"P6",  gameLevel:10, xp:740,  country:"US", gradeIndex:7,  equippedBackground:"bg_neon",     equippedFrame:"frame_electric", equippedNametag:"tag_speedster",  isPublic:true,  scores:{ bubble:38,  memory:11,   quiz:58   }, createdAt:"2024-12-01T00:00:00.000Z" },
  noah_k:   { userId:"bot_noah_k",   displayName:"NoahK",      username:"noah_k",   level:"S1",  gameLevel:11, xp:810,  country:"CA", gradeIndex:8,  equippedBackground:"bg_storm",    equippedFrame:null,             equippedNametag:"tag_nightowl",   isPublic:true,  scores:{ bubble:36,  memory:15,   quiz:null }, createdAt:"2024-09-30T00:00:00.000Z" },
  mia_ht:   { userId:"bot_mia_ht",   displayName:"mia_ht",     username:"mia_ht",   level:"P5",  gameLevel:9,  xp:590,  country:"AU", gradeIndex:5,  equippedBackground:"bg_candy",    equippedFrame:"frame_cherry",   equippedNametag:"tag_artist",     isPublic:false, scores:{ bubble:35,  memory:8,    quiz:null }, createdAt:"2025-01-05T00:00:00.000Z" },
  // ── Quiz-only bots ──
  charlie_p:{ userId:"bot_charlie_p",displayName:"charlie_p",  username:"charlie_p",level:"P1",  gameLevel:3,  xp:85,   country:"GB", gradeIndex:2,  equippedBackground:null,          equippedFrame:null,             equippedNametag:"tag_bookworm",   isPublic:true,  scores:{ bubble:null,memory:null, quiz:42   }, createdAt:"2025-01-15T00:00:00.000Z" },
  luna_w:   { userId:"bot_luna_w",   displayName:"luna_w",     username:"luna_w",   level:"P1",  gameLevel:2,  xp:60,   country:"AU", gradeIndex:1,  equippedBackground:null,          equippedFrame:"frame_crystal",  equippedNametag:"tag_rookie",     isPublic:true,  scores:{ bubble:null,memory:null, quiz:22   }, createdAt:"2025-02-10T00:00:00.000Z" },
  ava_ms:   { userId:"bot_ava_ms",   displayName:"Ava M.",     username:"ava_ms",   level:"P2",  gameLevel:4,  xp:155,  country:"US", gradeIndex:3,  equippedBackground:"bg_mint",     equippedFrame:null,             equippedNametag:"tag_bookworm",   isPublic:true,  scores:{ bubble:null,memory:null, quiz:55   }, createdAt:"2024-11-11T00:00:00.000Z" },
  ben_lt:   { userId:"bot_ben_lt",   displayName:"ben_lt",     username:"ben_lt",   level:"P2",  gameLevel:3,  xp:110,  country:"CA", gradeIndex:3,  equippedBackground:null,          equippedFrame:null,             equippedNametag:null,             isPublic:false, scores:{ bubble:null,memory:null, quiz:30   }, createdAt:"2025-01-28T00:00:00.000Z" },
  leo_h:    { userId:"bot_leo_h",    displayName:"Leo H.",     username:"leo_h",    level:"P3",  gameLevel:6,  xp:280,  country:"GB", gradeIndex:4,  equippedBackground:"bg_forest",   equippedFrame:"frame_bronze",   equippedNametag:"tag_explorer",   isPublic:true,  scores:{ bubble:null,memory:null, quiz:68   }, createdAt:"2024-10-05T00:00:00.000Z" },
  finn_a:   { userId:"bot_finn_a",   displayName:"finn_a",     username:"finn_a",   level:"P4",  gameLevel:7,  xp:420,  country:"AU", gradeIndex:4,  equippedBackground:"bg_arctic",   equippedFrame:null,             equippedNametag:"tag_grinder",    isPublic:true,  scores:{ bubble:null,memory:null, quiz:78   }, createdAt:"2024-09-20T00:00:00.000Z" },
  maya_b:   { userId:"bot_maya_b",   displayName:"Maya B.",    username:"maya_b",   level:"P5",  gameLevel:10, xp:650,  country:"SG", gradeIndex:8,  equippedBackground:"bg_candy",    equippedFrame:"frame_rose",     equippedNametag:"tag_dreamer",    isPublic:true,  scores:{ bubble:null,memory:null, quiz:88   }, createdAt:"2024-08-08T00:00:00.000Z" },
  ethan_s:  { userId:"bot_ethan_s",  displayName:"EthanS",     username:"ethan_s",  level:"P5",  gameLevel:9,  xp:560,  country:"US", gradeIndex:6,  equippedBackground:null,          equippedFrame:null,             equippedNametag:"tag_scientist",  isPublic:false, scores:{ bubble:null,memory:null, quiz:52   }, createdAt:"2024-12-20T00:00:00.000Z" },
  jade_n:   { userId:"bot_jade_n",   displayName:"Jade N.",    username:"jade_n",   level:"P6",  gameLevel:11, xp:810,  country:"GB", gradeIndex:7,  equippedBackground:"bg_aurora",   equippedFrame:"frame_emerald",  equippedNametag:"tag_scholar",    isPublic:true,  scores:{ bubble:null,memory:null, quiz:95   }, createdAt:"2024-07-14T00:00:00.000Z" },
  river_d:  { userId:"bot_river_d",  displayName:"river_d",    username:"river_d",  level:"S1",  gameLevel:13, xp:950,  country:"US", gradeIndex:8,  equippedBackground:"bg_ocean",    equippedFrame:"frame_crystal",  equippedNametag:"tag_explorer",   isPublic:true,  scores:{ bubble:null,memory:null, quiz:108  }, createdAt:"2024-06-01T00:00:00.000Z" },
  sasha_m:  { userId:"bot_sasha_m",  displayName:"Sasha M.",   username:"sasha_m",  level:"S1",  gameLevel:10, xp:720,  country:"AU", gradeIndex:7,  equippedBackground:"bg_midnight", equippedFrame:null,             equippedNametag:"tag_nightowl",   isPublic:false, scores:{ bubble:null,memory:null, quiz:45   }, createdAt:"2024-10-22T00:00:00.000Z" },
  quinn_f:  { userId:"bot_quinn_f",  displayName:"QuinnF",     username:"quinn_f",  level:"S2",  gameLevel:16, xp:1280, country:"CA", gradeIndex:9,  equippedBackground:"bg_storm",    equippedFrame:"frame_neon",     equippedNametag:"tag_strategist", isPublic:true,  scores:{ bubble:null,memory:null, quiz:122  }, createdAt:"2024-05-17T00:00:00.000Z" },
  morgan_k: { userId:"bot_morgan_k", displayName:"Morgan K.",  username:"morgan_k", level:"S3",  gameLevel:19, xp:1720, country:"GB", gradeIndex:10, equippedBackground:"bg_lava",     equippedFrame:"frame_fire",     equippedNametag:"tag_champion",   isPublic:true,  scores:{ bubble:null,memory:null, quiz:135  }, createdAt:"2024-04-09T00:00:00.000Z" },
  theo_p:   { userId:"bot_theo_p",   displayName:"theo_p",     username:"theo_p",   level:"S3",  gameLevel:17, xp:1350, country:"AU", gradeIndex:9,  equippedBackground:null,          equippedFrame:null,             equippedNametag:"tag_wordsmith",  isPublic:false, scores:{ bubble:null,memory:null, quiz:80   }, createdAt:"2024-08-30T00:00:00.000Z" },
  reese_b:  { userId:"bot_reese_b",  displayName:"Reese B.",   username:"reese_b",  level:"S4",  gameLevel:21, xp:1950, country:"US", gradeIndex:11, equippedBackground:"bg_fire",     equippedFrame:"frame_fire",     equippedNametag:"tag_champion",   isPublic:true,  scores:{ bubble:null,memory:null, quiz:148  }, createdAt:"2024-03-25T00:00:00.000Z" },
  avery_l:  { userId:"bot_avery_l",  displayName:"Avery L.",   username:"avery_l",  level:"S4",  gameLevel:19, xp:1680, country:"CA", gradeIndex:11, equippedBackground:"bg_pastel",   equippedFrame:null,             equippedNametag:"tag_music",      isPublic:false, scores:{ bubble:null,memory:null, quiz:90   }, createdAt:"2024-07-07T00:00:00.000Z" },
  skyler_n: { userId:"bot_skyler_n", displayName:"Skyler N.",  username:"skyler_n", level:"S5",  gameLevel:24, xp:2380, country:"GB", gradeIndex:12, equippedBackground:"bg_celestial",equippedFrame:"frame_cosmic",   equippedNametag:"tag_quizking",   isPublic:true,  scores:{ bubble:null,memory:null, quiz:158  }, createdAt:"2024-02-14T00:00:00.000Z" },
  drew_c:   { userId:"bot_drew_c",   displayName:"DrewC",      username:"drew_c",   level:"S5",  gameLevel:21, xp:1920, country:"AU", gradeIndex:11, equippedBackground:null,          equippedFrame:null,             equippedNametag:"tag_grinder",    isPublic:false, scores:{ bubble:null,memory:null, quiz:95   }, createdAt:"2024-06-28T00:00:00.000Z" },
  alex_r:   { userId:"bot_alex_r",   displayName:"Alex R.",    username:"alex_r",   level:"Uni", gameLevel:28, xp:3100, country:"US", gradeIndex:14, equippedBackground:"bg_galaxy",   equippedFrame:"frame_diamond",  equippedNametag:"tag_genius",     isPublic:true,  scores:{ bubble:null,memory:null, quiz:172  }, createdAt:"2024-01-01T00:00:00.000Z" },
  casey_w:  { userId:"bot_casey_w",  displayName:"casey_w",    username:"casey_w",  level:"Uni", gameLevel:25, xp:2650, country:"GB", gradeIndex:15, equippedBackground:null,          equippedFrame:null,             equippedNametag:"tag_scholar",    isPublic:false, scores:{ bubble:null,memory:null, quiz:108  }, createdAt:"2024-03-03T00:00:00.000Z" },
  // ── Level-board-only bots ──
  nina_k:   { userId:"bot_nina_k",   displayName:"Nina K.",    username:"nina_k",   level:"Uni", gameLevel:30, xp:3500, country:"GB", gradeIndex:16, equippedBackground:"bg_celestial",equippedFrame:"frame_divine",   equippedNametag:"tag_legend",     isPublic:true,  scores:{ bubble:null,memory:null, quiz:null }, createdAt:"2023-11-01T00:00:00.000Z" },
  mark_h:   { userId:"bot_mark_h",   displayName:"Mark H.",    username:"mark_h",   level:"S5",  gameLevel:25, xp:2750, country:"US", gradeIndex:12, equippedBackground:"bg_galaxy",   equippedFrame:"frame_cosmic",   equippedNametag:"tag_champion",   isPublic:true,  scores:{ bubble:null,memory:null, quiz:null }, createdAt:"2024-02-02T00:00:00.000Z" },
  derek_y:  { userId:"bot_derek_y",  displayName:"Derek Y.",   username:"derek_y",  level:"S2",  gameLevel:17, xp:1550, country:"SG", gradeIndex:11, equippedBackground:"bg_storm",    equippedFrame:"frame_platinum", equippedNametag:"tag_strategist", isPublic:false, scores:{ bubble:null,memory:null, quiz:null }, createdAt:"2024-05-05T00:00:00.000Z" },
  caitlin_p:{ userId:"bot_caitlin_p",displayName:"Caitlin P.", username:"caitlin_p",level:"S1",  gameLevel:15, xp:1250, country:"CA", gradeIndex:8,  equippedBackground:"bg_mint",     equippedFrame:"frame_emerald",  equippedNametag:"tag_scholar",    isPublic:true,  scores:{ bubble:null,memory:null, quiz:null }, createdAt:"2024-08-19T00:00:00.000Z" },
  kai_m:    { userId:"bot_kai_m",    displayName:"KaiM",       username:"kai_m",    level:"S1",  gameLevel:9,  xp:650,  country:"SG", gradeIndex:10, equippedBackground:"bg_neon",     equippedFrame:"frame_electric", equippedNametag:"tag_speedster",  isPublic:true,  scores:{ bubble:null,memory:null, quiz:null }, createdAt:"2024-11-08T00:00:00.000Z" },
  bella_r:  { userId:"bot_bella_r",  displayName:"Bella R.",   username:"bella_r",  level:"P4",  gameLevel:7,  xp:430,  country:"AU", gradeIndex:4,  equippedBackground:"bg_candy",    equippedFrame:"frame_rose",     equippedNametag:"tag_dreamer",    isPublic:true,  scores:{ bubble:null,memory:null, quiz:null }, createdAt:"2025-01-12T00:00:00.000Z" },
};

/** Look up a bot profile by full userId (e.g. "bot_zara_m") */
export function getBotProfile(userId: string): BotProfile | null {
  if (!userId.startsWith("bot_")) return null;
  const key = userId.slice(4); // strip "bot_"
  return BOT_PROFILES[key] ?? null;
}

// ─── Merge helpers ────────────────────────────────────────────────────────────

type LeaderboardEntry = Record<string, unknown> & { score: number };

/**
 * Merges real leaderboard entries with bot entries.
 * For quiz boards, pass `userLevelFilter` to only include level-matching bots.
 * When omitted, all bots are included (useful when no level filter is active).
 */
export function mergeWithBots(
  real: LeaderboardEntry[],
  bots: BotScore[],
  limit = 50,
  useRank = false,
  userLevelFilter?: string,
): LeaderboardEntry[] {
  const filtered = userLevelFilter !== undefined
    ? bots.filter(b => b.userLevel === userLevelFilter)
    : bots;

  const botEntries: LeaderboardEntry[] = filtered.map(b => {
    const profile = getBotProfile(b.userId);
    return {
      userId: b.userId,
      displayName: b.displayName,
      profileImageUrl: null,
      profileViewable: false,
      score: b.score,
      subject: null,
      userLevel: b.userLevel ?? null,
      createdAt: "2025-03-28T08:00:00.000Z",
      equippedNametag: profile?.equippedNametag ?? null,
      gameLevel: profile?.gameLevel ?? 1,
      isBot: true,
    };
  });

  const merged = [...real, ...botEntries]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return merged.map((entry, i) => ({
    ...entry,
    ...(useRank ? { rank: i + 1 } : { id: i + 1 }),
  }));
}

/**
 * Merges real level board entries with level-board bot entries, sorts by XP,
 * and re-assigns sequential ranks. Bot entries get their levelProgress computed.
 */
export function mergeLevelBoardWithBots(
  real: LeaderboardEntry[],
  bots: LevelBoardBot[],
  limit = 50,
): LeaderboardEntry[] {
  const botEntries: LeaderboardEntry[] = bots.map(b => {
    const profile = getBotProfile(b.userId);
    return {
      userId: b.userId,
      displayName: b.displayName,
      profileImageUrl: null,
      profileViewable: false,
      score: b.xp,
      xp: b.xp,
      gameLevel: b.gameLevel,
      level: b.level,
      equippedNametag: profile?.equippedNametag ?? null,
      levelProgress: getLevelProgress(b.xp),
      isBot: true,
    };
  });

  const merged = [...real, ...botEntries]
    .sort((a, b) => (b.xp as number) - (a.xp as number))
    .slice(0, limit);

  return merged.map((entry, i) => ({ ...entry, rank: i + 1 }));
}
