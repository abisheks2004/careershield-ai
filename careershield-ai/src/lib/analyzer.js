// Shared heuristic scoring engine used by the browser demo and API.
// Mirrors the weighted signal model from the CareerShield AI specification.
// Includes dimensional sub-scores (financial, identity, communication, credibility)
// and expanded threat patterns (crypto, check scams, informal chat, typosquatting).

export const CATEGORY = (score) => {
  if (score === 0) return "No Risk";
  if (score <= 30) return "Low Risk";
  if (score <= 60) return "Suspicious";
  if (score <= 80) return "High Risk";
  return "Critical Risk";
};

export const SUSPICIOUS_TLDS = [
  ".xyz", ".top", ".click", ".work", ".loan", ".gq", ".tk", ".men",
  ".biz", ".icu", ".vip", ".live", ".stream", ".cam", ".monster",
  ".quest", ".buzz", ".cfd"
];

export const KNOWN_BRANDS = [
  "linkedin", "indeed", "google", "microsoft", "amazon", "naukri",
  "glassdoor", "upwork", "fiverr", "handshake", "ziprecruiter",
  "greenhouse", "lever", "workday", "apple", "meta", "netflix"
];

const SCAM_URGENCY_PATTERNS = [
  /urgent(ly)?\s+(hiring|needed|required|seeking)/i,
  /(reply|respond|act|send|pay|contact|transfer)\s+(immediately|asap|urgently|right away)/i,
  /immediately\s+(reply|respond|transfer|send|wire|pay)/i,
  /act\s+now/i,
  /limited\s+(spots|seats|openings|positions|time)/i,
  /expires\s+(today|within|in\s+\d+)/i,
  /within\s+\d{1,2}\s+(hours?|mins?|minutes?)/i,
  /last\s+chance/i,
  /don't\s+delay/i,
  /immediate\s+(start|hiring|selection|onboarding\s+fee)/i
];

const PAYMENT_WORDS = [
  "registration fee", "training fee", "processing fee", "deposit required",
  "pay to start", "purchase equipment", "refundable fee", "send money",
  "wire transfer", "western union", "moneygram", "zelle", "cash app",
  "venmo to start", "advance fee", "background check fee", "equipment insurance"
];

const CRYPTO_WORDS = [
  "crypto", "cryptocurrency", "bitcoin", "btc", "eth", "ethereum",
  "usdt", "tether", "binance", "coinbase", "wallet address", "send btc",
  "gift card", "apple gift card", "steam card", "vanilla visa"
];

const CHECK_SCAM_PATTERNS = [
  /cashier'?s?\s+check/i,
  /send\s+you\s+a\s+check/i,
  /deposit.*check.*wire/i,
  /deposit\s+the\s+check/i,
  /mail\s+you\s+a\s+check/i,
  /send.*remaining.*funds/i,
  /overpayment/i,
  /check.*purchase.*equipment/i,
  /vendor.*equipment.*check/i,
];

const INFORMAL_CHAT_PATTERNS = [
  /whatsapp/i,
  /telegram/i,
  /signal\s+app/i,
  /google\s+(chat|hangouts)/i,
  /viber/i,
];

const SALARY_PATTERN = /\$\s?\d{3,}\s?(\/|per)?\s?(day|hour|week)|earn\s+\$\d{2,}[,\d]*\s+(a|per)\s+(week|day)/i;

const SENSITIVE_INFO_WORDS = [
  "ssn", "social security", "bank account", "routing number",
  "passport number", "credit card", "driver's license", "drivers license",
  "id card photo", "bank login", "front and back of your id"
];

export function hasRecruiterFreeEmail(text) {
  const freeEmailRegex = /([a-zA-Z0-9._%+-]+)@(gmail|yahoo|outlook|hotmail|proton|protonmail|icloud|aol)\.(com|me)/gi;
  let match;
  while ((match = freeEmailRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const prefix = text.slice(Math.max(0, match.index - 60), match.index).toLowerCase();

    // Check if explicitly identified as the candidate's / applicant's personal email
    const isCandidateEmail = /(registered\s+email|candidate\s*([e-]?mail)?|applicant\s*([e-]?mail)?|student\s*([e-]?mail)?|to\s*:|recipient\s*:|your\s+email)/i.test(prefix);
    if (isCandidateEmail) {
      continue;
    }

    // Check if the recruiter / company contact is explicitly using this free email
    const context = text.slice(Math.max(0, match.index - 80), Math.min(text.length, match.index + fullMatch.length + 80)).toLowerCase();
    if (/(from\s*:|apply\s+to|send\s+(your\s+)?(cv|resume)|contact\s+(hr|recruiter|us|me)|reach\s+out|email\s+(us|me|at)|recruiter|talent|hiring)/i.test(context)) {
      return true;
    }
  }
  return false;
}

export function clampScore(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function calculateSubscores(signals) {
  let financial = 0;
  let identity = 0;
  let communication = 0;
  let credibility = 0;

  for (const signal of signals) {
    const category = signal.category || "credibility";
    if (category === "financial") financial += signal.weight;
    else if (category === "identity") identity += signal.weight;
    else if (category === "communication") communication += signal.weight;
    else credibility += signal.weight;
  }

  return {
    financial: clampScore(financial * 2.2),
    identity: clampScore(identity * 2.5),
    communication: clampScore(communication * 2.5),
    credibility: clampScore(credibility * 2.0),
  };
}

export function analyzeJob(text) {
  const t = text.toLowerCase();
  const signals = [];
  let score = 0;

  if (PAYMENT_WORDS.some((w) => t.includes(w))) {
    signals.push({ weight: 25, category: "financial", label: "Upfront fee or equipment payment requested" });
    score += 25;
  }

  if (CRYPTO_WORDS.some((w) => t.includes(w))) {
    signals.push({ weight: 30, category: "financial", label: "Cryptocurrency or gift card transaction mentioned" });
    score += 30;
  }

  if (CHECK_SCAM_PATTERNS.some((p) => p.test(text))) {
    signals.push({ weight: 35, category: "financial", label: "Classic check-cashing / equipment check scheme indicators" });
    score += 35;
  }

  if (SALARY_PATTERN.test(text)) {
    signals.push({ weight: 15, category: "credibility", label: "Unrealistically high compensation claim for the role described" });
    score += 15;
  }

  if (SCAM_URGENCY_PATTERNS.some((p) => p.test(text))) {
    signals.push({ weight: 10, category: "communication", label: "High-pressure urgency language detected" });
    score += 10;
  }

  if (SENSITIVE_INFO_WORDS.some((w) => t.includes(w))) {
    signals.push({ weight: 20, category: "identity", label: "Requests sensitive personal or banking information upfront" });
    score += 20;
  }

  if ((t.includes("no experience") || t.includes("no degree")) && (t.includes("high pay") || t.includes("$500") || t.includes("$1000"))) {
    signals.push({ weight: 15, category: "credibility", label: "Unusually high compensation promised with no required experience" });
    score += 15;
  }

  if (hasRecruiterFreeEmail(text)) {
    signals.push({ weight: 15, category: "communication", label: "Recruiter using a free personal email domain (@gmail, @yahoo, etc.)" });
    score += 15;
  }

  if (INFORMAL_CHAT_PATTERNS.some((p) => p.test(text)) && /(interview|hiring|application|contact)/i.test(text)) {
    signals.push({ weight: 15, category: "communication", label: "Directs applicant to informal chat apps (Telegram, WhatsApp) for hiring" });
    score += 15;
  }

  if (t.includes("secret shopper") || t.includes("mystery shopper") || t.includes("package reship")) {
    signals.push({ weight: 25, category: "credibility", label: "Mystery shopper or package re-shipping mule scheme language" });
    score += 25;
  }

  if (signals.length === 0) {
    signals.push({ weight: 0, category: "credibility", label: "No strong scam indicators detected in this text" });
  }

  const subscores = calculateSubscores(signals);
  return { score: clampScore(score), signals, subscores };
}

export function analyzeMessage(text) {
  const t = text.toLowerCase();
  const signals = [];
  let score = 0;

  if (PAYMENT_WORDS.some((w) => t.includes(w))) {
    signals.push({ weight: 25, category: "financial", label: "Payment or deposit requested via direct message" });
    score += 25;
  }

  if (CRYPTO_WORDS.some((w) => t.includes(w))) {
    signals.push({ weight: 30, category: "financial", label: "Demands cryptocurrency or gift cards" });
    score += 30;
  }

  if (CHECK_SCAM_PATTERNS.some((p) => p.test(text))) {
    signals.push({ weight: 35, category: "financial", label: "Check deposit instructions or overpayment scheme" });
    score += 35;
  }

  if (SCAM_URGENCY_PATTERNS.some((p) => p.test(text))) {
    signals.push({ weight: 15, category: "communication", label: "High-pressure urgency urging immediate action" });
    score += 15;
  }

  if (/https?:\/\//i.test(text)) {
    signals.push({ weight: 10, category: "credibility", label: "Contains external link in unsolicited message" });
    score += 10;
  }

  if (SENSITIVE_INFO_WORDS.some((w) => t.includes(w))) {
    signals.push({ weight: 25, category: "identity", label: "Requests sensitive personal, banking, or credential data" });
    score += 25;
  }

  if (INFORMAL_CHAT_PATTERNS.some((p) => p.test(text)) && /(interview|offer|hr|starter kit|job)/i.test(text)) {
    signals.push({ weight: 15, category: "communication", label: "Recruitment conducted entirely over informal messaging (WhatsApp/Telegram)" });
    score += 15;
  }

  if ((t.includes("congratulations") || t.includes("pleased to inform")) && (t.includes("selected") || t.includes("offered") || t.includes("approved"))) {
    signals.push({ weight: 15, category: "communication", label: "Unsolicited 'You have been selected/hired' framing without interview" });
    score += 15;
  }

  if (hasRecruiterFreeEmail(text)) {
    signals.push({ weight: 10, category: "communication", label: "Message sent from or directs to a free webmail address" });
    score += 10;
  }

  if (signals.length === 0) {
    signals.push({ weight: 0, category: "credibility", label: "No strong scam indicators detected in this message" });
  }

  const subscores = calculateSubscores(signals);
  return { score: clampScore(score), signals, subscores };
}

export function analyzeUrl(raw) {
  const signals = [];
  let score = 0;
  let hostname = raw;
  let parsed = null;

  try {
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    parsed = new URL(normalized);
    hostname = parsed.hostname.toLowerCase();
  } catch {
    signals.push({ weight: 25, category: "credibility", label: "URL could not be parsed — malformed or deceptive structure" });
    return {
      score: clampScore(25),
      signals,
      hostname: raw,
      subscores: { financial: 0, identity: 0, communication: 0, credibility: 30 }
    };
  }

  if (SUSPICIOUS_TLDS.some((tld) => hostname.endsWith(tld))) {
    const matchedTld = hostname.slice(hostname.lastIndexOf("."));
    signals.push({ weight: 25, category: "credibility", label: `Uncommon high-risk TLD (${matchedTld}) frequently observed in phishing campaigns` });
    score += 25;
  }

  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    signals.push({ weight: 45, category: "credibility", label: "URL uses a raw IP address instead of a legitimate domain name" });
    score += 45;
  }

  const hyphenCount = (hostname.match(/-/g) || []).length;
  if (hyphenCount >= 3) {
    signals.push({ weight: 15, category: "credibility", label: "Domain contains excessive hyphens (common typosquatting technique)" });
    score += 15;
  }

  const parts = hostname.split(".");
  if (parts.length > 3) {
    signals.push({ weight: 15, category: "credibility", label: "Excessive subdomain nesting used for redirection cloaking" });
    score += 15;
  }

  const impersonated = KNOWN_BRANDS.find((b) => {
    if (!hostname.includes(b)) return false;
    const isOfficial = hostname === `${b}.com` || hostname.endsWith(`.${b}.com`) ||
                       hostname === `${b}.org` || hostname.endsWith(`.${b}.org`) ||
                       hostname === `${b}.co` || hostname.endsWith(`.${b}.co`);
    return !isOfficial;
  });

  if (impersonated) {
    signals.push({
      weight: 45,
      category: "credibility",
      label: `Domain references recognized brand "${impersonated}" but is NOT the official domain — high probability of impersonation`
    });
    score += 45;
  }

  if (!/^https:\/\//i.test(raw)) {
    signals.push({ weight: 15, category: "credibility", label: "Unencrypted connection (HTTP instead of HTTPS)" });
    score += 15;
  }

  if (signals.length === 0) {
    signals.push({ weight: 0, category: "credibility", label: "No strong scam indicators detected for this domain" });
  }

  const subscores = calculateSubscores(signals);
  return { score: clampScore(score), signals, hostname, subscores };
}

export const RECOMMENDATIONS = {
  "No Risk": "No warning signs were found. Always confirm the recruiter on official company channels before sharing personal information.",
  "Low Risk": "Minor or no warning signs found. Verify the recruiter's identity on LinkedIn or the corporate careers page.",
  "Suspicious": "Caution: Notable red flags were identified. Do not send funds, purchase equipment, or provide sensitive ID without independent corporate verification.",
  "High Risk": "High Danger: Multiple strong scam indicators detected. Legitimate employers will never ask for gift cards, crypto, or check-deposit equipment purchases.",
  "Critical Risk": "Critical Warning: Severe scam and fraud indicators found. Cut off communication immediately, do not click links, do not send money or IDs, and report to platform abuse.",
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
  const recommendation = result.signals.some((s) => s.weight > 0)
    ? RECOMMENDATIONS[riskLevel]
    : RECOMMENDATIONS["No Risk"];

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    input,
    score: result.score,
    riskLevel,
    signals: result.signals,
    subscores: result.subscores,
    recommendation,
    createdAt: new Date().toISOString(),
  };
}

export function riskColorVar(riskLevel, score = 0) {
  if (score > 80 || riskLevel === "Critical Risk") return "var(--color-danger, #ef4444)";
  if (score > 60 || riskLevel === "High Risk") return "#f97316";
  if (score > 30 || riskLevel === "Suspicious") return "var(--color-warn, #eab308)";
  if (score > 0 || riskLevel === "Low Risk") return "#3b82f6";
  return "var(--color-safe, #22c55e)";
}
