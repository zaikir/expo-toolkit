import { InAppPurchases } from '@kirz/expo-apphud';
import { atom, getDefaultStore, useAtomValue } from 'jotai';
import { useEffect } from 'react';

import { convertToBestUnit } from 'utils/iap';

import { getUserIdentifier } from '../hooks/use-user-identifier';
import { Module, ModuleOptions } from '../types';
import { IapPayload, IapState } from './types';

export class ApphudModule implements Module {
  constructor(
    public readonly options: {
      apiKey: string;
    },
    public readonly moduleOptions?: Partial<ModuleOptions>,
  ) {}

  get name() {
    return 'apphud' as const;
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

    useEffect(() => {
      if (!isReady) {
        return;
      }

      (async () => {
        try {
          await InAppPurchases.start(
            this.options.apiKey,
            getUserIdentifier('userId'),
          );

          const iapStateAtom = atom<IapState>({
            products: undefined,
            subscriptions: undefined,
            hasPremium: undefined,
            activeSubscription: undefined,
            async restorePurchases() {
              return false;
            },
            async purchasePremium() {
              return null;
            },
          });

          initialize({
            iap: {
              state: iapStateAtom,
            },
          } as IapPayload);

          (async () => {
            const store = getDefaultStore();
            const apphudProducts = await InAppPurchases.fetchProducts();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const products = apphudProducts.filter(
              (x) => !x.subscriptionPeriod,
            );
            const subscriptions = apphudProducts.filter(
              (x) => !!x.subscriptionPeriod,
            );

            store.set(iapStateAtom, {
              subscriptions: subscriptions.map((x) => {
                const period = convertToBestUnit(
                  x.subscriptionPeriod!.unit,
                  x.subscriptionPeriod!.numberOfUnits,
                );

                return {
                  productId: x.id,
                  title: x.localizedTitle,
                  periodUnit: period[0],
                  numberOfPeriods: period[1],
                  originalData: x,
                  price: x.price,
                  currency: x.priceLocale.currencySymbol,
                  localizedPrice: x.price.toString(),
                };
              }),
              products: products as any,
              hasPremium: false,
              activeSubscription: null,
              async purchasePremium() {
                return null;
              },
              async restorePurchases() {
                return false;
              },
            });
          })();
        } catch (err) {
          error(err as Error);
        }
      })();
    }, [error, initialize, isReady]);

    return children;
  };
}
