/* eslint-disable no-eval */
/* eslint-disable import/no-named-as-default-member */
import * as PNLight from '@pnlight/sdk-react-native';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';

import { appEnvStore } from 'app-env';

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

          const validatePurchase = () => {
            return PNLight.validatePurchase();
          };

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
      dependencies: ['@pnlight/sdk-react-native@^0.3.3'],
      variables: {
        PNLIGHT_ACCESS_TOKEN: { required: true, type: 'string' },
      },
      plugin: [],
    } as const;

    return config;
  }
}
