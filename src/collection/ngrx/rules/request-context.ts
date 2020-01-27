import { Tree } from '@angular-devkit/schematics';
import * as path from 'path';
import * as stringUtils from '../../../utils/string.utils';
import { NgrxSchema } from '../ngrx-schema.interface';

/**
 * Schematic request context
 */
export interface RequestContext {
  featureName: string;
  host?: Tree;
  moduleDir: string;
  options: NgrxSchema;
}

export function buildNameToNgrxFile(context: RequestContext, suffice: string): string {
  return path.join(
    context.moduleDir,
    context.options.directory || '',
    `${stringUtils.dasherize(context.featureName)}.${suffice}`
  );
}
