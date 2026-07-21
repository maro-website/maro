"use client";

import * as React from "react";

// A tiny Nokia-style Snake to play while a generation runs. Desktop only
// (keyboard controlled). Keeps a personal best + a top-3 leaderboard in
// localStorage. Deliberately minimal so it never weighs the page down.

const GRID = 15; // cells per side
const CELL = 18; // px per cell
const SIZE = GRID * CELL; // canvas px
const TICK_MS = 120;

// Classic monochrome LCD palette (theme-independent for the retro feel).
const LCD_BG = "#c3d1a4";
const LCD_DIM = "#aab98a";
const LCD_INK = "#1f2a16";

const SCORES_KEY = "maro:snake:scores";

type Pt = { x: number; y: number };
type Dir = "up" | "down" | "left" | "right";

function loadScores(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SCORES_KEY);
    const arr = raw ? (JSON.parse(raw) as number[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveScore(score: number): number[] {
  const next = [...loadScores(), score].sort((a, b) => b - a).slice(0, 3);
  try {
    window.localStorage.setItem(SCORES_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function WaitingSnake() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = React.useState(false);
  const [over, setOver] = React.useState(false);
  const [score, setScore] = React.useState(0);
  const [scores, setScores] = React.useState<number[]>([]);

  // Mutable game state kept in refs so the loop stays cheap.
  const snake = React.useRef<Pt[]>([{ x: 7, y: 7 }]);
  const dir = React.useRef<Dir>("right");
  const nextDir = React.useRef<Dir>("right");
  const food = React.useRef<Pt>({ x: 11, y: 7 });
  const scoreRef = React.useRef(0);

  React.useEffect(() => setScores(loadScores()), []);

  const placeFood = React.useCallback(() => {
    let p: Pt;
    do {
      p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (snake.current.some((s) => s.x === p.x && s.y === p.y));
    food.current = p;
  }, []);

  const draw = React.useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = LCD_BG;
    ctx.fillRect(0, 0, SIZE, SIZE);
    // subtle grid dots
    ctx.fillStyle = LCD_DIM;
    for (let i = 0; i < GRID; i++)
      for (let j = 0; j < GRID; j++) ctx.fillRect(i * CELL + CELL / 2 - 1, j * CELL + CELL / 2 - 1, 1, 1);
    // food (hollow square)
    ctx.fillStyle = LCD_INK;
    ctx.fillRect(food.current.x * CELL + 3, food.current.y * CELL + 3, CELL - 6, CELL - 6);
    // snake (blocky)
    snake.current.forEach((s) => {
      ctx.fillStyle = LCD_INK;
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }, []);

  const reset = React.useCallback(() => {
    snake.current = [{ x: 7, y: 7 }];
    dir.current = "right";
    nextDir.current = "right";
    scoreRef.current = 0;
    setScore(0);
    setOver(false);
    placeFood();
    draw();
  }, [placeFood, draw]);

  const step = React.useCallback(() => {
    dir.current = nextDir.current;
    const head = snake.current[0];
    const d = dir.current;
    const nh: Pt = {
      x: head.x + (d === "left" ? -1 : d === "right" ? 1 : 0),
      y: head.y + (d === "up" ? -1 : d === "down" ? 1 : 0),
    };
    // Walls / self collision -> game over.
    if (
      nh.x < 0 ||
      nh.y < 0 ||
      nh.x >= GRID ||
      nh.y >= GRID ||
      snake.current.some((s) => s.x === nh.x && s.y === nh.y)
    ) {
      setRunning(false);
      setOver(true);
      setScores(saveScore(scoreRef.current));
      return;
    }
    const grew = nh.x === food.current.x && nh.y === food.current.y;
    const body = [nh, ...snake.current];
    if (grew) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      placeFood();
    } else {
      body.pop();
    }
    snake.current = body;
    draw();
  }, [draw, placeFood]);

  // Game loop.
  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(step, TICK_MS);
    return () => clearInterval(t);
  }, [running, step]);

  // Keyboard controls (also prevents page scroll on arrows while playing).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
      };
      const nd = map[e.key];
      if (!nd) return;
      if (running) e.preventDefault();
      const opposite: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };
      if (nd !== opposite[dir.current]) nextDir.current = nd;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running]);

  React.useEffect(() => {
    draw();
  }, [draw]);

  const start = () => {
    reset();
    setRunning(true);
  };

  const best = scores[0] ?? 0;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative overflow-hidden rounded-md p-1.5"
        style={{ background: LCD_INK }}
      >
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="block rounded-sm [image-rendering:pixelated]"
        />
        {(!running || over) && (
          <div className="absolute inset-1.5 grid place-items-center rounded-sm bg-[#1f2a16]/85 text-center">
            <div>
              <div className="font-mono text-[13px] font-bold uppercase tracking-widest text-[#c3d1a4]">
                {over ? `Game Over · ${score}` : "Snake"}
              </div>
              <button
                onClick={start}
                className="mt-2 rounded-sm bg-[#c3d1a4] px-4 py-1.5 font-mono text-[12px] font-bold uppercase tracking-wider text-[#1f2a16] transition-opacity hover:opacity-90"
              >
                {over ? "Rifillo" : "Luaj"}
              </button>
              <div className="mt-1.5 font-mono text-[10px] text-[#c3d1a4]/70">Shigjetat / WASD</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 font-mono text-[11px] text-ink-3">
        <span>
          Score: <span className="font-bold text-ink">{score}</span>
        </span>
        <span>
          Best: <span className="font-bold text-ink">{best}</span>
        </span>
      </div>

      {scores.length > 0 && (
        <div className="mt-2 flex items-center gap-3 font-mono text-[11px] text-ink-3">
          <span className="uppercase tracking-wider">Top 3</span>
          {scores.map((s, i) => (
            <span key={i} className="text-ink-2">
              {["🥇", "🥈", "🥉"][i]} {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
