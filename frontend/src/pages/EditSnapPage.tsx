import { useLocation, useNavigate } from "react-router-dom";
import { SnapEditor } from "@/components/SnapEditor";
import type { CaptureResult } from "@/hooks/useCamera";

type EditState = CaptureResult & { toStory?: boolean };

export function EditSnapPage() {
  const nav = useNavigate();
  const location = useLocation();
  const capture = location.state as EditState | null;

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
        const next: EditState = {
          blob,
          mediaType: "image",
          previewUrl,
          toStory: capture.toStory,
        };
        nav("/send", { state: next });
      }}
    />
  );
}
