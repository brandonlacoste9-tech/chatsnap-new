/** Best-effort vibration for shutter / reactions (no-op if unsupported). */
export function haptic(ms: number | number[] = 12): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(ms);
    }
  } catch {
    /* ignore */
  }
}

export function hapticSnap(): void {
  haptic([8, 30, 12]);
}

export function hapticOk(): void {
  haptic(10);
}
