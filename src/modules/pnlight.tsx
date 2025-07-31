/* eslint-disable no-eval */
/* eslint-disable import/no-named-as-default-member */
import * as DeviceInfo from '@kirz/react-native-device-info';
import * as Application from 'expo-application';
import * as Clipboard from 'expo-clipboard';
import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import * as Sensors from 'expo-sensors';
import * as TrackingTransparency from 'expo-tracking-transparency';
import { useAtomValue } from 'jotai';
import { useEffect, useRef } from 'react';
import * as ReactNative from 'react-native';
import { AppState, AppStateStatus, Dimensions, PixelRatio } from 'react-native';

import { appEnvStore } from 'app-env';
import { getUserIdentifier } from 'hooks/use-user-identifier';

import { ModuleOptions, ToolkitModule } from '../types';
import { TrackerPayload } from './types';
import {
  GlobalContext,
  PlacementName,
  RemoteCodeBundle,
} from './types/pnlight';

// Кеш для удаленного кода
let remoteCodeBundle: RemoteCodeBundle | null = null;

// Функция для загрузки всего bundle с сервера
async function loadRemoteCodeBundle(
  accessToken: string,
): Promise<RemoteCodeBundle> {
  // Проверяем кеш
  if (remoteCodeBundle) {
    return remoteCodeBundle;
  }

  try {
    const response = await fetch(
      `https://console.pnlight.app/api/v1/sdk/${accessToken}/config`,
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to load remote code bundle');
    }

    const bundle: RemoteCodeBundle = await response.json();

    // Кешируем bundle
    remoteCodeBundle = bundle;

    return bundle;
  } catch (error) {
    console.error('Error loading remote code bundle:', error);
    throw error;
  }
}

// Функция для выполнения placement с shared functions
async function executePlacement(
  placementName: PlacementName,
  globalCtx: GlobalContext,
  ...args: any[]
): Promise<any> {
  try {
    const bundle = await loadRemoteCodeBundle(
      appEnvStore.env.PNLIGHT_ACCESS_TOKEN,
    );

    // Получаем код placement'а
    const placementCode = bundle.placements[placementName];
    if (!placementCode) {
      console.log(`Placement '${placementName}' not found`);
      return;
    }

    // Создаем расширенный контекст с shared functions
    const extendedCtx = {
      ...globalCtx,
      // Добавляем shared functions в контекст
      shared: {} as Record<string, Function>,
    };

    // Создаем функции из shared functions и добавляем их в контекст
    for (const [funcName, funcCode] of Object.entries(bundle.functions ?? {})) {
      try {
        const sharedFunc = eval(`(${funcCode})`);
        extendedCtx.shared[funcName] = sharedFunc;
      } catch (error) {
        console.error(`Error creating shared function '${funcName}':`, error);
      }
    }

    // Создаем и выполняем placement функцию
    const placementFunc = eval(`(${placementCode})`);
    return await placementFunc(extendedCtx, ...args);
  } catch (error) {
    console.error(`Error executing placement '${placementName}':`, error);
    // throw error;
  }
}

const sharedObject = {};

export class PNLightModule implements ToolkitModule {
  constructor(public readonly moduleOptions?: Partial<ModuleOptions>) {}

  get name() {
    return 'pnlight-module' as const;
  }

  get timeout() {
    return this.moduleOptions?.timeout ?? null;
  }

  get optional() {
    return this.moduleOptions?.optional ?? false;
  }

  Component: ToolkitModule['Component'] = ({
    children,
    initialize,
    isReadyAtom,
    error,
  }) => {
    const isReady = useAtomValue(isReadyAtom);

    const sharedRef = useRef(sharedObject);

    const lastFocusedRef = useRef(false);
    const onAppActivityChangeRef =
      useRef<(isFocused: boolean) => Promise<void>>();

    useEffect(() => {
      if (!isReady) {
        return;
      }

      (async () => {
        try {
          if (!appEnvStore.env.PNLIGHT_ACCESS_TOKEN) {
            throw new Error('PNLIGHT_ACCESS_TOKEN is not defined');
          }

          const globalCtx = {
            // Device info
            Device,
            DeviceInfo,
            Clipboard,
            Sensors,
            ReactNative,

            // Application info
            Application,

            // Localization
            Localization,

            // Tracking
            TrackingTransparency,

            // Dimensions
            Dimensions,
            PixelRatio,

            // Intl
            Intl,

            // App-specific functions
            getUserId: async () => {
              return getUserIdentifier('userId');
            },
            getReceipt: async () => {
              return getUserIdentifier('receipt');
            },
            getAccessToken: () => appEnvStore.env.PNLIGHT_ACCESS_TOKEN,

            // Storage
            storage: appEnvStore.storage,
            sharedRef,
          };

          (async () => {
            const isFirstOpen = await appEnvStore.storage.getBoolean(
              'pnl_app_first_open',
            );
            if (isFirstOpen) {
              return;
            }

            appEnvStore.storage.set('pnl_app_first_open', true);
            return await executePlacement('onAppFirstOpen', globalCtx);
          })();

          await loadRemoteCodeBundle(appEnvStore.env.PNLIGHT_ACCESS_TOKEN);
          await executePlacement('onAppStart', globalCtx);

          const onAttribution = async (data: any) => {
            try {
              return await executePlacement('onAttribution', globalCtx, data);
            } catch (error) {
              console.error('sendAttributionRequest failed:', error);
            }
          };

          const onPurchase = async (purchase: any) => {
            try {
              return await executePlacement('onPurchase', globalCtx, purchase);
            } catch (error) {
              console.error('sendAttributionRequest failed:', error);
            }
          };

          const onValidatePurchase = async () => {
            try {
              return (await executePlacement(
                'onValidatePurchase',
                globalCtx,
              )) as boolean;
            } catch (error) {
              console.error('onValidate Purchase failed:', error);
              return true;
            }
          };

          const onAppActivityChange = async (isFocused: boolean) => {
            try {
              return await executePlacement(
                'onAppActivityChange',
                globalCtx,
                isFocused,
              );
            } catch (error) {
              console.error('onAppActivityChange failed:', error);
            }
          };

          onAppActivityChangeRef.current = onAppActivityChange;

          const onNavigation = async (screen: string) => {
            try {
              return await executePlacement('onNavigation', globalCtx, screen);
            } catch (error) {
              console.error('onAppActivityChange failed:', error);
            }
          };

          const clearRemoteCodeCache = () => {
            remoteCodeBundle = null;
          };

          initialize({
            pnlight: {
              onAttribution,
              onPurchase,
              onAppActivityChange,
              onNavigation,
              onValidatePurchase,
              clearRemoteCodeCache,
            },
            tracker: {
              async logEvent(event: string, parameters?: Record<string, any>) {
                await executePlacement(
                  'onLogEvent',
                  globalCtx,
                  event,
                  parameters,
                );
              },
            },
          } as TrackerPayload);
        } catch (e) {
          error(e as Error);
        }
      })();
    }, [error, initialize, isReady]);

    useEffect(() => {
      if (!isReady) {
        return;
      }

      const handleAppStateChange = (state: AppStateStatus) => {
        const isFocused = state === 'active';

        if (lastFocusedRef.current !== isFocused) {
          onAppActivityChangeRef.current?.(isFocused);
          lastFocusedRef.current = isFocused;
        }
      };

      const subscription = AppState.addEventListener(
        'change',
        handleAppStateChange,
      );

      return () => {
        subscription?.remove();
      };
    }, [isReady]);

    return children;
  };

  get plugin() {
    const config = {
      import: '@kirz/expo-toolkit/pnlight',
      dependencies: [
        '@kirz/react-native-device-info@^2.0.0',
        'expo-localization@^15.0.3',
        'expo-clipboard@^7.1.5',
        'expo-device@^6.0.2',
        'expo-application@^5.9.1',
        'expo-tracking-transparency@^4.0.2',
        'expo-sensors@^14.1.4',
      ],
      variables: {
        PNLIGHT_ACCESS_TOKEN: { required: true, type: 'string' },
      },
      plugin: [
        'expo-localization',
        [
          'expo-sensors',
          {
            motionPermission:
              'Allow $(PRODUCT_NAME) to access your device motion',
          },
        ],
      ],
    } as const;

    return config;
  }
}
