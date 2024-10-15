import { getUserIdentity as getNativeUserIdentity } from 'expo-user-identity';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect } from 'react';
import { type MMKV } from 'react-native-mmkv';

import { Module, ModuleOptions } from '../types';

export class UserIdentityModule implements Module {
  constructor(
    public readonly options: {
      storage: MMKV;
    },
    public readonly moduleOptions?: Partial<ModuleOptions>,
  ) {}

  get name() {
    return 'userId' as const;
  }

  get timeout() {
    return this.moduleOptions?.timeout ?? null;
  }

  get optional() {
    return this.moduleOptions?.optional ?? false;
  }

  Component: Module['Component'] = ({
    children,
    isReadyAtom,
    initialize,
    error,
  }) => {
    const isReady = useAtomValue(isReadyAtom);

    const fetchUserIdentity = useCallback(async () => {
      let userId: string | null = null;
      const storedIdentity = this.options.storage.getString('user_identity');
      if (storedIdentity) {
        return storedIdentity;
      }

      try {
        userId = await getNativeUserIdentity();
      } catch {
        userId = generateUUID();
      }

      this.options.storage.set('user_identity', userId!);
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
}

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
