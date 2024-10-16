import { Atom } from 'jotai';

export type PeriodUnit = 'day' | 'week' | 'month' | 'quarter' | 'year';

export type IapState = {
  products?: IAPProduct[];
  subscriptions?: IAPSubscription[];
  hasPremium?: boolean;
  activeSubscription?: IAPSubscription | null;
  receipt?: string | null;
};

export type IapPayload = {
  iap: {
    state: Atom<IapState>;
    refetchProducts: () => Promise<void>;
    restorePurchases: () => Promise<boolean>;
    purchaseProduct: (id: string) => Promise<IAPPurchase | null>;
  };
};

export type IAPProduct = {
  id: string;
  title: string;
  price: number;
  currency: string;
  consumable: boolean;
};

export type IAPSubscription = Omit<IAPProduct, 'consumable'> & {
  periodUnit: PeriodUnit;
  numberOfPeriods: number;
  trial:
    | {
        periodUnit: PeriodUnit;
        numberOfPeriods: number;
      }
    | false;
};

export type IAPPurchase = {
  productId: string;
  transactionId: string;
};
