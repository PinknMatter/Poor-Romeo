let messageManager;
let fpsCounter = 0;
let lastFpsUpdate = 0;
let currentFps = 0;
let fontSizeChanged = false;
let lastFontSize = 70;
window.currentTextSize = 70;
window.maxMessages = 70;
window.showBoundingBoxes = false;
window.boundingBoxSize = 0.3; // Default bounding box size multiplier
window.messageInterval = 1000; // Default message interval

// UI Controls
// let textSizeSlider;
// let textSizeValue;

// Custom text words array
window.customWords = ["Hello World", "Welcome to the Visualization", "Text Display"];

function preload() {
    // Initialize message manager with default words
    // messageManager = new MessageManager();
    // messageManager.loadCustomWords(window.customWords);
    // console.log('Using default words. Enter custom text in the controls panel.');
    
    // Listen for custom text updates from the control panel
    if (window.electron) {
        const { ipcRenderer } = window.electron;
        
        ipcRenderer.on('update-custom-text', (event, customText) => {
            const sentences = customText.split(/\s*,\s*/).filter(sentence => sentence.length > 0);
            if (sentences.length > 0) {
                window.customWords = sentences;
                // messageManager.loadCustomWords(window.customWords);
                console.log('Updated custom sentences:', window.customWords);
            }
        });
        
        ipcRenderer.on('receive-message', receiveMessage);
    }
}

function receiveMessage(event, data) {
    if (data.type === 'text-size-change') {
        window.currentTextSize = data.value;
        fontSizeChanged = true;
    } else if (data.type === 'message-duration-change') {
        messageManager.setMessageDuration(data.value);
    } else if (data.type === 'transition-speed-change') {
        messageManager.setTransitionSpeed(data.value);
    } else if (data.type === 'max-messages-change') {
        window.maxMessages = data.value;
        messageManager.cleanupMessages();
    } else if (data.type === 'randomize-positions') {
        messageManager.randomizePositions();
    } else if (data.type === 'custom-text') {
        messageManager.addCustomMessage(data.text);
    } else if (data.type === 'toggle-bounding-boxes') {
        window.showBoundingBoxes = data.value;
    } else if (data.type === 'update-bounding-box-size') {
        window.boundingBoxSize = data.value;
    } else if (data.type === 'update-birth-rate') {
        window.messageInterval = data.value * 1000; // Convert seconds to milliseconds
        console.log(`Birth rate updated to ${data.value * 1000}ms`);
    } else if (data.type === 'get-settings') {
        // Send current settings back to control window
        ipcRenderer.send('settings-update', {
            textSize: window.currentTextSize,
            messageDuration: messageManager.messageDuration,
            transitionSpeed: messageManager.transitionSpeed,
            maxMessages: window.maxMessages,
            showBoundingBoxes: window.showBoundingBoxes,
            boundingBoxSize: window.boundingBoxSize,
            messageInterval: window.messageInterval || 1000
        });
    }
}

function setup() {
    // Calculate canvas size to maintain 4:5 aspect ratio
    let canvasWidth, canvasHeight;
    
    if (windowWidth / windowHeight > 4/5) {
        // Window is wider than 4:5, so height is the limiting factor
        canvasHeight = windowHeight;
        canvasWidth = canvasHeight * (4/5);
    } else {
        // Window is taller than 4:5, so width is the limiting factor
        canvasWidth = windowWidth;
        canvasHeight = canvasWidth * (5/4);
    }
    
    // Create canvas with 4:5 aspect ratio
    createCanvas(canvasWidth, canvasHeight);
    textWrap(WORD);
    
    // Initialize the current background color
    window.currentBgColor = COLORS.BACKGROUND.MAIN;
    const bgColor = window.currentBgColor;
    background(bgColor[0], bgColor[1], bgColor[2]);
    
    frameRate(60);
    
    // Initialize message manager
    messageManager = new MessageManager();
    
    if (window.customWords && window.customWords.length > 0) {
        messageManager.loadCustomWords(window.customWords);
    }
    
    // IPC event handlers
    if (typeof window !== 'undefined' && window.require) {
        const { ipcRenderer } = window.require('electron');
        
        ipcRenderer.on('update-text-size', (event, size) => {
            window.currentTextSize = size;
        });
        
        ipcRenderer.on('update-max-highlights', (event, value) => {
            if (messageManager) {
                messageManager.maxHighlights = value;
            }
        });
        
        ipcRenderer.on('update-highlight-duration', (event, value) => {
            if (messageManager) {
                messageManager.highlightDuration = value;
            }
        });
        
        ipcRenderer.on('update-max-messages', (event, value) => {
            window.maxMessages = value;
        });
        
        ipcRenderer.on('update-message-lifetime', (event, value) => {
            if (messageManager) {
                messageManager.messageDuration = value;
            }
        });
        
        ipcRenderer.on('update-transition-speed', (event, value) => {
            if (messageManager) {
                messageManager.fontSizeTransitionSpeed = value;
            }
        });
        
        ipcRenderer.on('randomize-positions', () => {
            if (messageManager) {
                messageManager.randomizePositions();
            }
        });
        
        ipcRenderer.on('update-custom-text', (event, customText) => {
            const words = customText.split(',').map(word => word.trim()).filter(word => word.length > 0);
            if (words.length > 0) {
                window.customWords = words;
                if (messageManager) {
                    messageManager.loadCustomWords(words);
                }
            }
        });
        
        ipcRenderer.on('receive-message', (event, message) => {
            if (message.type === 'toggle-bounding-boxes') {
                window.showBoundingBoxes = message.value;
            } else if (message.type === 'update-bounding-box-size') {
                window.boundingBoxSize = message.value;
            }
        });
        
        ipcRenderer.on('update-birth-rate', (event, value) => {
            window.messageInterval = value * 1000; // Convert seconds to milliseconds
            if (messageManager) {
                messageManager.messageInterval = window.messageInterval;
                messageManager.lastMessageTime = millis() - window.messageInterval; // Reset the timer to create a new message immediately
            }
        });
        
        // Background color handlers
        ipcRenderer.on('randomize-background-color', () => {
            // Get a random background color from colorSheet.js
            const bgColors = Object.keys(COLORS.BACKGROUND).filter(key => key !== 'MAIN');
            const randomColorKey = bgColors[Math.floor(Math.random() * bgColors.length)];
            window.currentBgColor = COLORS.BACKGROUND[randomColorKey];
        });
        
        ipcRenderer.on('reset-background-color', () => {
            // Set background color to black
            window.currentBgColor = COLORS.BACKGROUND.MAIN; // Black
        });
    }
}

function draw() {
    // Performance monitoring
    fpsCounter++;
    if (millis() - lastFpsUpdate > 1000) {
        currentFps = fpsCounter;
        fpsCounter = 0;
        lastFpsUpdate = millis();
    }
    
    // Clear the background each frame
    const bgColor = window.currentBgColor;
    background(bgColor[0], bgColor[1], bgColor[2]);
    
    // Show loading message if data isn't ready
    if (!messageManager || !messageManager.isLoaded) {
        fill(255);
        textSize(window.currentTextSize);
        textAlign(CENTER, CENTER);
        text('Loading messages...', width/2, height/2);
        return;
    }

    if (messageManager) {
        messageManager.update();
        messageManager.display(window.showBoundingBoxes);
    }
    
    // Display performance stats
    // fill(255);
    // textAlign(LEFT, TOP);
    // textSize(12);
    // text(`FPS: ${currentFps}`, 10, 10);
    // text(`Active Messages: ${messageManager.displayMessages.length}`, 10, 25);
    // text(`Cache Size: ${messageManager.messageCache.size}`, 10, 40);
    // text(`Performance Mode: ${messageManager.lowPerformanceMode ? 'LOW' : 'NORMAL'}`, 10, 55);
}

function windowResized() {
    // Recalculate canvas size to maintain 4:5 aspect ratio when window is resized
    let canvasWidth, canvasHeight;
    
    if (windowWidth / windowHeight > 4/5) {
        // Window is wider than 4:5, so height is the limiting factor
        canvasHeight = windowHeight;
        canvasWidth = canvasHeight * (4/5);
    } else {
        // Window is taller than 4:5, so width is the limiting factor
        canvasWidth = windowWidth;
        canvasHeight = canvasWidth * (5/4);
    }
    
    // Resize canvas with 4:5 aspect ratio
    resizeCanvas(canvasWidth, canvasHeight);
    const bgColor = window.currentBgColor;
    background(bgColor[0], bgColor[1], bgColor[2]);
}
