import { atom, getDefaultStore, useAtomValue } from 'jotai';
import { useMemo } from 'react';

import { pluginsAtom } from '../components/app-initializer';

export function useUserIdentifier(
  key: 'userId' | 'idfa' | 'idfv',
): string | null {
  const moduleAtom = useMemo(
    () => atom((get) => get(pluginsAtom)[key === 'userId' ? 'identity' : key]),
    [],
  );
  if (!moduleAtom) {
    throw new Error(`Module ${key} is not initialized`);
  }

  const payload = useAtomValue(moduleAtom) as any;
  if (payload === undefined) {
    throw new Error(`Module ${key} is not initialized`);
  }

  if (key === 'userId') {
    return payload['userId'];
  }

  if (key === 'idfa') {
    return payload.getIdfa();
  }

  if (key === 'idfv') {
    return payload.idfv;
  }

  throw new Error(`Unknown user identifier ${key}`);
}

export function getUserIdentifier(
  key: 'userId' | 'idfa' | 'idfv',
): string | null {
  const moduleAtom = atom((get) => get(pluginsAtom)[key]);
  if (!moduleAtom) {
    throw new Error(`Module ${key} is not initialized`);
  }

  const payload = getDefaultStore().get(moduleAtom) as any;
  if (payload === undefined) {
    throw new Error(`Module ${key} is not initialized`);
  }

  if (key === 'userId') {
    return payload['userId'];
  }

  if (key === 'idfa') {
    return payload.getIdfa();
  }

  if (key === 'idfv') {
    return payload.idfv;
  }

  throw new Error(`Unknown user identifier ${key}`);
}
