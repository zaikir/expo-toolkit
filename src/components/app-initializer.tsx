import chalk from 'chalk';
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

import { Module, ModuleQueue, ModuleQueueItem } from '../types';
import { ErrorBoundaryFallback } from './error-boundary-fallback';
import { ControlledPromise } from '../utils/promise';

const store = getDefaultStore();
const chalkCtx = new chalk.Instance({ level: 1 });

type Props = PropsWithChildren<{
  modules: ModuleQueue;
}>;

ExpoSplashScreen.preventAutoHideAsync();

export const pluginsAtom = atom<Record<string, unknown | true>>({});

export function AppInitializer({ modules, children }: Props) {
  const flattenPluginQueue = useCallback((queue: ModuleQueue): Module[] => {
    const result: Module[] = [];

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
  }, []);

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
        const color = !async ? ('yellow' as const) : ('blue' as const);

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

          store.set(pluginsAtom, (prev) => ({
            ...prev,
            [item.name]: payload ?? true,
          }));

          console.info(
            [
              chalkCtx.green(`Module initialized:`),
              chalkCtx[color](item.name),
              chalkCtx.green(
                `(${(new Date().valueOf() - initializationStartTime).toFixed(
                  0,
                )}ms, ${async ? 'async' : 'sync'})`,
              ),
            ].join(' '),
          );
        } catch (err) {
          console.error(
            [
              chalkCtx.red('Module initialization error:'),
              chalkCtx[color](item.name),
              chalkCtx.red(
                `(${(new Date().valueOf() - initializationStartTime).toFixed(
                  0,
                )}ms, ${item.optional ? 'optional, ' : ''}${
                  err instanceof Error ? err.message : 'unknown error'
                })`,
              ),
            ].join(' '),
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
                initialize={(payload) => {
                  pluginPromises[name].resolve(payload);
                }}
                error={(err) => {
                  pluginPromises[name].reject(err);
                }}
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
