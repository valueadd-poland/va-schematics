import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { SchematicCache } from '../../../../utils/schematic-cache.util';
import {
  createEmptyWorkspace,
  createLib,
  createModelInLib,
  createServiceInLib
} from '../../../../utils/testing.utils';
import { CrudOperation, DataServiceBackend } from '../../data-service-schema';
import { DataServiceLocalStorageMethodSchema } from './data-service-local-storage-method-schema';

const collectionPath = path.join(__dirname, '../../../../collection.json');
const dataServicePath = '/libs/data-access-test/src/lib/services/test-data.service.ts';
const libName = 'data-access-test';
const modelName = 'ExampleModel';
const baseOptions = {
  dataService: dataServicePath,
  skipFormat: true,
  skipTests: true
};

describe('data-service-empty-method', () => {
  let appTree: UnitTestTree;
  let runner: SchematicTestRunner;

  beforeEach(() => {
    SchematicCache.getInstance().clearAll();
    runner = new SchematicTestRunner('va-schematics', collectionPath);
    appTree = new UnitTestTree(Tree.empty());
    appTree = createEmptyWorkspace(appTree);
    appTree = createLib(appTree, libName);
    appTree = createServiceInLib(appTree, 'test-data', libName);
    appTree = createModelInLib(appTree, modelName, libName);
  });

  describe('localStorageMethodRule', () => {
    it('should generate a create method', async done => {
      const options: DataServiceLocalStorageMethodSchema = {
        ...baseOptions,
        methodBackend: DataServiceBackend.LocalStorage,
        methodName: 'createExample',
        operation: CrudOperation.Create,
        methodReturnType: `Observable<${modelName}>`,
        entity: modelName
      };
      appTree = await runner
        .runSchematicAsync('data-service-local-storage-method', options, appTree)
        .toPromise();

      const content = appTree.readContent(dataServicePath);
      expect(content).toContain(
        `createExample(payload:CreateExampleModelRequestPayload): Observable<ExampleModel> {`
      );

      done();
    });
  });
});
