import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONNECTION } from "./CONNECTION";

const GROUPS: Array<{ title: string; labels: string[] }> = [
  { title: "FRUITS", labels: ["APPLE", "BANANA", "GRAPE", "MANGO"] },
  { title: "ANIMALS", labels: ["DOG", "CAT", "LION", "WOLF"] },
  { title: "COLORS", labels: ["RED", "BLUE", "GREEN", "BLACK"] },
  { title: "INSTRUMENTS", labels: ["PIANO", "DRUM", "FLUTE", "VIOLIN"] },
];

const CONNECTIONS_FIXTURE = [
  {
    id: 99999,
    date: "2099-01-01",
    answers: [
      {
        level: 0,
        group: "FRUITS",
        members: ["APPLE", "BANANA", "GRAPE", "MANGO"],
      },
      {
        level: 1,
        group: "ANIMALS",
        members: ["DOG", "CAT", "LION", "WOLF"],
      },
      {
        level: 2,
        group: "COLORS",
        members: ["RED", "BLUE", "GREEN", "BLACK"],
      },
      {
        level: 3,
        group: "INSTRUMENTS",
        members: ["PIANO", "DRUM", "FLUTE", "VIOLIN"],
      },
    ],
  },
];

function selectTiles(labels: string[]) {
  for (const label of labels) {
    fireEvent.click(screen.getByRole("button", { name: label }));
  }
}

function submitSelection() {
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
}

function getUsedMistakeDots(container: HTMLElement) {
  return container.querySelectorAll(".mistake-dot--used").length;
}

describe("CONNECTION", () => {
  beforeEach(() => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => CONNECTIONS_FIXTURE,
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it(
    "shows solved end state when all groups are found",
    async () => {
      const { container } = render(<CONNECTION />);
      await screen.findByRole("button", { name: "APPLE" });

      for (const group of GROUPS) {
        selectTiles(group.labels);
        submitSelection();
        await waitFor(() => expect(screen.getByText(group.title)).toBeInTheDocument(), {
          timeout: 5000,
        });
      }

      await waitFor(
        () => {
          expect(
            screen.getByRole("heading", { name: "All 4 groups solved" }),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      expect(
        screen.getByText("Great solve. Every group was correct."),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Start a new puzzle" }),
      ).toBeInTheDocument();
      expect(container.querySelectorAll(".connection-solved-row")).toHaveLength(4);
    },
    30000,
  );

  it(
    "shows unsolved end state and reveals groups after mistakes run out",
    async () => {
      const { container } = render(<CONNECTION />);
      await screen.findByRole("button", { name: "APPLE" });

      const mixedGuess = ["APPLE", "DOG", "RED", "PIANO"];
      selectTiles(mixedGuess);

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        submitSelection();
        await waitFor(
          () => expect(getUsedMistakeDots(container)).toBe(attempt),
          { timeout: 2000 },
        );
      }

      submitSelection();

      await waitFor(
        () => {
          expect(
            screen.getByRole("heading", { name: "Round complete" }),
          ).toBeInTheDocument();
        },
        { timeout: 10000 },
      );

      expect(
        screen.getByText("No mistakes left. Review the solved groups above."),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Start a new puzzle" }),
      ).toBeInTheDocument();

      await waitFor(
        () => expect(container.querySelectorAll(".connection-solved-row")).toHaveLength(4),
        { timeout: 10000 },
      );
    },
    30000,
  );
});
