"use client";

import React, { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { InterviewSessionResponse, ClientQuestion } from "@/lib/types";
import { InterviewLobby } from "@/components/interview/InterviewLobby";
import { InterviewHeader } from "@/components/interview/InterviewHeader";
import { DailyAvatarCall, DailyAvatarCallHandle } from "@/components/interview/DailyAvatarCall";
import { CandidateSelfView } from "@/components/interview/CandidateSelfView";
import { QuestionProgressCard } from "@/components/interview/QuestionProgressCard";
import { LiveTranscriptBox, TranscriptItem } from "@/components/interview/LiveTranscriptBox";
import { EndInterviewModal } from "@/components/interview/EndInterviewModal";
import { WaitingReportView } from "@/components/interview/WaitingReportView";
import { useIntegrityMonitor } from "@/components/interview/useIntegrityMonitor";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

interface InterviewRoomPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function InterviewRoomPage({ params }: InterviewRoomPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const sessionId = resolvedParams.sessionId;

  const [session, setSession] = useState<InterviewSessionResponse | null>(null);
  const [viewState, setViewState] = useState<"loading" | "lobby" | "live" | "waiting" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live room state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);

  // Media & device state for live candidate view
  const [candidateStream, setCandidateStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Consents chosen in lobby
  const [consents, setConsents] = useState({
    recording: false,
    transcript: true,
    integrity: true,
  });

  // Transcript state
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);

  // Refs
  const avatarCallRef = useRef<DailyAvatarCallHandle | null>(null);
  const candidateVideoRef = useRef<HTMLVideoElement | null>(null);

  // Client-side integrity monitoring
  const { alertsCount, integrityScore } = useIntegrityMonitor({
    sessionId,
    enabled: viewState === "live" && consents.integrity,
    videoElementRef: candidateVideoRef,
  });

  // Fetch session on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchSession() {
      try {
        setViewState("loading");
        const data = await api.getInterviewSession(sessionId);
        if (!isMounted) return;

        setSession(data);

        // Prepopulate transcript with initial greeting if present
        setTranscript([
          {
            sender: "Robin",
            text: `Hello! I'm Robin, your AI interviewer for the ${data.role_title} role at ${data.company_name}. We will go through ${data.num_questions} structured questions. When you finish speaking each answer, please click 'Done Speaking' or say 'I have finished my answer'. Let's begin!`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);

        if (data.status === "ended" || data.status === "processing") {
          setViewState("waiting");
        } else if (data.status === "report_ready" || data.has_report) {
          router.replace(`/candidate/interview/${sessionId}/report`);
        } else {
          setViewState("lobby");
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        console.error("Failed to fetch interview session:", err);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Could not load interview session. Please check your network or session ID."
        );
        setViewState("error");
      }
    }

    fetchSession();

    return () => {
      isMounted = false;
    };
  }, [sessionId, router]);

  // Handle joining from lobby
  const handleJoinFromLobby = async (chosenConsents: {
    recording: boolean;
    transcript: boolean;
    integrity: boolean;
  }) => {
    setConsents(chosenConsents);

    // Initialize candidate webcam stream for in-room self view
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setCandidateStream(media);
    } catch (err) {
      console.warn("Could not acquire candidate media stream for room self-view:", err);
    }

    setViewState("live");
  };

  // Toggle candidate audio/video
  const handleToggleMute = () => {
    if (candidateStream) {
      const aTrack = candidateStream.getAudioTracks()[0];
      if (aTrack) {
        aTrack.enabled = !aTrack.enabled;
        setIsMuted(!aTrack.enabled);
      }
    } else {
      setIsMuted(!isMuted);
    }
  };

  const handleToggleVideo = () => {
    if (candidateStream) {
      const vTrack = candidateStream.getVideoTracks()[0];
      if (vTrack) {
        vTrack.enabled = !vTrack.enabled;
        setIsVideoOff(!vTrack.enabled);
      }
    } else {
      setIsVideoOff(!isVideoOff);
    }
  };

  // Synchronize when candidate clicks "Done Speaking"
  const handleDoneSpeaking = () => {
    if (!session) return;

    // Advance question index
    if (currentQuestionIndex + 1 < session.questions.length) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);

      const nextQ = session.questions[nextIndex];
      // Send explicit Tavus app message instructing Robin to ask the next question
      avatarCallRef.current?.sendRespond(
        `I have completed my answer for that question. Please acknowledge and ask me the next question: "${nextQ.text}"`
      );

      // Add conversational transition to transcript
      setTranscript((prev) => [
        ...prev,
        {
          sender: "You",
          text: "[Marked answer as complete]",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        {
          sender: "Robin",
          text: `Thank you for sharing that. Let's move on to Question ${nextIndex + 1}: ${nextQ.text}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } else {
      // Reached end of questions, signal Robin and open end modal
      avatarCallRef.current?.sendRespond(
        "I have completed my answer for the final question. Thank you!"
      );
      setIsEndModalOpen(true);
    }
  };

  // Skip question
  const handleSkipQuestion = () => {
    if (!session) return;
    if (currentQuestionIndex + 1 < session.questions.length) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      const nextQ = session.questions[nextIndex];
      avatarCallRef.current?.sendRespond(
        `Please skip to the next question: "${nextQ.text}"`
      );

      setTranscript((prev) => [
        ...prev,
        {
          sender: "You",
          text: "[Skipped question]",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        {
          sender: "Robin",
          text: `Understood. Here is Question ${nextIndex + 1}: ${nextQ.text}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  };

  // Repeat question
  const handleRepeatQuestion = () => {
    if (!session) return;
    const currentQ = session.questions[currentQuestionIndex];
    avatarCallRef.current?.sendRespond(
      `Could you please repeat question ${currentQuestionIndex + 1}: "${currentQ.text}"?`
    );
  };

  // Handle incoming utterance from Daily avatar or candidate speech recognition
  const handleAvatarUtterance = (text: string, role: "interviewer" | "candidate") => {
    setTranscript((prev) => [
      ...prev,
      {
        sender: role === "interviewer" ? "Robin" : "You",
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const handleCandidateSpeechRecognized = (text: string) => {
    setTranscript((prev) => [
      ...prev,
      {
        sender: "You",
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // End interview flow
  const handleConfirmEndInterview = async () => {
    try {
      setIsEnding(true);
      // Clean up candidate camera tracks
      if (candidateStream) {
        candidateStream.getTracks().forEach((t) => t.stop());
      }

      await api.endInterviewSession(sessionId, {
        reason: "Candidate concluded session",
        transcript: transcript,
      });
      setIsEndModalOpen(false);
      setViewState("waiting");
    } catch (err) {
      console.error("Failed to end interview session:", err);
      // Proceed to waiting view regardless so candidate is not stuck
      setIsEndModalOpen(false);
      setViewState("waiting");
    } finally {
      setIsEnding(false);
    }
  };

  const currentQuestion: ClientQuestion | undefined = session?.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-merino flex flex-col">
      {/* Loading View */}
      {viewState === "loading" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="w-10 h-10 text-venice-blue animate-spin mb-3" />
          <h2 className="text-base font-serif font-semibold text-primary-text">
            Loading Interview Room...
          </h2>
          <p className="text-xs text-secondary-text mt-1">
            Setting up candidate profile, agenda, and Tavus avatar session.
          </p>
        </div>
      )}

      {/* Error View */}
      {viewState === "error" && (
        <div className="flex-1 max-w-lg mx-auto flex items-center justify-center p-6">
          <ErrorMessage
            title="Interview Room Error"
            message={errorMessage || "Unable to load this interview session."}
            onRetry={() => window.location.reload()}
          />
        </div>
      )}

      {/* Lobby View */}
      {viewState === "lobby" && session && (
        <InterviewLobby
          session={session}
          onJoin={handleJoinFromLobby}
        />
      )}

      {/* Live Interview Room View */}
      {viewState === "live" && session && currentQuestion && (
        <>
          <InterviewHeader
            roleTitle={session.role_title}
            companyName={session.company_name}
            durationMinutes={session.duration_minutes}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={session.questions.length}
            alertsCount={alertsCount}
            integrityEnabled={consents.integrity}
            onEndInterview={() => setIsEndModalOpen(true)}
          />

          <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
            {/* Left Column: Avatar Video Feed (lg:col-span-7) */}
            <div className="lg:col-span-7 flex flex-col space-y-3">
              <DailyAvatarCall
                ref={avatarCallRef}
                conversationUrl={session.conversation_url}
                sessionId={session.session_id}
                onAvatarStartedSpeaking={() => setIsAvatarSpeaking(true)}
                onAvatarStoppedSpeaking={() => setIsAvatarSpeaking(false)}
                onUtterance={handleAvatarUtterance}
              />
            </div>

            {/* Right Column: Candidate Webcam + Question Card + Transcript (lg:col-span-5) */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              {/* Candidate Self View */}
              <CandidateSelfView
                stream={candidateStream}
                isMuted={isMuted}
                onToggleMute={handleToggleMute}
                isVideoOff={isVideoOff}
                onToggleVideo={handleToggleVideo}
                alertsCount={alertsCount}
                integrityScore={integrityScore}
                integrityEnabled={consents.integrity}
                videoElementRef={candidateVideoRef}
              />

              {/* Question Progress Card */}
              <QuestionProgressCard
                question={currentQuestion}
                index={currentQuestionIndex}
                total={session.questions.length}
                onDoneSpeaking={handleDoneSpeaking}
                onSkip={handleSkipQuestion}
                onRepeatQuestion={handleRepeatQuestion}
                isAvatarSpeaking={isAvatarSpeaking}
              />

              {/* Real-time Transcript Box */}
              <LiveTranscriptBox
                transcript={transcript}
                isAvatarSpeaking={isAvatarSpeaking}
                onCandidateSpeechRecognized={handleCandidateSpeechRecognized}
              />
            </div>
          </main>

          {/* End Interview Confirmation Modal */}
          <EndInterviewModal
            isOpen={isEndModalOpen}
            onClose={() => setIsEndModalOpen(false)}
            onConfirmEnd={handleConfirmEndInterview}
            isEnding={isEnding}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={session.questions.length}
          />
        </>
      )}

      {/* Waiting for Report View */}
      {viewState === "waiting" && session && (
        <WaitingReportView
          session={session}
          onReportReady={() => router.push(`/candidate/interview/${sessionId}/report`)}
        />
      )}
    </div>
  );
}
