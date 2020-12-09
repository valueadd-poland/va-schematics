import { SchematicsException, Tree } from '@angular-devkit/schematics';
import { Change, InsertChange } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { addSymbolToObject, findNode, findNodes, insert } from './ast.utils';
import { formatToCompare } from './string.utils';
import { findByIdentifier, readIntoSourceFile } from './ts.utils';

export interface VariableDeclaration {
  config?: {
    metadataField: 'providers' | 'declarations' | 'imports' | 'schemas' | 'aotSummaries';
    value: string;
    assign?: string;
    assignWithTypeCast?: boolean;
  };
  name: string;
  type: string;
}

export function configureTestingModule(
  host: Tree,
  filePath: string,
  variableDeclarations: VariableDeclaration[]
): void {
  const sourceFile = readIntoSourceFile(host, filePath);
  const describeFn = findByIdentifier<ts.CallExpression>(host, filePath, 'describe');
  const describeFnSecondArgument = describeFn.arguments[1];

  if (!describeFnSecondArgument) {
    throw new SchematicsException(
      `Expecting second argument in describe function call in ${filePath}.`
    );
  }

  const firstPunctuation = findNode(describeFnSecondArgument, ts.SyntaxKind.FirstPunctuation);

  if (!firstPunctuation) {
    throw new SchematicsException(
      `Expecting second argument in describe function to have a body in ${filePath}`
    );
  }

  const blockNode = firstPunctuation.parent;
  const syntaxList = findNode(blockNode, ts.SyntaxKind.SyntaxList);

  if (!syntaxList) {
    throw new SchematicsException(`Expecting syntax list in describe function in ${filePath}`);
  }

  const variableDeclarationLists: ts.VariableDeclarationList[] = syntaxList
    .getChildren()
    .filter(n => n.kind === ts.SyntaxKind.VariableStatement)
    .map(n => findNode(n, ts.SyntaxKind.VariableDeclarationList) as ts.VariableDeclarationList);

  const beforeEachFn = findByIdentifier<ts.CallExpression>(host, filePath, 'beforeEach');
  const beforeEachFnArgument = beforeEachFn.arguments[0];
  const binaryExpressions = findNodes(beforeEachFnArgument, ts.SyntaxKind.BinaryExpression);

  const ctm = findByIdentifier<ts.PropertyAccessExpression>(
    host,
    filePath,
    'configureTestingModule'
  );
  const ctmCallExpression = ctm.parent as ts.CallExpression;
  const ctmModuleDef = ctmCallExpression.arguments[0] as ts.ObjectLiteralExpression;

  const propertyAssigmentChanges: Change[] = [];
  const variableChanges: Change[] = [];
  const moduleChanges: Change[] = [];

  variableDeclarations.forEach(variable => {
    if (variable.config) {
      moduleChanges.push(
        ...addSymbolToObject(
          sourceFile,
          ctmModuleDef,
          filePath,
          variable.config.metadataField,
          variable.config.value
        )
      );

      const assign = variable.config.assign;
      if (
        assign &&
        !binaryExpressions.find(n =>
          formatToCompare(n.getText()).includes(`TestBed.inject(${assign})`)
        )
      ) {
        propertyAssigmentChanges.push(
          new InsertChange(
            filePath,
            beforeEachFnArgument.getEnd() - 1,
            `${variable.name} = TestBed.inject(${variable.config.assign})${
              variable.config.assignWithTypeCast ? ' as ' + variable.type : ''
            };`
          )
        );
      }
    }

    if (
      !variableDeclarationLists.find(
        vdl => !!vdl.declarations.find(d => d.name.getText() === variable.name)
      )
    ) {
      variableChanges.push(
        new InsertChange(
          filePath,
          firstPunctuation.getEnd(),
          `\nlet ${variable.name}: ${variable.type};`
        )
      );
    }
  });

  insert(host, filePath, propertyAssigmentChanges);
  insert(host, filePath, moduleChanges);
  insert(host, filePath, variableChanges);
}
