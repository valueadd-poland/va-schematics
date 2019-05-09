import { Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';
import { Change, InsertChange } from '@schematics/angular/utility/change';

import * as ts from 'typescript';
import {
  addSymbolToObject,
  findDescribeBlockNode,
  findNode,
  findNodesInBlock,
  getSourceNodes,
  insert,
  insertImport
} from '../../../utils/ast.utils';
import { parsePropsToUpdate } from '../../../utils/options-parsing.utils';
import { findDeclarationNodeByPartialName, readIntoSourceFile } from '../../../utils/ts.utils';
import { DataServiceMethodSchema } from '../data-service-method-schema.interface';

function addVariableDeclarations(
  specPath: string,
  dataServiceName: string,
  describeFirstPunctuation: ts.Node,
  variableDeclarations: ts.VariableDeclaration[]
): Change[] {
  const changes: Change[] = [];

  if (!variableDeclarations.find(vd => vd.name.getText() === 'service')) {
    changes.push(
      new InsertChange(
        specPath,
        describeFirstPunctuation.end + 1,
        `let service: ${dataServiceName};\n`
      )
    );
  }

  if (!variableDeclarations.find(vd => vd.name.getText() === 'httpMock')) {
    changes.push(
      new InsertChange(
        specPath,
        describeFirstPunctuation.end + 1,
        `let httpMock: HttpTestingController;\n\n`
      )
    );
  }

  return changes;
}

function addTestBedConfiguration(
  sourceFile: ts.SourceFile,
  specPath: string,
  dataServiceName: string
): Change[] {
  const nodes = getSourceNodes(sourceFile);
  const configureTestingModuleIdentifier = nodes.find(
    n => n.kind === ts.SyntaxKind.Identifier && n.getText() === 'configureTestingModule'
  );

  if (!configureTestingModuleIdentifier) {
    throw new SchematicsException(
      `TestBed.configureTestingModule in beforeEach function not found in ${specPath}`
    );
  }

  const callExpression = configureTestingModuleIdentifier.parent.parent;
  const moduleDef = findNode<ts.ObjectLiteralExpression>(
    callExpression,
    ts.SyntaxKind.ObjectLiteralExpression
  );

  if (!moduleDef) {
    throw new SchematicsException(
      `module def property in TestBed.configureTestingModule not found in ${specPath}`
    );
  }

  const changes: Change[] = [];
  const beforeEach = moduleDef.parent.parent.parent;
  const beforeEachText = beforeEach.getText();
  const beforeFn = moduleDef.parent.parent as ts.ArrowFunction;

  if (!beforeEachText.includes(`TestBed.get(${dataServiceName})`)) {
    changes.push(
      new InsertChange(specPath, beforeFn.end, `\n\nservice = TestBed.get(${dataServiceName});`)
    );
  }

  if (!beforeEachText.includes(`TestBed.get(HttpTestingController)`)) {
    changes.push(
      new InsertChange(specPath, beforeFn.end, `\nhttpMock = TestBed.get(HttpTestingController);`)
    );
  }

  if (beforeFn.kind === ts.SyntaxKind.ArrowFunction) {
    const token = beforeFn
      .getChildren()
      .find(n => n.kind === ts.SyntaxKind.EqualsGreaterThanToken) as ts.EqualsGreaterThanToken;
    changes.push(new InsertChange(specPath, token.end + 1, '{'));
    changes.push(new InsertChange(specPath, beforeFn.end, '}'));
  }

  const afterEachIdentifier = nodes.find(
    n => n.kind === ts.SyntaxKind.Identifier && n.getText() === 'afterEach'
  );

  if (!afterEachIdentifier) {
    changes.push(
      new InsertChange(
        specPath,
        beforeEach.end + 2,
        `\nafterEach(() => {\nhttpMock.verify();\n});\n`
      )
    );
  }

  return [
    insertImport(sourceFile, specPath, 'HttpTestingController', '@angular/common/http/testing'),
    ...addSymbolToObject(sourceFile, moduleDef, specPath, 'imports', 'HttpClientTestingModule'),
    ...changes
  ];
}

function getTestTemplate(options: DataServiceMethodSchema): string {
  const { name, properties, mapResponse, httpMethod } = options;
  let response = '{}';
  let callProps = '';

  if (mapResponse) {
    response = '{';
    const parts = mapResponse.split('.');
    parts.forEach(part => {
      response += `${part}: {`;
    });
    parts.forEach(() => {
      response += '}';
    });
    response += '}';
  }

  if (properties) {
    const props = parsePropsToUpdate(properties);
    props.forEach((prop, index) => {
      callProps += '{} as any' + (index !== props.length - 1 ? ',' : '');
    });
  }

  return `
  describe('#${name}', () => {
    it('should be successful', () => {
      const response = ${response} as any;
      
      service.${name}(${callProps}).subscribe(res => {
        expect(res).toBe(response${mapResponse ? '.' + mapResponse : ''});
      });

      const req = httpMock.expectOne(service.endpoints.${name});
      expect(req.request.method).toBe('${httpMethod}');
      req.flush(response);
    });

    it('should throw error', () => {
      const response = {};

      service.${name}(${callProps}).subscribe(
        () => {
          fail('expecting error');
        },
        err => {
          expect(err.error).toBe(response);
        }
      );

      const req = httpMock.expectOne(service.endpoints.${name});
      expect(req.request.method).toBe('${httpMethod}');
      req.flush(response, {
        status: 400,
        statusText: 'Bad request'
      });
    });
  });
  `;
}

function addTest(
  specPath: string,
  describeBlock: ts.Block,
  options: DataServiceMethodSchema
): Change {
  return new InsertChange(specPath, describeBlock.end - 1, getTestTemplate(options));
}

export function addMethodSpec(options: DataServiceMethodSchema): Rule {
  return (host: Tree, context: SchematicContext) => {
    const specPath = options.dataServiceFilePath.slice(0, -3) + '.spec.ts';

    if (!host.get(specPath)) {
      context.logger.info('There is no data service spec file. Skipping.');
      return host;
    }
    const dataServiceSourceFile = readIntoSourceFile(host, options.dataServiceFilePath);
    const sourceFile = readIntoSourceFile(host, specPath);
    const describeBlockNode = findDescribeBlockNode(sourceFile);

    if (!describeBlockNode) {
      throw new SchematicsException(`describe node not found in ${specPath}`);
    }

    const describeFirstPunctuation = describeBlockNode
      .getChildren()
      .find(n => n.kind === ts.SyntaxKind.FirstPunctuation);

    if (!describeFirstPunctuation) {
      throw new SchematicsException(`expecting { in describe block declaration in ${specPath}`);
    }

    const dataServiceDeclaration = findDeclarationNodeByPartialName<ts.ClassDeclaration>(
      dataServiceSourceFile,
      'DataService'
    );

    if (!dataServiceDeclaration) {
      throw new SchematicsException(
        `can not find DataService declaration in ${options.dataServiceFilePath}`
      );
    }
    const dataServiceDeclarationName = dataServiceDeclaration.name;

    if (!dataServiceDeclarationName) {
      throw new SchematicsException(
        `can not find DataService declaration in ${options.dataServiceFilePath}`
      );
    }
    const dataServiceName = dataServiceDeclarationName.getText();

    const variableDeclarations = findNodesInBlock<ts.VariableDeclaration>(
      describeBlockNode,
      ts.SyntaxKind.VariableDeclaration
    );

    insert(host, specPath, [
      ...addVariableDeclarations(
        specPath,
        dataServiceName,
        describeFirstPunctuation,
        variableDeclarations
      ),
      ...addTestBedConfiguration(sourceFile, specPath, dataServiceName),
      addTest(specPath, describeBlockNode, options)
    ]);

    return host;
  };
}
