import { useState, useRef, useEffect } from 'react';
import styles from './WeaverGolf.module.css';

const CANVAS_W = 560;
const CANVAS_H = 360;
const BALL_R = 8;
const HOLE_R = 18;
const FRICTION = 0.985;
const STOP_THRESHOLD = 0.15;
const SINK_CATCH_R = HOLE_R + 4;
const SINK_CLOSE_R = 10;
const SINK_SPEED_CLOSE = 5;
const SINK_SPEED_FAR = 1.6;
const MAX_POWER = 18;

type Vec = { x: number; y: number };
type Wall = { x1: number; y1: number; x2: number; y2: number };

type StickFigureObstacle = { type: 'stickFigure'; x: number; y: number };
type BeerBottleObstacle = { type: 'beerBottle'; x: number; y: number };
type TrashCanObstacle = { type: 'trashCan'; x: number; y: number };
type CigarettesObstacle = { type: 'cigarettes'; x: number; y: number };
type Obstacle = StickFigureObstacle | BeerBottleObstacle | TrashCanObstacle | CigarettesObstacle;

type HoleLayout = {
  ballStart: Vec;
  hole: Vec;
  walls: Wall[];
  obstacles?: Obstacle[];
};

const STICK_FIGURE_COLLISION_R = 32;
const BEER_BOTTLE_COLLISION_R = 15;
const TRASH_CAN_COLLISION_R = 14;
const CIGARETTES_COLLISION_R = 22;

const HOLES: HoleLayout[] = [
  {
    ballStart: { x: 80, y: CANVAS_H / 2 },
    hole: { x: CANVAS_W - 60, y: CANVAS_H / 2 },
    walls: [],
    obstacles: [
      { type: 'stickFigure', x: CANVAS_W * 0.45, y: CANVAS_H / 2 },
      { type: 'beerBottle', x: 180, y: 120 },
      { type: 'beerBottle', x: 320, y: 260 },
      { type: 'beerBottle', x: 420, y: 100 },
    ],
  },
  {
    ballStart: { x: 70, y: 70 },
    hole: { x: CANVAS_W - 70, y: CANVAS_H - 70 },
    walls: [
      { x1: CANVAS_W / 2, y1: 0, x2: CANVAS_W / 2, y2: 110 },
      { x1: CANVAS_W / 2, y1: CANVAS_H, x2: CANVAS_W / 2, y2: 250 },
    ],
    obstacles: [
      { type: 'stickFigure', x: CANVAS_W / 2 - 90, y: 200 },
      { type: 'trashCan', x: CANVAS_W / 2 + 100, y: 100 },
      { type: 'cigarettes', x: CANVAS_W / 2 + 100, y: 220 },
    ],
  },
  {
    ballStart: { x: CANVAS_W / 2, y: CANVAS_H - 70 },
    hole: { x: CANVAS_W / 2, y: 70 },
    walls: [
      { x1: 100, y1: CANVAS_H / 2, x2: CANVAS_W / 2 - 50, y2: CANVAS_H / 2 },
      { x1: CANVAS_W / 2 + 50, y1: CANVAS_H / 2, x2: CANVAS_W - 100, y2: CANVAS_H / 2 },
    ],
    obstacles: [
      { type: 'stickFigure', x: CANVAS_W / 2 + 80, y: CANVAS_H / 2 - 20 },
      { type: 'beerBottle', x: 140, y: CANVAS_H / 2 - 40 },
      { type: 'beerBottle', x: 380, y: CANVAS_H / 2 + 50 },
      { type: 'beerBottle', x: 480, y: 100 },
    ],
  },
];

function dist(a: Vec, b: Vec) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function segmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1e-6;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (len * len)));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

const HEAD_R = 22;
const HEAD_Y_OFFSET = 38;

function drawStickFigure(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  faceImage: HTMLImageElement | null
) {
  const headY = cy - HEAD_Y_OFFSET;
  const shoulderY = cy - 18;
  const waistY = cy + 8;
  const footY = cy + 42;

  if (faceImage?.complete && faceImage.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, headY, HEAD_R, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const d = HEAD_R * 2;
    ctx.drawImage(faceImage, 0, 0, faceImage.naturalWidth, faceImage.naturalHeight, cx - HEAD_R, headY - HEAD_R, d, d);
    ctx.restore();
  } else {
    ctx.strokeStyle = '#1a1a2e';
    ctx.fillStyle = '#1a1a2e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, headY, HEAD_R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - 5, headY - 2, 4, 0, Math.PI * 2);
    ctx.arc(cx + 5, headY - 2, 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, headY + HEAD_R);
  ctx.lineTo(cx, waistY);
  ctx.moveTo(cx, shoulderY);
  ctx.lineTo(cx - 22, shoulderY + 4);
  ctx.moveTo(cx, shoulderY);
  ctx.lineTo(cx + 22, shoulderY + 4);
  ctx.moveTo(cx, waistY);
  ctx.lineTo(cx - 10, footY);
  ctx.moveTo(cx, waistY);
  ctx.lineTo(cx + 10, footY);
  ctx.stroke();
}

const BEER_CAN_W = 22;
const BEER_CAN_H = 48;

function drawBeerBottle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  canImage: HTMLImageElement | null
) {
  const w = BEER_CAN_W;
  const h = BEER_CAN_H;
  if (canImage?.complete && canImage.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 4);
    ctx.clip();
    const nw = canImage.naturalWidth;
    const nh = canImage.naturalHeight;
    const pad = 0.12;
    const sx = nw * pad;
    const sy = nh * pad;
    const sw = nw * (1 - 2 * pad);
    const sh = nh * (1 - 2 * pad);
    ctx.drawImage(canImage, sx, sy, sw, sh, cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
  } else {
    ctx.fillStyle = '#d4a84b';
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(cx - w / 2 + 1, cy - h / 2 + 2, w - 2, 4);
  }
}

function drawTrashCan(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const w = 24;
  const h = 28;
  ctx.fillStyle = '#5a5a5a';
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2 + 4, cy + h / 2);
  ctx.lineTo(cx + w / 2 - 4, cy + h / 2);
  ctx.lineTo(cx + w / 2, cy - h / 2);
  ctx.lineTo(cx - w / 2, cy - h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#444';
  ctx.fillRect(cx - w / 2 - 2, cy - h / 2 - 6, w + 4, 5);
}

const CIGARETTES_PACK_W = 52;
const CIGARETTES_PACK_H = 50;

function drawCigarettes(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  packImage: HTMLImageElement | null
) {
  const w = CIGARETTES_PACK_W;
  const h = CIGARETTES_PACK_H;
  if (packImage?.complete && packImage.naturalWidth > 0) {
    const nw = packImage.naturalWidth;
    const nh = packImage.naturalHeight;
    const padX = 0.24;
    const padY = 0.15;
    const sx = nw * padX;
    const sy = nh * padY;
    const sw = nw * (1 - 2 * padX);
    const sh = nh * (1 - 2 * padY);
    ctx.drawImage(packImage, sx, sy, sw, sh, cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c41e3a';
    ctx.fillRect(cx - w / 2, cy - h / 2, 6, h);
  }
}

const FACE_IMAGE_URL = '/images/obstacle-face.png';
const BEER_CAN_IMAGE_URL = '/images/beer-can.png';
const CIGARETTES_PACK_IMAGE_URL = '/images/cigarettes-pack.png';

export default function WeaverGolf() {
  const [holeIndex, setHoleIndex] = useState(0);
  const [ball, setBall] = useState<Vec>(HOLES[0].ballStart);
  const [velocity, setVelocity] = useState<Vec>({ x: 0, y: 0 });
  const [strokes, setStrokes] = useState(0);
  const [totalStrokes, setTotalStrokes] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const velRef = useRef<Vec>({ x: 0, y: 0 });
  const ballRef = useRef<Vec>(HOLES[0].ballStart);
  const rafRef = useRef<number>(0);
  const [aimAngle, setAimAngle] = useState(0);
  const [power, setPower] = useState(MAX_POWER / 2);
  const aimAngleRef = useRef(aimAngle);
  const powerRef = useRef(power);
  const faceImageRef = useRef<HTMLImageElement | null>(null);
  const beerCanImageRef = useRef<HTMLImageElement | null>(null);
  const cigarettesPackImageRef = useRef<HTMLImageElement | null>(null);

  const layout = HOLES[holeIndex];

  useEffect(() => {
    const img = new Image();
    img.onload = () => { faceImageRef.current = img; };
    img.src = FACE_IMAGE_URL;
    return () => { faceImageRef.current = null; };
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { beerCanImageRef.current = img; };
    img.src = BEER_CAN_IMAGE_URL;
    return () => { beerCanImageRef.current = null; };
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { cigarettesPackImageRef.current = img; };
    img.src = CIGARETTES_PACK_IMAGE_URL;
    return () => { cigarettesPackImageRef.current = null; };
  }, []);

  const holeNum = holeIndex + 1;

  useEffect(() => {
    ballRef.current = ball;
    velRef.current = velocity;
  }, [ball, velocity]);

  useEffect(() => {
    setBall({ ...layout.ballStart });
    setVelocity({ x: 0, y: 0 });
    setStrokes(0);
    const dx = layout.hole.x - layout.ballStart.x;
    const dy = layout.hole.y - layout.ballStart.y;
    setAimAngle(Math.atan2(dy, dx));
    setPower(MAX_POWER / 2);
  }, [holeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    aimAngleRef.current = aimAngle;
    powerRef.current = power;
  }, [aimAngle, power]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animating = true;
    const tick = () => {
      const v = velRef.current;
      const speed = Math.hypot(v.x, v.y);
      if (speed < STOP_THRESHOLD) {
        if (animating) {
          setVelocity({ x: 0, y: 0 });
          animating = false;
        }
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      animating = true;
      let bx = ballRef.current.x;
      let by = ballRef.current.y;
      let vx = v.x;
      let vy = v.y;
      for (const w of layout.walls) {
        const d = segmentDistance(bx, by, w.x1, w.y1, w.x2, w.y2);
        if (d < BALL_R + 2) {
          const nx = (w.y2 - w.y1) / (Math.hypot(w.x2 - w.x1, w.y2 - w.y1) || 1);
          const ny = -(w.x2 - w.x1) / (Math.hypot(w.x2 - w.x1, w.y2 - w.y1) || 1);
          const dot = vx * nx + vy * ny;
          vx -= 2 * dot * nx;
          vy -= 2 * dot * ny;
          bx += (BALL_R + 2 - d) * nx;
          by += (BALL_R + 2 - d) * ny;
        }
      }
      if (layout.obstacles) {
        for (const obs of layout.obstacles) {
          const r = obs.type === 'stickFigure' ? STICK_FIGURE_COLLISION_R
            : obs.type === 'beerBottle' ? BEER_BOTTLE_COLLISION_R
            : obs.type === 'trashCan' ? TRASH_CAN_COLLISION_R
            : obs.type === 'cigarettes' ? CIGARETTES_COLLISION_R
            : 0;
          if (r > 0) {
            const d = Math.hypot(bx - obs.x, by - obs.y);
            if (d < BALL_R + r) {
              const nx = (bx - obs.x) / (d || 1e-6);
              const ny = (by - obs.y) / (d || 1e-6);
              const dot = vx * nx + vy * ny;
              if (dot < 0) {
                vx -= 2 * dot * nx;
                vy -= 2 * dot * ny;
                bx = obs.x + nx * (BALL_R + r);
                by = obs.y + ny * (BALL_R + r);
              }
            }
          }
        }
      }
      if (bx < BALL_R) { bx = BALL_R; vx = Math.abs(vx) * 0.6; }
      if (bx > CANVAS_W - BALL_R) { bx = CANVAS_W - BALL_R; vx = -Math.abs(vx) * 0.6; }
      if (by < BALL_R) { by = BALL_R; vy = Math.abs(vy) * 0.6; }
      if (by > CANVAS_H - BALL_R) { by = CANVAS_H - BALL_R; vy = -Math.abs(vy) * 0.6; }
      bx += vx;
      by += vy;
      vx *= FRICTION;
      vy *= FRICTION;
      ballRef.current = { x: bx, y: by };
      setBall({ x: bx, y: by });
      setVelocity({ x: vx, y: vy });
      const toHole = dist(ballRef.current, layout.hole);
      const ballSpeed = Math.hypot(vx, vy);
      const maxSpeed = toHole < SINK_CLOSE_R ? SINK_SPEED_CLOSE : SINK_SPEED_FAR;
      if (toHole < SINK_CATCH_R && ballSpeed < maxSpeed) {
        if (holeIndex < HOLES.length - 1) {
          setHoleIndex((i) => i + 1);
          setTotalStrokes((t) => t + strokes);
        } else {
          setTotalStrokes((t) => t + strokes);
          setGameComplete(true);
        }
        setVelocity({ x: 0, y: 0 });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [holeIndex, layout.walls, layout.hole, strokes]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const walls = layout.walls;
    const hole = layout.hole;
    let drawId: number;
    const draw = () => {
      ctx.fillStyle = '#1a5c1a';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.strokeStyle = '#2d7a2d';
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, CANVAS_W - 4, CANVAS_H - 4);
      for (const w of walls) {
        ctx.strokeStyle = '#0c2340';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(w.x1, w.y1);
        ctx.lineTo(w.x2, w.y2);
        ctx.stroke();
      }
      if (layout.obstacles) {
        for (const obs of layout.obstacles) {
          if (obs.type === 'stickFigure') drawStickFigure(ctx, obs.x, obs.y, faceImageRef.current);
          else if (obs.type === 'beerBottle') drawBeerBottle(ctx, obs.x, obs.y, beerCanImageRef.current);
          else if (obs.type === 'trashCan') drawTrashCan(ctx, obs.x, obs.y);
          else if (obs.type === 'cigarettes') drawCigarettes(ctx, obs.x, obs.y, cigarettesPackImageRef.current);
        }
      }
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, HOLE_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1a5c1a';
      ctx.lineWidth = 2;
      ctx.stroke();
      const b = ballRef.current;
      const canPuttNow = Math.hypot(velRef.current.x, velRef.current.y) <= STOP_THRESHOLD;
      if (canPuttNow) {
        const angle = aimAngleRef.current;
        const p = powerRef.current;
        const lineLen = 15 + (p / MAX_POWER) * 45;
        const endX = b.x + Math.cos(angle) * lineLen;
        const endY = b.y + Math.sin(angle) * lineLen;
        ctx.strokeStyle = 'rgba(253, 185, 39, 0.95)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        const ux = Math.cos(angle);
        const uy = Math.sin(angle);
        const arrowLen = 18;
        const ax = endX - ux * arrowLen;
        const ay = endY - uy * arrowLen;
        const perpX = -uy * 7;
        const perpY = ux * 7;
        ctx.fillStyle = 'rgba(253, 185, 39, 0.95)';
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(ax + perpX, ay + perpY);
        ctx.lineTo(ax - perpX, ay - perpY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(200, 150, 20, 0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();
      drawId = requestAnimationFrame(draw);
    };
    drawId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(drawId);
  }, [holeIndex, layout.walls, layout.hole]);

  const toCanvasCoords = (clientX: number, clientY: number): Vec | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (Math.hypot(velocity.x, velocity.y) > STOP_THRESHOLD) return;
    const pt = toCanvasCoords(e.clientX, e.clientY);
    if (!pt) return;
    setAimAngle(Math.atan2(pt.y - ball.y, pt.x - ball.x));
  };

  const handleHit = () => {
    if (Math.hypot(velocity.x, velocity.y) > STOP_THRESHOLD) return;
    setVelocity({ x: Math.cos(aimAngle) * power, y: Math.sin(aimAngle) * power });
    setStrokes((s) => s + 1);
  };

  const canPutt = Math.hypot(velocity.x, velocity.y) <= STOP_THRESHOLD;

  if (gameComplete) {
    const total = totalStrokes;
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Nice round!</h1>
          <p className={styles.score}>You finished 3 holes in <strong>{total}</strong> strokes.</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.replayBtn}
              onClick={() => {
                setGameComplete(false);
                setHoleIndex(0);
                setTotalStrokes(0);
                setBall(HOLES[0].ballStart);
                setVelocity({ x: 0, y: 0 });
                setStrokes(0);
              }}
            >
              Play again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Weaver Golf</h1>
          <p className={styles.holeInfo}>Hole {holeNum} of 3 · Strokes: {strokes}</p>
        </div>
        <div className={styles.canvasWrap}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className={styles.canvas}
            onClick={handleCanvasClick}
          />
        </div>
        <div className={`${styles.controls} ${!canPutt ? styles.controlsDisabled : ''}`}>
          <div className={styles.powerRow}>
            <label htmlFor="power" className={styles.powerLabel}>Power</label>
            <input
              id="power"
              type="range"
              min={0}
              max={MAX_POWER}
              step={0.5}
              value={power}
              onChange={(e) => setPower(Number(e.target.value))}
              className={styles.powerSlider}
              disabled={!canPutt}
              aria-disabled={!canPutt}
            />
            <span className={styles.powerValue}>{Math.round(power)}</span>
          </div>
          <button type="button" onClick={handleHit} className={styles.hitBtn} disabled={!canPutt}>
            Hit
          </button>
        </div>
        <p className={styles.hint}>{canPutt ? 'Click on the green to aim · Set power · Hit to putt' : '…'}</p>
      </div>
    </div>
  );
}
