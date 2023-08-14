export interface RemoteConfig {}

export type Product = {
  productId: string;
  title: string;
  description: string;
  price: number;
  localizedPrice: string;
  currency: string;
  consumable: boolean;
  originalData: any;
};

export type Subscription = Omit<Product, 'consumable'> & {
  periodUnit: 'day' | 'week' | 'month' | 'year';
  numberOfPeriods: number;
  trial?: {
    periodUnit: 'day' | 'week' | 'month' | 'year';
    numberOfPeriods: number;
  };
};

export type PurchasedSubscriptionInfo = {
  productId: string;
  cancelledAt?: string;
  startedAt: string;
  expiresAt: string;
  isActive: boolean;
  isAutoRenewEnabled: boolean;
  isSandbox: boolean;
};

export type PurchasedProductInfo = {
  productId: string;
  purchasedAt: string;
  canceledAt?: string;
};

export type Purchase = {
  productId: string;
  transactionDate: string;
  transactionReceipt: string;
  originalData: any;
};

export interface NetworkPluginData {
  isInternetReachable: () => Promise<boolean>;
}

export interface IRemoteConfigPlugin {
  readonly remoteValues: RemoteConfig;
}

export interface IAnalyticsProvider {
  logEvent: (event: string, parameters?: Record<string, any>) => Promise<void>;
}

export interface IReceiptValidator {
  /**
   * Checks whether the given subscription is eligible for purchasing introductory offer (free trial, pay as you go or pay up front modes)
   */
  isTrialAvailable(subscriptionId: string): Promise<boolean>;

  /**
   * Returns true if user has active subscription or non renewing purchase (lifetime)
   */
  hasPremiumAccess(): Promise<boolean>;

  /**
   * Returns true if user has active subscription
   */
  hasActiveSubscription(): Promise<boolean>;

  /**
   * Returns an array of all subscriptions that this user has ever purchased
   */
  getPurchasedSubscriptions(): Promise<PurchasedSubscriptionInfo[]>;

  /**
   * Returns an active subscription
   */
  getActiveSubscription(): Promise<PurchasedSubscriptionInfo | null>;

  /**
   * Returns an array of all in-app purchases
   */
  getPurchasedProducts(): Promise<PurchasedProductInfo[]>;

  /**
   * Returns an array of all in-app purchases
   */
  isProductPurchased(productId: string): Promise<boolean>;

  /**
   * Restores users purchases
   */
  restorePurchases(): Promise<void>;

  /**
   * Handles purchase
   */
  handlePurchase(): Promise<void>;
}

export interface IAppPurchasePlugin {
  readonly products: Product[];
  readonly subscriptions: Subscription[];
  readonly receiptValidator: IReceiptValidator;

  purchaseProduct(productId: string): Promise<Purchase>;
  refetchProducts(): Promise<void>;
}
