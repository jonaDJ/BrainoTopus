import { isRealEnglishWord } from "../backend/src/dictionary.js";
import { isAllowedGuess } from "../backend/src/wordBank.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const url = new URL(req.url ?? "/api/validate-guess", "http://localhost");
  const guess = (url.searchParams.get("guess") || "").toUpperCase();

  if (!/^[A-Z]{5}$/.test(guess)) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ guess, isValid: false }));
    return;
  }

  if (isAllowedGuess(guess)) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ guess, isValid: true }));
    return;
  }

  try {
    const isValid = await isRealEnglishWord(guess);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ guess, isValid, source: "dictionary" }));
  } catch (error) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        guess,
        isValid: false,
        source: "dictionary-error-rejected",
        detail: error instanceof Error ? error.message : "Unknown error",
      }),
    );
  }
}
