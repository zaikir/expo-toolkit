import { atom, getDefaultStore, useAtomValue } from 'jotai';
import { useMemo } from 'react';

import { RemoteConfigPayload } from 'modules/types';

import { ModulesBundle } from '../modules-bundle';

export function useRemoteConfig(options?: {
  throwIfModuleNotInitialized?: boolean;
}) {
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
    if (options?.throwIfModuleNotInitialized ?? true) {
      throw new Error('Remote config module is not initialized');
    }

    return {};
  }

  return remoteConfigModule.remoteConfig;
}

export function getRemoteConfig() {
  const moduleAtom = Object.values(
    getDefaultStore().get(ModulesBundle.modulesAtom),
  ).find((x) => x && typeof x === 'object' && 'remoteConfig' in x) as any;

  if (!moduleAtom) {
    return {};
  }

  return moduleAtom.remoteConfig ?? {};
}
