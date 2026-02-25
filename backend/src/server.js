import { createServer } from "node:http";
import { isRealEnglishWord } from "./dictionary.js";
import { isAllowedGuess, pickRandomWord } from "./wordBank.js";

const PORT = Number(process.env.PORT || 8787);

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/api/word") {
    const word = pickRandomWord();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ word }));
    return;
  }

  if (req.method === "GET" && req.url?.startsWith("/api/validate-guess")) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const guess = (url.searchParams.get("guess") || "").toUpperCase();

    if (!/^[A-Z]{5}$/.test(guess)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ guess, isValid: false }));
      return;
    }

    if (isAllowedGuess(guess)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ guess, isValid: true }));
      return;
    }

    try {
      const isValid = await isRealEnglishWord(guess);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ guess, isValid, source: "dictionary" }));
    } catch (error) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          guess,
          isValid: false,
          source: "dictionary-error-rejected",
          detail: error instanceof Error ? error.message : "Unknown error",
        }),
      );
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`Word API listening on http://localhost:${PORT}`);
});
