import { Atom, useAtomValue } from 'jotai';
import { useEffect } from 'react';

import { ToolkitModule, ModuleOptions } from '../types';

export class WaitModule implements ToolkitModule {
  constructor(
    public readonly trigger: Atom<any>,
    public readonly moduleOptions?: Partial<ModuleOptions>,
  ) {}

  get name() {
    return 'wait' as const;
  }

  get description() {
    return 'Wait for custom condition' as const;
  }

  get groups() {
    return ['other'] as const;
  }

  get cli() {
    return 'no' as const;
  }

  get timeout() {
    return this.moduleOptions?.timeout ?? null;
  }

  get optional() {
    return this.moduleOptions?.optional ?? true;
  }

  Component: ToolkitModule['Component'] = ({
    children,
    isReadyAtom,
    initialize,
  }) => {
    const isReady = useAtomValue(isReadyAtom);
    const triggerData = useAtomValue(this.trigger);

    useEffect(() => {
      if (!isReady || triggerData == null) {
        return;
      }

      initialize({
        waiterPayload: {
          // key: this.key,
          ...triggerData,
        },
      });
    }, [isReady, triggerData, initialize]);

    return children;
  };
}
