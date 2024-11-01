import {
  requestTrackingPermissionsAsync,
  getAdvertisingId,
} from 'expo-tracking-transparency';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';

import { IdfaPayload } from './types';
import { ToolkitModule, ModuleOptions } from '../types';

export class IdfaModule implements ToolkitModule {
  constructor(public readonly moduleOptions?: Partial<ModuleOptions>) {}

  get name() {
    return 'idfa' as const;
  }

  get description() {
    return 'Apps Tracking Transparency request (IDFA). Adds "idfa" identifier to getIdentifier function' as const;
  }

  get groups() {
    return ['identifier'] as const;
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

      (async () => {
        try {
          await requestTrackingPermissionsAsync();

          initialize({
            getIdfa: getAdvertisingId,
          } as IdfaPayload);
        } catch (e) {
          error(e as Error);
        }
      })();
    }, [isReady, initialize]);

    return children;
  };

  get plugin() {
    const config = {
      import: '@kirz/expo-toolkit/idfa',
      dependencies: ['expo-tracking-transparency@^4.0.2'],
      variables: {
        IDFA_PERMISSION_TEXT: {
          required: false,
          type: 'string',
          default:
            'This identifier will be used to deliver personalized ads to you.',
        },
      },
      plugin: [
        [
          'expo-tracking-transparency',
          {
            userTrackingPermission: '[IDFA_PERMISSION_TEXT]',
          },
        ],
      ],
    } as const;

    return config;
  }
}
