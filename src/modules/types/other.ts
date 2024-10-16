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
};

export type IdfvPayload = {
  idfv: string | null;
};
