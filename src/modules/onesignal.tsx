import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { OneSignal } from 'react-native-onesignal';

import { appEnvStore } from 'app-env';

import { ToolkitModule, ModuleOptions } from '../types';

export class OneSignalModule implements ToolkitModule {
  constructor(public readonly moduleOptions?: Partial<ModuleOptions>) {}

  get name() {
    return 'onesignal' as const;
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
        if (!appEnvStore.env.ONESIGNAL_APP_ID) {
          throw new Error('ONESIGNAL_APP_ID is not defined');
        }

        OneSignal.initialize(appEnvStore.env.ONESIGNAL_APP_ID);
        initialize();
      } catch (e) {
        error(e as Error);
      }
    }, [isReady, initialize]);

    return children;
  };

  get plugin() {
    const config = {
      dependencies: [
        'react-native-onesignal@^5.2.5',
        'onesignal-expo-plugin@^2.0.3',
      ],
      variables: {
        ONESIGNAL_APP_ID: {
          required: true,
          type: 'string',
        },
      },
      plugin: [
        [
          [
            'onesignal-expo-plugin',
            {
              mode: '[ONESIGNAL_APP_ID]',
            },
          ],
        ],
      ],
    } as const;

    return config;
  }
}
