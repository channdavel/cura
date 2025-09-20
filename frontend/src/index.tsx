import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LandingPage } from "./screens/LandingPage/LandingPage";
import { StatsPage } from "./screens/StatsPage/StatsPage";
import { FeaturesPage } from "./screens/FeaturesPage/FeaturesPage";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <div>
      <LandingPage />
      <StatsPage />
      <FeaturesPage />
    </div>
  </StrictMode>,
);
