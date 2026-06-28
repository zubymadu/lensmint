import React from "react";
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle,
} from "react-native";
import { colors, radius, spacing } from "@/lib/theme";

// ── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── Button ────────────────────────────────────────────────────────────────────

interface BtnProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
  style?: ViewStyle;
}

export function Btn({ label, onPress, loading, disabled, variant = "primary", style }: BtnProps) {
  const bg =
    variant === "primary" ? colors.accent :
    variant === "danger" ? colors.danger :
    "transparent";
  const border = variant === "ghost" ? colors.border : undefined;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, { backgroundColor: bg, borderColor: border, borderWidth: border ? 1 : 0, opacity: disabled ? 0.4 : 1 }, style]}
    >
      {loading
        ? <ActivityIndicator color="#fff" size="small" />
        : <Text style={[styles.btnText, variant === "ghost" && { color: colors.text }]}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "url";
  autoCapitalize?: "none" | "sentences";
  style?: ViewStyle;
}

export function Input({ label, style, ...props }: InputProps) {
  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.muted}
        {...props}
      />
    </View>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────

const BADGE_COLORS: Record<string, { bg: string; fg: string }> = {
  active:       { bg: "#451a03", fg: colors.warning },
  qualified:    { bg: "#14532d", fg: colors.success },
  paid:         { bg: "#14532d", fg: colors.success },
  disqualified: { bg: "#450a0a", fg: colors.danger },
  rejected:     { bg: "#450a0a", fg: colors.danger },
  no_show:      { bg: "#450a0a", fg: colors.danger },
  qualifying:   { bg: "#451a03", fg: colors.warning },
  submitted:    { bg: "#451a03", fg: colors.warning },
  under_review: { bg: "#451a03", fg: colors.warning },
  draft:        { bg: colors.border, fg: colors.muted },
  standard:     { bg: "#3b0764", fg: colors.accentLight },
  seeding:      { bg: "#3b0764", fg: colors.accentLight },
  streaming:    { bg: "#3b0764", fg: colors.accentLight },
};

export function Badge({ label }: { label: string }) {
  const c = BADGE_COLORS[label] ?? { bg: colors.border, fg: colors.muted };
  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
      <Text style={{ color: c.fg, fontSize: 10, fontWeight: "700", textTransform: "uppercase" }}>{label}</Text>
    </View>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────

export function SectionHead({ title }: { title: string }) {
  return <Text style={styles.sectionHead}>{title}</Text>;
}

// ── Error / success message ───────────────────────────────────────────────────

export function Msg({ text, type }: { text: string; type: "error" | "success" }) {
  return (
    <Text style={{ color: type === "error" ? colors.danger : colors.success, fontSize: 13, marginBottom: spacing.sm }}>
      {text}
    </Text>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  btn: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  label: { color: colors.muted, fontSize: 12, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
  },
  sectionHead: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: spacing.md },
});
