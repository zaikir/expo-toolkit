import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { OneSignal } from 'react-native-onesignal';

import { ToolkitModule, ModuleOptions } from '../types';

export class OneSignalModule implements ToolkitModule {
  constructor(
    public readonly options: {
      appId: string;
    },
    public readonly moduleOptions?: Partial<ModuleOptions>,
  ) {}

  get name() {
    return 'onesignal' as const;
  }

  get timeout() {
    return this.moduleOptions?.timeout ?? null;
  }

  get optional() {
    return this.moduleOptions?.optional ?? true;
  }

  Component: ToolkitModule['Component'] = ({
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
