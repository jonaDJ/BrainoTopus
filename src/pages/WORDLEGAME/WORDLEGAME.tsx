import { useCallback, useEffect, useRef, useState } from "react";
import "./WORDLEGAME.css";

const BOARD_ROWS = 6;
const BOARD_COLS = 5;
type TileState = "idle" | "correct" | "present" | "absent";

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACK"],
];

export function WORDLEGAME() {
  const targetWordRef = useRef("");
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
  const [isCheckingGuess, setIsCheckingGuess] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [didWin, setDidWin] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [usedKeys, setUsedKeys] = useState<Set<string>>(() => new Set());

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
    setIsGameOver(false);
    setDidWin(false);
    setShowEndModal(false);
    setUsedKeys(new Set());

    try {
      await loadTargetWord();
    } catch {
      setFeedback("Could not start a new game.");
    }
  }, [loadTargetWord]);

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
          setFeedback("Not enough letters.");
          return;
        }

        const guess = board[currentRow].join("");
        if (targetWordRef.current.length !== BOARD_COLS) {
          setFeedback("Game is still loading.");
          return;
        }
        setIsCheckingGuess(true);
        setFeedback("");

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
            setFeedback("Not a real word.");
            return;
          }

          const rowResult = evaluateGuess(guess, targetWordRef.current);
          setTileStates((prevStates) =>
            prevStates.map((rowState, rowIndex) =>
              rowIndex === currentRow ? rowResult : rowState,
            ),
          );
          setUsedKeys((prevKeys) => {
            const nextKeys = new Set(prevKeys);
            for (const letter of guess) {
              nextKeys.add(letter);
            }
            return nextKeys;
          });

          const isWinningRow = rowResult.every((state) => state === "correct");
          if (isWinningRow) {
            setDidWin(true);
            setIsGameOver(true);
            setShowEndModal(true);
            setFeedback("You solved it.");
            return;
          }

          if (currentRow < BOARD_ROWS - 1) {
            setCurrentRow((prevRow) => prevRow + 1);
            setCurrentCol(0);
          } else {
            setDidWin(false);
            setIsGameOver(true);
            setShowEndModal(true);
            setFeedback("No more tries.");
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
      setBoard((prevBoard) =>
        prevBoard.map((row, rowIndex) =>
          rowIndex === currentRow
            ? row.map((cell, colIndex) => (colIndex === currentCol ? key : cell))
            : row,
        ),
      );
      setCurrentCol((prevCol) => prevCol + 1);
    },
    [board, currentCol, currentRow, evaluateGuess, isCheckingGuess, isGameOver],
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
      <section aria-label="Word board" className="word-board">
        {board.map((row, rowIndex) =>
          row.map((letter, colIndex) => {
            const tileState = tileStates[rowIndex][colIndex];
            const stateClass =
              tileState === "correct"
                ? "word-tile--correct"
                : tileState === "present"
                  ? "word-tile--present"
                  : "";

            return (
            <div
              aria-hidden
              className={
                letter
                  ? `word-tile word-tile--filled ${stateClass} rain-proof`
                  : "word-tile rain-proof"
              }
              key={`${rowIndex}-${colIndex}`}
            >
              {letter}
            </div>
            );
          }),
        )}
      </section>

      <section aria-label="Keyboard" className="word-keyboard">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div className="key-row" key={rowIndex}>
            {row.map((key) => (
              <button
                className={
                  `${key === "ENTER" || key === "BACK" ? "key-button key-button--wide" : "key-button"} ${
                    usedKeys.has(key) ? "key-button--used" : ""
                  }`
                }
                key={key}
                disabled={isGameOver}
                onClick={() => void applyKey(key)}
                type="button"
              >
                {key === "BACK" ? "DEL" : key}
              </button>
            ))}
          </div>
        ))}
      </section>

      <p className="word-feedback" role="status">
        {isCheckingGuess ? "Checking word..." : feedback}
      </p>

      {showEndModal ? (
        <div className="word-modal-backdrop" role="presentation">
          <section
            aria-label="Game complete"
            aria-modal="true"
            className="word-modal"
            role="dialog"
          >
            <h2>{didWin ? "You Win" : "Game Over"}</h2>
            <p>
              {didWin
                ? "Great run. Want to play again?"
                : "No more guesses left. Play again?"}
            </p>
            <div className="word-modal-actions">
              <button className="word-modal-btn word-modal-btn--primary" onClick={() => void resetGame()} type="button">
                Play Again
              </button>
              <button
                className="word-modal-btn word-modal-btn--ghost"
                onClick={() => setShowEndModal(false)}
                type="button"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
