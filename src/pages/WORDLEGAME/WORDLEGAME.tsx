import { useCallback, useEffect, useRef, useState } from "react";
import "./WORDLEGAME.css";

const BOARD_ROWS = 6;
const BOARD_COLS = 5;
const REVEAL_STEP_MS = 450;
type TileState = "idle" | "correct" | "present" | "absent";
type KeyState = Exclude<TileState, "idle">;
type EntryPulse = { row: number; col: number; token: number } | null;
const KEY_STATE_PRIORITY: Record<KeyState, number> = {
  absent: 1,
  present: 2,
  correct: 3,
};

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACK"],
];

export function WORDLEGAME() {
  const targetWordRef = useRef("");
  const shakeTimeoutRef = useRef<number | null>(null);
  const [board, setBoard] = useState<string[][]>(() =>
    Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill("")),
  );
  const [tileStates, setTileStates] = useState<TileState[][]>(() =>
    Array.from({ length: BOARD_ROWS }, () =>
      Array<TileState>(BOARD_COLS).fill("idle"),
    ),
  );
  const [currentRow, setCurrentRow] = useState(0);
  const [currentCol, setCurrentCol] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [topAlert, setTopAlert] = useState("");
  const [isCheckingGuess, setIsCheckingGuess] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [keyStates, setKeyStates] = useState<Record<string, KeyState>>({});
  const [shakeRowIndex, setShakeRowIndex] = useState<number | null>(null);
  const [entryPulse, setEntryPulse] = useState<EntryPulse>(null);

  const evaluateGuess = useCallback((guess: string, target: string) => {
    const result: TileState[] = Array(BOARD_COLS).fill("absent");
    const targetChars = target.split("");
    const used = Array(BOARD_COLS).fill(false);

    for (let i = 0; i < BOARD_COLS; i += 1) {
      if (guess[i] === targetChars[i]) {
        result[i] = "correct";
        used[i] = true;
      }
    }

    for (let i = 0; i < BOARD_COLS; i += 1) {
      if (result[i] === "correct") {
        continue;
      }

      const letter = guess[i];
      let foundIndex = -1;

      for (let j = 0; j < BOARD_COLS; j += 1) {
        if (!used[j] && targetChars[j] === letter) {
          foundIndex = j;
          break;
        }
      }

      if (foundIndex >= 0) {
        used[foundIndex] = true;
        result[i] = "present";
      }
    }

    return result;
  }, []);

  const wait = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
      }),
    [],
  );

  const loadTargetWord = useCallback(async () => {
    const response = await fetch("/api/word");
    if (!response.ok) {
      throw new Error("Could not fetch target word.");
    }

    const data = (await response.json()) as { word?: string };
    if (!data.word) {
      throw new Error("Invalid target word response.");
    }

    targetWordRef.current = String(data.word).toUpperCase();
  }, []);

  const resetGame = useCallback(async () => {
    setBoard(Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill("")));
    setTileStates(
      Array.from({ length: BOARD_ROWS }, () => Array<TileState>(BOARD_COLS).fill("idle")),
    );
    setCurrentRow(0);
    setCurrentCol(0);
    setFeedback("");
    setTopAlert("");
    setIsGameOver(false);
    setKeyStates({});
    setShakeRowIndex(null);
    setEntryPulse(null);

    try {
      await loadTargetWord();
    } catch {
      setFeedback("Could not start a new game.");
    }
  }, [loadTargetWord]);

  const triggerRowShake = useCallback((rowIndex: number) => {
    setShakeRowIndex(null);
    window.requestAnimationFrame(() => {
      setShakeRowIndex(rowIndex);
    });

    if (shakeTimeoutRef.current !== null) {
      window.clearTimeout(shakeTimeoutRef.current);
    }

    shakeTimeoutRef.current = window.setTimeout(() => {
      setShakeRowIndex((current) => (current === rowIndex ? null : current));
      shakeTimeoutRef.current = null;
    }, 420);
  }, []);

  const applyKey = useCallback(
    async (key: string) => {
      if (isCheckingGuess || isGameOver) {
        return;
      }

      if (key === "BACK") {
        if (currentCol === 0) {
          return;
        }

        setFeedback("");
        setTopAlert("");
        setEntryPulse(null);
        const nextCol = currentCol - 1;
        setBoard((prevBoard) =>
          prevBoard.map((row, rowIndex) =>
            rowIndex === currentRow
              ? row.map((cell, colIndex) => (colIndex === nextCol ? "" : cell))
              : row,
          ),
        );
        setCurrentCol(nextCol);
        return;
      }

      if (key === "ENTER") {
        if (currentCol !== BOARD_COLS) {
          setFeedback("");
          setTopAlert("Not enough letters.");
          setEntryPulse(null);
          triggerRowShake(currentRow);
          return;
        }

        const guess = board[currentRow].join("");
        if (targetWordRef.current.length !== BOARD_COLS) {
          setFeedback("Game is still loading.");
          setTopAlert("");
          return;
        }
        setIsCheckingGuess(true);
        setFeedback("");
        setTopAlert("");
        setEntryPulse(null);

        try {
          const response = await fetch(
            `/api/validate-guess?guess=${encodeURIComponent(guess)}`,
          );

          if (!response.ok) {
            setFeedback("Could not validate word.");
            return;
          }

          const data = (await response.json()) as { isValid?: boolean };
          if (!data.isValid) {
            setTopAlert("Not a real word.");
            setEntryPulse(null);
            triggerRowShake(currentRow);
            return;
          }

          const rowResult = evaluateGuess(guess, targetWordRef.current);
          for (let col = 0; col < BOARD_COLS; col += 1) {
            setTileStates((prevStates) =>
              prevStates.map((rowState, rowIndex) =>
                rowIndex === currentRow
                  ? rowState.map((cellState, colIndex) =>
                      colIndex === col ? rowResult[colIndex] : cellState,
                    )
                  : rowState,
              ),
            );
            await wait(REVEAL_STEP_MS);
          }

          setKeyStates((prevStates) => {
            const nextStates = { ...prevStates };
            for (let i = 0; i < BOARD_COLS; i += 1) {
              const letter = guess[i];
              const nextState = rowResult[i] as KeyState;
              const currentState = nextStates[letter];
              if (
                !currentState ||
                KEY_STATE_PRIORITY[nextState] > KEY_STATE_PRIORITY[currentState]
              ) {
                nextStates[letter] = nextState;
              }
            }
            return nextStates;
          });

          const isWinningRow = rowResult.every((state) => state === "correct");
          if (isWinningRow) {
            setIsGameOver(true);
            setFeedback("You solved it.");
            return;
          }

          if (currentRow < BOARD_ROWS - 1) {
            setCurrentRow((prevRow) => prevRow + 1);
            setCurrentCol(0);
          } else {
            setIsGameOver(true);
            setFeedback(`The word was ${targetWordRef.current}.`);
          }
        } catch {
          setFeedback("Could not validate word.");
        } finally {
          setIsCheckingGuess(false);
        }

        return;
      }

      if (!/^[A-Z]$/.test(key) || currentCol >= BOARD_COLS) {
        return;
      }

      setFeedback("");
      setTopAlert("");
      const entryCol = currentCol;
      setBoard((prevBoard) =>
        prevBoard.map((row, rowIndex) =>
          rowIndex === currentRow
            ? row.map((cell, colIndex) => (colIndex === currentCol ? key : cell))
            : row,
        ),
      );
      setEntryPulse((prev) => ({
        row: currentRow,
        col: entryCol,
        token: (prev?.token ?? 0) + 1,
      }));
      setCurrentCol((prevCol) => prevCol + 1);
    },
    [board, currentCol, currentRow, evaluateGuess, isCheckingGuess, isGameOver, triggerRowShake, wait],
  );

  useEffect(() => {
    let cancelled = false;

    const initializeGame = async () => {
      try {
        await loadTargetWord();
      } catch {
        if (!cancelled) {
          setFeedback("Could not load game word.");
        }
      }
    };

    void initializeGame();
    return () => {
      cancelled = true;
    };
  }, [loadTargetWord]);

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current !== null) {
        window.clearTimeout(shakeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!entryPulse) {
      return;
    }

    const timer = window.setTimeout(() => {
      setEntryPulse(null);
    }, 220);

    return () => {
      window.clearTimeout(timer);
    };
  }, [entryPulse]);

  useEffect(() => {
    if (!topAlert) {
      return;
    }

    const timer = window.setTimeout(() => {
      setTopAlert("");
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [topAlert]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      let mappedKey = "";

      if (event.key === "Enter") {
        mappedKey = "ENTER";
      } else if (event.key === "Backspace" || event.key === "Delete") {
        mappedKey = "BACK";
      } else if (/^[a-zA-Z]$/.test(event.key)) {
        mappedKey = event.key.toUpperCase();
      }

      if (!mappedKey) {
        return;
      }

      event.preventDefault();
      void applyKey(mappedKey);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applyKey]);

  return (
    <main className="wordlegame">
      <div className="word-board-wrap">
        {topAlert ? (
          <p aria-live="assertive" className="word-alert-top" role="alert">
            {topAlert}
          </p>
        ) : null}

        <section aria-label="Word board" className="word-board">
          {board.map((row, rowIndex) =>
            row.map((letter, colIndex) => {
              const tileState = tileStates[rowIndex][colIndex];
              const isEntryTile =
                Boolean(letter) &&
                tileState === "idle" &&
                entryPulse?.row === rowIndex &&
                entryPulse?.col === colIndex;
              const isShakeTile = rowIndex === shakeRowIndex;
              const isRevealedTile = tileState !== "idle";
              const stateClass =
                tileState === "correct"
                  ? "word-tile--correct"
                  : tileState === "present"
                    ? "word-tile--present"
                    : tileState === "absent"
                      ? "word-tile--absent"
                    : "";

              return (
              <div
                aria-hidden
                className={
                  letter
                    ? `word-tile word-tile--filled ${isEntryTile ? "word-tile--entry" : ""} ${isShakeTile ? "word-tile--row-shake" : ""} ${isRevealedTile ? "word-tile--reveal" : ""} ${stateClass} rain-proof`
                    : `word-tile ${isShakeTile ? "word-tile--row-shake" : ""} rain-proof`
                }
                key={`${rowIndex}-${colIndex}`}
              >
                {letter}
              </div>
              );
            }),
          )}
        </section>
      </div>

      <section aria-label="Keyboard" className="word-keyboard">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div className="key-row" key={rowIndex}>
            {row.map((key) => {
              const keyState = keyStates[key];
              const keyStateClass =
                keyState === "correct"
                  ? "key-button--correct"
                  : keyState === "present"
                    ? "key-button--present"
                    : keyState === "absent"
                      ? "key-button--absent"
                      : "";

              return (
                <button
                  className={
                    `${key === "ENTER" || key === "BACK" ? "key-button key-button--wide" : "key-button"} ${keyStateClass}`
                  }
                  key={key}
                  disabled={isGameOver}
                  onClick={() => void applyKey(key)}
                  type="button"
                >
                  {key === "BACK" ? "DEL" : key}
                </button>
              );
            })}
          </div>
        ))}
      </section>

      <p className="word-feedback" role="status">
        {feedback}
      </p>

      {isGameOver ? (
        <div className="word-postgame-actions">
          <button
            className="word-action-btn word-action-btn--primary"
            onClick={() => void resetGame()}
            type="button"
          >
            Play Again
          </button>
        </div>
      ) : null}
    </main>
  );
}
