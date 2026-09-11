import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { BottomSheet } from "@/components/BottomSheet";
import { colors, radius, spacing, typography } from "@/theme/tokens";

interface SelectBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: readonly string[];
  value: string;
  onSelect: (value: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
}

/**
 * The reusable "Select Breed / Select City" sheet — search field (when
 * searchable), scrollable option list, checkmark on the selected row.
 * Selecting a row closes the sheet, matching the reference interaction.
 */
export function SelectBottomSheet({
  visible,
  onClose,
  title,
  options,
  value,
  onSelect,
  searchable,
  searchPlaceholder = "Search...",
}: SelectBottomSheetProps) {
  const [query, setQuery] = useState("");

  const filtered = searchable
    ? options.filter((o) =>
        o.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : options;

  function handleSelect(option: string) {
    onSelect(option);
    setQuery("");
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      {searchable ? (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          autoCapitalize="none"
        />
      ) : null}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const selected = item === value;
          return (
            <Pressable
              onPress={() => handleSelect(item)}
              style={styles.row}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={typography.body}>{item}</Text>
              {selected ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={[typography.bodyMuted, styles.empty]}>No matches</Text>
        }
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  search: {
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  list: { maxHeight: 360 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  check: { color: colors.accent, fontWeight: "700", fontSize: 16 },
  empty: { textAlign: "center", paddingVertical: spacing.lg },
});
