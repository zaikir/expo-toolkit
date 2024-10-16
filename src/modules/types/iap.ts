import { Atom } from 'jotai';

export type SubscriptionUnit = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type NumberOfPeriods = number;

export type IapState = {
  products?: IAPProduct[];
  subscriptions?: IAPSubscription[];
  hasPremium?: boolean;
  activeSubscription?: IAPSubscription | null;
  restorePurchases: () => Promise<boolean>;
  purchasePremium: (productId: string) => Promise<IAPPurchase | null>;
};

export type IapPayload = {
  iap: {
    state: Atom<IapState>;
  };
};

export type IAPProduct = {
  productId: string;
  title: string;
  price: number;
  localizedPrice: string;
  currency: string;
  consumable: boolean;
  originalData: any;
};

export type IAPSubscription = Omit<IAPProduct, 'consumable'> & {
  periodUnit: SubscriptionUnit;
  numberOfPeriods: number;
  trial?: {
    periodUnit: SubscriptionUnit;
    numberOfPeriods: number;
  };
};

export type IAPPurchase = {
  productId: string;
  transactionDate: string;
  transactionReceipt: string;
  originalData: any;
};
