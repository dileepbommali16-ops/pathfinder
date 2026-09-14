import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
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
  resume: router({
    analyze: protectedProcedure.input(z.object({ resumeText: z.string().min(80).max(30_000) })).mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a practical campus-placement resume coach. Analyze only the provided resume text. Do not invent experience. Return concise, specific, encouraging suggestions for a CSE/data-science student." },
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
});

export type AppRouter = typeof appRouter;
