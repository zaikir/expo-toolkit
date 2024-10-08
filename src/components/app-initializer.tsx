import * as ExpoSplashScreen from 'expo-splash-screen';
import { Atom, atom, getDefaultStore, useAtomValue } from 'jotai';
import React, {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { Alert } from 'react-native';

import { ControlledPromise } from 'utils/promise';

import { Plugin, PluginQueue, PluginQueueItem } from '../types';

const store = getDefaultStore();

type Props = PropsWithChildren<{
  plugins: PluginQueue;
}>;

ExpoSplashScreen.preventAutoHideAsync();

export function AppInitializer({ plugins, children }: Props) {
  const flattenPluginQueue = useCallback((queue: PluginQueue): Plugin[] => {
    const result: Plugin[] = [];

    const processItem = (item: PluginQueueItem) => {
      if (Array.isArray(item)) {
        item.forEach(processItem);
      } else if ('type' in item) {
        item.queue.forEach(processItem);
      } else {
        result.push(item);
      }
    };

    processItem(queue);

    return result;
  }, []);

  const pluginsAtom = useMemo(
    () => atom<Record<string, unknown | true>>({}),
    [],
  );
  const isInitializedAtom = useMemo(() => atom(false), []);
  const flattenPlugins = useMemo(() => flattenPluginQueue(plugins), [plugins]);
  const readyStateAtoms = useMemo(
    () => Object.fromEntries(flattenPlugins.map((p) => [p.name, atom(false)])),
    [flattenPlugins],
  );
  const pluginPromises = useMemo(
    () =>
      Object.fromEntries(
        flattenPlugins.map((p) => [p.name, new ControlledPromise<unknown>()]),
      ),
    [flattenPlugins],
  );

  const initializeQueue = useCallback(async (queue: PluginQueue) => {
    const type = 'type' in queue ? queue.type : 'parallel';
    const items = 'type' in queue ? queue.queue : queue;
    const async = 'type' in queue ? queue.async : false;

    const getInitializator = async (item: PluginQueueItem) => {
      if ('name' in item) {
        try {
          store.set(readyStateAtoms[item.name], true);

          const payload = await Promise.race([
            pluginPromises[item.name].promise,
            ...(item.timeout !== null
              ? [
                  new Promise<never>((_, reject) =>
                    setTimeout(
                      () => reject(new Error('Initialization timed out')),
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
          console.log(`${item.name} initialized`);
        } catch (err) {
          if (item.optional) {
            console.warn(`${item.name} skipped`);
            return;
          }

          console.error(`${item.name} error: ${err}`);
          throw err;
        }
        return;
      }

      return initializeQueue(item);
    };

    const func = async () => {
      if (type === 'parallel') {
        await Promise.all(items.map(getInitializator));
      } else {
        for (const plugin of items) {
          await getInitializator(plugin);
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
        await initializeQueue(plugins);
        store.set(isInitializedAtom, true);
      } catch (err) {
        Alert.alert('Error', (err as Error).message);
      }
    })();
  }, [plugins]);

  return flattenPlugins.reverse().reduce(
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
