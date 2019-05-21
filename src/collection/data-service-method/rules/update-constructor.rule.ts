import { Rule, Tree } from '@angular-devkit/schematics';
import { insert, insertImport } from '../../../utils/ast.utils';
import { insertConstructorArguments } from '../../../utils/constructor.utils';
import { readIntoSourceFile } from '../../../utils/ts.utils';
import { DataServiceMethodSchema } from '../data-service-method-schema.interface';

export function updateConstructor(options: DataServiceMethodSchema): Rule {
  return (host: Tree) => {
    const sourceFile = readIntoSourceFile(host, options.dataServiceFilePath);

    insertConstructorArguments(host, options.dataServiceFilePath, [
      {
        accessModifier: 'private',
        name: 'http',
        type: 'HttpClient'
      }
    ]);

    insert(host, options.dataServiceFilePath, [
      insertImport(sourceFile, options.dataServiceFilePath, 'HttpClient', '@angular/common/http')
    ]);

    return host;
  };
}
