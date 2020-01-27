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
import { DataServiceHttpMethodSchema } from './data-service-http-method-schema';

const collectionPath = path.join(__dirname, '../../../../collection.json');
const dataServicePath = '/libs/data-access-test/src/lib/services/test-data.service.ts';
const dataServiceSpecPath = '/libs/data-access-test/src/lib/services/test-data.service.spec.ts';
const libName = 'data-access-test';
const modelName = 'ExampleModel';
const baseOptions = {
  dataService: dataServicePath,
  skipFormat: true
};

describe('data-service-http-method', () => {
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
    appTree = createModelInLib(appTree, 'ApiResponse', libName);
  });

  describe('httpMethodRule', () => {
    it('should generate a create method, add request payload and create imports', async done => {
      const options: DataServiceHttpMethodSchema = {
        ...baseOptions,
        methodBackend: DataServiceBackend.Http,
        operation: CrudOperation.Create,
        methodReturnType: `Observable<${modelName}>`,
        entity: modelName,
        responseMap: 'data',
        httpResponse: 'ApiResponse<ExampleModel>',
        skipTest: true
      };
      appTree = await runner
        .runSchematicAsync('data-service-http-method', options, appTree)
        .toPromise();

      // Service file
      const content = appTree.readContent(dataServicePath);
      expect(content).toContain(`import { Observable } from 'rxjs';`);
      expect(content).toContain(`import { HttpClient } from '@angular/common/http';`);
      expect(content).toContain(`import { map } from 'rxjs/operators';`);
      expect(content).toContain(
        `import { CreateExampleModelRequestPayload } from '../resources/request-payloads/create-example-model.request-payload';`
      );
      expect(content).toContain(`import { ExampleModel, ApiResponse } from '../resources/models';`);
      expect(content).toContain(`readonly endpoints = {`);
      expect(content).toContain(`createExampleModel: ''`);
      expect(content).toContain(`constructor(private http: HttpClient) {}`);
      expect(content).toContain(
        `createExampleModel(payload:CreateExampleModelRequestPayload): Observable<ExampleModel> {`
      );
      expect(content).toContain(`return this.http`);
      expect(content).toContain(
        `.post<ApiResponse<ExampleModel>>(this.endpoints.createExampleModel, payload.data).pipe(map(res => res.data));`
      );

      // Request payload
      const reqPayloadContent = appTree.readContent(
        '/libs/data-access-test/src/lib/resources/request-payloads/create-example-model.request-payload.ts'
      );
      expect(reqPayloadContent).toContain(`import { ExampleModel } from '../models';`);
      expect(reqPayloadContent).toContain(`export interface CreateExampleModelRequestPayload {`);
      expect(reqPayloadContent).toContain(`data: ExampleModel;`);

      expect(appTree.exists(dataServiceSpecPath)).toBeFalsy(`Tests should not be generated`);

      done();
    });

    it('should generate a create method, add request payload and create imports', async done => {
      const options: DataServiceHttpMethodSchema = {
        ...baseOptions,
        methodBackend: DataServiceBackend.Http,
        operation: CrudOperation.Create,
        methodReturnType: `Observable<${modelName}>`,
        entity: modelName,
        responseMap: 'data',
        httpResponse: 'ApiResponse<ExampleModel>'
      };
      appTree = await runner
        .runSchematicAsync('data-service-http-method', options, appTree)
        .toPromise();

      const content = appTree.readContent(dataServiceSpecPath);

      expect(content).toContain(`describe('#createExampleModel', () => {`);
      expect(content).toContain(
        `test('returns an observable of response data on success', () => {`
      );
      expect(content).toContain(`const response = {data: {}} as any;`);
      expect(content).toContain(`service.createExampleModel({} as any).subscribe(res => {`);
      expect(content).toContain(`expect(res).toBe(response.data);`);
      expect(content).toContain(
        `const req = httpMock.expectOne(service.endpoints.createExampleModel);`
      );
      expect(content).toContain(`expect(req.request.method).toBe('POST');`);
      expect(content).toContain(`req.flush(response);`);
      expect(content).toContain(`test('throws an error including response data on fail', () => {`);
      expect(content).toContain(`const response = {};`);
      expect(content).toContain(`service.createExampleModel({} as any).subscribe(`);
      expect(content).toContain(`() => {`);
      expect(content).toContain(`fail('expecting error');`);
      expect(content).toContain(`err => {`);
      expect(content).toContain(`expect(err.error).toBe(response);`);
      expect(content).toContain(
        `const req = httpMock.expectOne(service.endpoints.createExampleModel);`
      );
      expect(content).toContain(`expect(req.request.method).toBe('POST');`);
      expect(content).toContain(`req.flush(response, {`);
      expect(content).toContain(`status: 400,`);
      expect(content).toContain(`statusText: 'Bad request'`);

      done();
    });
  });
});
