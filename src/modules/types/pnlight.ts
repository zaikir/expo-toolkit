// Типы для системы удаленного выполнения кода

export type GlobalContext = Record<string, any>;

// Новая структура ответа сервера
export interface RemoteCodeBundle {
  placements: Record<string, string>; // конкретные блоки кода
  functions?: Record<string, string>; // общие функции
}

// Доступные placements
export type PlacementName = 'onValidatePurchase';

export type PnlightPayload = {
  pnlight: {
    onValidatePurchase: () => Promise<boolean>;
  };
};
