import { InAppPurchases } from '@kirz/expo-apphud';
import { atom, getDefaultStore, useAtomValue } from 'jotai';
import { useEffect } from 'react';

import { convertToBestUnit } from 'utils/iap';
import { PromiseUtils } from 'utils/promise';

import { getUserIdentifier } from '../hooks/use-user-identifier';
import { Module, ModuleOptions } from '../types';
import { IapPayload, IapState, IAPSubscription, PeriodUnit } from './types';

const store = getDefaultStore();

export class ApphudModule implements Module {
  constructor(
    public readonly options: {
      apiKey: string;
      premiumStatusRefreshInterval?: number;
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
            receipt: undefined,
          });

          const fetchProducts = async () => {
            const apphudProducts = (await InAppPurchases.fetchProducts()).sort(
              (a, b) => a.price - b.price,
            );
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const products = apphudProducts.filter(
              (x) => !x.subscriptionPeriod,
            );
            const subscriptions = apphudProducts.filter(
              (x) => !!x.subscriptionPeriod,
            );

            const subscriptionsWithTrial = await Promise.all(
              subscriptions.map(
                async ({ introductoryPrice, ...subscription }) => ({
                  ...subscription,
                  introductoryPrice: (await PromiseUtils.timeout(
                    InAppPurchases.isEligibleForTrial(subscription.id),
                    10000,
                    `Product eligibility check timed out for ${subscription.id}`,
                  ))
                    ? introductoryPrice
                    : undefined,
                }),
              ),
            );

            store.set(iapStateAtom, (prev) => ({
              ...prev,
              subscriptions: subscriptionsWithTrial.map((x) => {
                const period = convertToBestUnit(
                  x.subscriptionPeriod!.unit,
                  x.subscriptionPeriod!.numberOfUnits,
                );

                const trial =
                  x.introductoryPrice && x.introductoryPrice.paymentMode === 2
                    ? convertToBestUnit(
                        x.introductoryPrice.subscriptionPeriod.unit,
                        x.introductoryPrice.subscriptionPeriod.numberOfUnits,
                      )
                    : false;

                return {
                  id: x.id,
                  title: x.localizedTitle,
                  periodUnit: period[0],
                  numberOfPeriods: period[1],
                  price: x.price,
                  currency: x.priceLocale.currencySymbol,
                  trial: trial
                    ? { periodUnit: trial[0], numberOfPeriods: trial[1] }
                    : (false as const),
                };
              }),
              products: products as any,
            }));
          };

          const refreshPremiumState = async () => {
            const hasActiveSubscription =
              await InAppPurchases.hasActiveSubscription();

            const prevState = store.get(iapStateAtom).hasPremium;
            const newState = hasActiveSubscription;

            if (prevState !== newState) {
              const receipt =
                await InAppPurchases.getRawAppStoreReceipt().catch(() => null);

              store.set(iapStateAtom, (prev) => ({
                ...prev,
                hasPremium: newState,
                receipt,
              }));
            }

            return newState;
          };

          const restorePurchases = async () => {
            try {
              await InAppPurchases.restorePurchases();
              return await refreshPremiumState();
            } catch {
              return false;
            }
          };

          const purchaseProduct = async (id: string) => {
            const result = await InAppPurchases.purchaseProduct(id);
            if (!result.success) {
              return null;
            }

            await refreshPremiumState();

            return {
              productId: id,
              transactionId: result.transaction_id,
            };
          };

          const unitToDaysMap: { [key in PeriodUnit]: number } = {
            day: 1,
            week: 7,
            month: 30,
            quarter: 90,
            year: 365,
          };

          const computeSubscriptionRelativePrice = (
            subscription: IAPSubscription,
            periodUnit: PeriodUnit,
            numberOfPeriods: number,
          ) => {
            // Convert current price to price per day
            const currentTotalDays =
              unitToDaysMap[subscription.periodUnit] *
              subscription.numberOfPeriods;
            const pricePerDay = subscription.price / currentTotalDays;

            // Convert target unit/period to total days
            const targetTotalDays = unitToDaysMap[periodUnit] * numberOfPeriods;

            // Calculate the equivalent price for the target period
            const relativePrice = pricePerDay * targetTotalDays;

            return relativePrice;
          };

          const computeSubscriptionDiscount = (
            subscription: IAPSubscription,
            mainSubscription: IAPSubscription,
          ) => {
            // Convert current price to price per day
            const currentTotalDays =
              unitToDaysMap[subscription.periodUnit] *
              subscription.numberOfPeriods;
            const pricePerDay = subscription.price / currentTotalDays;

            // Convert target unit/period to total days
            const targetTotalDays =
              unitToDaysMap[mainSubscription.periodUnit] *
              mainSubscription.numberOfPeriods;

            // Calculate the equivalent price for the target period
            const mainPricePerDay = mainSubscription.price * targetTotalDays;

            return ((mainPricePerDay - pricePerDay) / mainPricePerDay) * 100;
          };

          const getTrialExpirationDate = (subscription: IAPSubscription) => {
            if (!subscription.trial) {
              throw new Error('Subscription has no trial');
            }

            const daysCount =
              unitToDaysMap[subscription.periodUnit] *
              subscription.numberOfPeriods;

            return new Date(Date.now() + daysCount * 24 * 60 * 60 * 1000);
          };

          initialize({
            iap: {
              state: iapStateAtom,
              refetchProducts: fetchProducts,
              restorePurchases,
              purchaseProduct,
              computeSubscriptionRelativePrice,
              computeSubscriptionDiscount,
              getTrialExpirationDate,
            },
          } as IapPayload);

          (async () => {
            await Promise.all([fetchProducts(), refreshPremiumState()]);

            setInterval(
              () => refreshPremiumState(),
              this.options.premiumStatusRefreshInterval ?? 5 * 60 * 1000, // 5 minutes
            );
          })();
        } catch (err) {
          error(err as Error);
        }
      })();
    }, [error, initialize, isReady]);

    return children;
  };
}
