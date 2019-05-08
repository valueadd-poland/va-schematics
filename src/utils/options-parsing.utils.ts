import { normalize } from '@angular-devkit/core';
import { Tree } from '@angular-devkit/schematics';

export interface StateFilePaths {
  actions: string;
  effects: string;
  effectsSpec: string;
  facade: string;
  facadeSpec: string;
  reducer: string;
  reducerSpec: string;
  selectors: string;
  selectorsSpec: string;
}

export function parseStateDir(path: string, host: Tree): StateFilePaths {
  const statePath = normalize(path);
  const stateDir = host.getDir(statePath);
  const findFileByEnding = (name: string): string => {
    return stateDir.subfiles.find(file => file.endsWith(name)) as string;
  };

  return {
    actions: normalize(statePath + '/' + findFileByEnding('.actions.ts')),
    effects: normalize(statePath + '/' + findFileByEnding('.effects.ts')),
    effectsSpec: normalize(statePath + '/' + findFileByEnding('.effects.spec.ts')),
    facade: normalize(statePath + '/' + findFileByEnding('.facade.ts')),
    facadeSpec: normalize(statePath + '/' + findFileByEnding('.facade.spec.ts')),
    reducer: normalize(statePath + '/' + findFileByEnding('.reducer.ts')),
    reducerSpec: normalize(statePath + '/' + findFileByEnding('.reducer.spec.ts')),
    selectors: normalize(statePath + '/' + findFileByEnding('.selectors.ts')),
    selectorsSpec: normalize(statePath + '/' + findFileByEnding('.selectors.spec.ts'))
  };
}
