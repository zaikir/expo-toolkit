import * as Sentry from '@sentry/react-native';
import { useNavigationContainerRef } from 'expo-router';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';

import { appEnvStore } from 'app-env';

import { ToolkitModule, ModuleOptions } from '../types';

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

export class SentryModule implements ToolkitModule {
  constructor(
    public readonly options?: Partial<Sentry.ReactNativeOptions>,
    public readonly moduleOptions?: Partial<ModuleOptions>,
  ) {
    const debug = appEnvStore.env.SENTRY_DSN ?? false;

    Sentry.init({
      dsn: appEnvStore.env.SENTRY_DSN,
      ...this.options,
      debug,
      ...((debug ?? false) && {
        integrations: [
          navigationIntegration,
          ...((this.options?.integrations as any[]) ?? []),
        ],
      }),
    });
  }

  get name() {
    return 'sentry' as const;
  }

  get description() {
    return 'Integration with Sentry' as const;
  }

  get timeout() {
    return this.moduleOptions?.timeout ?? null;
  }

  get optional() {
    return this.moduleOptions?.optional ?? true;
  }

  Component: ToolkitModule['Component'] = Sentry.wrap(
    ({ children, isReadyAtom, initialize, error }) => {
      const ref = useNavigationContainerRef();
      const isReady = useAtomValue(isReadyAtom);

      useEffect(() => {
        if (!isReady) {
          return;
        }

        try {
          if (!appEnvStore.env.SENTRY_DSN) {
            throw new Error('SENTRY_DSN is not defined');
          }

          initialize();
        } catch (e) {
          error(e as Error);
        }
      }, [isReady, initialize]);

      useEffect(() => {
        if (!isReady || !ref) {
          return;
        }

        navigationIntegration.registerNavigationContainer(ref);
      }, [ref, isReady]);

      return children;
    },
  );

  get plugin() {
    const config = {
      import: '@kirz/expo-toolkit/sentry',
      dependencies: ['@sentry/react-native@^6.22.0'],
      variables: {
        SENTRY_DSN: {
          required: true,
          type: 'string',
        },
        // SENTRY_PROJECT: {
        //   required: true,
        //   type: 'string',
        // },
        // SENTRY_ORGANIZATION: {
        //   required: true,
        //   type: 'string',
        // },
        SENTRY_DEBUG_MODE: {
          required: false,
          type: 'boolean',
          default: false,
        },
      },
      plugin: [],
    } as const;

    return config;
  }
}
