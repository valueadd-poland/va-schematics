import { VirtualTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ClassSchema } from '@schematics/angular/class/schema';
import { Schema as ServiceSchema } from '@schematics/angular/service/schema';
import * as path from 'path';
import { dasherize } from '../../utils/string.utils';
import { createApp, createEmptyWorkspace, createLib } from '../../utils/testing.utils';
import { NgrxSchema } from '../ngrx/ngrx-schema.interface';
import { CrudSchema } from './crud-schema.interface';

const collectionPath = path.join(__dirname, '../../collection.json');

const ngrxOpts: NgrxSchema = {
  name: 'test',
  module: '/libs/data-access-test/src/lib/data-access-test.module.ts',
  facade: true
};

const classOpts: ClassSchema = {
  name: 'TestModel',
  project: 'data-access-test',
  path: '/libs/data-access-test/src/lib/resources/models'
};

const serviceOpts: ServiceSchema = {
  name: 'test-data',
  path: '/libs/data-access-test/src/lib/services',
  project: 'data-access-test'
};

describe('crud', () => {
  let appTree: UnitTestTree;
  let runner: SchematicTestRunner;

  beforeEach(async done => {
    runner = new SchematicTestRunner('schematics', collectionPath);
    appTree = new UnitTestTree(new VirtualTree());
    appTree = createEmptyWorkspace(appTree);
    appTree = createApp(appTree, 'myapp');
    appTree = createLib(appTree, 'data-access-test');
    appTree = await runner.runSchematicAsync('ngrx', ngrxOpts, appTree).toPromise();
    appTree = await runner
      .runExternalSchematicAsync('@schematics/angular', 'class', classOpts, appTree)
      .toPromise();
    appTree.create(classOpts.path + '/index.ts', `export * from './${dasherize(classOpts.name)}';`);
    appTree = await runner
      .runExternalSchematicAsync('@schematics/angular', 'service', serviceOpts, appTree)
      .toPromise();

    done();
  });

  it('works', async done => {
    const crudOpts: CrudSchema = {
      isCollection: false,
      entity: 'TestModel',
      dataService: '/libs/data-access-test/src/lib/services/test-data.service.ts',
      actionsPrefix: 'Test',
      stateDir: '/libs/data-access-test/src/lib/+state',
      operation: 'crud',
      mapResponse: 'data',
      responseType: 'ApiResponse<TestModel>'
    };

    appTree = await runner.runSchematicAsync('crud', crudOpts, appTree).toPromise();
    // console.log(appTree.readContent('/libs/data-access-test/src/lib/+state/test.facade.spec.ts'));
    console.log(appTree.files);

    done();
  });
});
