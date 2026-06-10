import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerOfflineSW } from "./lib/offline/registerSW";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Fire-and-forget. The wrapper refuses to register in dev / Lovable
// preview / iframes and unregisters any stale app SW it finds there.
void registerOfflineSW();
