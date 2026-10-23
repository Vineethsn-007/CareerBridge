import { ImageResponse } from "next/og";

export const alt = "CareerBridge | AI Career Acceleration for Indian Students";
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
          background: "#0A0B14",
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
            background: "linear-gradient(135deg, #6366F1 0%, #22D3EE 100%)",
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
            fontSize: 52,
            fontWeight: 800,
            color: "#F4F5FB",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: 16,
          }}
        >
          From Campus to Verified Tech Career
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#9AA0BE",
            textAlign: "center",
          }}
        >
          Verified Fresher Listings • Skill Gap Roadmaps • AI Mock Interviews
        </div>
      </div>
    ),
    { ...size }
  );
}
