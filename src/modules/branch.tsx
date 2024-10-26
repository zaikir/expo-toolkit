import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import * as Branch from 'react-native-branch';

import { appEnvStore } from 'app-env';

import { TrackerPayload } from './types';
import { getUserIdentifier } from '../hooks/use-user-identifier';
import { ToolkitModule, ModuleOptions } from '../types';

export class BranchModule implements ToolkitModule {
  constructor(
    public readonly options?: {
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
    error,
  }) => {
    const isReady = useAtomValue(isReadyAtom);

    useEffect(() => {
      if (!isReady) {
        return;
      }

      try {
        if (!appEnvStore.env.BRANCH_KEY) {
          throw new Error('BRANCH_KEY is not defined');
        }

        const userId = getUserIdentifier('userId');

        Branch.default.setIdentity(userId);
        Branch.default.subscribe({
          onOpenStart: (event) => {
            this.options?.onOpenStart?.(event);
          },
          onOpenComplete: (event) => {
            this.options?.onOpenComplete?.(event);
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
      } catch (e) {
        error(e as Error);
      }
    }, [isReady, initialize]);

    return children;
  };

  get plugin() {
    const config = {
      dependencies: [
        'react-native-branch@^6.3.0',
        '@config-plugins/react-native-branch@^8.0.0',
      ],
      variables: {
        BRANCH_KEY: { required: true, type: 'string' },
        BRANCH_LINK_DOMAIN: { required: false, type: 'string' },
      },
      plugin: [
        [
          '@config-plugins/react-native-branch',
          {
            apiKey: `[BRANCH_KEY]`,
            iosAppDomain: `[BRANCH_LINK_DOMAIN]`,
          },
        ],
      ],
    } as const;

    return config;
  }
}
