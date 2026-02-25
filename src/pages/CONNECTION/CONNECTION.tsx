import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import "./CONNECTION.css";

type GroupId = "fruits" | "animals" | "colors" | "instruments";

type Tile = {
  id: string;
  label: string;
  groupId: GroupId;
};

const DUMMY_TILES: Tile[] = [
  { id: "apple", label: "APPLE", groupId: "fruits" },
  { id: "banana", label: "BANANA", groupId: "fruits" },
  { id: "grape", label: "GRAPE", groupId: "fruits" },
  { id: "mango", label: "MANGO", groupId: "fruits" },
  { id: "dog", label: "DOG", groupId: "animals" },
  { id: "cat", label: "CAT", groupId: "animals" },
  { id: "lion", label: "LION", groupId: "animals" },
  { id: "wolf", label: "WOLF", groupId: "animals" },
  { id: "red", label: "RED", groupId: "colors" },
  { id: "blue", label: "BLUE", groupId: "colors" },
  { id: "green", label: "GREEN", groupId: "colors" },
  { id: "black", label: "BLACK", groupId: "colors" },
  { id: "piano", label: "PIANO", groupId: "instruments" },
  { id: "drum", label: "DRUM", groupId: "instruments" },
  { id: "flute", label: "FLUTE", groupId: "instruments" },
  { id: "violin", label: "VIOLIN", groupId: "instruments" },
];

type SolvedGroup = {
  groupId: GroupId;
  tiles: Tile[];
  noPop?: boolean;
};

const GROUP_ORDER: GroupId[] = ["fruits", "animals", "colors", "instruments"];

const GROUP_META: Record<GroupId, { title: string }> = {
  fruits: { title: "FRUITS" },
  animals: { title: "ANIMALS" },
  colors: { title: "COLORS" },
  instruments: { title: "INSTRUMENTS" },
};

function shuffleTiles(items: Tile[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function waitForFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

export function CONNECTION() {
  const gridRef = useRef<HTMLElement | null>(null);
  const preReflowRectsRef = useRef<Record<string, DOMRect>>({});
  const shouldAnimateReflowRef = useRef(false);
  const [tiles, setTiles] = useState<Tile[]>(() => shuffleTiles(DUMMY_TILES));
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [solvedGroups, setSolvedGroups] = useState<SolvedGroup[]>([]);
  const [waveDelayByTile, setWaveDelayByTile] = useState<
    Record<string, number>
  >({});
  const [gatherByTile, setGatherByTile] = useState<
    Record<string, { x: number; y: number; delay: number }>
  >({});
  const [shakeTileIds, setShakeTileIds] = useState<string[]>([]);
  const [mistakesRemaining, setMistakesRemaining] = useState(4);
  const [isShuffling, setIsShuffling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoRevealing, setIsAutoRevealing] = useState(false);
  const isGameOver = mistakesRemaining === 0;
  const isGameWon = !isGameOver && solvedGroups.length === GROUP_ORDER.length;
  const isGameComplete = isGameOver || isGameWon;

  useEffect(() => {
    if (!shouldAnimateReflowRef.current) {
      return;
    }

    const gridNode = gridRef.current;
    if (!gridNode) {
      shouldAnimateReflowRef.current = false;
      preReflowRectsRef.current = {};
      return;
    }

    const previousRects = preReflowRectsRef.current;

    tiles.forEach((tile) => {
      const node = gridNode.querySelector<HTMLElement>(
        `[data-tile-id="${tile.id}"]`,
      );
      const previousRect = previousRects[tile.id];
      if (!node || !previousRect) {
        return;
      }

      const nextRect = node.getBoundingClientRect();
      const dx = previousRect.left - nextRect.left;
      const dy = previousRect.top - nextRect.top;

      if (dx === 0 && dy === 0) {
        return;
      }

      node.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: "translate(0, 0)" },
        ],
        {
          duration: 420,
          easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
        },
      );
    });

    shouldAnimateReflowRef.current = false;
    preReflowRectsRef.current = {};
  }, [tiles]);

  const handleShuffle = () => {
    if (isShuffling || isSubmitting || isGameComplete) {
      return;
    }

    setIsShuffling(true);
    window.setTimeout(() => {
      setTiles((current) => shuffleTiles(current));
    }, 140);
    window.setTimeout(() => {
      setIsShuffling(false);
    }, 420);
  };

  const handleTileClick = (tileId: string) => {
    if (isSubmitting || isShuffling || isGameComplete) {
      return;
    }

    setSelectedTiles((current) => {
      if (current.includes(tileId)) {
        return current.filter((item) => item !== tileId);
      }

      if (current.length >= 4) {
        return current;
      }

      return [...current, tileId];
    });
  };

  const handleDeselectAll = () => {
    if (isSubmitting || isGameComplete) {
      return;
    }
    setSelectedTiles([]);
  };

  const handleRetry = () => {
    setTiles(shuffleTiles(DUMMY_TILES));
    setSelectedTiles([]);
    setSolvedGroups([]);
    setWaveDelayByTile({});
    setGatherByTile({});
    setShakeTileIds([]);
    setMistakesRemaining(4);
    setIsShuffling(false);
    setIsSubmitting(false);
    setIsAutoRevealing(false);
    shouldAnimateReflowRef.current = false;
    preReflowRectsRef.current = {};
  };

  const animateSolveSelection = async (
    currentTiles: Tile[],
    selectedIds: string[],
    options?: { noPop?: boolean; noWave?: boolean },
  ): Promise<Tile[]> => {
    await waitForFrame();

    const selectedSet = new Set(selectedIds);
    const selectedWithIndex = currentTiles
      .map((tile, index) => ({ tile, index }))
      .filter(({ tile }) => selectedSet.has(tile.id));

    const rowIndexes = Array.from(
      new Set(selectedWithIndex.map(({ index }) => Math.floor(index / 4))),
    ).sort((a, b) => a - b);

    const rowDelay = new Map<number, number>();
    rowIndexes.forEach((rowIndex, i) => {
      rowDelay.set(rowIndex, i * 140);
    });

    const nextWaveDelayByTile: Record<string, number> = {};
    if (!options?.noWave) {
      for (const { tile, index } of selectedWithIndex) {
        const row = Math.floor(index / 4);
        nextWaveDelayByTile[tile.id] = rowDelay.get(row) ?? 0;
      }
      setWaveDelayByTile(nextWaveDelayByTile);
    }

    const maxDelay = Math.max(...Object.values(nextWaveDelayByTile), 0);
    await wait(options?.noWave ? 80 : maxDelay + 420);

    const selectedTileObjects = selectedWithIndex.map(({ tile }) => tile);
    const groupId = selectedTileObjects[0].groupId;
    const selectedByBoardOrder = [...selectedWithIndex].sort(
      (a, b) => a.index - b.index,
    );
    const selectedIndexSet = new Set(
      selectedByBoardOrder.map(({ index }) => index),
    );
    const topRowIndexes = [0, 1, 2, 3];
    const topVacantIndexes = topRowIndexes.filter(
      (index) => !selectedIndexSet.has(index),
    );
    const selectedToMoveUp = selectedByBoardOrder.filter(
      ({ index }) => index >= 4,
    );
    const nextGather: Record<string, { x: number; y: number; delay: number }> =
      {};
    const gridNode = gridRef.current;

    if (gridNode) {
      selectedToMoveUp.forEach(({ tile: movingTile }, pairIndex) => {
          const targetTopIndex = topVacantIndexes[pairIndex];
          if (targetTopIndex === undefined) {
            return;
          }

          const fromNode = gridNode.querySelector<HTMLElement>(
            `[data-tile-id="${movingTile.id}"]`,
          );
          const topNode = gridNode.querySelector<HTMLElement>(
            `[data-tile-id="${currentTiles[targetTopIndex].id}"]`,
          );

          if (!fromNode || !topNode) {
            return;
          }

          const fromRect = fromNode.getBoundingClientRect();
          const topRect = topNode.getBoundingClientRect();
          const delay = nextWaveDelayByTile[movingTile.id] ?? 0;

          nextGather[movingTile.id] = {
            x: topRect.left - fromRect.left,
            y: topRect.top - fromRect.top,
            delay,
          };
        },
      );
    }

    setGatherByTile(nextGather);
    await wait(maxDelay + 620);

    if (gridNode) {
      const nextRects: Record<string, DOMRect> = {};
      currentTiles.forEach((tile) => {
        const node = gridNode.querySelector<HTMLElement>(
          `[data-tile-id="${tile.id}"]`,
        );
        if (!node || selectedSet.has(tile.id)) {
          return;
        }
        nextRects[tile.id] = node.getBoundingClientRect();
      });
      preReflowRectsRef.current = nextRects;
      shouldAnimateReflowRef.current = true;
    }

    const remainingTiles = currentTiles.filter((tile) => !selectedSet.has(tile.id));
    setSolvedGroups((current) => [
      ...current,
      { groupId, tiles: selectedTileObjects, noPop: Boolean(options?.noPop) },
    ]);
    setTiles(remainingTiles);
    setGatherByTile({});
    setWaveDelayByTile({});
    return remainingTiles;
  };

  const revealRemainingGroupsAfterGameOver = async (currentTiles: Tile[]) => {
    setIsAutoRevealing(true);
    let workingTiles = [...currentTiles];

    for (const groupId of GROUP_ORDER) {
      const ids = workingTiles
        .filter((tile) => tile.groupId === groupId)
        .map((tile) => tile.id);

      if (ids.length !== 4) {
        continue;
      }

      setSelectedTiles(ids);
      await waitForFrame();
      workingTiles = await animateSolveSelection(workingTiles, ids, {
        noPop: true,
        noWave: true,
      });
      await wait(180);
    }

    setSelectedTiles([]);
    setIsAutoRevealing(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (selectedTiles.length !== 4 || isSubmitting || isGameComplete) {
      return;
    }

    setIsSubmitting(true);

    const selectedSet = new Set(selectedTiles);
    const selectedTileObjects = tiles.filter((tile) =>
      selectedSet.has(tile.id),
    );
    const isCorrect =
      new Set(selectedTileObjects.map((tile) => tile.groupId)).size === 1;

    if (isCorrect) {
      await animateSolveSelection(tiles, selectedTiles, { noWave: true });
      setSelectedTiles([]);
    } else {
      const nextMistakesRemaining = Math.max(0, mistakesRemaining - 1);
      setMistakesRemaining(nextMistakesRemaining);

      if (nextMistakesRemaining === 0) {
        await revealRemainingGroupsAfterGameOver(tiles);
      } else {
        setShakeTileIds([]);
        window.requestAnimationFrame(() => {
          setShakeTileIds(selectedTiles);
        });
        window.setTimeout(() => {
          setShakeTileIds([]);
        }, 420);
      }
    }

    setWaveDelayByTile({});
    setIsSubmitting(false);
  };

  return (
    <main className="connection-page">
      <section className="connection-panel">
        <p className="connection-instruction">Create four groups of four!</p>

        {solvedGroups.length > 0 ? (
          <section aria-label="Solved groups" className="connection-solved">
            {solvedGroups.map((group, groupIndex) => (
              <div
                className={`connection-solved-row connection-solved-row--${group.groupId} ${group.noPop ? "connection-solved-row--no-pop" : ""}`}
                key={`${group.groupId}-${groupIndex}`}
              >
                <p className="connection-solved-title">
                  {GROUP_META[group.groupId].title}
                </p>
                <p className="connection-solved-words">
                  {group.tiles.map((tile) => tile.label).join(", ")}
                </p>
              </div>
            ))}
          </section>
        ) : null}

        <section
          aria-label="Connections board"
          className="connection-grid"
          ref={gridRef}
        >
          {tiles.map((tile) => {
            const isSelected = selectedTiles.includes(tile.id);
            const showSelectedState = isSelected && !isAutoRevealing;
            const isLocked = selectedTiles.length >= 4 && !isSelected;
            const waveDelay = waveDelayByTile[tile.id];
            const gather = gatherByTile[tile.id];

            return (
              <button
                aria-pressed={isSelected}
                className={`connection-tile rain-proof ${showSelectedState ? "connection-tile--selected" : ""} ${waveDelay !== undefined ? "connection-tile--wave" : ""} ${shakeTileIds.includes(tile.id) ? "connection-tile--shake" : ""} ${gather ? "connection-tile--gather" : ""}`}
                data-tile-id={tile.id}
                disabled={isLocked || isSubmitting || isGameComplete}
                key={tile.id}
                onClick={() => handleTileClick(tile.id)}
                style={
                  {
                    "--wave-delay": `${waveDelay ?? 0}ms`,
                    "--gather-delay": `${gather?.delay ?? 0}ms`,
                    "--gather-x": `${gather?.x ?? 0}px`,
                    "--gather-y": `${gather?.y ?? 0}px`,
                  } as CSSProperties
                }
                type="button"
              >
                {tile.label}
              </button>
            );
          })}
        </section>

        <div className="mistakes-wrap" role="status">
          <p className="mistakes-label">Mistakes Remaining:</p>
          <div aria-hidden className="mistakes-dots">
            {Array.from({ length: 4 }).map((_, index) => (
              <span
                className={`mistake-dot ${index < mistakesRemaining ? "" : "mistake-dot--used"}`}
                key={index}
              />
            ))}
          </div>
        </div>
        {isGameComplete ? (
          <div
            className={`connection-finish ${isGameWon ? "connection-finish--won" : "connection-finish--lost"}`}
          >
            <h2 className="connection-finish-title">
              {isGameWon ? "All 4 groups solved" : "Round complete"}
            </h2>
            <p aria-live="polite" className="connection-finish-text" role="status">
              {isGameWon
                ? "Great solve. Every group was correct."
                : "No mistakes left. Review the solved groups above."}
            </p>
            <button
              className="connection-action-btn connection-finish-btn"
              aria-label="Start a new puzzle"
              onClick={handleRetry}
              type="button"
            >
              Play Another Round
            </button>
          </div>
        ) : null}

        {!isGameComplete ? (
          <div className="connection-actions">
            <button
              className="connection-action-btn"
              disabled={isShuffling || isSubmitting || isGameComplete}
              onClick={handleShuffle}
              type="button"
            >
              Shuffle
            </button>
            <button
              className="connection-action-btn"
              disabled={selectedTiles.length === 0 || isSubmitting || isGameComplete}
              onClick={handleDeselectAll}
              type="button"
            >
              Deselect All
            </button>
            <form className="connection-submit-form" onSubmit={handleSubmit}>
              <button
                className="connection-action-btn connection-action-btn--submit"
                disabled={
                  selectedTiles.length !== 4 || isSubmitting || isGameComplete
                }
                type="submit"
              >
                Submit
              </button>
            </form>
          </div>
        ) : null}
      </section>
    </main>
  );
}
