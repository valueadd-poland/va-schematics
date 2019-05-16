import { parseType } from './ts.utils';

describe('ts utils', () => {
  describe('#parseType', () => {
    it(`should parse type`, () => {
      const types = parseType('boolean');

      expect(types).toEqual(['boolean']);
    });

    it(`should parse type`, () => {
      const types = parseType('TestModel[]');

      expect(types).toEqual(['TestModel[]']);
    });

    it(`should parse type`, () => {
      const types = parseType('ApiError<CustomResponse>');

      expect(types).toEqual(['ApiError', 'CustomResponse']);
    });

    it(`should parse type`, () => {
      const types = parseType('ApiError<CustomResponse | SecondResponse> | TestClass<Test>');

      expect(types).toEqual(['ApiError', 'CustomResponse', 'SecondResponse', 'TestClass', 'Test']);
    });
  });
});
