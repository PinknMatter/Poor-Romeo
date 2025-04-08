let messageManager;
let textBot;
let fpsCounter = 0;
let lastFpsUpdate = 0;
let currentFps = 0;

let bgColor = 0;

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
        // Load agents data
        const agentsPath = path.join(__dirname, 'chatbot', 'Agents.json');
        const agentsData = JSON.parse(fs.readFileSync(agentsPath, 'utf8'));
        const agents = agentsData.agents;
        
        // Get the current agent from localStorage or default to the first agent
        let currentAgentName = localStorage.getItem('currentAgent') || agents[0].name;
        
        // Find the agent object
        const currentAgent = agents.find(agent => agent.name === currentAgentName) || agents[0];
        console.log('Current agent:', currentAgent.name);
        
        // Determine which data file to load based on the agent
        let dataFileName;
        if (currentAgent.name === "Noah Kornberg") {
            dataFileName = "Noah_hinge_data.json";
            bgColor = '#000000'
        } else if (currentAgent.name === "Lydia Graveline") {
            dataFileName = "Lydia_hinge_data.json";
            bgColor = '#d11b76'
        } else {
            dataFileName = "Noah_hinge_data.json"; // Default fallback
        }
        
        const jsonPath = path.join(__dirname, 'Clean_data', dataFileName);
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        messageManager = new MessageManager();
        messageManager.loadMessages(data);
        console.log('Total messages:', messageManager.getMessageCount());
        console.log('Loaded data for agent:', currentAgent.name);
        
        // Store the current agent name in localStorage for persistence
        localStorage.setItem('currentAgent', currentAgent.name);
    } catch (error) {
        console.error('Error loading JSON:', error);
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    textWrap(WORD);
    background(0);
    frameRate(60);
    
    // Initialize the text bot
    textBot = new TextBot();
    
    // Set up IPC listeners
    setupIPCListeners();
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
    background(bgColor);
    
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
    
    // Update and display the text bot
    textBot.update();
    
    // Calculate chat dimensions
    const chatWidth = width * 0.6;
    const chatHeight = height * 0.6;
    const chatX = width / 2;
    const chatY = height * 0.4;
    
    // Draw the text bot with the calculated dimensions
    textBot.draw();
    
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
    resizeCanvas(windowWidth, windowHeight);
    background(0);
}

// Set up IPC listeners for the renderer process
function setupIPCListeners() {
    // Check if we're in an Electron environment with the API
    if (window.api) {
        // Listen for messages from the main process
        window.api.receive('update-text-appearance', (data) => {
            messageManager.updateTextAppearance(data);
        });
        
        window.api.receive('update-message-timing', (data) => {
            messageManager.updateMessageTiming(data);
        });
        
        window.api.receive('update-background-opacity', (opacity) => {
            textBot.setBackgroundOpacity(opacity);
        });
        
        window.api.receive('send-test-message', (message) => {
            textBot.simulateResponse(message);
        });
        
        window.api.receive('refresh-bot-response', () => {
            textBot.simulateResponse("Tell me something interesting");
        });
        
        window.api.receive('bot-response-received', (response) => {
            console.log('Sketch: Received bot response:', response.substring(0, 50) + (response.length > 50 ? '...' : ''));
            // Clear the typing indicator before adding the message
            textBot.isTyping = false;
            textBot.waitingForBotResponse = false;
            console.log('Sketch: Adding bot message to textBot');
            textBot.addBotMessage(response);
        });
        
        window.api.receive('user-message-received', (message) => {
            console.log('Sketch: Received user message:', message);
            textBot.addUserMessage(message);
        });
    }
}
