import { useLocation, useNavigate } from "react-router-dom";
import { SnapEditor } from "@/components/SnapEditor";
import type { CaptureResult } from "@/hooks/useCamera";

export function EditSnapPage() {
  const nav = useNavigate();
  const location = useLocation();
  const capture = location.state as CaptureResult | null;

  if (!capture) {
    nav("/app", { replace: true });
    return null;
  }

  // Videos skip editor — go straight to send
  if (capture.mediaType === "video") {
    nav("/send", { replace: true, state: capture });
    return null;
  }

  return (
    <SnapEditor
      imageUrl={capture.previewUrl}
      onRetake={() => {
        URL.revokeObjectURL(capture.previewUrl);
        nav("/app", { replace: true });
      }}
      onSkip={() => nav("/send", { state: capture })}
      onDone={(blob, previewUrl) => {
        URL.revokeObjectURL(capture.previewUrl);
        const next: CaptureResult = {
          blob,
          mediaType: "image",
          previewUrl,
        };
        nav("/send", { state: next });
      }}
    />
  );
}
