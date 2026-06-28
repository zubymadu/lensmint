import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { api } from "../../src/lib/api";
import { getToken } from "../../src/lib/storage";
import { Card, Badge, Btn, Input, Msg } from "../../src/components/UI";
import { colors, spacing } from "../../src/lib/theme";

interface Claim {
  id: string;
  status: string;
  trackedLink: string | null;
  trackedHashtag: string | null;
  campaign: { title: string; campaignType: string; platforms: string[] };
  payout: { amount: string; status: string; holdReleaseDate: string | null } | null;
}

export default function ClaimDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);

  const [postUrl, setPostUrl] = useState("");
  const [postedAt, setPostedAt] = useState(new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const token = getToken();
    api.get<Claim>(`/claims/${id}`, token ?? undefined)
      .then(setClaim)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function submitPost() {
    if (!claim) return;
    setErr(""); setMsg(""); setSubmitting(true);
    try {
      const res = await api.post<{ status: string; trackedIdentifierPresent: boolean }>(
        `/claims/${id}/submissions`,
        { postUrl, platform: claim.campaign.platforms[0] ?? "instagram", postedAt: new Date(postedAt).toISOString() },
        getToken() ?? undefined,
      );
      setMsg(`${res.status === "accepted" ? "✓ Accepted" : "✗ " + res.status}. Attribution: ${res.trackedIdentifierPresent ? "✓" : "✗"}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.accentLight} /></View>;
  if (!claim) return <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.md }}><Text style={{ color: colors.muted }}>Not found.</Text></View>;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <View style={s.header}>
        <Text style={s.title}>{claim.campaign.title}</Text>
        <View style={s.chips}>
          <Badge label={claim.status} />
          <Badge label={claim.campaign.campaignType} />
        </View>
      </View>

      {claim.trackedLink && (
        <Card>
          <Text style={s.cardTitle}>Your tracked identifiers</Text>
          <Text style={s.mono}>Link: {claim.trackedLink}</Text>
          <Text style={s.mono}>Tag:  {claim.trackedHashtag}</Text>
          <Text style={s.hint}>Include these in your post for attribution verification.</Text>
        </Card>
      )}

      {claim.payout && (
        <Card>
          <Text style={s.cardTitle}>Payout</Text>
          <Text style={{ color: colors.success, fontSize: 22, fontWeight: "700" }}>
            ₦{Number(claim.payout.amount).toLocaleString()}
          </Text>
          <Text style={s.hint}>Status: {claim.payout.status}</Text>
          {claim.payout.holdReleaseDate && (
            <Text style={s.hint}>Releases: {new Date(claim.payout.holdReleaseDate).toLocaleDateString()}</Text>
          )}
        </Card>
      )}

      {claim.status === "active" && (
        <Card>
          <Text style={s.cardTitle}>Submit your post</Text>
          <Input label="Post URL" value={postUrl} onChangeText={setPostUrl} keyboardType="url" autoCapitalize="none" placeholder="https://instagram.com/p/…" />
          <Input label="Posted at (local time)" value={postedAt} onChangeText={setPostedAt} placeholder="YYYY-MM-DDTHH:MM" />
          {msg ? <Msg text={msg} type="success" /> : null}
          {err ? <Msg text={err} type="error" /> : null}
          <Btn label={submitting ? "Submitting…" : "Submit post"} onPress={submitPost} loading={submitting} />
        </Card>
      )}

      <Btn label="← Back to claims" variant="ghost" onPress={() => router.back()} style={{ marginTop: spacing.sm }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 20, fontWeight: "700", marginBottom: 6 },
  chips: { flexDirection: "row", gap: spacing.sm },
  cardTitle: { color: colors.text, fontWeight: "600", fontSize: 15, marginBottom: spacing.sm },
  mono: { color: colors.muted, fontFamily: "monospace", fontSize: 12, marginBottom: 4 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 6 },
});
