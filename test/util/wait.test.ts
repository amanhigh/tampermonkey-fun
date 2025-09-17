import { WaitUtil } from '../../src/util/wait';

describe('WaitUtil', () => {
  let waitUtil: WaitUtil;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    waitUtil = new WaitUtil();
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Input validation for waitEE', () => {
    test('should log error and return early for null selector', () => {
      const callback = jest.fn();
      waitUtil.waitEE(null as any, callback);

      expect(consoleSpy).toHaveBeenCalledWith('Invalid selector provided to waitEE');
      expect(callback).not.toHaveBeenCalled();
    });

    test('should log error and return early for undefined selector', () => {
      const callback = jest.fn();
      waitUtil.waitEE(undefined as any, callback);

      expect(consoleSpy).toHaveBeenCalledWith('Invalid selector provided to waitEE');
      expect(callback).not.toHaveBeenCalled();
    });

    test('should log error and return early for empty string selector', () => {
      const callback = jest.fn();
      waitUtil.waitEE('', callback);

      expect(consoleSpy).toHaveBeenCalledWith('Invalid selector provided to waitEE');
      expect(callback).not.toHaveBeenCalled();
    });

    test('should log error and return early for non-string selector', () => {
      const callback = jest.fn();
      waitUtil.waitEE(123 as any, callback);

      expect(consoleSpy).toHaveBeenCalledWith('Invalid selector provided to waitEE');
      expect(callback).not.toHaveBeenCalled();
    });

    test('should log error and return early for boolean selector', () => {
      const callback = jest.fn();
      waitUtil.waitEE(true as any, callback);

      expect(consoleSpy).toHaveBeenCalledWith('Invalid selector provided to waitEE');
      expect(callback).not.toHaveBeenCalled();
    });

    test('should log error and return early for object selector', () => {
      const callback = jest.fn();
      waitUtil.waitEE({} as any, callback);

      expect(consoleSpy).toHaveBeenCalledWith('Invalid selector provided to waitEE');
      expect(callback).not.toHaveBeenCalled();
    });

    test('should log error and return early for array selector', () => {
      const callback = jest.fn();
      waitUtil.waitEE([] as any, callback);

      expect(consoleSpy).toHaveBeenCalledWith('Invalid selector provided to waitEE');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Input validation for waitInput', () => {
    test('should log error and return early for undefined input value', () => {
      waitUtil.waitInput('.input-selector', undefined as any);

      expect(consoleSpy).toHaveBeenCalledWith('Input value must be provided to waitInput');
    });
  });

  describe('Method parameter validation patterns', () => {
    test('waitEE should validate selector before processing callback', () => {
      const callback = jest.fn();

      // Test that invalid selector stops execution before callback processing
      waitUtil.waitEE(null as any, callback);
      waitUtil.waitEE('', callback);
      waitUtil.waitEE(123 as any, callback);

      expect(callback).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error message consistency', () => {
    test('should use consistent error message format for invalid selectors', () => {
      const invalidSelectors = [null, undefined, '', 123, true, {}, []];

      invalidSelectors.forEach((selector) => {
        jest.clearAllMocks();
        waitUtil.waitEE(selector as any, jest.fn());

        expect(consoleSpy).toHaveBeenCalledWith('Invalid selector provided to waitEE');
      });
    });
  });

  describe('Type safety validation', () => {
    test('should handle typeof checks for input validation', () => {
      // Test that typeof undefined specifically triggers error
      waitUtil.waitInput('.selector', undefined as any);

      expect(consoleSpy).toHaveBeenCalledWith('Input value must be provided to waitInput');
    });
  });
});
