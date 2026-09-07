import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  runAnalysis,
  analyzeJob,
  analyzeMessage,
  analyzeUrl,
  clampScore,
  CATEGORY,
  SUSPICIOUS_TLDS,
  KNOWN_BRANDS
} from "../src/lib/analyzer.js";

describe("Scam Detection Analyzer Core Engine", () => {
  describe("clampScore and CATEGORY", () => {
    test("clamps scores correctly between 0 and 100", () => {
      assert.strictEqual(clampScore(-10), 0);
      assert.strictEqual(clampScore(0), 0);
      assert.strictEqual(clampScore(50.4), 50);
      assert.strictEqual(clampScore(120), 100);
    });

    test("correctly categorizes risk levels according to specification", () => {
      assert.strictEqual(CATEGORY(0), "No Risk");
      assert.strictEqual(CATEGORY(25), "Low Risk");
      assert.strictEqual(CATEGORY(55), "Suspicious");
      assert.strictEqual(CATEGORY(75), "High Risk");
      assert.strictEqual(CATEGORY(95), "Critical Risk");
    });

    test("exports threat intelligence lists (TLDs, brands)", () => {
      assert.ok(SUSPICIOUS_TLDS.length > 0);
      assert.ok(KNOWN_BRANDS.includes("linkedin"));
    });
  });

  describe("Job Scam Analysis", () => {
    test("detects upfront registration / equipment fee", () => {
      const input = "We have an open position for data entry. A registration fee of $45 is required for training.";
      const result = analyzeJob(input);
      assert.ok(result.score >= 25, `Expected score >= 25, got ${result.score}`);
      assert.ok(result.signals.some((s) => s.label.includes("fee") || s.category === "financial"));
      assert.ok(result.subscores.financial > 0);
    });

    test("detects fake check / equipment purchase scheme", () => {
      const input = "We will send you a cashier check to purchase home office equipment from our certified vendor.";
      const result = analyzeJob(input);
      assert.ok(result.score >= 35, `Expected score >= 35, got ${result.score}`);
      assert.ok(result.signals.some((s) => s.label.includes("check")));
    });

    test("detects cryptocurrency demands in job descriptions", () => {
      const input = "You will receive payments in cryptocurrency and must deposit bitcoin into company wallet address.";
      const result = analyzeJob(input);
      assert.ok(result.score >= 30, `Expected score >= 30, got ${result.score}`);
      assert.ok(result.signals.some((s) => s.label.includes("Cryptocurrency")));
    });

    test("detects free email domain used by recruiters", () => {
      const input = "Apply to our talent team at google-recruiter-hiring@gmail.com with your resume.";
      const result = analyzeJob(input);
      assert.ok(result.signals.some((s) => s.label.includes("free personal email domain")));
    });

    test("detects informal chat app redirects (WhatsApp / Telegram)", () => {
      const input = "Hiring immediately! Contact HR via WhatsApp at +1-555-0199 for interview instructions.";
      const result = analyzeJob(input);
      assert.ok(result.signals.some((s) => s.label.includes("informal chat apps")));
    });

    test("clean job posting produces 0 score", () => {
      const input = "Software Engineer at Acme Corp. Requires 3 years React experience, competitive salary, full health insurance.";
      const result = analyzeJob(input);
      assert.strictEqual(result.score, 0);
      assert.strictEqual(result.signals[0].weight, 0);
    });

    test("does not flag candidate email or legal contractual termination in legitimate campus LOI", () => {
      const input = "Phanindra <Phanindra.RS@itcinfotech.com> Dear ABISHEK S Registered Email ID: abisheka067@gmail.com Reference ID ITCI/2026/ENG/0109 Total CTC 4.25 LPA Associate IT Consultant. Your selection and this letter shall be terminated immediately if conditions not met.";
      const result = analyzeJob(input);
      assert.strictEqual(result.score, 0);
      assert.strictEqual(result.signals[0].weight, 0);
    });
  });

  describe("Message Scam Analysis", () => {
    test("detects unsolicited selection message with sensitive data requests", () => {
      const input = "Congratulations! You have been selected for the position. Send your bank account and SSN immediately to proceed.";
      const result = analyzeMessage(input);
      assert.ok(result.score >= 40, `Expected high score, got ${result.score}`);
      assert.ok(result.signals.some((s) => s.label.includes("selected")));
      assert.ok(result.signals.some((s) => s.label.includes("sensitive")));
      assert.ok(result.subscores.identity > 0);
    });

    test("detects urgency pressure language", () => {
      const input = "Urgent! Act now, this offer expires today if you don't respond right away.";
      const result = analyzeMessage(input);
      assert.ok(result.signals.some((s) => s.label.includes("urgency")));
    });

    test("benign message returns 0 score", () => {
      const input = "Hi John, following up on our call yesterday. Looking forward to your portfolio presentation next Tuesday.";
      const result = analyzeMessage(input);
      assert.strictEqual(result.score, 0);
    });
  });

  describe("URL Scam Analysis", () => {
    test("flags raw IP addresses", () => {
      const result = analyzeUrl("http://192.168.1.100/careers/apply");
      assert.ok(result.score >= 45, `Expected score >= 45, got ${result.score}`);
      assert.ok(result.signals.some((s) => s.label.includes("raw IP address")));
    });

    test("flags known brand impersonation", () => {
      const result = analyzeUrl("https://linkedin-career-portal.xyz/apply");
      assert.ok(result.score >= 45, `Expected score >= 45, got ${result.score}`);
      assert.ok(result.signals.some((s) => s.label.includes("impersonation")));
    });

    test("does not flag official brand domains as impersonation", () => {
      const result = analyzeUrl("https://linkedin.com/jobs/view/123456");
      assert.ok(!result.signals.some((s) => s.label.includes("impersonation")));
    });

    test("flags suspicious TLDs", () => {
      const result = analyzeUrl("https://careers-portal.top");
      assert.ok(result.signals.some((s) => s.label.includes("high-risk TLD")));
    });

    test("handles malformed URLs without throwing", () => {
      const result = analyzeUrl("http://:invalid::url");
      assert.ok(result.score > 0);
      assert.ok(result.signals.some((s) => s.label.includes("malformed")));
    });
  });

  describe("runAnalysis wrapper", () => {
    test("generates unique ID, timestamp, and full subscore metrics", () => {
      const report = runAnalysis("job", "Immediate hiring! Send $50 fee for equipment.");
      assert.ok(report.id);
      assert.ok(report.createdAt);
      assert.strictEqual(report.type, "job");
      assert.ok(report.subscores);
      assert.ok(typeof report.subscores.financial === "number");
      assert.ok(typeof report.subscores.credibility === "number");
    });

    test("throws on invalid type", () => {
      assert.throws(() => {
        runAnalysis("invalid_type", "some text");
      }, /Unsupported scan type/);
    });

    test("throws on empty or whitespace input", () => {
      assert.throws(() => {
        runAnalysis("job", "   ");
      }, /Scan input must be a non-empty string/);
    });
  });
});
