import React, { ComponentProps, ComponentType, PropsWithChildren } from 'react';

import { appEnvStore } from 'app-env';

import { AppInitializer } from '../components/app-initializer';
import { AppConfig } from '../types';

type Provider<T extends ComponentType<any> = ComponentType<any>> = {
  provider: T;
  props: Omit<ComponentProps<T>, 'children'>;
};

export function createProvider<T extends ComponentType<any>>(
  provider: T,
  props: Omit<ComponentProps<T>, 'children'>,
): Provider<T> {
  return { provider, props };
}

type ContextProviderProps = { providers: Provider[] } & PropsWithChildren;

function ContextProviders({ children, providers }: ContextProviderProps) {
  return providers
    .reverse()
    .reduce(
      (acc, { provider: Provider, props }) => (
        <Provider {...props}>{acc}</Provider>
      ),
      children,
    );
}

export function withContextProviders<P extends JSX.IntrinsicAttributes>(
  Component: ComponentType<P>,
  providers: Provider[],
) {
  return function WithContextProviders(props: P) {
    return (
      <ContextProviders providers={providers}>
        <Component {...props} />
      </ContextProviders>
    );
  };
}

export function createApp({
  env,
  storage,
  ...config
}: Pick<AppConfig, 'env' | 'storage' | 'providers' | 'modules'>) {
  const providers = (
    typeof config.providers === 'function'
      ? config.providers({ withProps: createProvider })
      : config.providers
  ).map((provider) => {
    if ('provider' in provider) {
      return provider;
    }

    return { provider, props: {} };
  }) as { provider: ComponentType; props: any }[];

  appEnvStore.env = env ?? {};
  appEnvStore.storage = storage ?? {};

  return {
    ...config,
    providers,
    wrapLayout(Component: ComponentType) {
      return withContextProviders(Component, [
        ...providers,
        createProvider(AppInitializer, { modules: config.modules }),
      ]);
    },
  };
}
