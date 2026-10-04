"use client";

import { button, LevaPanel, useControls, useCreateStore } from "leva";
import { useEffect, useState } from "react";
import { resetPrismSettings, usePrismDebug } from "@/lib/prism-debug";
import {
  graphicsQuality,
  resetGraphicsSettings,
  updateGraphicsSettings,
  useGraphicsPerformance,
} from "@/lib/graphics-performance";
import { useGraphicsDebugControls, useGraphicsStatusControls, usePrismDebugControls } from "./home-debug-controls";

export default function HomeDebugPanel() {
  const store = useCreateStore();
  const [message, setMessage] = useState("");
  useGraphicsDebugControls(store);
  usePrismDebugControls(store);
  useGraphicsStatusControls(store);
  useEffect(() => () => updateGraphicsSettings({ showPerf: false }), []);

  useControls(
    () => ({
      "Copy settings": button(async () => {
        const graphics = useGraphicsPerformance.getState();
        const prism = usePrismDebug.getState();
        const settings = {
          prismColor: prism.color,
          autoRotate: prism.autoRotate,
          performance: {
            mode: graphics.mode,
            fpsThreshold: graphics.fpsThreshold,
            warmupSeconds: graphics.warmupSeconds,
            lowSeconds: graphics.lowSeconds,
            showPerf: graphics.showPerf,
          },
          effects: {
            prismEnabled: graphics.prismEnabled,
            waterEnabled: graphics.waterEnabled,
            projectsEnabled: graphics.projectsEnabled,
            quality: graphicsQuality(graphics),
          },
          environmentRotationDegrees: prism.environmentRotationControl.current.getActualDegrees(),
        };
        try {
          await navigator.clipboard.writeText(JSON.stringify(settings));
          setMessage("Copied — paste these values into the chat.");
        } catch {
          setMessage("Could not copy settings. Check browser clipboard permissions.");
        }
      }),
      "Reset defaults": button(() => {
        resetGraphicsSettings();
        resetPrismSettings();
        setMessage("Default settings restored.");
      }),
    }),
    { store }
  );

  return (
    <>
      <LevaPanel store={store} titleBar={{ title: "Home · Debug" }} collapsed={false} />
      <p className="sr-only" role="status">
        {message}
      </p>
    </>
  );
}
