import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as fbsdk from 'react-native-fbsdk-next';

import { appEnvStore } from 'app-env';

import { TrackerPayload } from './types';
import { getUserIdentifier } from '../hooks/use-user-identifier';
import { ModulesBundle } from '../modules-bundle';
import { ToolkitModule, ModuleOptions } from '../types';
import { writeLog } from '../utils/log';

const { Settings, AppEventsLogger } = fbsdk;

export class FacebookModule implements ToolkitModule {
  constructor(public readonly moduleOptions?: Partial<ModuleOptions>) {}

  get name() {
    return 'facebook' as const;
  }

  get description() {
    return 'Integration with Facebook' as const;
  }

  get groups() {
    return ['analytics'] as const;
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
        if (!appEnvStore.env.FACEBOOK_APP_ID) {
          throw new Error('FACEBOOK_APP_ID is not defined');
        }

        if (!appEnvStore.env.FACEBOOK_CLIENT_TOKEN) {
          throw new Error('FACEBOOK_CLIENT_TOKEN is not defined');
        }

        const userId = getUserIdentifier('userId');

        Settings.setAppID(appEnvStore.env.FACEBOOK_APP_ID);
        Settings.setClientToken(appEnvStore.env.FACEBOOK_CLIENT_TOKEN);
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

  get plugin() {
    const config = {
      import: '@kirz/expo-toolkit/facebook',
      dependencies: ['react-native-fbsdk-next@^13.1.3'],
      variables: {
        FACEBOOK_APP_ID: {
          required: true,
          type: 'string',
          default: '[APP_ID]',
        },
        FACEBOOK_CLIENT_TOKEN: { required: true, type: 'string' },
        FACEBOOK_DISPLAY_NAME: {
          required: false,
          type: 'string',
          default: '[APP_NAME]',
        },
        FACEBOOK_SCHEME: {
          required: false,
          type: 'string',
          default: 'fb[FACEBOOK_APP_ID]',
        },
        FACEBOOK_ADVERTISER_ID_COLLECTION_ENABLED: {
          required: false,
          type: 'boolean',
          default: true,
        },
        FACEBOOK_AUTO_LOG_APP_EVENTS_ENABLED: {
          required: false,
          type: 'boolean',
          default: true,
        },
      },
      plugin: [
        [
          'react-native-fbsdk-next',
          {
            appID: '[FACEBOOK_APP_ID]',
            displayName: '[FACEBOOK_DISPLAY_NAME]',
            clientToken: '[FACEBOOK_CLIENT_TOKEN]',
            scheme: '[FACEBOOK_SCHEME]',
            advertiserIDCollectionEnabled:
              '[FACEBOOK_ADVERTISER_ID_COLLECTION_ENABLED]',
            autoLogAppEventsEnabled: '[FACEBOOK_AUTO_LOG_APP_EVENTS_ENABLED]',
          },
        ],
      ],
    } as const;

    return config;
  }
}
