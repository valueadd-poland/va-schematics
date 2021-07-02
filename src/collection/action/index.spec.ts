import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ClassSchema } from '@schematics/angular/class/schema';
import * as path from 'path';
import { splitPascalCase } from '../../utils/name.utils';
import { camelize, classify } from '../../utils/string.utils';
import { createApp, createEmptyWorkspace, createLib } from '../../utils/testing.utils';
import { NgrxSchema } from '../ngrx/ngrx-schema.interface';
import { ActionSchema } from './action-schema.interface';

const collectionPath = path.join(__dirname, '../../collection.json');

describe('action', () => {
  const runner = new SchematicTestRunner('va-schematics', collectionPath);

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

  let appTree: UnitTestTree;

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

    done();
  });

  it('create actions with old syntax', async done => {
    const stateDirPath = '/libs/testlib/src/lib/+state';
    const getTestsOpts: ActionSchema = {
      name: 'GetTests',
      stateDir: stateDirPath,
      prefix: 'Test',
      creators: false
    };
    const getTestOpts: ActionSchema = {
      name: 'GetTest',
      stateDir: stateDirPath,
      prefix: 'Test',
      payload: 'string',
      creators: false
    };
    const updateTestOpts: ActionSchema = {
      name: 'UpdateTest',
      stateDir: stateDirPath,
      prefix: 'Test',
      payload: 'TestModel',
      creators: false
    };
    const removeTestOpts: ActionSchema = {
      name: 'RemoveTest',
      stateDir: stateDirPath,
      prefix: 'Test',
      payload: 'TestModel',
      creators: false
    };

    await runner.runSchematicAsync('action', getTestsOpts, appTree).toPromise();
    await runner.runSchematicAsync('action', getTestOpts, appTree).toPromise();
    await runner.runSchematicAsync('action', updateTestOpts, appTree).toPromise();
    await runner.runSchematicAsync('action', removeTestOpts, appTree).toPromise();
    const content = appTree.readContent('/libs/testlib/src/lib/+state/test.actions.ts');

    expect(content).toContain(`GetTests = '[Test] Get Tests'`);
    expect(content).toContain(`export class GetTests implements Action`);
    expect(content).toContain(`readonly type = Types.GetTests;`);

    expect(content).toContain(`import { TestModel } from '../resources/models/test-model'`);
    expect(content).toContain(`UpdateTest = '[Test] Update Test'`);
    expect(content).toContain(`export class UpdateTest implements Action`);
    expect(content).toContain(`readonly type = Types.UpdateTest;`);
    expect(content).toContain(`constructor(public payload: TestModel) {}`);

    expect(content).toContain(
      `export type CollectiveType = GetTests | GetTest | UpdateTest | RemoveTest`
    );

    // @console.log(appTree.readContent('/libs/testlib/src/lib/+state/test.actions.ts'));
    done();
  });

  it('create actions with action creator', async done => {
    const stateDirPath = '/libs/testlib/src/lib/+state';
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

    await runner.runSchematicAsync('action', getTestsOpts, appTree).toPromise();
    await runner.runSchematicAsync('action', getTestOpts, appTree).toPromise();
    await runner.runSchematicAsync('action', updateTestOpts, appTree).toPromise();
    await runner.runSchematicAsync('action', removeTestOpts, appTree).toPromise();
    const content = appTree.readContent('/libs/testlib/src/lib/+state/test.actions.ts');

    expect(content).toMatch(
      new RegExp(`export const ${camelize(getTestOpts.name)} = createAction`)
    );
    expect(content).toContain(
      `${classify(getTestOpts.name)} = '[${classify(getTestOpts.prefix)}] ${splitPascalCase(
        getTestOpts.name
      )}'`
    );

    expect(content).toMatch(
      new RegExp(`export const ${camelize(updateTestOpts.name)} = createAction`)
    );
    expect(content).toContain(
      `${classify(updateTestOpts.name)} = '[${classify(updateTestOpts.prefix)}] ${splitPascalCase(
        updateTestOpts.name
      )}'`
    );
    expect(content).toMatch(
      new RegExp(`export const ${camelize(removeTestOpts.name)} = createAction`)
    );
    expect(content).toContain(
      `${classify(removeTestOpts.name)} = '[${classify(removeTestOpts.prefix)}] ${splitPascalCase(
        removeTestOpts.name
      )}'`
    );

    done();
  });
});
