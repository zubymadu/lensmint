import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { api } from "../src/lib/api";
import { getToken } from "../src/lib/storage";
import { Card, Badge, SectionHead } from "../src/components/UI";
import { colors, spacing } from "../src/lib/theme";

interface Claim {
  id: string;
  status: string;
  trackedLink: string | null;
  trackedHashtag: string | null;
  claimedAt: string;
  campaign: { title: string; campaignType: string };
  payout: { amount: string; status: string } | null;
}

export default function MyClaims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    api.get<Claim[]>("/my/claims", token ?? undefined)
      .then(setClaims)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.accentLight} /></View>;

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={s.list}
      data={claims}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={<SectionHead title="My Claims" />}
      ListEmptyComponent={<Text style={{ color: colors.muted }}>No claims yet. Browse campaigns to get started.</Text>}
      renderItem={({ item: c }) => (
        <TouchableOpacity onPress={() => router.push(`/claim/${c.id}`)}>
          <Card>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.title} numberOfLines={1}>{c.campaign.title}</Text>
                <View style={s.chips}>
                  <Badge label={c.status} />
                  <Badge label={c.campaign.campaignType} />
                </View>
                {c.trackedLink && (
                  <Text style={s.mono} numberOfLines={1}>{c.trackedLink}</Text>
                )}
              </View>
              {c.payout && (
                <View style={s.payout}>
                  <Text style={s.payoutAmount}>₦{Number(c.payout.amount).toLocaleString()}</Text>
                  <Text style={s.payoutStatus}>{c.payout.status}</Text>
                </View>
              )}
            </View>
          </Card>
        </TouchableOpacity>
      )}
    />
  );
}

const s = StyleSheet.create({
  list: { padding: spacing.md },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  title: { color: colors.text, fontWeight: "700", fontSize: 15, marginBottom: 4 },
  chips: { flexDirection: "row", gap: spacing.sm, marginBottom: 6 },
  mono: { color: colors.muted, fontSize: 11, fontFamily: "monospace" },
  payout: { alignItems: "flex-end" },
  payoutAmount: { color: colors.success, fontWeight: "700", fontSize: 15 },
  payoutStatus: { color: colors.muted, fontSize: 11 },
});
