import { get as httpsGet } from "node:https";

export async function isRealEnglishWord(word) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
    word.toLowerCase(),
  )}`;

  const { statusCode, body } = await new Promise((resolve, reject) => {
    const request = httpsGet(url, (response) => {
      let chunks = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        chunks += chunk;
      });
      response.on("end", () => {
        resolve({ statusCode: response.statusCode ?? 0, body: chunks });
      });
    });

    request.on("error", reject);
  });

  if (statusCode === 200) {
    return true;
  }

  if (statusCode === 404) {
    return false;
  }

  throw new Error(`Dictionary API error: ${statusCode} ${body}`);
}
