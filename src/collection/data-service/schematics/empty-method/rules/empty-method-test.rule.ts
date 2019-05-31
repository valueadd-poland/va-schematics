import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { Change, InsertChange, NoopChange } from '@schematics/angular/utility/change';
import { findSpecDefinition, insert } from '../../../../../utils/ast.utils';
import { getSpecPath } from '../../../../../utils/file-parsing.utils';
import { findClassNameInFile, readIntoSourceFile } from '../../../../../utils/ts.utils';
import { importMethodTypes } from '../../../utils/import-method-types.util';
import { getServiceTestTemplate } from '../../../utils/template.utils';
import { DataServiceEmptyMethodSchema } from '../data-service-empty-method-schema';

function getMethodTestTemplate(options: DataServiceEmptyMethodSchema): string {
  return `
  describe('#${options.methodName}', () => {
    it('should work', () => {
      expect(true).toBeTruthy();
    });
  });
  `;
}

function createMethodTest(
  host: Tree,
  context: SchematicContext,
  options: DataServiceEmptyMethodSchema
): Change {
  const dataServiceSpec = getSpecPath(options.dataService);
  const specDefinition = findSpecDefinition(readIntoSourceFile(host, dataServiceSpec));

  if (!specDefinition) {
    // The function block does not exist, there is nothing to change
    context.logger.warn(`The spec definition not found in ${dataServiceSpec}, test not added.`);
    return new NoopChange();
  }

  return new InsertChange(
    dataServiceSpec,
    specDefinition.getEnd() - 1,
    getMethodTestTemplate(options)
  );
}

export function emptyMethodTestRule(options: DataServiceEmptyMethodSchema): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.info(`Generating an empty test for ${options.methodName} method.`);
    const dataServiceSpec = getSpecPath(options.dataService);

    if (!host.exists(dataServiceSpec)) {
      const serviceName = findClassNameInFile(host, options.dataService);
      host.create(dataServiceSpec, getServiceTestTemplate(serviceName, options));
    }

    insert(host, dataServiceSpec, [createMethodTest(host, context, options)]);
    importMethodTypes(host, options, dataServiceSpec);

    return host;
  };
}
