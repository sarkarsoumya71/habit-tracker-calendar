/** Brand mark: a 4x4 habit grid where the logged days trace a check. */
export function Logo({ size = 22, className }: { size?: number; className?: string }) {
  const cols = [3, 10, 17, 24];
  const check = new Set(["24,10", "17,17", "3,17", "10,24"]);
  const dim: string[] = [];
  const hot: string[] = [];
  for (const x of cols) for (const y of cols) (check.has(`${x},${y}`) ? hot : dim).push(`${x},${y}`);
  const rect = (p: string) => {
    const [x, y] = p.split(",");
    return <rect key={p} x={x} y={y} width="5" height="5" rx="1.4" />;
  };
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0d0f10" />
      <rect x="0.35" y="0.35" width="31.3" height="31.3" rx="7.65" fill="none" stroke="#2a3034" strokeWidth="0.7" />
      <g fill="currentColor">
        <g opacity="0.15">{dim.map(rect)}</g>
        {hot.map(rect)}
      </g>
    </svg>
  );
}

type IconProps = { size?: number };
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const ChevronLeft = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}><path d="m15 18-6-6 6-6" /></svg>
);

export const ChevronRight = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}><path d="m9 18 6-6-6-6" /></svg>
);

export const Plus = ({ size = 15 }: IconProps) => (
  <svg {...base(size)}><path d="M12 5v14M5 12h14" /></svg>
);

export const Close = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}><path d="M18 6 6 18M6 6l12 12" /></svg>
);

export const Check = ({ size = 15 }: IconProps) => (
  <svg {...base(size)} strokeWidth={2.6}><path d="M20 6 9 17l-5-5" /></svg>
);

export const Pencil = ({ size = 13 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const Menu = ({ size = 17 }: IconProps) => (
  <svg {...base(size)}><path d="M3 6h18M3 12h18M3 18h18" /></svg>
);

export const Chart = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}><path d="M3 3v18h18" /><path d="m7 14 3-4 3 3 5-7" /></svg>
);

export const Trash = ({ size = 14 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </svg>
);

export const Download = ({ size = 14 }: IconProps) => (
  <svg {...base(size)}><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
);

export const Upload = ({ size = 14 }: IconProps) => (
  <svg {...base(size)}><path d="M12 15V3m0 0L8 7m4-4 4 4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
);

export const Logout = ({ size = 14 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </svg>
);

export const Cloud = ({ size = 14 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.2 10.5 3.75 3.75 0 0 0 6.5 19Z" />
  </svg>
);
