import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 300, lineHeight: 1 }}>🐯</div>
        <div
          style={{
            fontSize: 56,
            fontWeight: "bold",
            color: "black",
            letterSpacing: "-1px",
          }}
        >
          買い物アプリ
        </div>
      </div>
    ),
    { ...size }
  );
}
