import { atom, getDefaultStore } from 'jotai';

const store = getDefaultStore();
const modulesAtom = atom<Record<string, unknown | true>>({});

const getModuleAtom = (name: string) => {
  return atom((get) => get(modulesAtom)[name]);
};

const getModule = async (name: string) => {
  const moduleAtom = getModuleAtom(name);

  if (store.get(moduleAtom)) {
    return store.get(moduleAtom);
  } else {
    return await new Promise((resolve) => {
      store.sub(moduleAtom, () => {
        if (store.get(moduleAtom)) {
          resolve(store.get(moduleAtom));
        }
      });
    });
  }
};

export const ModulesBundle = {
  modulesAtom,
  getModuleAtom,
  getModule,
};
