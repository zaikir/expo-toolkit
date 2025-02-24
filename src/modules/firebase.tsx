import analytics from '@react-native-firebase/analytics';
import initializeRemoteConfig, {
  FirebaseRemoteConfigTypes,
} from '@react-native-firebase/remote-config';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';

import { ToolkitModule, ModuleOptions } from '../types';
import { RemoteConfigPayload, TrackerPayload } from './types';
import { PromiseUtils } from '../utils/promise';

export class FirebaseModule implements ToolkitModule {
  constructor(
    public readonly options?: {
      remoteConfig?: {
        enabled?: boolean;
        config?: FirebaseRemoteConfigTypes.ConfigSettings;
      };
    },
    public readonly moduleOptions?: Partial<ModuleOptions>,
  ) {}

  get name() {
    return 'firebase' as const;
  }

  get description() {
    return 'Integration with Firebase' as const;
  }

  get groups() {
    return ['analytics', 'remote-config'] as const;
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

      (async () => {
        let remoteConfig: Record<string, any> | null = {};

        if (this.options?.remoteConfig?.enabled ?? true) {
          const config = initializeRemoteConfig();

          try {
            await PromiseUtils.timeout(async () => {
              await config.setConfigSettings(
                this.options?.remoteConfig?.config ?? {
                  minimumFetchIntervalMillis: 0,
                  fetchTimeMillis: 5000,
                },
              );

              await config.fetch(0);
              await config.activate();
            });

            remoteConfig = Object.fromEntries(
              Object.entries(config.getAll()).map(([key, entry]) => {
                try {
                  // @ts-expect-error
                  const parsed = JSON.parse(entry._value);
                  return [key, parsed];
                } catch {
                  return [key, entry.asString()];
                }
              }),
            );
          } catch {
            remoteConfig = {};
          }
        }

        initialize({
          tracker: {
            async logEvent(event: string, parameters?: Record<string, any>) {
              await analytics().logEvent(event, parameters);
            },
          },
          remoteConfig,
          instance: analytics,
        } as TrackerPayload & RemoteConfigPayload);
      })();
    }, [isReady, initialize]);

    return children;
  };

  get plugin() {
    const config = {
      import: '@kirz/expo-toolkit/firebase',
      dependencies: [
        '@react-native-firebase/analytics@^21.4.0',
        '@react-native-firebase/app@^21.4.0',
        '@react-native-firebase/remote-config@^21.4.0',
      ],
      variables: {},
      plugin: [
        ['@react-native-firebase/app', {}],
        // [
        //   'expo-build-properties',
        //   {
        //     ios: `{ "googleServicesFile": "./GoogleService-Info.plist" }`,
        //   },
        // ],
      ],
    } as const;

    return config;
  }
}
