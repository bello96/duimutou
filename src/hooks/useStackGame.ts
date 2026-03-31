import { useCallback, useEffect, useRef, useState } from "react";
import type { StackBlock, StackCanvasHandle } from "../components/StackCanvas";
import {
  calculateDrop,
  getLevel,
  getSpeed,
  INITIAL_WIDTH_RATIO,
} from "../utils/stack";

export interface GameStats {
  score: number;
  layer: number;
  combo: number;
  level: number;
  blockWidth: number;
  blockLeft: number;
  perfect: boolean;
}

interface UseStackGameOptions {
  canvasWidth: number;
  canvasRef: React.RefObject<StackCanvasHandle | null>;
  onDrop?: (stats: GameStats) => void;
  onGameOver?: (stats: GameStats) => void;
  paused?: boolean;
}

export function useStackGame({
  canvasWidth,
  canvasRef,
  onDrop,
  onGameOver,
  paused = false,
}: UseStackGameOptions) {
  const [blocks, setBlocks] = useState<StackBlock[]>([]);
  const [movingBlock, setMovingBlock] = useState<{
    left: number;
    width: number;
    layer: number;
  } | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [layer, setLayer] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  const dirRef = useRef(1);
  const animRef = useRef(0);
  const droppingRef = useRef(false);
  const gameOverRef = useRef(false);
  const blocksRef = useRef<StackBlock[]>([]);
  const comboRef = useRef(0);
  const scoreRef = useRef(0);
  const layerRef = useRef(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const start = useCallback(() => {
    const initialWidth = Math.floor(canvasWidth * INITIAL_WIDTH_RATIO);
    const initialLeft = Math.floor((canvasWidth - initialWidth) / 2);
    const baseBlock: StackBlock = { left: initialLeft, width: initialWidth, layer: 0 };

    blocksRef.current = [baseBlock];
    comboRef.current = 0;
    scoreRef.current = 0;
    layerRef.current = 0;
    gameOverRef.current = false;
    droppingRef.current = false;
    dirRef.current = 1;

    setBlocks([baseBlock]);
    setScore(0);
    setCombo(0);
    setLayer(0);
    setGameOver(false);
    setStarted(true);

    const nextLayer = 1;
    const nextWidth = initialWidth;
    setMovingBlock({ left: 0, width: nextWidth, layer: nextLayer });
    layerRef.current = nextLayer;
    setLayer(nextLayer);
  }, [canvasWidth]);

  useEffect(() => {
    if (!started || gameOver || !movingBlock) {
      return;
    }

    let lastTime = performance.now();

    function tick(now: number) {
      if (gameOverRef.current || droppingRef.current || pausedRef.current) {
        animRef.current = requestAnimationFrame(tick);
        return;
      }
      const dt = (now - lastTime) / 16.67;
      lastTime = now;

      setMovingBlock((prev) => {
        if (!prev) {
          return prev;
        }
        const speed = getSpeed(prev.layer) * dt;
        let newLeft = prev.left + speed * dirRef.current;
        if (newLeft + prev.width > canvasWidth) {
          newLeft = canvasWidth - prev.width;
          dirRef.current = -1;
        } else if (newLeft < 0) {
          newLeft = 0;
          dirRef.current = 1;
        }
        return { ...prev, left: newLeft };
      });

      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [started, gameOver, movingBlock, canvasWidth]);

  const drop = useCallback(() => {
    if (!movingBlock || droppingRef.current || gameOverRef.current || pausedRef.current) {
      return;
    }
    droppingRef.current = true;

    const currentBlocks = blocksRef.current;
    const prevBlock = currentBlocks[currentBlocks.length - 1]!;
    const result = calculateDrop(
      { left: movingBlock.left, width: movingBlock.width },
      { left: prevBlock.left, width: prevBlock.width },
      movingBlock.layer,
      comboRef.current,
    );

    if (result.stayed.width <= 0) {
      gameOverRef.current = true;
      setGameOver(true);
      setMovingBlock(null);
      canvasRef.current?.collapseAll();
      const stats: GameStats = {
        score: scoreRef.current,
        layer: layerRef.current - 1,
        combo: comboRef.current,
        level: getLevel(layerRef.current - 1),
        blockWidth: 0,
        blockLeft: 0,
        perfect: false,
      };
      onGameOver?.(stats);
      return;
    }

    if (result.cut) {
      canvasRef.current?.addFalling(result.cut.left, result.cut.width, movingBlock.layer);
    }
    if (result.perfect) {
      canvasRef.current?.addFlash(movingBlock.layer);
    }

    const newBlock: StackBlock = {
      left: result.stayed.left,
      width: result.stayed.width,
      layer: movingBlock.layer,
    };
    const newBlocks = [...currentBlocks, newBlock];
    blocksRef.current = newBlocks;
    setBlocks(newBlocks);

    const newCombo = result.perfect ? comboRef.current + 1 : 0;
    comboRef.current = newCombo;
    setCombo(newCombo);

    const newScore = scoreRef.current + result.score;
    scoreRef.current = newScore;
    setScore(newScore);

    const stats: GameStats = {
      score: newScore,
      layer: movingBlock.layer,
      combo: newCombo,
      level: getLevel(movingBlock.layer),
      blockWidth: result.stayed.width,
      blockLeft: result.stayed.left,
      perfect: result.perfect,
    };
    onDrop?.(stats);

    const nextLayer = movingBlock.layer + 1;
    layerRef.current = nextLayer;
    setLayer(nextLayer);
    dirRef.current = dirRef.current * -1;
    const startLeft = dirRef.current > 0 ? 0 : canvasWidth - result.stayed.width;
    setMovingBlock({ left: startLeft, width: result.stayed.width, layer: nextLayer });

    droppingRef.current = false;
  }, [movingBlock, canvasWidth, canvasRef, onDrop, onGameOver]);

  return {
    blocks,
    movingBlock,
    score,
    combo,
    layer,
    level: getLevel(layer),
    gameOver,
    started,
    start,
    drop,
  };
}
