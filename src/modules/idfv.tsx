import { getIosIdForVendorAsync } from 'expo-application';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';

import { IdfvPayload } from './types';
import { Module, ModuleOptions } from '../types';

export class IdfvModule implements Module {
  constructor(public readonly moduleOptions?: Partial<ModuleOptions>) {}

  get name() {
    return 'idfv' as const;
  }

  get timeout() {
    return this.moduleOptions?.timeout ?? null;
  }

  get optional() {
    return this.moduleOptions?.optional ?? true;
  }

  Component: Module['Component'] = ({
    children,
    isReadyAtom,
    initialize,
    error,
  }) => {
    const isReady = useAtomValue(isReadyAtom);

    useEffect(() => {
      if (!isReady) {
        return;
      }

      (async () => {
        try {
          initialize({
            idfv: await getIosIdForVendorAsync().catch(() => null),
          } as IdfvPayload);
        } catch (e) {
          error(e as Error);
        }
      })();
    }, [isReady, initialize]);

    return children;
  };
}
