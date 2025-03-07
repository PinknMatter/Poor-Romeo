/**
 * colorSheet.js
 * 
 * This file contains all color definitions for the application.
 * Use these constants throughout the application to maintain a consistent color scheme.
 */

// Background colors
window.COLORS = {
    // Background
    BACKGROUND: {
        MAIN: [0, 0, 0],         // Black background
        RED: [255, 0, 0],            // Red
        GREEN: [0, 255, 0],          // Green
        BLUE: [0, 0, 255],           // Blue
        YELLOW: [255, 255, 0],       // Yellow
        MAGENTA: [255, 0, 255],      // Magenta
        CYAN: [0, 255, 255],         // Cyan
        ORANGE: [255, 165, 0],       // Orange
        PURPLE: [128, 0, 128]        // Purple
    },
    
    // Text colors
    TEXT: {
        PRIMARY: [255, 255, 255],    // White text
        SECONDARY: [200, 200, 200],  // Light gray text
        ACCENT: [255, 255, 0]        // Yellow accent text
    },
    
    // Highlight colors for words
    HIGHLIGHT: {
        RED: [255, 0, 0],            // Red
        GREEN: [0, 255, 0],          // Green
        BLUE: [0, 0, 255],           // Blue
        YELLOW: [255, 255, 0],       // Yellow


             // Purple
    },
    
    // Special highlight colors
    SPECIAL: {
        DEATH_HIGHLIGHT: [36, 46, 173],  // Blue highlight for death animation

    },
    
    // Bounding box colors
    BOUNDING_BOX: {
        NORMAL: [255, 0, 0],         // Red for normal bounding boxes
        OVERLAP: [255, 255, 0],      // Yellow for overlapping bounding boxes
        DEBUG: [0, 255, 0]           // Green for debug bounding boxes
    },
    
    // UI element colors
    UI: {
        BUTTON: [50, 50, 50],        // Dark gray for buttons
        BUTTON_HOVER: [70, 70, 70],  // Lighter gray for button hover
        SLIDER: [100, 100, 100],     // Gray for sliders
        SLIDER_ACTIVE: [150, 150, 150] // Lighter gray for active sliders
    }
};

// Function to get a color with optional alpha
window.getColor = function(colorArray, alpha = 255) {
    if (colorArray.length === 3) {
        return [...colorArray, alpha];
    }
    return colorArray;
};

// Export the color constants
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { COLORS, getColor };
}
