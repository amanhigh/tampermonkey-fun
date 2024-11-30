interface StyleObject {
    [key: string]: string | number;
}

interface StyleSet {
    BASE: StyleObject;
    FOCUS?: StyleObject;
    BLUR?: StyleObject;
    HOVER?: StyleObject;
    ACTIVE?: StyleObject;
    CHECKED?: StyleObject;
}

// TODO: Move Element Styles to Less File
interface StyleDefinitions {
    BUTTON: StyleSet;
    CHECKBOX: StyleSet;
    RADIO: StyleSet;
    TEXTBOX: StyleSet;
    LABEL: StyleSet;
    AREA: StyleSet;
    INPUT: StyleSet;
}

/**
 * Frozen style definitions for UI components
 */
export const Styles: Readonly<StyleDefinitions> = Object.freeze({
    // Button styles
    BUTTON: {
        BASE: {
            backgroundColor: 'black',
            color: 'white',
            fontSize: '12px',
            margin: '4px',
            padding: '4px 6px',
            borderRadius: '4px',
            cursor: 'pointer',
        },
        HOVER: {
            backgroundColor: '#f0f0f0',
        },
        ACTIVE: {
            transform: 'scale(0.95)',
        },
    },

    // Checkbox styles
    CHECKBOX: {
        BASE: {
            backgroundColor: 'black',
            color: 'white',
            fontSize: '15px',
            margin: '2px',
        },
    },

    // Radio button styles
    RADIO: {
        BASE: {
            appearance: 'none',
            '-webkit-appearance': 'none',
            '-moz-appearance': 'none',
            width: '16px',
            height: '16px',
            border: '2px solid white',
            borderRadius: '50%',
            backgroundColor: 'black',
            cursor: 'pointer',
            marginRight: '8px',
            verticalAlign: 'middle',
            position: 'relative',
        },
        CHECKED: {
            backgroundColor: 'white',
        },
    },

    // Text box styles
    TEXTBOX: {
        BASE: {
            backgroundColor: '#000',
            color: '#fff',
            fontSize: '16px',
            margin: '4px',
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #444',
            outline: 'none',
            width: 'calc(100% - 24px)',
            transition: 'border-color 0.3s',
        },
        FOCUS: {
            borderColor: '#666',
        },
        BLUR: {
            borderColor: '#444',
        },
    },

    // Label styles
    LABEL: {
        BASE: {
            backgroundColor: 'black',
            fontSize: '15px',
            margin: '2px',
        },
        RADIO: {
            display: 'inline-flex',
            alignItems: 'center',
            marginRight: '10px',
            fontSize: '18px',
            cursor: 'pointer',
        },
    },

    // Area styles
    AREA: {
        BASE: {
            position: 'absolute',
            zIndex: 9999,
        },
    },

    // Input styles
    INPUT: {
        BASE: {
            backgroundColor: 'black',
            color: 'white',
            fontSize: '15px',
            margin: '4px',
            padding: '6px 8px',
            border: '1px solid #444',
            borderRadius: '4px',
            outline: 'none',
            transition: 'border-color 0.3s',
        },
        FOCUS: {
            borderColor: '#666',
        },
        BLUR: {
            borderColor: '#444',
        },
    },
});
