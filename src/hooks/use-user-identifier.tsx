import { atom, getDefaultStore, useAtomValue } from 'jotai';
import { useMemo } from 'react';

import { pluginsAtom } from '../components/app-initializer';

type IdentifierKey = 'userId' | 'idfa' | 'idfv' | 'iap-receipt';
type Identifier<K extends IdentifierKey> = K extends 'userId'
  ? string
  : string | null;

const getModule = (bundle: Record<string, unknown>, key: IdentifierKey) => {
  if (key === 'userId') {
    return bundle['identity'];
  }

  if (key === 'iap-receipt') {
    return Object.values(bundle).find(
      (x: any) => x && typeof x === 'object' && 'iap' in x,
    );
  }

  return bundle[key];
};

export function useUserIdentifier<K extends IdentifierKey>(
  key: K,
): Identifier<K> {
  const moduleAtom = useMemo(
    () => atom((get) => getModule(get(pluginsAtom), key)),
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

  if (key === 'iap-receipt') {
    return payload.iap.receipt;
  }

  throw new Error(`Unknown user identifier ${key}`);
}

export function getUserIdentifier<K extends IdentifierKey>(
  key: K,
): Identifier<K> {
  const moduleAtom = atom((get) => getModule(get(pluginsAtom), key));

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

  if (key === 'iap-receipt') {
    return payload.iap.receipt;
  }

  throw new Error(`Unknown user identifier ${key}`);
}
