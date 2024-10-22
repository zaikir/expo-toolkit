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
    public readonly options: {
      remoteConfig?: {
        initialData: Record<string, any>;
        config?: FirebaseRemoteConfigTypes.ConfigSettings;
      };
    },
    public readonly moduleOptions?: Partial<ModuleOptions>,
  ) {}

  get name() {
    return 'firebase' as const;
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
        let remoteConfig: Record<string, any> | null = null;

        if (this.options.remoteConfig) {
          const config = initializeRemoteConfig();

          try {
            await PromiseUtils.timeout(async () => {
              await config.setConfigSettings(
                this.options.remoteConfig?.config ?? {
                  minimumFetchIntervalMillis: 0,
                  fetchTimeMillis: 5000,
                },
              );
              await config.setDefaults({
                ...this.options.remoteConfig?.initialData,
              });

              await config.fetch(0);
              await config.activate();
            });

            remoteConfig = Object.fromEntries(
              Object.entries(config.getAll()).map(([key, entry]) => {
                const defaultValue =
                  this.options.remoteConfig?.initialData[key];

                if (!defaultValue) {
                  try {
                    // @ts-expect-error
                    const parsed = JSON.parse(entry._value);
                    return [key, parsed];
                  } catch {
                    return [key, entry.asString()];
                  }
                }

                if (typeof defaultValue === 'string') {
                  return [key, entry.asString()];
                }

                if (typeof defaultValue === 'boolean') {
                  return [key, entry.asBoolean()];
                }

                if (typeof defaultValue === 'number') {
                  return [key, entry.asNumber()];
                }

                // @ts-ignore
                return [key, JSON.parse(entry._value)];
              }),
            );
          } catch {
            remoteConfig = this.options.remoteConfig.config ?? null;
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
}