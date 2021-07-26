import { Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';
import { Change, InsertChange } from '@schematics/angular/utility/change';
import { findDescribeBlockNode, insert } from '../../../utils/ast.utils';
import { insertTypeImport } from '../../../utils/import.utils';
import { names } from '../../../utils/name.utils';
import { camelize } from '../../../utils/string.utils';
import { readIntoSourceFile } from '../../../utils/ts.utils';
import { CrudOptions } from '../index';

function getMethodTestTemplate(
  options: CrudOptions,
  actionName: string,
  method: string,
  creators: boolean,
  methodPayload = true
): string {
  const { actionsImportName } = options;
  const actionNames = names(actionName);
  const actionToDispatch = creators
    ? `${actionsImportName}.${camelize(actionNames.className)}(${methodPayload ? '{payload}' : ''})`
    : `new ${actionsImportName}.${actionNames.className}(${methodPayload ? 'payload' : ''})`;

  return `\n\ndescribe('#${method}', () => {
    test('should dispatch ${actionsImportName}.${
    creators ? camelize(actionNames.className) : actionNames.className
  } action', () => {
      ${methodPayload ? 'const payload = {} as any;' : ''}
      const action = ${actionToDispatch};

      facade.${method}(${methodPayload ? 'payload' : ''});
      expect(store.dispatch).toHaveBeenCalledWith(action);
    });
  });`;
}

function createCrudFacadeSpec(host: Tree, options: CrudOptions): Change[] {
  const { stateDir, toGenerate, entity } = options;
  const changes: Change[] = [];
  const sourceFile = readIntoSourceFile(host, stateDir.facadeSpec);
  const firstDescribeBlock = findDescribeBlockNode(sourceFile);

  if (!firstDescribeBlock) {
    throw new SchematicsException(`Describe block not found in ${stateDir.facadeSpec}`);
  }

  const describeBlock = findDescribeBlockNode(firstDescribeBlock);

  if (!describeBlock) {
    throw new SchematicsException(`Describe block not found in ${stateDir.facadeSpec}`);
  }

  const pos = describeBlock.getEnd() - 1;

  if (toGenerate.read) {
    changes.push(
      new InsertChange(
        stateDir.facadeSpec,
        pos,
        getMethodTestTemplate(options, `Get${entity.name}`, `get${entity.name}`, options.creators)
      )
    );
  }

  if (toGenerate.readCollection) {
    changes.push(
      new InsertChange(
        stateDir.facadeSpec,
        pos,
        getMethodTestTemplate(
          options,
          `Get${entity.name}Collection`,
          `get${entity.name}Collection`,
          options.creators
        )
      )
    );
  }

  if (toGenerate.create) {
    changes.push(
      new InsertChange(
        stateDir.facadeSpec,
        pos,
        getMethodTestTemplate(
          options,
          `Create${entity.name}`,
          `create${entity.name}`,
          options.creators
        )
      )
    );
  }

  if (toGenerate.update) {
    changes.push(
      new InsertChange(
        stateDir.facadeSpec,
        pos,
        getMethodTestTemplate(
          options,
          `Update${entity.name}`,
          `update${entity.name}`,
          options.creators
        )
      )
    );
  }

  if (toGenerate.delete) {
    changes.push(
      new InsertChange(
        stateDir.facadeSpec,
        pos,
        getMethodTestTemplate(
          options,
          `Remove${entity.name}`,
          `remove${entity.name}`,
          options.creators
        )
      )
    );
  }

  return changes;
}

export function crudFacadeSpec(options: CrudOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    const { actionsImportName, stateDir } = options;

    insert(host, stateDir.facadeSpec, createCrudFacadeSpec(host, options));

    insertTypeImport(host, stateDir.facadeSpec, actionsImportName);

    return host;
  };
}
