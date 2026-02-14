import { ObserveUtil } from '../../src/util/observer';

// Mock MutationObserver
let mockMutationCallback: ((mutations: any[]) => void) | null = null;

const mockMutationObserver = {
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => []),
};

const mockMutationObserverConstructor = jest.fn((callback) => {
  mockMutationCallback = callback;
  return mockMutationObserver;
});

Object.defineProperty(global, 'MutationObserver', {
  value: mockMutationObserverConstructor,
  writable: true,
});

// Mock Element
const mockElement = {
  textContent: '',
  nodeType: 1,
  nodeName: 'DIV',
};

// Mock Element constructor for instanceof checks
const mockElementConstructor = function () {};
Object.defineProperty(global, 'Element', {
  value: mockElementConstructor,
  writable: true,
});

// Make mockElement an instance of Element
Object.setPrototypeOf(mockElement, mockElementConstructor.prototype);


describe('ObserveUtil', () => {
  let observeUtil: ObserveUtil;
  let mockTarget: Element;
  let mockCallback: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    observeUtil = new ObserveUtil();
    mockTarget = mockElement as any;
    mockCallback = jest.fn();
    mockMutationCallback = null;
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(observeUtil).toBeInstanceOf(ObserveUtil);
    });
  });

  describe('attributeObserver method', () => {
    it('should create MutationObserver with correct configuration', () => {
      const result = observeUtil.attributeObserver(mockTarget, mockCallback);

      expect(mockMutationObserverConstructor).toHaveBeenCalledWith(expect.any(Function));
      expect(mockMutationObserver.observe).toHaveBeenCalledWith(mockTarget, {
        subtree: true,
        attributes: true,
        characterData: true,
      });
      expect(result).toBe(mockMutationObserver);
    });

    it('should call callback when mutations occur', () => {
      observeUtil.attributeObserver(mockTarget, mockCallback);

      // Simulate mutations using the captured callback
      if (mockMutationCallback) {
        const mockMutations = [{ type: 'attributes', target: mockTarget }];

        mockMutationCallback(mockMutations);
        expect(mockCallback).toHaveBeenCalled();
      }
    });

    it('should track text content changes and fire callback', () => {
      mockTarget.textContent = 'initial text';

      observeUtil.attributeObserver(mockTarget, mockCallback);

      if (mockMutationCallback) {
        // Simulate text change
        mockTarget.textContent = 'changed text';
        const mockMutations = [{ type: 'characterData', target: mockTarget }];

        mockMutationCallback(mockMutations);

        expect(mockCallback).toHaveBeenCalled();
      }
    });

    it('should handle childList mutations for text tracking', () => {
      mockTarget.textContent = 'original';

      observeUtil.attributeObserver(mockTarget, mockCallback);

      if (mockMutationCallback) {
        mockTarget.textContent = 'updated';
        const mockMutations = [{ type: 'childList', target: mockTarget }];

        mockMutationCallback(mockMutations);

        expect(mockCallback).toHaveBeenCalled();
      }
    });

    it('should throw error for invalid target', () => {
      expect(() => {
        observeUtil.attributeObserver(null as any, mockCallback);
      }).toThrow('Invalid target element provided to attributeObserver');
    });

    it('should throw error for non-Element target', () => {
      const nonElement = { nodeType: 3 }; // Text node

      expect(() => {
        observeUtil.attributeObserver(nonElement as any, mockCallback);
      }).toThrow('Invalid target element provided to attributeObserver');
    });

    it('should handle MutationObserver constructor errors', () => {
      mockMutationObserverConstructor.mockImplementationOnce(() => {
        throw new Error('MutationObserver not supported');
      });

      expect(() => {
        observeUtil.attributeObserver(mockTarget, mockCallback);
      }).toThrow('Failed to create attribute observer: Error: MutationObserver not supported');
    });
  });

  describe('nodeObserver method', () => {
    it('should create MutationObserver with childList configuration', () => {
      const result = observeUtil.nodeObserver(mockTarget, mockCallback);

      expect(mockMutationObserverConstructor).toHaveBeenCalledWith(expect.any(Function));
      expect(mockMutationObserver.observe).toHaveBeenCalledWith(mockTarget, {
        childList: true,
      });
      expect(result).toBe(mockMutationObserver);
    });

    it('should call callback only for childList mutations with added nodes', () => {
      observeUtil.nodeObserver(mockTarget, mockCallback);

      if (mockMutationCallback) {
        // Simulate childList mutation with added nodes
        const mockMutations = [
          {
            type: 'childList',
            addedNodes: [{}],
            removedNodes: [],
          },
        ];

        mockMutationCallback(mockMutations);
        expect(mockCallback).toHaveBeenCalled();
      }
    });

    it('should call callback only for childList mutations with removed nodes', () => {
      observeUtil.nodeObserver(mockTarget, mockCallback);

      if (mockMutationCallback) {
        // Simulate childList mutation with removed nodes
        const mockMutations = [
          {
            type: 'childList',
            addedNodes: [],
            removedNodes: [{}],
          },
        ];

        mockMutationCallback(mockMutations);
        expect(mockCallback).toHaveBeenCalled();
      }
    });

    it('should not call callback for childList mutations without node changes', () => {
      observeUtil.nodeObserver(mockTarget, mockCallback);

      if (mockMutationCallback) {
        // Simulate childList mutation without node changes
        const mockMutations = [
          {
            type: 'childList',
            addedNodes: [],
            removedNodes: [],
          },
        ];

        mockMutationCallback(mockMutations);
        expect(mockCallback).not.toHaveBeenCalled();
      }
    });

    it('should not call callback for non-childList mutations', () => {
      observeUtil.nodeObserver(mockTarget, mockCallback);

      if (mockMutationCallback) {
        // Simulate non-childList mutation
        const mockMutations = [{ type: 'attributes', target: mockTarget }];

        mockMutationCallback(mockMutations);
        expect(mockCallback).not.toHaveBeenCalled();
      }
    });

    it('should throw error for invalid target', () => {
      expect(() => {
        observeUtil.nodeObserver(null as any, mockCallback);
      }).toThrow('Invalid target element provided to nodeObserver');
    });

    it('should throw error for non-Element target', () => {
      const nonElement = { nodeType: 3 };

      expect(() => {
        observeUtil.nodeObserver(nonElement as any, mockCallback);
      }).toThrow('Invalid target element provided to nodeObserver');
    });

    it('should handle MutationObserver constructor errors', () => {
      mockMutationObserverConstructor.mockImplementationOnce(() => {
        throw new Error('Observer creation failed');
      });

      expect(() => {
        observeUtil.nodeObserver(mockTarget, mockCallback);
      }).toThrow('Failed to create node observer: Error: Observer creation failed');
    });
  });

  describe('edge cases', () => {
    it('should handle empty text content in attributeObserver', () => {
      mockTarget.textContent = '';

      observeUtil.attributeObserver(mockTarget, mockCallback);

      if (mockMutationCallback) {
        mockTarget.textContent = null;
        const mockMutations = [{ type: 'characterData', target: mockTarget }];

        mockMutationCallback(mockMutations);
        // Should handle null textContent gracefully
        expect(mockCallback).toHaveBeenCalled();
      }
    });

    it('should handle multiple mutations in single callback', () => {
      observeUtil.nodeObserver(mockTarget, mockCallback);

      if (mockMutationCallback) {
        const mockMutations = [
          { type: 'childList', addedNodes: [{}], removedNodes: [] },
          { type: 'childList', addedNodes: [], removedNodes: [{}] },
          { type: 'attributes', target: mockTarget }, // Should be ignored
        ];

        mockMutationCallback(mockMutations);
        expect(mockCallback).toHaveBeenCalledTimes(2);
      }
    });

    it('should handle callback throwing errors', () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      observeUtil.attributeObserver(mockTarget, errorCallback);

      if (mockMutationCallback) {
        expect(() => {
          mockMutationCallback!([{ type: 'attributes', target: mockTarget }]);
        }).toThrow('Callback error');
      }
    });
  });
});
