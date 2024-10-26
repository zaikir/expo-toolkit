import { Atom } from 'jotai';
import { ComponentType, PropsWithChildren } from 'react';

import { ModulesBundle } from './modules-bundle';
import { createProvider } from './utils/app-root';

export type ModuleOptions = {
  timeout: number | null;
  optional: boolean;
};

export type ToolkitModule = ModuleOptions & {
  name: string;

  Component: ComponentType<
    PropsWithChildren<{
      isReadyAtom: Atom<boolean>;
      bundle: typeof ModulesBundle;
      initialize: (payload?: unknown) => Promise<void>;
      error: (err: Error) => void;
    }>
  >;

  dependencies?: readonly string[];
  plugins?: readonly (string | readonly [string, Record<string, any>])[];
};

export type ModuleQueueItem = ToolkitModule | ModuleQueue;

export type ModuleQueue =
  | ModuleQueueItem[]
  | {
      parallel?: boolean;
      async?: boolean;
      queue: ModuleQueueItem[];
    };

export type AppConfig = {
  env?: Record<string, string>;
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
