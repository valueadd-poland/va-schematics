import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ClassSchema } from '@schematics/angular/class/schema';
import { Schema as ServiceSchema } from '@schematics/angular/service/schema';
import * as path from 'path';
import { camelize, dasherize, splitUpperCamel } from '../../utils/string.utils';
import { createApp, createEmptyWorkspace, createLib } from '../../utils/testing.utils';
import { NgrxSchema } from '../ngrx/ngrx-schema.interface';
import { CrudSchema } from './crud-schema.interface';
import { parseOptions } from './index';
import { crudActions } from './rules/crud-actions.rule';
import { crudDataServiceMethods } from './rules/crud-data-service-methods.rule';
import { crudEffects } from './rules/crud-effects.rule';
import { crudFacade } from './rules/crud-facade.rule';
import { crudReducer } from './rules/crud-reducer.rule';

const collectionPath = path.join(__dirname, '../../collection.json');

const ngrxOpts: NgrxSchema = {
  name: 'test',
  module: '/libs/data-access-test/src/lib/data-access-test.module.ts',
  facade: true,
  creators: true
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

const crudOpts: CrudSchema = {
  entity: 'TestModel',
  dataService: '/libs/data-access-test/src/lib/services/test-data.service.ts',
  actionsPrefix: 'Test',
  stateDir: '/libs/data-access-test/src/lib/+state',
  operation: ['Read', 'ReadCollection', 'Create', 'Update', 'Delete'],
  mapResponse: 'data',
  responseType: 'ApiResponse<TestModel>',
  creators: true
};

describe('crud', () => {
  let appTree: UnitTestTree;
  let runner: SchematicTestRunner;

  beforeEach(async done => {
    runner = new SchematicTestRunner('schematics', collectionPath);
    appTree = new UnitTestTree(Tree.empty());
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

  it('adds crud actions using creators syntax', async done => {
    const opts = parseOptions(appTree, crudOpts);
    await runner.callRule(crudActions(opts), appTree).toPromise();
    const actionsContent = appTree.readContent(
      '/libs/data-access-test/src/lib/+state/test.actions.ts'
    );

    expect(actionsContent).toContain(
      `Get${crudOpts.entity} = '[${crudOpts.actionsPrefix}] Get${splitUpperCamel(crudOpts.entity)}'`
    );

    expect(actionsContent).toContain(
      `Get${crudOpts.entity}Fail = '[${crudOpts.actionsPrefix}] Get${splitUpperCamel(
        crudOpts.entity
      )} Fail'`
    );

    expect(actionsContent).toContain(
      `Get${crudOpts.entity}Success = '[${crudOpts.actionsPrefix}] Get${splitUpperCamel(
        crudOpts.entity
      )} Success'`
    );

    expect(actionsContent).toContain(
      `Get${crudOpts.entity}Collection = '[${crudOpts.actionsPrefix}] Get${splitUpperCamel(
        crudOpts.entity
      )} Collection'`
    );

    expect(actionsContent).toContain(
      `Get${crudOpts.entity}CollectionFail = '[${crudOpts.actionsPrefix}] Get${splitUpperCamel(
        crudOpts.entity
      )} Collection Fail'`
    );

    expect(actionsContent).toContain(
      `Get${crudOpts.entity}CollectionSuccess = '[${crudOpts.actionsPrefix}] Get${splitUpperCamel(
        crudOpts.entity
      )} Collection Success'`
    );

    expect(actionsContent).toContain(
      `Create${crudOpts.entity} = '[${crudOpts.actionsPrefix}] Create${splitUpperCamel(
        crudOpts.entity
      )}'`
    );

    expect(actionsContent).toContain(
      `Create${crudOpts.entity}Fail = '[${crudOpts.actionsPrefix}] Create${splitUpperCamel(
        crudOpts.entity
      )} Fail'`
    );

    expect(actionsContent).toContain(
      `Create${crudOpts.entity}Success = '[${crudOpts.actionsPrefix}] Create${splitUpperCamel(
        crudOpts.entity
      )} Success'`
    );

    expect(actionsContent).toContain(
      `Update${crudOpts.entity} = '[${crudOpts.actionsPrefix}] Update${splitUpperCamel(
        crudOpts.entity
      )}'`
    );

    expect(actionsContent).toContain(
      `Update${crudOpts.entity}Fail = '[${crudOpts.actionsPrefix}] Update${splitUpperCamel(
        crudOpts.entity
      )} Fail'`
    );

    expect(actionsContent).toContain(
      `Update${crudOpts.entity}Success = '[${crudOpts.actionsPrefix}] Update${splitUpperCamel(
        crudOpts.entity
      )} Success'`
    );

    expect(actionsContent).toContain(
      `Remove${crudOpts.entity} = '[${crudOpts.actionsPrefix}] Remove${splitUpperCamel(
        crudOpts.entity
      )}'`
    );

    expect(actionsContent).toContain(
      `Remove${crudOpts.entity}Fail = '[${crudOpts.actionsPrefix}] Remove${splitUpperCamel(
        crudOpts.entity
      )} Fail'`
    );

    expect(actionsContent).toContain(
      `Remove${crudOpts.entity}Success = '[${crudOpts.actionsPrefix}] Remove${splitUpperCamel(
        crudOpts.entity
      )} Success'`
    );

    done();
  });

  it('adds crud reducers using creators syntax', async done => {
    const opts = parseOptions(appTree, crudOpts);
    await runner.callRule(crudReducer(opts), appTree).toPromise();
    const reducerContent = appTree.readContent(
      '/libs/data-access-test/src/lib/+state/test.reducer.ts'
    );

    expect(reducerContent).toContain(`${camelize(crudOpts.entity)}: ${crudOpts.entity}|null;`);

    expect(reducerContent).toContain(`${camelize(crudOpts.entity)}Loading: boolean;`);

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}LoadError: HttpErrorResponse|null;`
    );

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}Collection: ${crudOpts.entity}[];`
    );

    expect(reducerContent).toContain(`${camelize(crudOpts.entity)}CollectionLoading: boolean;`);

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}LoadError: HttpErrorResponse|null;`
    );

    expect(reducerContent).toContain(`${camelize(crudOpts.entity)}Creating: boolean;`);

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}CreateError: HttpErrorResponse|null;`
    );

    expect(reducerContent).toContain(`${camelize(crudOpts.entity)}Updating: boolean;`);

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}UpdateError: HttpErrorResponse|null;`
    );

    expect(reducerContent).toContain(`${camelize(crudOpts.entity)}Removing: boolean;`);

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}RemoveError: HttpErrorResponse|null;`
    );

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}: null,${camelize(crudOpts.entity)}Loading: true,${camelize(
        crudOpts.entity
      )}LoadError: null`
    );

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}: null,${camelize(crudOpts.entity)}Loading: false,${camelize(
        crudOpts.entity
      )}LoadError: action.payload`
    );

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}: action.payload,${camelize(
        crudOpts.entity
      )}Loading: false,${camelize(crudOpts.entity)}LoadError: null`
    );

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}Collection: [],${camelize(
        crudOpts.entity
      )}CollectionLoading: true,${camelize(crudOpts.entity)}CollectionLoadError: null`
    );

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}Collection: [],${camelize(
        crudOpts.entity
      )}CollectionLoading: false,${camelize(crudOpts.entity)}CollectionLoadError: action.payload`
    );

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}Collection: action.payload,${camelize(
        crudOpts.entity
      )}CollectionLoading: false,${camelize(crudOpts.entity)}CollectionLoadError: null`
    );

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}Creating: true,${camelize(crudOpts.entity)}CreateError: null,`
    );

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}Creating: false,${camelize(
        crudOpts.entity
      )}CreateError: action.payload,`
    );

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}Collection: state.${camelize(
        crudOpts.entity
      )}Collection.concat(action.payload),${camelize(crudOpts.entity)}Creating: false,${camelize(
        crudOpts.entity
      )}CreateError: null`
    );

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}Updating: true,${camelize(crudOpts.entity)}UpdateError: null`
    );

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}Updating: false,${camelize(
        crudOpts.entity
      )}UpdateError: action.payload`
    );

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}Collection: state.${camelize(
        crudOpts.entity
      )}Collection.map(e => e.id === action.payload.id ? action.payload : e),${camelize(
        crudOpts.entity
      )}Updating: false,${camelize(crudOpts.entity)}UpdateError: null`
    );

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}Removing: true,${camelize(crudOpts.entity)}RemoveError: null`
    );

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}Removing: false,${camelize(
        crudOpts.entity
      )}RemoveError: action.payload`
    );

    expect(reducerContent).toContain(
      `${camelize(crudOpts.entity)}Collection: state.${camelize(
        crudOpts.entity
      )}Collection.filter(e => e.id !== action.payload.id),${camelize(
        crudOpts.entity
      )}Removing: false,${camelize(crudOpts.entity)}RemoveError: null`
    );

    done();
  });

  it('adds crud effects using creators syntax', async done => {
    const opts = parseOptions(appTree, crudOpts);
    await runner.callRule(crudEffects(opts), appTree).toPromise();
    const effectsContent = appTree.readContent(
      '/libs/data-access-test/src/lib/+state/test.effects.ts'
    );

    expect(effectsContent).toContain(
      `export class TestEffects {
  get${crudOpts.entity}$ = createEffect(() => this.actions$.pipe(
  ofType(fromTestActions.get${crudOpts.entity}),
  fetch({
    id: () => {},
    run: ({payload}) => {
      return this.testDataService
        .get${crudOpts.entity}(payload)
        .pipe(map(data => fromTestActions.get${crudOpts.entity}Success({payload: data})));
    },
    onError: (action, error: HttpErrorResponse) => {
      return fromTestActions.get${crudOpts.entity}Fail({payload: error});
    }
  })
  )
  );`
    );

    expect(effectsContent).toContain(
      `get${crudOpts.entity}Collection$ = createEffect(() => this.actions$.pipe(
  ofType(fromTestActions.get${crudOpts.entity}Collection),
  fetch({
    id: () => {},
    run: ({payload}) => {
      return this.testDataService
        .get${crudOpts.entity}Collection(payload)
        .pipe(map(data => fromTestActions.get${crudOpts.entity}CollectionSuccess({payload: data})));
    },
    onError: (action, error: HttpErrorResponse) => {
      return fromTestActions.get${crudOpts.entity}CollectionFail({payload: error});
    }
  })
  )
  );`
    );

    expect(effectsContent).toContain(
      `create${crudOpts.entity}$ = createEffect(() => this.actions$.pipe(
  ofType(fromTestActions.create${crudOpts.entity}),
  pessimisticUpdate({
    run: ({payload}) => {
      return this.testDataService
        .create${crudOpts.entity}(payload)
        .pipe(map(data => fromTestActions.create${crudOpts.entity}Success({payload: data})));
    },
    onError: (action, error: HttpErrorResponse) => {
      return fromTestActions.create${crudOpts.entity}Fail({payload: error});
    }
  })
  )
  );`
    );

    expect(effectsContent).toContain(
      `update${crudOpts.entity}$ = createEffect(() => this.actions$.pipe(
  ofType(fromTestActions.update${crudOpts.entity}),
  pessimisticUpdate({
    run: ({payload}) => {
      return this.testDataService
        .update${crudOpts.entity}(payload)
        .pipe(map(data => fromTestActions.update${crudOpts.entity}Success({payload: data})));
    },
    onError: (action, error: HttpErrorResponse) => {
      return fromTestActions.update${crudOpts.entity}Fail({payload: error});
    }
  })
  )
  );`
    );

    expect(effectsContent).toContain(
      `remove${crudOpts.entity}$ = createEffect(() => this.actions$.pipe(
  ofType(fromTestActions.remove${crudOpts.entity}),
  pessimisticUpdate({
    run: ({payload}) => {
      return this.testDataService
        .remove${crudOpts.entity}(payload)
        .pipe(map(data => fromTestActions.remove${crudOpts.entity}Success({payload})));
    },
    onError: (action, error: HttpErrorResponse) => {
      return fromTestActions.remove${crudOpts.entity}Fail({payload: error});
    }
  })
  )
  );`
    );

    done();
  });

  it('adds crud facade using creators syntax', async done => {
    const opts = parseOptions(appTree, crudOpts);
    await runner.callRule(crudFacade(opts), appTree).toPromise();
    const facadeContent = appTree.readContent(
      '/libs/data-access-test/src/lib/+state/test.facade.ts'
    );

    expect(facadeContent).toContain(
      `${camelize(crudOpts.entity)}$ = this.store.pipe(select(testQuery.get${crudOpts.entity}));`
    );
    expect(facadeContent).toContain(
      `${camelize(crudOpts.entity)}Loading$ = this.store.pipe(select(testQuery.get${
        crudOpts.entity
      }Loading));`
    );
    expect(facadeContent).toContain(
      `${camelize(crudOpts.entity)}LoadError$ = this.store.pipe(select(testQuery.get${
        crudOpts.entity
      }LoadError));`
    );
    expect(facadeContent).toContain(
      `${camelize(crudOpts.entity)}Collection$ = this.store.pipe(select(testQuery.get${
        crudOpts.entity
      }Collection));`
    );
    expect(facadeContent).toContain(
      `${camelize(crudOpts.entity)}CollectionLoading$ = this.store.pipe(select(testQuery.get${
        crudOpts.entity
      }CollectionLoading));`
    );
    expect(facadeContent).toContain(
      `${camelize(crudOpts.entity)}CollectionLoadError$ = this.store.pipe(select(testQuery.get${
        crudOpts.entity
      }CollectionLoadError));`
    );
    expect(facadeContent).toContain(
      `${camelize(crudOpts.entity)}Creating$ = this.store.pipe(select(testQuery.get${
        crudOpts.entity
      }Creating));`
    );
    expect(facadeContent).toContain(
      `${camelize(crudOpts.entity)}CreateError$ = this.store.pipe(select(testQuery.get${
        crudOpts.entity
      }CreateError));`
    );
    expect(facadeContent).toContain(
      `${camelize(crudOpts.entity)}Updating$ = this.store.pipe(select(testQuery.get${
        crudOpts.entity
      }Updating));`
    );
    expect(facadeContent).toContain(
      `${camelize(crudOpts.entity)}UpdateError$ = this.store.pipe(select(testQuery.get${
        crudOpts.entity
      }UpdateError));`
    );
    expect(facadeContent).toContain(
      `${camelize(crudOpts.entity)}Removing$ = this.store.pipe(select(testQuery.get${
        crudOpts.entity
      }Removing));`
    );
    expect(facadeContent).toContain(
      `${camelize(crudOpts.entity)}RemoveError$ = this.store.pipe(select(testQuery.get${
        crudOpts.entity
      }RemoveError));`
    );
    expect(facadeContent).toContain(
      `get${crudOpts.entity}(data: Get${crudOpts.entity}RequestPayload): void {
    this.store.dispatch(fromTestActions.get${crudOpts.entity}({payload: data}));
  }`
    );
    expect(facadeContent).toContain(
      `get${crudOpts.entity}Collection(data: Get${crudOpts.entity}CollectionRequestPayload): void {
    this.store.dispatch(fromTestActions.get${crudOpts.entity}Collection({payload: data}));
  }`
    );
    expect(facadeContent).toContain(
      `create${crudOpts.entity}(data: Create${crudOpts.entity}RequestPayload): void {
    this.store.dispatch(fromTestActions.create${crudOpts.entity}({payload: data}));
  }`
    );
    expect(facadeContent).toContain(
      `update${crudOpts.entity}(data: Update${crudOpts.entity}RequestPayload): void {
    this.store.dispatch(fromTestActions.update${crudOpts.entity}({payload: data}));
  }`
    );
    expect(facadeContent).toContain(
      `remove${crudOpts.entity}(data: Remove${crudOpts.entity}RequestPayload): void {
    this.store.dispatch(fromTestActions.remove${crudOpts.entity}({payload: data}));
  }`
    );

    done();
  });

  it('adds service methods', async done => {
    const opts = parseOptions(appTree, crudOpts);
    await runner.callRule(crudDataServiceMethods(opts), appTree).toPromise();
    const serviceContent = appTree.readContent(
      '/libs/data-access-test/src/lib/services/test-data.service.ts'
    );

    expect(serviceContent).toContain(
      `get${crudOpts.entity}(payload:Get${crudOpts.entity}RequestPayload): Observable<${crudOpts.entity}>`
    );
    expect(serviceContent).toContain(
      `return this.http.get<${crudOpts.responseType}>(this.endpoints.get${crudOpts.entity}).pipe(map(res => res.data));`
    );
    expect(serviceContent).toContain(
      `get${crudOpts.entity}Collection(payload:Get${crudOpts.entity}CollectionRequestPayload): Observable<${crudOpts.entity}[]>`
    );
    expect(serviceContent).toContain(
      `return this.http.get<ApiResponse<${crudOpts.entity}[]>>(this.endpoints.get${crudOpts.entity}Collection).pipe(map(res => res.data));`
    );
    expect(serviceContent).toContain(
      `create${crudOpts.entity}(payload:Create${crudOpts.entity}RequestPayload): Observable<${crudOpts.entity}>`
    );
    expect(serviceContent).toContain(
      `.post<${crudOpts.responseType}>(this.endpoints.create${crudOpts.entity}, payload.data).pipe(map(res => res.data));`
    );
    expect(serviceContent).toContain(
      `update${crudOpts.entity}(payload:Update${crudOpts.entity}RequestPayload): Observable<${crudOpts.entity}>`
    );
    expect(serviceContent).toContain(
      `return this.http.put<${crudOpts.responseType}>(this.endpoints.update${crudOpts.entity}, payload.data).pipe(map(res => res.data));`
    );
    expect(serviceContent).toContain(
      `remove${crudOpts.entity}(payload:Remove${crudOpts.entity}RequestPayload): Observable<void>`
    );
    expect(serviceContent).toContain(`return this.http
      .delete<${crudOpts.responseType}>(this.endpoints.remove${crudOpts.entity});
  }`);

    console.log(serviceContent);

    done();
  });
});
