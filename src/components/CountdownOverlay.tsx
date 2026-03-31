import { useEffect, useRef, useState } from "react";

interface Props {
  startsAt: number;
  onDone: () => void;
  playTick?: () => void;
  playGo?: () => void;
}

export default function CountdownOverlay({ startsAt, onDone, playTick, playGo }: Props) {
  const [display, setDisplay] = useState<string | null>(null);
  const doneRef = useRef(false);
  const lastNumRef = useRef(0);

  useEffect(() => {
    function tick() {
      const remaining = startsAt - Date.now();
      if (remaining <= 0) {
        if (!doneRef.current) {
          doneRef.current = true;
          setDisplay("GO!");
          playGo?.();
          setTimeout(() => {
            setDisplay(null);
            onDone();
          }, 400);
        }
        return;
      }
      const sec = Math.ceil(remaining / 1000);
      if (sec !== lastNumRef.current && sec <= 3 && sec >= 1) {
        lastNumRef.current = sec;
        playTick?.();
      }
      setDisplay(sec <= 3 ? String(sec) : null);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [startsAt, onDone, playTick, playGo]);

  if (!display) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
      <div
        className="text-8xl font-black text-amber-600 drop-shadow-lg"
        style={{
          animation: "countdown-pop 0.4s ease-out",
        }}
        key={display}
      >
        {display}
        <style>{`@keyframes countdown-pop{0%{transform:scale(2);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>
      </div>
    </div>
  );
}
