"use client";

// Adapted from the "Kinetic Grid" component: a background grid that bends
// toward the pointer and ripples on clicks. Changes from the original:
// - draws only while something moves, and pauses while the tab is hidden
// - stays still for people who prefer reduced motion
// - uses the site's colors (globals.css) and keeps the fade toward the edges
// - scales for high-density screens so lines stay sharp
// - only ripples on clicks on the empty background, not on controls or panes
// - renders as a background layer instead of wrapping the page

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Point {
  x: number;
  y: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  born: number;
}

type Rgba = { r: number; g: number; b: number; a: number };

// ─── Constants ──────────────────────────────────────────────────────────────

const CELL_SIZE = 44; // matches the static CSS grid
const INFLUENCE_RADIUS = 260;
const MAX_WARP = 24;
const LERP_SPEED = 0.08;
const OFFSCREEN: Point = { x: -9999, y: -9999 };

const NODE_BASE_RADIUS = 1.2;
const NODE_ACTIVE_RADIUS = 3;

// Site tokens: --bg, the grid line color, and --k for the glow.
const BG = "#0a0a0a";
const LINE_BASE: Rgba = { r: 255, g: 255, b: 255, a: 0.055 };
const LINE_ACTIVE: Rgba = { r: 125, g: 211, b: 252, a: 0.7 };
const NODE_BASE: Rgba = { r: 255, g: 255, b: 255, a: 0.08 };
const NODE_ACTIVE: Rgba = { r: 125, g: 211, b: 252, a: 1 };
const GLOW = "125,211,252";

/** Clicks inside any of these are interactions, not background clicks. */
const NOT_BACKGROUND = "a, button, select, input, textarea, label, dialog, section, .cm-editor";

// ─── Helpers ────────────────────────────────────────────────────────────────

function lerpN(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpColor(base: Rgba, active: Rgba, t: number): string {
  const r = Math.round(lerpN(base.r, active.r, t));
  const g = Math.round(lerpN(base.g, active.g, t));
  const b = Math.round(lerpN(base.b, active.b, t));
  const a = lerpN(base.a, active.a, t);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

/** True for clicks on empty page areas, where a ripple makes sense. */
export function isBackgroundClick(target: Element | null): boolean {
  if (!target) return false;
  return target.closest(NOT_BACKGROUND) === null;
}

// ─── Warp ───────────────────────────────────────────────────────────────────

function getWarpedPoint(
  gx: number,
  gy: number,
  col: number,
  row: number,
  mouse: Point,
  ripples: Ripple[],
  cols: number,
  rows: number,
): { pt: Point; proximity: number } {
  // Edge pin: boundary rows/cols stay in place.
  const edgeMargin = 1.5;
  const colPin = Math.min(col / edgeMargin, (cols - 1 - col) / edgeMargin, 1);
  const rowPin = Math.min(row / edgeMargin, (rows - 1 - row) / edgeMargin, 1);
  const pinFactor = colPin * colPin * rowPin * rowPin;

  const dx = gx - mouse.x;
  const dy = gy - mouse.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const proximity = Math.max(0, 1 - dist / INFLUENCE_RADIUS) * pinFactor;

  // Ripple displacement
  let rx = 0;
  let ry = 0;
  for (const r of ripples) {
    const rdx = gx - r.x;
    const rdy = gy - r.y;
    const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
    const waveWidth = 55;
    const diff = rdist - r.radius;
    if (Math.abs(diff) < waveWidth) {
      const strength = (1 - Math.abs(diff) / waveWidth) * r.opacity * 18 * pinFactor;
      const angle = Math.atan2(rdy, rdx);
      const sign = diff < 0 ? -1 : 1;
      rx -= Math.cos(angle) * strength * sign;
      ry -= Math.sin(angle) * strength * sign;
    }
  }

  // Cursor warp with a bell-shaped falloff
  if (dist < INFLUENCE_RADIUS && dist > 0 && pinFactor > 0) {
    const t = dist / INFLUENCE_RADIUS;
    const eased = t < 0.01 ? 0 : (1 - t) * (1 - t) * Math.min(1, dist / 60);
    const warpAmt = eased * MAX_WARP * pinFactor;
    const angle = Math.atan2(dy, dx);
    return {
      pt: { x: gx - Math.cos(angle) * warpAmt + rx, y: gy - Math.sin(angle) * warpAmt + ry },
      proximity,
    };
  }

  return { pt: { x: gx + rx, y: gy + ry }, proximity };
}

// ─── Draw ───────────────────────────────────────────────────────────────────

function drawGrid(ctx: CanvasRenderingContext2D, W: number, H: number, mouse: Point, ripples: Ripple[], now: number) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Age ripples; drop the ones that have faded out.
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    const age = Math.max(0, (now - r.born) / 1000);
    r.radius = age * 400;
    r.opacity = Math.max(0, 1 - age * 1.2);
    if (r.opacity <= 0) ripples.splice(i, 1);
  }

  // Warped grid points
  const cols = Math.max(2, Math.ceil(W / CELL_SIZE)) + 1;
  const rows = Math.max(2, Math.ceil(H / CELL_SIZE)) + 1;
  const cellW = W / (cols - 1);
  const cellH = H / (rows - 1);
  const pts: Point[][] = [];
  const prox: number[][] = [];
  for (let row = 0; row < rows; row++) {
    pts[row] = [];
    prox[row] = [];
    for (let col = 0; col < cols; col++) {
      const { pt, proximity } = getWarpedPoint(col * cellW, row * cellH, col, row, mouse, ripples, cols, rows);
      pts[row][col] = pt;
      prox[row][col] = proximity;
    }
  }

  // Grid lines
  const drawSeg = (p1: Point, p2: Point, pr1: number, pr2: number) => {
    const t = smoothstep((pr1 + pr2) / 2);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = lerpColor(LINE_BASE, LINE_ACTIVE, t);
    ctx.lineWidth = lerpN(1, 1.5, t);
    ctx.stroke();
  };
  ctx.lineCap = "butt";
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols - 1; col++) drawSeg(pts[row][col], pts[row][col + 1], prox[row][col], prox[row][col + 1]);
  for (let col = 0; col < cols; col++)
    for (let row = 0; row < rows - 1; row++) drawSeg(pts[row][col], pts[row + 1][col], prox[row][col], prox[row + 1][col]);

  // Intersection nodes
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const p = pts[row][col];
      const t = smoothstep(prox[row][col]);
      const r = lerpN(NODE_BASE_RADIUS, NODE_ACTIVE_RADIUS, t);

      if (t > 0.3) {
        const glowR = r + lerpN(0, 6, (t - 0.3) / 0.7);
        const grd = ctx.createRadialGradient(p.x, p.y, r * 0.5, p.x, p.y, glowR);
        grd.addColorStop(0, `rgba(${GLOW},${(t * 0.3).toFixed(3)})`);
        grd.addColorStop(1, `rgba(${GLOW},0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = lerpColor(NODE_BASE, NODE_ACTIVE, t);
      ctx.fill();
    }
  }

  // Ripple rings
  for (const r of ripples) {
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${GLOW},${(r.opacity * 0.28).toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function KineticGrid({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse: Point = { ...OFFSCREEN };
    const target: Point = { ...OFFSCREEN };
    const ripples: Ripple[] = [];
    let size = { w: 0, h: 0 };
    let frame = 0;

    const isOffscreen = (p: Point) => p.x === OFFSCREEN.x && p.y === OFFSCREEN.y;

    // Nothing left to animate: the warp has caught up and all ripples are gone.
    const isSettled = () => {
      if (ripples.length > 0) return false;
      const outOfView = mouse.x < -INFLUENCE_RADIUS || mouse.y < -INFLUENCE_RADIUS;
      if (isOffscreen(target) && outOfView) return true;
      return Math.abs(mouse.x - target.x) < 0.5 && Math.abs(mouse.y - target.y) < 0.5;
    };

    const tick = (now: number) => {
      frame = 0;
      mouse.x = lerpN(mouse.x, target.x, LERP_SPEED);
      mouse.y = lerpN(mouse.y, target.y, LERP_SPEED);
      if (isSettled()) Object.assign(mouse, target);
      drawGrid(ctx, size.w, size.h, mouse, ripples, now);
      if (!isSettled()) frame = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (frame || reduceMotion || document.hidden) return;
      frame = requestAnimationFrame(tick);
    };

    const sleep = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      size = { w: window.innerWidth, h: window.innerHeight };
      canvas.width = Math.round(size.w * dpr);
      canvas.height = Math.round(size.h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawGrid(ctx, size.w, size.h, mouse, ripples, performance.now());
    };

    const onMouseMove = (e: MouseEvent) => {
      // Entering the page: start the warp at the cursor instead of sweeping in from a corner.
      if (isOffscreen(target) && mouse.x < -INFLUENCE_RADIUS) Object.assign(mouse, { x: e.clientX, y: e.clientY });
      Object.assign(target, { x: e.clientX, y: e.clientY });
      wake();
    };

    const onMouseLeave = () => {
      Object.assign(target, OFFSCREEN);
      wake();
    };

    const onClick = (e: MouseEvent) => {
      if (reduceMotion || !isBackgroundClick(e.target as Element | null)) return;
      ripples.push({ x: e.clientX, y: e.clientY, radius: 0, opacity: 1, born: performance.now() });
      wake();
    };

    const onVisibility = () => (document.hidden ? sleep() : wake());

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("click", onClick);
    document.addEventListener("visibilitychange", onVisibility);
    if (!reduceMotion) {
      window.addEventListener("mousemove", onMouseMove);
      document.documentElement.addEventListener("mouseleave", onMouseLeave);
    }

    return () => {
      sleep();
      window.removeEventListener("resize", resize);
      window.removeEventListener("click", onClick);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("mousemove", onMouseMove);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <div aria-hidden="true" className={cn("pointer-events-none fixed inset-0 -z-10", className)}>
      {/* Static CSS grid: shows before JavaScript loads and if canvas isn't available. */}
      <div className="grid-lines absolute inset-0" />
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      <div className="grid-fade absolute inset-0" />
    </div>
  );
}
