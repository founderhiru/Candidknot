import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";

// Keep the native splash screen up until session restoration resolves (see
// app/index.tsx), so there's no flash of "logged out" content before we
// know the real answer.
SplashScreen.preventAutoHideAsync().catch(() => {
  // no-op — if this fails (e.g. already hidden), the app still works,
  // it just briefly shows a blank frame instead of the native splash.
});

export default function RootLayout() {
  const { isPending } = useSession();

  useEffect(() => {
    if (!isPending) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isPending]);

  return <Slot />;
}
