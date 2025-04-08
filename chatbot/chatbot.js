// Simple chatbot using OpenAI Assistant API
const https = require("https");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const { ElevenLabsClient, play } = require("elevenlabs");

const voiceIds = {
  "Noah Kornberg": "1ddbnEg7paPbaaAXwRhU",
  "Lydia Graveline": "R3EDLzLRtYcjlNh3Fe2a",
};
// elevenLab speech model
const MODEL_ID = "eleven_flash_v2_5";

// Try to load environment variables from .env file
try {
  dotenv.config({ path: path.join(__dirname, ".env") });
} catch (error) {
  console.error("Error loading .env file:", error);
}

// Load agents from JSON file
let agents = [];
try {
  const agentsPath = path.join(__dirname, "Agents.json");
  const agentsData = JSON.parse(fs.readFileSync(agentsPath, "utf8"));
  agents = agentsData.agents;
  console.log(`Loaded ${agents.length} agents from Agents.json`);
} catch (error) {
  console.error("Error loading agents:", error);
}

// Global variables
let apiKey = process.env.OPENAI_API_KEY;
let elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
let threadId = null;
let currentAgent = agents.find((agent) => agent.name === "Noah Kornberg") || {
  id: "asst_OrE6NxCZmMWFAUfFdgjjYagB",
  name: "Noah Kornberg",
};
let voiceId = voiceIds[currentAgent.name];

const client = new ElevenLabsClient({ apiKey: elevenLabsApiKey });

/**
 * Set the API key
 * @param {string} key - The OpenAI API key
 */
function setApiKey(key) {
  apiKey = key;
  console.log("API key set successfully");
}

/**
 * Switch to a different agent
 * @param {string} agentName - The name of the agent to switch to
 * @returns {boolean} - Whether the switch was successful
 */
function switchAgent(agentName) {
  const agent = agents.find((a) => a.name === agentName);
  if (agent) {
    currentAgent = agent;
    voiceId = voiceIds[agentName]; // Update the voice ID
    console.log(`Switched to agent: ${agent.name} (${agent.id})`);
    // Reset thread ID to start a new conversation with the new agent
    threadId = null;
    return true;
  }
  console.error(`Agent not found: ${agentName}`);
  return false;
}

/**
 * Get the current agent information
 * @returns {object} - The current agent
 */
function getCurrentAgent() {
  return currentAgent;
}

/**
 * Create a new thread for the conversation
 * @returns {Promise<string>} - The thread ID
 */
async function createThread() {
  return new Promise((resolve, reject) => {
    try {
      // Prepare request data
      const data = JSON.stringify({});

      // Set up the request options
      const options = {
        hostname: "api.openai.com",
        path: "/v1/threads",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Content-Length": data.length,
          "OpenAI-Beta": "assistants=v2",
        },
      };

      // Make the request
      const req = https.request(options, (res) => {
        let responseData = "";

        // A chunk of data has been received
        res.on("data", (chunk) => {
          responseData += chunk;
        });

        // The whole response has been received
        res.on("end", () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const parsedData = JSON.parse(responseData);
              if (parsedData.id) {
                console.log("Thread created with ID:", parsedData.id);
                resolve(parsedData.id);
              } else {
                reject(new Error("Failed to create thread: No ID returned"));
              }
            } else {
              console.error(`API Error (${res.statusCode}):`, responseData);
              reject(
                new Error(`API Error (${res.statusCode}): ${responseData}`)
              );
            }
          } catch (parseError) {
            console.error("Error parsing API response:", parseError);
            reject(parseError);
          }
        });
      });

      // Handle request errors
      req.on("error", (error) => {
        console.error("Error making API request:", error);
        reject(error);
      });

      // Send the request
      req.write(data);
      req.end();
    } catch (error) {
      console.error("Error creating thread:", error);
      reject(error);
    }
  });
}

/**
 * Add a message to the thread
 * @param {string} threadId - The thread ID
 * @param {string} content - The message content
 * @returns {Promise<string>} - The message ID
 */
async function addMessage(threadId, content) {
  return new Promise((resolve, reject) => {
    try {
      // Prepare request data
      const data = JSON.stringify({
        role: "user",
        content: content,
      });

      // Set up the request options
      const options = {
        hostname: "api.openai.com",
        path: `/v1/threads/${threadId}/messages`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Content-Length": data.length,
          "OpenAI-Beta": "assistants=v2",
        },
      };

      // Make the request
      const req = https.request(options, (res) => {
        let responseData = "";

        // A chunk of data has been received
        res.on("data", (chunk) => {
          responseData += chunk;
        });

        // The whole response has been received
        res.on("end", () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const parsedData = JSON.parse(responseData);
              if (parsedData.id) {
                console.log("Message added with ID:", parsedData.id);
                resolve(parsedData.id);
              } else {
                reject(new Error("Failed to add message: No ID returned"));
              }
            } else {
              console.error(`API Error (${res.statusCode}):`, responseData);
              reject(
                new Error(`API Error (${res.statusCode}): ${responseData}`)
              );
            }
          } catch (parseError) {
            console.error("Error parsing API response:", parseError);
            reject(parseError);
          }
        });
      });

      // Handle request errors
      req.on("error", (error) => {
        console.error("Error making API request:", error);
        reject(error);
      });

      // Send the request
      req.write(data);
      req.end();
    } catch (error) {
      console.error("Error adding message:", error);
      reject(error);
    }
  });
}

/**
 * Create a run for the assistant
 * @param {string} threadId - The thread ID
 * @returns {Promise<string>} - The run ID
 */
async function createRun(threadId) {
  return new Promise((resolve, reject) => {
    try {
      // Prepare request data with enhanced instructions
      const data = JSON.stringify({
        assistant_id: currentAgent.id,
        instructions: `You are ${currentAgent.name}, having a flirtatious conversation with someone you've just met on a dating app. 
        Your end goal is to convince the person to go on a date with you. 
        Remember to be conversational, engaging, seductive, and show personality. 
        Ask questions, share thoughts and experiences, and maintain the flow of conversation.
        Always respond with complete, thoughtful answers 
        This is an ongoing conversation, so refer to previous messages when appropriate.`,
      });

      // Set up the request options
      const options = {
        hostname: "api.openai.com",
        path: `/v1/threads/${threadId}/runs`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Content-Length": data.length,
          "OpenAI-Beta": "assistants=v2",
        },
      };

      // Make the request
      const req = https.request(options, (res) => {
        let responseData = "";

        // A chunk of data has been received
        res.on("data", (chunk) => {
          responseData += chunk;
        });

        // The whole response has been received
        res.on("end", () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const parsedData = JSON.parse(responseData);
              if (parsedData.id) {
                console.log("Run created with ID:", parsedData.id);
                resolve(parsedData.id);
              } else {
                reject(new Error("Failed to create run: No ID returned"));
              }
            } else {
              console.error(`API Error (${res.statusCode}):`, responseData);
              reject(
                new Error(`API Error (${res.statusCode}): ${responseData}`)
              );
            }
          } catch (parseError) {
            console.error("Error parsing API response:", parseError);
            reject(parseError);
          }
        });
      });

      // Handle request errors
      req.on("error", (error) => {
        console.error("Error making API request:", error);
        reject(error);
      });

      // Send the request
      req.write(data);
      req.end();
    } catch (error) {
      console.error("Error creating run:", error);
      reject(error);
    }
  });
}

/**
 * Get the status of a run
 * @param {string} threadId - The thread ID
 * @param {string} runId - The run ID
 * @returns {Promise<Object>} - The run status
 */
async function getRunStatus(threadId, runId) {
  return new Promise((resolve, reject) => {
    try {
      // Set up the request options
      const options = {
        hostname: "api.openai.com",
        path: `/v1/threads/${threadId}/runs/${runId}`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "OpenAI-Beta": "assistants=v2",
        },
      };

      // Make the request
      const req = https.request(options, (res) => {
        let responseData = "";

        // A chunk of data has been received
        res.on("data", (chunk) => {
          responseData += chunk;
        });

        // The whole response has been received
        res.on("end", () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const parsedData = JSON.parse(responseData);
              if (parsedData.status) {
                resolve(parsedData);
              } else {
                reject(
                  new Error("Failed to get run status: No status returned")
                );
              }
            } else {
              console.error(`API Error (${res.statusCode}):`, responseData);
              reject(
                new Error(`API Error (${res.statusCode}): ${responseData}`)
              );
            }
          } catch (parseError) {
            console.error("Error parsing API response:", parseError);
            reject(parseError);
          }
        });
      });

      // Handle request errors
      req.on("error", (error) => {
        console.error("Error making API request:", error);
        reject(error);
      });

      // Send the request
      req.end();
    } catch (error) {
      console.error("Error getting run status:", error);
      reject(error);
    }
  });
}

/**
 * Wait for a run to complete
 * @param {string} threadId - The thread ID
 * @param {string} runId - The run ID
 * @returns {Promise<void>} - Resolves when the run is completed
 */
async function waitForRunCompletion(threadId, runId) {
  return new Promise(async (resolve, reject) => {
    try {
      let status = "queued";

      // Poll for run status until it's completed or failed
      while (status !== "completed" && !status.includes("fail")) {
        const runStatus = await getRunStatus(threadId, runId);
        status = runStatus.status;
        console.log("Run status:", status, "for thread ID:", threadId);

        if (status === "completed") {
          resolve();
          return;
        } else if (status.includes("fail")) {
          reject(new Error(`Run failed with status: ${status}`));
          return;
        }

        // Wait before polling again
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error("Error waiting for run completion:", error);
      reject(error);
    }
  });
}

/**
 * Convert text to speech using ElevenLabs API
 * @param {string} text - The text to convert
 * @returns {Promise<string>} - The audio URL
 */
function textToSpeech(text) {
  console.log("Text to speech = " + text);
  return new Promise((resolve, reject) => {
    try {
      const audio = client.textToSpeech.convert(voiceId, {
        text: text,
        model_id: MODEL_ID,
        output_format: "mp3_44100_128",
      });
      resolve(audio);
    } catch (error) {
      console.error("Error in textToSpeech:", error);
      reject(error);
    }
  });
}
/**
 * Get messages from a thread
 * @param {string} threadId - The thread ID
 * @returns {Promise<Array>} - The messages
 */
async function getMessages(threadId) {
  return new Promise((resolve, reject) => {
    try {
      // Set up the request options
      const options = {
        hostname: "api.openai.com",
        path: `/v1/threads/${threadId}/messages`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "OpenAI-Beta": "assistants=v2",
        },
      };

      // Make the request
      const req = https.request(options, (res) => {
        let responseData = "";

        // A chunk of data has been received
        res.on("data", (chunk) => {
          responseData += chunk;
        });

        // The whole response has been received
        res.on("end", () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const parsedData = JSON.parse(responseData);
              if (parsedData.data) {
                console.log("Messages retrieved:", parsedData.data.length);
                resolve(parsedData.data);
              } else {
                reject(new Error("Failed to get messages: No data returned"));
              }
            } else {
              console.error(`API Error (${res.statusCode}):`, responseData);
              reject(
                new Error(`API Error (${res.statusCode}): ${responseData}`)
              );
            }
          } catch (parseError) {
            console.error("Error parsing API response:", parseError);
            reject(parseError);
          }
        });
      });

      // Handle request errors
      req.on("error", (error) => {
        console.error("Error making API request:", error);
        reject(error);
      });

      // Send the request
      req.end();
    } catch (error) {
      console.error("Error getting messages:", error);
      reject(error);
    }
  });
}

/**
 * Get a response from the AI assistant
 * @param {string} userInput - The user's message
 * @returns {Promise<string>} - The AI's response
 */
async function getAiResponse(userInput) {
  try {
    if (!apiKey) {
      return "API key not set. Please provide an OpenAI API key.";
    }

    // Create a thread if one doesn't exist
    if (!threadId) {
      threadId = await createThread();
      console.log(
        "Using OpenAI API key from .env file for Assistant:",
        currentAgent.name
      );

      // Add an initial system message to set the tone
      await addMessage(
        threadId,
        "Remember to be conversational and engaging. Always provide thoughtful, multi-sentence responses."
      );
    }

    // Add the user message to the thread
    await addMessage(threadId, userInput);

    // Create a run for the assistant
    const runId = await createRun(threadId);

    // Wait for the run to complete
    await waitForRunCompletion(threadId, runId);

    // Get the messages from the thread
    const messages = await getMessages(threadId);

    // Find the latest assistant message
    const assistantMessages = messages.filter(
      (msg) => msg.role === "assistant"
    );
    if (assistantMessages.length > 0) {
      // Get the most recent message (they come in reverse chronological order)
      const latestMessage = assistantMessages[0];

      // Extract the text content from the message
      if (latestMessage.content && latestMessage.content.length > 0) {
        const textContent = latestMessage.content.find(
          (content) => content.type === "text"
        );
        if (textContent && textContent.text) {
          console.log("Chatbot response received:", textContent.text.value);

          // Convert the response to speech but don't play it yet
          const audio = await textToSpeech(textContent.text.value);

          // Store the audio for later playback
          setTimeout(() => {
            // Play the audio after a short delay to allow the UI to update
            play(audio);
          }, 300); // 300ms delay to ensure UI has time to display the message

          return textContent.text.value;
        }
      }
    }

    return "I don't have a response for that right now.";
  } catch (error) {
    console.error("Error in getAiResponse:", error);
    return "Sorry, I couldn't process that. Let's try something else.";
  }
}

// Export the functions
module.exports = {
  getAiResponse,
  setApiKey,
  switchAgent,
  getCurrentAgent,
  // textToSpeech
};
