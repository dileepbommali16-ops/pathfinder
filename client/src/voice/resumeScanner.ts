/**
 * Instant Drag-and-Drop Resume Deep Scanner (client/src/voice/resumeScanner.ts)
 * Parses uploaded resume files (PDF text, plain text, DOCX), performs ATS placement audit,
 * detects missing Tier-1 keywords, and generates spoken and screen feedback.
 */

export interface ResumeAuditResult {
  fileName: string;
  atsScore: number;
  readinessTier: "Tier 1" | "Tier 2" | "Tier 3";
  extractedSkills: string[];
  missingKeywords: string[];
  metricsScore: number;
  summaryText: string;
  spokenFeedback: string;
}

const TIER1_KEYWORDS = [
  "Docker",
  "Kubernetes",
  "Redis",
  "Kafka",
  "PostgreSQL",
  "System Design",
  "Microservices",
  "CI/CD",
  "AWS",
  "REST API",
  "GraphQL",
  "TypeScript",
  "Go",
  "Python",
  "DSA",
  "Concurrency",
];

export async function analyzeResumeFile(file: File): Promise<ResumeAuditResult> {
  const text = await readFileAsText(file);
  const lower = text.toLowerCase();

  // Detect skills present
  const extractedSkills: string[] = [];
  const missingKeywords: string[] = [];

  for (const kw of TIER1_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      extractedSkills.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  }

  // Count quantifiable metrics (%, ms, X, numbers)
  const metricMatches = text.match(/(\d+%\s*|\d+x\s*|\d+\s*ms|\$\d+|\d+\s*users|\d+\s*requests)/gi) || [];
  const metricsCount = metricMatches.length;
  const metricsScore = Math.min(100, metricsCount * 18 + 20);

  // Calculate ATS Score (8+ tier-1 skills represents peak readiness)
  const skillCoverage = Math.min(50, (extractedSkills.length / 8) * 50);
  const metricCoverage = (metricsScore / 100) * 30;
  const baseScore = 20;
  const atsScore = Math.min(98, Math.round(baseScore + skillCoverage + metricCoverage));

  const readinessTier: "Tier 1" | "Tier 2" | "Tier 3" =
    atsScore >= 80 ? "Tier 1" : atsScore >= 60 ? "Tier 2" : "Tier 3";

  const topMissing = missingKeywords.slice(0, 3).join(", ");

  const spokenFeedback =
    atsScore >= 80
      ? `Sir, I analyzed your resume "${file.name}". Your ATS Placement Match is a strong ${atsScore}%, qualifying you for Tier-1 engineering roles! Adding ${topMissing} will push your profile to the top 5 percentile.`
      : `Sir, I completed the audit for "${file.name}". Your current ATS Match is ${atsScore}%. To qualify for Tier-1 campus packages up to 44.6 LPA, we recommend adding metrics and key skills like ${topMissing}.`;

  const summaryText = `[RESUME AUDIT: ${file.name}]\n• ATS Match Score: ${atsScore}% (${readinessTier})\n• Found Skills: ${extractedSkills.slice(0, 6).join(", ") || "General Engineering"}\n• Recommended Additions: ${topMissing || "Production deployment metrics"}\n• Quantifiable Impact Metrics: ${metricsCount} detected.`;

  return {
    fileName: file.name,
    atsScore,
    readinessTier,
    extractedSkills,
    missingKeywords,
    metricsScore,
    summaryText,
    spokenFeedback,
  };
}

async function readFileAsText(file: File): Promise<string> {
  try {
    if (typeof file.text === "function") {
      const text = await file.text();
      if (text && text.trim()) return text;
    }
    if (typeof file.arrayBuffer === "function") {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let str = "";
      for (let i = 0; i < Math.min(bytes.length, 64000); i++) {
        const charCode = bytes[i];
        if (charCode >= 32 && charCode <= 126) {
          str += String.fromCharCode(charCode);
        } else if (charCode === 10 || charCode === 13) {
          str += " ";
        }
      }
      return str || file.name;
    }
  } catch {}
  return file.name;
}
