import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import appsFlyer, { InitSDKOptions } from 'react-native-appsflyer';

import { appEnvStore } from 'app-env';

import { TrackerPayload } from './types';
import { getUserIdentifier } from '../hooks/use-user-identifier';
import { ToolkitModule, ModuleOptions } from '../types';

export class AppsFlyerModule implements ToolkitModule {
  constructor(
    public readonly options?: Omit<InitSDKOptions, 'devKey' | 'appId'>,
    readonly callbacks?: {
      onAppOpenAttribution?: Parameters<
        typeof appsFlyer.onAppOpenAttribution
      >[0];
      onAttributionFailure?: Parameters<
        typeof appsFlyer.onAttributionFailure
      >[0];
      onDeepLink?: Parameters<typeof appsFlyer.onDeepLink>[0];
      onInstallConversionData?: Parameters<
        typeof appsFlyer.onInstallConversionData
      >[0];
      onInstallConversionFailure?: Parameters<
        typeof appsFlyer.onInstallConversionFailure
      >[0];
      onInitSuccess?: (result?: any) => any;
      onInitFailure?: (error?: any) => any;
    },
    private readonly moduleOptions?: Partial<ModuleOptions>,
  ) {}

  get name() {
    return 'appsflyer' as const;
  }

  get description() {
    return 'Integration with AppsFlyer' as const;
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
        if (!appEnvStore.env.APPSFLYER_DEV_KEY) {
          throw new Error('APPSFLYER_DEV_KEY is not defined');
        }

        if (!appEnvStore.env.APPSFLYER_APP_ID) {
          throw new Error('APPSFLYER_APP_ID is not defined');
        }

        const userId = getUserIdentifier('userId');
        appsFlyer.setCustomerUserId(userId, () => {});

        appsFlyer.onAppOpenAttribution((data) => {
          this.callbacks?.onAppOpenAttribution?.(data);
        });

        appsFlyer.onAttributionFailure((data) => {
          this.callbacks?.onAttributionFailure?.(data);
        });

        appsFlyer.onDeepLink((data) => {
          this.callbacks?.onDeepLink?.(data);
        });

        appsFlyer.onInstallConversionData((data) => {
          this.callbacks?.onInstallConversionData?.(data);
        });

        appsFlyer.onInstallConversionFailure((data) => {
          this.callbacks?.onInstallConversionFailure?.(data);
        });

        appsFlyer.initSdk(
          {
            devKey: appEnvStore.env.APPSFLYER_DEV_KEY,
            appId: appEnvStore.env.APPSFLYER_APP_ID,
            isDebug: false,
            onInstallConversionDataListener: true,
            onDeepLinkListener: true,
            timeToWaitForATTUserAuthorization: 0,
            ...this.options,
          },
          (result) => {
            initialize({
              tracker: {
                async logEvent(
                  event: string,
                  parameters?: Record<string, any>,
                ) {
                  await appsFlyer.logEvent(event, parameters as any);
                },
              },
              instance: appsFlyer,
            } as TrackerPayload);
            this.callbacks?.onInitSuccess?.(result);
          },
          (e) => {
            error(e ?? new Error('AppsFlyer error'));
            this.callbacks?.onInitFailure?.(error);
          },
        );
      } catch (e) {
        error(e as Error);
      }
    }, [isReady, initialize]);

    return children;
  };

  get plugin() {
    const config = {
      import: '@kirz/expo-toolkit/appsflyer',
      dependencies: ['react-native-appsflyer@^6.15.1'],
      variables: {
        APPSFLYER_DEV_KEY: { required: true, type: 'string' },
        APPSFLYER_APP_ID: { required: true, type: 'string' },
        APPSFLYER_ONELINK_DOMAIN: { required: false, type: 'string' },
        APPSFLYER_USE_STRICT_MODE: {
          required: false,
          type: 'boolean',
          default: false,
        },
        APPSFLYER_DEBUG_MODE: {
          required: false,
          type: 'boolean',
          default: false,
        },
      },
      plugin: [
        [
          'react-native-appsflyer',
          {
            shouldUseStrictMode: `[env_APPSFLYER_USE_STRICT_MODE]`,
          },
        ],
      ],
    } as const;

    return config;
  }
}
