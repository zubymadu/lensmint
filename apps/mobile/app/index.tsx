import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Btn } from "../src/components/UI";
import { colors, spacing } from "../src/lib/theme";

export default function Home() {
  return (
    <View style={s.container}>
      <View style={s.hero}>
        <Text style={s.logo}>
          <Text style={{ color: colors.accentLight }}>Lens</Text>mint
        </Text>
        <Text style={s.tagline}>Performance-based creator campaigns. No brand contact needed.</Text>
      </View>
      <Btn label="Sign in" onPress={() => router.push("/signin")} style={{ marginBottom: spacing.sm }} />
      <Btn label="Create account" variant="ghost" onPress={() => router.push("/signup")} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg, justifyContent: "center" },
  hero: { marginBottom: spacing.xl * 2 },
  logo: { fontSize: 36, fontWeight: "800", color: colors.text, marginBottom: spacing.sm },
  tagline: { color: colors.muted, fontSize: 15, lineHeight: 22 },
});
