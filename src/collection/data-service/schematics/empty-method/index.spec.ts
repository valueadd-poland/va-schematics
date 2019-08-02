import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { getSpecPath } from '../../../../utils/file-parsing.utils';
import { SchematicCache } from '../../../../utils/schematic-cache.util';
import {
  createEmptyWorkspace,
  createLib,
  createModelInLib,
  createServiceInLib
} from '../../../../utils/testing.utils';
import { DataServiceBackend } from '../../data-service-schema';
import { DataServiceEmptyMethodSchema } from './data-service-empty-method-schema';

const collectionPath = path.join(__dirname, '../../../../collection.json');
const dataServicePath = '/libs/data-access-test/src/lib/services/test-data.service.ts';
const libName = 'data-access-test';
const modelName = 'ExampleModel';
const baseOptions = {
  dataService: dataServicePath,
  methodName: 'emptyExampleMethod',
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

  describe('emptyMethodRule', () => {
    it('should generate an empty method', async done => {
      const options: DataServiceEmptyMethodSchema = {
        ...baseOptions,
        methodBackend: DataServiceBackend.None
      };
      appTree = await runner
        .runSchematicAsync('data-service-empty-method', options, appTree)
        .toPromise();

      const content = appTree.readContent(dataServicePath);
      expect(content).toContain(`${options.methodName}(): void {`);

      done();
    });

    it('should generate an empty method with properties, return type and import entity from return type', async done => {
      const options: DataServiceEmptyMethodSchema = {
        ...baseOptions,
        methodBackend: DataServiceBackend.None,
        methodReturnType: `Observable<${modelName}>`,
        methodProperties: `id:string,opts:any`
      };

      appTree = await runner
        .runSchematicAsync('data-service-empty-method', options, appTree)
        .toPromise();

      const content = appTree.readContent(dataServicePath);
      expect(content).toContain(`import { ${modelName} } from '../resources/models';`);
      expect(content).toContain(
        `${options.methodName}(${options.methodProperties}): Observable<${modelName}> {`
      );

      done();
    });

    it('should generate an empty test in new spec file', async done => {
      const options: DataServiceEmptyMethodSchema = {
        ...baseOptions,
        methodBackend: DataServiceBackend.None,
        skipTests: false
      };
      appTree = await runner
        .runSchematicAsync('data-service-empty-method', options, appTree)
        .toPromise();
      const dataServiceSpecPath = getSpecPath(dataServicePath);
      const content = appTree.readContent(dataServiceSpecPath);

      expect(content).toContain(`import { TestBed } from '@angular/core/testing';`);
      expect(content).toContain(`import { TestDataService } from './test-data.service';`);
      expect(content).toContain(`describe('TestDataService', () => {`);
      expect(content).toContain(`beforeEach(() => TestBed.configureTestingModule({}));`);
      expect(content).toContain(`it('should be created', () => {`);
      expect(content).toContain(`const service: TestDataService = TestBed.get(TestDataService);`);
      expect(content).toContain(`expect(service).toBeTruthy();`);

      expect(content).toContain(`describe('#emptyExampleMethod', () => {`);
      expect(content).toContain(`it('should work', () => {`);
      expect(content).toContain(`expect(true).toBeTruthy();`);

      done();
    });
  });
});
