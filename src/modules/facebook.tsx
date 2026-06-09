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

const isTrackingAuthorized = (idfa: string | null) =>
  !!idfa && idfa !== '00000000-0000-0000-0000-000000000000';

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

        // On iOS, SDK init is deferred to postInitialize so ATE is set after ATT.
        if (Platform.OS !== 'ios') {
          Settings.initializeSDK();
        }

        initialize({
          tracker: {
            async logEvent(event: string, parameters?: Record<string, any>) {
              AppEventsLogger.logEvent(event, parameters as any);
            },
          },
          instance: fbsdk,
        } as TrackerPayload);
      } catch (e) {
        error(e as Error);
      }
    }, [isReady, initialize]);

    return children;
  };

  async postInitialize(bundle: typeof ModulesBundle) {
    if (Platform.OS !== 'ios') {
      return;
    }

    const pluginName = 'idfa';
    let trackingEnabled = false;

    try {
      const payload = (await bundle.getModule(pluginName)) as {
        getIdfa?: () => string | null;
      };

      if (payload?.getIdfa) {
        trackingEnabled = isTrackingAuthorized(payload.getIdfa());
        writeLog['module-connected'](this.name, pluginName);
      }
    } catch {
      // idfa module is optional; default to tracking disabled.
    }

    await Settings.setAdvertiserTrackingEnabled(trackingEnabled);
    Settings.initializeSDK();
  }

  get plugin() {
    const config = {
      import: '@kirz/expo-toolkit/facebook',
      dependencies: ['react-native-fbsdk-next@^13.4.1'],
      variables: {
        FACEBOOK_APP_ID: {
          required: true,
          type: 'string',
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
            appID: '[env_FACEBOOK_APP_ID]',
            displayName: '[env_FACEBOOK_DISPLAY_NAME]',
            clientToken: '[env_FACEBOOK_CLIENT_TOKEN]',
            scheme: '[env_FACEBOOK_SCHEME]',
            advertiserIDCollectionEnabled:
              '[env_FACEBOOK_ADVERTISER_ID_COLLECTION_ENABLED]',
            autoLogAppEventsEnabled:
              '[env_FACEBOOK_AUTO_LOG_APP_EVENTS_ENABLED]',
          },
        ],
      ],
    } as const;

    return config;
  }
}
