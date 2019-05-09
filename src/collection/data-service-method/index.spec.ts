import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { createTestAppWithStore } from '../../utils/testing.utils';
import { DataServiceMethodSchema } from './data-service-method-schema.interface';

describe('data-service-method', () => {
  const collectionPath = path.join(__dirname, '../../collection.json');
  const runner = new SchematicTestRunner('va-schematics', collectionPath);

  it('works', async done => {
    const dataServiceGetMethodOpts: DataServiceMethodSchema = {
      dataServiceFilePath: '/libs/testlib/src/lib/services/test-data.service.ts',
      httpMethod: 'PUT',
      name: 'getTest',
      returnType: 'TestModel',
      mapResponse: 'data',
      responseType: 'TestModel',
      properties: 'testId:string'
    };
    let appTree = await createTestAppWithStore();
    appTree = await runner
      .runSchematicAsync('data-service-method', dataServiceGetMethodOpts, appTree)
      .toPromise();

    /*#console.log(appTree.readContent('/libs/testlib/src/lib/services/test-data.service.spec.ts'));*/
    done();
  });
});
