import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { OneSignal } from 'react-native-onesignal';

import { Plugin, PluginOptions } from '../types';

export class OneSignalPlugin implements Plugin {
  constructor(
    public readonly options: {
      appId: string;
    },
    public readonly pluginOptions?: Partial<PluginOptions>,
  ) {}

  get name() {
    return 'onesignal' as const;
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

      if (!this.options.appId) {
        error(new Error('appId is not defined'));
        return;
      }

      OneSignal.initialize(this.options.appId);
      initialize();
    }, [isReady, initialize]);

    return children;
  };
}
