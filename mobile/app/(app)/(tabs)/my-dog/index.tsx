import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AuthPromptSheet } from "@/components/AuthPromptSheet";
import { Avatar } from "@/components/Avatar";
import { Badge, HealthBadge, VerifiedBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DogPhoto } from "@/components/DogPhoto";
import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { DogCardSkeleton } from "@/components/Skeleton";
import { useSession } from "@/lib/auth-client";
import type { OwnedDogProfileItem } from "@/lib/contracts";
import { listMyDogs } from "@/lib/dog-api";
import { useRequireAuth } from "@/lib/use-require-auth";
import { colors, elevation, radius, spacing, typography } from "@/theme/tokens";

const MINI_CARD_WIDTH = 156;

/**
 * Home dashboard — the repurposed "My Dog" tab (route/folder name kept
 * as `my-dog` so every existing router.push target elsewhere in the app
 * keeps working; only the tab's title and this screen's content change).
 * Combines the greeting, a horizontal "My Dogs" rail, a profile-completion
 * nudge, and a community card, matching the reference Home screen.
 */
export default function HomeScreen() {
  const { data: session, isPending: isSessionPending } = useSession();
  const { promptVisible, setPromptVisible } = useRequireAuth();
  const [dogs, setDogs] = useState<OwnedDogProfileItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = !!session;

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setError(null);
    try {
      const result = await listMyDogs();
      setDogs(result.items);
    } catch {
      setError("Couldn't load your dogs. Check your connection.");
    }
  }, [isAuthenticated]);

  // Refetch every time this tab regains focus (e.g. returning from Add Dog
  // or Edit Dog) rather than relying on a single mount-time fetch.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const firstName = session?.user.name?.split(" ")[0];
  const greeting = greetingForNow();

  // Guest-first: Home's dog content is fundamentally an owner concept, so
  // a guest sees a sign-in prompt instead of a fetch that would just 401.
  if (!isSessionPending && !isAuthenticated) {
    return (
      <Screen>
        <EmptyState
          title="Sign in to see your dogs"
          message="Create a free account to add your dog and start building their profile."
          actionLabel="Sign In"
          onAction={() => setPromptVisible(true)}
        />
        <AuthPromptSheet
          visible={promptVisible}
          onClose={() => setPromptVisible(false)}
          message="Sign in to add and manage your dogs."
        />
      </Screen>
    );
  }

  if (dogs === null && !error) {
    return (
      <Screen>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonGreeting} />
        </View>
        <DogCardSkeleton />
        <DogCardSkeleton />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ErrorText>{error}</ErrorText>
          <View style={styles.retryButton}>
            <Button label="Retry" onPress={load} variant="secondary" />
          </View>
        </View>
      </Screen>
    );
  }

  const hasDogs = !!dogs && dogs.length > 0;
  const primaryDog = dogs?.[0];
  const needsHealthRecords =
    !!primaryDog && primaryDog.healthRecords.length === 0;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>
              {greeting}
              {firstName ? `, ${firstName}` : ""}!
            </Text>
            <Text style={typography.bodyMuted}>
              Happy dogs. Happier people. 🐾
            </Text>
          </View>
          <Avatar name={session?.user.name} size={44} />
        </View>

        {!hasDogs ? (
          <EmptyState
            title="No dogs added yet"
            message="Add your dog to get started and unlock a world of new connections."
            actionLabel="Add Your First Dog"
            onAction={() => router.push("/(app)/(tabs)/my-dog/add")}
          />
        ) : (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={typography.sectionTitle}>
                My Dogs ({dogs?.length})
              </Text>
              <Pressable
                onPress={() => router.push("/(app)/(tabs)/my-dog/add")}
                accessibilityRole="button"
              >
                <Text style={styles.viewAll}>+ Add dog</Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
            >
              {dogs?.map((dog, index) => (
                <Pressable
                  key={dog.id}
                  onPress={() => router.push(`/(app)/(tabs)/my-dog/${dog.id}`)}
                  style={({ pressed }) => [
                    styles.miniCard,
                    elevation.card,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                >
                  <DogPhoto
                    uri={
                      dog.photos.find((p) => p.position === 0)?.url ??
                      dog.photos[0]?.url
                    }
                    style={styles.miniPhoto}
                  />
                  {index === 0 && (dogs?.length ?? 0) > 1 ? (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Primary</Text>
                    </View>
                  ) : null}
                  <View style={styles.miniInfo}>
                    <Text style={typography.sectionTitle} numberOfLines={1}>
                      {dog.name}
                    </Text>
                    <Text
                      style={[typography.bodyMuted, styles.miniMeta]}
                      numberOfLines={1}
                    >
                      {dog.breed} · {dog.ageYears}{" "}
                      {dog.ageYears === 1 ? "yr" : "yrs"}
                    </Text>
                    <Text
                      style={[typography.bodyMuted, styles.miniMeta]}
                      numberOfLines={1}
                    >
                      {dog.city}
                    </Text>
                    <View style={styles.miniBadgeRow}>
                      {dog.isVerified ? <VerifiedBadge /> : null}
                      <HealthBadge hasRecords={dog.healthRecords.length > 0} />
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            {needsHealthRecords ? (
              <Pressable
                onPress={() =>
                  router.push(`/(app)/(tabs)/my-dog/${primaryDog?.id}/health`)
                }
                accessibilityRole="button"
              >
                <Card style={styles.promptCard}>
                  <View style={styles.promptIcon}>
                    <Text style={styles.promptIconText}>📋</Text>
                  </View>
                  <View style={styles.promptCopy}>
                    <Text style={typography.sectionTitle}>
                      Complete their profile
                    </Text>
                    <Text style={typography.bodyMuted}>
                      Add health records to keep them safe and ready.
                    </Text>
                  </View>
                </Card>
              </Pressable>
            ) : null}

            <Card style={styles.communityCard} elevated={false}>
              <View style={styles.communityCopy}>
                <Text style={[typography.sectionTitle, styles.communityTitle]}>
                  Because every dog deserves a great circle
                </Text>
                <Badge label="Browse the community" tone="neutral" />
              </View>
            </Card>
          </>
        )}
      </ScrollView>

      <AuthPromptSheet
        visible={promptVisible}
        onClose={() => setPromptVisible(false)}
        message="Sign in to add and manage your dogs."
      />
    </Screen>
  );
}

function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  retryButton: { marginTop: spacing.md },
  scroll: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  greeting: { ...typography.title, marginBottom: 2 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  viewAll: { ...typography.caption, color: colors.accent, fontWeight: "700" },
  rail: { gap: spacing.md, paddingBottom: spacing.xs },
  miniCard: {
    width: MINI_CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  pressed: { opacity: 0.85 },
  miniPhoto: { width: "100%", height: 120 },
  primaryBadge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  primaryBadgeText: {
    color: colors.accentText,
    fontSize: 11,
    fontWeight: "700",
  },
  miniInfo: { padding: spacing.sm },
  miniMeta: { marginTop: 1 },
  miniBadgeRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.sm,
    flexWrap: "wrap",
  },
  promptCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  promptIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.accentTint,
    alignItems: "center",
    justifyContent: "center",
  },
  promptIconText: { fontSize: 20 },
  promptCopy: { flex: 1 },
  communityCard: {
    marginTop: spacing.md,
    backgroundColor: colors.backgroundAlt,
  },
  communityCopy: { gap: spacing.sm },
  communityTitle: { lineHeight: 24 },
  skeletonHeader: { marginBottom: spacing.lg, marginTop: spacing.sm },
  skeletonGreeting: {
    width: "50%",
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
});
