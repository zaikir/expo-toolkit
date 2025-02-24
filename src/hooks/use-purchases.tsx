import { atom, useAtomValue } from 'jotai';
import { useMemo } from 'react';

import { IapPayload } from 'modules/types';

import { ModulesBundle } from '../modules-bundle';

export function usePurchases() {
  const iapModule = useAtomValue(
    useMemo(
      () =>
        atom(
          (get) =>
            (Object.values(get(ModulesBundle.modulesAtom)).find(
              (x: any) => x && typeof x === 'object' && 'iap' in x,
            ) ?? null) as IapPayload | null,
        ),
      [],
    ),
  );

  if (!iapModule) {
    throw new Error('IAP module is not initialized');
  }

  const { state, ...rest } = iapModule.iap;
  const iapState = useAtomValue(iapModule.iap.state);

  return useMemo(
    () => ({
      ...iapState,
      ...rest,
    }),
    [iapState],
  );
}
