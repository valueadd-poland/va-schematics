import { Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';
import { Change, InsertChange } from '@schematics/angular/utility/change';
import { findDescribeBlockNode, insert } from '../../../utils/ast.utils';
import { insertTypeImport } from '../../../utils/import.utils';
import { names } from '../../../utils/name.utils';
import { readIntoSourceFile } from '../../../utils/ts.utils';
import { CrudOptions } from '../index';

function getMethodTestTemplate(
  options: CrudOptions,
  actionName: string,
  method: string,
  methodPayload = true
): string {
  const { actionsAliasName } = options;
  const actionNames = names(actionName);

  return `\n\ndescribe('#${method}', () => {
    test('should dispatch ${actionsAliasName}.${actionNames.className} action', () => {
      ${methodPayload ? 'const payload = {} as any;' : ''}
      const action = new ${actionsAliasName}.${actionNames.className}(${
    methodPayload ? 'payload' : ''
  });

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
        getMethodTestTemplate(options, `Get${entity.name}`, `get${entity.name}`)
      )
    );
  }

  if (toGenerate.readCollection) {
    changes.push(
      new InsertChange(
        stateDir.facadeSpec,
        pos,
        getMethodTestTemplate(options, `Get${entity.name}Collection`, `get${entity.name}Collection`)
      )
    );
  }

  if (toGenerate.create) {
    changes.push(
      new InsertChange(
        stateDir.facadeSpec,
        pos,
        getMethodTestTemplate(options, `Create${entity.name}`, `create${entity.name}`)
      )
    );
  }

  if (toGenerate.update) {
    changes.push(
      new InsertChange(
        stateDir.facadeSpec,
        pos,
        getMethodTestTemplate(options, `Update${entity.name}`, `update${entity.name}`)
      )
    );
  }

  if (toGenerate.delete) {
    changes.push(
      new InsertChange(
        stateDir.facadeSpec,
        pos,
        getMethodTestTemplate(options, `Remove${entity.name}`, `remove${entity.name}`)
      )
    );
  }

  return changes;
}

export function crudFacadeSpec(options: CrudOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    const { actionsAliasName, stateDir } = options;

    insert(host, stateDir.facadeSpec, createCrudFacadeSpec(host, options));

    insertTypeImport(host, stateDir.facadeSpec, actionsAliasName);

    return host;
  };
}
