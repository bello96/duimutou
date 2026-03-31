import { install } from "@twind/core";
import presetAutoprefix from "@twind/preset-autoprefix";
import presetTailwind from "@twind/preset-tailwind";
import { createRoot } from "react-dom/client";
import App from "./App";

install({
  presets: [presetAutoprefix(), presetTailwind()],
  theme: {
    extend: {
      colors: {
        primary: "#b5854b",
        "primary-dark": "#8B6914",
        "game-bg": "#f5f0eb",
        "game-dark": "#ede5db",
        "game-panel": "#fff8f0",
        "player-a": "#2563eb",
        "player-b": "#dc2626",
        gold: "#f59e0b",
      },
    },
  },
});

createRoot(document.getElementById("root")!).render(<App />);
