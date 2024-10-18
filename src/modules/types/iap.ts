import { Atom } from 'jotai';

export type PeriodUnit = 'day' | 'week' | 'month' | 'quarter' | 'year';

export type IapState = {
  /**
   * List of all available products.
   */
  products?: IAPProduct[];
  /**
   * List of all available subscriptions.
   */
  subscriptions?: IAPSubscription[];
  /**
   * Whether the user has an active subscription.
   */
  hasPremium?: boolean;
  /**
   * The currently active subscription, if any.
   */
  activeSubscription?: IAPSubscription | null;
  /**
   * The user's App Store receipt, if available.
   */
  receipt?: string | null;
};

export type IapPayload = {
  iap: {
    /**
     * Atom representing the current state of in-app purchases.
     */
    state: Atom<IapState>;

    /**
     * Fetches the list of products from the store.
     * @returns A promise that resolves when the products are successfully fetched.
     */
    refetchProducts: () => Promise<void>;

    /**
     * Restores previous purchases made by the user.
     * @returns A promise that resolves to true if purchases were successfully restored, or false otherwise.
     */
    restorePurchases: () => Promise<boolean>;

    /**
     * Initiates a purchase for a specified product.
     * @param id - The identifier of the product to purchase.
     * @returns A promise that resolves to the purchase details if successful, or null if the purchase failed.
     */
    purchaseProduct: (id: string) => Promise<IAPPurchase | null>;

    /**
     * Computes the price of a subscription relative to a given period.
     * @param subscription - The subscription to calculate the price for.
     * @param periodUnit - The unit of time to calculate the price for.
     * @param numberOfPeriods - The number of periods to calculate the price for.
     * @returns The relative price for the specified period.
     */
    computeSubscriptionRelativePrice: (
      subscription: IAPSubscription,
      periodUnit: PeriodUnit,
      numberOfPeriods: number,
    ) => number;

    /**
     * Computes the discount of a subscription compared to a main subscription.
     * @param subscription - The subscription to calculate the discount for.
     * @param mainSubscription - The main subscription to compare against.
     * @returns The discount percentage.
     */
    computeSubscriptionDiscount: (
      subscription: IAPSubscription,
      mainSubscription: IAPSubscription,
    ) => number;

    /**
     * Gets the expiration date of the trial period for a subscription.
     * @param subscription - The subscription to get the trial expiration date for.
     * @returns The expiration date of the trial period.
     * @throws If the trial period is not available.
     */
    getTrialExpirationDate: (subscription: IAPSubscription) => Date;
  };
};

export type IAPProduct = {
  /**
   * The identifier of the product.
   */
  id: string;
  /**
   * The title of the product.
   */
  title: string;
  /**
   * The price of the product.
   */
  price: number;
  /**
   * The currency of the product.
   */
  currency: string;
  /**
   * Whether the product is a consumable product.
   */
  consumable: boolean;
};

export type IAPSubscription = Omit<IAPProduct, 'consumable'> & {
  /**
   * The unit of time for the subscription period.
   */
  periodUnit: PeriodUnit;
  /**
   * The number of periods for the subscription.
   */
  numberOfPeriods: number;
  /**
   * The details of the trial period, if available.
   */
  trial:
    | {
        /**
         * The unit of time for the trial period.
         */
        periodUnit: PeriodUnit;
        /**
         * The number of periods for the trial period.
         */
        numberOfPeriods: number;
      }
    | false;
};

export type IAPPurchase = {
  /**
   * The ID of the purchased product.
   */
  productId: string;
  /**
   * The transaction ID of the purchase.
   */
  transactionId: string;
};
