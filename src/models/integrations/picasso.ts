export enum PicassoCategory {
  DRAWING = 'DRAWING',
  NAVIGATION = 'NAVIGATION',
  CANVAS = 'CANVAS',
  HELP = 'HELP',
}

interface KeyMapping {
  key: string;
  description: string;
  selectors: string[];
  category: PicassoCategory;
  isDoubleTap?: boolean;
}

export const PICASSO_CONSTANTS = {
  CLASSES: {
    TEXT_EDITOR: 'excalidraw-wysiwyg',
    MODE_INDICATOR: 'picasso-mode-indicator',
  },
  INDICATOR: {
    TEXT_MODE: '✍️ Text',
    DRAW_MODE: '🎨 Draw',
  },
  HELP: {
    TITLE: 'Picasso Keyboard Shortcuts',
    CATEGORIES: {
      DRAWING: 'Drawing Tools',
      NAVIGATION: 'Navigation & Editing',
      CANVAS: 'Canvas Actions',
      HELP: 'Help',
    },
  },
};

export const PICASSO_KEY_MAPPINGS: KeyMapping[] = [
  // Drawing Tools
  {
    key: ',',
    description: 'Rectangle tool',
    selectors: ['[data-testid="toolbar-rectangle"]'],
    category: PicassoCategory.DRAWING,
  },
  {
    key: 'u',
    description: 'Duplicate selection',
    selectors: ['[aria-label="Duplicate"]'],
    category: PicassoCategory.DRAWING,
  },
  {
    key: ';',
    description: 'Delete selection',
    selectors: ['[aria-label="Delete"]'],
    category: PicassoCategory.DRAWING,
  },

  // Navigation & Editing
  {
    key: 'j',
    description: 'Group selection',
    selectors: ['[aria-label="Group selection"]'],
    category: PicassoCategory.NAVIGATION,
  },
  {
    key: 'j',
    description: 'Ungroup selection',
    selectors: ['[aria-label="Ungroup selection"]'],
    category: PicassoCategory.NAVIGATION,
    isDoubleTap: true,
  },
  {
    key: 'p',
    description: 'Center vertically',
    selectors: ['[data-testid="main-menu-trigger"]', '[aria-label="Center vertically"]'],
    category: PicassoCategory.NAVIGATION,
  },
  {
    key: 'i',
    description: 'Center horizontally',
    selectors: ['[data-testid="main-menu-trigger"]', '[aria-label="Center horizontally"]'],
    category: PicassoCategory.NAVIGATION,
  },

  // Canvas Actions
  {
    key: 'y',
    description: 'Reset canvas view',
    selectors: ['[data-testid="main-menu-trigger"]', '[aria-label="Reset the canvas"]'],
    category: PicassoCategory.CANVAS,
  },
  {
    key: "'",
    description: 'Undo last action',
    selectors: ['[data-testid="button-undo"]'],
    category: PicassoCategory.CANVAS,
  },
  {
    key: '.',
    description: 'Redo last action',
    selectors: ['[data-testid="button-redo"]'],
    category: PicassoCategory.CANVAS,
  },

  // Help
  { key: '?', description: 'Show this help', selectors: [], category: PicassoCategory.HELP },
];
