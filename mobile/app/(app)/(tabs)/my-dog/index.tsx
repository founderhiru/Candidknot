import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { AuthPromptSheet } from "@/components/AuthPromptSheet";
import { Button } from "@/components/Button";
import { DogCard } from "@/components/DogCard";
import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { DogCardSkeleton } from "@/components/Skeleton";
import { useSession } from "@/lib/auth-client";
import type { OwnedDogProfileItem } from "@/lib/contracts";
import { listMyDogs } from "@/lib/dog-api";
import { useRequireAuth } from "@/lib/use-require-auth";
import { spacing, typography } from "@/theme/tokens";

export default function MyDogListScreen() {
  const { data: session, isPending: isSessionPending } = useSession();
  const { promptVisible, setPromptVisible } = useRequireAuth();
  const [dogs, setDogs] = useState<OwnedDogProfileItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const firstName = session?.user.name?.split(" ")[0];

  // Guest-first: My Dog is fundamentally an owner concept, so a guest sees
  // a sign-in prompt instead of a fetch that would just 401 — no different
  // in spirit from any other protected action (see useRequireAuth).
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

  if (dogs && dogs.length === 0) {
    return (
      <Screen>
        <Text style={styles.greeting}>
          {firstName ? `Hi, ${firstName}` : "Welcome"}
        </Text>
        <EmptyState
          title="No dogs added yet"
          message="Add your first dog to start building their profile and finding great connections."
          actionLabel="Add Your First Dog"
          onAction={() => router.push("/(app)/(tabs)/my-dog/add")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={dogs ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={styles.greeting}>
              {firstName ? `Hi, ${firstName}` : "My Dogs"}
            </Text>
            <Text style={typography.bodyMuted}>
              {dogs?.length} {dogs?.length === 1 ? "dog" : "dogs"} on CanidKnot
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <DogCard
            dog={item}
            primary={index === 0 && (dogs?.length ?? 0) > 1}
            onPress={() => router.push(`/(app)/(tabs)/my-dog/${item.id}`)}
          />
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Button
              label="+ Add Another Dog"
              onPress={() => router.push("/(app)/(tabs)/my-dog/add")}
              variant="secondary"
            />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  retryButton: { marginTop: spacing.md },
  list: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
  headerRow: { marginBottom: spacing.lg },
  greeting: { ...typography.title, marginBottom: 2 },
  footer: { marginTop: spacing.sm },
  skeletonHeader: { marginBottom: spacing.lg, marginTop: spacing.sm },
  skeletonGreeting: {
    width: "50%",
    height: 26,
    borderRadius: 8,
    backgroundColor: "#E7E0D4",
  },
});
