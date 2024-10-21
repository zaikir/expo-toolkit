import * as ExpoSplashScreen from 'expo-splash-screen';
import { Atom, atom, getDefaultStore, useAtomValue } from 'jotai';
import React, {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { Alert } from 'react-native';
import ErrorBoundary from 'react-native-error-boundary';

import { ToolkitModule, ModuleQueue, ModuleQueueItem } from '../types';
import { ErrorBoundaryFallback } from './error-boundary-fallback';
import { ModulesBundle } from '../modules-bundle';
import { writeLog } from '../utils/log';
import { ControlledPromise } from '../utils/promise';

const store = getDefaultStore();

type Props = PropsWithChildren<{
  modules: ModuleQueue;
}>;

ExpoSplashScreen.preventAutoHideAsync();

export function AppInitializer({ modules, children }: Props) {
  const flattenPluginQueue = useCallback(
    (queue: ModuleQueue): ToolkitModule[] => {
      const result: ToolkitModule[] = [];

      const processItem = (item: ModuleQueueItem) => {
        if (Array.isArray(item)) {
          item.forEach(processItem);
        } else if ('queue' in item) {
          item.queue.forEach(processItem);
        } else {
          result.push(item);
        }
      };

      processItem(queue);

      return result;
    },
    [],
  );

  const isInitializedAtom = useMemo(() => atom(false), []);
  const flattenModules = useMemo(() => flattenPluginQueue(modules), [modules]);
  const readyStateAtoms = useMemo(
    () => Object.fromEntries(flattenModules.map((p) => [p.name, atom(false)])),
    [flattenModules],
  );
  const pluginPromises = useMemo(
    () =>
      Object.fromEntries(
        flattenModules.map((p) => [p.name, new ControlledPromise<unknown>()]),
      ),
    [flattenModules],
  );

  const initializeQueue = useCallback(async (queue: ModuleQueue) => {
    const type = 'queue' in queue && queue.parallel ? 'parallel' : 'sequential';
    const items = 'queue' in queue ? queue.queue : queue;
    const async = 'queue' in queue ? queue.async : false;

    const getInitializer = async (item: ModuleQueueItem) => {
      if ('name' in item) {
        const timeoutErrorMessage = 'Initialization timed out';
        const initializationStartTime = new Date().valueOf();

        try {
          store.set(readyStateAtoms[item.name], true);

          const payload = await Promise.race([
            pluginPromises[item.name].promise,
            ...(item.timeout !== null
              ? [
                  new Promise<never>((_, reject) =>
                    setTimeout(
                      () => reject(new Error(timeoutErrorMessage)),
                      item.timeout!,
                    ),
                  ),
                ]
              : []),
          ]);

          store.set(ModulesBundle.modulesAtom, (prev) => ({
            ...prev,
            [item.name]: payload ?? true,
          }));

          writeLog['module-initialized'](
            item,
            async ?? false,
            new Date().valueOf() - initializationStartTime,
          );
        } catch (err) {
          writeLog['module-initialized-failed'](
            item,
            async ?? false,
            new Date().valueOf() - initializationStartTime,
            err as Error,
          );

          if (item.optional) {
            return;
          }

          throw err;
        }
        return;
      }

      return initializeQueue(item);
    };

    const func = async () => {
      if (type === 'parallel') {
        await Promise.all(items.map(getInitializer));
      } else {
        for (const plugin of items) {
          await getInitializer(plugin);
        }
      }
    };

    if (async) {
      func();
    } else {
      await func();
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await initializeQueue(modules);
        store.set(isInitializedAtom, true);
      } catch (err) {
        Alert.alert('Error', (err as Error).message);
      }
    })();
  }, [modules]);

  return (
    <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
      {useMemo(
        () =>
          flattenModules.reduce(
            (acc, { Component, name }) => (
              <Component
                key={name}
                isReadyAtom={readyStateAtoms[name]}
                initialize={async (payload) => {
                  pluginPromises[name].resolve(payload);
                  await ModulesBundle.getModule(name);
                }}
                error={(err) => {
                  pluginPromises[name].reject(err);
                }}
                bundle={ModulesBundle}
              >
                {acc}
              </Component>
            ),
            <ContentWrapper isInitializedAtom={isInitializedAtom}>
              {children}
            </ContentWrapper>,
          ),
        [],
      )}
    </ErrorBoundary>
  );
}

function ContentWrapper({
  children,
  isInitializedAtom,
}: PropsWithChildren<{ isInitializedAtom: Atom<boolean> }>) {
  const isInitialized = useAtomValue(isInitializedAtom);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    ExpoSplashScreen.hideAsync();
  }, [isInitialized]);

  if (!isInitialized) {
    return null;
  }

  return children;
}
