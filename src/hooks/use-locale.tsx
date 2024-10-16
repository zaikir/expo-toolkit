import { atom, useAtomValue } from 'jotai';
import { useMemo } from 'react';

import { LocalizationPayload } from 'modules/types';

import { pluginsAtom } from '../components/app-initializer';

export function useLocale() {
  const localizationModule = useAtomValue(
    useMemo(
      () =>
        atom(
          (get) =>
            (Object.values(get(pluginsAtom)).find(
              (x: any) => x && typeof x === 'object' && 'localization' in x,
            ) ?? null) as LocalizationPayload | null,
        ),
      [],
    ),
  );

  if (!localizationModule) {
    throw new Error('Localization module is not initialized');
  }

  return localizationModule.localization;
}
