export type IdfaPayload = {
  getIdfa: () => string | null;
};

export type TrackerPayload = {
  type: 'tracker';
  logEvent: (event: string, properties?: Record<string, any>) => Promise<void>;
};
