import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  degradePerformance,
  graphicsQuality,
  isWaitingForPrism,
  isPrismReady,
  markPrismFailed,
  markPrismLoading,
  markPrismReady,
  performanceModes,
  resetGraphicsSettings,
  setPerformanceMode,
  setPrismActive,
  updateGraphicsSettings,
  useGraphicsPerformance,
} from "../lib/graphics-performance.ts";
import { onPanelChange } from "../lib/debug-controls.ts";
import { resetPrismSettings, usePrismDebug } from "../lib/prism-debug.ts";

const initial = { ...useGraphicsPerformance.getState() };
beforeEach(() => useGraphicsPerformance.setState(initial, true));

test("degradation follows every mode and stops at the last", () => {
  for (const mode of performanceModes.slice(1)) {
    degradePerformance();
    assert.equal(useGraphicsPerformance.getState().mode, mode);
  }
  const measurement = useGraphicsPerformance.getState().measurementId;
  degradePerformance();
  assert.equal(useGraphicsPerformance.getState().measurementId, measurement);
});

test("quality is derived and stale compilation cannot mark a new quality ready", () => {
  setPrismActive(true);
  markPrismReady("high");
  assert.equal(isPrismReady(useGraphicsPerformance.getState()), true);
  setPerformanceMode("LOW_PERFORMANCE");
  assert.equal(graphicsQuality(useGraphicsPerformance.getState()), "low");
  markPrismReady("high");
  assert.equal(isWaitingForPrism(useGraphicsPerformance.getState()), true);
  markPrismReady("low");
  assert.equal(isWaitingForPrism(useGraphicsPerformance.getState()), false);
});

test("loading waits, failure and offscreen states release the monitor", () => {
  setPrismActive(true);
  markPrismLoading();
  assert.equal(isWaitingForPrism(useGraphicsPerformance.getState()), true);
  markPrismFailed();
  assert.equal(isWaitingForPrism(useGraphicsPerformance.getState()), false);
  markPrismLoading();
  setPrismActive(false);
  assert.equal(isWaitingForPrism(useGraphicsPerformance.getState()), false);
  setPrismActive(true);
  updateGraphicsSettings({ prismEnabled: false });
  assert.equal(isWaitingForPrism(useGraphicsPerformance.getState()), false);
});

test("Leva initialization and synchronization cannot overwrite current settings", () => {
  updateGraphicsSettings({ waterEnabled: false, fpsThreshold: 24 });
  const change = onPanelChange((waterEnabled) => updateGraphicsSettings({ waterEnabled }));
  const measurement = useGraphicsPerformance.getState().measurementId;
  change(true, "Effects.waterEnabled", { initial: true, fromPanel: false });
  change(true, "Effects.waterEnabled", { initial: false, fromPanel: false });
  assert.equal(useGraphicsPerformance.getState().waterEnabled, false);
  assert.equal(useGraphicsPerformance.getState().fpsThreshold, 24);
  assert.equal(useGraphicsPerformance.getState().measurementId, measurement);
  change(true, "Effects.waterEnabled", { fromPanel: true });
  assert.equal(useGraphicsPerformance.getState().waterEnabled, true);
});

test("explicit reset restores settings and restarts measurement without faking scene readiness", () => {
  setPrismActive(true);
  markPrismReady("high");
  updateGraphicsSettings({ fpsThreshold: 12, warmupSeconds: 8, waterEnabled: false });
  const measurement = useGraphicsPerformance.getState().measurementId;
  resetGraphicsSettings();
  const state = useGraphicsPerformance.getState();
  assert.equal(state.waterEnabled, initial.waterEnabled);
  assert.equal(state.fpsThreshold, initial.fpsThreshold);
  assert.equal(state.warmupRemaining, initial.warmupSeconds);
  assert.equal(state.measurementId, measurement + 1);
  assert.equal(state.prismReadyQuality, "high");
});

test("rotation reset updates the panel even without a mounted scene", () => {
  const control = usePrismDebug.getState().environmentRotationControl.current;
  let display;
  const unsubscribe = control.subscribeDisplay((angles) => {
    display = angles;
  });
  try {
    control.setAxis(0, 25);
    control.setAxis(1, -40);
    resetPrismSettings();
    assert.deepEqual(control.getActualDegrees(), [0, 0, 0]);
    assert.deepEqual(display, [0, 0, 0]);
  } finally {
    unsubscribe();
  }
});
