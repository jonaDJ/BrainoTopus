import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import "./CONNECTION.css";

type GroupId = string;

type Tile = {
  id: string;
  label: string;
  groupId: GroupId;
};

type ApiAnswer = {
  level: number;
  group: string;
  members: string[];
};

type ApiPuzzle = {
  id: number;
  date: string;
  answers: ApiAnswer[];
};

const CONNECTIONS_SOURCE_URL =
  "https://raw.githubusercontent.com/Eyefyre/NYT-Connections-Answers/main/connections.json";
const LOADING_TILE_COUNT = 16;

type SolvedGroup = {
  groupId: GroupId;
  tiles: Tile[];
  noPop?: boolean;
};

function chooseRandomPuzzleById(puzzles: ApiPuzzle[], excludeId?: number | null) {
  if (puzzles.length === 0) {
    throw new Error("Connections API returned no puzzles.");
  }

  const ids = puzzles.map((puzzle) => puzzle.id);
  const minId = Math.min(...ids);
  const maxId = Math.max(...ids);
  const availableIds = new Set(ids);

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const randomId = Math.floor(Math.random() * (maxId - minId + 1)) + minId;
    if (!availableIds.has(randomId)) {
      continue;
    }
    if (excludeId !== undefined && excludeId !== null && randomId === excludeId) {
      continue;
    }
    const selected = puzzles.find((puzzle) => puzzle.id === randomId);
    if (selected) {
      return selected;
    }
  }

  const filtered =
    excludeId === undefined || excludeId === null
      ? puzzles
      : puzzles.filter((puzzle) => puzzle.id !== excludeId);
  const pool = filtered.length > 0 ? filtered : puzzles;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildTilesFromPuzzle(puzzle: ApiPuzzle) {
  const orderedAnswers = [...puzzle.answers].sort((a, b) => {
    if (a.level === b.level) {
      return 0;
    }
    if (a.level === -1) {
      return 1;
    }
    if (b.level === -1) {
      return -1;
    }
    return a.level - b.level;
  });

  const groupOrder: GroupId[] = [];
  const groupMeta: Record<GroupId, { title: string }> = {};
  const tiles: Tile[] = [];

  orderedAnswers.forEach((answer, groupIndex) => {
    const groupId = `group-${groupIndex}-${answer.level}`;
    groupOrder.push(groupId);
    groupMeta[groupId] = { title: answer.group };

    answer.members.forEach((member, memberIndex) => {
      const normalized = member.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      tiles.push({
        id: `${groupId}-${memberIndex}-${normalized}`,
        label: member,
        groupId,
      });
    });
  });

  return { tiles, groupOrder, groupMeta };
}

function solvedRowTierClass(groupId: GroupId, groupOrder: GroupId[]) {
  const idx = groupOrder.indexOf(groupId);
  if (idx < 0) {
    return "connection-solved-row--tier-0";
  }
  return `connection-solved-row--tier-${Math.min(idx, 3)}`;
}

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
  const [allPuzzles, setAllPuzzles] = useState<ApiPuzzle[]>([]);
  const [activePuzzleId, setActivePuzzleId] = useState<number | null>(null);
  const [groupOrder, setGroupOrder] = useState<GroupId[]>([]);
  const [groupMeta, setGroupMeta] = useState<Record<GroupId, { title: string }>>(
    {},
  );
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [isLoadingPuzzle, setIsLoadingPuzzle] = useState(true);
  const [puzzleLoadError, setPuzzleLoadError] = useState<string | null>(null);
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
  const isGameWon =
    !isGameOver && groupOrder.length > 0 && solvedGroups.length === groupOrder.length;
  const isGameComplete = isGameOver || isGameWon;

  const resetRound = useCallback((tilesForRound: Tile[]) => {
    setTiles(shuffleTiles(tilesForRound));
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
  }, []);

  const applyPuzzle = useCallback(
    (puzzle: ApiPuzzle) => {
      const { tiles: fetchedTiles, groupOrder, groupMeta } =
        buildTilesFromPuzzle(puzzle);
      setActivePuzzleId(puzzle.id);
      setGroupOrder(groupOrder);
      setGroupMeta(groupMeta);
      resetRound(fetchedTiles);
    },
    [resetRound],
  );

  const loadPuzzle = useCallback(async () => {
    setIsLoadingPuzzle(true);
    setPuzzleLoadError(null);

    try {
      const response = await fetch(CONNECTIONS_SOURCE_URL);
      if (!response.ok) {
        throw new Error(`Connections API request failed with ${response.status}`);
      }

      const allPuzzles = (await response.json()) as ApiPuzzle[];
      setAllPuzzles(allPuzzles);
      const selectedPuzzle = chooseRandomPuzzleById(allPuzzles);
      applyPuzzle(selectedPuzzle);
    } catch (error) {
      console.error(error);
      setPuzzleLoadError("Unable to load Connections puzzle.");
    } finally {
      setIsLoadingPuzzle(false);
    }
  }, [applyPuzzle]);

  useEffect(() => {
    void loadPuzzle();
  }, [loadPuzzle]);

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
    if (isLoadingPuzzle || puzzleLoadError || isShuffling || isSubmitting || isGameComplete) {
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
    if (isLoadingPuzzle || puzzleLoadError || isSubmitting || isShuffling || isGameComplete) {
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
    if (isLoadingPuzzle || puzzleLoadError || isSubmitting || isGameComplete) {
      return;
    }
    setSelectedTiles([]);
  };

  const handleRetry = () => {
    if (puzzleLoadError) {
      void loadPuzzle();
      return;
    }

    if (allPuzzles.length === 0) {
      return;
    }

    const nextPuzzle = chooseRandomPuzzleById(allPuzzles, activePuzzleId);
    applyPuzzle(nextPuzzle);
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

    for (const groupId of groupOrder) {
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
    if (
      isLoadingPuzzle ||
      puzzleLoadError ||
      selectedTiles.length !== 4 ||
      isSubmitting ||
      isGameComplete
    ) {
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
        {isLoadingPuzzle ? (
          <p aria-live="polite" className="connection-instruction" role="status">
            Loading puzzle...
          </p>
        ) : null}
        {puzzleLoadError ? (
          <div aria-live="polite" className="connection-finish connection-finish--lost">
            <h2 className="connection-finish-title">Unable to load puzzle</h2>
            <p className="connection-finish-text">{puzzleLoadError}</p>
            <button
              aria-label="Retry loading puzzle"
              className="connection-action-btn connection-finish-btn"
              onClick={() => {
                void loadPuzzle();
              }}
              type="button"
            >
              Try Again
            </button>
          </div>
        ) : null}

        {solvedGroups.length > 0 ? (
          <section aria-label="Solved groups" className="connection-solved">
            {solvedGroups.map((group, groupIndex) => (
              <div
                className={`connection-solved-row ${solvedRowTierClass(group.groupId, groupOrder)} ${group.noPop ? "connection-solved-row--no-pop" : ""}`}
                key={`${group.groupId}-${groupIndex}`}
              >
                <p className="connection-solved-title">
                  {groupMeta[group.groupId]?.title ?? group.groupId}
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
          className={`connection-grid ${isLoadingPuzzle ? "connection-grid--loading" : ""}`}
          ref={gridRef}
        >
          {isLoadingPuzzle
            ? Array.from({ length: LOADING_TILE_COUNT }).map((_, index) => (
                <div
                  aria-hidden="true"
                  className="connection-tile connection-tile--skeleton"
                  key={`skeleton-tile-${index}`}
                />
              ))
            : tiles.map((tile) => {
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
              disabled={
                isLoadingPuzzle ||
                Boolean(puzzleLoadError) ||
                isShuffling ||
                isSubmitting ||
                isGameComplete
              }
              onClick={handleShuffle}
              type="button"
            >
              Shuffle
            </button>
            <button
              className="connection-action-btn"
              disabled={
                isLoadingPuzzle ||
                Boolean(puzzleLoadError) ||
                selectedTiles.length === 0 ||
                isSubmitting ||
                isGameComplete
              }
              onClick={handleDeselectAll}
              type="button"
            >
              Deselect All
            </button>
            <form className="connection-submit-form" onSubmit={handleSubmit}>
              <button
                className="connection-action-btn connection-action-btn--submit"
                disabled={
                  isLoadingPuzzle ||
                  Boolean(puzzleLoadError) ||
                  selectedTiles.length !== 4 ||
                  isSubmitting ||
                  isGameComplete
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
