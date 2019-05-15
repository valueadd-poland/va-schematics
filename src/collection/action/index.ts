import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { insertTypeImport } from '../../utils/import.utils';
import { parseStateDir } from '../../utils/options-parsing.utils';
import { formatFiles } from '../../utils/rules/format-files';
import { ActionSchema } from './action-schema.interface';
import { addActionClassDeclaration } from './rules/add-action-class-declaration.rule';
import { addActionClassToCollectiveType } from './rules/add-action-class-to-collective-type.rule';
import { addActionType } from './rules/add-action-type.rule';

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function action(options: ActionSchema): Rule {
  return (host: Tree, context: SchematicContext) => {
    if (!options.name || !options.stateDir || !options.prefix) {
      throw new Error(`Please provide name, stateDir and prefix.`);
    }

    if (!host.getDir(options.stateDir)) {
      throw new Error(`Specified state directory path (${options.stateDir}) does not exist.`);
    }
    const stateDir = parseStateDir(options.stateDir, host);

    const rules: Rule[] = [];

    if (options.payload) {
      insertTypeImport(host, stateDir.actions, options.payload);
    }

    rules.push(
      ...[
        addActionType(options, stateDir),
        addActionClassDeclaration(options, stateDir),
        addActionClassToCollectiveType(options, stateDir),
        formatFiles({ skipFormat: !!options.skipFormat })
      ]
    );

    return chain(rules)(host, context);
  };
}
