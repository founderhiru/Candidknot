import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { AuthPromptSheet } from "@/components/AuthPromptSheet";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Skeleton } from "@/components/Skeleton";
import { useSession } from "@/lib/auth-client";
import { listIncomingInterests, respondToInterest } from "@/lib/interest-api";
import type { IncomingInterestItem } from "@/lib/interest-contracts";
import { listMatches } from "@/lib/matches-api";
import type { MatchItem } from "@/lib/matches-contracts";
import { useRequireAuth } from "@/lib/use-require-auth";
import { colors, elevation, radius, spacing, typography } from "@/theme/tokens";

function IncomingInterestCard({
  interest,
  onRespond,
}: {
  interest: IncomingInterestItem;
  onRespond: (id: string, status: "accepted" | "declined") => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function handle(status: "accepted" | "declined") {
    setBusy(true);
    try {
      await onRespond(interest.id, status);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={styles.card}>
      <Text style={typography.body}>
        <Text style={styles.bold}>{interest.senderName ?? "Someone"}</Text> is
        interested in <Text style={styles.bold}>{interest.targetDogName}</Text>
      </Text>
      <View style={styles.actionRow}>
        <View style={styles.actionButton}>
          <Button
            label="Accept"
            onPress={() => handle("accepted")}
            loading={busy}
            disabled={busy}
          />
        </View>
        <View style={styles.actionButton}>
          <Button
            label="Decline"
            onPress={() => handle("declined")}
            variant="secondary"
            disabled={busy}
          />
        </View>
      </View>
    </Card>
  );
}

function MatchCard({
  match,
  onPress,
}: {
  match: MatchItem;
  onPress: () => void;
}) {
  return (
    <Card style={styles.card}>
      <Text style={typography.body}>
        Matched with{" "}
        <Text style={styles.bold}>{match.otherUserName ?? "an owner"}</Text>{" "}
        over <Text style={styles.bold}>{match.targetDogName}</Text>
      </Text>
      <View style={styles.matchFooter}>
        <Badge label="Matched" tone="success" />
        <Text style={styles.openLink} onPress={onPress}>
          Open conversation →
        </Text>
      </View>
    </Card>
  );
}

function MatchesContent() {
  const [incoming, setIncoming] = useState<IncomingInterestItem[] | null>(null);
  const [matches, setMatches] = useState<MatchItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [incomingResult, matchesResult] = await Promise.all([
        listIncomingInterests(),
        listMatches(),
      ]);
      setIncoming(
        incomingResult.items.filter((item) => item.status === "pending"),
      );
      setMatches(matchesResult.items);
    } catch {
      setError("Couldn't load your matches. Check your connection.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleRespond(
    interestId: string,
    status: "accepted" | "declined",
  ) {
    try {
      await respondToInterest(interestId, status);
      await load();
    } catch {
      Alert.alert("Couldn't respond", "Check your connection and try again.");
    }
  }

  if (incoming === null && matches === null && !error) {
    return (
      <Screen>
        <View style={styles.skeletonWrap}>
          <Skeleton height={22} width="50%" />
          <Skeleton height={80} style={styles.gapTop} />
          <Skeleton height={80} style={styles.gapSm} />
        </View>
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

  const hasIncoming = (incoming?.length ?? 0) > 0;
  const hasMatches = (matches?.length ?? 0) > 0;

  if (!hasIncoming && !hasMatches) {
    return (
      <Screen>
        <EmptyState
          emoji="🤝"
          title="No matches yet"
          message="Express interest in a dog from Discover — when the owner accepts, you'll match here."
          actionLabel="Go to Discover"
          onAction={() => router.push("/(app)/(tabs)/discover")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={matches ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {hasIncoming ? (
              <View style={styles.section}>
                <SectionHeader title="New Interests" />
                {incoming?.map((interest) => (
                  <IncomingInterestCard
                    key={interest.id}
                    interest={interest}
                    onRespond={handleRespond}
                  />
                ))}
              </View>
            ) : null}
            <SectionHeader title="Matches" />
          </>
        }
        renderItem={({ item }) => (
          <MatchCard
            match={item}
            onPress={() =>
              router.push(
                `/(app)/(tabs)/matches/${item.conversationId}/conversation`,
              )
            }
          />
        )}
        ListEmptyComponent={
          <Text style={[typography.bodyMuted, styles.noMatchesYet]}>
            No matches yet — accepted interests will show up here.
          </Text>
        }
      />
    </Screen>
  );
}

export default function MatchesScreen() {
  const { data: session, isPending: isSessionPending } = useSession();
  const { promptVisible, setPromptVisible } = useRequireAuth();
  const isAuthenticated = !!session;

  if (!isSessionPending && !isAuthenticated) {
    return (
      <Screen>
        <EmptyState
          title="Sign in to see your matches"
          message="Sign in to view interests in your dogs and message your matches."
          actionLabel="Sign In"
          onAction={() => setPromptVisible(true)}
        />
        <AuthPromptSheet
          visible={promptVisible}
          onClose={() => setPromptVisible(false)}
          message="Sign in to view your matches."
        />
      </Screen>
    );
  }

  return <MatchesContent />;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  retryButton: { marginTop: spacing.md },
  skeletonWrap: { paddingTop: spacing.lg },
  gapTop: { marginTop: spacing.lg },
  gapSm: { marginTop: spacing.md },
  list: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
  section: { marginBottom: spacing.lg },
  card: {
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    ...elevation.card,
  },
  bold: { fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  actionButton: { flex: 1 },
  matchFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  openLink: { color: colors.accent, fontWeight: "700", fontSize: 13 },
  noMatchesYet: { paddingVertical: spacing.md },
});
