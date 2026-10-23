"use client";

import React, { useRef, useEffect } from "react";
import { Camera, CameraOff, Mic, MicOff, ShieldCheck, AlertTriangle } from "lucide-react";

interface CandidateSelfViewProps {
  stream: MediaStream | null;
  isMuted: boolean;
  onToggleMute: () => void;
  isVideoOff: boolean;
  onToggleVideo: () => void;
  alertsCount?: number;
  integrityScore?: number;
  integrityEnabled?: boolean;
  videoElementRef?: React.RefObject<HTMLVideoElement | null>;
}

export function CandidateSelfView({
  stream,
  isMuted,
  onToggleMute,
  isVideoOff,
  onToggleVideo,
  alertsCount = 0,
  integrityScore = 100,
  integrityEnabled = false,
  videoElementRef,
}: CandidateSelfViewProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoElementRef?.current || localVideoRef.current;
    if (video && stream) {
      video.srcObject = stream;
    }
  }, [stream, videoElementRef]);

  return (
    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-dark-navy border border-border shadow-sm group">
      {/* Video Element */}
      <video
        ref={videoElementRef || localVideoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transform -scale-x-100 ${
          isVideoOff ? "hidden" : ""
        }`}
      />

      {isVideoOff && (
        <div className="w-full h-full flex flex-col items-center justify-center text-white/50 bg-dark-navy">
          <CameraOff className="w-8 h-8 mb-1" />
          <span className="text-[11px] font-medium">Camera Off</span>
        </div>
      )}

      {/* Top Badges */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5">
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-black/60 text-white backdrop-blur-md border border-white/10">
          You
        </span>

        {integrityEnabled && (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-medium backdrop-blur-md flex items-center gap-1 border ${
              alertsCount > 0
                ? "bg-amber-900/80 text-amber-200 border-amber-500/40"
                : "bg-emerald-950/80 text-emerald-300 border-emerald-500/30"
            }`}
            title="Educational practice cue: monitors focus locally"
          >
            {alertsCount > 0 ? (
              <>
                <AlertTriangle className="w-3 h-3 text-amber-300" />
                <span>{alertsCount} alert{alertsCount > 1 ? "s" : ""}</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Focus: {integrityScore}%</span>
              </>
            )}
          </span>
        )}
      </div>

      {/* Floating Bottom Quick Controls */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-90 transition-opacity">
        <button
          type="button"
          onClick={onToggleMute}
          className={`p-1.5 rounded-md backdrop-blur-md transition-colors ${
            isMuted
              ? "bg-danger text-white hover:bg-danger/90"
              : "bg-black/60 text-white/90 hover:bg-black/80"
          }`}
          title={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={onToggleVideo}
          className={`p-1.5 rounded-md backdrop-blur-md transition-colors ${
            isVideoOff
              ? "bg-danger text-white hover:bg-danger/90"
              : "bg-black/60 text-white/90 hover:bg-black/80"
          }`}
          title={isVideoOff ? "Turn on camera" : "Turn off camera"}
        >
          {isVideoOff ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
