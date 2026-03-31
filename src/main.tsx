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
        "game-bg": "#2c1810",
        "game-dark": "#1a0e08",
        "game-panel": "#3d2317",
        "player-a": "#4cc9f0",
        "player-b": "#f72585",
        gold: "#ffd700",
      },
    },
  },
});

createRoot(document.getElementById("root")!).render(<App />);
