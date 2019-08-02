import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ClassSchema } from '@schematics/angular/class/schema';
import { Schema as ServiceSchema } from '@schematics/angular/service/schema';
import * as path from 'path';
import { ActionSchema } from '../collection/action/action-schema.interface';
import { NgrxSchema } from '../collection/ngrx/ngrx-schema.interface';
import { ReducerSchema } from '../collection/reducer/reducer-schema.interface';
import { addExportAstrix, insert } from './ast.utils';
import { names, toFileName } from './name.utils';
import { dasherize } from './string.utils';

export interface AppConfig {
  appModule: string; // app/app.module.ts in the above sourceDir
  appName: string; // name of app
}

export interface LibConfig {
  barrel: string;
  module: string;
  name: string;
}

let appConfig: AppConfig; // configure built in createApp()
let libConfig: LibConfig;

export function getAppConfig(): AppConfig {
  return appConfig;
}

export function getLibConfig(): LibConfig {
  return libConfig;
}

export const schematicRunner = new SchematicTestRunner(
  '@nrwl/schematics',
  path.join(__dirname, '../collection.json')
);

export function runSchematic(name: string, options: any, tree: Tree): Promise<UnitTestTree> {
  return schematicRunner
    .runSchematicAsync(name, { ...options, skipFormat: true }, tree)
    .toPromise();
}

export function createEmptyWorkspace(tree: UnitTestTree): UnitTestTree {
  tree.create('/angular.json', JSON.stringify({ projects: {}, newProjectRoot: '' }));
  tree.create(
    '/package.json',
    JSON.stringify({
      dependencies: {},
      devDependencies: {}
    })
  );
  tree.create('/nx.json', JSON.stringify({ npmScope: 'proj', projects: {} }));
  tree.create('/tsconfig.json', JSON.stringify({ compilerOptions: { paths: {} } }));
  tree.create(
    '/tslint.json',
    JSON.stringify({
      rules: {
        'nx-enforce-module-boundaries': [
          true,
          {
            npmScope: '<%= npmScope %>',
            lazyLoad: [],
            allow: []
          }
        ]
      }
    })
  );
  return tree;
}

export function createApp(
  tree: UnitTestTree,
  appName: string,
  routing: boolean = true
): UnitTestTree {
  // save for getAppDir() lookup by external *.spec.ts tests
  appConfig = {
    appName,
    appModule: `/apps/${appName}/src/app/app.module.ts`
  };

  tree.create(
    appConfig.appModule,
    `
     import { NgModule } from '@angular/core';
     import { BrowserModule } from '@angular/platform-browser';
     ${routing ? "import { RouterModule } from '@angular/router'" : ''};
     import { AppComponent } from './app.component';
     @NgModule({
       imports: [BrowserModule, ${routing ? 'RouterModule.forRoot([])' : ''}],
       declarations: [AppComponent],
       bootstrap: [AppComponent]
     })
     export class AppModule {}
  `
  );
  tree.create(
    `/apps/${appName}/src/main.ts`,
    `
    import { enableProdMode } from '@angular/core';
    import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

    import { AppModule } from './app/app.module';
    import { environment } from './environments/environment';

    if (environment.production) {
      enableProdMode();
    }

    platformBrowserDynamic()
      .bootstrapModule(AppModule)
      .catch(err => console.log(err));
  `
  );
  tree.create(
    `/apps/${appName}/tsconfig.app.json`,
    JSON.stringify({
      include: ['**/*.ts']
    })
  );
  tree.create(
    `/apps/${appName}-e2e/tsconfig.e2e.json`,
    JSON.stringify({
      include: ['../**/*.ts']
    })
  );
  tree.overwrite(
    '/angular.json',
    JSON.stringify({
      newProjectRoot: '',
      projects: {
        [appName]: {
          root: `apps/${appName}`,
          sourceRoot: `apps/${appName}/src`,
          architect: {
            build: {
              options: {
                main: `apps/${appName}/src/main.ts`
              }
            },
            serve: {
              options: {}
            }
          }
        }
      }
    })
  );
  return tree;
}

export function createLib(tree: UnitTestTree, libName: string): UnitTestTree {
  const { name, className, fileName } = names(libName);

  libConfig = {
    name,
    module: `/libs/${fileName}/src/lib/${fileName}.module.ts`,
    barrel: `/libs/${fileName}/src/index.ts`
  };

  tree.create(
    libConfig.module,
    `
      import { NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';
      @NgModule({
        imports: [
          CommonModule
        ],
        providers: []
      })
      export class ${className}Module { }
  `
  );
  tree.create(
    libConfig.barrel,
    `
    export * from './lib/${fileName}.module';
  `
  );
  return tree;
}

export function createServiceInLib(
  tree: UnitTestTree,
  serviceName: string,
  libName: string
): UnitTestTree {
  const { name, className, fileName } = names(serviceName);
  libName = toFileName(libName);

  const serviceConfig = {
    name,
    service: `/libs/${libName}/src/lib/services/${fileName}.service.ts`,
    barrel: `/libs/${libName}/src/lib/services/index.ts`
  };

  tree.create(
    serviceConfig.service,
    `
      import { Injectable } from '@angular/core';

      @Injectable({
        providedIn: 'root'
      })
      export class ${className}Service {}
  `
  );
  tree.create(
    serviceConfig.barrel,
    `
    export * from './${fileName}.service';
  `
  );

  return tree;
}

export function createModelInLib(
  tree: UnitTestTree,
  modelName: string,
  libName: string
): UnitTestTree {
  const { name, className, fileName } = names(modelName);
  libName = toFileName(libName);

  const serviceConfig = {
    name,
    service: `/libs/${libName}/src/lib/resources/models/${fileName}.model.ts`,
    barrel: `/libs/${libName}/src/lib/resources/models/index.ts`
  };

  tree.create(
    serviceConfig.service,
    `
      export class ${className} {
        id: string;
        name: string;
        data: any;
        errors: any;
      }
  `
  );

  if (tree.exists(serviceConfig.barrel)) {
    insert(tree, serviceConfig.barrel, [
      addExportAstrix(tree, serviceConfig.barrel, `./${fileName}.model`)
    ]);
  } else {
    tree.create(
      serviceConfig.barrel,
      `
    export * from './${fileName}.model';
  `
    );
  }

  return tree;
}

export async function createTestAppWithStore(): Promise<UnitTestTree> {
  const collectionPath = path.join(__dirname, '../collection.json');
  let appTree: UnitTestTree;
  const runner = new SchematicTestRunner('va-schematics', collectionPath);
  const stateDirPath = '/libs/testlib/src/lib/+state';

  const ngrxOpts: NgrxSchema = {
    name: 'test',
    module: '/libs/testlib/src/lib/testlib.module.ts',
    facade: true
  };

  const classOpts: ClassSchema = {
    name: 'TestModel',
    project: 'testlib',
    path: '/libs/testlib/src/lib/resources/models'
  };

  const serviceOpts: ServiceSchema = {
    name: 'test-data',
    path: '/libs/testlib/src/lib/services',
    project: 'testlib'
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

  const reducerOpts: ReducerSchema = {
    propsToUpdate:
      'loadingTest:false,test:action.payload:Test,loadingTestApiError:null:ApiError|null',
    actionName: 'GetTest',
    stateDir: stateDirPath,
    selectors: true
  };

  return new Promise<UnitTestTree>(async resolve => {
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
    appTree.create(classOpts.path + '/index.ts', `export * from './${dasherize(classOpts.name)}';`);
    appTree = await runner
      .runExternalSchematicAsync('@schematics/angular', 'service', serviceOpts, appTree)
      .toPromise();
    appTree = await runner.runSchematicAsync('action', getTestsOpts, appTree).toPromise();
    appTree = await runner.runSchematicAsync('action', getTestOpts, appTree).toPromise();
    appTree = await runner.runSchematicAsync('action', updateTestOpts, appTree).toPromise();
    appTree = await runner.runSchematicAsync('action', removeTestOpts, appTree).toPromise();
    appTree = await runner.runSchematicAsync('reducer', reducerOpts, appTree).toPromise();
    resolve(appTree);
  });
}
