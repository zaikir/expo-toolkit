// Типы для системы удаленного выполнения кода

export type GlobalContext = Record<string, any>;

// Новая структура ответа сервера
export interface RemoteCodeBundle {
  placements: Record<string, string>; // конкретные блоки кода
  functions?: Record<string, string>; // общие функции
}

// Доступные placements
export type PlacementName = 'validatePurchase';

export interface PnlightUIConfig {
  config: string | null;
  parameters: Record<string, any> | null;
  debug?: boolean | null;
}

export type PnlightPayload = {
  pnlight: {
    validatePurchase: () => Promise<boolean>;
    getUIConfig: (
      placement: string,
      attributionRequired?: boolean,
    ) => Promise<PnlightUIConfig | null>;
    getUserId: () => Promise<string>;
    resetUserId: () => Promise<void>;
  };
};
