import { useRef } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, typography } from "@/theme/tokens";

const OTP_LENGTH = 6;

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called once the value reaches OTP_LENGTH digits — screens auto-submit from here. */
  onComplete: (value: string) => void;
  disabled?: boolean;
}

/**
 * Renders as 6 visual boxes but is backed by a single, invisible TextInput —
 * the standard RN pattern for OTP inputs, because it's what lets the OS
 * autofill hooks (iOS `textContentType="oneTimeCode"`, Android
 * `autoComplete="sms-otp"`) actually populate the field from an incoming SMS.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
}: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);

  function handleChange(next: string) {
    const digitsOnly = next.replace(/[^0-9]/g, "").slice(0, OTP_LENGTH);
    onChange(digitsOnly);
    if (digitsOnly.length === OTP_LENGTH) {
      onComplete(digitsOnly);
    }
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.boxRow} pointerEvents="none">
        {Array.from({ length: OTP_LENGTH }).map((_, i) => {
          const digit = value[i] ?? "";
          const isActive = i === value.length;
          return (
            <View
              key={`otp-box-${
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length (6), never reordered.
                i
              }`}
              style={[styles.box, isActive && styles.boxActive]}
            >
              <Text style={typography.title}>{digit}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={OTP_LENGTH}
        editable={!disabled}
        autoFocus
        accessibilityLabel="6-digit verification code"
      />
    </View>
  );
}

const BOX_SIZE = 48;

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  boxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  boxActive: {
    borderColor: colors.accent,
  },
  // Real input sits invisibly on top so the OS treats this as a normal
  // text field (autofill, keyboard, cursor) while the boxes above do the
  // actual rendering.
  hiddenInput: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
});
