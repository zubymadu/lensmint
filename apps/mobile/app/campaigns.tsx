import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { api } from "../src/lib/api";
import { getToken } from "../src/lib/storage";
import { Card, Badge, SectionHead, Btn, Msg } from "../src/components/UI";
import { colors, spacing } from "../src/lib/theme";

interface Campaign {
  id: string;
  title: string;
  brief: string;
  campaignType: string;
  platforms: string[];
  _count?: { claims: number };
}

export default function Campaigns() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Record<string, { text: string; type: "success" | "error" }>>({});

  useEffect(() => {
    api.get<Campaign[]>("/campaigns")
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function claim(id: string) {
    setClaiming(id);
    const token = getToken();
    try {
      const res = await api.post<{ claimId: string; trackedLink: string }>(
        `/campaigns/${id}/claims`, {}, token ?? undefined,
      );
      setMsgs((m) => ({ ...m, [id]: { text: `Claimed! ${res.trackedLink}`, type: "success" } }));
    } catch (e) {
      setMsgs((m) => ({ ...m, [id]: { text: e instanceof Error ? e.message : "Failed", type: "error" } }));
    } finally {
      setClaiming(null);
    }
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.accentLight} /></View>;

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={s.list}
      data={items}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={<SectionHead title="Discover Campaigns" />}
      ListEmptyComponent={<Text style={{ color: colors.muted }}>No active campaigns right now.</Text>}
      renderItem={({ item: c }) => (
        <Card>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.title} numberOfLines={1}>{c.title}</Text>
              <View style={s.chips}>
                <Badge label={c.campaignType} />
                <Text style={s.sub}>{c.platforms.join(", ")} · {c._count?.claims ?? 0} creators</Text>
              </View>
              <Text style={s.brief} numberOfLines={2}>{c.brief}</Text>
            </View>
          </View>
          {msgs[c.id] && <Msg text={msgs[c.id].text} type={msgs[c.id].type} />}
          <View style={s.actions}>
            <Btn
              label={claiming === c.id ? "Claiming…" : "Claim"}
              onPress={() => claim(c.id)}
              loading={claiming === c.id}
              style={{ flex: 1, marginRight: spacing.sm }}
            />
            <TouchableOpacity onPress={() => router.push(`/campaign/${c.id}`)} style={s.detailBtn}>
              <Text style={{ color: colors.accentLight, fontSize: 13 }}>Details →</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}
    />
  );
}

const s = StyleSheet.create({
  list: { padding: spacing.md },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", gap: spacing.sm },
  title: { color: colors.text, fontWeight: "700", fontSize: 15, marginBottom: 4 },
  chips: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 6 },
  sub: { color: colors.muted, fontSize: 11 },
  brief: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
  detailBtn: { paddingHorizontal: spacing.sm },
});
