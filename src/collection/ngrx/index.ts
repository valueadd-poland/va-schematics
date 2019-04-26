import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NgrxSchema } from './ngrx-schema.interface';

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function ngrx(options: NgrxSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.info(JSON.stringify(options));
    return tree;
  };
}
