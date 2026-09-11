import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { AuthPromptSheet } from "@/components/AuthPromptSheet";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Skeleton } from "@/components/Skeleton";
import { authClient, useSession } from "@/lib/auth-client";
import type { OwnerProfileItem } from "@/lib/contracts";
import { getOwnerProfile } from "@/lib/owner-profile-api";
import { useRequireAuth } from "@/lib/use-require-auth";
import { spacing, typography } from "@/theme/tokens";

export default function ProfileScreen() {
  const { data: session, isPending: isSessionPending } = useSession();
  const { promptVisible, setPromptVisible } = useRequireAuth();
  const [profile, setProfile] = useState<OwnerProfileItem | null | undefined>(
    undefined,
  );
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const isAuthenticated = !!session;

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setProfileError(null);
    try {
      const result = await getOwnerProfile();
      setProfile(result);
    } catch {
      setProfileError("Couldn't load your profile.");
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await authClient.signOut();
    } catch {
      Alert.alert("Logout failed", "Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  const name = session?.user.name ?? null;
  const contact = session?.user.email ?? session?.user.phoneNumber ?? "";

  // Guest-first: no session content to show at all, so a guest sees a
  // sign-in prompt for the whole tab rather than an empty account shell.
  if (!isSessionPending && !isAuthenticated) {
    return (
      <Screen>
        <EmptyState
          title="You're browsing as a guest"
          message="Sign in to set up your profile and manage your account."
          actionLabel="Sign In"
          onAction={() => setPromptVisible(true)}
        />
        <AuthPromptSheet
          visible={promptVisible}
          onClose={() => setPromptVisible(false)}
          message="Sign in to access your profile."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Avatar name={name} size={80} />
          <Text style={[typography.title, styles.name]}>
            {name ?? "Add your name"}
          </Text>
          {profile?.city ? (
            <View style={styles.locationRow}>
              <Text style={typography.bodyMuted}>📍 {profile.city}</Text>
            </View>
          ) : null}
        </View>

        <Card style={styles.aboutCard}>
          <SectionHeader
            title="About Me"
            action={{
              label: profile ? "Edit" : "Set up",
              onPress: () => router.push("/(app)/(tabs)/profile/edit"),
            }}
          />
          {profile === undefined && !profileError ? (
            <View style={styles.skeletonWrap}>
              <Skeleton height={16} width="90%" />
              <Skeleton height={16} width="70%" style={styles.skeletonGap} />
            </View>
          ) : profileError ? (
            <ErrorText>{profileError}</ErrorText>
          ) : profile ? (
            <Text style={typography.body}>{profile.bio}</Text>
          ) : (
            <Text style={typography.bodyMuted}>
              Set up your profile so other owners know a bit about you.
            </Text>
          )}
        </Card>

        <Card style={styles.contactCard}>
          <SectionHeader title="Account" />
          <View style={styles.contactRow}>
            <Text style={typography.bodyMuted}>Contact</Text>
            <Text style={typography.body}>{contact}</Text>
          </View>
        </Card>

        <View style={styles.myDogsButton}>
          <Button
            label="My Dogs"
            onPress={() => router.push("/(app)/(tabs)/my-dog")}
            variant="secondary"
          />
        </View>

        <View style={styles.notificationsButton}>
          <Button
            label="Notifications"
            onPress={() => router.push("/(app)/(tabs)/profile/notifications")}
            variant="secondary"
          />
        </View>

        <View style={styles.logoutButton}>
          <Button
            label="Log out"
            onPress={() =>
              Alert.alert("Log out?", "You will need to sign in again.", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Log out",
                  style: "destructive",
                  onPress: handleLogout,
                },
              ])
            }
            variant="secondary"
            loading={loggingOut}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingVertical: spacing.lg, paddingBottom: spacing.xxl },
  header: { alignItems: "center" },
  name: { marginTop: spacing.md },
  locationRow: { marginTop: 2 },
  aboutCard: { marginTop: spacing.xl },
  contactCard: { marginTop: spacing.md },
  contactRow: { flexDirection: "row", justifyContent: "space-between" },
  myDogsButton: { marginTop: spacing.md },
  notificationsButton: { marginTop: spacing.md },
  skeletonWrap: { marginTop: spacing.xs },
  skeletonGap: { marginTop: spacing.xs },
  logoutButton: { marginTop: spacing.xxl },
});
