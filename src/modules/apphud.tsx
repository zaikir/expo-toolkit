import { InAppPurchases } from '@kirz/expo-apphud';
import { atom, getDefaultStore, useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import type AppsFlyer from 'react-native-appsflyer';

import { appEnvStore } from 'app-env';
import { ModulesBundle } from 'modules-bundle';
import { convertToBestUnit } from 'utils/iap';
import { writeLog } from 'utils/log';
import { PromiseUtils } from 'utils/promise';

import { getUserIdentifier } from '../hooks/use-user-identifier';
import { ToolkitModule, ModuleOptions } from '../types';
import {
  IapPayload,
  IapState,
  IAPSubscription,
  IdfaPayload,
  PeriodUnit,
} from './types';
import { PnlightPayload } from './types/pnlight';

const store = getDefaultStore();
const modulesStore = store;

export class ApphudModule implements ToolkitModule {
  constructor(
    public readonly options?: {
      premiumStatusRefreshInterval?: number;
    },
    public readonly moduleOptions?: Partial<ModuleOptions>,
  ) {}

  get name() {
    return 'apphud' as const;
  }

  get description() {
    return 'Integration with Apphud' as const;
  }

  get groups() {
    return ['iap'] as const;
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
          if (!appEnvStore.env.APPHUD_API_KEY) {
            throw new Error('APPHUD_API_KEY is not defined');
          }

          const userId = getUserIdentifier('userId');

          await InAppPurchases.start(appEnvStore.env.APPHUD_API_KEY, userId);

          const iapStateAtom = atom<IapState>({
            products: undefined,
            subscriptions: undefined,
            hasPremium: undefined,
            activeSubscription: undefined,
            receipt: await InAppPurchases.getRawAppStoreReceipt().catch(
              () => null,
            ),
            lastPurchase: undefined,
          });

          const fetchProducts = async () => {
            const [apphudProducts] = await Promise.all([
              InAppPurchases.fetchProducts(),
            ]);

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const products = apphudProducts.filter(
              (x) => !x.subscriptionPeriod,
            );
            const subscriptions = apphudProducts.filter(
              (x) => !!x.subscriptionPeriod,
            );

            const subscriptionsWithTrial = await Promise.all(
              subscriptions.map(
                async ({ introductoryPrice, ...subscription }) => {
                  try {
                    return {
                      ...subscription,
                      introductoryPrice: (await PromiseUtils.timeout(
                        InAppPurchases.isEligibleForTrial(subscription.id),
                        10000,
                        `Product eligibility check timed out for ${subscription.id}`,
                      ))
                        ? introductoryPrice
                        : undefined,
                    };
                  } catch {
                    return {
                      ...subscription,
                      introductoryPrice: undefined,
                    };
                  }
                },
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
                  currency: x.priceLocale.currencyCode,
                  trial: trial
                    ? { periodUnit: trial[0], numberOfPeriods: trial[1] }
                    : null,
                };
              }),
              products: products.map((x) => ({
                id: x.id,
                title: x.localizedTitle,
                price: x.price,
                currency: x.priceLocale.currencyCode,
              })),
            }));
          };

          const refreshPremiumState = async () => {
            const hasActiveSubscription =
              await InAppPurchases.hasActiveSubscription();

            if (store.get(iapStateAtom).hasPremium !== hasActiveSubscription) {
              store.set(iapStateAtom, (prev) => ({
                ...prev,
                hasPremium: hasActiveSubscription,
              }));
            }

            const receipt = await InAppPurchases.getRawAppStoreReceipt().catch(
              () => null,
            );
            if (store.get(iapStateAtom).receipt !== receipt) {
              store.set(iapStateAtom, (prev) => ({
                ...prev,
                receipt,
              }));
            }

            return hasActiveSubscription;
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

            store.set(iapStateAtom, (prev) => ({
              ...prev,
              lastPurchase: {
                productId: id,
                transactionId: result.transaction_id,
              },
            }));

            // send PNLight purchase event
            try {
              const pnlightModule = (Object.values(
                modulesStore.get(ModulesBundle.modulesAtom),
              ).find(
                (x: any) => x && typeof x === 'object' && 'pnlight' in x,
              ) ?? null) as PnlightPayload | null;

              pnlightModule?.pnlight.onPurchase(result);
            } catch (error) {
              console.error(error);
            }

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
            const currentTotalDays =
              unitToDaysMap[subscription.periodUnit] *
              subscription.numberOfPeriods;
            const targetTotalDays =
              unitToDaysMap[mainSubscription.periodUnit] *
              mainSubscription.numberOfPeriods;
            const pricePerDay = subscription.price / currentTotalDays;
            const mainPricePerDay = mainSubscription.price / targetTotalDays;

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
            await InAppPurchases.restorePurchases().catch(() => {});
            await Promise.all([fetchProducts(), refreshPremiumState()]);

            setInterval(
              () => refreshPremiumState(),
              this.options?.premiumStatusRefreshInterval ?? 5 * 60 * 1000, // 5 minutes
            );
          })();

          // connect IDFA to Apphud
          if (Platform.OS === 'ios') {
            (async () => {
              try {
                const pluginName = 'idfa';
                const payload = (await ModulesBundle.getModule(
                  pluginName,
                )) as IdfaPayload;

                if (!payload) {
                  return;
                }

                const idfa = payload.getIdfa();
                await InAppPurchases.setDeviceIdentifiers({
                  idfa,
                });
                writeLog['module-connected'](this.name, pluginName);
              } catch (err) {
                console.error(err);
              }
            })();
          }

          // connect Apphud to AppsFlyer
          (async () => {
            const pluginName = 'appsflyer';
            const payload = (await ModulesBundle.getModule(pluginName)) as any;

            if (!payload?.instance) {
              return;
            }

            const appsFlyer = payload.instance as typeof AppsFlyer;
            appsFlyer.getAppsFlyerUID((error, uid) => {
              if (error) {
                return;
              }

              const removeInstallConversionDataListener =
                appsFlyer.onInstallConversionData((data) => {
                  InAppPurchases.addAttribution(data.data, 'AppsFlyer', uid);
                  removeInstallConversionDataListener();
                });

              const removeInstallConversionFailureListener =
                appsFlyer.onInstallConversionFailure((data) => {
                  InAppPurchases.addAttribution(
                    { error: data.data },
                    'AppsFlyer',
                    uid,
                  );

                  removeInstallConversionFailureListener();
                });
            });

            writeLog['module-connected'](this.name, pluginName);
          })();

          // connect Apphud to Branch
          (async () => {
            const pluginName = 'branch';
            const branchPayload = (await ModulesBundle.getModule(
              pluginName,
            )) as any;

            if (!branchPayload?.instance) {
              return;
            }

            const unsubscribe = branchPayload?.instance.default.subscribe({
              onOpenComplete: (event: any) => {
                InAppPurchases.addAttribution(event.params, 'Custom', userId);

                unsubscribe();
              },
            });

            writeLog['module-connected'](this.name, pluginName);
          })();

          // connect Apphud to Facebook
          (async () => {
            const pluginName = 'facebook';
            const payload = (await ModulesBundle.getModule(pluginName)) as any;

            if (!payload?.instance) {
              return;
            }

            await InAppPurchases.addAttribution({}, 'Facebook', userId);
            writeLog['module-connected'](this.name, pluginName);
          })();

          // connect Apphud to Firebase
          (async () => {
            const pluginName = 'firebase';
            const payload = (await ModulesBundle.getModule(pluginName)) as any;

            if (!payload?.instance) {
              return;
            }

            await payload?.instance().setUserId(userId);
            const instanceId = await payload?.instance().getAppInstanceId();
            if (instanceId) {
              await InAppPurchases.addAttribution({}, 'Firebase', userId);
            }

            writeLog['module-connected'](this.name, pluginName);
          })();
        } catch (err) {
          error(err as Error);
        }
      })();
    }, [error, initialize, isReady]);

    return children;
  };

  get plugin() {
    const config = {
      import: '@kirz/expo-toolkit/apphud',
      dependencies: ['@kirz/expo-apphud@^0.1.1'],
      variables: {
        APPHUD_API_KEY: { required: true, type: 'string' },
      },
    } as const;

    return config;
  }
}
