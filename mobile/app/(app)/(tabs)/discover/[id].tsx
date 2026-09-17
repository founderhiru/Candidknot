import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AuthPromptSheet } from "@/components/AuthPromptSheet";
import { HealthBadge, VerifiedBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DogPhoto } from "@/components/DogPhoto";
import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { ApiError } from "@/lib/api-client";
import { getCachedDiscoverDog } from "@/lib/discover-cache";
import { expressInterest } from "@/lib/interest-api";
import { useRequireAuth } from "@/lib/use-require-auth";
import { colors, spacing, typography } from "@/theme/tokens";

const HERO_HEIGHT = 300;

type InterestState = "idle" | "sending" | "sent" | "error";

/** Reads the backend's `{ error: string }` body, falling back to a generic message. */
function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { error?: string } | null;
    if (body?.error) return body.error;
  }
  return "Couldn't send your interest. Check your connection and try again.";
}

/**
 * Public Dog Detail — no auth required to view (guest-first). There is no
 * public single-dog API (see discover-cache.ts) so this reads the item the
 * Discover list already fetched, by id. If that cache is empty (e.g. a
 * cold deep link straight into this screen), it shows a clear way back
 * rather than a fake/partial fetch.
 */
export default function PublicDogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dog = getCachedDiscoverDog(id);
  const { promptVisible, setPromptVisible, requireAuth } = useRequireAuth();
  const [interestState, setInterestState] = useState<InterestState>("idle");
  const [interestError, setInterestError] = useState<string | null>(null);

  if (!dog) {
    return (
      <Screen>
        <EmptyState
          title="Couldn't find this dog"
          message="Go back to Discover and try again."
          actionLabel="Back to Discover"
          onAction={() => router.replace("/(app)/(tabs)/discover")}
        />
      </Screen>
    );
  }

  function handleExpressInterest() {
    requireAuth(() => {
      void sendInterest();
    });
  }

  async function sendInterest() {
    if (!dog) return;
    setInterestError(null);
    setInterestState("sending");
    try {
      await expressInterest(dog.id);
      setInterestState("sent");
    } catch (err) {
      setInterestError(extractErrorMessage(err));
      setInterestState("error");
    }
  }

  return (
    <Screen noPadding edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <DogPhoto uri={dog.coverPhotoUrl} style={styles.hero} />

        <View style={styles.body}>
          <Text style={typography.title}>{dog.name}</Text>
          <Text style={[typography.bodyMuted, styles.subtitle]}>
            {dog.breed} · {dog.sex} · {dog.ageYears}{" "}
            {dog.ageYears === 1 ? "yr" : "yrs"} · {dog.city}
            {dog.distanceKm != null ? ` · ${dog.distanceKm} km away` : ""}
          </Text>

          <View style={styles.badgeRow}>
            {dog.isVerified ? <VerifiedBadge /> : null}
            <HealthBadge hasRecords={dog.hasHealthRecords} />
          </View>

          <Card style={styles.aboutCard}>
            <SectionHeader title="About" />
            <Text style={typography.body}>{dog.bio}</Text>
          </Card>

          {interestState === "sent" ? (
            <Card style={styles.interestSentCard}>
              <Text style={[typography.body, styles.interestSentTitle]}>
                Interest sent
              </Text>
              <Text style={typography.bodyMuted}>
                We'll let you know if there's a response.
              </Text>
            </Card>
          ) : (
            <View style={styles.expressInterest}>
              <Button
                label="Express Interest"
                onPress={handleExpressInterest}
                loading={interestState === "sending"}
                disabled={interestState === "sending"}
              />
              {interestState === "error" && interestError ? (
                <ErrorText>{interestError}</ErrorText>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      <AuthPromptSheet
        visible={promptVisible}
        onClose={() => setPromptVisible(false)}
        message={`Sign in to express interest in ${dog.name}.`}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl },
  hero: { width: "100%", height: HERO_HEIGHT },
  body: { paddingHorizontal: spacing.screenPadding, marginTop: spacing.lg },
  subtitle: { marginTop: spacing.xs },
  badgeRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.md },
  aboutCard: { marginTop: spacing.lg },
  expressInterest: { marginTop: spacing.xl },
  interestSentCard: {
    marginTop: spacing.xl,
    backgroundColor: colors.successTint,
  },
  interestSentTitle: { fontWeight: "700", marginBottom: spacing.xs },
});
