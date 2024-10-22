import { atom, useAtomValue } from 'jotai';
import { useMemo } from 'react';

import { RemoteConfigPayload } from 'modules/types';

import { ModulesBundle } from '../modules-bundle';

export function useRemoteConfig() {
  const remoteConfigModule = useAtomValue(
    useMemo(
      () =>
        atom(
          (get) =>
            (Object.values(get(ModulesBundle.modulesAtom)).find(
              (x: any) => x && typeof x === 'object' && 'iap' in x,
            ) ?? null) as RemoteConfigPayload | null,
        ),
      [],
    ),
  );

  if (!remoteConfigModule) {
    throw new Error('Remote config module is not initialized');
  }

  return remoteConfigModule.remoteConfig;
}
