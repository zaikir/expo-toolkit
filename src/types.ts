import { Atom } from 'jotai';
import { ComponentType, FC, PropsWithChildren } from 'react';

import { createProvider } from './utils/app-root';

export type PluginOptions = {
  timeout: number | null;
  optional: boolean;
};

export type Plugin = PluginOptions & {
  name: string;

  Component: FC<
    PropsWithChildren<{
      isReadyAtom: Atom<boolean>;
      initialize: (payload?: unknown) => void;
      error: (err: Error) => void;
    }>
  >;
};

export type PluginQueueItem = Plugin | PluginQueue;

export type PluginQueue =
  | PluginQueueItem[]
  | {
      type: 'sequential' | 'parallel';
      async?: boolean;
      queue: PluginQueueItem[];
    };

export type AppConfig = {
  providers:
    | (ComponentType | { provider: ComponentType<any>; props: any })[]
    | ((utils: {
        withProps: typeof createProvider;
      }) => (ComponentType | { provider: ComponentType<any>; props: any })[]);
};
