import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { BLOCK_COLORS, BLOCK_HEIGHT } from "../utils/stack";

export interface StackBlock {
  left: number;
  width: number;
  layer: number;
}

export interface StackCanvasHandle {
  addFalling: (left: number, width: number, layer: number) => void;
  addFlash: (layer: number) => void;
  collapseAll: () => void;
}

interface FallingPiece {
  left: number;
  width: number;
  layer: number;
  y0: number;
  startTime: number;
}

interface PerfectFlash {
  layer: number;
  startTime: number;
}

interface Props {
  blocks: StackBlock[];
  movingBlock: { left: number; width: number; layer: number } | null;
  spectator?: boolean;
  width?: number;
  height?: number;
  onClick?: () => void;
}

const StackCanvas = forwardRef<StackCanvasHandle, Props>(function StackCanvas(
  { blocks, movingBlock, spectator = false, width = 320, height = 400, onClick },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallingRef = useRef<FallingPiece[]>([]);
  const flashRef = useRef<PerfectFlash[]>([]);
  const animFrameRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const scrollTargetRef = useRef(0);
  const collapsedRef = useRef(false);
  const collapseStartRef = useRef(0);

  useImperativeHandle(ref, () => ({
    addFalling(left: number, w: number, layer: number) {
      const baseY = height - 40;
      const scroll = scrollOffsetRef.current;
      const y0 = baseY - (layer + 1) * (BLOCK_HEIGHT - 2) + scroll;
      fallingRef.current.push({ left, width: w, layer, y0, startTime: performance.now() });
    },
    addFlash(layer: number) {
      flashRef.current.push({ layer, startTime: performance.now() });
    },
    collapseAll() {
      collapsedRef.current = true;
      collapseStartRef.current = performance.now();
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const baseY = height - 40;

    function getColor(layer: number): string {
      return BLOCK_COLORS[layer % BLOCK_COLORS.length]!;
    }

    function drawBlock(x: number, y: number, w: number, h: number, color: string, alpha = 1) {
      if (w <= 0) {
        return;
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(x, y + h - 2, w, 2);
      ctx.globalAlpha = 1;
    }

    function render() {
      const now = performance.now();
      ctx.clearRect(0, 0, width, height);

      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "#1a0e08");
      grad.addColorStop(1, "#2c1810");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "#4a3728";
      ctx.fillRect(0, baseY + BLOCK_HEIGHT, width, height - baseY - BLOCK_HEIGHT);
      ctx.fillStyle = "#5c4a3a";
      ctx.fillRect(0, baseY + BLOCK_HEIGHT, width, 3);

      const topLayer = blocks.length + (movingBlock ? 1 : 0);
      if (topLayer > 12) {
        scrollTargetRef.current = (topLayer - 12) * (BLOCK_HEIGHT - 2);
      } else {
        scrollTargetRef.current = 0;
      }
      const sdiff = scrollTargetRef.current - scrollOffsetRef.current;
      if (Math.abs(sdiff) > 0.5) {
        scrollOffsetRef.current += sdiff * 0.1;
      } else {
        scrollOffsetRef.current = scrollTargetRef.current;
      }
      const scroll = scrollOffsetRef.current;

      const collapsed = collapsedRef.current;
      const collapseElapsed = collapsed ? (now - collapseStartRef.current) / 1000 : 0;

      for (const block of blocks) {
        let y = baseY - (block.layer + 1) * (BLOCK_HEIGHT - 2) + scroll;
        let alpha = 1;
        if (collapsed) {
          const delay = (blocks.length - 1 - block.layer) * 0.05;
          const t = Math.max(0, collapseElapsed - delay);
          if (t > 0) {
            y += t * t * 500;
            alpha = Math.max(0, 1 - t);
          }
        }
        if (y > height + BLOCK_HEIGHT || y < -BLOCK_HEIGHT) {
          continue;
        }
        drawBlock(block.left, y, block.width, BLOCK_HEIGHT, getColor(block.layer), alpha);
      }

      if (movingBlock && !spectator && !collapsed) {
        const y = baseY - (movingBlock.layer + 1) * (BLOCK_HEIGHT - 2) + scroll;
        drawBlock(movingBlock.left, y, movingBlock.width, BLOCK_HEIGHT, getColor(movingBlock.layer));
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(movingBlock.left, y, movingBlock.width, BLOCK_HEIGHT);
      }

      fallingRef.current = fallingRef.current.filter((p) => {
        const elapsed = (now - p.startTime) / 1000;
        if (elapsed > 1) {
          return false;
        }
        const y = p.y0 + elapsed * elapsed * 500;
        const alpha = Math.max(0, 1 - elapsed * 2);
        drawBlock(p.left, y, p.width, BLOCK_HEIGHT, getColor(p.layer), alpha);
        return true;
      });

      flashRef.current = flashRef.current.filter((f) => {
        const elapsed = (now - f.startTime) / 1000;
        if (elapsed > 0.5) {
          return false;
        }
        const y = baseY - (f.layer + 1) * (BLOCK_HEIGHT - 2) + scroll;
        const alpha = Math.max(0, 1 - elapsed * 2);
        ctx.fillStyle = `rgba(255,255,200,${alpha * 0.4})`;
        ctx.fillRect(0, y - 5, width, BLOCK_HEIGHT + 10);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("完美!", width / 2, y - 10 - elapsed * 30);
        ctx.globalAlpha = 1;
        return true;
      });

      animFrameRef.current = requestAnimationFrame(render);
    }

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [blocks, movingBlock, spectator, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, cursor: onClick ? "pointer" : "default", display: "block" }}
      onClick={onClick}
      onTouchStart={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        }
      }}
    />
  );
});

export default StackCanvas;
