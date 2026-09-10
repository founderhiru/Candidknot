import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { DogCard } from "@/components/DogCard";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import type { OwnedDogProfileItem } from "@/lib/contracts";
import { listMyDogs } from "@/lib/dog-api";
import { colors, spacing, typography } from "@/theme/tokens";

export default function MyDogListScreen() {
  const [dogs, setDogs] = useState<OwnedDogProfileItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listMyDogs();
      setDogs(result.items);
    } catch {
      setError("Couldn't load your dogs. Check your connection.");
    }
  }, []);

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

  if (dogs === null && !error) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
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

  if (dogs && dogs.length === 0) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={typography.title}>Add your dog</Text>
          <Text style={[typography.bodyMuted, styles.emptyNote]}>
            Create a profile for your dog to get started.
          </Text>
          <View style={styles.addButton}>
            <Button
              label="Add Dog"
              onPress={() => router.push("/(app)/(tabs)/my-dog/add")}
            />
          </View>
        </View>
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
        renderItem={({ item }) => (
          <DogCard
            dog={item}
            onPress={() => router.push(`/(app)/(tabs)/my-dog/${item.id}`)}
          />
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Button
              label="Add Another Dog"
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
  emptyNote: { marginTop: spacing.sm, textAlign: "center" },
  addButton: { marginTop: spacing.lg, alignSelf: "stretch" },
  retryButton: { marginTop: spacing.md },
  list: { paddingTop: spacing.md, paddingBottom: spacing.xl },
  footer: { marginTop: spacing.sm },
});
