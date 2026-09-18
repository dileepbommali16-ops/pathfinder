import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { fetchIndustryNews } from "./newsService";
import { getPredictionHistory, getPlacementRecords, addPredictionHistory, replacePlacementRecords } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";

const optionalFilter = z.string().optional();

function parseCsv(content: string) {
  const lines = content.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new TRPCError({ code: "BAD_REQUEST", message: "CSV must include a header and at least one data row." });
  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  const required = ["year", "branch", "gender", "skillcategory", "placed", "cgpa", "codingscore", "communicationscore", "internships"];
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length) throw new TRPCError({ code: "BAD_REQUEST", message: `Missing CSV columns: ${missing.join(", ")}` });

  const records = lines.slice(1).map((line, index) => {
    const values = line.split(",").map((value) => value.trim());
    const get = (key: string) => values[headers.indexOf(key)] ?? "";
    const year = Number(get("year"));
    const cgpa = Number(get("cgpa"));
    const codingScore = Number(get("codingscore"));
    const communicationScore = Number(get("communicationscore"));
    const internships = Number(get("internships"));
    if (![year, cgpa, codingScore, communicationScore, internships].every(Number.isFinite)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid numeric value on CSV row ${index + 2}.` });
    }
    return {
      sourceId: Number(get("sourceid")) || index + 1,
      year,
      branch: get("branch"),
      gender: get("gender"),
      skillCategory: get("skillcategory"),
      placed: ["1", "true", "yes", "placed"].includes(get("placed").toLowerCase()) ? 1 : 0,
      cgpa: Math.round(cgpa * 10),
      codingScore: Math.round(codingScore * 10),
      communicationScore: Math.round(communicationScore * 10),
      internships,
    };
  });
  if (records.some((record) => !record.branch || !record.gender || !record.skillCategory)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Branch, gender, and skillCategory cannot be empty." });
  }
  return records;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  placement: router({
    records: publicProcedure.input(z.object({
      year: optionalFilter,
      branch: optionalFilter,
      gender: optionalFilter,
      skillCategory: optionalFilter,
    }).optional()).query(({ input }) => getPlacementRecords({
      year: input?.year ? Number(input.year) : undefined,
      branch: input?.branch,
      gender: input?.gender,
      skillCategory: input?.skillCategory,
    })),
    uploadCsv: adminProcedure.input(z.object({ content: z.string().min(1).max(3_000_000) })).mutation(async ({ input }) => {
      const records = parseCsv(input.content);
      const count = await replacePlacementRecords(records);
      return { count };
    }),
  }),
  predictions: router({
    history: protectedProcedure.query(({ ctx }) => getPredictionHistory(ctx.user.id)),
    save: protectedProcedure.input(z.object({
      cgpa: z.number().min(0).max(10), backlogs: z.number().int().min(0).max(20), internships: z.number().int().min(0).max(10),
      communication: z.number().int().min(1).max(10), coding: z.number().int().min(1).max(10), chance: z.number().int().min(0).max(100),
    })).mutation(({ ctx, input }) => addPredictionHistory({ userId: ctx.user.id, cgpa: Math.round(input.cgpa * 10), backlogs: input.backlogs, internships: input.internships, communication: input.communication, coding: input.coding, chance: input.chance })),
  }),
  ai: router({
    chat: publicProcedure.input(z.object({
      messages: z.array(z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      })),
      profile: z.object({
        cgpa: z.number().optional(),
        backlogs: z.number().optional(),
        internships: z.number().optional(),
        communication: z.number().optional(),
        coding: z.number().optional(),
        chance: z.number().optional(),
        targetRole: z.string().optional(),
        targetTier: z.string().optional(),
        branch: z.string().optional(),
      }).optional(),
    })).mutation(async ({ input }) => {
      const profileInfo = input.profile
        ? `\n\nSTUDENT'S LIVE PROFILE CONTEXT:
- Cumulative CGPA: ${input.profile.cgpa !== undefined ? input.profile.cgpa.toFixed(1) : 'Not specified'} / 10.0
- Active Backlogs: ${input.profile.backlogs !== undefined ? (input.profile.backlogs === 0 ? '0 (Clean academic record)' : `${input.profile.backlogs} active`) : 'Not specified'}
- Internships Completed: ${input.profile.internships ?? 0}
- Communication Confidence: ${input.profile.communication ?? 7} / 10
- Coding & DSA Problem Solving Confidence: ${input.profile.coding ?? 7} / 10
- Current Placement Probability Score: ${input.profile.chance !== undefined ? `${input.profile.chance}%` : 'Not evaluated yet'}
- Target Career Role: ${input.profile.targetRole ?? 'Software Development Engineer (SDE-1)'}
- Target Company Tier: ${input.profile.targetTier ?? 'Product / Tier-1 MNC'}
- Academic Stream / Branch: ${input.profile.branch ?? 'Computer Science & Engineering'}

GUIDELINES FOR YOUR MENTORSHIP:
1. Deliver hyper-personalized, practical guidance explicitly referencing their metrics (e.g. tailoring advice to their specific coding score and academic record).
2. If backlogs exist, explain company eligibility cutoffs and practical backlog clearing tactics without losing momentum on coding skills.
3. If coding score < 7, prioritize high-frequency campus patterns: Arrays/Strings, HashMaps, Sliding Window, Binary Search, Trees, and Dynamic Programming foundations.
4. For interviews, provide clear STAR framework formulas (Situation, Task, Action, Result) with sample tech project scenarios.
5. Provide organized responses using bullet points, bold keywords, and concrete timelines where appropriate.`
        : '';

      const response = await invokeLLM({
        model: "gemini-3.5-flash",
        messages: [
          {
            role: "system",
            content: `You are Pathfinder AI Placement Coach, a world-class engineering campus placement mentor and career strategist powered by Gemini. You specialize in guiding college students through technical rounds, HR evaluations, system design, coding assessments, and ATS resume strategies.${profileInfo}`,
          },
          ...input.messages,
        ],
        maxTokens: 1200,
      });
      const content = response.choices[0]?.message.content;
      return typeof content === "string" ? content : "I am ready to help with your placement preparation. Please ask your question.";
    }),
  }),
  resume: router({
    analyze: publicProcedure.input(z.object({ resumeText: z.string().min(30).max(30_000) })).mutation(async ({ input }) => {
      const response = await invokeLLM({
        model: "gemini-3.5-flash",
        messages: [
          { role: "system", content: "You are a practical campus-placement resume coach. Analyze only the provided resume text. Return concise, specific, encouraging suggestions for a tech student." },
          { role: "user", content: `Analyze this resume for placement readiness and identify skills to improve:\n\n${input.resumeText}` },
        ],
        response_format: { type: "json_schema", json_schema: { name: "resume_analysis", strict: true, schema: {
          type: "object", additionalProperties: false,
          properties: {
            summary: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            skillGaps: { type: "array", items: { type: "object", additionalProperties: false, properties: { skill: { type: "string" }, priority: { type: "string", enum: ["High", "Medium", "Low"] }, reason: { type: "string" }, action: { type: "string" } }, required: ["skill", "priority", "reason", "action"] } },
            nextSteps: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "strengths", "skillGaps", "nextSteps"],
        } } },
        maxTokens: 1200,
      });
      const content = response.choices[0]?.message.content;
      if (typeof content !== "string") throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The analyzer returned no result." });
      return JSON.parse(content) as { summary: string; strengths: string[]; skillGaps: Array<{ skill: string; priority: string; reason: string; action: string }>; nextSteps: string[] };
    }),
  }),
  news: router({
    getFeed: publicProcedure
      .input(
        z
          .object({
            query: z.string().optional(),
            category: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return fetchIndustryNews(input?.query, input?.category);
      }),
    summarizeTrend: publicProcedure
      .input(
        z.object({
          title: z.string(),
          snippet: z.string(),
          category: z.string().optional(),
          userContext: z
            .object({
              cgpa: z.number().optional(),
              coding: z.number().optional(),
              targetRole: z.string().optional(),
            })
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          model: "gemini-3.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You are an expert career counselor for BTech students. Analyze this industry hiring trend and provide 3 ultra-specific, high-yield action items a student must take to capitalize on it.",
            },
            {
              role: "user",
              content: `Industry News Item: "${input.title}"\nDetails: "${input.snippet}"\nStudent Target Role: ${input.userContext?.targetRole || "Software Engineer"}\nStudent Coding Score: ${input.userContext?.coding || 7}/10\n\nProvide structured advice: 1. Why this matters for BTech campus placements, 2. Required skills to build this month, 3. Strategic recommendation for interviews. Keep it concise, punchy, and practical.`,
            },
          ],
          maxTokens: 500,
        });
        const content = response.choices[0]?.message.content;
        return typeof content === "string"
          ? content
          : "Focus on building core DSA proficiency and demonstrable full-stack projects.";
      }),
  }),
});

export type AppRouter = typeof appRouter;
