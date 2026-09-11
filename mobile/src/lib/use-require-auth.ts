import { useState } from "react";
import { useSession } from "@/lib/auth-client";

/**
 * The single mechanism every protected action goes through: call
 * requireAuth(fn) instead of fn() directly. If there's a session, fn runs
 * immediately; if not, the caller's AuthPromptSheet opens instead and fn
 * never runs (the prompt itself sends the guest into the existing auth
 * flow — this hook doesn't retry fn after sign-in, callers navigate to
 * the same place with a session for a fresh view).
 */
export function useRequireAuth() {
  const { data: session, isPending } = useSession();
  const [promptVisible, setPromptVisible] = useState(false);
  const isAuthenticated = !!session;

  function requireAuth(action: () => void) {
    if (isAuthenticated) {
      action();
    } else {
      setPromptVisible(true);
    }
  }

  return {
    isAuthenticated,
    isSessionPending: isPending,
    promptVisible,
    setPromptVisible,
    requireAuth,
  };
}
