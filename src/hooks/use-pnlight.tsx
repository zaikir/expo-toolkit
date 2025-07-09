import { atom, useAtomValue } from 'jotai';
import { useMemo } from 'react';

import { PnlightPayload } from 'modules/types/pnlight';

import { ModulesBundle } from '../modules-bundle';

export function usePnlight() {
  const pnlightModule = useAtomValue(
    useMemo(
      () =>
        atom(
          (get) =>
            (Object.values(get(ModulesBundle.modulesAtom)).find(
              (x: any) => x && typeof x === 'object' && 'pnlight' in x,
            ) ?? null) as PnlightPayload | null,
        ),
      [],
    ),
  );

  if (!pnlightModule) {
    throw new Error('Pnlight module is not initialized');
  }

  const { ...rest } = pnlightModule.pnlight;

  return useMemo(
    () => ({
      ...rest,
    }),
    [],
  );
}
