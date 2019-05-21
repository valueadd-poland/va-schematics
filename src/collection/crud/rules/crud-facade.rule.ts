import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { Change, InsertChange } from '@schematics/angular/utility/change';
import { insert } from '../../../utils/ast.utils';
import { insertTypeImport } from '../../../utils/import.utils';
import { names, toPropertyName } from '../../../utils/name.utils';
import { findClassBodyInFile } from '../../../utils/ts.utils';
import { CrudOptions } from '../index';

function getSelectorTemplate(statePropertyName: string, queryName: string): string {
  const statePropertyNames = names(statePropertyName);
  return `\n${statePropertyNames.propertyName}$ = this.store.pipe(select(${queryName}.get${
    statePropertyNames.className
  }));`;
}

function getMethodTemplate(
  actionNamespace: string,
  actionName: string,
  payload: string = ''
): string {
  const actionNames = names(actionName);
  return `\n\n${actionNames.propertyName}(${payload ? 'data: ' + payload : ''}): void {
    this.store.dispatch(new ${actionNamespace}.${actionNames.className}(${payload ? 'data' : ''}));
  }`;
}

function createFacade(host: Tree, options: CrudOptions): any {
  const { toGenerate, isCollection, entity, stateDir, facade, actionsNamespace } = options;
  const entityPropertyName = toPropertyName(entity.name) + (isCollection ? 's' : '');
  const selectorChanges: Change[] = [];
  const methodsChanges: Change[] = [];
  const entityType = entity.name + (isCollection ? '[]' : '');
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
          actionsNamespace,
          `Get${entity.name}${isCollection ? 's' : ''}`,
          isCollection ? '' : 'string'
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
        getMethodTemplate(actionsNamespace, `Create${entity.name}`, entityType)
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
        getMethodTemplate(actionsNamespace, `Update${entity.name}`, entityType)
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
        getMethodTemplate(actionsNamespace, `Remove${entity.name}`, 'string')
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
    insertTypeImport(host, options.stateDir.facade, options.actionsNamespace);
    insertTypeImport(host, options.stateDir.facade, options.entity.name);

    return host;
  };
}
