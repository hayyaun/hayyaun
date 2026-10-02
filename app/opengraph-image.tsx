import { ImageResponse } from "next/og";

export const alt = "Hayyaun — Clarity. Depth. Character.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ display:"flex", flexDirection:"column", justifyContent:"space-between", width:"100%", height:"100%", background:"#eee8f6", padding:70, color:"#101011", fontFamily:"sans-serif" }}><div style={{fontSize:28}}>Hayyaun</div><div style={{display:"flex", flexDirection:"column", fontSize:95, lineHeight:1, letterSpacing:-5}}><span>Clarity.</span><span>Depth.</span><span>Character.</span></div><div style={{fontSize:24, color:"#655c78"}}>Frontend development, motion, and interactive 3D.</div></div>, size);
}
