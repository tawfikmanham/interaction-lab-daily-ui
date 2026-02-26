"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

const GRID_SIZE = 3;
const EMPTY_TILE = GRID_SIZE * GRID_SIZE - 1;
const SOLVED_BOARD = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => index);
const SHUFFLE_STEPS = 140;
const REVEAL_UNLOCK_MOVES = 5;
const TILE_GAP_PX = 8;

const SMILEY_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'>
  <rect width='300' height='300' fill='white'/>
  <ellipse cx='105' cy='112' rx='16' ry='42' fill='black'/>
  <ellipse cx='195' cy='112' rx='16' ry='42' fill='black'/>
  <path d='M78 178 C105 235 195 235 222 178' fill='none' stroke='black' stroke-width='18' stroke-linecap='round'/>
</svg>`;

const SMILEY_IMAGE = `url("data:image/svg+xml;utf8,${encodeURIComponent(SMILEY_SVG)}")`;

type CellProps = {
  boardIndex: number;
  tile: number;
  onMove: (tile: number) => void;
  showWin: boolean;
  revealImage: boolean;
};

function getRow(index: number) {
  return Math.floor(index / GRID_SIZE);
}

function getCol(index: number) {
  return index % GRID_SIZE;
}

function getMovableIndexes(emptyIndex: number) {
  const row = getRow(emptyIndex);
  const col = getCol(emptyIndex);
  const indexes: number[] = [];

  if (row > 0) indexes.push(emptyIndex - GRID_SIZE);
  if (row < GRID_SIZE - 1) indexes.push(emptyIndex + GRID_SIZE);
  if (col > 0) indexes.push(emptyIndex - 1);
  if (col < GRID_SIZE - 1) indexes.push(emptyIndex + 1);

  return indexes;
}

function swapAt(board: number[], first: number, second: number) {
  const next = [...board];
  [next[first], next[second]] = [next[second], next[first]];
  return next;
}

function createShuffledBoard() {
  let board = [...SOLVED_BOARD];
  let emptyIndex = EMPTY_TILE;

  for (let step = 0; step < SHUFFLE_STEPS; step += 1) {
    const movableIndexes = getMovableIndexes(emptyIndex);
    const targetIndex = movableIndexes[Math.floor(Math.random() * movableIndexes.length)];
    board = swapAt(board, emptyIndex, targetIndex);
    emptyIndex = targetIndex;
  }

  if (board.every((tile, index) => tile === index)) {
    return createShuffledBoard();
  }

  return board;
}

function PuzzleCell({ boardIndex, tile, onMove, showWin, revealImage }: CellProps) {
  const sourceIndex = revealImage ? boardIndex : tile;
  const sourceRow = getRow(sourceIndex);
  const sourceCol = getCol(sourceIndex);

  return (
    <button
      type="button"
      onClick={() => onMove(tile)}
      className="h-full w-full rounded-md border border-zinc-400 bg-white transition hover:border-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
      aria-label={`Move tile ${tile + 1}`}
    >
      <div
        className="h-full w-full rounded-[4px]"
        style={{
          backgroundImage: SMILEY_IMAGE,
          backgroundSize: `${GRID_SIZE * 100}% ${GRID_SIZE * 100}%`,
          backgroundPosition: `${(sourceCol / (GRID_SIZE - 1)) * 100}% ${(sourceRow / (GRID_SIZE - 1)) * 100}%`,
          filter: showWin ? "contrast(1.05)" : undefined,
        }}
      />
    </button>
  );
}

export default function Home() {
  const [board, setBoard] = useState<number[]>(() => createShuffledBoard());
  const [moves, setMoves] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [confettiBurst, setConfettiBurst] = useState(0);
  const [revealImage, setRevealImage] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const boardSurfaceRef = useRef<HTMLDivElement | null>(null);
  const [boardSurfaceSize, setBoardSurfaceSize] = useState(0);

  const emptyIndex = useMemo(() => board.indexOf(EMPTY_TILE), [board]);
  const cellSize = useMemo(() => {
    if (!boardSurfaceSize) return 0;
    return (boardSurfaceSize - TILE_GAP_PX * (GRID_SIZE - 1)) / GRID_SIZE;
  }, [boardSurfaceSize]);
  const positionedTiles = useMemo(
    () => board.map((tile, boardIndex) => ({ tile, boardIndex })).filter((entry) => entry.tile !== EMPTY_TILE),
    [board]
  );

  const resetPuzzle = useCallback(() => {
    setBoard(createShuffledBoard());
    setMoves(0);
    setIsSolved(false);
    setRevealImage(false);
  }, []);

  const moveTile = useCallback(
    (tile: number) => {
      if (isSolved) return;

      const tileIndex = board.indexOf(tile);
      const tileRow = getRow(tileIndex);
      const tileCol = getCol(tileIndex);
      const emptyRow = getRow(emptyIndex);
      const emptyCol = getCol(emptyIndex);

      const isAdjacent = getMovableIndexes(emptyIndex).includes(tileIndex);
      const sameRow = tileRow === emptyRow;
      const sameCol = tileCol === emptyCol;
      if (!isAdjacent && !sameRow && !sameCol) return;

      let nextBoard = [...board];
      let movingEmpty = emptyIndex;

      if (isAdjacent) {
        nextBoard = swapAt(nextBoard, tileIndex, movingEmpty);
      } else if (sameRow) {
        const step = tileIndex < movingEmpty ? -1 : 1;
        while (movingEmpty !== tileIndex) {
          const nextIndex = movingEmpty + step;
          nextBoard = swapAt(nextBoard, movingEmpty, nextIndex);
          movingEmpty = nextIndex;
        }
      } else if (sameCol) {
        const step = tileIndex < movingEmpty ? -GRID_SIZE : GRID_SIZE;
        while (movingEmpty !== tileIndex) {
          const nextIndex = movingEmpty + step;
          nextBoard = swapAt(nextBoard, movingEmpty, nextIndex);
          movingEmpty = nextIndex;
        }
      }

      const solved = nextBoard.every((value, index) => value === index);

      setBoard(nextBoard);
      setMoves((current) => current + 1);

      if (solved) {
        setIsSolved(true);
        setConfettiBurst((value) => value + 1);
      }
    },
    [board, emptyIndex, isSolved]
  );

  const moveByOffset = useCallback(
    (offset: number) => {
      if (isSolved) return;

      const targetIndex = emptyIndex + offset;
      if (targetIndex < 0 || targetIndex >= GRID_SIZE * GRID_SIZE) return;

      const sameRow = getRow(targetIndex) === getRow(emptyIndex);
      if ((offset === 1 || offset === -1) && !sameRow) return;

      const tile = board[targetIndex];
      moveTile(tile);
    },
    [board, emptyIndex, isSolved, moveTile]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isSolved) return;

      const keyToOffset: Record<string, number> = {
        ArrowUp: GRID_SIZE,
        ArrowDown: -GRID_SIZE,
        ArrowLeft: 1,
        ArrowRight: -1,
      };

      const offset = keyToOffset[event.key];
      if (offset === undefined) return;
      event.preventDefault();
      moveByOffset(offset);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSolved, moveByOffset]);

  useEffect(() => {
    const surface = boardSurfaceRef.current;
    if (!surface) return;

    const syncSize = () => setBoardSurfaceSize(surface.clientWidth);
    syncSize();

    const observer = new ResizeObserver(() => syncSize());
    observer.observe(surface);
    return () => observer.disconnect();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-6 text-zinc-900 sm:px-5 sm:py-8">
      <section className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl border border-zinc-300 bg-white p-4 sm:p-5">
        <header className="space-y-2">
          <div className="space-y-2">
            <h1 className="text-2xl font-medium">Sliding Smiley Puzzle</h1>
            <p className="text-sm text-zinc-600">Arrange the smiley by sliding tiles into the empty space.</p>
          </div>
        </header>

        <div
          className="rounded-xl border border-zinc-300 bg-zinc-50 p-2"
          onPointerDown={(event) => {
            dragStartRef.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            const start = dragStartRef.current;
            dragStartRef.current = null;
            if (!start) return;

            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            const threshold = 24;

            if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

            if (Math.abs(dx) > Math.abs(dy)) {
              moveByOffset(dx > 0 ? -1 : 1);
              return;
            }

            moveByOffset(dy > 0 ? -GRID_SIZE : GRID_SIZE);
          }}
        > 
          <div ref={boardSurfaceRef} className="relative aspect-square w-full">
            <div
              className="absolute rounded-md border border-dashed border-zinc-300 bg-white"
              style={{
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                left: `${getCol(emptyIndex) * (cellSize + TILE_GAP_PX)}px`,
                top: `${getRow(emptyIndex) * (cellSize + TILE_GAP_PX)}px`,
              }}
              aria-hidden="true"
            />

            {positionedTiles.map(({ tile, boardIndex }) => (
              <motion.div
                key={tile}
                animate={{
                  x: getCol(boardIndex) * (cellSize + TILE_GAP_PX),
                  y: getRow(boardIndex) * (cellSize + TILE_GAP_PX),
                }}
                transition={{ type: "spring", stiffness: 220, damping: 24, mass: 0.8 }}
                className="absolute left-0 top-0 will-change-transform"
                style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
              >
                <PuzzleCell
                  boardIndex={boardIndex}
                  tile={tile}
                  onMove={moveTile}
                  showWin={isSolved}
                  revealImage={revealImage}
                />
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-600">
            Moves <span className="ml-1 inline-block min-w-7 text-left font-semibold tabular-nums text-zinc-900">{moves}</span>
          </p>
          <div className="flex items-center gap-1">
            {moves >= REVEAL_UNLOCK_MOVES && (
              <button
                type="button"
                onClick={() => setRevealImage((current) => !current)}
                aria-label={revealImage ? "Hide reveal" : "Reveal image"}
                aria-pressed={revealImage}
                title={revealImage ? "Hide reveal" : "Reveal image"}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-transparent text-zinc-900 transition hover:bg-zinc-100"
              >
                {revealImage ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                    <circle cx="12" cy="12" r="2.6" fill="white" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="2.6" />
                  </svg>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={resetPuzzle}
              aria-label="Shuffle puzzle"
              title="Shuffle"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-transparent text-zinc-900 transition hover:bg-zinc-100"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                <path d="M16 3h5v5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 20l7-7 2-2 8-8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 3l-4 0" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 21h5v-5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 4l7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {isSolved && (
          <div className="relative text-sm">
            <p className="font-medium text-zinc-900">Puzzle complete.</p>
            <div key={confettiBurst} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              {Array.from({ length: 18 }).map((_, index) => (
                <span
                  key={`${confettiBurst}-${index}`}
                  className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-zinc-700"
                  style={{
                    animation: `burst 700ms ease-out forwards`,
                    marginLeft: `${((index % 6) - 2.5) * 14}px`,
                    marginTop: `${Math.floor(index / 6) * 9}px`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <style jsx>{`
        @keyframes burst {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.7);
          }
          20% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -95%) scale(1.25);
          }
        }
      `}</style>
    </main>
  );
}
