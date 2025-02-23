let messageManager;
let fpsCounter = 0;
let lastFpsUpdate = 0;
let currentFps = 0;

// UI Controls
// let textSizeSlider;
// let textSizeValue;

// Initialize text size
window.currentTextSize = 16;

function preload() {
    // Use Node.js fs module to read the JSON file
    const fs = require('fs');
    const path = require('path');
    
    try {
        const jsonPath = path.join(__dirname, 'Data', 'Clean_data', "Noah_hinge_data.json");
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        messageManager = new MessageManager();
        messageManager.loadMessages(data);
        console.log('Total messages:', messageManager.getMessageCount());
    } catch (error) {
        console.error('Error loading JSON:', error);
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    textWrap(WORD);
    background(0);
    frameRate(60);
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
    clear();
    background(0);
    
    // Show loading message if data isn't ready
    if (!messageManager || !messageManager.isLoaded) {
        fill(255);
        textSize(window.currentTextSize);
        textAlign(CENTER, CENTER);
        text('Loading messages...', width/2, height/2);
        return;
    }

    messageManager.update();
    messageManager.display();
    
    // Display performance stats
    fill(255);
    textAlign(LEFT, TOP);
    textSize(12);
    text(`FPS: ${currentFps}`, 10, 10);
    text(`Active Messages: ${messageManager.displayMessages.length}`, 10, 25);
    text(`Cache Size: ${messageManager.messageCache.size}`, 10, 40);
    text(`Performance Mode: ${messageManager.lowPerformanceMode ? 'LOW' : 'NORMAL'}`, 10, 55);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    background(255);
}
