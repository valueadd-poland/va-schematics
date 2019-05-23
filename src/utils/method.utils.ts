export interface MethodDeclarationOptions {
  methodName: string;
  methodProperties?: string;
  methodReturnType?: string;
}

export function methodDeclarationTemplate(
  options: MethodDeclarationOptions,
  methodBody?: string
): string {
  const { methodName, methodProperties, methodReturnType } = options;

  return `\n
  ${methodName}(${methodProperties || ''}): ${methodReturnType || 'void'} {
  ${methodBody || ''}
  }\n`;
}
