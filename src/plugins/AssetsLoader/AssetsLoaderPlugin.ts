import { Asset } from 'expo-asset';
import { loadAsync } from 'expo-font';

import { Plugin, PluginFeature } from 'plugins/Plugin';

export class AssetsLoaderPlugin extends Plugin {
  readonly name = 'AssetsLoaderPlugin';
  readonly features: PluginFeature[] = ['Assets'];
  readonly initializationTimeout = 5000;

  constructor(
    readonly options: {
      fonts?: Parameters<typeof loadAsync>[0];
      assets?: Parameters<typeof Asset.loadAsync>[0];
    },
  ) {
    super();
  }

  async initialize() {
    await Promise.all([
      this.options.fonts && loadAsync(this.options.fonts),
      this.options.assets && Asset.loadAsync(this.options.assets),
    ]);
  }
}
