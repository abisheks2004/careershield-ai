// Shared heuristic scoring engine used by the browser demo and API.
// This mirrors the weighted signal model from the CareerShield AI spec (section 8).
// It is a placeholder for the production pipeline: ML classifier +
// threat-intel lookups + GenAI explanation layer.
// The API can use this module directly until a production ML pipeline replaces it.

const CATEGORY = (score) => {
  if (score <= 30) return "Low Risk";
  if (score <= 60) return "Suspicious";
  if (score <= 80) return "High Risk";
  return "Critical Risk";
};

const SUSPICIOUS_TLDS = [".xyz", ".top", ".click", ".work", ".loan", ".gq", ".tk", ".men", ".biz"];
const URGENCY_WORDS = ["urgent", "immediately", "act now", "limited time", "expires today", "hurry", "asap", "right away"];
const PAYMENT_WORDS = ["registration fee", "training fee", "processing fee", "deposit", "pay to", "purchase equipment", "refundable", "send money", "wire transfer", "gift card"];
const SALARY_PATTERN = /\$\s?\d{3,}\s?(\/|per)?\s?(day|hour|week)|earn\s+\$\d{2,}[,\d]*\s+(a|per)\s+(week|day)/i;
const SENSITIVE_INFO_WORDS = ["ssn", "social security", "bank account", "routing number", "passport number", "credit card"];

function clampScore(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function analyzeJob(text) {
  const t = text.toLowerCase();
  const signals = [];
  let score = 0;

  if (PAYMENT_WORDS.some((w) => t.includes(w))) {
    signals.push({ weight: 25, label: "Payment or registration fee requested" });
    score += 25;
  }
  if (SALARY_PATTERN.test(text)) {
    signals.push({ weight: 10, label: "Unrealistic salary claim for the role described" });
    score += 10;
  }
  if (URGENCY_WORDS.some((w) => t.includes(w))) {
    signals.push({ weight: 10, label: "Urgency or pressure language detected" });
    score += 10;
  }
  if (SENSITIVE_INFO_WORDS.some((w) => t.includes(w))) {
    signals.push({ weight: 15, label: "Requests sensitive personal information upfront" });
    score += 15;
  }
  if (t.includes("no experience") && t.includes("high pay")) {
    signals.push({ weight: 10, label: "Unusually high pay for no stated experience" });
    score += 10;
  }
  if (/@(gmail|yahoo|outlook|hotmail)\.com/i.test(text) && /(hr|recruiter|talent)/i.test(text)) {
    signals.push({ weight: 15, label: "Recruiter using a free personal email domain" });
    score += 15;
  }

  if (signals.length === 0) {
    signals.push({ weight: 0, label: "No strong scam indicators detected in this text" });
  }

  return { score: clampScore(score), signals };
}

function analyzeMessage(text) {
  const t = text.toLowerCase();
  const signals = [];
  let score = 0;

  if (PAYMENT_WORDS.some((w) => t.includes(w))) {
    signals.push({ weight: 25, label: "Payment requested via message" });
    score += 25;
  }
  if (URGENCY_WORDS.some((w) => t.includes(w))) {
    signals.push({ weight: 10, label: "Urgency language pushing a fast decision" });
    score += 10;
  }
  if (/https?:\/\//i.test(text)) {
    signals.push({ weight: 15, label: "Contains an embedded link" });
    score += 15;
  }
  if (SENSITIVE_INFO_WORDS.some((w) => t.includes(w))) {
    signals.push({ weight: 15, label: "Requests sensitive personal or financial data" });
    score += 15;
  }
  if (/whatsapp|telegram/i.test(text) && /(interview|offer|hr)/i.test(text)) {
    signals.push({ weight: 10, label: "Interview/offer conducted entirely over informal messaging" });
    score += 10;
  }
  if (t.includes("congratulations") && t.includes("selected")) {
    signals.push({ weight: 10, label: "Unsolicited 'you've been selected' framing" });
    score += 10;
  }

  if (signals.length === 0) {
    signals.push({ weight: 0, label: "No strong scam indicators detected in this message" });
  }

  return { score: clampScore(score), signals };
}

function analyzeUrl(raw) {
  const signals = [];
  let score = 0;
  let hostname = raw;
  let parsed = null;

  try {
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    parsed = new URL(normalized);
    hostname = parsed.hostname;
  } catch {
    signals.push({ weight: 20, label: "URL could not be parsed — malformed structure" });
    return { score: clampScore(20 + score), signals, hostname: raw };
  }

  if (SUSPICIOUS_TLDS.some((tld) => hostname.endsWith(tld))) {
    signals.push({ weight: 20, label: `Uncommon top-level domain (${hostname.slice(hostname.lastIndexOf("."))}) often used in scam campaigns` });
    score += 20;
  }
  if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(hostname)) {
    signals.push({ weight: 40, label: "URL uses a raw IP address instead of a domain name" });
    score += 40;
  }
  if ((hostname.match(/-/g) || []).length >= 3) {
    signals.push({ weight: 15, label: "Domain contains an unusually high number of hyphens" });
    score += 15;
  }
  if (hostname.split(".").length > 3) {
    signals.push({ weight: 15, label: "Excessive subdomain nesting, a common cloaking technique" });
    score += 15;
  }
  const knownBrands = ["linkedin", "indeed", "google", "microsoft", "amazon", "naukri"];
  const impersonated = knownBrands.find((b) => hostname.includes(b) && !hostname.endsWith(`${b}.com`));
  if (impersonated) {
    signals.push({ weight: 40, label: `Domain references "${impersonated}" but is not the official domain — likely impersonation` });
    score += 40;
  }
  if (!/^https:\/\//i.test(raw)) {
    signals.push({ weight: 10, label: "No HTTPS — connection is not encrypted" });
    score += 10;
  }

  if (signals.length === 0) {
    signals.push({ weight: 0, label: "No strong scam indicators detected for this domain" });
  }

  return { score: clampScore(score), signals, hostname };
}

const RECOMMENDATIONS = {
  "Low Risk": "No strong warning signs found. Still confirm the recruiter and company independently before sharing personal information.",
  Suspicious: "Some warning signs were found. Verify the company, recruiter, and any links independently before proceeding.",
  "High Risk": "Multiple strong warning signs were found. Do not pay money or share sensitive information until the employer and recruitment channel are independently verified.",
  "Critical Risk": "This shows strong evidence of a scam pattern. Do not respond, pay, or share any personal information. Report and block this contact.",
};

export function runAnalysis(type, input) {
  if (!["job", "message", "url"].includes(type)) {
    throw new Error(`Unsupported scan type: ${type}`);
  }
  if (typeof input !== "string" || !input.trim()) {
    throw new Error("Scan input must be a non-empty string");
  }

  let result;
  if (type === "job") result = analyzeJob(input);
  else if (type === "message") result = analyzeMessage(input);
  else result = analyzeUrl(input);

  const riskLevel = CATEGORY(result.score);
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    input,
    score: result.score,
    riskLevel,
    signals: result.signals,
    recommendation: RECOMMENDATIONS[riskLevel],
    createdAt: new Date().toISOString(),
  };
}

export function riskColorVar(riskLevel) {
  switch (riskLevel) {
    case "Low Risk":
      return "var(--color-safe)";
    case "Suspicious":
      return "var(--color-warn)";
    case "High Risk":
      return "var(--color-danger)";
    case "Critical Risk":
      return "var(--color-danger)";
    default:
      return "var(--color-text-dim)";
  }
}
