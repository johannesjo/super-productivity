import { FH } from '../schedule.const';

export interface PlaceholderInfo {
  style: string;
  time: string;
  date: string;
}

export type PlaceholderCalculationContext = {
  readonly event: MouseEvent;
  readonly gridElement: HTMLElement;
  readonly days: readonly string[];
  readonly isTouchPrimary: boolean;
};

export const calculatePlaceholderForGridMove = (
  ctx: PlaceholderCalculationContext,
): PlaceholderInfo | null => {
  const target = ctx.event.target;
  if (!(target instanceof HTMLElement) || !target.classList.contains('col')) {
    return null;
  }

  const gridStyles = window.getComputedStyle(ctx.gridElement);
  const rowSizes = gridStyles.gridTemplateRows
    .split(' ')
    .map((size) => Number.parseFloat(size))
    .filter((size) => Number.isFinite(size));

  if (!rowSizes.length) {
    return null;
  }

  let rowIndex = 0;
  let yOffset = ctx.event.offsetY;

  for (let i = 0; i < rowSizes.length; i++) {
    if (yOffset < rowSizes[i]) {
      rowIndex = i + 1;
      break;
    }
    yOffset -= rowSizes[i];
  }

  const targetColRowOffset = Number.parseInt(target.style.gridRowStart || '0', 10) - 2;
  const targetColColOffset = Number.parseInt(target.style.gridColumnStart || '0', 10);

  if (Number.isNaN(targetColRowOffset) || Number.isNaN(targetColColOffset)) {
    return null;
  }

  let targetRow = rowIndex;
  if (ctx.isTouchPrimary) {
    const mobileRowGroup = Math.floor(rowIndex / 3);
    targetRow = mobileRowGroup * 3;
    targetRow -= 1;
  }
  const row = targetRow + targetColRowOffset;
  const hours = Math.floor((row - 1) / FH);
  const minutes = Math.floor(((row - 1) % FH) * (60 / FH));
  const time = `${hours}:${minutes.toString().padStart(2, '0')}`;
  const dateIndex = targetColColOffset - 2;
  const date = ctx.days[dateIndex] ?? '';

  return {
    style: `grid-row: ${row} / span 6; grid-column: ${targetColColOffset} / span 1`,
    time,
    date,
  };
};
