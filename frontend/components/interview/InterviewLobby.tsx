"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Video,
  Lock,
  Eye,
  Info,
  Clock,
  Briefcase,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { InterviewSessionResponse } from "@/lib/types";

interface InterviewLobbyProps {
  session: InterviewSessionResponse;
  onJoin: (consents: { recording: boolean; transcript: boolean; integrity: boolean }) => void;
  isJoining?: boolean;
}

export function InterviewLobby({ session, onJoin, isJoining = false }: InterviewLobbyProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [selectedAudioId, setSelectedAudioId] = useState<string>("");

  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Consents
  const [consentRecording, setConsentRecording] = useState(Boolean(session.consent_recording));
  const [consentTranscript, setConsentTranscript] = useState(true);
  const [consentIntegrity, setConsentIntegrity] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize Media Stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function initMedia() {
      setPermissionError(null);
      try {
        const constraints: MediaStreamConstraints = {
          video: selectedVideoId ? { deviceId: { exact: selectedVideoId } } : true,
          audio: selectedAudioId ? { deviceId: { exact: selectedAudioId } } : true,
        };

        const media = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = media;
        setStream(media);

        if (videoRef.current) {
          videoRef.current.srcObject = media;
        }

        // Enumerate devices for pickers
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vDevs = devices.filter((d) => d.kind === "videoinput");
        const aDevs = devices.filter((d) => d.kind === "audioinput");
        setVideoDevices(vDevs);
        setAudioDevices(aDevs);

        if (!selectedVideoId && vDevs[0]) setSelectedVideoId(vDevs[0].deviceId);
        if (!selectedAudioId && aDevs[0]) setSelectedAudioId(aDevs[0].deviceId);

        // Set up Audio Visualizer
        try {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          const source = audioCtx.createMediaStreamSource(media);
          source.connect(analyser);

          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkAudio = () => {
            if (analyserRef.current) {
              analyserRef.current.getByteFrequencyData(dataArray);
              const sum = dataArray.reduce((acc, v) => acc + v, 0);
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            }
            animFrameRef.current = requestAnimationFrame(checkAudio);
          };
          checkAudio();
        } catch (audioErr) {
          console.warn("Audio meter visualizer not supported:", audioErr);
        }
      } catch (err: unknown) {
        console.error("Camera/Mic access error:", err);
        const message =
          err instanceof Error
            ? err.message
            : "Could not access camera or microphone. Please ensure permissions are granted.";
        setPermissionError(message);
      }
    }

    if (typeof window !== "undefined" && Boolean(navigator?.mediaDevices?.getUserMedia)) {
      initMedia();
    } else {
      setPermissionError("Your browser does not support media device access.");
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [selectedVideoId, selectedAudioId]);

  const toggleVideo = () => {
    if (stream) {
      const vTrack = stream.getVideoTracks()[0];
      if (vTrack) {
        vTrack.enabled = !vTrack.enabled;
        setIsVideoEnabled(vTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const aTrack = stream.getAudioTracks()[0];
      if (aTrack) {
        aTrack.enabled = !aTrack.enabled;
        setIsAudioEnabled(aTrack.enabled);
      }
    }
  };

  const handleStart = () => {
    // Stop local preview stream before joining Daily call to prevent camera lock
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    onJoin({
      recording: consentRecording,
      transcript: consentTranscript,
      integrity: consentIntegrity,
    });
  };

  const isReady = !permissionError && stream !== null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pale-blue text-venice-blue border border-border text-xs font-medium mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-venice-blue" />
          <span>Candidate Interview Lobby</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-primary-text mb-2">
          Ready for your {session.role_title} Interview?
        </h1>
        <p className="text-sm text-secondary-text max-w-xl mx-auto">
          Test your audio and video before meeting Robin, your AI interviewer. Confirm your practice
          preferences to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Camera Preview & Device Test */}
        <div className="lg:col-span-7 space-y-4">
          <div className="editorial-card rounded-xl overflow-hidden p-4 bg-white border border-border shadow-sm">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-dark-navy flex items-center justify-center">
              {permissionError ? (
                <div className="p-6 text-center text-white max-w-sm">
                  <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
                  <p className="font-semibold text-sm mb-1">Device Access Required</p>
                  <p className="text-xs text-white/70 mb-4">{permissionError}</p>
                  <p className="text-[11px] text-white/50">
                    Allow camera and microphone permissions in your browser address bar to proceed.
                  </p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transform -scale-x-100 ${
                      !isVideoEnabled ? "hidden" : ""
                    }`}
                  />
                  {!isVideoEnabled && (
                    <div className="text-center text-white/70">
                      <CameraOff className="w-12 h-12 mx-auto mb-2 text-white/40" />
                      <p className="text-sm font-medium">Camera is turned off</p>
                    </div>
                  )}

                  {/* Overlay Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-black/60 text-white backdrop-blur-md flex items-center gap-1.5 border border-white/10">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Self Preview
                    </span>
                  </div>

                  {/* Mic Activity Meter Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2.5">
                      <Mic className={`w-3.5 h-3.5 ${isAudioEnabled ? "text-emerald-400" : "text-danger"}`} />
                      <div className="flex items-center gap-0.5 h-3">
                        {[0.1, 0.25, 0.45, 0.65, 0.85].map((threshold, idx) => (
                          <span
                            key={idx}
                            className={`w-1 rounded-full transition-all duration-75 ${
                              isAudioEnabled && audioLevel > threshold * 100
                                ? "h-3 bg-emerald-400"
                                : "h-1 bg-white/30"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-white/70 font-mono">
                        {isAudioEnabled ? (audioLevel > 15 ? "Speaking" : "Quiet") : "Muted"}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* In-Lobby Controls */}
            <div className="flex items-center justify-center gap-3 mt-4 pt-2 border-t border-border-subtle">
              <Button
                variant={isVideoEnabled ? "secondary" : "highlight"}
                size="sm"
                onClick={toggleVideo}
                disabled={!stream}
                leftIcon={isVideoEnabled ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4 text-danger" />}
              >
                {isVideoEnabled ? "Turn Camera Off" : "Turn Camera On"}
              </Button>
              <Button
                variant={isAudioEnabled ? "secondary" : "highlight"}
                size="sm"
                onClick={toggleAudio}
                disabled={!stream}
                leftIcon={isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-danger" />}
              >
                {isAudioEnabled ? "Mute Microphone" : "Unmute Microphone"}
              </Button>
            </div>

            {/* Device Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="block text-[11px] font-medium text-secondary-text mb-1">
                  Camera Source
                </label>
                <select
                  value={selectedVideoId}
                  onChange={(e) => setSelectedVideoId(e.target.value)}
                  disabled={videoDevices.length === 0}
                  className="w-full text-xs bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-primary-text focus:outline-none focus:border-venice-blue"
                >
                  {videoDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-secondary-text mb-1">
                  Microphone Source
                </label>
                <select
                  value={selectedAudioId}
                  onChange={(e) => setSelectedAudioId(e.target.value)}
                  disabled={audioDevices.length === 0}
                  className="w-full text-xs bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-primary-text focus:outline-none focus:border-venice-blue"
                >
                  {audioDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Microphone ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Data Privacy Transparency Box */}
          <div className="p-4 rounded-xl bg-pale-blue/60 border border-border text-xs text-secondary-text space-y-2">
            <div className="flex items-center gap-2 text-primary-text font-semibold text-xs">
              <Lock className="w-3.5 h-3.5 text-venice-blue" />
              <span>Transparent Candidate Privacy</span>
            </div>
            <p className="leading-relaxed">
              <strong>Stored securely:</strong> Spoken answer transcript, speech pace (WPM), filler word counts, and STAR rubric feedback.
            </p>
            <p className="leading-relaxed">
              <strong>Never stored or shared:</strong> Biometric facial prints, background browsing tabs, or video footage (unless you opt into recording).
            </p>
          </div>
        </div>

        {/* Right Column: Session Overview & Consents */}
        <div className="lg:col-span-5 space-y-4">
          {/* Session Overview Card */}
          <div className="editorial-card rounded-xl p-5 bg-white border border-border space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-secondary-text">
              Interview Overview
            </h2>

            <div className="space-y-3">
              <div className="flex items-start justify-between pb-3 border-b border-border-subtle">
                <span className="text-xs text-secondary-text flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-venice-blue" /> Target Role
                </span>
                <span className="text-xs font-semibold text-primary-text text-right">
                  {session.role_title} ({session.company_name})
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <span className="text-xs text-secondary-text flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-venice-blue" /> Duration Guide
                </span>
                <span className="text-xs font-semibold text-primary-text">
                  ~{session.duration_minutes} minutes
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <span className="text-xs text-secondary-text flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-venice-blue" /> Total Questions
                </span>
                <span className="text-xs font-semibold text-primary-text">
                  {session.num_questions} structured questions
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary-text flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-venice-blue" /> AI Avatar
                </span>
                <Badge variant="verified">Robin (Indian Professional)</Badge>
              </div>
            </div>
          </div>

          {/* Consent Checklist */}
          <div className="editorial-card rounded-xl p-5 bg-white border border-border space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-secondary-text">
              Interview Consents & Options
            </h2>

            <div className="space-y-3">
              {/* Required Consent 1 */}
              <label className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-2/60 border border-border-subtle cursor-default">
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="mt-0.5 rounded text-venice-blue focus:ring-venice-blue accent-venice-blue"
                />
                <div className="text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-primary-text">
                    <span>Camera & Microphone Access</span>
                    <Badge variant="highlight">Required</Badge>
                  </div>
                  <p className="text-[11px] text-secondary-text mt-0.5">
                    Permits real-time video dialog with your interviewer.
                  </p>
                </div>
              </label>

              {/* Required Consent 2 */}
              <label className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-2/60 border border-border-subtle cursor-default">
                <input
                  type="checkbox"
                  checked={consentTranscript}
                  disabled
                  onChange={(e) => setConsentTranscript(e.target.checked)}
                  className="mt-0.5 rounded text-venice-blue focus:ring-venice-blue accent-venice-blue"
                />
                <div className="text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-primary-text">
                    <span>Transcript Storage & AI Evaluation</span>
                    <Badge variant="highlight">Required</Badge>
                  </div>
                  <p className="text-[11px] text-secondary-text mt-0.5">
                    Transcripts are evaluated to produce your personalized score report.
                  </p>
                </div>
              </label>

              {/* Optional Consent 3: Integrity */}
              <label className="flex items-start gap-3 p-2.5 rounded-lg border border-border hover:bg-surface-2/40 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={consentIntegrity}
                  onChange={(e) => setConsentIntegrity(e.target.checked)}
                  className="mt-0.5 rounded text-venice-blue focus:ring-venice-blue accent-venice-blue"
                />
                <div className="text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-primary-text">
                    <Eye className="w-3.5 h-3.5 text-rock-blue" />
                    <span>Practice Integrity Monitoring</span>
                    <Badge variant="verified">Recommended</Badge>
                  </div>
                  <p className="text-[11px] text-secondary-text mt-0.5">
                    Tracks tab switches & camera presence locally to build professional focus habits.
                  </p>
                </div>
              </label>

              {/* Optional Consent 4: Recording */}
              <label className="flex items-start gap-3 p-2.5 rounded-lg border border-border hover:bg-surface-2/40 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={consentRecording}
                  onChange={(e) => setConsentRecording(e.target.checked)}
                  className="mt-0.5 rounded text-venice-blue focus:ring-venice-blue accent-venice-blue"
                />
                <div className="text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-primary-text">
                    <Video className="w-3.5 h-3.5 text-secondary-text" />
                    <span>Save Video Replay</span>
                    <span className="text-[10px] text-secondary-text">(Optional)</span>
                  </div>
                  <p className="text-[11px] text-secondary-text mt-0.5">
                    Records the conversation for self-review. Only enabled if checked.
                  </p>
                </div>
              </label>
            </div>

            {/* Enter Button */}
            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                className="w-full text-base font-semibold py-3.5 shadow-md"
                onClick={handleStart}
                disabled={!isReady || isJoining}
                isLoading={isJoining}
                rightIcon={<CheckCircle2 className="w-5 h-5" />}
              >
                {isJoining ? "Joining Room..." : "Enter Interview Room"}
              </Button>
              {!isReady && !permissionError && (
                <p className="text-[11px] text-center text-secondary-text mt-2 flex items-center justify-center gap-1">
                  <Info className="w-3 h-3" /> Initializing media stream...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
