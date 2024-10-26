import { getUserIdentity as getNativeUserIdentity } from 'expo-user-identity';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect } from 'react';

import { appEnvStore } from 'app-env';

import { ToolkitModule, ModuleOptions } from '../types';

export class UserIdentityModule implements ToolkitModule {
  constructor(public readonly moduleOptions?: Partial<ModuleOptions>) {}

  get name() {
    return 'identity' as const;
  }

  get timeout() {
    return this.moduleOptions?.timeout ?? null;
  }

  get optional() {
    return this.moduleOptions?.optional ?? false;
  }

  Component: ToolkitModule['Component'] = ({
    children,
    isReadyAtom,
    initialize,
    error,
  }) => {
    const isReady = useAtomValue(isReadyAtom);

    const fetchUserIdentity = useCallback(async () => {
      let userId: string | null = null;
      const storedIdentity = appEnvStore.storage.getString('user_identity');
      if (storedIdentity) {
        return storedIdentity;
      }

      try {
        if (!(appEnvStore.env.IDENTITY_ENABLE_ICLOUD ?? true)) {
          throw new Error('iCloud is not enabled');
        }

        userId = await getNativeUserIdentity();
      } catch {
        userId = generateUUID();
      }

      appEnvStore.storage.set('user_identity', userId!);
      return userId;
    }, []);

    useEffect(() => {
      if (!isReady) {
        return;
      }

      (async () => {
        try {
          initialize({
            userId: await fetchUserIdentity(),
          });
        } catch (err) {
          error(err as Error);
        }
      })();
    }, [error, fetchUserIdentity, initialize, isReady]);

    return children;
  };

  get plugin() {
    const config = {
      dependencies: ['expo-user-identity@^0.4.0'],
      variables: {
        IDENTITY_ENABLE_ICLOUD: {
          required: false,
          type: 'boolean',
          default: true,
        },
        IDENTITY_ICLOUD_CONTAINER_ENV: {
          required: false,
          type: 'string',
          default: 'Production',
        },
      },
      plugin: [
        [
          'expo-user-identity',
          {
            iCloudContainerEnvironment: '[IDENTITY_ICLOUD_CONTAINER_ENV]',
          },
        ],
      ],
    } as const;

    return config;
  }
}

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
