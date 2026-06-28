import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { api } from "../../src/lib/api";
import { getToken } from "../../src/lib/storage";
import { Card, Badge, Btn, Msg, SectionHead } from "../../src/components/UI";
import { colors, spacing } from "../../src/lib/theme";

interface Campaign {
  id: string;
  title: string;
  brief: string;
  campaignType: string;
  platforms: string[];
  complianceTier: string;
  requiresDisclosureLabel: boolean;
  status: string;
  _count?: { claims: number };
}

export default function CampaignDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get<Campaign>(`/campaigns/${id}`)
      .then(setCampaign)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function claim() {
    setClaiming(true); setErr(""); setMsg("");
    try {
      const res = await api.post<{ claimId: string; trackedLink: string; trackedHashtag: string }>(
        `/campaigns/${id}/claims`, {}, getToken() ?? undefined,
      );
      setMsg(`Claimed! Link: ${res.trackedLink}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setClaiming(false);
    }
  }

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.accentLight} /></View>;
  if (!campaign) return <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.md }}><Text style={{ color: colors.muted }}>Not found.</Text></View>;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <View style={s.header}>
        <View style={s.chips}>
          <Badge label={campaign.campaignType} />
          <Badge label={campaign.status} />
        </View>
        <Text style={s.title}>{campaign.title}</Text>
        <Text style={s.sub}>{campaign.platforms.join(", ")} · {campaign._count?.claims ?? 0} creators</Text>
      </View>

      <Card>
        <Text style={s.cardTitle}>Brief</Text>
        <Text style={s.brief}>{campaign.brief}</Text>
        {campaign.requiresDisclosureLabel && (
          <Text style={s.disclosure}>⚠ Requires disclosure label (#ad or equivalent)</Text>
        )}
      </Card>

      {msg ? <Msg text={msg} type="success" /> : null}
      {err ? <Msg text={err} type="error" /> : null}

      <Btn label={claiming ? "Claiming…" : "Claim campaign"} onPress={claim} loading={claiming} />
      <Btn label="← Back" variant="ghost" onPress={() => router.back()} style={{ marginTop: spacing.sm }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { marginBottom: spacing.md },
  chips: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  title: { color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: 4 },
  sub: { color: colors.muted, fontSize: 13 },
  cardTitle: { color: colors.text, fontWeight: "600", fontSize: 15, marginBottom: spacing.sm },
  brief: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  disclosure: { color: colors.warning, fontSize: 12, marginTop: spacing.sm },
});
