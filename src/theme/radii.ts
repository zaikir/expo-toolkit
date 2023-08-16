import { scaleX } from '../utils/scale';

const indexes = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 23, 24, 25, 26, 27, 28, 29, 30,
] as const;

const fixedValues = Object.fromEntries(
  indexes.map((idx) => [idx.toString(), scaleX(idx)]),
) as Record<(typeof indexes)[number], number>;

export const radii = {
  ...fixedValues,
  full: 100,
} as const;
