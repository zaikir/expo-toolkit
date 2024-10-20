import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as fbsdk from 'react-native-fbsdk-next';

import { TrackerPayload } from './types';
import { getUserIdentifier } from '../hooks/use-user-identifier';
import { ModulesBundle } from '../modules-bundle';
import { ToolkitModule, ModuleOptions } from '../types';
import { writeLog } from '../utils/log';

const { Settings, AppEventsLogger } = fbsdk;

export class FacebookModule implements ToolkitModule {
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

      try {
        if (!this.options.appID) {
          throw new Error('appID is not defined');
        }

        if (!this.options.clientToken) {
          throw new Error('clientToken is not defined');
        }

        const userId = getUserIdentifier('userId');

        Settings.setAppID(this.options.appID);
        Settings.setClientToken(this.options.clientToken);
        AppEventsLogger.setUserID(userId);

        Settings.initializeSDK();

        initialize({
          tracker: {
            async logEvent(event: string, parameters?: Record<string, any>) {
              AppEventsLogger.logEvent(event, parameters as any);
            },
          },
          instance: fbsdk,
        } as TrackerPayload);

        // connect Facebook to IDFA
        (async () => {
          if (Platform.OS !== 'ios') {
            return;
          }

          const pluginName = 'idfa';
          const payload = (await ModulesBundle.getModule(pluginName)) as any;

          if (!payload?.getIdfa) {
            return;
          }

          const idfa = payload?.getIdfa();
          Settings.setAdvertiserTrackingEnabled(!!idfa);

          writeLog['module-connected'](this.name, pluginName);
        })();
      } catch (e) {
        error(e as Error);
      }
    }, [isReady, initialize]);

    return children;
  };
}
