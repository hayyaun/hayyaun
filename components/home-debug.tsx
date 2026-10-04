"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const HomeDebugPanel = dynamic(() => import("./home-debug-panel"), { ssr: false });

export default function HomeDebug() {
  const params = useSearchParams();
  const debug = params.has("debug") && !["0", "false"].includes(params.get("debug") ?? "");

  return debug ? <HomeDebugPanel /> : null;
}
