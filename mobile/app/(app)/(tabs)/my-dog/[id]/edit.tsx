import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DogFormFields } from "@/components/DogFormFields";
import { ErrorText } from "@/components/ErrorText";
import { RequireAuthScreen } from "@/components/RequireAuthScreen";
import { Screen } from "@/components/Screen";
import { Skeleton } from "@/components/Skeleton";
import { getDog, updateDog } from "@/lib/dog-api";
import {
  type DogFormValues,
  findCityOption,
  isDogFormValid,
  validateDogForm,
} from "@/lib/dog-form";
import { spacing, typography } from "@/theme/tokens";

function EditDogScreenContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [values, setValues] = useState<DogFormValues | null>(null);
  const [errors, setErrors] = useState<ReturnType<typeof validateDogForm>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDog(id)
      .then((dog) =>
        setValues({
          name: dog.name,
          breed: dog.breed,
          city: dog.city,
          sex: dog.sex,
          ageYears: String(dog.ageYears),
          bio: dog.bio,
        }),
      )
      .catch(() => setLoadError("Couldn't load this dog's details."));
  }, [id]);

  async function handleSave() {
    if (!values) return;
    const validationErrors = validateDogForm(values);
    setErrors(validationErrors);
    if (!isDogFormValid(validationErrors)) return;

    const cityOption = findCityOption(values.city);
    if (!cityOption) {
      setErrors({ ...validationErrors, city: "Choose a city" });
      return;
    }

    setSaveError(null);
    setSaving(true);
    try {
      await updateDog(id, {
        name: values.name.trim(),
        breed: values.breed.trim(),
        city: cityOption.name,
        latitude: cityOption.latitude,
        longitude: cityOption.longitude,
        ageYears: Number(values.ageYears),
        sex: values.sex,
        bio: values.bio.trim(),
      });
      router.back();
    } catch {
      setSaveError(
        "Couldn't save your changes. Check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ErrorText>{loadError}</ErrorText>
        </View>
      </Screen>
    );
  }

  if (!values) {
    return (
      <Screen>
        <View style={styles.loadingWrap}>
          <Skeleton height={24} width="50%" />
          <Skeleton height={52} style={styles.gap} />
          <Skeleton height={52} style={styles.gap} />
          <Skeleton height={52} style={styles.gap} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[typography.title, styles.heading]}>Edit Details</Text>
          <Card>
            <DogFormFields
              values={values}
              errors={errors}
              onChange={setValues}
              disabled={saving}
            />
          </Card>
          {saveError ? <ErrorText>{saveError}</ErrorText> : null}
          <View style={styles.saveButton}>
            <Button
              label="Save Changes"
              onPress={handleSave}
              loading={saving}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingWrap: { paddingTop: spacing.xl },
  gap: { marginTop: spacing.lg },
  flex: { flex: 1 },
  scroll: { paddingVertical: spacing.lg, paddingBottom: spacing.xxl },
  heading: { marginBottom: spacing.lg },
  saveButton: { marginTop: spacing.xl },
});

export default function EditDogScreen() {
  return (
    <RequireAuthScreen>
      <EditDogScreenContent />
    </RequireAuthScreen>
  );
}
