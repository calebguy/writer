import "./index.scss";

import ReactDOM from "react-dom/client";

import { App } from "./app.tsx";

// biome-ignore lint/style/noNonNullAssertion: 🫚
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
