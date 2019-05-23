import { Tree } from '@angular-devkit/schematics';
import { insertTypeImport } from '../../../utils/import.utils';
import { MethodDeclarationOptions } from '../../../utils/method.utils';
import { parseTypedProperties } from '../../../utils/options-parsing.utils';
import { parseType } from '../../../utils/ts.utils';
import { DataServiceSchema } from '../data-service-schema';

export function importMethodTypes(
  host: Tree,
  options: DataServiceSchema & MethodDeclarationOptions & { httpResponse?: string },
  path: string
): void {
  const returnTypes = parseType(options.methodReturnType || '').filter(
    t => ['Observable', 'Subject'].indexOf(t) === -1
  );
  returnTypes.forEach(type => insertTypeImport(host, path, type));

  const types = parseTypedProperties(options.methodProperties || '').map(p => p.type);
  types.forEach(type => insertTypeImport(host, path, type));

  const responseTypes = parseType(options.httpResponse || '').filter(
    t => ['Observable', 'Subject'].indexOf(t) === -1
  );
  responseTypes.forEach(type => insertTypeImport(host, path, type));
}
