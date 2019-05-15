import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { insert, insertImport } from '../../../utils/ast.utils';
import { toPropertyName } from '../../../utils/name.utils';
import { readIntoSourceFile } from '../../../utils/ts.utils';
import { reducer } from '../../reducer';
import { CrudOptions } from '../index';

function createReducer(options: CrudOptions): Rule[] {
  const { toGenerate, isCollection, entity, actionPrefix, statePath } = options;
  const entityPropertyName = toPropertyName(entity.name) + (isCollection ? 's' : '');
  const entityType = entity.name + (isCollection ? '[]' : ' | null');
  const entityValue = isCollection ? '[]' : 'null';
  const rules: Rule[] = [];

  if (toGenerate.read) {
    rules.push(
      reducer({
        actionName: `Get${entity.name}${isCollection ? 's' : ''}`,
        propsToUpdate:
          `${entityPropertyName}:${entityValue}:${entityType},` +
          `${entityPropertyName}Loading:true,` +
          `${entityPropertyName}LoadError:null:HttpErrorResponse|null`,
        selectors: true,
        stateDir: statePath,
        skipFormat: true
      }),
      reducer({
        actionName: `Get${entity.name}${isCollection ? 's' : ''}Fail`,
        propsToUpdate:
          `${entityPropertyName}:${isCollection ? '[]' : 'null'}:${entityType},` +
          `${entityPropertyName}Loading:false,` +
          `${entityPropertyName}LoadError:action.payload:HttpErrorResponse|null`,
        selectors: false,
        stateDir: statePath,
        skipFormat: true
      }),
      reducer({
        actionName: `Get${entity.name}${isCollection ? 's' : ''}Success`,
        propsToUpdate:
          `${entityPropertyName}:action.payload:${entityType},` +
          `${entityPropertyName}Loading:false,` +
          `${entityPropertyName}LoadError:null:HttpErrorResponse|null`,
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
