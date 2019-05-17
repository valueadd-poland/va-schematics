import * as path from 'path';

export interface Names {
  className: string;
  fileName: string;
  name: string;
  propertyName: string;
}

/**
 * Build dictionary of names:
 */
export function names(name: string): Names {
  return {
    name,
    className: toClassName(name),
    propertyName: toPropertyName(name),
    fileName: toFileName(name)
  };
}

/**
 * hypenated to UpperCamelCase
 */
export function toClassName(str: string): string {
  return toCapitalCase(toPropertyName(str));
}

/**
 * Hypenated to lowerCamelCase
 */
export function toPropertyName(s: string): string {
  return s
    .replace(/(-|_|\.|\s)+(.)?/g, (_, __, chr) => (chr ? chr.toUpperCase() : ''))
    .replace(/^([A-Z])/, m => m.toLowerCase());
}

/**
 * Upper camelCase to lowercase, hypenated
 */
export function toFileName(s: string): string {
  return s
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[ _]/g, '-');
}

function toCapitalCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.substr(1);
}

export function splitPascalCase(word: string): string {
  return word.match(/($[a-z])|[A-Z][^A-Z]+/g)!.join(' ');
}

/**
 * Determine the parent directory for the ngModule specified
 * in the full-path option 'module'
 */
export function findModuleParent(modulePath: string): string {
  return path.dirname(modulePath);
}
