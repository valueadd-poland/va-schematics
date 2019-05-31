import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { formatFiles } from '../../../../utils/rules/format-files';
import { DataServiceEmptyMethodSchema } from './data-service-empty-method-schema';
import { emptyMethodRule } from './rules/empty-method.rule';

export function dataServiceEmptyMethod(options: DataServiceEmptyMethodSchema): Rule {
  return (host: Tree, context: SchematicContext) => {
    return chain([
      emptyMethodRule(options),
      formatFiles({ skipFormat: options.skipFormat || false })
    ])(host, context);
  };
}
