import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A one-second countdown for "Resend" buttons. `remaining` is seconds left
 * (0 = ready); `start(n)` (re)starts it. Starts running immediately when
 * `initialSeconds` > 0 — used by the OTP screen, where a code was just sent.
 */
export function useCooldown(initialSeconds = 0) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(
    (seconds: number) => {
      stop();
      setRemaining(seconds);
      if (seconds <= 0) return;
      timer.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            stop();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [stop],
  );

  useEffect(() => {
    if (initialSeconds > 0) start(initialSeconds);
    return stop;
  }, [initialSeconds, start, stop]);

  return { remaining, start };
}
