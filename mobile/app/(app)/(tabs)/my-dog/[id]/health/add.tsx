import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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
import { ChipSelect } from "@/components/ChipSelect";
import { ErrorText } from "@/components/ErrorText";
import { RequireAuthScreen } from "@/components/RequireAuthScreen";
import { Screen } from "@/components/Screen";
import { TextArea } from "@/components/TextArea";
import { TextField } from "@/components/TextField";
import { createHealthRecord } from "@/lib/health-api";
import {
  HEALTH_RECORD_TYPE_OPTIONS,
  type HealthRecordFormValues,
  isHealthRecordFormValid,
  labelToType,
  validateHealthRecordForm,
} from "@/lib/health-form";
import { spacing, typography } from "@/theme/tokens";

const EMPTY_VALUES: HealthRecordFormValues = {
  type: "",
  title: "",
  occurredOn: "",
  vetName: "",
  notes: "",
};

function AddHealthRecordContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [values, setValues] = useState<HealthRecordFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<
    ReturnType<typeof validateHealthRecordForm>
  >({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof HealthRecordFormValues>(
    key: K,
    value: HealthRecordFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const validationErrors = validateHealthRecordForm(values);
    setErrors(validationErrors);
    if (!isHealthRecordFormValid(validationErrors)) return;

    const type = labelToType(values.type);
    if (!type) return;

    setSaveError(null);
    setSaving(true);
    try {
      await createHealthRecord(id, {
        type,
        title: values.title.trim(),
        occurredOn: values.occurredOn.trim(),
        vetName: values.vetName.trim() || undefined,
        notes: values.notes.trim() || undefined,
      });
      router.replace(`/(app)/(tabs)/my-dog/${id}/health`);
    } catch {
      setSaveError(
        "Couldn't save this record. Check your connection and try again.",
      );
      setSaving(false);
    }
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
          <Text style={[typography.title, styles.heading]}>
            Add Health Record
          </Text>
          <Card>
            <View style={styles.field}>
              <ChipSelect
                label="Type"
                options={HEALTH_RECORD_TYPE_OPTIONS}
                value={values.type}
                onChange={(v) => set("type", v)}
              />
              {errors.type ? <ErrorText>{errors.type}</ErrorText> : null}
            </View>

            <View style={styles.field}>
              <TextField
                label="Title"
                value={values.title}
                onChangeText={(t) => set("title", t)}
                placeholder="e.g. Rabies vaccination"
                maxLength={120}
              />
              {errors.title ? <ErrorText>{errors.title}</ErrorText> : null}
            </View>

            <View style={styles.field}>
              <TextField
                label="Date"
                value={values.occurredOn}
                onChangeText={(t) => set("occurredOn", t)}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
              {errors.occurredOn ? (
                <ErrorText>{errors.occurredOn}</ErrorText>
              ) : null}
            </View>

            <View style={styles.field}>
              <TextField
                label="Vet name (optional)"
                value={values.vetName}
                onChangeText={(t) => set("vetName", t)}
                placeholder="e.g. Dr. Sharma"
                maxLength={120}
              />
              {errors.vetName ? <ErrorText>{errors.vetName}</ErrorText> : null}
            </View>

            <View style={styles.field}>
              <TextArea
                label="Notes (optional)"
                value={values.notes}
                onChangeText={(t) => set("notes", t)}
                placeholder="Anything else worth recording"
                maxLength={1000}
              />
              {errors.notes ? <ErrorText>{errors.notes}</ErrorText> : null}
            </View>
          </Card>

          {saveError ? <ErrorText>{saveError}</ErrorText> : null}

          <View style={styles.saveButton}>
            <Button label="Save Record" onPress={handleSave} loading={saving} />
          </View>
          <Text style={[typography.caption, styles.helper]}>
            You can attach a certificate or scan after saving.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingVertical: spacing.lg, paddingBottom: spacing.xxl },
  heading: { marginBottom: spacing.lg },
  field: { marginBottom: spacing.lg },
  saveButton: { marginTop: spacing.xl },
  helper: { textAlign: "center", marginTop: spacing.md },
});

export default function AddHealthRecordScreen() {
  return (
    <RequireAuthScreen>
      <AddHealthRecordContent />
    </RequireAuthScreen>
  );
}
