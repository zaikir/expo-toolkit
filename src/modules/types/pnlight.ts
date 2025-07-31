// Типы для системы удаленного выполнения кода

export type GlobalContext = Record<string, any>;

// Новая структура ответа сервера
export interface RemoteCodeBundle {
  placements: Record<string, string>; // конкретные блоки кода
  functions?: Record<string, string>; // общие функции
}

// Доступные placements
export type PlacementName =
  | 'onAppFirstOpen'
  | 'onAppStart'
  | 'onLogEvent'
  | 'onAttribution'
  | 'onPurchase'
  | 'onAppActivityChange'
  | 'onNavigation'
  | 'onValidatePurchase';

export type PnlightPayload = {
  pnlight: {
    onAttribution: (data: any) => Promise<void>;
    onPurchase: (purchase: any) => Promise<void>;
    onAppActivityChange: (isFocused: boolean) => Promise<void>;
    onNavigation: (screen: string) => Promise<void>;
    onValidatePurchase: () => Promise<boolean>;
    clearRemoteCodeCache: () => void;
  };
};
