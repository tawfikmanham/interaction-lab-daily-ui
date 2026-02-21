export type DatasetKey = "daily" | "weekly" | "monthly";

export type GraphPoint = {
  label: string;
  value: number;
  isoDate: string;
};

export type WeeklyPeriod = {
  monthLabel: string;
  monthKey: string;
  points: GraphPoint[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 240;

function clampToDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function seededNoise(index: number): number {
  const value = Math.sin((index + 1) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function dailyLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
}

function monthShortLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", { month: "short" });
}

function generateDailyHistory(): GraphPoint[] {
  const today = clampToDay(new Date());
  const points: GraphPoint[] = [];

  for (let i = HISTORY_DAYS - 1; i >= 0; i -= 1) {
    const date = new Date(today.getTime() - i * DAY_MS);
    const t = HISTORY_DAYS - i;

    const waveA = Math.sin(t * 0.19) * 85;
    const waveB = Math.sin(t * 0.047 + 1.2) * 62;
    const waveC = Math.sin(t * 0.61) * 34;
    const pulse = t % 17 === 0 ? 140 : 0;
    const dip = t % 29 === 0 ? -95 : 0;
    const noise = (seededNoise(t) - 0.5) * 42;

    const value = Math.max(24, Math.round(280 + waveA + waveB + waveC + pulse + dip + noise));

    points.push({
      label: dailyLabel(date),
      value,
      isoDate: toIsoDay(date),
    });
  }

  return points;
}

function buildWeeklyPeriods(daily: GraphPoint[]): WeeklyPeriod[] {
  const monthMap = new Map<string, GraphPoint[]>();

  daily.forEach((point) => {
    const key = point.isoDate.slice(0, 7);
    if (!monthMap.has(key)) monthMap.set(key, []);
    monthMap.get(key)?.push(point);
  });

  return Array.from(monthMap.entries())
    .map(([monthKey, monthPoints]) => {
      const weekMap = new Map<number, GraphPoint[]>();

      monthPoints.forEach((point) => {
        const day = Number(point.isoDate.slice(8, 10));
        const weekOfMonth = Math.floor((day - 1) / 7) + 1;
        if (!weekMap.has(weekOfMonth)) weekMap.set(weekOfMonth, []);
        weekMap.get(weekOfMonth)?.push(point);
      });

      const weekPoints = Array.from(weekMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([week, points]) => {
          const total = points.reduce((sum, point) => sum + point.value, 0);
          const label = `W${week}`;
          return {
            label,
            value: total,
            isoDate: points[points.length - 1]?.isoDate ?? monthPoints[0].isoDate,
          };
        });

      const monthDate = new Date(`${monthKey}-01T00:00:00`);

      return {
        monthKey,
        monthLabel: monthLabel(monthDate),
        points: weekPoints,
      };
    })
    .filter((period) => period.points.length >= 4);
}

function buildMonthlyPoints(daily: GraphPoint[]): GraphPoint[] {
  const monthMap = new Map<string, GraphPoint[]>();

  daily.forEach((point) => {
    const key = point.isoDate.slice(0, 7);
    if (!monthMap.has(key)) monthMap.set(key, []);
    monthMap.get(key)?.push(point);
  });

  return Array.from(monthMap.entries()).map(([monthKey, points]) => {
    const total = points.reduce((sum, point) => sum + point.value, 0);
    const isoDate = `${monthKey}-01`;
    return {
      label: monthShortLabel(isoDate),
      value: total,
      isoDate,
    };
  });
}

export const DATASET_LABELS: Record<DatasetKey, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export const DAILY_HISTORY = generateDailyHistory();
export const WEEKLY_PERIODS = buildWeeklyPeriods(DAILY_HISTORY);
export const MONTHLY_HISTORY = buildMonthlyPoints(DAILY_HISTORY);

export const VIEW_SIZE: Record<DatasetKey, number> = {
  daily: 7,
  weekly: 5,
  monthly: 6,
};

export function formatDateRangeLabel(startIsoDate: string, endIsoDate: string): string {
  const start = new Date(`${startIsoDate}T00:00:00`);
  const end = new Date(`${endIsoDate}T00:00:00`);

  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return `${startLabel} - ${endLabel}`;
}
