import {
  requestTrackingPermissionsAsync,
  getAdvertisingId,
} from 'expo-tracking-transparency';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';

import { IdfaPayload } from './types';
import { Plugin, PluginOptions } from '../types';

export class IdfaPlugin implements Plugin {
  constructor(public readonly pluginOptions?: Partial<PluginOptions>) {}

  get name() {
    return 'idfa' as const;
  }

  get timeout() {
    return this.pluginOptions?.timeout ?? null;
  }

  get optional() {
    return this.pluginOptions?.optional ?? true;
  }

  Component: Plugin['Component'] = ({
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
          await requestTrackingPermissionsAsync();

          initialize({
            getIdfa: getAdvertisingId,
          } as IdfaPayload);
        } catch (e) {
          error(e as Error);
        }
      })();
    }, [isReady, initialize]);

    return children;
  };
}
