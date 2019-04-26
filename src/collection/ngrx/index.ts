import {
  apply,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  Rule,
  SchematicContext,
  template,
  Tree,
  url
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import * as path from 'path';
import { names, toFileName } from '../../utils/name.utils';
import { formatFiles } from '../../utils/rules/format-files';
import { NgrxSchema } from './ngrx-schema.interface';
import { addExportsToBarrel, addImportsToModule, RequestContext } from './rules';

function addInstallTask(_: any, context: SchematicContext): void {
  context.addTask(new NodePackageInstallTask());
}

function normalizeOptions(options: NgrxSchema): NgrxSchema {
  return {
    ...options,
    directory: toFileName(options.directory || '')
  };
}

function generateNgrxFilesFromTemplates(options: NgrxSchema): Rule {
  const name = options.name;
  const moduleDir = path.dirname(options.module);
  const excludeFacade = (p: any) => p.match(/^((?!facade).)*$/);

  const templateSource = apply(url('./files'), [
    !options.facade ? filter(excludeFacade) : noop(),
    template({ ...options, tmpl: '', ...names(name) }),
    move(moduleDir)
  ]);

  return mergeWith(templateSource);
}

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function ngrx(options: NgrxSchema): Rule {
  return (host: Tree, context: SchematicContext) => {
    options = normalizeOptions(options);

    if (!options.module) {
      throw new Error(`The required --module option must be passed`);
    } else if (!host.exists(options.module)) {
      throw new Error(`Path does not exist: ${options.module}`);
    }

    const requestContext: RequestContext = {
      featureName: options.name,
      moduleDir: path.dirname(options.module),
      options,
      host
    };

    const fileGeneration = !options.onlyEmptyRoot ? [generateNgrxFilesFromTemplates(options)] : [];

    const moduleModification = !options.onlyAddFiles
      ? [addImportsToModule(requestContext), addExportsToBarrel(requestContext.options)]
      : [];
    const packageJsonModification = !options.skipPackageJson ? [addInstallTask] : [];

    return chain([
      ...fileGeneration,
      ...moduleModification,
      ...packageJsonModification,
      formatFiles({ skipFormat: options.skipFormat || false })
    ])(host, context);
  };
}
