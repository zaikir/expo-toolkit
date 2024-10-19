import { FormatNumberOptions, IntlShape } from '@formatjs/intl';

export type IdfaPayload = {
  getIdfa: () => string | null;
};

export type TrackerPayload = {
  tracker: {
    logEvent: (
      event: string,
      properties?: Record<string, any>,
    ) => Promise<void>;
  };
  instance?: any;
};

export type IdfvPayload = {
  idfv: string | null;
};

export type LocalizationPayload = {
  localization: {
    intl: IntlShape<string>;
    locale: {
      /**
       * An [IETF BCP 47 language tag](https://en.wikipedia.org/wiki/IETF_language_tag) with a region code.
       * @example
       * `'en-US'`, `'es-419'`, `'pl-PL'`.
       */
      languageTag: string;
      /**
       * An [IETF BCP 47 language tag](https://en.wikipedia.org/wiki/IETF_language_tag) without the region code.
       * @example
       * `'en'`, `'es'`, `'pl'`.
       */
      languageCode: string | null;
      /**
       * The region code for your device that comes from the Region setting under Language & Region on iOS, Region settings on Android and is parsed from locale on Web (can be `null` on Web).
       */
      regionCode: string | null;
      /**
       * Currency code for the locale.
       * Is `null` on Web, use a table lookup based on region instead.
       * @example
       * `'USD'`, `'EUR'`, `'PLN'`.
       */
      currencyCode: string | null;
      /**
       * Currency symbol for the locale.
       * Is `null` on Web, use a table lookup based on region (if available) instead.
       * @example
       * `'$'`, `'€'`, `'zł'`.
       */
      currencySymbol: string | null;
      /**
       * Decimal separator used for formatting numbers with fractional parts.
       * @example
       * `'.'`, `','`.
       */
      decimalSeparator: string | null;
      /**
       * Digit grouping separator used for formatting large numbers.
       * @example
       * `'.'`, `','`.
       */
      digitGroupingSeparator: string | null;
      /**
       * Text direction for the locale. One of: `'ltr'`, `'rtl'`, but can also be `null` on some browsers without support for the [textInfo](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/textInfo) property in [Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl) API.
       */
      textDirection: 'ltr' | 'rtl' | null;
      /**
       * The measurement system used in the locale.
       * Is `null` on Web, as user chosen measurement system is not exposed on the web and using locale to determine measurement systems is unreliable.
       * Ask for user preferences if possible.
       */
      measurementSystem: `metric` | `us` | `uk` | null;
      /**
       * The temperature unit used in the locale.
       * Returns `null` if the region code is unknown.
       */
      temperatureUnit: 'celsius' | 'fahrenheit' | null;
    };
    formatNumber: (price: number, options?: FormatNumberOptions) => string;
    formatPrice: (
      price: number,
      currency?: string,
      options?: FormatNumberOptions,
    ) => string;
  };
};
