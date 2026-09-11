import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { PublicDogCard } from "@/components/PublicDogCard";
import { Screen } from "@/components/Screen";
import { SelectBottomSheet } from "@/components/SelectBottomSheet";
import { DogCardSkeleton } from "@/components/Skeleton";
import { fetchDiscoverDogs } from "@/lib/discover-api";
import { setDiscoverCache } from "@/lib/discover-cache";
import type { DogProfileItem } from "@/lib/discover-contracts";
import { colors, spacing, typography } from "@/theme/tokens";

/**
 * Guest-first: this screen is reachable with no session (see
 * app/(app)/_layout.tsx) and only ever calls the PUBLIC discovery
 * endpoint (skipAuth) — nothing here requires auth. Express Interest,
 * gated on Dog Detail, is the only protected action reachable from here.
 */
export default function DiscoverScreen() {
  const [dogs, setDogs] = useState<DogProfileItem[] | null>(null);
  const [breeds, setBreeds] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [breed, setBreed] = useState<string | undefined>();
  const [city, setCity] = useState<string | undefined>();
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [breedSheetOpen, setBreedSheetOpen] = useState(false);
  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await fetchDiscoverDogs({ breed, city, verifiedOnly });
      setDogs(result.items);
      setBreeds(result.filters.breeds);
      setCities(result.filters.cities);
      setDiscoverCache(result.items);
    } catch {
      setError("Couldn't load dogs. Check your connection.");
    }
  }, [breed, city, verifiedOnly]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={typography.title}>Discover</Text>
        <View style={styles.filterRow}>
          <Button
            label={breed ?? "Breed"}
            onPress={() => setBreedSheetOpen(true)}
            variant="secondary"
          />
          <Button
            label={city ?? "City"}
            onPress={() => setCitySheetOpen(true)}
            variant="secondary"
          />
        </View>
        <View style={styles.chipRow}>
          <Badge
            label={verifiedOnly ? "✓ Verified only" : "Verified only"}
            tone={verifiedOnly ? "success" : "neutral"}
          />
          <Text
            style={styles.toggleText}
            onPress={() => setVerifiedOnly((v) => !v)}
            accessibilityRole="button"
          >
            {verifiedOnly ? "Show all" : "Filter"}
          </Text>
        </View>
      </View>

      {dogs === null && !error ? (
        <View>
          <DogCardSkeleton />
          <DogCardSkeleton />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <ErrorText>{error}</ErrorText>
          <View style={styles.retryButton}>
            <Button label="Retry" onPress={load} variant="secondary" />
          </View>
        </View>
      ) : dogs && dogs.length === 0 ? (
        <EmptyState
          title="No dogs match yet"
          message="Try a different breed, city, or clear your filters."
          actionLabel="Clear filters"
          onAction={() => {
            setBreed(undefined);
            setCity(undefined);
            setVerifiedOnly(false);
          }}
        />
      ) : (
        <FlatList
          data={dogs ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <PublicDogCard
              dog={item}
              onPress={() => router.push(`/(app)/(tabs)/discover/${item.id}`)}
            />
          )}
        />
      )}

      <SelectBottomSheet
        visible={breedSheetOpen}
        onClose={() => setBreedSheetOpen(false)}
        title="Filter by breed"
        options={breeds}
        value={breed ?? ""}
        onSelect={(v) => setBreed(v === breed ? undefined : v)}
        searchable
        searchPlaceholder="Search breed..."
      />
      <SelectBottomSheet
        visible={citySheetOpen}
        onClose={() => setCitySheetOpen(false)}
        title="Filter by city"
        options={cities}
        value={city ?? ""}
        onSelect={(v) => setCity(v === city ? undefined : v)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.sm, marginBottom: spacing.md },
  filterRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  toggleText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
  },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  retryButton: { marginTop: spacing.md },
  list: { paddingBottom: spacing.xl },
});
