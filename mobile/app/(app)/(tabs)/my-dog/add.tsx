import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { DogFormFields } from "@/components/DogFormFields";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { createDog, type PickedImage, uploadDogPhoto } from "@/lib/dog-api";
import {
  type DogFormValues,
  findCityOption,
  isDogFormValid,
  validateDogForm,
} from "@/lib/dog-form";
import { pickDogPhoto } from "@/lib/pick-photo";
import { colors, radius, spacing, typography } from "@/theme/tokens";

const EMPTY_VALUES: DogFormValues = {
  name: "",
  breed: "",
  city: "",
  sex: "",
  ageYears: "",
  bio: "",
};

type Stage = "form" | "saving-dog" | "uploading-photo" | "photo-failed";

export default function AddDogScreen() {
  const [values, setValues] = useState<DogFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<ReturnType<typeof validateDogForm>>({});
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [stage, setStage] = useState<Stage>("form");
  const [formError, setFormError] = useState<string | null>(null);
  // Set once the dog itself is created, so a failed photo upload can be
  // retried against the same dog rather than creating a duplicate.
  const [createdDogId, setCreatedDogId] = useState<string | null>(null);

  const canSubmit = isDogFormValid(validateDogForm(values)) && !!photo;

  async function handlePickPhoto() {
    const picked = await pickDogPhoto();
    if (picked) setPhoto(picked);
  }

  async function handleContinue() {
    const validationErrors = validateDogForm(values);
    setErrors(validationErrors);
    if (!isDogFormValid(validationErrors) || !photo) return;

    const cityOption = findCityOption(values.city);
    if (!cityOption) {
      setErrors({ ...validationErrors, city: "Choose a city" });
      return;
    }

    setFormError(null);
    setStage("saving-dog");

    let dogId: string;
    try {
      const dog = await createDog({
        name: values.name.trim(),
        breed: values.breed.trim(),
        city: cityOption.name,
        latitude: cityOption.latitude,
        longitude: cityOption.longitude,
        ageYears: Number(values.ageYears),
        sex: values.sex,
        bio: values.bio.trim(),
      });
      dogId = dog.id;
      setCreatedDogId(dog.id);
    } catch {
      setFormError(
        "Couldn't save your dog's details. Check your connection and try again.",
      );
      setStage("form");
      return;
    }

    setStage("uploading-photo");
    try {
      await uploadDogPhoto(dogId, photo);
      router.replace("/(app)/(tabs)/my-dog");
    } catch {
      setStage("photo-failed");
    }
  }

  async function handleRetryPhoto() {
    if (!photo || !createdDogId) return;
    setStage("uploading-photo");
    try {
      await uploadDogPhoto(createdDogId, photo);
      router.replace("/(app)/(tabs)/my-dog");
    } catch {
      setStage("photo-failed");
    }
  }

  const busy = stage === "saving-dog" || stage === "uploading-photo";

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
          {createdDogId ? (
            <View style={styles.photoFailedBanner}>
              <Text style={typography.body}>
                {stage === "uploading-photo"
                  ? `Saving ${values.name.trim() || "your dog"}'s photo…`
                  : `${values.name.trim() || "Your dog"}'s profile is saved, but the photo upload failed.`}
              </Text>
              <View style={styles.photoFailedActions}>
                <Button
                  label="Retry photo upload"
                  onPress={handleRetryPhoto}
                  loading={stage === "uploading-photo"}
                  disabled={stage === "uploading-photo"}
                />
                <Button
                  label="Continue without photo"
                  onPress={() => router.replace("/(app)/(tabs)/my-dog")}
                  variant="secondary"
                  disabled={stage === "uploading-photo"}
                />
              </View>
            </View>
          ) : (
            <>
              <DogFormFields
                values={values}
                errors={errors}
                onChange={setValues}
                disabled={busy}
              />

              <View style={styles.photoSection}>
                <Text style={typography.label}>PHOTO (required)</Text>
                {photo ? (
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.photoPreview}
                  />
                ) : (
                  <Button
                    label="Choose a photo"
                    onPress={handlePickPhoto}
                    variant="secondary"
                  />
                )}
                {photo ? (
                  <View style={styles.changePhoto}>
                    <Button
                      label="Change photo"
                      onPress={handlePickPhoto}
                      variant="secondary"
                    />
                  </View>
                ) : null}
              </View>

              {formError ? <ErrorText>{formError}</ErrorText> : null}

              <View style={styles.continueButton}>
                <Button
                  label="Save Dog"
                  onPress={handleContinue}
                  disabled={!canSubmit}
                  loading={busy}
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingVertical: spacing.lg, paddingBottom: spacing.xxl },
  photoSection: { marginTop: spacing.lg, gap: spacing.sm },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  changePhoto: { alignSelf: "flex-start" },
  continueButton: { marginTop: spacing.xl },
  photoFailedBanner: { gap: spacing.lg },
  photoFailedActions: { gap: spacing.md },
});
