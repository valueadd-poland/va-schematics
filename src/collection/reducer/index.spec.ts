import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ClassSchema } from '@schematics/angular/class/schema';
import * as path from 'path';
import { camelize, capitalize } from '../../utils/string.utils';
import { createApp, createEmptyWorkspace, createLib } from '../../utils/testing.utils';
import { ActionSchema } from '../action/action-schema.interface';
import { NgrxSchema } from '../ngrx/ngrx-schema.interface';
import { ReducerSchema } from './reducer-schema.interface';

const collectionPath = path.join(__dirname, '../../collection.json');

describe('reducer', () => {
  const runner = new SchematicTestRunner('va-schematics', collectionPath);
  const stateDirPath = '/libs/testlib/src/lib/+state';

  const ngrxOpts: NgrxSchema = {
    name: 'test',
    module: '/libs/testlib/src/lib/testlib.module.ts',
    facade: true,
    creators: false
  };

  const classOpts: ClassSchema = {
    name: 'TestModel',
    project: 'testlib',
    path: 'libs/testlib/src/lib/resources/models'
  };

  const getTestsOpts: ActionSchema = {
    name: 'GetTests',
    stateDir: stateDirPath,
    prefix: 'Test'
  };

  const getTestOpts: ActionSchema = {
    name: 'GetTest',
    stateDir: stateDirPath,
    prefix: 'Test',
    payload: 'string'
  };

  const updateTestOpts: ActionSchema = {
    name: 'UpdateTest',
    stateDir: stateDirPath,
    prefix: 'Test',
    payload: 'TestModel'
  };

  const removeTestOpts: ActionSchema = {
    name: 'RemoveTest',
    stateDir: stateDirPath,
    prefix: 'Test',
    payload: 'TestModel'
  };

  let appTree: UnitTestTree;

  describe('old syntax', () => {
    beforeEach(async done => {
      appTree = new UnitTestTree(Tree.empty());
      appTree = createEmptyWorkspace(appTree);
      appTree = createApp(appTree, 'testapp');
      appTree = createLib(appTree, 'testlib');
      appTree = await runner
        .runExternalSchematicAsync('va-schematics', 'ngrx', ngrxOpts, appTree)
        .toPromise();
      appTree = await runner
        .runExternalSchematicAsync('@schematics/angular', 'class', classOpts, appTree)
        .toPromise();
      appTree = await runner.runSchematicAsync('action', getTestsOpts, appTree).toPromise();
      appTree = await runner.runSchematicAsync('action', getTestOpts, appTree).toPromise();
      appTree = await runner.runSchematicAsync('action', updateTestOpts, appTree).toPromise();
      appTree = await runner.runSchematicAsync('action', removeTestOpts, appTree).toPromise();

      done();
    });

    it('create reducer and selectors', async done => {
      const reducerOpts: ReducerSchema = {
        propsToUpdate:
          'loadingTest:false,test:action.payload:Test,loadingTestApiError:null:ApiError|null',
        actionName: 'GetTest',
        stateDir: stateDirPath,
        selectors: true,
        creators: false
      };
      appTree = await runner.runSchematicAsync('reducer', reducerOpts, appTree).toPromise();

      /*@const content = appTree.readContent('/libs/testlib/src/lib/+state/test.reducer.ts');
      const content2 = appTree.readContent('/libs/testlib/src/lib/+state/test.selectors.spec.ts');
      console.log(content2);*/
      done();
    });
  });

  describe('creators syntax', () => {
    beforeEach(async done => {
      appTree = new UnitTestTree(Tree.empty());
      appTree = createEmptyWorkspace(appTree);
      appTree = createApp(appTree, 'testapp');
      appTree = createLib(appTree, 'testlib');
      appTree = await runner
        .runExternalSchematicAsync(
          'va-schematics',
          'ngrx',
          { ...ngrxOpts, creators: true },
          appTree
        )
        .toPromise();
      appTree = await runner
        .runExternalSchematicAsync('@schematics/angular', 'class', classOpts, appTree)
        .toPromise();
      appTree = await runner
        .runSchematicAsync('action', { ...getTestsOpts, creators: true }, appTree)
        .toPromise();
      appTree = await runner
        .runSchematicAsync('action', { ...getTestOpts, creators: true }, appTree)
        .toPromise();
      appTree = await runner
        .runSchematicAsync('action', { ...updateTestOpts, creators: true }, appTree)
        .toPromise();
      appTree = await runner
        .runSchematicAsync('action', { ...removeTestOpts, creators: true }, appTree)
        .toPromise();

      done();
    });

    it('create reducer and selectors with creator function', async done => {
      const reducerCreatorOpts: ReducerSchema = {
        propsToUpdate:
          'loadingTest:false,test:action.payload:Test,loadingTestApiError:null:ApiError|null',
        actionName: 'GetTest',
        stateDir: stateDirPath,
        selectors: true,
        creators: true
      };
      appTree = await runner.runSchematicAsync('reducer', reducerCreatorOpts, appTree).toPromise();

      const reducerContent = appTree.readContent('/libs/testlib/src/lib/+state/test.reducer.ts');
      const selectorsContent = appTree.readContent(
        '/libs/testlib/src/lib/+state/test.selectors.ts'
      );

      expect(reducerContent).toContain(
        `export interface ${capitalize(ngrxOpts.name)}State {\n` +
          `  loadingTest: boolean;\n` +
          `  test: Test;\n` +
          `  loadingTestApiError: ApiError | null;\n` +
          `}`
      );

      expect(reducerContent).toContain(
        `export const initialState: ${capitalize(ngrxOpts.name)}State = {\n` +
          `  loadingTest: false,\n` +
          `  test: null,\n` +
          `  loadingTestApiError: null\n` +
          `};`
      );

      expect(reducerContent).toContain(
        `export const ${ngrxOpts.name}Reducer = createReducer(\n` +
          `  initialState,\n` +
          `  on(\n` +
          `    from${capitalize(ngrxOpts.name)}Actions.${camelize(
            reducerCreatorOpts.actionName
          )},\n` +
          `    (state, action): ${capitalize(ngrxOpts.name)}State => ({\n` +
          `      ...state,\n` +
          `      loadingTest: false,\n` +
          `      test: action.payload,\n` +
          `      loadingTestApiError: null\n` +
          `    })\n` +
          `  )\n` +
          `);`
      );

      expect(selectorsContent).toContain(
        `const getLoadingTest = createSelector(get${capitalize(
          ngrxOpts.name
        )}State, state => state.loadingTest);`
      );

      expect(selectorsContent).toContain(
        `const getTest = createSelector(get${capitalize(ngrxOpts.name)}State, state => state.test);`
      );

      expect(selectorsContent).toContain(
        `const getLoadingTestApiError = createSelector(get${capitalize(
          ngrxOpts.name
        )}State, state => state.loadingTestApiError);`
      );

      expect(selectorsContent).toContain(
        `export const testQuery = {\n` +
          `  getLoadingTest,\n` +
          `  getTest,\n` +
          `  getLoadingTestApiError\n` +
          `};`
      );

      done();
    });
  });
});
