const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

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
            contextIsolation: false
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
            contextIsolation: false
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

ipcMain.on('update-transition-speed', (event, value) => {
    mainWindow.webContents.send('update-transition-speed', value);
});

ipcMain.on('randomize-positions', () => {
    mainWindow.webContents.send('randomize-positions');
});

ipcMain.on('update-custom-text', (event, customText) => {
    mainWindow.webContents.send('update-custom-text', customText);
});

ipcMain.on('toggle-bounding-boxes', (event, value) => {
    mainWindow.webContents.send('receive-message', { type: 'toggle-bounding-boxes', value: value });
});

ipcMain.on('update-bounding-box-size', (event, value) => {
    mainWindow.webContents.send('receive-message', { type: 'update-bounding-box-size', value: value });
});

// Background color controls
ipcMain.on('randomize-background-color', () => {
    mainWindow.webContents.send('randomize-background-color');
});

ipcMain.on('reset-background-color', () => {
    mainWindow.webContents.send('reset-background-color');
});

// Send initial values to control window when it's ready
ipcMain.on('control-window-ready', () => {
    controlWindow.webContents.send('init-controls', {
        textSize: 16,
        maxHighlights: 3,
        highlightDuration: 3000,
        maxMessages: 15,
        messageLifetime: 10000,
        birthRate: 1000
    });
});
