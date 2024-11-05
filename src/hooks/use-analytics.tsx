import { atom, useAtomValue } from 'jotai';
import { useCallback, useMemo } from 'react';

import { TrackerPayload } from '../modules/types';
import { ModulesBundle } from '../modules-bundle';

export function useAnalytics() {
  const analyticsModules = useAtomValue(
    useMemo(
      () =>
        atom(
          (get) =>
            Object.values(get(ModulesBundle.modulesAtom)).filter(
              (x: any) => x && typeof x === 'object' && 'tracker' in x,
            ) as TrackerPayload[],
        ),
      [],
    ),
  );

  const logEvent: TrackerPayload['tracker']['logEvent'] = useCallback(
    async (...args) => {
      await Promise.all(
        analyticsModules.map((plugin) => {
          plugin.tracker.logEvent(...args);
        }),
      );
    },
    [analyticsModules],
  );

  return useMemo(
    () => ({
      logEvent,
    }),
    [logEvent],
  );
}
