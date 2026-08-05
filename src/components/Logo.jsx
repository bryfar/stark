import { h } from 'preact';

const PIXEL_S = [
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1]
];

const CELL = 5;
const GAP = 1.5;
const ROWS = PIXEL_S.length;
const COLS = PIXEL_S[0].length;
const GRID_W = COLS * CELL + (COLS - 1) * GAP;
const GRID_H = ROWS * CELL + (ROWS - 1) * GAP;
const ORIGIN = (44 - GRID_W) / 2;

export function Logo({ size = 36, style, accentIndex = 2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      style={style}
      aria-label="Stark"
      role="img"
    >
      <rect
        x="1"
        y="1"
        width="42"
        height="42"
        rx="9"
        fill="var(--colors-surface-dark-elevated, #3a3a3a)"
        stroke="var(--colors-hairline, #3f3f46)"
        strokeWidth="1"
      />
      {PIXEL_S.map((row, ri) =>
        row.map((on, ci) => {
          if (!on) return null;
          const isAccent = ri === 2 && ci === accentIndex;
          return (
            <rect
              key={`${ri}-${ci}`}
              x={ORIGIN + ci * (CELL + GAP)}
              y={ORIGIN + ri * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx="1.2"
              fill={isAccent ? 'var(--colors-primary, #ffffff)' : 'var(--colors-ink, #f9fafb)'}
            />
          );
        })
      )}
    </svg>
  );
}
