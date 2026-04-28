/* eslint-disable no-eval */
/* eslint-disable import/no-named-as-default-member */
import * as PNLight from '@pnlight/sdk-react-native';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import type AppsFlyer from 'react-native-appsflyer';

import { appEnvStore } from 'app-env';
import { ModulesBundle } from 'modules-bundle';
import { writeLog } from 'utils/log';

import { ModuleOptions, ToolkitModule } from '../types';

export class PNLightModule implements ToolkitModule {
  constructor(public readonly moduleOptions?: Partial<ModuleOptions>) {}

  get name() {
    return 'pnlight-module' as const;
  }

  get timeout() {
    return this.moduleOptions?.timeout ?? null;
  }

  get optional() {
    return this.moduleOptions?.optional ?? false;
  }

  Component: ToolkitModule['Component'] = ({
    children,
    initialize,
    isReadyAtom,
    error,
  }) => {
    const isReady = useAtomValue(isReadyAtom);

    useEffect(() => {
      if (!isReady) {
        return;
      }

      (async () => {
        try {
          if (!appEnvStore.env.PNLIGHT_ACCESS_TOKEN) {
            throw new Error('PNLIGHT_ACCESS_TOKEN is not defined');
          }

          await PNLight.initialize(appEnvStore.env.PNLIGHT_ACCESS_TOKEN);

          const userId = await PNLight.getUserId();

          initialize({
            userId,
            pnlight: {
              validatePurchase: PNLight.validatePurchase,
              getUIConfig: PNLight.getUIConfig,
              addAttribution: PNLight.addAttribution,
              logEvent: PNLight.logEvent,
              getUserId: PNLight.getUserId,
              initialize: PNLight.initialize,
              resetUserId: PNLight.resetUserId,
            },
            tracker: {
              async logEvent(event: string, parameters?: Record<string, any>) {
                await PNLight.logEvent(event, parameters);
              },
            },
          });
        } catch (e) {
          error(e as Error);
        }
      })();
    }, [error, initialize, isReady]);

    return children;
  };

  async postInitialize(bundle: typeof ModulesBundle) {
    const userId = await PNLight.getUserId();

    // connect PNLight to AppsFlyer
    (async () => {
      const pluginName = 'appsflyer';
      const payload = (await bundle.getModule(pluginName)) as any;

      const appsFlyer = payload.instance as typeof AppsFlyer;
      appsFlyer.getAppsFlyerUID((error, uid) => {
        if (error) {
          PNLight.addAttribution('appsFlyer', { error }, uid);
          return;
        }

        const removeInstallConversionDataListener =
          appsFlyer.onInstallConversionData((data) => {
            PNLight.addAttribution('appsFlyer', data.data, uid);
            removeInstallConversionDataListener();
          });

        const removeInstallConversionFailureListener =
          appsFlyer.onInstallConversionFailure((data) => {
            PNLight.addAttribution('appsFlyer', { error: data.data }, uid);
            removeInstallConversionFailureListener();
          });
      });

      writeLog['module-connected'](this.name, pluginName);
    })();

    // connect PNLight to Branch
    (async () => {
      const pluginName = 'branch';
      const branchPayload = (await bundle.getModule(pluginName)) as any;

      if (!branchPayload?.instance) {
        return;
      }

      const unsubscribe = branchPayload?.instance.default.subscribe({
        onOpenComplete: (event: any) => {
          PNLight.addAttribution('custom', event.params, userId);
          unsubscribe();
        },
      });

      writeLog['module-connected'](this.name, pluginName);
    })();

    // connect PNLight to Facebook
    (async () => {
      const pluginName = 'facebook';
      const payload = (await bundle.getModule(pluginName)) as any;

      if (!payload?.instance) {
        return;
      }

      await PNLight.addAttribution('facebook', {}, userId);
      writeLog['module-connected'](this.name, pluginName);
    })();

    // connect PNLight to Firebase
    (async () => {
      const pluginName = 'firebase';
      const payload = (await bundle.getModule(pluginName)) as any;

      if (!payload?.instance) {
        return;
      }

      await payload?.instance().setUserId(userId);
      const instanceId = await payload?.instance().getAppInstanceId();
      if (instanceId) {
        await PNLight.addAttribution('firebase', {}, instanceId);
      }

      writeLog['module-connected'](this.name, pluginName);
    })();
  }

  get plugin() {
    const config = {
      import: '@kirz/expo-toolkit/pnlight',
      dependencies: ['@pnlight/sdk-react-native@^0.5.0'],
      variables: {
        PNLIGHT_ACCESS_TOKEN: { required: true, type: 'string' },
      },
      plugin: [['@pnlight/sdk-react-native']],
    } as const;

    return config;
  }
}
