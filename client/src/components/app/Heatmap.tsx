// GitHub-style study heatmap: 12 weeks of daily minutes.
type HeatmapProps = { days: number[] }; // oldest -> newest, minutes per day

const LEVELS = [
  "bg-secondary",
  "bg-primary/25",
  "bg-primary/50",
  "bg-primary/75",
  "bg-primary",
];

function level(minutes: number) {
  if (minutes <= 0) return 0;
  if (minutes < 15) return 1;
  if (minutes < 30) return 2;
  if (minutes < 60) return 3;
  return 4;
}

export default function Heatmap({ days }: HeatmapProps) {
  const weeks: number[][] = [];
  const padded = [...days];
  while (padded.length % 7 !== 0) padded.unshift(0);
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  return (
    <div className="flex gap-1" role="img" aria-label="Study activity for the last 12 weeks">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((minutes, di) => (
            <span
              key={di}
              title={`${minutes} min`}
              className={`h-3 w-3 rounded-[3px] ${LEVELS[level(minutes)]}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
