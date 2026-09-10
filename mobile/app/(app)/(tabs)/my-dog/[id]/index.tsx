import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { ErrorText } from "@/components/ErrorText";
import { PhotoGrid } from "@/components/PhotoGrid";
import { Screen } from "@/components/Screen";
import type { OwnedDogProfileItem } from "@/lib/contracts";
import { getDog } from "@/lib/dog-api";
import { colors, spacing, typography } from "@/theme/tokens";

export default function DogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dog, setDog] = useState<OwnedDogProfileItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await getDog(id);
      setDog(result);
    } catch {
      setError("Couldn't load this dog's profile.");
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!dog && !error) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (error || !dog) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ErrorText>{error ?? "Something went wrong."}</ErrorText>
          <View style={styles.retryButton}>
            <Button label="Retry" onPress={load} variant="secondary" />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={typography.title}>{dog.name}</Text>
        <Text style={[typography.bodyMuted, styles.subtitle]}>
          {dog.breed} · {dog.sex} · {dog.ageYears}{" "}
          {dog.ageYears === 1 ? "year" : "years"} · {dog.city}
        </Text>
        {dog.isVerified ? (
          <Text style={styles.verified}>✓ Verified</Text>
        ) : null}

        <Text style={[typography.body, styles.bio]}>{dog.bio}</Text>

        <View style={styles.editButton}>
          <Button
            label="Edit Details"
            onPress={() => router.push(`/(app)/(tabs)/my-dog/${dog.id}/edit`)}
            variant="secondary"
          />
        </View>

        <View style={styles.photos}>
          <PhotoGrid
            dogId={dog.id}
            photos={dog.photos}
            onPhotosChange={(photos) => setDog({ ...dog, photos })}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  retryButton: { marginTop: spacing.md },
  scroll: { paddingVertical: spacing.lg, paddingBottom: spacing.xxl },
  subtitle: { marginTop: spacing.xs },
  verified: {
    ...typography.label,
    color: colors.accent,
    marginTop: spacing.sm,
  },
  bio: { marginTop: spacing.lg },
  editButton: { marginTop: spacing.lg, alignSelf: "flex-start" },
  photos: { marginTop: spacing.xl },
});
