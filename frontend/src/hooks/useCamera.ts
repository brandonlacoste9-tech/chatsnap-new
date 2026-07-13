import { useCallback, useEffect, useRef, useState } from "react";

export type CaptureResult = {
  blob: Blob;
  mediaType: "image" | "video";
  previewUrl: string;
};

async function waitForVideo(video: HTMLVideoElement, timeoutMs = 4000) {
  if (video.videoWidth > 0 && video.videoHeight > 0) return;
  await new Promise<void>((resolve, reject) => {
    const t = window.setTimeout(
      () => reject(new Error("video timeout")),
      timeoutMs,
    );
    const done = () => {
      window.clearTimeout(t);
      video.removeEventListener("loadeddata", done);
      resolve();
    };
    video.addEventListener("loadeddata", done);
  });
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const startingRef = useRef(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const start = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setError(null);
    stopStream();

    const tryConstraints: MediaStreamConstraints[] = [
      // Photo-first: video only (audio permission often blocks on mobile)
      {
        audio: false,
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      { audio: false, video: true },
    ];

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("unsupported");
        setReady(false);
        return;
      }

      let stream: MediaStream | null = null;
      let lastErr: unknown;
      for (const c of tryConstraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(c);
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!stream) throw lastErr ?? new Error("no stream");

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        try {
          await video.play();
        } catch {
          /* autoplay may need a tap — still mark ready if track live */
        }
        try {
          await waitForVideo(video);
        } catch {
          /* continue even if dimensions lag */
        }
      }
      setReady(true);
      setError(null);
    } catch {
      setError("camera");
      setReady(false);
    } finally {
      startingRef.current = false;
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

    // Wait briefly for dimensions if still 0
    if (!video.videoWidth) {
      try {
        await waitForVideo(video, 2000);
      } catch {
        /* fall through */
      }
    }

    const w = video.videoWidth || 720;
    const h = video.videoHeight || 1280;
    if (w < 2 || h < 2) return null;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Mirror selfie if front camera
    if (facing === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", 0.92),
    );
    if (!blob || blob.size < 100) return null;

    return {
      blob,
      mediaType: "image",
      previewUrl: URL.createObjectURL(blob),
    };
  }, [facing]);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];

    let mimeType = "";
    for (const t of [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4",
    ]) {
      if (
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(t)
      ) {
        mimeType = t;
        break;
      }
    }
    if (typeof MediaRecorder === "undefined") return;

    const rec = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    rec.start(100);
    setRecording(true);
  }, []);

  const stopRecording = useCallback(async (): Promise<CaptureResult | null> => {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") {
      setRecording(false);
      return null;
    }
    return new Promise((resolve) => {
      rec.onstop = () => {
        setRecording(false);
        const type = rec.mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type });
        if (!blob.size) {
          resolve(null);
          return;
        }
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
    facing,
    flip,
    takePhoto,
    startRecording,
    stopRecording,
    restart: start,
  };
}
