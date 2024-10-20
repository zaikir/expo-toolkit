import * as Sentry from '@sentry/react-native';
import { useNavigationContainerRef } from 'expo-router';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';

import { ToolkitModule, ModuleOptions } from '../types';

const routingInstrumentation = new Sentry.ReactNavigationInstrumentation({
  enableTimeToInitialDisplay: true,
});

export class SentryModule implements ToolkitModule {
  constructor(
    public readonly dsn: string,
    public readonly options?: Partial<Sentry.ReactNativeOptions>,
    public readonly moduleOptions?: Partial<ModuleOptions>,
  ) {
    Sentry.init({
      dsn: this.dsn,
      ...this.options,
      ...((this.options?.debug ?? false) && {
        debug: true,
        integrations: [
          new Sentry.ReactNativeTracing({ routingInstrumentation }),
          ...((this.options?.integrations as any[]) ?? []),
        ],
      }),
    });
  }

  get name() {
    return 'sentry' as const;
  }

  get timeout() {
    return this.moduleOptions?.timeout ?? null;
  }

  get optional() {
    return this.moduleOptions?.optional ?? true;
  }

  Component: ToolkitModule['Component'] = Sentry.wrap(
    ({ children, isReadyAtom, initialize }) => {
      const ref = useNavigationContainerRef();
      const isReady = useAtomValue(isReadyAtom);

      useEffect(() => {
        if (!isReady) {
          return;
        }

        initialize();
      }, [isReady, initialize]);

      useEffect(() => {
        if (!isReady || !ref) {
          return;
        }

        routingInstrumentation.registerNavigationContainer(ref);
      }, [ref, isReady]);

      return children;
    },
  );
}
