import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
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
import { Skeleton } from "@/components/Skeleton";
import { TextArea } from "@/components/TextArea";
import { TextField } from "@/components/TextField";
import {
  deleteHealthDocument,
  deleteHealthRecord,
  getDocumentDownloadUrl,
  listHealthRecords,
  updateHealthRecord,
  uploadHealthDocument,
} from "@/lib/health-api";
import type {
  HealthDocumentItem,
  HealthRecordItem,
} from "@/lib/health-contracts";
import {
  HEALTH_RECORD_TYPE_LABELS,
  HEALTH_RECORD_TYPE_OPTIONS,
  type HealthRecordFormValues,
  isHealthRecordFormValid,
  labelToType,
  validateHealthRecordForm,
} from "@/lib/health-form";
import { DocumentTooLargeError, pickHealthDocument } from "@/lib/pick-document";
import { colors, spacing, typography } from "@/theme/tokens";

function toFormValues(record: HealthRecordItem): HealthRecordFormValues {
  return {
    type: HEALTH_RECORD_TYPE_LABELS[record.type],
    title: record.title,
    occurredOn: record.occurredOn,
    vetName: record.vetName ?? "",
    notes: record.notes ?? "",
  };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function EditHealthRecordContent() {
  const { id, recordId } = useLocalSearchParams<{
    id: string;
    recordId: string;
  }>();
  const [record, setRecord] = useState<HealthRecordItem | null>(null);
  const [values, setValues] = useState<HealthRecordFormValues | null>(null);
  const [errors, setErrors] = useState<
    ReturnType<typeof validateHealthRecordForm>
  >({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const [docError, setDocError] = useState<{
    id: string;
    message: string;
  } | null>(null);

  // There's no single-record GET route on the backend (only list + PATCH/
  // DELETE) — load via the existing list endpoint and find this record by
  // id, rather than adding a new endpoint for this MVP.
  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const result = await listHealthRecords(id);
      const found = result.items.find((item) => item.id === recordId);
      if (!found) {
        setLoadError("This health record could not be found.");
        return;
      }
      setRecord(found);
      setValues(toFormValues(found));
    } catch {
      setLoadError("Couldn't load this health record.");
    }
  }, [id, recordId]);

  useEffect(() => {
    load();
  }, [load]);

  function set<K extends keyof HealthRecordFormValues>(
    key: K,
    value: HealthRecordFormValues[K],
  ) {
    setValues((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!values) return;
    const validationErrors = validateHealthRecordForm(values);
    setErrors(validationErrors);
    if (!isHealthRecordFormValid(validationErrors)) return;

    const type = labelToType(values.type);
    if (!type) return;

    setSaveError(null);
    setSaving(true);
    try {
      const updated = await updateHealthRecord(id, recordId, {
        type,
        title: values.title.trim(),
        occurredOn: values.occurredOn.trim(),
        vetName: values.vetName.trim() || undefined,
        notes: values.notes.trim() || undefined,
      });
      setRecord(updated);
      router.back();
    } catch {
      setSaveError(
        "Couldn't save your changes. Check your connection and try again.",
      );
      setSaving(false);
    }
  }

  function confirmDeleteRecord() {
    Alert.alert(
      "Delete this health record?",
      "This will also remove any attached documents. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: handleDeleteRecord },
      ],
    );
  }

  async function handleDeleteRecord() {
    setDeletingRecord(true);
    try {
      await deleteHealthRecord(id, recordId);
      router.replace(`/(app)/(tabs)/my-dog/${id}/health`);
    } catch {
      setDeletingRecord(false);
      Alert.alert("Couldn't delete", "Check your connection and try again.");
    }
  }

  async function handleAddDocument() {
    setUploadError(null);
    let picked: Awaited<ReturnType<typeof pickHealthDocument>>;
    try {
      picked = await pickHealthDocument();
    } catch (err) {
      if (err instanceof DocumentTooLargeError) {
        setUploadError(err.message);
      } else {
        setUploadError("Couldn't open the file picker. Try again.");
      }
      return;
    }
    if (!picked) return; // cancelled

    setUploading(true);
    try {
      const updated = await uploadHealthDocument(id, recordId, picked);
      setRecord(updated);
    } catch {
      setUploadError("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleViewDocument(doc: HealthDocumentItem) {
    setDocError(null);
    setBusyDocId(doc.id);
    try {
      const { url } = await getDocumentDownloadUrl(id, recordId, doc.id);
      await Linking.openURL(url);
    } catch {
      setDocError({
        id: doc.id,
        message: "Couldn't open this document. Try again.",
      });
    } finally {
      setBusyDocId(null);
    }
  }

  function confirmDeleteDocument(doc: HealthDocumentItem) {
    Alert.alert("Delete this document?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => handleDeleteDocument(doc),
      },
    ]);
  }

  async function handleDeleteDocument(doc: HealthDocumentItem) {
    setDocError(null);
    setBusyDocId(doc.id);
    try {
      await deleteHealthDocument(id, recordId, doc.id);
      setRecord((prev) =>
        prev
          ? {
              ...prev,
              documents: prev.documents.filter((d) => d.id !== doc.id),
            }
          : prev,
      );
    } catch {
      setDocError({
        id: doc.id,
        message: "Couldn't delete this document. Try again.",
      });
    } finally {
      setBusyDocId(null);
    }
  }

  if (loadError) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ErrorText>{loadError}</ErrorText>
          <View style={styles.retryButton}>
            <Button label="Retry" onPress={load} variant="secondary" />
          </View>
        </View>
      </Screen>
    );
  }

  if (!values || !record) {
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
          <Text style={[typography.title, styles.heading]}>
            Edit Health Record
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
                maxLength={120}
              />
              {errors.vetName ? <ErrorText>{errors.vetName}</ErrorText> : null}
            </View>

            <View style={styles.field}>
              <TextArea
                label="Notes (optional)"
                value={values.notes}
                onChangeText={(t) => set("notes", t)}
                maxLength={1000}
              />
              {errors.notes ? <ErrorText>{errors.notes}</ErrorText> : null}
            </View>
          </Card>

          {saveError ? <ErrorText>{saveError}</ErrorText> : null}
          <View style={styles.saveButton}>
            <Button
              label="Save Changes"
              onPress={handleSave}
              loading={saving}
            />
          </View>

          <Text style={[typography.label, styles.sectionLabel]}>DOCUMENTS</Text>
          <Card>
            {record.documents.length === 0 ? (
              <Text style={typography.bodyMuted}>
                No documents attached yet.
              </Text>
            ) : (
              record.documents.map((doc) => (
                <View key={doc.id} style={styles.docRow}>
                  <View style={styles.docInfo}>
                    <Text style={typography.body} numberOfLines={1}>
                      {doc.fileName}
                    </Text>
                    <Text style={typography.caption}>
                      {formatSize(doc.sizeBytes)}
                    </Text>
                    {docError?.id === doc.id ? (
                      <ErrorText>{docError.message}</ErrorText>
                    ) : null}
                  </View>
                  {busyDocId === doc.id ? (
                    <ActivityIndicator color={colors.accent} />
                  ) : (
                    <View style={styles.docActions}>
                      <Pressable
                        onPress={() => handleViewDocument(doc)}
                        accessibilityRole="button"
                        hitSlop={8}
                      >
                        <Text style={styles.docActionText}>View</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => confirmDeleteDocument(doc)}
                        accessibilityRole="button"
                        hitSlop={8}
                      >
                        <Text style={[styles.docActionText, styles.deleteText]}>
                          Delete
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ))
            )}

            <View style={styles.addDocButton}>
              <Button
                label="+ Add Document"
                onPress={handleAddDocument}
                variant="secondary"
                loading={uploading}
                disabled={uploading}
              />
            </View>
            {uploadError ? <ErrorText>{uploadError}</ErrorText> : null}
          </Card>

          <View style={styles.deleteRecordButton}>
            <Button
              label="Delete Health Record"
              onPress={confirmDeleteRecord}
              variant="secondary"
              loading={deletingRecord}
              disabled={deletingRecord}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  retryButton: { marginTop: spacing.md },
  loadingWrap: { paddingTop: spacing.xl },
  gap: { marginTop: spacing.lg },
  flex: { flex: 1 },
  scroll: { paddingVertical: spacing.lg, paddingBottom: spacing.xxl },
  heading: { marginBottom: spacing.lg },
  field: { marginBottom: spacing.lg },
  saveButton: { marginTop: spacing.xl },
  sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.sm },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  docInfo: { flex: 1, marginRight: spacing.sm },
  docActions: { flexDirection: "row", gap: spacing.md },
  docActionText: { fontSize: 13, fontWeight: "600", color: colors.accent },
  deleteText: { color: colors.danger },
  addDocButton: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    minWidth: 180,
  },
  deleteRecordButton: { marginTop: spacing.xl, marginBottom: spacing.lg },
});

export default function EditHealthRecordScreen() {
  return (
    <RequireAuthScreen>
      <EditHealthRecordContent />
    </RequireAuthScreen>
  );
}
