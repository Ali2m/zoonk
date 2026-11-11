import {
  type ChartVisual,
  type LessonVisual,
  type TimelineVisual,
} from "@zoonk/ai/tasks/visuals/schema";

const WIDTH = 960;
const HEIGHT = 540;
const MARGIN = { bottom: 84, left: 84, right: 32, top: 72 };
const SERIES_COLORS = ["#2563eb", "#f59e0b", "#10b981"];
const INK = "#0f172a";
const MUTED = "#64748b";
const GRID = "#e2e8f0";
const TICKS = 5;
const EVENT_HEIGHT = 96;
const TIMELINE_TOP = 96;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/u, "");
}

function frame({ body, height, title }: { body: string; height: number; title: string }): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" font-family="system-ui, sans-serif" role="img" aria-label="${escapeXml(title)}">`,
    `<rect width="${WIDTH}" height="${height}" fill="#ffffff"/>`,
    `<text x="${MARGIN.left}" y="42" font-size="26" font-weight="600" fill="${INK}">${escapeXml(title)}</text>`,
    body,
    "</svg>",
  ].join("");
}

/** Bars start at zero unless the chart is about a cropped axis. */
function getValueRange(chart: ChartVisual): { max: number; min: number } {
  const values = chart.series.flatMap((series) => series.values);
  const lowest = Math.min(...values);
  const highest = Math.max(...values);
  const min = chart.axisStart ?? (chart.chart === "bar" ? Math.min(0, lowest) : lowest);

  return { max: highest === min ? min + 1 : highest, min };
}

function drawChart(chart: ChartVisual): string {
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const { max, min } = getValueRange(chart);
  const slot = plotWidth / chart.categories.length;
  const toY = (value: number) => MARGIN.top + plotHeight * (1 - (value - min) / (max - min));
  const unit = chart.unit ? ` (${chart.unit})` : "";

  const grid = Array.from({ length: TICKS + 1 }, (_, index) => {
    const value = min + ((max - min) * index) / TICKS;
    const lineY = toY(value);

    return (
      `<line x1="${MARGIN.left}" x2="${WIDTH - MARGIN.right}" y1="${lineY}" y2="${lineY}" stroke="${GRID}"/>` +
      `<text x="${MARGIN.left - 10}" y="${lineY + 5}" font-size="15" text-anchor="end" fill="${MUTED}">${formatNumber(value)}</text>`
    );
  }).join("");

  const categories = chart.categories
    .map(
      (category, index) =>
        `<text x="${MARGIN.left + slot * (index + 0.5)}" y="${HEIGHT - MARGIN.bottom + 24}" font-size="15" text-anchor="middle" fill="${INK}">${escapeXml(category)}</text>`,
    )
    .join("");

  const barWidth = (slot * 0.7) / chart.series.length;

  const marks = chart.series
    .map((series, seriesIndex) => {
      const color = SERIES_COLORS[seriesIndex % SERIES_COLORS.length];

      if (chart.chart === "line") {
        const points = series.values
          .map((value, index) => `${MARGIN.left + slot * (index + 0.5)},${toY(value)}`)
          .join(" ");

        const dots = series.values
          .map(
            (value, index) =>
              `<circle cx="${MARGIN.left + slot * (index + 0.5)}" cy="${toY(value)}" r="5" fill="${color}"/>`,
          )
          .join("");

        return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="3"/>${dots}`;
      }

      return series.values
        .map((value, index) => {
          const barX = MARGIN.left + slot * index + slot * 0.15 + barWidth * seriesIndex;
          const top = toY(Math.max(value, min));

          return `<rect x="${barX}" y="${top}" width="${barWidth - 4}" height="${Math.max(toY(min) - top, 0)}" rx="4" fill="${color}"/>`;
        })
        .join("");
    })
    .join("");

  const legend =
    chart.series.length > 1
      ? chart.series
          .map(
            (series, index) =>
              `<rect x="${MARGIN.left + index * 190}" y="${HEIGHT - 22}" width="14" height="14" rx="3" fill="${SERIES_COLORS[index % SERIES_COLORS.length]}"/>` +
              `<text x="${MARGIN.left + index * 190 + 22}" y="${HEIGHT - 10}" font-size="15" fill="${INK}">${escapeXml(series.name)}</text>`,
          )
          .join("")
      : "";

  const labels =
    `<text x="${MARGIN.left + plotWidth / 2}" y="${HEIGHT - MARGIN.bottom + 52}" font-size="15" text-anchor="middle" fill="${MUTED}">${escapeXml(chart.categoryLabel)}</text>` +
    `<text transform="translate(22 ${MARGIN.top + plotHeight / 2}) rotate(-90)" font-size="15" text-anchor="middle" fill="${MUTED}">${escapeXml(chart.valueLabel + unit)}</text>`;

  return frame({
    body: grid + marks + categories + labels + legend,
    height: HEIGHT,
    title: chart.title,
  });
}

function drawTimeline(timeline: TimelineVisual): { height: number; svg: string } {
  const height = TIMELINE_TOP + timeline.events.length * EVENT_HEIGHT;
  const lineX = MARGIN.left + 110;

  const events = timeline.events
    .map((event, index) => {
      const eventY = TIMELINE_TOP + index * EVENT_HEIGHT;

      const detail = event.detail
        ? `<text x="${lineX + 28}" y="${eventY + 30}" font-size="15" fill="${MUTED}">${escapeXml(event.detail)}</text>`
        : "";

      return (
        `<circle cx="${lineX}" cy="${eventY}" r="8" fill="${SERIES_COLORS[0]}"/>` +
        `<text x="${lineX - 22}" y="${eventY + 6}" font-size="17" font-weight="600" text-anchor="end" fill="${INK}">${escapeXml(event.date)}</text>` +
        `<text x="${lineX + 28}" y="${eventY + 6}" font-size="18" fill="${INK}">${escapeXml(event.label)}</text>${detail}`
      );
    })
    .join("");

  const line = `<line x1="${lineX}" x2="${lineX}" y1="${TIMELINE_TOP}" y2="${height - EVENT_HEIGHT}" stroke="${GRID}" stroke-width="4"/>`;

  return { height, svg: frame({ body: line + events, height, title: timeline.title }) };
}

/** An SVG a question bank can show as a plain image. */
export function drawVisual(visual: LessonVisual): { ratio: string; svg: string } {
  if (visual.kind === "chart") {
    return { ratio: `${WIDTH}/${HEIGHT}`, svg: drawChart(visual) };
  }

  const { height, svg } = drawTimeline(visual);

  return { ratio: `${WIDTH}/${height}`, svg };
}
