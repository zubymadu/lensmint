import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { api } from "../src/lib/api";
import { saveSession } from "../src/lib/storage";
import { Btn, Input, Msg } from "../src/components/UI";
import { colors, spacing } from "../src/lib/theme";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"creator" | "brand">("creator");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setErr(""); setLoading(true);
    try {
      const res = await api.post<{ token: string; role: string }>("/auth/signup", { email, password, role });
      saveSession(res.token, res.role);
      router.replace("/campaigns");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Create account</Text>

      <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />

      <Text style={s.roleLabel}>I am a</Text>
      <View style={s.roleRow}>
        {(["creator", "brand"] as const).map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => setRole(r)}
            style={[s.roleChip, role === r && s.roleChipActive]}
          >
            <Text style={[s.roleChipText, role === r && s.roleChipTextActive]}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {err ? <Msg text={err} type="error" /> : null}
      <Btn label="Create account" onPress={submit} loading={loading} style={{ marginTop: spacing.md }} />
      <Btn label="Sign in instead" variant="ghost" onPress={() => router.push("/signin")} style={{ marginTop: spacing.sm }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: spacing.lg, paddingTop: spacing.xl * 2 },
  title: { color: colors.text, fontSize: 24, fontWeight: "700", marginBottom: spacing.lg },
  roleLabel: { color: colors.muted, fontSize: 12, marginBottom: spacing.sm },
  roleRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  roleChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  roleChipText: { color: colors.muted, fontWeight: "600", fontSize: 14 },
  roleChipTextActive: { color: "#fff" },
});
