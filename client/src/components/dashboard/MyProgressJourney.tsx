import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { AnimatedMetric, SpotlightSurface } from "@/components/ui/TitaniumPrimitives";
import {
  PROGRESS_UPDATED_EVENT,
  ProgressEvent,
  ProgressEventType,
  clearProgressEvents,
  getRoadmapCompletedCount,
  readProgressEvents,
} from "@/lib/progressTracker";

interface MyProgressJourneyProps {
  currentChance: number | null;
  currentLabel: string;
  onNavigateTab: (tab: string) => void;
  onAskCoach?: (query: string) => void;
}

const TYPE_META: Record<ProgressEventType, { label: string; tab: string }> = {
  prediction: { label: "ML Readiness", tab: "overview" },
  ats: { label: "ATS Resume Scan", tab: "resume" },
  arena: { label: "Coding Arena", tab: "interview" },
  interview: { label: "Mock Interview", tab: "interview" },
  defense: { label: "Project Defense", tab: "interview" },
};

const ROADMAP_WEEKS = 6;

const formatWhen = (ts: number) => {
  try {
    return new Date(ts).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const formatShortDate = (ts: number) => {
  try {
    return new Date(ts).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
};

const average = (values: number[]) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;

interface MetricTileProps {
  title: string;
  value: number | null;
  decimals?: number;
  suffix?: string;
  caption: string;
  emptyCaption: string;
}

const MetricTile: React.FC<MetricTileProps> = ({
  title,
  value,
  decimals = 0,
  suffix = "",
  caption,
  emptyCaption,
}) => (
  <div className="pf-subpanel flex min-h-[132px] flex-col justify-between rounded-2xl p-5">
    <span className="text-xs font-medium text-[#A1A1AA]">{title}</span>
    <span className="mt-3 font-mono text-3xl font-semibold tracking-[-0.04em] text-[#FAFAFA]">
      {value === null ? (
        <span className="tabular-nums text-[#8A8A92]">—</span>
      ) : (
        <AnimatedMetric value={value} decimals={decimals} suffix={suffix} />
      )}
    </span>
    <span className="mt-2 font-mono text-[11px] text-[#8A8A92] tabular-nums">
      {value === null ? emptyCaption : caption}
    </span>
  </div>
);

export const MyProgressJourney: React.FC<MyProgressJourneyProps> = ({
  currentChance,
  currentLabel,
  onNavigateTab,
  onAskCoach,
}) => {
  const [events, setEvents] = useState<ProgressEvent[]>(() => readProgressEvents());
  const [roadmapDone, setRoadmapDone] = useState<number>(() => getRoadmapCompletedCount());

  const refresh = useCallback(() => {
    setEvents(readProgressEvents());
    setRoadmapDone(getRoadmapCompletedCount());
  }, []);

  useEffect(() => {
    window.addEventListener(PROGRESS_UPDATED_EVENT, refresh);
    window.addEventListener("pathfinder:auth-change", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(PROGRESS_UPDATED_EVENT, refresh);
      window.removeEventListener("pathfinder:auth-change", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  const stats = useMemo(() => {
    const byType = (t: ProgressEventType) => events.filter((e) => e.type === t);
    const predictions = byType("prediction");
    const ats = byType("ats");
    const arena = byType("arena");
    const interviews = [...byType("interview"), ...byType("defense")];

    const firstPrediction = predictions[0]?.score ?? null;
    const latestPrediction =
      typeof currentChance === "number" ? currentChance : predictions.at(-1)?.score ?? null;
    const readinessDelta =
      firstPrediction !== null && latestPrediction !== null && predictions.length > 1
        ? latestPrediction - firstPrediction
        : null;

    return {
      predictions,
      firstPrediction,
      latestPrediction,
      readinessDelta,
      bestAts: ats.length ? Math.max(...ats.map((e) => e.score)) : null,
      atsCount: ats.length,
      arenaCount: arena.length,
      arenaHires: arena.filter((e) => /hire/i.test(e.label) && !/no hire/i.test(e.label)).length,
      arenaAvg: average(arena.map((e) => e.score)),
      interviewAvg: average(interviews.map((e) => e.score)),
      interviewCount: interviews.length,
    };
  }, [events, currentChance]);

  const chartData = useMemo(
    () =>
      stats.predictions.map((e, i) => ({
        step: i + 1,
        date: formatShortDate(e.at),
        score: e.score,
      })),
    [stats.predictions]
  );

  const nextSteps = useMemo(() => {
    const steps: { title: string; detail: string; tab: string; cta: string }[] = [];
    if (stats.latestPrediction === null) {
      steps.push({
        title: "Get your real ML readiness score",
        detail: "Add your CGPA, branch and skills so the Random Forest model can score your profile.",
        tab: "profile",
        cta: "Open Profile & Settings",
      });
    }
    if (stats.atsCount === 0) {
      steps.push({
        title: "Run your first ATS resume scan",
        detail: "Upload or paste your resume to benchmark keywords against real job descriptions.",
        tab: "resume",
        cta: "Open JD & Resume Lab",
      });
    }
    if (stats.arenaCount === 0) {
      steps.push({
        title: "Attempt one Coding Arena round",
        detail: "Solve a problem, explain your approach, and get a Hiring Committee verdict.",
        tab: "interview",
        cta: "Open Coding & Viva Arena",
      });
    } else if (stats.arenaAvg !== null && stats.arenaAvg < 70) {
      steps.push({
        title: "Raise your Coding Arena average above 70",
        detail: `Your current average is ${stats.arenaAvg.toFixed(0)}/100. Focus on the missing keywords in your last verdict.`,
        tab: "interview",
        cta: "Practice another round",
      });
    }
    if (stats.interviewCount === 0) {
      steps.push({
        title: "Do one mock interview or project defense",
        detail: "Answer a company-style question out loud and get a strict 0–100 scorecard.",
        tab: "interview",
        cta: "Start mock interview",
      });
    }
    if (roadmapDone < ROADMAP_WEEKS) {
      steps.push({
        title: `Complete week ${roadmapDone + 1} of your sprint roadmap`,
        detail: `${roadmapDone} of ${ROADMAP_WEEKS} roadmap weeks are ticked off so far.`,
        tab: "analytics",
        cta: "Open 6-week roadmap",
      });
    }
    return steps.slice(0, 3);
  }, [stats, roadmapDone]);

  const timeline = useMemo(() => [...events].reverse().slice(0, 12), [events]);
  const hasAnyActivity = events.length > 0 || roadmapDone > 0;

  const handleClear = () => {
    if (window.confirm("Clear your saved progress history in this browser?")) {
      clearProgressEvents();
      refresh();
    }
  };

  const askDasPrompt = () => {
    const parts = [
      stats.latestPrediction !== null
        ? `ML readiness ${stats.latestPrediction.toFixed(1)}% (${currentLabel})`
        : "no ML readiness score yet",
      stats.readinessDelta !== null
        ? `change since first score ${stats.readinessDelta >= 0 ? "+" : ""}${stats.readinessDelta.toFixed(1)} points`
        : "",
      stats.bestAts !== null ? `best ATS score ${stats.bestAts.toFixed(0)}/100` : "no ATS scan yet",
      stats.arenaCount
        ? `${stats.arenaCount} Coding Arena rounds, average ${stats.arenaAvg?.toFixed(0)}/100`
        : "no Coding Arena rounds yet",
      stats.interviewCount
        ? `${stats.interviewCount} interview/defense answers, average ${stats.interviewAvg?.toFixed(0)}/100`
        : "no mock interviews yet",
      `${roadmapDone}/${ROADMAP_WEEKS} roadmap weeks completed`,
    ].filter(Boolean);
    return `Review my real progress honestly and tell me the single most important thing to do next: ${parts.join(", ")}.`;
  };

  return (
    <div className="space-y-16 sm:space-y-20">
      <section id="progress-summary" data-das-id="progress-summary" className="space-y-6">
        <SectionHeader
          title="My Progress Journey"
          description="Every number here comes from something you actually did in Pathfinder — real ML scores, ATS scans, Coding Arena verdicts and interview scorecards. Nothing is pre-filled."
          badge="1 of 3 · Progress"
          accent="cyan"
          helperLabel="Saved privately in this browser"
          action={
            onAskCoach ? (
              <button
                type="button"
                onClick={() => onAskCoach(askDasPrompt())}
                className="pf-btn-primary inline-flex h-10 items-center rounded-lg px-4 text-xs font-medium active:scale-[0.98]"
              >
                Ask DAS to review my progress
              </button>
            ) : undefined
          }
        />

        <SpotlightSurface className="rounded-2xl p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <MetricTile
              title="ML Readiness (latest)"
              value={stats.latestPrediction}
              decimals={1}
              suffix="%"
              caption={
                stats.readinessDelta !== null
                  ? `${stats.readinessDelta >= 0 ? "+" : ""}${stats.readinessDelta.toFixed(1)} pts since first score`
                  : "First real score recorded"
              }
              emptyCaption="No real score yet"
            />
            <MetricTile
              title="Best ATS Score"
              value={stats.bestAts}
              suffix="/100"
              caption={`${stats.atsCount} scan${stats.atsCount === 1 ? "" : "s"} run`}
              emptyCaption="No resume scanned yet"
            />
            <MetricTile
              title="Coding Arena Avg"
              value={stats.arenaAvg}
              suffix="/100"
              caption={`${stats.arenaCount} round${stats.arenaCount === 1 ? "" : "s"} · ${stats.arenaHires} hire verdict${stats.arenaHires === 1 ? "" : "s"}`}
              emptyCaption="No rounds attempted"
            />
            <MetricTile
              title="Interview Avg"
              value={stats.interviewAvg}
              suffix="/100"
              caption={`${stats.interviewCount} answer${stats.interviewCount === 1 ? "" : "s"} graded`}
              emptyCaption="No answers graded"
            />
            <MetricTile
              title="Roadmap Weeks"
              value={roadmapDone}
              suffix={`/${ROADMAP_WEEKS}`}
              caption={`${Math.round((roadmapDone / ROADMAP_WEEKS) * 100)}% of sprint complete`}
              emptyCaption=""
            />
          </div>
        </SpotlightSurface>
      </section>

      <section id="progress-trend" data-das-id="progress-trend" className="space-y-6">
        <SectionHeader
          title="Readiness Trend"
          description="How your real Random Forest placement probability has moved each time your profile changed."
          badge="2 of 3 · Trend"
          accent="amber"
        />
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="pf-titanium-card rounded-2xl p-6 sm:p-8 lg:col-span-7">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
              <span className="text-xs font-medium text-[#D4D4D8]">Placement probability over time</span>
              <span className="font-mono text-[11px] text-[#8A8A92] tabular-nums">
                {chartData.length} data point{chartData.length === 1 ? "" : "s"}
              </span>
            </div>
            {chartData.length >= 2 ? (
              <div className="mt-6 h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#8A8A92", fontSize: 11 }}
                      axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "#8A8A92", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ stroke: "rgba(255,255,255,0.12)" }}
                      contentStyle={{
                        background: "#0D0D12",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 10,
                        color: "#FAFAFA",
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [`${Number(v).toFixed(1)}%`, "Readiness"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#FAFAFA"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#FAFAFA", strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-6 flex h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.1] px-6 text-center">
                <p className="text-sm text-[#D4D4D8]">
                  {chartData.length === 1
                    ? `First real score recorded: ${chartData[0].score.toFixed(1)}%`
                    : "No real ML scores recorded yet"}
                </p>
                <p className="mt-2 max-w-sm text-xs leading-[1.6] text-[#8A8A92]">
                  Your trend line appears after your second real prediction — update your skills,
                  projects or ATS scan in the other slides and the model will re-score you.
                </p>
              </div>
            )}
          </div>

          <div className="pf-titanium-card rounded-2xl p-6 sm:p-8 lg:col-span-5">
            <div className="border-b border-white/[0.07] pb-4">
              <span className="text-xs font-medium text-[#D4D4D8]">Next best steps</span>
            </div>
            {nextSteps.length > 0 ? (
              <ul className="mt-5 space-y-4">
                {nextSteps.map((step, i) => (
                  <li key={step.title} className="pf-subpanel rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 font-mono text-[11px] text-[#8A8A92] tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#FAFAFA]">{step.title}</p>
                        <p className="mt-1 text-xs leading-[1.6] text-[#A1A1AA]">{step.detail}</p>
                        <button
                          type="button"
                          onClick={() => onNavigateTab(step.tab)}
                          className="pf-btn-secondary mt-3 inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium active:scale-[0.98]"
                        >
                          {step.cta}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 text-sm leading-[1.6] text-[#A1A1AA]">
                You have covered every module at least once. Keep re-attempting Coding Arena rounds
                and mock interviews to push your averages higher.
              </p>
            )}
          </div>
        </div>
      </section>

      <section id="progress-timeline" data-das-id="progress-timeline" className="space-y-6">
        <SectionHeader
          title="Activity Timeline"
          description="Your latest 12 real results across Pathfinder, newest first."
          badge="3 of 3 · Timeline"
          accent="accent"
          action={
            events.length > 0 ? (
              <button
                type="button"
                onClick={handleClear}
                className="pf-btn-secondary inline-flex h-10 items-center rounded-lg px-4 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA]"
              >
                Clear history
              </button>
            ) : undefined
          }
        />
        <div className="pf-titanium-card rounded-2xl p-6 sm:p-8">
          {timeline.length > 0 ? (
            <ol className="divide-y divide-white/[0.06]">
              {timeline.map((e) => {
                const meta = TYPE_META[e.type];
                return (
                  <li
                    key={e.id}
                    className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="shrink-0 rounded-md border border-white/[0.1] bg-[#121216] px-2.5 py-0.5 font-mono text-[10px] text-[#A1A1AA]">
                        {meta?.label || e.type}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-[#FAFAFA]">{e.label}</p>
                        {e.detail && (
                          <p className="truncate text-xs text-[#8A8A92]">{e.detail}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 sm:justify-end">
                      <span className="font-mono text-sm font-semibold text-[#FAFAFA] tabular-nums">
                        {e.score.toFixed(e.type === "prediction" ? 1 : 0)}
                        {e.type === "prediction" ? "%" : "/100"}
                      </span>
                      <span className="w-[120px] text-right font-mono text-[11px] text-[#8A8A92] tabular-nums">
                        {formatWhen(e.at)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-[#D4D4D8]">
                {hasAnyActivity ? "No graded results yet" : "Your journey starts here"}
              </p>
              <p className="mt-2 max-w-md text-xs leading-[1.6] text-[#8A8A92]">
                Run an ATS scan, attempt a Coding Arena round or answer a mock interview question.
                Each real result will appear here automatically.
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab("interview")}
                className="pf-btn-secondary mt-5 inline-flex h-9 items-center rounded-lg px-4 text-xs font-medium active:scale-[0.98]"
              >
                Start with Coding &amp; Viva Arena
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default MyProgressJourney;
