import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { Settings, AppEventsLogger } from 'react-native-fbsdk-next';

import { TrackerPayload } from './types';
import { Module, ModuleOptions } from '../types';

export class FacebookModule implements Module {
  constructor(
    public readonly options: {
      appID: string;
      clientToken: string;
    },
    public readonly moduleOptions?: Partial<ModuleOptions>,
  ) {}

  get name() {
    return 'facebook' as const;
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

      if (!this.options.appID) {
        error(new Error('appID is not defined'));
        return;
      }

      if (!this.options.clientToken) {
        error(new Error('clientToken is not defined'));
        return;
      }

      Settings.setAppID(this.options.appID);
      Settings.setClientToken(this.options.clientToken);
      Settings.initializeSDK();

      initialize({
        async logEvent(event: string, parameters?: Record<string, any>) {
          AppEventsLogger.logEvent(event, parameters as any);
        },
      } as TrackerPayload);
    }, [isReady, initialize]);

    return children;
  };
}
