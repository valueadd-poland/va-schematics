import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { Change, InsertChange } from '@schematics/angular/utility/change';
import { insert } from '../../../utils/ast.utils';
import { insertTypeImport } from '../../../utils/import.utils';
import { names, toPropertyName } from '../../../utils/name.utils';
import { camelize } from '../../../utils/string.utils';
import { findClassBodyInFile } from '../../../utils/ts.utils';
import { getRequestPayloadClass } from '../../data-service/utils/request-payload.utils';
import { CrudOptions } from '../index';

function getSelectorTemplate(statePropertyName: string, queryName: string): string {
  const statePropertyNames = names(statePropertyName);
  return `\n${statePropertyNames.propertyName}$ = this.store.pipe(select(${queryName}.get${statePropertyNames.className}));`;
}

function getMethodTemplate(
  actionNamespace: string,
  actionName: string,
  payload: string = '',
  creators: boolean
): string {
  const actionNames = names(actionName);
  const toDispatch = creators
    ? `${actionNamespace}.${camelize(actionNames.className)}(${payload ? '{payload: data}' : ''})`
    : `new ${actionNamespace}.${actionNames.className}(${payload ? 'data' : ''})`;
  return `\n\n${actionNames.propertyName}(${payload ? 'data: ' + payload : ''}): void {
    this.store.dispatch(${toDispatch});
  }`;
}

function createFacade(host: Tree, options: CrudOptions): Change[] {
  const { toGenerate, entity, stateDir, facade, actionsImportName } = options;
  const entityPropertyName = toPropertyName(entity.name);
  const selectorChanges: Change[] = [];
  const methodsChanges: Change[] = [];
  const facadeClassBody = findClassBodyInFile(host, stateDir.facade);

  if (toGenerate.read) {
    selectorChanges.push(
      new InsertChange(
        stateDir.facade,
        facadeClassBody.getStart(),
        getSelectorTemplate(`${entityPropertyName}`, facade.queryName)
      ),
      new InsertChange(
        stateDir.facade,
        facadeClassBody.getStart(),
        getSelectorTemplate(`${entityPropertyName}Loading`, facade.queryName)
      ),
      new InsertChange(
        stateDir.facade,
        facadeClassBody.getStart(),
        getSelectorTemplate(`${entityPropertyName}LoadError`, facade.queryName)
      )
    );

    methodsChanges.push(
      new InsertChange(
        stateDir.facade,
        facadeClassBody.getEnd(),
        getMethodTemplate(
          actionsImportName,
          `Get${entity.name}`,
          getRequestPayloadClass(`Get${entity.name}`),
          options.creators
        )
      )
    );
  }

  if (toGenerate.readCollection) {
    selectorChanges.push(
      new InsertChange(
        stateDir.facade,
        facadeClassBody.getStart(),
        getSelectorTemplate(`${entityPropertyName}Collection`, facade.queryName)
      ),
      new InsertChange(
        stateDir.facade,
        facadeClassBody.getStart(),
        getSelectorTemplate(`${entityPropertyName}CollectionLoading`, facade.queryName)
      ),
      new InsertChange(
        stateDir.facade,
        facadeClassBody.getStart(),
        getSelectorTemplate(`${entityPropertyName}CollectionLoadError`, facade.queryName)
      )
    );

    methodsChanges.push(
      new InsertChange(
        stateDir.facade,
        facadeClassBody.getEnd(),
        getMethodTemplate(
          actionsImportName,
          `Get${entity.name}Collection`,
          getRequestPayloadClass(`Get${entity.name}Collection`),
          options.creators
        )
      )
    );
  }

  if (toGenerate.create) {
    selectorChanges.push(
      new InsertChange(
        stateDir.facade,
        facadeClassBody.getStart(),
        getSelectorTemplate(`${entityPropertyName}Creating`, facade.queryName)
      ),
      new InsertChange(
        stateDir.facade,
        facadeClassBody.getStart(),
        getSelectorTemplate(`${entityPropertyName}CreateError`, facade.queryName)
      )
    );

    methodsChanges.push(
      new InsertChange(
        stateDir.facade,
        facadeClassBody.getEnd(),
        getMethodTemplate(
          actionsImportName,
          `Create${entity.name}`,
          getRequestPayloadClass(`Create${entity.name}`),
          options.creators
        )
      )
    );
  }

  if (toGenerate.update) {
    selectorChanges.push(
      new InsertChange(
        stateDir.facade,
        facadeClassBody.getStart(),
        getSelectorTemplate(`${entityPropertyName}Updating`, facade.queryName)
      ),
      new InsertChange(
        stateDir.facade,
        facadeClassBody.getStart(),
        getSelectorTemplate(`${entityPropertyName}UpdateError`, facade.queryName)
      )
    );

    methodsChanges.push(
      new InsertChange(
        stateDir.facade,
        facadeClassBody.getEnd(),
        getMethodTemplate(
          actionsImportName,
          `Update${entity.name}`,
          getRequestPayloadClass(`Update${entity.name}`),
          options.creators
        )
      )
    );
  }

  if (toGenerate.delete) {
    selectorChanges.push(
      new InsertChange(
        stateDir.facade,
        facadeClassBody.getStart(),
        getSelectorTemplate(`${entityPropertyName}Removing`, facade.queryName)
      ),
      new InsertChange(
        stateDir.facade,
        facadeClassBody.getStart(),
        getSelectorTemplate(`${entityPropertyName}RemoveError`, facade.queryName)
      )
    );

    methodsChanges.push(
      new InsertChange(
        stateDir.facade,
        facadeClassBody.getEnd(),
        getMethodTemplate(
          actionsImportName,
          `Remove${entity.name}`,
          getRequestPayloadClass(`Remove${entity.name}`),
          options.creators
        )
      )
    );
  }

  return methodsChanges.concat(selectorChanges);
}

export function crudFacade(options: CrudOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.info(`Generating facade.`);

    insert(host, options.stateDir.facade, createFacade(host, options));

    insertTypeImport(host, options.stateDir.facade, options.facade.queryName);
    insertTypeImport(host, options.stateDir.facade, options.actionsImportName);
    insertTypeImport(host, options.stateDir.facade, options.entity.name);

    if (options.toGenerate.read) {
      const type = getRequestPayloadClass(`Get${options.entity.name}`);
      insertTypeImport(host, options.stateDir.facade, type);
    }
    if (options.toGenerate.readCollection) {
      const type = getRequestPayloadClass(`Get${options.entity.name}Collection`);
      insertTypeImport(host, options.stateDir.facade, type);
    }
    if (options.toGenerate.create) {
      const type = getRequestPayloadClass(`Create${options.entity.name}`);
      insertTypeImport(host, options.stateDir.facade, type);
    }
    if (options.toGenerate.update) {
      const type = getRequestPayloadClass(`Update${options.entity.name}`);
      insertTypeImport(host, options.stateDir.facade, type);
    }
    if (options.toGenerate.delete) {
      const type = getRequestPayloadClass(`Remove${options.entity.name}`);
      insertTypeImport(host, options.stateDir.facade, type);
    }

    return host;
  };
}
