import { createActionAliasName, createActionImportAlias } from './naming.utils';

describe('naming utils', () => {
  describe('createActionImportAlias', () => {
    const actionPath = '/libs/test/lib/+state/auth.actions.ts';
    it('create proper import alias', () => {
      expect(createActionImportAlias(actionPath)).toBe('* as fromAuthActions');
    });

    it('create proper action alias name', () => {
      expect(createActionAliasName(actionPath)).toBe('fromAuthActions');
    });
  });
});
