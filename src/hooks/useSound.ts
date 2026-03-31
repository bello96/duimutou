import { useCallback, useRef } from "react";

type SoundName =
  | "drop"
  | "perfect"
  | "cut"
  | "levelUp"
  | "gameOver"
  | "win"
  | "lose"
  | "tick"
  | "go";

function renderBuffer(
  ctx: AudioContext,
  duration: number,
  fn: (t: number, i: number, sampleRate: number) => number,
): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * duration);
  const buf = ctx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = fn(i / sr, i, sr);
  }
  return buf;
}

function buildSounds(ctx: AudioContext): Record<SoundName, AudioBuffer> {
  const sin = (f: number, t: number) => Math.sin(2 * Math.PI * f * t);
  const env = (t: number, d: number) => Math.max(0, 1 - t / d);
  const tri = (f: number, t: number) => {
    const p = (t * f) % 1;
    return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
  };

  return {
    drop: renderBuffer(ctx, 0.15, (t) => sin(600, t) * env(t, 0.15) * 0.3),

    perfect: renderBuffer(ctx, 0.4, (t) => {
      const f = t < 0.1 ? 880 : t < 0.2 ? 1108 : t < 0.3 ? 1318 : 1760;
      return sin(f, t) * env(t, 0.4) * 0.25;
    }),

    cut: renderBuffer(ctx, 0.2, (t) => {
      const f = 300 - t * 800;
      return tri(Math.max(f, 80), t) * env(t, 0.2) * 0.3;
    }),

    levelUp: renderBuffer(ctx, 0.5, (t) => {
      const f = t < 0.12 ? 523 : t < 0.24 ? 659 : t < 0.36 ? 784 : 1046;
      return (sin(f, t) + sin(f * 2, t) * 0.3) * env(t, 0.5) * 0.2;
    }),

    gameOver: renderBuffer(ctx, 0.6, (t) => {
      const f = t < 0.15 ? 330 : t < 0.3 ? 277 : t < 0.45 ? 233 : 196;
      return (sin(f, t) + tri(f * 0.5, t) * 0.5) * env(t, 0.6) * 0.25;
    }),

    win: renderBuffer(ctx, 0.6, (t) => {
      const f = t < 0.1 ? 523 : t < 0.2 ? 659 : t < 0.3 ? 784 : t < 0.4 ? 1046 : 1318;
      return (sin(f, t) + sin(f * 2, t) * 0.3) * env(t, 0.6) * 0.2;
    }),

    lose: renderBuffer(ctx, 0.6, (t) => {
      const f = t < 0.15 ? 330 : t < 0.3 ? 277 : t < 0.45 ? 233 : 196;
      return (sin(f, t) + tri(f * 0.5, t) * 0.5) * env(t, 0.6) * 0.25;
    }),

    tick: renderBuffer(ctx, 0.08, (t) => sin(1800, t) * env(t, 0.08) * 0.2),

    go: renderBuffer(ctx, 0.3, (t) => {
      const f = t < 0.15 ? 784 : 1046;
      return sin(f, t) * env(t, 0.3) * 0.25;
    }),
  };
}

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const bufRef = useRef<Record<SoundName, AudioBuffer> | null>(null);
  const compRef = useRef<DynamicsCompressorNode | null>(null);

  const ensure = useCallback(() => {
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const comp = ctx.createDynamicsCompressor();
      comp.connect(ctx.destination);
      compRef.current = comp;
      bufRef.current = buildSounds(ctx);
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
  }, []);

  const play = useCallback((name: SoundName) => {
    ensure();
    const ctx = ctxRef.current!;
    const buf = bufRef.current![name];
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = 0.6;
    src.connect(gain).connect(compRef.current!);
    src.start();
  }, [ensure]);

  return { play, ensure };
}
