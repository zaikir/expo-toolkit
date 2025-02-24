import { atom, getDefaultStore, useAtomValue } from 'jotai';
import { useMemo } from 'react';

import { IapPayload } from '../modules/types';
import { ModulesBundle } from '../modules-bundle';

type IdentifierKey = 'userId' | 'idfa' | 'idfv' | 'receipt';
type Identifier<K extends IdentifierKey> = K extends 'userId'
  ? string
  : string | null;

const store = getDefaultStore();

const getModule = (bundle: Record<string, unknown>, key: IdentifierKey) => {
  if (key === 'userId') {
    return bundle['identity'];
  }

  if (key === 'receipt') {
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
    () => atom((get) => getModule(get(ModulesBundle.modulesAtom), key)),
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

  if (key === 'receipt') {
    const iapPayload = payload as IapPayload;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const iapState = useAtomValue(iapPayload.iap.state);

    return iapState.receipt ?? '';
  }

  throw new Error(`Unknown user identifier ${key}`);
}

export function getUserIdentifier<K extends IdentifierKey>(
  key: K,
): Identifier<K> {
  const moduleAtom = atom((get) =>
    getModule(get(ModulesBundle.modulesAtom), key),
  );

  if (!moduleAtom) {
    throw new Error(`Module ${key} is not initialized`);
  }

  const payload = store.get(moduleAtom) as any;
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

  if (key === 'receipt') {
    const iapPayload = payload as IapPayload;
    return store.get(iapPayload.iap.state).receipt ?? '';
  }

  throw new Error(`Unknown user identifier ${key}`);
}
