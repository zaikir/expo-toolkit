import { createIntl, createIntlCache } from '@formatjs/intl';
import { getLocales } from 'expo-localization';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';

import { LocalizationPayload } from './types';
import { ToolkitModule, ModuleOptions } from '../types';

import 'intl';
import 'intl/dist/Intl.complete';

export class LocalizationModule implements ToolkitModule {
  constructor(public readonly moduleOptions?: Partial<ModuleOptions>) {}

  get name() {
    return 'localization' as const;
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

    useEffect(() => {
      if (!isReady) {
        return;
      }

      (async () => {
        try {
          const locale = getLocales()[0];

          const cache = createIntlCache();

          const intl = createIntl(
            {
              locale: locale.languageTag,
              messages: {},
            },
            cache,
          );

          initialize({
            localization: {
              locale,
              intl,
              formatPrice(price, currency, options) {
                if (!currency && !locale.currencyCode) {
                  throw new Error('Missing currency code');
                }

                return intl.formatNumber(price, {
                  style: 'currency',
                  currency: currency ?? locale.currencyCode!,
                  compactDisplay: 'short',
                  currencyDisplay: 'symbol',
                  ...options,
                });
              },
              formatNumber(value, options) {
                return intl.formatNumber(value, {
                  ...options,
                });
              },
            },
          } as LocalizationPayload);
        } catch (e) {
          error(e as Error);
        }
      })();
    }, [isReady, initialize]);

    return children;
  };
}