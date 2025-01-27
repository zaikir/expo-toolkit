import { useAtomValue } from 'jotai';
import { useEffect } from 'react';

import { appEnvStore } from 'app-env';

import { ToolkitModule, ModuleOptions } from '../types';

export class ClarityModule implements ToolkitModule {
  constructor(public readonly moduleOptions?: Partial<ModuleOptions>) {}

  get name() {
    return 'clarity' as const;
  }

  get description() {
    return 'Integration with Microsoft Clarity' as const;
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
        if (!appEnvStore.env.CLARITY_APP_ID) {
          throw new Error('CLARITY_APP_ID is not defined');
        }

        initialize(appEnvStore.env.CLARITY_APP_ID);
        initialize();
      } catch (e) {
        error(e as Error);
      }
    }, [isReady, initialize]);

    return children;
  };

  get plugin() {
    const config = {
      import: '@kirz/expo-toolkit/clarity',
      dependencies: ['@microsoft/react-native-clarity@^4.1.3'],
      variables: {
        CLARITY_APP_ID: {
          required: true,
          type: 'string',
        },
      },
      plugin: [],
    } as const;

    return config;
  }
}
