"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DAILY_HISTORY,
  DATASET_LABELS,
  DatasetKey,
  formatDateRangeLabel,
  MONTHLY_HISTORY,
  VIEW_SIZE,
  WEEKLY_PERIODS,
} from "@/lib/graph-datasets";

type TooltipContentProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ value: number | string }>;
  label?: string | number;
};

type AxisTickProps = {
  x?: number;
  y?: number;
  payload?: { value?: string | number };
};
type ActiveDotProps = {
  cx?: number;
  cy?: number;
  fill?: string;
};

type Tone = {
  line: string;
  glow: string;
  areaStart: string;
  areaEnd: string;
};

type ChartMode = "line" | "bar";

const DATASET_TONE: Record<DatasetKey, Tone> = {
  daily: {
    line: "#111111",
    glow: "rgba(17,17,17,0.28)",
    areaStart: "rgba(17,17,17,0.24)",
    areaEnd: "rgba(17,17,17,0.02)",
  },
  weekly: {
    line: "#111111",
    glow: "rgba(17,17,17,0.28)",
    areaStart: "rgba(17,17,17,0.24)",
    areaEnd: "rgba(17,17,17,0.02)",
  },
  monthly: {
    line: "#111111",
    glow: "rgba(17,17,17,0.28)",
    areaStart: "rgba(17,17,17,0.24)",
    areaEnd: "rgba(17,17,17,0.02)",
  },
};

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  return (
    <AnimatePresence mode="wait">
      {active && payload?.[0] ? (
        <motion.div
          key={`${label}-${payload[0].value}`}
          initial={{ opacity: 0, y: 6, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 3, scale: 0.985 }}
          transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 text-zinc-900 shadow-lg backdrop-blur"
        >
          <p className="text-xs font-medium tracking-wide">{label}</p>
          <p className="mt-1 text-lg font-semibold leading-none">{Number(payload[0].value).toLocaleString()}</p>
          <p className="mt-1 text-[11px] text-zinc-500">Active metric</p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function AnimatedXAxisTick({ x = 0, y = 0, payload }: AxisTickProps) {
  return (
    <motion.g initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12 }}>
      <text x={x} y={y} dy={14} textAnchor="middle" fill="#71717a" fontSize={12}>
        {payload?.value}
      </text>
    </motion.g>
  );
}

function AnimatedYAxisTick({ x = 0, y = 0, payload }: AxisTickProps) {
  return (
    <motion.g initial={{ opacity: 0, x: -2 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.12 }}>
      <text x={x} y={y} dx={-8} dy={4} textAnchor="end" fill="#71717a" fontSize={12}>
        {typeof payload?.value === "number" ? payload.value.toLocaleString() : payload?.value}
      </text>
    </motion.g>
  );
}

function AnimatedActiveDot({ cx = 0, cy = 0, fill = "#111111" }: ActiveDotProps) {
  return (
    <motion.circle
      r={6}
      strokeWidth={2}
      stroke="#ffffff"
      fill={fill}
      initial={false}
      animate={{ cx, cy }}
      transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.45 }}
      style={{ pointerEvents: "none" }}
    />
  );
}

export function InteractiveGraphCard() {
  const [mounted, setMounted] = useState(false);
  const [datasetKey, setDatasetKey] = useState<DatasetKey>("daily");
  const [chartMode, setChartMode] = useState<ChartMode>("line");
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dailyStart, setDailyStart] = useState(Math.max(0, DAILY_HISTORY.length - VIEW_SIZE.daily));
  const [weeklyMonthIndex, setWeeklyMonthIndex] = useState(Math.max(0, WEEKLY_PERIODS.length - 1));
  const [monthlyStart, setMonthlyStart] = useState(Math.max(0, MONTHLY_HISTORY.length - VIEW_SIZE.monthly));
  const [axisTransitionId, setAxisTransitionId] = useState(0);

  const dragStartXRef = useRef<number | null>(null);
  const dragStartValueRef = useRef<number>(0);

  const datasetKeys = Object.keys(DATASET_LABELS) as DatasetKey[];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setAxisTransitionId((prev) => prev + 1);
  }, [datasetKey, chartMode]);

  const tone = DATASET_TONE[datasetKey];

  const activeData = useMemo(() => {
    if (datasetKey === "daily") {
      return DAILY_HISTORY.slice(dailyStart, dailyStart + VIEW_SIZE.daily);
    }

    if (datasetKey === "weekly") {
      return WEEKLY_PERIODS[weeklyMonthIndex]?.points ?? [];
    }

    return MONTHLY_HISTORY.slice(monthlyStart, monthlyStart + VIEW_SIZE.monthly);
  }, [dailyStart, datasetKey, monthlyStart, weeklyMonthIndex]);

  const contextLabel = useMemo(() => {
    if (!activeData.length) return "";

    if (datasetKey === "daily") {
      return formatDateRangeLabel(activeData[0].isoDate, activeData[activeData.length - 1].isoDate);
    }

    if (datasetKey === "weekly") {
      return WEEKLY_PERIODS[weeklyMonthIndex]?.monthLabel ?? "";
    }

    return `${activeData[0].label} - ${activeData[activeData.length - 1].label}`;
  }, [activeData, datasetKey, weeklyMonthIndex]);

  const latestValue = activeData[activeData.length - 1]?.value ?? 0;
  const previousValue = activeData[activeData.length - 2]?.value ?? latestValue;

  const trendDelta = useMemo(() => {
    const delta = latestValue - previousValue;
    const direction = delta >= 0 ? "+" : "";
    return `${direction}${delta.toLocaleString()}`;
  }, [latestValue, previousValue]);
  const isTrendPositive = latestValue - previousValue >= 0;

  const yMax = Math.max(120, ...activeData.map((point) => point.value));
  const targetDomainMax = Math.ceil(yMax * 1.16);

  const panConfig = useMemo(() => {
    if (datasetKey === "daily") {
      const max = Math.max(0, DAILY_HISTORY.length - VIEW_SIZE.daily);
      return { min: 0, max, value: dailyStart, set: setDailyStart };
    }

    if (datasetKey === "weekly") {
      const max = Math.max(0, WEEKLY_PERIODS.length - 1);
      return { min: 0, max, value: weeklyMonthIndex, set: setWeeklyMonthIndex };
    }

    const max = Math.max(0, MONTHLY_HISTORY.length - VIEW_SIZE.monthly);
    return { min: 0, max, value: monthlyStart, set: setMonthlyStart };
  }, [dailyStart, datasetKey, monthlyStart, weeklyMonthIndex]);

  const goPrev = () => panConfig.set(Math.max(panConfig.min, panConfig.value - 1));
  const goNext = () => panConfig.set(Math.min(panConfig.max, panConfig.value + 1));

  const onDragStart = (x: number) => {
    dragStartXRef.current = x;
    dragStartValueRef.current = panConfig.value;
    setIsDragging(true);
  };

  const onDragMove = (x: number) => {
    if (dragStartXRef.current === null) return;
    const delta = x - dragStartXRef.current;
    const step = Math.round(delta / 30);
    const next = Math.max(panConfig.min, Math.min(panConfig.max, dragStartValueRef.current + step));
    panConfig.set(next);
  };

  const onDragEnd = () => {
    dragStartXRef.current = null;
    setIsDragging(false);
  };

  return (
    <Card className="w-full rounded-[28px] border-zinc-200/90 bg-white/95 shadow-none">
      <CardHeader className="space-y-3 px-6 pt-7 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-lg text-zinc-900">Revenue Performance</CardTitle>
            <AnimatePresence mode="wait">
              <motion.span
                key={`${datasetKey}-${latestValue}-${contextLabel}`}
                initial={{ opacity: 0, x: -7 }}
                animate={{ opacity: 1, x: [-7, 1, 0] }}
                exit={{ opacity: 0, x: [0, 4, 7] }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block text-xs font-medium"
              >
                <span className="text-zinc-500">{DATASET_LABELS[datasetKey]}: </span>
                <span className={isTrendPositive ? "text-emerald-600" : "text-rose-600"}>{trendDelta}</span>
                <span className="text-zinc-500"> vs previous point</span>
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative grid grid-cols-3 overflow-hidden rounded-full border border-zinc-200/80 bg-zinc-100/80 p-0.5">
              {datasetKeys.map((key) => {
                const isActive = datasetKey === key;
                return (
                  <Button
                    key={key}
                    type="button"
                    size="default"
                    variant="ghost"
                    onClick={() => setDatasetKey(key)}
                    className={`relative z-10 h-8 rounded-full px-3 text-xs ${
                      isActive
                        ? "bg-transparent text-zinc-950 hover:bg-transparent"
                        : "bg-transparent text-zinc-600/70 hover:bg-transparent hover:text-zinc-700/80"
                    }`}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="dataset-active-pill"
                        transition={{ type: "spring", stiffness: 560, damping: 36, mass: 0.52 }}
                        className="absolute inset-0 rounded-full bg-white"
                      />
                    ) : null}
                    <span className="relative">{DATASET_LABELS[key]}</span>
                  </Button>
                );
              })}
            </div>

            <div className="relative flex items-center gap-1 rounded-full border border-zinc-200/80 bg-zinc-100/80 p-0.5">
              {(["line", "bar"] as ChartMode[]).map((mode) => {
                const isActive = chartMode === mode;
                return (
                  <Button
                    key={mode}
                    type="button"
                    size="default"
                    variant="ghost"
                    onClick={() => setChartMode(mode)}
                    aria-label={mode === "line" ? "Line chart mode" : "Bar chart mode"}
                    className={`relative z-10 h-8 w-8 rounded-full p-0 ${
                      isActive
                        ? "bg-transparent text-zinc-950 hover:bg-transparent"
                        : "bg-transparent text-zinc-600/70 hover:bg-transparent hover:text-zinc-700/80"
                    }`}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="chart-mode-active-pill"
                        transition={{ type: "spring", stiffness: 560, damping: 36, mass: 0.52 }}
                        className="absolute inset-0 rounded-full bg-white"
                      />
                    ) : null}
                    <span className="relative" aria-hidden>
                      {mode === "line" ? (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 16l6-6 4 4 8-8" />
                          <circle cx="3" cy="16" r="1.2" fill="currentColor" stroke="none" />
                          <circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none" />
                          <circle cx="13" cy="14" r="1.2" fill="currentColor" stroke="none" />
                          <circle cx="21" cy="6" r="1.2" fill="currentColor" stroke="none" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                          <rect x="4" y="10" width="3.5" height="10" rx="1" />
                          <rect x="10.25" y="6" width="3.5" height="14" rx="1" />
                          <rect x="16.5" y="13" width="3.5" height="7" rx="1" />
                        </svg>
                      )}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div
          className={`relative h-[320px] select-none rounded-[20px] border border-zinc-200 p-3 outline-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          style={{ touchAction: "none" }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            onDragStart(event.clientX);
          }}
          onPointerMove={(event) => {
            if (!isDragging) return;
            onDragMove(event.clientX);
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            onDragEnd();
          }}
          onPointerCancel={onDragEnd}
          onPointerLeave={onDragEnd}
          role="application"
          aria-label="Interactive chart, drag left or right to pan history"
        >
          <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2">
            <div className="pointer-events-auto flex items-center gap-0.5 rounded-full bg-white/90 px-1 py-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={goPrev}
                disabled={panConfig.value <= panConfig.min}
                className="h-7 w-7 rounded-full text-zinc-700 hover:bg-zinc-100"
                aria-label="Previous timeframe"
              >
                <span aria-hidden>‹</span>
              </Button>

              <AnimatePresence mode="wait">
                <motion.span
                  key={`${datasetKey}-${contextLabel}`}
                  initial={{ opacity: 0, x: 4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
                  className="min-w-[118px] px-0.5 text-center text-[11px] font-medium text-zinc-700"
                >
                  {contextLabel}
                </motion.span>
              </AnimatePresence>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={goNext}
                disabled={panConfig.value >= panConfig.max}
                className="h-7 w-7 rounded-full text-zinc-700 hover:bg-zinc-100"
                aria-label="Next timeframe"
              >
                <span aria-hidden>›</span>
              </Button>
            </div>
          </div>

          <div className="h-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === "line" ? (
                  <LineChart
                    data={activeData}
                    margin={{ top: 46, right: 10, left: 10, bottom: 18 }}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                  >
                    <defs>
                      <linearGradient id={`lineArea-${datasetKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={tone.areaStart} />
                        <stop offset="100%" stopColor={tone.areaEnd} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid vertical={false} stroke="rgba(63,63,70,0.13)" strokeDasharray="4 8" />
                    <XAxis
                      key={`x-${axisTransitionId}-${chartMode}`}
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={<AnimatedXAxisTick />}
                      tickMargin={10}
                    />
                    <YAxis
                      key={`y-${axisTransitionId}-${chartMode}`}
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tick={<AnimatedYAxisTick />}
                      domain={[0, targetDomainMax]}
                    />
                    <Tooltip
                      cursor={isDragging ? false : { stroke: "rgba(63,63,70,0.13)", strokeWidth: 1.5 }}
                      content={(props) => <ChartTooltip {...props} />}
                    />

                    <Area
                      type="monotone"
                      dataKey="value"
                      fill={`url(#lineArea-${datasetKey})`}
                      stroke="none"
                      isAnimationActive={!isDragging}
                      animationDuration={520}
                      animationEasing="ease-in-out"
                    />

                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={tone.line}
                      strokeWidth={hovered ? 3.8 : 3}
                      dot={false}
                      activeDot={<AnimatedActiveDot fill={tone.line} />}
                      style={{ filter: `drop-shadow(0 0 12px ${tone.glow})`, transition: "stroke-width 120ms ease" }}
                      isAnimationActive={!isDragging}
                      animationDuration={520}
                      animationEasing="ease-in-out"
                    />
                  </LineChart>
                ) : (
                  <BarChart
                    data={activeData}
                    margin={{ top: 46, right: 10, left: 10, bottom: 18 }}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                  >
                    <CartesianGrid vertical={false} stroke="rgba(63,63,70,0.13)" strokeDasharray="4 8" />
                    <XAxis
                      key={`x-${axisTransitionId}-${chartMode}`}
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={<AnimatedXAxisTick />}
                      tickMargin={10}
                    />
                    <YAxis
                      key={`y-${axisTransitionId}-${chartMode}`}
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tick={<AnimatedYAxisTick />}
                      domain={[0, targetDomainMax]}
                    />
                    <Tooltip
                      cursor={isDragging ? false : { stroke: "rgba(63,63,70,0.13)", strokeWidth: 1.5 }}
                      content={(props) => <ChartTooltip {...props} />}
                    />
                    <Bar
                      dataKey="value"
                      fill={tone.line}
                      radius={[5, 5, 2, 2]}
                      fillOpacity={hovered ? 0.92 : 0.84}
                      activeBar={false}
                      isAnimationActive={!isDragging}
                      animationDuration={260}
                      animationEasing="ease-in-out"
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full animate-pulse rounded-lg bg-zinc-100/80" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
