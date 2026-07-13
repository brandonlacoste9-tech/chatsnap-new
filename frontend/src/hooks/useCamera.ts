import { useCallback, useEffect, useRef, useState } from "react";

export type CaptureResult = {
  blob: Blob;
  mediaType: "image" | "video";
  previewUrl: string;
};

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: facing,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
    } catch {
      setError("camera");
      setReady(false);
    }
  }, [facing, stopStream]);

  useEffect(() => {
    void start();
    return () => stopStream();
  }, [start, stopStream]);

  const flip = useCallback(() => {
    setFacing((f) => (f === "user" ? "environment" : "user"));
  }, []);

  const takePhoto = useCallback(async (): Promise<CaptureResult | null> => {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", 0.9),
    );
    if (!blob) return null;
    return {
      blob,
      mediaType: "image",
      previewUrl: URL.createObjectURL(blob),
    };
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const rec = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm",
    });
    recorderRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    rec.start(100);
    setRecording(true);
  }, []);

  const stopRecording = useCallback(async (): Promise<CaptureResult | null> => {
    const rec = recorderRef.current;
    if (!rec) return null;
    return new Promise((resolve) => {
      rec.onstop = () => {
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        resolve({
          blob,
          mediaType: "video",
          previewUrl: URL.createObjectURL(blob),
        });
      };
      rec.stop();
    });
  }, []);

  return {
    videoRef,
    ready,
    error,
    recording,
    flip,
    takePhoto,
    startRecording,
    stopRecording,
    restart: start,
  };
}
