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
  try {
    console.log('Getting response from Assistant for:', userInput);
    const response = await chatbot.getAiResponse(userInput);
    console.log('Response received from Assistant:', response.substring(0, 50) + (response.length > 50 ? '...' : ''));
    return response;
  } catch (error) {
    console.error('Error getting chatbot response:', error);
    return "I'm having trouble connecting right now. Please try again in a moment.";
  }
}

/**
 * Set the API key for OpenAI
 * @param {string} key - The OpenAI API key
 */
function setApiKey(key) {
  chatbot.setApiKey(key);
}

// Export functions
module.exports = {
  getChatbotResponse,
  setApiKey,
  botName: chatbot.botName,
  assistantId: chatbot.assistantId
};
