import { Tree } from '@angular-devkit/schematics';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { getFileContent } from '@schematics/angular/utility/test';
import { camelize } from '../../utils/string.utils';
import { createApp, createEmptyWorkspace, runSchematic } from '../../utils/testing.utils';
import { NgrxSchema } from './ngrx-schema.interface';

describe('ngrx', () => {
  let appTree: UnitTestTree;

  beforeEach(() => {
    appTree = new UnitTestTree(Tree.empty());
    appTree = createEmptyWorkspace(appTree);
    appTree = createApp(appTree, 'myapp');
  });

  it('should add empty root', async () => {
    const tree = await runSchematic(
      'ngrx',
      {
        name: 'state',
        module: 'apps/myapp/src/app/app.module.ts',
        onlyEmptyRoot: true
      } as NgrxSchema,
      appTree
    );
    const appModule = getFileContent(tree, '/apps/myapp/src/app/app.module.ts');

    expect(tree.exists('apps/myapp/src/app/+state/state.actions.ts')).toBeFalsy();

    expect(appModule).toContain('StoreModule.forRoot(');
    expect(appModule).toContain('{ metaReducers : !environment.production ? [storeFreeze] : [] }');
    expect(appModule).toContain('EffectsModule.forRoot');
  });

  it('adds ngrx files with creators syntax', async () => {
    const ngrxOpts: NgrxSchema = {
      name: 'Test',
      module: 'apps/myapp/src/app/app.module.ts',
      onlyAddFiles: true,
      creators: true
    };

    const tree = await runSchematic('ngrx', ngrxOpts, appTree);

    const actionsContent = getFileContent(
      tree,
      `/apps/myapp/src/app/+state/${camelize(ngrxOpts.name)}.actions.ts`
    );
    const reducerContent = getFileContent(
      tree,
      `/apps/myapp/src/app/+state/${camelize(ngrxOpts.name)}.reducer.ts`
    );
    const effectsContent = getFileContent(
      tree,
      `/apps/myapp/src/app/+state/${camelize(ngrxOpts.name)}.effects.ts`
    );
    const selectorsContent = getFileContent(
      tree,
      `/apps/myapp/src/app/+state/${camelize(ngrxOpts.name)}.selectors.ts`
    );

    expect(actionsContent).toContain("import { createAction, props } from '@ngrx/store';");
    expect(actionsContent).toContain('export enum Types {}');

    expect(effectsContent).toContain(`import { Injectable } from '@angular/core';`);
    expect(effectsContent).toContain(
      `import * as from${ngrxOpts.name}Actions from './test.actions';`
    );
    expect(effectsContent).toContain(`import { TestPartialState } from './test.reducer';`);
    expect(effectsContent).toContain(
      `import { Actions, createEffect, ofType } from '@ngrx/effects';`
    );
    expect(effectsContent).toContain(`constructor(private actions$: Actions)`);

    expect(reducerContent).toContain(
      `import * as from${ngrxOpts.name}Actions from './test.actions';`
    );
    expect(reducerContent).toContain(
      `import { on, createReducer, ActionReducer } from '@ngrx/store';`
    );
    expect(reducerContent).toContain(
      `export const ${ngrxOpts.name.toUpperCase()}_FEATURE_KEY = 'test';`
    );
    expect(reducerContent).toContain(`export interface ${ngrxOpts.name}State`);
    expect(reducerContent).toContain(
      `export interface ${ngrxOpts.name}PartialState {\n` +
        `    readonly [${ngrxOpts.name.toUpperCase()}_FEATURE_KEY]: ${ngrxOpts.name}State;\n` +
        `}`
    );
    expect(reducerContent).toContain(`export const initialState: ${ngrxOpts.name}State = {};`);
    expect(reducerContent).toContain(
      `export const ${camelize(ngrxOpts.name)}Reducer = createReducer(initialState);`
    );

    expect(selectorsContent).toContain(
      `import { createFeatureSelector, createSelector } from '@ngrx/store';`
    );
    expect(selectorsContent).toContain(
      `import { ${ngrxOpts.name.toUpperCase()}_FEATURE_KEY, ${
        ngrxOpts.name
      }State } from './${camelize(ngrxOpts.name)}.reducer';`
    );
    expect(selectorsContent).toContain(
      `const get${ngrxOpts.name}State = createFeatureSelector<${
        ngrxOpts.name
      }State>(${ngrxOpts.name.toUpperCase()}_FEATURE_KEY);`
    );
    expect(selectorsContent).toContain(`export const ${camelize(ngrxOpts.name)}Query = {};`);
  });
});
