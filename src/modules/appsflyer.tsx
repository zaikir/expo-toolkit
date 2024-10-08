import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import appsFlyer, { InitSDKOptions } from 'react-native-appsflyer';

import { TrackerPayload } from './types';
import { Module, ModuleOptions } from '../types';

export class AppsFlyerModule implements Module {
  constructor(
    public readonly options: InitSDKOptions,
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

      if (!this.options.devKey) {
        error(new Error('devKey is not defined'));
        return;
      }

      if (!this.options.appId && Platform.OS === 'ios') {
        error(new Error('appId is not defined'));
        return;
      }

      if (this.callbacks?.onAppOpenAttribution) {
        appsFlyer.onAppOpenAttribution(this.callbacks.onAppOpenAttribution);
      }

      if (this.callbacks?.onAttributionFailure) {
        appsFlyer.onAttributionFailure(this.callbacks.onAttributionFailure);
      }

      if (this.callbacks?.onDeepLink) {
        appsFlyer.onDeepLink(this.callbacks.onDeepLink);
      }

      appsFlyer.onInstallConversionData(
        this.callbacks?.onInstallConversionData ?? (() => {}),
      );

      if (this.callbacks?.onInstallConversionFailure) {
        appsFlyer.onInstallConversionFailure(
          this.callbacks.onInstallConversionFailure,
        );
      }

      appsFlyer.initSdk(
        {
          isDebug: false,
          onInstallConversionDataListener: true,
          onDeepLinkListener: true,
          timeToWaitForATTUserAuthorization: 0,
          ...this.options,
        },
        (result) => {
          initialize({
            async logEvent(event: string, parameters?: Record<string, any>) {
              await appsFlyer.logEvent(event, parameters as any);
            },
          } as TrackerPayload);
          this.callbacks?.onInitSuccess?.(result);
        },
        (e) => {
          error(e ?? new Error('AppsFlyer error'));
          this.callbacks?.onInitFailure?.(error);
        },
      );
    }, [isReady, initialize]);

    return children;
  };
}
