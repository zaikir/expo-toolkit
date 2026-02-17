/* eslint-disable no-eval */
/* eslint-disable import/no-named-as-default-member */
import * as PNLight from '@pnlight/sdk-react-native';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';

import { appEnvStore } from 'app-env';
import { ModulesBundle } from 'modules-bundle';

import { writeLog } from 'utils/log';
import { ModuleOptions, ToolkitModule } from '../types';
import type AppsFlyer from 'react-native-appsflyer';
import { getUserIdentifier } from '../hooks/use-user-identifier';

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

          const validatePurchase = () => {
            return PNLight.validatePurchase();
          };

          const userId = getUserIdentifier('userId');

          PNLight.initialize(appEnvStore.env.PNLIGHT_ACCESS_TOKEN);

          initialize({
            pnlight: {
              validatePurchase,
            },
            tracker: {
              async logEvent(event: string, parameters?: Record<string, any>) {
                await PNLight.logEvent(event, parameters);
              },
            },
          });

          // connect PNLight to AppsFlyer
          (async () => {
            const pluginName = 'appsflyer';
            const payload = (await ModulesBundle.getModule(pluginName)) as any;

            if (!payload?.instance) {
              return;
            }

            const appsFlyer = payload.instance as typeof AppsFlyer;
            appsFlyer.getAppsFlyerUID((error, uid) => {
              if (error) {
                return;
              }

              const removeInstallConversionDataListener =
                appsFlyer.onInstallConversionData((data) => {
                  PNLight.addAttribution('appsFlyer', data.data, uid);
                  removeInstallConversionDataListener();
                });

              const removeInstallConversionFailureListener =
                appsFlyer.onInstallConversionFailure((data) => {
                  PNLight.addAttribution(
                    'appsFlyer',
                    { error: data.data },
                    uid,
                  );

                  removeInstallConversionFailureListener();
                });
            });

            writeLog['module-connected'](this.name, pluginName);
          })();

          // connect PNLight to Branch
          (async () => {
            const pluginName = 'branch';
            const branchPayload = (await ModulesBundle.getModule(
              pluginName,
            )) as any;

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

          // connect Apphud to Facebook
          (async () => {
            const pluginName = 'facebook';
            const payload = (await ModulesBundle.getModule(pluginName)) as any;

            if (!payload?.instance) {
              return;
            }

            await PNLight.addAttribution('facebook', {}, userId);
            writeLog['module-connected'](this.name, pluginName);
          })();

          // connect Apphud to Firebase
          (async () => {
            const pluginName = 'firebase';
            const payload = (await ModulesBundle.getModule(pluginName)) as any;

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
        } catch (e) {
          error(e as Error);
        }
      })();
    }, [error, initialize, isReady]);

    return children;
  };

  get plugin() {
    const config = {
      import: '@kirz/expo-toolkit/pnlight',
      dependencies: ['@pnlight/sdk-react-native@^0.4.5'],
      variables: {
        PNLIGHT_ACCESS_TOKEN: { required: true, type: 'string' },
      },
      plugin: [['@pnlight/sdk-react-native']],
    } as const;

    return config;
  }
}
