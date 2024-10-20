import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import * as Branch from 'react-native-branch';

import { TrackerPayload } from './types';
import { getUserIdentifier } from '../hooks/use-user-identifier';
import { ToolkitModule, ModuleOptions } from '../types';

export class BranchModule implements ToolkitModule {
  constructor(
    public readonly options: {
      apiKey: string;
      iosAppDomain: string;
      onOpenStart?: (event: Branch.BranchOpenStartEvent) => void;
      onOpenComplete?: (event: Branch.BranchSubscriptionEvent) => void;
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

  Component: ToolkitModule['Component'] = ({
    children,
    isReadyAtom,
    initialize,
  }) => {
    const isReady = useAtomValue(isReadyAtom);

    useEffect(() => {
      if (!isReady) {
        return;
      }

      const userId = getUserIdentifier('userId');

      Branch.default.setIdentity(userId);
      Branch.default.subscribe({
        onOpenStart: (event) => {
          this.options.onOpenStart?.(event);
        },
        onOpenComplete: (event) => {
          this.options.onOpenComplete?.(event);
        },
      });

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
        instance: Branch,
      } as TrackerPayload);
    }, [isReady, initialize]);

    return children;
  };
}
