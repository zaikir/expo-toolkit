import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import * as Branch from 'react-native-branch';

import { TrackerPayload } from './types';
import { Plugin, PluginOptions } from '../types';

export class BranchPlugin implements Plugin {
  constructor(
    public readonly options: {
      apiKey: string;
      iosAppDomain: string;
    },
    public readonly pluginOptions?: Partial<PluginOptions>,
  ) {}

  get name() {
    return 'branch' as const;
  }

  get timeout() {
    return this.pluginOptions?.timeout ?? null;
  }

  get optional() {
    return this.pluginOptions?.optional ?? true;
  }

  Component: Plugin['Component'] = ({ children, isReadyAtom, initialize }) => {
    const isReady = useAtomValue(isReadyAtom);

    useEffect(() => {
      if (!isReady) {
        return;
      }

      initialize({
        async logEvent(event: string, parameters?: Record<string, any>) {
          await new Branch.BranchEvent(event, undefined, parameters).logEvent();
        },
      } as TrackerPayload);
    }, [isReady, initialize]);

    return children;
  };
}
