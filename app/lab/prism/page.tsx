import type { Metadata } from "next";
import PrismLab from "./prism-lab";

export const metadata: Metadata = {
  title: "Prism study — Hayyaun",
  description: "A glass prism reflecting a hidden silver studio environment.",
  robots: { index: false, follow: false },
};

export default function PrismPage() {
  return <main style={{ position: "fixed", inset: 0, background: "white", color: "#34303d" }}><h1 className="sr-only">Glass prism studio study</h1><PrismLab /></main>;
}

