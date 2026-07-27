import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installDemo } from "./lib/demo";
import { initTheme } from "./lib/theme";

installDemo();
initTheme();

createRoot(document.getElementById("root")!).render(<App />);
