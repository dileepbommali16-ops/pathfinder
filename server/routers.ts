import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getPredictionHistory, getPlacementRecords, addPredictionHistory } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const optionalFilter = z.string().optional();

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
  }),
  predictions: router({
    history: protectedProcedure.query(({ ctx }) => getPredictionHistory(ctx.user.id)),
    save: protectedProcedure.input(z.object({
      cgpa: z.number().min(0).max(10),
      backlogs: z.number().int().min(0).max(20),
      internships: z.number().int().min(0).max(10),
      communication: z.number().int().min(1).max(10),
      coding: z.number().int().min(1).max(10),
      chance: z.number().int().min(0).max(100),
    })).mutation(({ ctx, input }) => addPredictionHistory({
      userId: ctx.user.id,
      cgpa: Math.round(input.cgpa * 10),
      backlogs: input.backlogs,
      internships: input.internships,
      communication: input.communication,
      coding: input.coding,
      chance: input.chance,
    })),
  }),
});

export type AppRouter = typeof appRouter;
