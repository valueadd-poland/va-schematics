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
  const initialActionOptions = {
    selectors: true,
    stateDir: statePath,
    skipFormat: true,
    creators: options.creators
  };

  const statusActionOptions = {
    selectors: false,
    stateDir: statePath,
    skipFormat: true,
    creators: options.creators
  };

  if (toGenerate.read) {
    rules.push(
      reducer({
        actionName: `Get${entity.name}`,
        propsToUpdate:
          `${entityPropertyName}:null:${entityType}|null,` +
          `${entityPropertyName}Loading:true,` +
          `${entityPropertyName}LoadError:null:HttpErrorResponse|null`,
        ...initialActionOptions
      }),
      reducer({
        actionName: `Get${entity.name}Fail`,
        propsToUpdate:
          `${entityPropertyName}:null:${entityType}|null,` +
          `${entityPropertyName}Loading:false,` +
          `${entityPropertyName}LoadError:action.payload:HttpErrorResponse|null`,
        ...statusActionOptions
      }),
      reducer({
        actionName: `Get${entity.name}Success`,
        propsToUpdate:
          `${entityPropertyName}:action.payload:${entityType}|null,` +
          `${entityPropertyName}Loading:false,` +
          `${entityPropertyName}LoadError:null:HttpErrorResponse|null`,
        ...statusActionOptions
      })
    );
  }

  if (toGenerate.readCollection) {
    rules.push(
      reducer({
        actionName: `Get${entity.name}Collection`,
        propsToUpdate:
          `${entityPropertyName}Collection:[]:${entityType}[],` +
          `${entityPropertyName}CollectionLoading:true,` +
          `${entityPropertyName}CollectionLoadError:null:HttpErrorResponse|null`,
        ...initialActionOptions
      }),
      reducer({
        actionName: `Get${entity.name}CollectionFail`,
        propsToUpdate:
          `${entityPropertyName}Collection:[]:${entityType}[],` +
          `${entityPropertyName}CollectionLoading:false,` +
          `${entityPropertyName}CollectionLoadError:action.payload:HttpErrorResponse|null`,
        ...statusActionOptions
      }),
      reducer({
        actionName: `Get${entity.name}CollectionSuccess`,
        propsToUpdate:
          `${entityPropertyName}Collection:action.payload:${entityType}[],` +
          `${entityPropertyName}CollectionLoading:false,` +
          `${entityPropertyName}CollectionLoadError:null:HttpErrorResponse|null`,
        ...statusActionOptions
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
        ...initialActionOptions
      }),
      reducer({
        actionName: `Create${entity.name}Fail`,
        propsToUpdate:
          `${entityPropertyName}Creating:false,` +
          `${entityPropertyName}CreateError:action.payload:HttpErrorResponse|null`,
        ...statusActionOptions
      }),
      reducer({
        actionName: `Create${entity.name}Success`,
        propsToUpdate:
          (toGenerate.readCollection
            ? `${entityPropertyName}Collection:state.${entityPropertyName}Collection.concat(action.payload):${entityType}[],`
            : '') +
          `${entityPropertyName}Creating:false,` +
          `${entityPropertyName}CreateError:null:HttpErrorResponse|null`,
        ...statusActionOptions
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
        ...initialActionOptions
      }),
      reducer({
        actionName: `Update${entity.name}Fail`,
        propsToUpdate:
          `${entityPropertyName}Updating:false,` +
          `${entityPropertyName}UpdateError:action.payload:HttpErrorResponse|null`,
        ...statusActionOptions
      }),
      reducer({
        actionName: `Update${entity.name}Success`,
        propsToUpdate:
          (toGenerate.readCollection
            ? `${entityPropertyName}Collection:state.${entityPropertyName}Collection.map(e => e.id === action.payload.id ? action.payload \\: e):${entityType}[],`
            : '') +
          `${entityPropertyName}Updating:false,` +
          `${entityPropertyName}UpdateError:null:HttpErrorResponse|null`,
        ...statusActionOptions
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
        ...initialActionOptions
      }),
      reducer({
        actionName: `Remove${entity.name}Fail`,
        propsToUpdate:
          `${entityPropertyName}Removing:false,` +
          `${entityPropertyName}RemoveError:action.payload:HttpErrorResponse|null`,
        ...statusActionOptions
      }),
      reducer({
        actionName: `Remove${entity.name}Success`,
        propsToUpdate:
          (toGenerate.readCollection
            ? `${entityPropertyName}Collection:state.${entityPropertyName}Collection.filter(e => e.id !== action.payload.id):${entityType}[],`
            : '') +
          `${entityPropertyName}Removing:false,` +
          `${entityPropertyName}RemoveError:null:HttpErrorResponse|null`,
        ...statusActionOptions
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
