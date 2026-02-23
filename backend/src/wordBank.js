export const WORD_BANK = [
  "OCEAN",
  "SQUID",
  "TIDES",
  "CORAL",
  "WAVES",
  "BRINE",
  "SHARK",
  "REEFS",
  "SHELL",
  "STORM",
  "FLOAT",
  "DRIFT",
  "ALGAE",
  "CLOUD",
  "GUSTY",
  "MISTY",
  "PLANK",
  "KELPY",
  "CRABS",
  "GLASS",
  "LIGHT",
  "BRAIN",
  "OCTOP",
].filter((word) => word.length === 5);

const WORD_SET = new Set(WORD_BANK);

export function pickRandomWord() {
  const randomIndex = Math.floor(Math.random() * WORD_BANK.length);
  return WORD_BANK[randomIndex];
}

export function isAllowedGuess(guess) {
  return WORD_SET.has(String(guess || "").toUpperCase());
}
