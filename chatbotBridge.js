// chatbotBridge.js - Bridge between Electron and the chatbot
const path = require('path');
const fs = require('fs');

// Import the chatbot module directly (no dynamic imports)
const chatbot = require('./chatbot/chatbot.js');

// Try to read the API key from the .env file
try {
  const envPath = path.join(__dirname, 'chatbot', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const apiKeyMatch = envContent.match(/OPENAI_API_KEY=([^\s]+)/);
    if (apiKeyMatch && apiKeyMatch[1]) {
      chatbot.setApiKey(apiKeyMatch[1]);
      console.log('OpenAI API key loaded from .env file');
    } else {
      console.error('OpenAI API key not found in .env file');
    }
  } else {
    console.error('.env file not found in chatbot directory');
  }
} catch (error) {
  console.error('Error loading API key:', error);
}

/**
 * Get a response from the chatbot
 * @param {string} userInput - The user's message
 * @returns {Promise<string>} - The chatbot's response
 */
async function getChatbotResponse(userInput) {
  console.log('Getting response from Assistant for:', userInput);
  try {
    return await chatbot.getAiResponse(userInput);
  } catch (error) {
    console.error('Error getting chatbot response:', error);
    return `Error: ${error.message}`;
  }
}

/**
 * Switch to a different agent
 * @param {string} agentName - The name of the agent to switch to
 * @returns {boolean} - Whether the switch was successful
 */
function switchAgent(agentName) {
  console.log('Switching to agent:', agentName);
  try {
    return chatbot.switchAgent(agentName);
  } catch (error) {
    console.error('Error switching agent:', error);
    return false;
  }
}

/**
 * Get the current agent information
 * @returns {object} - The current agent information
 */
function getCurrentAgent() {
  return chatbot.getCurrentAgent();
}

/**
 * Set the API key for OpenAI
 * @param {string} key - The OpenAI API key
 */
function setApiKey(key) {
  chatbot.setApiKey(key);
}

// Export the functions and properties
module.exports = {
  getChatbotResponse,
  switchAgent,
  getCurrentAgent,
  setApiKey
};
