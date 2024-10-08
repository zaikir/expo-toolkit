import { Atom } from 'jotai';
import { ComponentType, FC, PropsWithChildren } from 'react';

import { createProvider } from './utils/app-root';

export type ModuleOptions = {
  timeout: number | null;
  optional: boolean;
};

export type Module = ModuleOptions & {
  name: string;

  Component: FC<
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
      type: 'sequential' | 'parallel';
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
