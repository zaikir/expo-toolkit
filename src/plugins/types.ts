export interface RemoteConfig {}

export interface IRemoteConfigPlugin {
  readonly remoteValues: RemoteConfig;
}

export interface IAnalyticsProvider {
  logEvent: (event: string, parameters?: Record<string, any>) => Promise<void>;
}
