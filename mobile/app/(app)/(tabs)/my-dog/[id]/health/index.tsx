import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { HealthRecordCard } from "@/components/HealthRecordCard";
import { RequireAuthScreen } from "@/components/RequireAuthScreen";
import { Screen } from "@/components/Screen";
import { Skeleton } from "@/components/Skeleton";
import { listHealthRecords } from "@/lib/health-api";
import type { HealthRecordItem } from "@/lib/health-contracts";
import { spacing, typography } from "@/theme/tokens";

function HealthPassportListContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [records, setRecords] = useState<HealthRecordItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listHealthRecords(id);
      setRecords(result.items);
    } catch {
      setError("Couldn't load health records. Check your connection.");
    }
  }, [id]);

  // Refetch every time this screen regains focus (e.g. returning from Add
  // or Edit) rather than relying on a single mount-time fetch — same
  // pattern as My Dog's list screen.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (records === null && !error) {
    return (
      <Screen>
        <View style={styles.skeletonWrap}>
          <Skeleton height={22} width="50%" />
          <Skeleton height={92} style={styles.gapTop} />
          <Skeleton height={92} style={styles.gapSm} />
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

  if (records && records.length === 0) {
    return (
      <Screen>
        <EmptyState
          emoji="🩺"
          title="No health records yet"
          message="Log vaccinations, vet visits, and other health records to build a trustworthy profile."
          actionLabel="Add Health Record"
          onAction={() => router.push(`/(app)/(tabs)/my-dog/${id}/health/add`)}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={records ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={[typography.bodyMuted, styles.intro]}>
            Private to you — never shown on the public profile.
          </Text>
        }
        renderItem={({ item }) => (
          <HealthRecordCard
            record={item}
            onPress={() =>
              router.push(`/(app)/(tabs)/my-dog/${id}/health/${item.id}/edit`)
            }
          />
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Button
              label="+ Add Health Record"
              onPress={() =>
                router.push(`/(app)/(tabs)/my-dog/${id}/health/add`)
              }
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
  skeletonWrap: { paddingTop: spacing.lg },
  gapTop: { marginTop: spacing.lg },
  gapSm: { marginTop: spacing.md },
  list: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
  intro: { marginBottom: spacing.lg },
  footer: { marginTop: spacing.sm },
});

export default function HealthPassportListScreen() {
  return (
    <RequireAuthScreen>
      <HealthPassportListContent />
    </RequireAuthScreen>
  );
}
