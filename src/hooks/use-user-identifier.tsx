import { atom, getDefaultStore, useAtomValue } from 'jotai';
import { useMemo } from 'react';

import { pluginsAtom } from '../components/app-initializer';

type IdentifierKey = 'userId' | 'idfa' | 'idfv';
type Identifier<K extends IdentifierKey> = K extends 'userId'
  ? string
  : string | null;

export function useUserIdentifier<K extends IdentifierKey>(
  key: K,
): Identifier<K> {
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

export function getUserIdentifier<K extends IdentifierKey>(
  key: K,
): Identifier<K> {
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
