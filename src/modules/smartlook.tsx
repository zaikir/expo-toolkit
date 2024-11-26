import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import Smartlook from 'react-native-smartlook-analytics';

import { appEnvStore } from 'app-env';

import { ToolkitModule, ModuleOptions } from '../types';

export class SmartLookModule implements ToolkitModule {
  constructor(public readonly moduleOptions?: Partial<ModuleOptions>) {}

  get name() {
    return 'smartlook' as const;
  }

  get description() {
    return 'Integration with Smart Look' as const;
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
        if (!appEnvStore.env.SMARTLOOK_APP_ID) {
          throw new Error('SMARTLOOK_APP_ID is not defined');
        }

        Smartlook.instance.preferences.setProjectKey(
          appEnvStore.env.SMARTLOOK_APP_ID,
        );
        Smartlook.instance.start();

        initialize();
      } catch (e) {
        error(e as Error);
      }
    }, [isReady, initialize]);

    return children;
  };

  get plugin() {
    const config = {
      import: '@kirz/expo-toolkit/smartlook',
      dependencies: ['react-native-smartlook-analytics@^2.1.19'],
      variables: {
        SMARTLOOK_APP_ID: {
          required: true,
          type: 'string',
        },
      },
      plugin: [],
    } as const;

    return config;
  }
}
