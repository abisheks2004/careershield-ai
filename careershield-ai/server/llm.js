// LLM-powered recruitment scam analysis engine with Gemini API support
// and graceful fallback to rule-based heuristics.

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

/**
 * Perform LLM analysis using Google Gemini or OpenAI-compatible endpoint
 * @param {string} type - 'job' | 'message' | 'url'
 * @param {string} input - user input text or URL
 * @param {string} [apiKey] - optional API key (from env or request header)
 * @returns {Promise<{llmAnalysis: object|null, error?: string}>}
 */
export async function analyzeWithLLM(type, input, apiKey = process.env.GEMINI_API_KEY) {
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    return { llmAnalysis: null, status: "disabled" };
  }

  const prompt = `You are CareerShield AI, a premier cybersecurity and fraud intelligence analyst specializing in recruitment, employment, and job seeker scams.
Analyze the following candidate recruitment input and return a strict JSON response.

Input Type: ${type}
Content to analyze:
"""
${input.slice(0, 4000)}
"""

Evaluate the content for:
1. Advance-fee scams, fake checks, equipment purchase reimbursement schemes.
2. Informal messaging platforms (WhatsApp, Telegram, Signal) used without corporate verification.
3. Personal identification and financial phishing (SSN, routing numbers, ID photos).
4. Phishing / typosquatting domains, impersonation of legitimate companies.
5. High-pressure urgency tactics and unrealistic salary promises.

Respond ONLY with valid JSON conforming to this exact structure:
{
  "summary": "Concise forensic summary of findings",
  "dangerScore": 0-100 (integer representing risk),
  "threatCategory": "Advance-Fee Fraud" | "Identity Phishing" | "Impersonation" | "Check-Cashing Scheme" | "Informal Channel" | "Legitimate / Low Risk",
  "keyRedFlags": ["list of specific warning signs observed"],
  "countermeasures": ["concrete actions the job seeker should take"],
  "safeVerificationSteps": ["how to independently verify this employer"]
}`;

  try {
    const endpoint = `${GEMINI_API_URL}?key=${encodeURIComponent(apiKey.trim())}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        llmAnalysis: null,
        status: "error",
        error: `LLM API returned status ${response.status}: ${errText.slice(0, 120)}`
      };
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return { llmAnalysis: null, status: "error", error: "Empty response from LLM" };
    }

    const parsed = JSON.parse(candidateText);
    return {
      llmAnalysis: parsed,
      status: "active",
      provider: "Gemini 1.5 Flash"
    };
  } catch (err) {
    return {
      llmAnalysis: null,
      status: "error",
      error: err.message
    };
  }
}
