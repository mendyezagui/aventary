import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./fonts.css";
import "../../../app/tehillim/tehillim.css";
import "./native.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={<div className="scroll-area" />}>
      <App />
    </Suspense>
  </StrictMode>,
);
