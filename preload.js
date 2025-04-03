// Preload script for Electron
const { contextBridge, ipcRenderer } = require('electron');

// Listen for set-current-agent message and store in localStorage
ipcRenderer.on('set-current-agent', (event, agentName) => {
    console.log('Setting current agent in localStorage:', agentName);
    localStorage.setItem('currentAgent', agentName);
});

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'api', {
        send: (channel, data) => {
            // whitelist channels
            let validChannels = [
                'update-text-appearance',
                'update-message-timing',
                'update-background-opacity',
                'send-test-message',
                'refresh-bot-response',
                'update-text-bot-size',
                'randomize-positions',
                'get-chatbot-response',
                'toggle-chatbot',
                'switch-agent'
            ];
            if (validChannels.includes(channel)) {
                ipcRenderer.send(channel, data);
            }
        },
        receive: (channel, func) => {
            let validChannels = [
                'update-text-appearance',
                'update-message-timing',
                'update-background-opacity',
                'send-test-message',
                'refresh-bot-response',
                'update-text-bot-size',
                'randomize-positions',
                'chatbot-response',
                'toggle-chatbot',
                'agent-switched',
                'switch-agent-response',
                'set-current-agent'
            ];
            if (validChannels.includes(channel)) {
                // Deliberately strip event as it includes `sender` 
                ipcRenderer.on(channel, (event, ...args) => func(...args));
            }
        }
    }
);
