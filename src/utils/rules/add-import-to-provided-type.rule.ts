import { Rule, Tree } from '@angular-devkit/schematics';
import { Change } from '@schematics/angular/utility/change';
import { buildRelativePath } from '@schematics/angular/utility/find-module';
import * as ts from 'typescript';
import { insert, insertImport, isImported } from '../ast.utils';
import { findTypeDeclarationFile } from '../find-type-declaration-file.util';
import { isBaseType, readIntoSourceFile } from '../ts.utils';

function createImport(
  sourceFile: ts.SourceFile,
  host: Tree,
  fileToEdit: string,
  type: string
): Change | null {
  if (isBaseType(type)) {
    return null;
  }

  const typeFile = findTypeDeclarationFile(host, type);

  if (typeFile) {
    const path = buildRelativePath(fileToEdit, typeFile).slice(0, -3);
    if (!isImported(sourceFile, type, path)) {
      return insertImport(sourceFile, fileToEdit, type, path);
    }
  }

  return null;
}

export function addImportToProvidedType(path: string, type: string): Rule {
  return (host: Tree) => {
    const sourceFile = readIntoSourceFile(host, path);
    const changes: Change[] = [];
    const types = type.split('|');

    types.forEach(t => {
      const change = createImport(sourceFile, host, path, t);

      if (change) {
        changes.push(change);
      }
    });

    insert(host, path, changes);
  };
}
