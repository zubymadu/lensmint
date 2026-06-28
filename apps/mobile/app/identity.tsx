import { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { api } from "../src/lib/api";
import { getToken } from "../src/lib/storage";
import { Card, Btn, Input, Msg, SectionHead } from "../src/components/UI";
import { colors, spacing } from "../src/lib/theme";

type Step = "phone" | "otp" | "bank";

export default function Identity() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [psp, setPsp] = useState("paystack");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  function reset() { setMsg(""); setErr(""); }

  async function sendOtp() {
    reset(); setLoading(true);
    try {
      await api.post("/identity/otp/send", { phone }, getToken() ?? undefined);
      setMsg("OTP sent. Check your phone. (Dev: 123456)");
      setStep("otp");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  }

  async function verifyOtp() {
    reset(); setLoading(true);
    try {
      await api.post("/identity/otp/verify", { phone, otp }, getToken() ?? undefined);
      setMsg("Phone verified!");
      setStep("bank");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  }

  async function addBank() {
    reset(); setLoading(true);
    try {
      await api.post("/identity/bank-account", { accountNumber, bankCode, pspProvider: psp }, getToken() ?? undefined);
      setMsg("Bank account verified — you are now Tier 1!");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <SectionHead title="Verify Identity" />

      <View style={s.steps}>
        {(["phone", "otp", "bank"] as Step[]).map((s2, i) => (
          <Text key={s2} style={[s.step, step === s2 && s.stepActive]}>
            {i + 1}. {s2 === "phone" ? "Phone" : s2 === "otp" ? "OTP" : "Bank"}
          </Text>
        ))}
      </View>

      {step === "phone" && (
        <Card>
          <Text style={s.cardTitle}>Enter your phone number</Text>
          <Input label="Phone (with country code)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+2348012345678" />
          {msg ? <Msg text={msg} type="success" /> : null}
          {err ? <Msg text={err} type="error" /> : null}
          <Btn label={loading ? "Sending…" : "Send OTP"} onPress={sendOtp} loading={loading} />
        </Card>
      )}

      {step === "otp" && (
        <Card>
          <Text style={s.cardTitle}>Enter the OTP sent to {phone}</Text>
          <Input label="One-time code" value={otp} onChangeText={setOtp} keyboardType="numeric" />
          {msg ? <Msg text={msg} type="success" /> : null}
          {err ? <Msg text={err} type="error" /> : null}
          <Btn label={loading ? "Verifying…" : "Verify OTP"} onPress={verifyOtp} loading={loading} />
          <Btn label="← Back" variant="ghost" onPress={() => setStep("phone")} style={{ marginTop: spacing.sm }} />
        </Card>
      )}

      {step === "bank" && (
        <Card>
          <Text style={s.cardTitle}>Link your bank account</Text>
          <Text style={s.hint}>No BVN/NIN required. We resolve via PSP.</Text>
          <Input label="Account number (10 digits)" value={accountNumber} onChangeText={setAccountNumber} keyboardType="numeric" />
          <Input label="Bank code (NUBAN, e.g. 044)" value={bankCode} onChangeText={setBankCode} keyboardType="numeric" />
          {msg ? <Msg text={msg} type="success" /> : null}
          {err ? <Msg text={err} type="error" /> : null}
          <Btn label={loading ? "Verifying…" : "Verify bank account"} onPress={addBank} loading={loading} />
        </Card>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  steps: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  step: { color: colors.muted, fontSize: 13 },
  stepActive: { color: colors.accentLight, fontWeight: "700" },
  cardTitle: { color: colors.text, fontWeight: "600", fontSize: 15, marginBottom: spacing.sm },
  hint: { color: colors.muted, fontSize: 12, marginBottom: spacing.md },
});
