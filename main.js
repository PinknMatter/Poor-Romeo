const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Load chatbot bridge
let chatbotBridge;
try {
    chatbotBridge = require('./chatbotBridge');
    
    // The API key will be loaded from the .env file by the chatbot module
    console.log('Using OpenAI API key from .env file for Assistant:', chatbotBridge.assistantId);
} catch (error) {
    console.error('Error loading chatbot bridge:', error);
}

// Enable live reload
try {
    require('electron-reload')(__dirname, {
        electron: require(path.join(__dirname, 'node_modules', 'electron'))
    });
} catch (err) {
    console.error('Error setting up electron-reload:', err);
}

let mainWindow;
let controlWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile('index.html');
}

function createControlWindow() {
    controlWindow = new BrowserWindow({
        width: 300,
        height: 400,
        x: 0,
        y: 0,
        title: 'Controls',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    controlWindow.loadFile('controls.html');
    
    // Optional: Prevent control window from being closed
    controlWindow.on('close', (e) => {
        if (!app.isQuitting) {
            e.preventDefault();
            controlWindow.hide();
        }
    });
}

app.whenReady().then(() => {
    createMainWindow();
    createControlWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
            createControlWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    app.isQuitting = true;
});

// IPC Communication
ipcMain.on('update-text-size', (event, size) => {
    mainWindow.webContents.send('update-text-size', size);
});

ipcMain.on('update-max-highlights', (event, value) => {
    mainWindow.webContents.send('update-max-highlights', value);
});

ipcMain.on('update-highlight-duration', (event, value) => {
    mainWindow.webContents.send('update-highlight-duration', value);
});

ipcMain.on('update-max-messages', (event, value) => {
    mainWindow.webContents.send('update-max-messages', value);
});

ipcMain.on('update-message-lifetime', (event, value) => {
    mainWindow.webContents.send('update-message-lifetime', value);
});

ipcMain.on('update-birth-rate', (event, value) => {
    mainWindow.webContents.send('update-birth-rate', value);
});

ipcMain.on('randomize-positions', () => {
    mainWindow.webContents.send('randomize-positions');
});

// IPC handlers for text bot
ipcMain.on('update-text-bot-size', (event, size) => {
    mainWindow.webContents.send('update-text-bot-size', size);
});

ipcMain.on('update-background-opacity', (event, value) => {
    mainWindow.webContents.send('update-background-opacity', value);
});

ipcMain.on('send-test-message', (event, message) => {
    mainWindow.webContents.send('send-test-message', message);
});

ipcMain.on('refresh-bot-response', (event) => {
    mainWindow.webContents.send('refresh-bot-response');
});

// Add chatbot integration
ipcMain.on('get-chatbot-response', async (event, message) => {
    try {
        console.log('Main process: Getting chatbot response for:', message);
        
        if (!chatbotBridge) {
            console.error('Chatbot bridge not available');
            event.reply('chatbot-response', "Chatbot is not available. Please check the console for errors.");
            return;
        }
        
        // Forward the user message to the main window for display
        // We need this to ensure user messages are displayed in the UI
        mainWindow.webContents.send('user-message-received', message);
        
        // Get response from the chatbot
        const response = await chatbotBridge.getChatbotResponse(message);
        console.log('Main process: Chatbot response received:', response.substring(0, 50) + (response.length > 50 ? '...' : ''));
        
        // Send the response back to the renderer process that requested it
        event.reply('chatbot-response', response);
        
        // Also send the bot response to the main window
        mainWindow.webContents.send('bot-response-received', response);
    } catch (error) {
        console.error('Error in get-chatbot-response handler:', error);
        event.reply('chatbot-response', "Error: " + error.message);
    }
});

// Add handler for direct bot responses
ipcMain.on('bot-response-received', (event, response) => {
    mainWindow.webContents.send('bot-response-received', response);
});

// Add handler for user messages
ipcMain.on('send-test-message', (event, message) => {
    mainWindow.webContents.send('send-test-message', message);
});

// Send initial values to control window when it's ready
ipcMain.on('control-window-ready', () => {
    controlWindow.webContents.send('init-controls', {
        textSize: 16,
        maxHighlights: 3,
        highlightDuration: 3000,
        maxMessages: 15,
        messageLifetime: 10000,
        birthRate: 1000,
        textBotSize: 18,
        backgroundOpacity: 100
    });
});
