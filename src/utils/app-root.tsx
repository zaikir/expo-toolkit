import React, { ComponentProps, ComponentType, PropsWithChildren } from 'react';

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

export function createApp(config: AppConfig) {
  return {
    ...config,
    providers: (typeof config.providers === 'function'
      ? config.providers({ withProps: createProvider })
      : config.providers
    ).map((provider) => {
      if (Array.isArray(provider)) {
        return { provider: provider[0], props: provider[1] };
      }

      return { provider, props: {} };
    }) as { provider: ComponentType; props: any }[],
  };
}
