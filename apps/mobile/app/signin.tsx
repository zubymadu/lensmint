import { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { router } from "expo-router";
import { api } from "../src/lib/api";
import { saveSession } from "../src/lib/storage";
import { Btn, Input, Msg } from "../src/components/UI";
import { colors, spacing } from "../src/lib/theme";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setErr(""); setLoading(true);
    try {
      const res = await api.post<{ token: string; role: string }>("/auth/signin", { email, password });
      saveSession(res.token, res.role);
      router.replace("/campaigns");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Sign in</Text>
      <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      {err ? <Msg text={err} type="error" /> : null}
      <Btn label="Sign in" onPress={submit} loading={loading} />
      <Btn label="Create account" variant="ghost" onPress={() => router.push("/signup")} style={{ marginTop: spacing.sm }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: spacing.lg, paddingTop: spacing.xl * 2 },
  title: { color: colors.text, fontSize: 24, fontWeight: "700", marginBottom: spacing.lg },
});
