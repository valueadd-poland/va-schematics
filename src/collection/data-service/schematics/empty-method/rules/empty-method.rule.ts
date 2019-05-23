import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { Change, InsertChange, NoopChange } from '@schematics/angular/utility/change';
import { insert } from '../../../../../utils/ast.utils';
import { methodExists } from '../../../../../utils/class.utils';
import { methodDeclarationTemplate } from '../../../../../utils/method.utils';
import { findClassBodyInFile } from '../../../../../utils/ts.utils';
import { importMethodTypes } from '../../../utils/import-method-types.util';
import { DataServiceEmptyMethodSchema } from '../data-service-empty-method-schema';
import { emptyMethodTestRule } from './empty-method-test.rule';

function createMethod(
  host: Tree,
  context: SchematicContext,
  options: DataServiceEmptyMethodSchema
): Change {
  const { dataService, methodName, methodProperties, methodReturnType } = options;
  const classBody = findClassBodyInFile(host, dataService);

  // Check if the method already exists.
  if (methodExists(classBody, methodName)) {
    // The declaration exists, so we have nothing to do.
    context.logger.warn(`${methodName} already exists in ${dataService}.`);
    return new NoopChange();
  }

  return new InsertChange(
    dataService,
    classBody.getEnd(),
    methodDeclarationTemplate({
      methodName,
      methodProperties,
      methodReturnType
    })
  );
}

export function emptyMethodRule(options: DataServiceEmptyMethodSchema): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.info(`Generating an empty method named ${options.methodName}.`);

    insert(host, options.dataService, [createMethod(host, context, options)]);
    importMethodTypes(host, options, options.dataService);

    return chain(options.skipTests ? [] : [emptyMethodTestRule(options)])(host, context);
  };
}
