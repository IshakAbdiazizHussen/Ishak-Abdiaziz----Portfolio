import { ImageResponse } from "next/og";

export const alt = "Ishak Abdiaziz — Software & AI Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0b0b0c",
        color: "#ededef",
        padding: 80,
      }}
    >
      <div style={{ display: "flex", fontSize: 26, color: "#5cc8ff" }}>~/ishak</div>
      <div style={{ display: "flex", fontSize: 60, lineHeight: 1.15, maxWidth: 940 }}>
        I build AI systems, then try to break them before anyone else does.
      </div>
      <div style={{ display: "flex", fontSize: 26, color: "#a2a2ab" }}>
        Software &amp; AI Engineer
      </div>
    </div>,
    { ...size },
  );
}
