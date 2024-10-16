import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import * as Branch from 'react-native-branch';

import { TrackerPayload } from './types';
import { Module, ModuleOptions } from '../types';

export class BranchModule implements Module {
  constructor(
    public readonly options: {
      apiKey: string;
      iosAppDomain: string;
    },
    public readonly moduleOptions?: Partial<ModuleOptions>,
  ) {}

  get name() {
    return 'branch' as const;
  }

  get timeout() {
    return this.moduleOptions?.timeout ?? null;
  }

  get optional() {
    return this.moduleOptions?.optional ?? true;
  }

  Component: Module['Component'] = ({ children, isReadyAtom, initialize }) => {
    const isReady = useAtomValue(isReadyAtom);

    useEffect(() => {
      if (!isReady) {
        return;
      }

      initialize({
        tracker: {
          async logEvent(event: string, parameters?: Record<string, any>) {
            await new Branch.BranchEvent(
              event,
              undefined,
              parameters,
            ).logEvent();
          },
        },
      } as TrackerPayload);
    }, [isReady, initialize]);

    return children;
  };
}
