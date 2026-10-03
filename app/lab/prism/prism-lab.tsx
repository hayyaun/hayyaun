"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import styles from "./prism.module.css";

function Fallback() {
  return (
    <div className={styles.fallback} role="img" aria-label="Glass prism">
      <div className={styles.prism} />
    </div>
  );
}
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <>
        <Fallback />
        <p className={styles.notice}>The 3D scene is unavailable on this device.</p>
      </>
    ) : (
      this.props.children
    );
  }
}
const Scene = dynamic(() => import("./lab-controls"), { ssr: false, loading: Fallback });
export default function PrismLab() {
  return (
    <div className={styles.container}>
      <SceneBoundary>
        <Scene />
      </SceneBoundary>
      <noscript>
        <Fallback />
      </noscript>
    </div>
  );
}
