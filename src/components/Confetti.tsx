import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  shape: "circle" | "rect" | "strip";
  delay: number;
  duration: number;
  angle: number;
  spread: number;
}

const COLORS = ["#ffd700", "#ff6b6b", "#4cc9f0", "#06d6a0", "#f72585", "#b5854b", "#ff9f43"];

export default function Confetti() {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 10,
      y: 50 + (Math.random() - 0.5) * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      size: 4 + Math.random() * 8,
      shape: (["circle", "rect", "strip"] as const)[Math.floor(Math.random() * 3)]!,
      delay: Math.random() * 0.6,
      duration: 1.8 + Math.random() * 1.5,
      angle: Math.random() * 360,
      spread: 30 + Math.random() * 70,
    })),
  );

  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * p.spread;
        const ty = Math.sin(rad) * p.spread - 40;
        const kf = `confetti-${p.id}`;
        const w = p.shape === "strip" ? p.size * 0.3 : p.size;
        const h = p.shape === "strip" ? p.size * 1.5 : p.size;
        const br = p.shape === "circle" ? "50%" : p.shape === "strip" ? "2px" : "1px";
        return (
          <div key={p.id}>
            <style>{`@keyframes ${kf}{0%{transform:translate(0,0) rotate(0deg);opacity:1}100%{transform:translate(${tx}vw,${ty}vh) rotate(${720 + Math.random() * 720}deg);opacity:0}}`}</style>
            <div
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: w,
                height: h,
                backgroundColor: p.color,
                borderRadius: br,
                animation: `${kf} ${p.duration}s ease-out ${p.delay}s forwards`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
