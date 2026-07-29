import { SmartPrompt, SmartChoiceGroup, SmartPromptResponseType } from '../../src/util/smart';

// ==========================================
// Mock Infrastructure
// ==========================================

let createdElements: any[];
let mockModalEl: any;

/** Create a mock DOM element that tracks children and captures handlers. */
function createMockElement(): any {
  const el: any = {
    children: [] as any[],
    parentNode: null as any,
    id: '',
    className: '',
    innerHTML: '',
    textContent: '',
    type: '',
    value: '',
    placeholder: '',
    checked: false,
    name: '',
    style: {} as Record<string, string>,
    onclick: null as any,
    onkeydown: null as any,
    focus: jest.fn(),
    blur: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(function (this: any, child: any) {
      this.children.push(child);
      child.parentNode = this;
      return child;
    }),
    removeChild: jest.fn(function (this: any, child: any) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) this.children.splice(idx, 1);
      return child;
    }),
    querySelectorAll: jest.fn(() => []),
    querySelector: jest.fn(() => null),
  };
  createdElements.push(el);
  return el;
}

// --- Selector matching for mock querySelectorAll / querySelector ---

function matchSelector(el: any, selector: string): boolean {
  if (selector === 'input[type="radio"]') {
    return el.type === 'radio';
  }
  const checkedMatch = selector.match(/^input\[name="([^"]+)"\]:checked$/);
  if (checkedMatch) {
    return el.type === 'radio' && el.name === checkedMatch[1] && el.checked === true;
  }
  return false;
}

function querySelectorAllFrom(root: any, selector: string): any[] {
  const results: any[] = [];
  const walk = (node: any): void => {
    if (matchSelector(node, selector)) results.push(node);
    if (node.children) node.children.forEach(walk);
  };
  if (root.children) root.children.forEach(walk);
  return results;
}

function querySelectorFrom(root: any, selector: string): any {
  return querySelectorAllFrom(root, selector)[0] || null;
}

// --- Global DOM mocks ---

const mockDocument = {
  createElement: jest.fn((tag: string) => {
    const el = createMockElement();
    // First div created is the modal — equip with real selector methods
    if (tag === 'div' && !mockModalEl) {
      mockModalEl = el;
      el.querySelectorAll = jest.fn((sel: string) => querySelectorAllFrom(el, sel));
      el.querySelector = jest.fn((sel: string) => querySelectorFrom(el, sel));
    }
    return el;
  }),
  createTextNode: jest.fn((text: string) => ({ nodeValue: text })),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
  },
};

const mockWindow = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

Object.defineProperty(global, 'document', { value: mockDocument, writable: true });
Object.defineProperty(global, 'window', { value: mockWindow, writable: true });

// ==========================================
// Test Helpers
// ==========================================

function findButton(text: string): any {
  return createdElements.find((el) => el.textContent === text);
}

function findButtonById(id: string): any {
  return createdElements.find((el) => el.id === id);
}

function findAllRadios(): any[] {
  return createdElements.filter((el) => el.type === 'radio');
}

function findElementsByClass(className: string): any[] {
  return createdElements.filter((el) => el.className === className);
}

// ==========================================
// Tests
// ==========================================

describe('SmartPrompt', () => {
  let smartPrompt: SmartPrompt;

  beforeEach(() => {
    jest.clearAllMocks();
    createdElements = [];
    mockModalEl = null;
    smartPrompt = new SmartPrompt();
  });

  // ─── showModal: response types ────────────────────

  describe('showModal', () => {
    describe('structured response types', () => {
      it('returns { type: "cancel", value: null } when Cancel clicked', async () => {
        const promise = smartPrompt.showModal(['Submit']);

        const cancelBtn = findButtonById('smart-cancel');
        expect(cancelBtn).toBeDefined();
        cancelBtn.onclick();

        const result = await promise;
        expect(result).toEqual({ type: SmartPromptResponseType.CANCEL, value: null });
      });

      it('returns { type: "none", value: "none", answers } when Escape pressed', async () => {
        const promise = smartPrompt.showModal(['Submit']);

        const escapeHandler = mockWindow.addEventListener.mock.calls.find(
          (call: any[]) => call[0] === 'keydown',
        )?.[1];
        expect(escapeHandler).toBeDefined();

        escapeHandler({ key: 'Escape' });

        const result = await promise;
        expect(result).toEqual({ type: SmartPromptResponseType.NONE, value: 'none', answers: {} });
      });

      it('returns { type: "none", value: "none", answers } when None clicked', async () => {
        const promise = smartPrompt.showModal(['Submit']);

        const noneBtn = findButtonById('smart-none');
        expect(noneBtn).toBeDefined();
        noneBtn.onclick();

        const result = await promise;
        expect(result).toEqual({ type: SmartPromptResponseType.NONE, value: 'none', answers: {} });
      });

      it('returns { type: "selected", primarySelection, answers } when primary button clicked', async () => {
        const promise = smartPrompt.showModal(['Buy', 'Sell']);

        const buyBtn = findButton('Buy');
        expect(buyBtn).toBeDefined();
        buyBtn.onclick();

        const result = await promise;
        expect(result).toEqual({ type: SmartPromptResponseType.SELECTED, primarySelection: 'Buy', answers: {} });
      });

      it('returns { type: "selected", primarySelection, answers } when custom text entered', async () => {
        const promise = smartPrompt.showModal(['Submit']);

        const textBox = findButtonById('smart-text');
        expect(textBox).toBeDefined();
        textBox.value = 'My custom reason';

        textBox.onkeydown({ key: 'Enter' });

        const result = await promise;
        expect(result).toEqual({
          type: SmartPromptResponseType.SELECTED,
          primarySelection: 'My custom reason',
          answers: {},
        });
      });

      it('returns { type: "none", value: "none", answers } when empty text submitted via Enter', async () => {
        const promise = smartPrompt.showModal(['Submit']);

        const textBox = findButtonById('smart-text');
        expect(textBox).toBeDefined();
        textBox.value = '';

        textBox.onkeydown({ key: 'Enter' });

        const result = await promise;
        expect(result).toEqual({ type: SmartPromptResponseType.NONE, value: 'none', answers: {} });
      });
    });

    // ─── showModal: choice groups ────────────────────

    describe('choice groups', () => {
      it('returns answers keyed by group id for selected radio', async () => {
        const groups: SmartChoiceGroup[] = [
          { id: 'priority', label: 'Priority', choices: ['High', 'Low'] },
        ];

        const promise = smartPrompt.showModal(['Submit'], groups);

        const radios = findAllRadios();
        const highRadio = radios.find(
          (r) => r.name === 'group-priority' && r.value === 'High',
        );
        expect(highRadio).toBeDefined();
        highRadio.checked = true;

        const submitBtn = findButton('Submit');
        submitBtn.onclick();

        const result = await promise;
        expect(result).toEqual({
          type: SmartPromptResponseType.SELECTED,
          primarySelection: 'Submit',
          answers: { priority: 'High' },
        });
      });

      it('returns null for unselected group', async () => {
        const groups: SmartChoiceGroup[] = [
          { id: 'size', label: 'Size', choices: ['Small', 'Large'] },
        ];

        const promise = smartPrompt.showModal(['Submit'], groups);

        const submitBtn = findButton('Submit');
        submitBtn.onclick();

        const result = await promise;
        expect(result).toEqual({
          type: SmartPromptResponseType.SELECTED,
          primarySelection: 'Submit',
          answers: { size: null },
        });
      });

      it('supports multiple independent groups', async () => {
        const groups: SmartChoiceGroup[] = [
          { id: 'color', label: 'Color', choices: ['Red', 'Blue'] },
          { id: 'size', label: 'Size', choices: ['S', 'M', 'L'] },
        ];

        const promise = smartPrompt.showModal(['Go'], groups);

        const radios = findAllRadios();
        radios.find((r) => r.name === 'group-color' && r.value === 'Blue').checked = true;
        radios.find((r) => r.name === 'group-size' && r.value === 'L').checked = true;

        findButton('Go').onclick();

        const result = await promise;
        expect(result).toEqual({
          type: SmartPromptResponseType.SELECTED,
          primarySelection: 'Go',
          answers: { color: 'Blue', size: 'L' },
        });
      });

      it('respects defaultChoice pre-selection in group', () => {
        const groups: SmartChoiceGroup[] = [
          { id: 'mode', label: 'Mode', choices: ['Auto', 'Manual'], defaultChoice: 'Manual' },
        ];

        smartPrompt.showModal(['Run'], groups);

        const radios = findAllRadios();
        const manualRadio = radios.find(
          (r) => r.name === 'group-mode' && r.value === 'Manual',
        );
        expect(manualRadio).toBeDefined();
        expect(manualRadio.checked).toBe(true);

        const autoRadio = radios.find(
          (r) => r.name === 'group-mode' && r.value === 'Auto',
        );
        expect(autoRadio.checked).toBe(false);
      });

      it('includes group answers in None response', async () => {
        const groups: SmartChoiceGroup[] = [
          { id: 'tier', label: 'Tier', choices: ['A', 'B'] },
        ];

        const promise = smartPrompt.showModal([], groups);

        const radios = findAllRadios();
        radios.find((r) => r.name === 'group-tier' && r.value === 'A').checked = true;

        findButtonById('smart-none').onclick();

        const result = await promise;
        expect(result).toEqual({
          type: SmartPromptResponseType.NONE,
          value: 'none',
          answers: { tier: 'A' },
        });
      });

      it('does not concatenate primary and group values', async () => {
        const groups: SmartChoiceGroup[] = [
          { id: 'env', label: 'Env', choices: ['Prod', 'Dev'] },
        ];

        const promise = smartPrompt.showModal(['Deploy'], groups);

        const radios = findAllRadios();
        radios.find((r) => r.name === 'group-env' && r.value === 'Prod').checked = true;

        findButton('Deploy').onclick();

        const result = await promise;
        expect(result).toMatchObject({
          type: SmartPromptResponseType.SELECTED,
          primarySelection: 'Deploy',
          answers: { env: 'Prod' },
        });
      });
    });

    // ─── showModal: rendering ────────────────────

    describe('rendering', () => {
      it('sets up Escape key listener on window', () => {
        smartPrompt.showModal(['Submit']);

        expect(mockWindow.addEventListener).toHaveBeenCalledWith(
          'keydown',
          expect.any(Function),
        );
      });

      it('resets modal state between invocations', () => {
        smartPrompt.showModal(['First']);
        smartPrompt.showModal(['Second']);

        const buttons = findElementsByClass('aman-modal-button');
        const secondOnly = buttons.filter((b) => b.textContent === 'Second');
        expect(secondOnly.length).toBe(1);
      });
    });

    // ─── showModal: edge cases ────────────────────

    describe('edge cases', () => {
      it('handles empty primary choices array', () => {
        expect(() => smartPrompt.showModal([])).not.toThrow();
      });

      it('handles empty groups array', () => {
        expect(() => smartPrompt.showModal(['Submit'], [])).not.toThrow();
      });

      it('renders XSS-safe labels via textContent for special characters', () => {
        const groups: SmartChoiceGroup[] = [
          {
            id: 'special',
            label: 'Special',
            choices: ['<script>alert("xss")</script>', 'Normal & Safe'],
          },
        ];

        smartPrompt.showModal(['Go'], groups);

        const radios = findAllRadios();
        expect(radios.length).toBe(2);
        expect(radios[0].value).toBe('<script>alert("xss")</script>');
        expect(radios[1].value).toBe('Normal & Safe');
      });
    });
  });

  // ─── showTextareaModal ────────────────────

  describe('showTextareaModal', () => {
    it('returns trimmed text on Save', async () => {
      const promise = smartPrompt.showTextareaModal('Title', 'default');

      const saveBtn = findButtonById('smart-textarea-save');
      expect(saveBtn).toBeDefined();

      const textarea = createdElements.find((el) => el.id === 'smart-textarea');
      expect(textarea).toBeDefined();
      textarea.value = '  trimmed content  ';

      saveBtn.onclick();

      const result = await promise;
      expect(result).toBe('trimmed content');
    });

    it('returns null on Cancel', async () => {
      const promise = smartPrompt.showTextareaModal('Title', '');

      const cancelBtn = findButtonById('smart-textarea-cancel');
      expect(cancelBtn).toBeDefined();
      cancelBtn.onclick();

      const result = await promise;
      expect(result).toBeNull();
    });

    it('returns null on Escape', async () => {
      const promise = smartPrompt.showTextareaModal('Title', '');

      const escapeHandler = mockWindow.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'keydown',
      )?.[1];
      expect(escapeHandler).toBeDefined();

      escapeHandler({ key: 'Escape' });

      const result = await promise;
      expect(result).toBeNull();
    });

    it('uses custom submit label via textContent', () => {
      smartPrompt.showTextareaModal('Title', '', 'Confirm');

      const saveBtn = findButtonById('smart-textarea-save');
      expect(saveBtn.textContent).toBe('Confirm');
    });

    it('defaults submit label to Save', () => {
      smartPrompt.showTextareaModal('Title', '');

      const saveBtn = findButtonById('smart-textarea-save');
      expect(saveBtn.textContent).toBe('Save');
    });
  });
});
