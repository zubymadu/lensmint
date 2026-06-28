import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@lensmint/db";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── AI qualification entry point ──────────────────────────────────────────────

export async function runAiQualification(claimId: string): Promise<void> {
  const qr = await prisma.qualificationResult.findUniqueOrThrow({
    where: { claimId },
    include: {
      claim: {
        include: {
          campaign: true,
          submissionEvents: { orderBy: { submittedAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (qr.decision !== "needs_review") return; // already decided

  const submission = qr.claim.submissionEvents[0];
  if (!submission) return;

  const campaign = qr.claim.campaign;
  const method = qr.method;

  let decision: "pass" | "fail" | "needs_review" = "needs_review";
  let confidence = 0.5;
  let notes = "";

  try {
    switch (method) {
      case "transcript_sentiment": {
        const result = await runSentimentCheck(submission.submittedUrl, campaign.brief);
        decision = result.decision;
        confidence = result.confidence;
        notes = result.notes;
        break;
      }
      case "asset_match": {
        const result = await runAssetMatch(
          submission.submittedUrl,
          campaign.brandAssets as Array<{ type: string; url: string; name: string }>,
        );
        decision = result.decision;
        confidence = result.confidence;
        notes = result.notes;
        break;
      }
      case "audio_fingerprint": {
        // Stub — real implementation integrates ACRCloud or AudD
        decision = "needs_review";
        confidence = 0;
        notes = "Audio fingerprint queued for external matching service";
        break;
      }
      default: {
        const result = await runTextNlp(submission.submittedUrl, campaign.brief);
        decision = result.decision;
        confidence = result.confidence;
        notes = result.notes;
      }
    }
  } catch (err) {
    notes = `AI qualification error: ${err instanceof Error ? err.message : String(err)}`;
    decision = "needs_review";
    confidence = 0;
  }

  // Write result and advance claim
  await prisma.qualificationResult.update({
    where: { id: qr.id },
    data: { decision, confidence, notes, reviewedBy: "ai" },
  });

  const nextStatus =
    decision === "pass" ? "qualified" : decision === "fail" ? "disqualified" : "under_review";
  await prisma.campaignClaim.update({ where: { id: claimId }, data: { status: nextStatus } });
}

// ── Sentiment / mention check via Claude ─────────────────────────────────────

async function runSentimentCheck(
  postUrl: string,
  brief: string,
): Promise<{ decision: "pass" | "fail" | "needs_review"; confidence: number; notes: string }> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `You are a campaign qualification AI. A creator submitted this post URL for a brand campaign.

Campaign brief: ${brief}
Post URL: ${postUrl}

Based on the URL and brief, determine if the post likely contains a positive brand mention.
Respond with JSON only: {"decision":"pass"|"fail"|"needs_review","confidence":0.0-1.0,"notes":"brief reason"}`,
      },
    ],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  try {
    const parsed = JSON.parse(text.trim());
    return {
      decision: parsed.decision ?? "needs_review",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      notes: parsed.notes ?? "",
    };
  } catch {
    return { decision: "needs_review", confidence: 0.5, notes: "Could not parse AI response" };
  }
}

// ── Brand asset / visual check via Claude vision ─────────────────────────────

async function runAssetMatch(
  postUrl: string,
  brandAssets: Array<{ type: string; url: string; name: string }>,
): Promise<{ decision: "pass" | "fail" | "needs_review"; confidence: number; notes: string }> {
  const assetList = brandAssets.map((a) => `${a.name} (${a.type})`).join(", ");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `You are a campaign qualification AI. A creator submitted a post for a brand campaign.

Expected brand assets: ${assetList || "none specified"}
Post URL: ${postUrl}

Based on the URL path/filename, determine if this post likely includes the brand's assets.
Respond with JSON only: {"decision":"pass"|"fail"|"needs_review","confidence":0.0-1.0,"notes":"brief reason"}`,
      },
    ],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  try {
    const parsed = JSON.parse(text.trim());
    return {
      decision: parsed.decision ?? "needs_review",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      notes: parsed.notes ?? "",
    };
  } catch {
    return { decision: "needs_review", confidence: 0.5, notes: "Could not parse AI response" };
  }
}

// ── Generic NLP / text check ──────────────────────────────────────────────────

async function runTextNlp(
  postUrl: string,
  brief: string,
): Promise<{ decision: "pass" | "fail" | "needs_review"; confidence: number; notes: string }> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `Campaign brief: ${brief}
Post URL: ${postUrl}

Does the post URL suggest this content fulfills the campaign brief?
Respond with JSON only: {"decision":"pass"|"fail"|"needs_review","confidence":0.0-1.0,"notes":"brief reason"}`,
      },
    ],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  try {
    const parsed = JSON.parse(text.trim());
    return {
      decision: parsed.decision ?? "needs_review",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      notes: parsed.notes ?? "",
    };
  } catch {
    return { decision: "needs_review", confidence: 0.5, notes: "Could not parse AI response" };
  }
}
