import { atom, useAtomValue } from 'jotai';
import { useMemo } from 'react';

import { IapPayload } from 'modules/types';

import { pluginsAtom } from '../components/app-initializer';

export function usePurchases() {
  const iapModule = useAtomValue(
    useMemo(
      () =>
        atom(
          (get) =>
            (Object.values(get(pluginsAtom)).find((x: any) => 'iap' in x) ??
              null) as IapPayload | null,
        ),
      [],
    ),
  );

  if (!iapModule) {
    throw new Error('IAP module is not initialized');
  }

  return useAtomValue(iapModule.iap.state);
}
