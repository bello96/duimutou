export const BLOCK_COLORS = ["#b5854b", "#8B6914", "#A0522D", "#CD853F"];
export const BLOCK_HEIGHT = 24;
export const INITIAL_WIDTH_RATIO = 0.7;
export const PERFECT_THRESHOLD = 3;
export const MAX_LAYERS = 50;

export function getSpeed(layer: number): number {
  return 2 + Math.log(layer + 1) * 1.5;
}

export function getLevel(layer: number): number {
  return Math.floor(layer / 10) + 1;
}

export interface Block {
  left: number;
  width: number;
  color: string;
  layer: number;
}

export interface DropResult {
  stayed: { left: number; width: number };
  cut: { left: number; width: number } | null;
  cutSide: "left" | "right" | "none" | "all";
  perfect: boolean;
  score: number;
}

export function calculateDrop(
  current: { left: number; width: number },
  previous: { left: number; width: number },
  layer: number,
  combo: number,
): DropResult {
  const cLeft = current.left;
  const cRight = cLeft + current.width;
  const pLeft = previous.left;
  const pRight = pLeft + previous.width;

  const overlapLeft = Math.max(cLeft, pLeft);
  const overlapRight = Math.min(cRight, pRight);
  const overlapWidth = overlapRight - overlapLeft;

  if (overlapWidth <= 0) {
    return {
      stayed: { left: cLeft, width: 0 },
      cut: null,
      cutSide: "all",
      perfect: false,
      score: 0,
    };
  }

  const diff = Math.abs(current.width - overlapWidth);

  if (diff < PERFECT_THRESHOLD) {
    const baseScore = Math.floor(
      (previous.width / 10) * Math.log(layer + 1),
    );
    return {
      stayed: { left: previous.left, width: previous.width },
      cut: null,
      cutSide: "none",
      perfect: true,
      score: baseScore * 2 + combo * 5,
    };
  }

  const stayed = { left: overlapLeft, width: overlapWidth };
  let cutBlock: { left: number; width: number };
  let cutSide: "left" | "right";

  if (cLeft < pLeft) {
    cutBlock = { left: cLeft, width: pLeft - cLeft };
    cutSide = "left";
  } else {
    cutBlock = { left: overlapRight, width: cRight - overlapRight };
    cutSide = "right";
  }

  const baseScore = Math.floor(
    (overlapWidth / 10) * Math.log(layer + 1),
  );

  return {
    stayed,
    cut: cutBlock,
    cutSide,
    perfect: false,
    score: baseScore,
  };
}
