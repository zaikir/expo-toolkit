import * as Device from 'expo-device';
import { useAtomValue } from 'jotai';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { getUserIdentifier } from 'hooks/use-user-identifier';

import { usePurchases } from '../hooks/use-purchases';
import { ToolkitModule, ModuleOptions } from '../types';

export class PnlPlatformModule implements ToolkitModule {
  constructor(
    public readonly options: {
      apiKey: string;
      apiUrl: string;
    },
    public readonly moduleOptions?: Partial<ModuleOptions>,
  ) {}

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
      await fetch(`${this.options.apiUrl}/${this.options.apiKey}`, {
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
      });
    }, []);

    useEffect(() => {
      if (!isReady) {
        return;
      }

      if (!this.options.apiKey) {
        error(new Error('apiKey is not defined'));
        return;
      }

      if (!this.options.apiUrl) {
        error(new Error('apiUrl is not defined'));
        return;
      }

      sendUserState();
      initialize();
      setIsInitialized(true);
    }, [isReady, initialize]);

    return (
      <>
        {children}
        {isInitialized && <PurchasesListener sendUserState={sendUserState} />}
      </>
    );
  };
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
