import { NumberOfPeriods, SubscriptionUnit } from '../modules/types';

export function convertToBestUnit(
  unit: number,
  numberOfPeriods: number,
): [SubscriptionUnit, NumberOfPeriods] {
  const unitMap: { [key: number]: SubscriptionUnit } = {
    0: 'day',
    1: 'week',
    2: 'month',
    3: 'year',
  };

  if (unit === 0) {
    // day
    if (numberOfPeriods % 7 === 0) {
      return ['week', numberOfPeriods / 7];
    }
  } else if (unit === 2) {
    // month
    if (numberOfPeriods % 3 === 0 && numberOfPeriods % 12 !== 0) {
      return ['quarter', numberOfPeriods / 3];
    }
    if (numberOfPeriods % 12 === 0) {
      return ['year', numberOfPeriods / 12];
    }
  }

  // Default case, return mapped unit and period
  return [unitMap[unit], numberOfPeriods];
}
