import { Trial, TIMING, PM_CUES } from "./types";

// English words (5-8 letters, common), all unique across both blocks
// Based on high-frequency English words suitable for lexical decision
const WORDS_BLOCK_A: string[] = [
  "KITCHEN", "MORNING", "BALANCE", "CABINET", "DOLPHIN",
  "ELEMENT", "FANTASY", "GENUINE", "HISTORY", "JOURNEY",
  "KINGDOM", "LIBRARY", "MACHINE", "NATURAL", "OPINION",
  "PATTERN", "QUARTER", "REMAINS", "SOCIETY", "THOUGHT",
  "VILLAGE", "WEATHER", "BLANKET", "CAPTAIN", "DIAMOND",
  "EVENING", "FICTION", "GATEWAY", "HARMONY", "IMAGINE",
  "JUSTICE", "LEATHER", "MINERAL", "NOTHING", "OPERATE",
  "PIONEER", "QUALITY", "RELEASE", "SILENCE", "TOBACCO",
  "UNIFORM", "VERSION", "WITNESS", "ANCIENT", "BENEFIT",
  "CLIMATE", "DEPOSIT", "EMOTION", "FINANCE", "GALLERY",
  "HIGHWAY", "INSTANT", "JOURNAL", "LECTURE", "MAMMOTH",
  "NETWORK", "OVERALL", "PLASTIC", "PREMIUM", "RAINBOW",
  "SHELTER", "TRIBUTE", "UNUSUAL", "VENTURE", "WELFARE",
  "WRITTEN", "ACHIEVE", "BEDROOM", "CENTURY", "DECLINE",
  "ENDLESS", "FOREIGN", "GLIMPSE", "HOLIDAY", "IMPULSE",
  "LEISURE", "MISSILE", "NAPKINS", "OBSERVE", "PASSAGE",
];

const WORDS_BLOCK_B: string[] = [
  "WHISPER", "ALGEBRA", "BONFIRE", "CHAPTER", "DISPLAY",
  "EXPENSE", "FORMULA", "HUNDRED", "INITIAL", "LOGICAL",
  "MASSIVE", "NUCLEAR", "OUTLINE", "PARKING", "RECEIPT",
  "SALVAGE", "TEACHER", "UTILITY", "VANILLA", "ARTWORK",
  "BICYCLE", "CONTEST", "DIGITAL", "ENQUIRE", "FASHION",
  "GRAVITY", "HARVEST", "INQUIRY", "LAUNDRY", "MIDTERM",
  "NEUTRAL", "ORBITAL", "PENGUIN", "REBUILD", "STORAGE",
  "TRAFFIC", "VARIOUS", "WESTERN", "ANXIETY", "BILLION",
  "COMPLEX", "DENSITY", "EXHIBIT", "GLUCOSE", "HOSTAGE",
  "INSIGHT", "MEDICAL", "NOTABLE", "OPTIMAL", "PRIVATE",
  "ROUTINE", "SURFACE", "TYPICAL", "VETERAN", "WARRIOR",
  "AVERAGE", "BRACKET", "CANTEEN", "ELEVATE", "FISHING",
  "RADICAL", "SEGMENT", "QUANTUM", "PILGRIM", "OVERLAP",
  "NURSING", "TORTURE", "SCANDAL", "THERAPY", "VOLTAGE",
  "REALITY", "COUNTRY", "MONSTER", "BATTERY", "COMBINE",
  "CULTURE", "DESTINY", "EMPEROR", "FERTILE", "GENERAL",
];

// Nonwords created by changing 1-2 letters (following the paper's method)
const NONWORDS_BLOCK_A: string[] = [
  "KITCHAN", "MORBING", "BALENCE", "CABIMET", "DOLPKIN",
  "ELEMANT", "FANTISY", "GANUINE", "HISTIRY", "JOURLEY",
  "KINGDOB", "LIBRACY", "MACHIRE", "NATIRAL", "OPINEON",
  "PATTERM", "QUARTOR", "REMAIRS", "SOCIEFY", "THOUGLT",
  "VILLAKE", "WEATHIR", "BLANKAT", "CAPTAEN", "DIAMONT",
  "EVENIMG", "FICEION", "GATEWEY", "HARMOLY", "IMAGIRE",
  "JUSTACE", "LEATHOR", "MINORAL", "NOTHENG", "OPERITE",
  "PIOMEER", "QUALINY", "RELEAST", "SILERCE", "TOBACCA",
  "UNIFORN", "VERSIOL", "WITNASS", "ANCIENG", "BENIFIT",
  "CLIMETE", "DEPOSIL", "EMOTIAN", "FINANCA", "GALLARY",
  "HIGHWEY", "INSTANK", "JOURNEL", "LECTURA", "MAMMATH",
  "NETWARK", "OVERAIL", "PLASTEC", "PREMIAM", "RAINBEW",
  "SHELTAR", "TRIBUTI", "UNUSIAL", "VENTORE", "WELFARA",
  "WRITTAN", "ACHIAVE", "BEDROON", "CENTIRY", "DECLINA",
  "ENDIESS", "FOREIGH", "GLIMPSA", "HOLIDEY", "IMPULSA",
  "LEISURA", "MISSILA", "NAPKANS", "OBSERFE", "PASSAGA",
];

const NONWORDS_BLOCK_B: string[] = [
  "WHISPOR", "ALGEBRI", "BONFIRA", "CHAPTOR", "DISPLIY",
  "EXPENSA", "FORMULI", "HUNDRAD", "INITIEL", "LOGICOL",
  "MASSIVA", "NUCLEER", "OUTLINA", "PARKENG", "RECEINT",
  "SALVEGE", "TEACHAR", "UTILILY", "VANILLI", "ARTWORT",
  "BICYCLA", "CONTESK", "DIGITOL", "ENQUIRA", "FASHIOM",
  "GRAVILY", "HARVAST", "INQUARY", "LAUNDRI", "MIDTARM",
  "NEUTREL", "ORBITEL", "PENGUEN", "REBUELD", "STORAGA",
  "TRAFFEC", "VARIOOS", "WESTARN", "ANXIELY", "BILLIAN",
  "COMPLAX", "DENSILY", "EXHIBET", "GLUCOSA", "HOSTAGI",
  "INSIGLT", "MEDICOL", "NOTABLA", "OPTIMEL", "PRIVATA",
  "ROUTIME", "SURFACA", "TYPICOL", "VETERAI", "WARRIAR",
  "AVERAGA", "BRACKAT", "CANTEAM", "ELEVATA", "FISHENG",
  "RADICOL", "SEGMANT", "QUANTEM", "PILGRAM", "OVERLEP",
  "NURSENG", "TORTURA", "SCANDEL", "THEREPY", "VOLTEGE",
  "REALILY", "COUNTRI", "MONSTAR", "BATTERI", "COMBINA",
  "CULTURA", "DESTANY", "EMPERIR", "FERTILA", "GENEROL",
];

// Training stimuli (separate from main pools)
const TRAINING_WORDS: string[] = [
  "GARDEN", "SIMPLE", "PLANET", "WONDER", "BASKET",
];
const TRAINING_NONWORDS: string[] = [
  "GARDAN", "SIMPLA", "PLANAT", "WONDAR", "BASKAT",
];

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate the sequence of trials for a task block.
 * For LD: 160 LD trials (80 word + 80 nonword)
 * For PM: 160 LD trials + 16 PM trials interspersed
 *   - At least 10 LD trials before first PM cue
 *   - At least 8 LD trials between each PM cue
 */
export function generateTrials(
  taskType: "LD" | "PM",
  phase: "before" | "after"
): Trial[] {
  const words = shuffle(phase === "before" ? [...WORDS_BLOCK_A] : [...WORDS_BLOCK_B]);
  const nonwords = shuffle(phase === "before" ? [...NONWORDS_BLOCK_A] : [...NONWORDS_BLOCK_B]);

  // Create LD trials (80 words + 80 nonwords = 160)
  const ldTrials: Trial[] = [];
  for (let i = 0; i < 80; i++) {
    ldTrials.push({ index: 0, stimulus: words[i], type: "word" });
    ldTrials.push({ index: 0, stimulus: nonwords[i], type: "nonword" });
  }

  const shuffledLD = shuffle(ldTrials);

  if (taskType === "LD") {
    return shuffledLD.map((t, i) => ({ ...t, index: i }));
  }

  // PM task: Insert 16 PM trials into the LD trial sequence
  const pmTrials: Trial[] = [];
  for (let i = 0; i < TIMING.PM_TRIALS_PER_BLOCK; i++) {
    const cue = PM_CUES[i % PM_CUES.length];
    pmTrials.push({
      index: 0,
      stimulus: cue.word,
      type: "pm_cue",
      pmCueKey: cue.key,
    });
  }

  // Insert PM trials respecting spacing constraints
  const combined: Trial[] = [];
  let pmIdx = 0;
  let ldIdx = 0;
  let sinceLastPM = 0;
  let firstPM = false;

  while (ldIdx < shuffledLD.length || pmIdx < pmTrials.length) {
    const canInsert = pmIdx < pmTrials.length && (
      (!firstPM && sinceLastPM >= TIMING.MIN_LD_BEFORE_FIRST_PM) ||
      (firstPM && sinceLastPM >= TIMING.MIN_LD_BETWEEN_PM)
    );

    const remainingPM = pmTrials.length - pmIdx;
    const remainingLD = shuffledLD.length - ldIdx;
    const ldNeeded = remainingPM > 1 ? (remainingPM - 1) * TIMING.MIN_LD_BETWEEN_PM : 0;
    const mustInsert = canInsert && remainingLD <= ldNeeded;

    if (mustInsert || (canInsert && Math.random() < 0.3)) {
      combined.push(pmTrials[pmIdx++]);
      sinceLastPM = 0;
      firstPM = true;
    } else if (ldIdx < shuffledLD.length) {
      combined.push(shuffledLD[ldIdx++]);
      sinceLastPM++;
    } else if (pmIdx < pmTrials.length) {
      combined.push(pmTrials[pmIdx++]);
    }
  }

  return combined.map((t, i) => ({ ...t, index: i }));
}

/**
 * Generate training trials
 */
export function generateTrainingTrials(taskType: "LD" | "PM"): Trial[] {
  const trials: Trial[] = [];
  for (let i = 0; i < TRAINING_WORDS.length; i++) {
    trials.push({ index: 0, stimulus: TRAINING_WORDS[i], type: "word" });
    trials.push({ index: 0, stimulus: TRAINING_NONWORDS[i], type: "nonword" });
  }

  const shuffled = shuffle(trials);

  if (taskType === "PM") {
    shuffled.splice(4, 0, {
      index: 0,
      stimulus: PM_CUES[0].word,
      type: "pm_cue",
      pmCueKey: PM_CUES[0].key,
    });
    shuffled.splice(9, 0, {
      index: 0,
      stimulus: PM_CUES[1].word,
      type: "pm_cue",
      pmCueKey: PM_CUES[1].key,
    });
  }

  return shuffled.map((t, i) => ({ ...t, index: i }));
}

/**
 * Get a random fixation duration
 */
export function getRandomFixationDuration(): number {
  return pickRandom(TIMING.FIXATION_DURATIONS);
}
