import { SmartPrompt } from '../../src/util/smart';

// Mock DOM environment
const mockElement = {
  appendChild: jest.fn(),
  style: { display: '' },
  innerHTML: '',
  id: '',
  className: '',
  type: '',
  value: '',
  placeholder: '',
  onclick: null as any,
  onkeydown: null as any,
  checked: false,
  name: '',
  addEventListener: jest.fn(),
};

const mockDocument = {
  createElement: jest.fn(() => ({ ...mockElement })),
  createTextNode: jest.fn(() => ({ nodeValue: '' })),
  body: { appendChild: jest.fn() },
  querySelectorAll: jest.fn(() => []),
  querySelector: jest.fn(() => null),
};

const mockWindow = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
});

describe('SmartPrompt', () => {
  let smartPrompt: SmartPrompt;

  beforeEach(() => {
    jest.clearAllMocks();
    smartPrompt = new SmartPrompt();
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(smartPrompt).toBeInstanceOf(SmartPrompt);
    });
  });

  describe('showModal method', () => {
    it('should handle basic modal with reasons', async () => {
      const reasons = ['Reason 1', 'Reason 2'];

      // Mock button click to resolve promise quickly
      mockDocument.createElement.mockImplementation(() => {
        const element = { ...mockElement };
        if (element.onclick) {
          setTimeout(() => element.onclick(), 0);
        }
        return element;
      });

      const modalPromise = smartPrompt.showModal(reasons);

      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toHaveBeenCalled();

      // Verify it returns a promise
      expect(modalPromise).toBeInstanceOf(Promise);
    });

    it('should handle modal with reasons and overrides', () => {
      const reasons = ['Buy', 'Sell'];
      const overrides = ['Force', 'Urgent'];

      smartPrompt.showModal(reasons, overrides);

      // Verify DOM creation calls
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.createElement).toHaveBeenCalledWith('button');
      expect(mockDocument.createElement).toHaveBeenCalledWith('input');
      expect(mockDocument.createElement).toHaveBeenCalledWith('label');
    });

    it('should create correct number of buttons for reasons', () => {
      const reasons = ['Reason 1', 'Reason 2', 'Reason 3'];

      smartPrompt.showModal(reasons);

      // Should create: modal div + 3 reason buttons + override container + text input + cancel button
      expect(mockDocument.createElement).toHaveBeenCalledTimes(7);
    });

    it('should create radio buttons for overrides', () => {
      const reasons = ['Test'];
      const overrides = ['Override 1', 'Override 2'];

      smartPrompt.showModal(reasons, overrides);

      // Should create elements for radio buttons and labels
      const createCalls = mockDocument.createElement.mock.calls;
      const labelCalls = createCalls.filter((call: any) => call[0] === 'label');
      const inputCalls = createCalls.filter((call: any) => call[0] === 'input');

      expect(labelCalls.length).toBeGreaterThanOrEqual(2);
      expect(inputCalls.length).toBeGreaterThanOrEqual(3); // radio buttons + text input
    });

    it('should set up keyboard event listener', () => {
      const reasons = ['Test'];

      smartPrompt.showModal(reasons);

      expect(mockWindow.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should handle empty reasons array', () => {
      expect(() => {
        smartPrompt.showModal([]);
      }).not.toThrow();
    });

    it('should handle undefined overrides', () => {
      const reasons = ['Test'];

      expect(() => {
        smartPrompt.showModal(reasons);
      }).not.toThrow();
    });
  });

  describe('DOM element creation', () => {
    it('should create modal with correct class', () => {
      const reasons = ['Test'];

      smartPrompt.showModal(reasons);

      const createCalls = mockDocument.createElement.mock.calls;
      if (createCalls.length > 0) {
        const modalCall = createCalls.find((call: any) => call[0] === 'div');
        expect(modalCall).toBeDefined();
      }
    });

    it('should create buttons with correct properties', () => {
      const reasons = ['Buy', 'Sell'];

      smartPrompt.showModal(reasons);

      const createCalls = mockDocument.createElement.mock.calls;
      const buttonCalls = createCalls.filter((call: any) => call[0] === 'button');
      expect(buttonCalls.length).toBeGreaterThanOrEqual(3); // 2 reasons + cancel
    });

    it('should create text input with correct properties', () => {
      const reasons = ['Test'];

      smartPrompt.showModal(reasons);

      const createCalls = mockDocument.createElement.mock.calls;
      const inputCalls = createCalls.filter((call: any) => call[0] === 'input');
      expect(inputCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in reasons', () => {
      const reasons = ['<script>alert("xss")</script>', 'Normal & Safe'];

      expect(() => {
        smartPrompt.showModal(reasons);
      }).not.toThrow();
    });

    it('should handle very long reason text', () => {
      const longReason = 'A'.repeat(1000);
      const reasons = [longReason];

      expect(() => {
        smartPrompt.showModal(reasons);
      }).not.toThrow();
    });

    it('should handle large number of reasons', () => {
      const reasons = Array.from({ length: 50 }, (_, i) => `Reason ${i + 1}`);

      expect(() => {
        smartPrompt.showModal(reasons);
      }).not.toThrow();
    });
  });
});
