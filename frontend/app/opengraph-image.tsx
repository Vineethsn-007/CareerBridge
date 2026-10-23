import { ImageResponse } from "next/og";

export const alt = "CareerBridge | Your Skills. Your Future. Your CareerBridge.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#F5EEDD",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 80,
        }}
      >
        <div
          style={{
            background: "#16587B",
            borderRadius: 20,
            padding: "12px 28px",
            color: "white",
            fontSize: 28,
            fontWeight: "bold",
            marginBottom: 24,
          }}
        >
          CareerBridge
        </div>
        <div
          style={{
            fontSize: 54,
            fontWeight: 800,
            color: "#104763",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: 16,
            fontFamily: "serif",
          }}
        >
          Your Skills. Your Future. Your CareerBridge.
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#496775",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          Verified Fresher Listings • AI Skill Gap Analysis • Mock Interview Simulator
        </div>
      </div>
    ),
    { ...size }
  );
}
