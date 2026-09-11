import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { ChipSelect } from "@/components/ChipSelect";
import { ErrorText } from "@/components/ErrorText";
import { ProgressDots } from "@/components/ProgressDots";
import { RequireAuthScreen } from "@/components/RequireAuthScreen";
import { Screen } from "@/components/Screen";
import { SelectBottomSheet } from "@/components/SelectBottomSheet";
import { TextArea } from "@/components/TextArea";
import { TextField } from "@/components/TextField";
import {
  createDog,
  fetchBreedSuggestions,
  type PickedImage,
  uploadDogPhoto,
} from "@/lib/dog-api";
import {
  CITY_OPTIONS,
  type DogFormValues,
  findCityOption,
  isDogFormValid,
  SEX_OPTIONS,
  validateDogForm,
} from "@/lib/dog-form";
import { pickDogPhoto } from "@/lib/pick-photo";
import { colors, elevation, radius, spacing, typography } from "@/theme/tokens";

const EMPTY_VALUES: DogFormValues = {
  name: "",
  breed: "",
  city: "",
  sex: "",
  ageYears: "",
  bio: "",
};
const CITY_NAMES = CITY_OPTIONS.map((c) => c.name);

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const STEP_TITLES = [
  "Add a photo",
  "What's their name?",
  "Breed",
  "Sex",
  "Age",
  "City",
  "About your dog",
] as const;
const TOTAL_STEPS = STEP_TITLES.length;

type Stage = "form" | "saving-dog" | "uploading-photo" | "photo-failed";

/**
 * Progressive, one-thing-at-a-time onboarding (7 short steps) — replaces
 * the earlier single long-scroll form. The submitted payload and the
 * create-dog -> upload-photo sequence (with its existing retry-on-failure
 * path) are UNCHANGED; only the presentation is progressive now.
 */
function AddDogScreenContent() {
  const [step, setStep] = useState<Step>(0);
  const [values, setValues] = useState<DogFormValues>(EMPTY_VALUES);
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [breedSheetOpen, setBreedSheetOpen] = useState(false);
  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [breedSuggestions, setBreedSuggestions] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage>("form");
  const [formError, setFormError] = useState<string | null>(null);
  const [createdDogId, setCreatedDogId] = useState<string | null>(null);

  useEffect(() => {
    fetchBreedSuggestions()
      .then(setBreedSuggestions)
      .catch(() => {
        // Suggestions are a nicety — the breed sheet still lets free typing
        // if this fails (e.g. offline).
      });
  }, []);

  function set<K extends keyof DogFormValues>(key: K, value: DogFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const errors = validateDogForm(values);

  function canAdvance(current: Step): boolean {
    switch (current) {
      case 0:
        return !!photo;
      case 1:
        return !errors.name;
      case 2:
        return !errors.breed;
      case 3:
        return !errors.sex;
      case 4:
        return !errors.ageYears;
      case 5:
        return !errors.city;
      case 6:
        return isDogFormValid(errors);
      default:
        return false;
    }
  }

  async function handlePickPhoto() {
    const picked = await pickDogPhoto();
    if (picked) setPhoto(picked);
  }

  function goNext() {
    if (!canAdvance(step)) return;
    if (step === TOTAL_STEPS - 1) {
      handleCreateProfile();
      return;
    }
    setStep((s) => (s + 1) as Step);
  }

  function goBack() {
    if (step === 0) {
      router.back();
      return;
    }
    setStep((s) => (s - 1) as Step);
  }

  async function handleCreateProfile() {
    if (!photo) return;
    const cityOption = findCityOption(values.city);
    if (!cityOption) return;

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

  if (createdDogId) {
    return (
      <Screen>
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
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.topBar}>
          <Pressable onPress={goBack} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <View style={styles.progressWrap}>
            <ProgressDots total={TOTAL_STEPS} current={step} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={typography.title}>Add Your Dog</Text>
          <Text style={[typography.bodyMuted, styles.stepSubtitle]}>
            {STEP_TITLES[step]}
          </Text>

          {step === 0 ? (
            <View style={styles.photoStep}>
              <Pressable
                onPress={handlePickPhoto}
                style={styles.photoCircle}
                accessibilityRole="button"
              >
                {photo ? (
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.photoCircleImage}
                  />
                ) : (
                  <>
                    <Text style={styles.photoCircleEmoji}>📷</Text>
                    <Text style={styles.photoCircleLabel}>Add a photo</Text>
                  </>
                )}
              </Pressable>
              {photo ? (
                <Text style={styles.changePhotoLink} onPress={handlePickPhoto}>
                  Change photo
                </Text>
              ) : null}
              <Text style={[typography.bodyMuted, styles.helperText]}>
                A clear photo of your dog helps build trust. You can add more
                later.
              </Text>
            </View>
          ) : null}

          {step === 1 ? (
            <View style={styles.fieldStep}>
              <TextField
                label="Dog's name"
                value={values.name}
                onChangeText={(t) => set("name", t)}
                placeholder="e.g. Bruno"
                maxLength={60}
                autoFocus
              />
              {errors.name ? <ErrorText>{errors.name}</ErrorText> : null}
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.fieldStep}>
              <Pressable
                onPress={() => setBreedSheetOpen(true)}
                style={styles.pickerField}
                accessibilityRole="button"
              >
                <Text
                  style={
                    values.breed ? typography.body : styles.placeholderText
                  }
                >
                  {values.breed || "Select breed"}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
              {errors.breed ? <ErrorText>{errors.breed}</ErrorText> : null}
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.fieldStep}>
              <ChipSelect
                label=""
                options={SEX_OPTIONS}
                value={values.sex}
                onChange={(v) => set("sex", v)}
              />
              {errors.sex ? <ErrorText>{errors.sex}</ErrorText> : null}
            </View>
          ) : null}

          {step === 4 ? (
            <View style={styles.fieldStep}>
              <TextField
                label="Age (years)"
                value={values.ageYears}
                onChangeText={(t) =>
                  set("ageYears", t.replace(/[^0-9]/g, "").slice(0, 2))
                }
                keyboardType="number-pad"
                placeholder="e.g. 3"
                autoFocus
              />
              {errors.ageYears ? (
                <ErrorText>{errors.ageYears}</ErrorText>
              ) : null}
            </View>
          ) : null}

          {step === 5 ? (
            <View style={styles.fieldStep}>
              <Pressable
                onPress={() => setCitySheetOpen(true)}
                style={styles.pickerField}
                accessibilityRole="button"
              >
                <Text
                  style={values.city ? typography.body : styles.placeholderText}
                >
                  {values.city || "Select city"}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
              {errors.city ? <ErrorText>{errors.city}</ErrorText> : null}
            </View>
          ) : null}

          {step === 6 ? (
            <View style={styles.fieldStep}>
              <TextArea
                label="About this dog"
                value={values.bio}
                onChangeText={(t) => set("bio", t)}
                placeholder="Temperament, routine, anything a good match should know"
                maxLength={1000}
              />
              {errors.bio ? <ErrorText>{errors.bio}</ErrorText> : null}
            </View>
          ) : null}

          {formError ? <ErrorText>{formError}</ErrorText> : null}
        </ScrollView>

        <View style={styles.bottomBar}>
          <Button
            label={step === TOTAL_STEPS - 1 ? "Create Profile" : "Continue"}
            onPress={goNext}
            disabled={!canAdvance(step)}
            loading={busy}
          />
        </View>
      </KeyboardAvoidingView>

      <SelectBottomSheet
        visible={breedSheetOpen}
        onClose={() => setBreedSheetOpen(false)}
        title="Select Breed"
        options={
          breedSuggestions.length > 0
            ? breedSuggestions
            : [
                "Labrador Retriever",
                "Golden Retriever",
                "German Shepherd",
                "Beagle",
                "Poodle",
                "Rottweiler",
                "Indian Pariah Dog",
                "Others",
              ]
        }
        value={values.breed}
        onSelect={(v) => set("breed", v)}
        searchable
        searchPlaceholder="Search breed..."
      />
      <SelectBottomSheet
        visible={citySheetOpen}
        onClose={() => setCitySheetOpen(false)}
        title="Select City"
        options={CITY_NAMES}
        value={values.city}
        onSelect={(v) => set("city", v)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  backArrow: { fontSize: 24, color: colors.text },
  progressWrap: { flex: 1 },
  scroll: { paddingTop: spacing.lg, paddingBottom: spacing.xl },
  stepSubtitle: { marginTop: spacing.xs, marginBottom: spacing.xl },
  fieldStep: { gap: 0 },
  photoStep: { alignItems: "center", paddingVertical: spacing.md },
  photoCircle: {
    width: 160,
    height: 160,
    borderRadius: radius.pill,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoCircleImage: { width: "100%", height: "100%" },
  photoCircleEmoji: { fontSize: 36 },
  photoCircleLabel: {
    ...typography.bodyMuted,
    marginTop: spacing.xs,
    fontWeight: "600",
    color: colors.accent,
  },
  changePhotoLink: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  helperText: {
    textAlign: "center",
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  pickerField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  placeholderText: { ...typography.body, color: colors.textMuted },
  chevron: { fontSize: 20, color: colors.textMuted },
  bottomBar: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    ...elevation.floating,
  },
  photoFailedBanner: { gap: spacing.lg, marginTop: spacing.xl },
  photoFailedActions: { gap: spacing.md },
});

export default function AddDogScreen() {
  return (
    <RequireAuthScreen>
      <AddDogScreenContent />
    </RequireAuthScreen>
  );
}
