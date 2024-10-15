import { Atom } from 'jotai';
import { ComponentType, PropsWithChildren } from 'react';

import { createProvider } from './utils/app-root';

export type ModuleOptions = {
  timeout: number | null;
  optional: boolean;
};

export type Module = ModuleOptions & {
  name: string;

  Component: ComponentType<
    PropsWithChildren<{
      isReadyAtom: Atom<boolean>;
      initialize: (payload?: unknown) => void;
      error: (err: Error) => void;
    }>
  >;
};

export type ModuleQueueItem = Module | ModuleQueue;

export type ModuleQueue =
  | ModuleQueueItem[]
  | {
      parallel?: boolean;
      async?: boolean;
      queue: ModuleQueueItem[];
    };

export type AppConfig = {
  wrapLayout: <P extends JSX.IntrinsicAttributes>(
    Component: ComponentType<P>,
  ) => JSX.Element;
  modules: ModuleQueue;
  providers:
    | (ComponentType | { provider: ComponentType<any>; props: any })[]
    | ((utils: {
        withProps: typeof createProvider;
      }) => (ComponentType | { provider: ComponentType<any>; props: any })[]);
};
