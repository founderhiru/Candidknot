import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { DogFormFields } from "@/components/DogFormFields";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { getDog, updateDog } from "@/lib/dog-api";
import {
  type DogFormValues,
  findCityOption,
  isDogFormValid,
  validateDogForm,
} from "@/lib/dog-form";
import { colors, spacing } from "@/theme/tokens";

export default function EditDogScreen() {
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
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
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
          <DogFormFields
            values={values}
            errors={errors}
            onChange={setValues}
            disabled={saving}
          />
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
  flex: { flex: 1 },
  scroll: { paddingVertical: spacing.lg, paddingBottom: spacing.xxl },
  saveButton: { marginTop: spacing.xl },
});
