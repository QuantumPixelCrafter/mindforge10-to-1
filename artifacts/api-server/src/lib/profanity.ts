/**
 * Username profanity / hate-speech filter.
 *
 * Strategy:
 *  1. Normalise the candidate string (lower-case, collapse leet-speak).
 *  2. Check whether any blocked token appears as a *substring* of the
 *     normalised string so that obfuscations like "f4ck", "sh1t" etc.
 *     are still caught.
 *
 * Only add tokens that are unambiguously offensive — prefer longer, more
 * specific strings over short ones that could appear inside innocent words.
 */

/** Map common leet / look-alike characters back to their letter. */
function normalizeLeet(s: string): string {
  return s
    .toLowerCase()
    .replace(/4/g, "a")
    .replace(/3/g, "e")
    .replace(/1/g, "i")
    .replace(/!/g, "i")
    .replace(/0/g, "o")
    .replace(/5/g, "s")
    .replace(/\$/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/6/g, "g")
    .replace(/9/g, "g")
    .replace(/[@]/g, "a")
    .replace(/\+/g, "t")
    .replace(/[^a-z]/g, ""); // strip anything still non-alpha
}

/**
 * Words/substrings that must never appear inside a username (after
 * normalisation).  All entries are lower-case, letters only.
 */
const BLOCKED: readonly string[] = [
  // ── English profanity ──────────────────────────────────────────────────────
  "fuck", "fuk", "fck", "fucc",
  "shit", "sht",
  "cunt", "cnut",
  "cock", "kok",
  "dick", "dik",
  "pussy", "pussy",
  "asshole", "arsehole", "ashole",
  "bitch", "biatch",
  "bastard",
  "slut",
  "whore",
  "prick",
  "wank", "wanker",
  "twat",
  "bollocks",
  "tosser",
  "bellend",
  "piss",
  "cum", "jizz",
  "dildo",
  "penis",
  "vagina",
  "anus",
  "rectum",
  "scrotum",
  "tits", "boobs",
  "blowjob", "handjob",
  "orgasm",
  "masturbat",
  "fap",
  "nude", "nudes",
  "porn",
  "hentai",
  "rape", "rapist",
  "molest",
  "pedophile", "paedophile", "pedo", "paedo",
  "incest",
  "beastiality", "bestiality",

  // ── Racial / ethnic slurs ──────────────────────────────────────────────────
  "nigger", "nigg", "niga", "nigga",
  "chink", "chinc",
  "spic", "spick",
  "kike",
  "gook",
  "wetback",
  "beaner",
  "cracker",
  "honky", "honkey",
  "coon",
  "jap", // context-dependent but high-risk in usernames
  "darkie",
  "raghead",
  "towelhead",
  "sandnigger",
  "zipperhead",
  "redskin",

  // ── Hate / extremism ──────────────────────────────────────────────────────
  "nazi", "naz1",
  "hitler", "h1tler",
  "heil",
  "kkk",
  "fascist",
  "genocide",
  "terrorist",
  "jihad",
  "isis",

  // ── Homophobic / transphobic slurs ────────────────────────────────────────
  "faggot", "fagot", "fag",
  "dyke",
  "tranny",
  "shemale",

  // ── Self-harm / shock content ─────────────────────────────────────────────
  "suicide",
  "selfharm",
  "killmyself", "killme",
  "kys",

  // ── Variations / common bypasses ─────────────────────────────────────────
  "phuck", "phuk",
  "biitch", "b1tch",
  "sht",
  "fcuk",
  "mofo", "mf",
];

/**
 * Returns true if the username contains any blocked token after normalisation.
 * Exported so it can be used in any route that accepts a username.
 */
export function isInappropriate(username: string): boolean {
  const normalized = normalizeLeet(username);
  return BLOCKED.some((token) => normalized.includes(token));
}
