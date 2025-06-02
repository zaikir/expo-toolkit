/* eslint-disable import/no-named-as-default-member */
import DeviceInfo, {
  getDeviceId,
  getDeviceType,
  getModel,
  getSystemVersion,
} from '@kirz/react-native-device-info';
import { getLocales } from 'expo-localization';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

import { appEnvStore } from 'app-env';

import { getUserIdentifier } from '../hooks/use-user-identifier';
import { ModuleOptions, ToolkitModule } from '../types';

export const handlePNLightClickId = async function (clickId: string) {
  try {
    const userId = getUserIdentifier('userId');

    await fetch('https://console.pnlight.app/api/v1/ads/user-click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        clickId,
      }),
    });
  } catch (err) {
    console.error(err);
  }
};

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

    useEffect(() => {
      if (!isReady) {
        return;
      }

      (async () => {
        try {
          if (!appEnvStore.env.PNLIGHT_APP_ID) {
            throw new Error('PNLIGHT_APP_ID is not defined');
          }

          const sendUserInitRequest = async function () {
            try {
              const userId = getUserIdentifier('userId');
              const idfa = getUserIdentifier('idfa');
              const idfv = getUserIdentifier('idfv');
              const receipt = getUserIdentifier('receipt');

              await fetch(
                `https://console.pnlight.app/api/v1/sdk/ios/users/${appEnvStore.env.PNLIGHT_APP_ID}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    userId,
                    receipt,
                    platform: Platform.OS.toLowerCase(), // 'ios',
                    deviceFamily: getDeviceType(),
                    deviceModel: getModel(),
                    osVersion: getSystemVersion(),
                    modelId: getDeviceId(),
                    idfv,
                    idfa,
                  }),
                },
              );
            } catch (e) {
              console.error(e);
            }
          };

          const trackInstall = async function () {
            await new Promise((resolve) => {
              setTimeout(resolve, 3000);
            });

            const locales = getLocales();

            const ipInfoResponse = await fetch('https://ipinfo.io/json');
            const ipInfo = await ipInfoResponse.json();
            const dimensions = Dimensions.get('screen');

            const isEmulator = await DeviceInfo.isEmulator();
            const device = {
              brand: DeviceInfo.getBrand(),
              modelName: DeviceInfo.getModel(),
              modelId: DeviceInfo.getDeviceId(),
              osName: Platform.OS === 'ios' ? 'iOS' : 'Android',
              osVersion: DeviceInfo.getSystemVersion(),
              isDevice: !isEmulator,
              screen: {
                width: dimensions.width,
                height: dimensions.height,
                scale: dimensions.scale,
              },
            };

            const response = await fetch(
              'https://console.pnlight.app/api/v1/ads/track-install',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  installTime: Date.now(),
                  locales,
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  ipInfo,
                  device,
                }),
              },
            );

            const { clickId } = await response.json();

            if (!clickId) {
              return;
            }

            await handlePNLightClickId(clickId);
          };

          const logEvent = async function (
            event: string,
            parameters?: Record<string, any> | undefined,
          ) {
            const userId = getUserIdentifier('userId');
            await fetch('https://console.pnlight.app/api/v1/ads/event', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId,
                eventName: event,
                eventArgs: parameters,
              }),
            });
          };

          await sendUserInitRequest();
          await trackInstall();

          initialize({
            tracker: {
              async logEvent(event: string, parameters?: Record<string, any>) {
                await logEvent(event, parameters);
              },
            },
            pnlight: {
              trackInstall,
              sendUserInitRequest,
              handlePNLightClickId,
            },
          });
        } catch (e) {
          error(e as Error);
        }
      })();
    }, [error, initialize, isReady]);

    return children;
  };

  get plugin() {
    const config = {
      import: '@kirz/expo-toolkit/pnlight',
      dependencies: [
        '@kirz/react-native-device-info@^2.0.0',
        'expo-localization@^15.0.3',
      ],
      variables: {
        PNLIGHT_APP_ID: { required: true, type: 'string' },
      },
      plugin: [],
    } as const;

    return config;
  }
}
