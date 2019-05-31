import { normalize } from '@angular-devkit/core';
import { Tree } from '@angular-devkit/schematics';
import { guessType } from './ts.utils';

export interface StateProperty {
  key: string;
  type: string;
  value: string;
}

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

export interface TypedProperty {
  name: string;
  type: string;
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

export function parsePropsToUpdate(propsToUpdate: string): StateProperty[] {
  return propsToUpdate
    .split(',')
    .map(prop => prop.split(/(?<!\\):/g))
    .map(prop => {
      return {
        key: prop[0],
        value: prop[1].replace('\\:', ':'),
        type: prop[2] || guessType(prop[1])
      };
    });
}

export function parseTypedProperties(str: string): TypedProperty[] {
  const props = str ? str.split(',') : [];
  return props.map(prop => {
    const p = prop.split(':');
    return {
      name: p[0],
      type: p[1] || 'any'
    };
  });
}

export function typedPropertiesToString(
  typedProperties: TypedProperty[],
  separator = ', '
): string {
  return typedProperties.map(tp => `${tp.name}: ${tp.type}`).join(separator);
}
