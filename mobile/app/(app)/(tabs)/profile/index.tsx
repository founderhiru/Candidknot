import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { authClient, useSession } from "@/lib/auth-client";
import type { OwnerProfileItem } from "@/lib/contracts";
import { getOwnerProfile } from "@/lib/owner-profile-api";
import { colors, spacing, typography } from "@/theme/tokens";

export default function ProfileScreen() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<OwnerProfileItem | null | undefined>(
    undefined,
  );
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async () => {
    setProfileError(null);
    try {
      const result = await getOwnerProfile();
      setProfile(result);
    } catch {
      setProfileError("Couldn't load your profile.");
    }
  }, []);

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

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Avatar name={name} />
          <View style={styles.headerText}>
            <Text style={typography.title}>{name ?? "Add your name"}</Text>
            <Text style={typography.bodyMuted}>
              {session?.user.email ?? session?.user.phoneNumber ?? ""}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={typography.label}>ABOUT YOU</Text>
          {profile === undefined && !profileError ? (
            <ActivityIndicator style={styles.spinner} color={colors.accent} />
          ) : profileError ? (
            <ErrorText>{profileError}</ErrorText>
          ) : profile ? (
            <>
              <Text style={[typography.body, styles.city]}>{profile.city}</Text>
              <Text style={[typography.bodyMuted, styles.bio]}>
                {profile.bio}
              </Text>
            </>
          ) : (
            <Text style={typography.bodyMuted}>
              Set up your profile so other owners know a bit about you.
            </Text>
          )}
          <View style={styles.editButton}>
            <Button
              label={profile ? "Edit Profile" : "Set Up Profile"}
              onPress={() => router.push("/(app)/(tabs)/profile/edit")}
              variant="secondary"
            />
          </View>
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
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  headerText: { flex: 1 },
  section: { marginTop: spacing.xl },
  spinner: { marginTop: spacing.sm, alignSelf: "flex-start" },
  city: { marginTop: spacing.sm },
  bio: { marginTop: spacing.xs },
  editButton: { marginTop: spacing.md, alignSelf: "flex-start" },
  logoutButton: { marginTop: spacing.xxl },
});
