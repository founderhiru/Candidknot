import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorText } from "@/components/ErrorText";
import { RequireAuthScreen } from "@/components/RequireAuthScreen";
import { Screen } from "@/components/Screen";
import { Skeleton } from "@/components/Skeleton";
import { TextArea } from "@/components/TextArea";
import { TextField } from "@/components/TextField";
import { authClient, useSession } from "@/lib/auth-client";
import {
  createOwnerProfile,
  getOwnerProfile,
  updateOwnerProfile,
} from "@/lib/owner-profile-api";
import {
  isOwnerProfileFormValid,
  type OwnerProfileFormValues,
  validateOwnerProfileForm,
} from "@/lib/owner-profile-form";
import { spacing, typography } from "@/theme/tokens";

function EditProfileScreenContent() {
  const { data: session } = useSession();
  const [values, setValues] = useState<OwnerProfileFormValues | null>(null);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [errors, setErrors] = useState<
    ReturnType<typeof validateOwnerProfileForm>
  >({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only needs to run once on mount — session name is read at that point.
  useEffect(() => {
    getOwnerProfile()
      .then((profile) => {
        setHasExistingProfile(!!profile);
        setValues({
          name: session?.user.name ?? "",
          city: profile?.city ?? "",
          bio: profile?.bio ?? "",
        });
      })
      .catch(() => setLoadError("Couldn't load your profile."));
  }, []);

  async function handleSave() {
    if (!values) return;
    const validationErrors = validateOwnerProfileForm(values);
    setErrors(validationErrors);
    if (!isOwnerProfileFormValid(validationErrors)) return;

    setNameError(null);
    setProfileError(null);
    setSaving(true);

    // Two independent write targets (see owner-profile-form.ts) — track
    // each outcome separately so a failure in one doesn't hide success in
    // the other, and so the user can tell exactly what to retry.
    let nameOk = true;
    if (values.name.trim() !== (session?.user.name ?? "")) {
      const { error } = await authClient.updateUser({
        name: values.name.trim(),
      });
      if (error) {
        nameOk = false;
        setNameError(error.message ?? "Couldn't save your name.");
      }
    }

    let profileOk = true;
    try {
      const write = { city: values.city.trim(), bio: values.bio.trim() };
      if (hasExistingProfile) {
        await updateOwnerProfile(write);
      } else {
        await createOwnerProfile(write);
      }
    } catch {
      profileOk = false;
      setProfileError(
        "Couldn't save your city/bio. Check your connection and try again.",
      );
    }

    setSaving(false);
    if (nameOk && profileOk) {
      router.back();
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
          <Skeleton
            height={80}
            width={80}
            borderRadius={40}
            style={styles.centerSelf}
          />
          <Skeleton height={52} style={styles.gap} />
          <Skeleton height={52} style={styles.gap} />
          <Skeleton height={96} style={styles.gap} />
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
          <View style={styles.avatarRow}>
            <Avatar name={values.name} size={72} />
            <Text style={[typography.bodyMuted, styles.avatarNote]}>
              Profile photos aren't supported yet.
            </Text>
          </View>

          <Card style={styles.formCard}>
            <TextField
              label="Display name"
              value={values.name}
              onChangeText={(text) => setValues({ ...values, name: text })}
              editable={!saving}
              placeholder="Your name"
              maxLength={100}
            />
            {errors.name ? <ErrorText>{errors.name}</ErrorText> : null}
            {nameError ? <ErrorText>{nameError}</ErrorText> : null}

            <View style={styles.field}>
              <TextField
                label="City"
                value={values.city}
                onChangeText={(text) => setValues({ ...values, city: text })}
                editable={!saving}
                placeholder="e.g. Pune"
                maxLength={120}
              />
              {errors.city ? <ErrorText>{errors.city}</ErrorText> : null}
            </View>

            <View style={styles.field}>
              <TextArea
                label="About you"
                value={values.bio}
                onChangeText={(text) => setValues({ ...values, bio: text })}
                editable={!saving}
                placeholder="A little about you and the kind of match you're looking for"
                maxLength={1000}
              />
              {errors.bio ? <ErrorText>{errors.bio}</ErrorText> : null}
            </View>
          </Card>

          {profileError ? <ErrorText>{profileError}</ErrorText> : null}

          <View style={styles.saveButton}>
            <Button label="Save" onPress={handleSave} loading={saving} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingWrap: { paddingTop: spacing.xl },
  centerSelf: { alignSelf: "center" },
  gap: { marginTop: spacing.lg },
  flex: { flex: 1 },
  scroll: { paddingVertical: spacing.lg, paddingBottom: spacing.xxl },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatarNote: { flex: 1 },
  formCard: { gap: spacing.lg },
  field: { gap: 0 },
  saveButton: { marginTop: spacing.lg },
});

export default function EditProfileScreen() {
  return (
    <RequireAuthScreen>
      <EditProfileScreenContent />
    </RequireAuthScreen>
  );
}
