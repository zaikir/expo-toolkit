import * as Device from 'expo-device';
import { useAtomValue } from 'jotai';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { appEnvStore } from 'app-env';
import { getUserIdentifier } from 'hooks/use-user-identifier';

import { usePurchases } from '../hooks/use-purchases';
import { ToolkitModule, ModuleOptions } from '../types';

export class PnlPlatformModule implements ToolkitModule {
  constructor(public readonly moduleOptions?: Partial<ModuleOptions>) {}

  get name() {
    return 'pnl-platform' as const;
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
    const [isInitialized, setIsInitialized] = useState(false);

    const sendUserState = useCallback(async () => {
      await fetch(
        `${appEnvStore.env.PNL_PLATFORM_API_URL}/${appEnvStore.env.PNL_PLATFORM_APP_ID}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: Platform.OS,
            deviceFamily: Device.deviceName,
            deviceModel: Device.modelName,
            osVersion: Device.osVersion,
            modelId: Device.modelId,
            userId: getUserIdentifier('userId'),
            idfv: getUserIdentifier('idfv'),
            idfa: getUserIdentifier('idfa'),
            receipt: getUserIdentifier('receipt'),
          }),
        },
      );
    }, []);

    useEffect(() => {
      if (!isReady) {
        return;
      }

      try {
        if (!appEnvStore.env.PNL_PLATFORM_APP_ID) {
          throw new Error('PNL_PLATFORM_APP_ID is not defined');
        }

        if (!appEnvStore.env.PNL_PLATFORM_API_URL) {
          throw new Error('PNL_PLATFORM_API_URL is not defined');
        }

        sendUserState();
        initialize();
        setIsInitialized(true);
      } catch (e) {
        error(e as Error);
      }
    }, [isReady, initialize]);

    return (
      <>
        {children}
        {isInitialized && <PurchasesListener sendUserState={sendUserState} />}
      </>
    );
  };

  get plugin() {
    const config = {
      import: '@kirz/expo-toolkit/pnl-platform',
      dependencies: [],
      variables: {
        PNL_PLATFORM_APP_ID: {
          required: true,
          type: 'string',
        },
        PNL_PLATFORM_API_URL: {
          required: true,
          type: 'string',
        },
      },
    } as const;

    return config;
  }
}

function PurchasesListener({
  sendUserState,
}: {
  sendUserState: () => Promise<void>;
}) {
  const { lastPurchase } = usePurchases();

  useEffect(() => {
    if (!lastPurchase) {
      return;
    }

    sendUserState();
  }, [lastPurchase, sendUserState]);

  return null;
}
