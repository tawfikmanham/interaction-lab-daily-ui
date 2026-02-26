"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const GRID_SIZE = 3;
const EMPTY_TILE = GRID_SIZE * GRID_SIZE - 1;
const SOLVED_BOARD = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => index);
const SHUFFLE_STEPS = 140;

const SMILEY_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'>
  <rect width='300' height='300' fill='white'/>
  <ellipse cx='105' cy='112' rx='16' ry='42' fill='black'/>
  <ellipse cx='195' cy='112' rx='16' ry='42' fill='black'/>
  <path d='M78 178 C105 235 195 235 222 178' fill='none' stroke='black' stroke-width='18' stroke-linecap='round'/>
</svg>`;

const SMILEY_IMAGE = `url("data:image/svg+xml;utf8,${encodeURIComponent(SMILEY_SVG)}")`;

type CellProps = {
  tile: number;
  onMove: (tile: number) => void;
  showWin: boolean;
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

function PuzzleCell({ tile, onMove, showWin }: CellProps) {
  if (tile === EMPTY_TILE) {
    return <div className="h-full w-full rounded-md border border-dashed border-zinc-300 bg-white" aria-hidden="true" />;
  }

  const sourceRow = getRow(tile);
  const sourceCol = getCol(tile);

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

  const emptyIndex = useMemo(() => board.indexOf(EMPTY_TILE), [board]);

  const resetPuzzle = useCallback(() => {
    setBoard(createShuffledBoard());
    setMoves(0);
    setIsSolved(false);
  }, []);

  const moveTile = useCallback(
    (tile: number) => {
      if (isSolved) return;

      const tileIndex = board.indexOf(tile);
      const movableIndexes = getMovableIndexes(emptyIndex);
      if (!movableIndexes.includes(tileIndex)) return;

      const nextBoard = swapAt(board, tileIndex, emptyIndex);
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

      const targetIndex = emptyIndex + offset;
      if (targetIndex < 0 || targetIndex >= GRID_SIZE * GRID_SIZE) return;

      const sameRow = getRow(targetIndex) === getRow(emptyIndex);
      if ((offset === 1 || offset === -1) && !sameRow) return;

      const tile = board[targetIndex];
      moveTile(tile);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [board, emptyIndex, isSolved, moveTile]);

  return (
    <main className="min-h-screen bg-white px-5 py-10 text-zinc-900 sm:px-8">
      <section className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-2xl border border-zinc-300 bg-white p-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Daily UI</p>
          <h1 className="text-2xl font-medium">Sliding Smiley Puzzle</h1>
          <p className="text-sm text-zinc-600">Arrange the smiley by sliding tiles into the empty space.</p>
        </header>

        <div className="grid grid-cols-3 gap-2 rounded-xl border border-zinc-300 bg-zinc-50 p-2">
          {board.map((tile, boardIndex) => (
            <div key={`${tile}-${boardIndex}`} className="aspect-square">
              <PuzzleCell tile={tile} onMove={moveTile} showWin={isSolved} />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-zinc-300 px-4 py-3 text-sm">
          <span className="text-zinc-600">Moves</span>
          <span className="font-semibold text-zinc-900">{moves}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={resetPuzzle}
            className="rounded-lg border border-zinc-400 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:border-zinc-700"
          >
            Shuffle
          </button>
          <p className="text-sm text-zinc-600">Use tap or arrow keys to move.</p>
        </div>

        <div className="relative min-h-7 text-sm">
          {isSolved ? (
            <p className="font-medium text-zinc-900">Puzzle complete.</p>
          ) : (
            <p className="text-zinc-500">Keep going.</p>
          )}

          {isSolved && (
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
          )}
        </div>
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
