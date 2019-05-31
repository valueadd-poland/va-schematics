import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { insert, insertImport } from '../../../utils/ast.utils';
import { toPropertyName } from '../../../utils/name.utils';
import { readIntoSourceFile } from '../../../utils/ts.utils';
import { reducer } from '../../reducer';
import { CrudOptions } from '../index';

function createReducer(options: CrudOptions): Rule[] {
  const { toGenerate, entity, statePath } = options;
  const entityPropertyName = toPropertyName(entity.name);
  const entityType = entity.name;
  const rules: Rule[] = [];

  if (toGenerate.read) {
    rules.push(
      reducer({
        actionName: `Get${entity.name}`,
        propsToUpdate:
          `${entityPropertyName}:null:${entityType}|null,` +
          `${entityPropertyName}Loading:true,` +
          `${entityPropertyName}LoadError:null:HttpErrorResponse|null`,
        selectors: true,
        stateDir: statePath,
        skipFormat: true
      }),
      reducer({
        actionName: `Get${entity.name}Fail`,
        propsToUpdate:
          `${entityPropertyName}:null:${entityType}|null,` +
          `${entityPropertyName}Loading:false,` +
          `${entityPropertyName}LoadError:action.payload:HttpErrorResponse|null`,
        selectors: false,
        stateDir: statePath,
        skipFormat: true
      }),
      reducer({
        actionName: `Get${entity.name}Success`,
        propsToUpdate:
          `${entityPropertyName}:action.payload:${entityType}|null,` +
          `${entityPropertyName}Loading:false,` +
          `${entityPropertyName}LoadError:null:HttpErrorResponse|null`,
        selectors: false,
        stateDir: statePath,
        skipFormat: true
      })
    );

    rules.push(
      reducer({
        actionName: `Get${entity.name}s`,
        propsToUpdate:
          `${entityPropertyName}s:[]:${entityType}[],` +
          `${entityPropertyName}sLoading:true,` +
          `${entityPropertyName}sLoadError:null:HttpErrorResponse|null`,
        selectors: true,
        stateDir: statePath,
        skipFormat: true
      }),
      reducer({
        actionName: `Get${entity.name}sFail`,
        propsToUpdate:
          `${entityPropertyName}s:[]:${entityType}[],` +
          `${entityPropertyName}sLoading:false,` +
          `${entityPropertyName}sLoadError:action.payload:HttpErrorResponse|null`,
        selectors: false,
        stateDir: statePath,
        skipFormat: true
      }),
      reducer({
        actionName: `Get${entity.name}sSuccess`,
        propsToUpdate:
          `${entityPropertyName}s:action.payload:${entityType}[],` +
          `${entityPropertyName}sLoading:false,` +
          `${entityPropertyName}sLoadError:null:HttpErrorResponse|null`,
        selectors: false,
        stateDir: statePath,
        skipFormat: true
      })
    );
  }

  if (toGenerate.create) {
    rules.push(
      reducer({
        actionName: `Create${entity.name}`,
        propsToUpdate:
          `${entityPropertyName}Creating:true,` +
          `${entityPropertyName}CreateError:null:HttpErrorResponse|null`,
        selectors: true,
        stateDir: statePath,
        skipFormat: true
      }),
      reducer({
        actionName: `Create${entity.name}Fail`,
        propsToUpdate:
          `${entityPropertyName}Creating:false,` +
          `${entityPropertyName}CreateError:action.payload:HttpErrorResponse|null`,
        selectors: false,
        stateDir: statePath,
        skipFormat: true
      }),
      reducer({
        actionName: `Create${entity.name}Success`,
        propsToUpdate:
          `${entityPropertyName}s:state.${entityPropertyName}s.concat(action.payload):${entityType}[],` +
          `${entityPropertyName}Creating:false,` +
          `${entityPropertyName}CreateError:null:HttpErrorResponse|null`,
        selectors: false,
        stateDir: statePath,
        skipFormat: true
      })
    );
  }

  if (toGenerate.update) {
    rules.push(
      reducer({
        actionName: `Update${entity.name}`,
        propsToUpdate:
          `${entityPropertyName}Updating:true,` +
          `${entityPropertyName}UpdateError:null:HttpErrorResponse|null`,
        selectors: true,
        stateDir: statePath,
        skipFormat: true
      }),
      reducer({
        actionName: `Update${entity.name}Fail`,
        propsToUpdate:
          `${entityPropertyName}Updating:false,` +
          `${entityPropertyName}UpdateError:action.payload:HttpErrorResponse|null`,
        selectors: false,
        stateDir: statePath,
        skipFormat: true
      }),
      reducer({
        actionName: `Update${entity.name}Success`,
        propsToUpdate:
          `${entityPropertyName}s:state.${entityPropertyName}s.map(e => e.id === action.payload.id ? action.payload \\: e):${entityType}[],` +
          `${entityPropertyName}Updating:false,` +
          `${entityPropertyName}UpdateError:null:HttpErrorResponse|null`,
        selectors: false,
        stateDir: statePath,
        skipFormat: true
      })
    );
  }

  if (toGenerate.delete) {
    rules.push(
      reducer({
        actionName: `Remove${entity.name}`,
        propsToUpdate:
          `${entityPropertyName}Removing:true,` +
          `${entityPropertyName}RemoveError:null:HttpErrorResponse|null`,
        selectors: true,
        stateDir: statePath,
        skipFormat: true
      }),
      reducer({
        actionName: `Remove${entity.name}Fail`,
        propsToUpdate:
          `${entityPropertyName}Removing:false,` +
          `${entityPropertyName}RemoveError:action.payload:HttpErrorResponse|null`,
        selectors: false,
        stateDir: statePath,
        skipFormat: true
      }),
      reducer({
        actionName: `Remove${entity.name}Success`,
        propsToUpdate:
          `${entityPropertyName}s:state.${entityPropertyName}s.filter(e => e.id !== action.payload.id):${entityType}[],` +
          `${entityPropertyName}Removing:false,` +
          `${entityPropertyName}RemoveError:null:HttpErrorResponse|null`,
        selectors: false,
        stateDir: statePath,
        skipFormat: true
      })
    );
  }

  return rules;
}

export function crudReducer(options: CrudOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.info(`Generating reducer and selectors.`);
    const reducerFile = options.stateDir.reducer;
    insert(host, reducerFile, [
      insertImport(
        readIntoSourceFile(host, reducerFile),
        reducerFile,
        'HttpErrorResponse',
        '@angular/common/http'
      )
    ]);

    return chain(createReducer(options))(host, context);
  };
}
