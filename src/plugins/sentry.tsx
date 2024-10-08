import * as Sentry from '@sentry/react-native';
import { useNavigationContainerRef } from 'expo-router';
import { useAtomValue } from 'jotai';
import { useEffect, useMemo } from 'react';

import { Plugin, PluginOptions } from '../types';

const routingInstrumentation = Sentry.reactNavigationIntegration();

export class SentryPlugin implements Plugin {
  constructor(
    public readonly dsn: string,
    public readonly options?: Partial<Sentry.ReactNativeOptions>,
    public readonly pluginOptions?: Partial<PluginOptions>,
  ) {
    Sentry.init({
      dsn: this.dsn,
      ...this.options,
      ...((this.options?.debug ?? false) && {
        debug: true,
        integrations: [
          Sentry.reactNativeTracingIntegration({
            routingInstrumentation,
          }),
          ...((this.options?.integrations as any[]) ?? []),
        ],
      }),
    });
  }

  get name() {
    return 'sentry' as const;
  }

  get timeout() {
    return this.pluginOptions?.timeout ?? null;
  }

  get optional() {
    return this.pluginOptions?.optional ?? true;
  }

  Component: Plugin['Component'] = ({ children, isReadyAtom, initialize }) => {
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

    return useMemo(() => Sentry.wrap(children as any), []) as any;
  };
}
