import React, { ComponentProps, ComponentType, PropsWithChildren } from 'react';

import { AppRoot } from '../types';

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

export function appRoot(config: AppRoot) {
  return {
    ...config,
    providers: config.providers.map((provider) => {
      if (Array.isArray(provider)) {
        return { provider: provider[0], props: provider[1] };
      }

      return { provider, props: {} };
    }) as { provider: ComponentType; props: any }[],
  };
}
