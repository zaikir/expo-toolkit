import { type MMKV } from 'react-native-mmkv';

export const appEnvStore = {
  env: {} as Record<string, any>,
  storage: {} as Pick<
    MMKV,
    'set' | 'getString' | 'delete' | 'getBoolean' | 'getBuffer' | 'getNumber'
  >,
};
