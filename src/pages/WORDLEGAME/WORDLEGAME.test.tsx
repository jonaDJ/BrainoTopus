import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WORDLEGAME } from "./WORDLEGAME";

const REVEAL_TOTAL_MS = 2300;

type SetupOptions = {
  words: string[];
  validGuesses: string[];
};

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function getUrl(input: RequestInfo | URL) {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

function setupFetch({ words, validGuesses }: SetupOptions) {
  const wordQueue = [...words];
  const validSet = new Set(validGuesses.map((guess) => guess.toUpperCase()));

  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = getUrl(input);

    if (url === "/api/word") {
      const nextWord = wordQueue.shift() ?? words[words.length - 1];
      return jsonResponse({ word: nextWord });
    }

    if (url.startsWith("/api/validate-guess?guess=")) {
      const parsed = new URL(url, "http://localhost");
      const guess = parsed.searchParams.get("guess")?.toUpperCase() ?? "";
      return jsonResponse({ isValid: validSet.has(guess) });
    }

    return Promise.resolve(new Response(null, { status: 404 }));
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function getTile(container: HTMLElement, row: number, col: number) {
  const tiles = container.querySelectorAll(".word-board .word-tile");
  return tiles[row * 5 + col] as HTMLDivElement;
}

function getRowText(container: HTMLElement, row: number) {
  const tiles = Array.from(
    container.querySelectorAll(".word-board .word-tile"),
  ).slice(row * 5, row * 5 + 5);
  return tiles.map((tile) => tile.textContent ?? "").join("");
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
}

function submitGuess(guess: string) {
  const keyboard = screen.getByRole("region", { name: "Keyboard" });
  for (const letter of guess.toUpperCase()) {
    fireEvent.click(within(keyboard).getByRole("button", { name: letter }));
  }
  fireEvent.click(within(keyboard).getByRole("button", { name: "ENTER" }));
}

async function revealGuess() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, REVEAL_TOTAL_MS);
    });
  });
}

async function submitGuessAndCommit(
  container: HTMLElement,
  guess: string,
  rowIndex: number,
) {
  submitGuess(guess);
  await revealGuess();
  await act(async () => {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 300);
    });
  });
  await waitFor(() => expect(getRowText(container, rowIndex)).toBe(guess.toUpperCase()));
}

describe("WORDLEGAME", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it(
    "stays on same row for invalid words like HELLP",
    async () => {
      const fetchMock = setupFetch({
      words: ["OCEAN"],
      validGuesses: ["PLAIN", "TRAIL", "CLOSE", "TILE", "OCEAN"],
    });

      const { container } = render(<WORDLEGAME />);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/word"));
      submitGuess("HELLP");
      await flushMicrotasks();

      expect(screen.getByRole("alert")).toHaveTextContent("Not a real word.");
      expect(getRowText(container, 0)).toBe("HELLP");
      expect(getRowText(container, 1)).toBe("");
    },
    15000,
  );

  it(
    "colors PLAIN against OCEAN, colors keyboard letters by best state, then reaches game over after six wrong guesses",
    async () => {
      const fetchMock = setupFetch({
      words: ["OCEAN"],
      validGuesses: ["PLAIN", "TRAIL", "SHONE", "CLOUD", "MINTY", "DUCKS"],
    });

      const { container } = render(<WORDLEGAME />);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/word"));

      await submitGuessAndCommit(container, "PLAIN", 0);
      await flushMicrotasks();

      expect(getTile(container, 0, 0)).toHaveClass("word-tile--absent");
      expect(getTile(container, 0, 1)).toHaveClass("word-tile--absent");
      expect(getTile(container, 0, 2)).toHaveClass("word-tile--present");
      expect(getTile(container, 0, 3)).toHaveClass("word-tile--absent");
      expect(getTile(container, 0, 4)).toHaveClass("word-tile--correct");

      const keyboard = screen.getByRole("region", { name: "Keyboard" });
      await waitFor(() =>
        expect(within(keyboard).getByRole("button", { name: "P" })).toHaveClass("key-button--absent"),
      );
      await waitFor(() =>
        expect(within(keyboard).getByRole("button", { name: "L" })).toHaveClass("key-button--absent"),
      );
      await waitFor(() =>
        expect(within(keyboard).getByRole("button", { name: "A" })).toHaveClass("key-button--present"),
      );
      await waitFor(() =>
        expect(within(keyboard).getByRole("button", { name: "I" })).toHaveClass("key-button--absent"),
      );
      await waitFor(() =>
        expect(within(keyboard).getByRole("button", { name: "N" })).toHaveClass("key-button--correct"),
      );

      await submitGuessAndCommit(container, "TRAIL", 1);
      await flushMicrotasks();
      await submitGuessAndCommit(container, "SHONE", 2);
      await flushMicrotasks();
      await submitGuessAndCommit(container, "CLOUD", 3);
      await flushMicrotasks();
      await submitGuessAndCommit(container, "MINTY", 4);
      await flushMicrotasks();
      await submitGuessAndCommit(container, "DUCKS", 5);
      await flushMicrotasks();

      expect(screen.queryByRole("dialog", { name: "Game complete" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Play Again" })).toBeInTheDocument();
      expect(screen.getAllByText("The word was OCEAN.").length).toBeGreaterThan(0);
      expect(screen.getByRole("status")).toHaveTextContent("The word was OCEAN.");
    },
    45000,
  );

  it(
    "wins on correct word and supports play again with a different word without modal controls",
    async () => {
      const fetchMock = setupFetch({
      words: ["OCEAN", "CLOSE"],
      validGuesses: ["OCEAN", "CLOSE"],
    });

      const { container } = render(<WORDLEGAME />);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/word"));

      await submitGuessAndCommit(container, "OCEAN", 0);
      await flushMicrotasks();
      expect(screen.queryByRole("dialog", { name: "Game complete" })).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("You solved it.");

      fireEvent.click(screen.getByRole("button", { name: "Play Again" }));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
      expect(getRowText(container, 0)).toBe("");

      await submitGuessAndCommit(container, "CLOSE", 0);
      expect(screen.getByRole("status")).toHaveTextContent("You solved it.");
      expect(getRowText(container, 0)).toBe("CLOSE");
      expect(getTile(container, 0, 0)).toHaveClass("word-tile--correct");
      expect(getTile(container, 0, 1)).toHaveClass("word-tile--correct");
      expect(getTile(container, 0, 2)).toHaveClass("word-tile--correct");
      expect(getTile(container, 0, 3)).toHaveClass("word-tile--correct");
      expect(getTile(container, 0, 4)).toHaveClass("word-tile--correct");

      expect(fetchMock).toHaveBeenCalledTimes(4);
    },
    20000,
  );
});
