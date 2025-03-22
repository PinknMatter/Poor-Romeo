// Create a new OpenAI Assistant with file search capability using vector stores
const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');

// Bot configuration
const botName = "Lydia Graveline";
const systemPrompt = `Your name is ${botName}, and you're having a conversation with someone you've just met. 

You should be conversational, engaging, and show personality throughout the conversation. 
Always respond with complete, thoughtful answers (at least a few sentences).
Never respond with just one or two words.

Ask follow-up questions about what the person is saying to show interest.
Share your own thoughts, opinions, and experiences when relevant.
Maintain the flow of conversation by referring to previous messages.
Be open, friendly, and authentic in your responses.

Remember that this is an ongoing conversation, so build upon what has been discussed previously.`;
const model = "ft:gpt-4o-2024-08-06:personal:all-lydia-dms:B8gGgc3j";

// Try to load API key from .env file
let apiKey = '';
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const apiKeyMatch = envContent.match(/OPENAI_API_KEY=([^\s]+)/);
    if (apiKeyMatch && apiKeyMatch[1]) {
      apiKey = apiKeyMatch[1];
      console.log('OpenAI API key loaded from .env file');
    } else {
      console.error('OpenAI API key not found in .env file');
      process.exit(1);
    }
  } else {
    console.error('.env file not found');
    process.exit(1);
  }
} catch (error) {
  console.error('Error loading API key:', error);
  process.exit(1);
}

/**
 * Make an API request to OpenAI
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} path - API endpoint path
 * @param {object|null} data - Request data (for POST, PUT, etc.)
 * @param {object} headers - Additional headers
 * @returns {Promise<object>} - API response
 */
async function makeApiRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.openai.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
        ...headers
      }
    };

    if (data && !headers['Content-Type']) {
      options.headers['Content-Type'] = 'application/json';
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const parsedData = JSON.parse(responseData);
            resolve(parsedData);
          } else {
            console.error(`API Error (${res.statusCode}):`, responseData);
            reject(new Error(`API Error (${res.statusCode}): ${responseData}`));
          }
        } catch (error) {
          console.error('Error parsing API response:', error);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Error making API request:', error);
      reject(error);
    });
    
    if (data) {
      if (typeof data === 'string') {
        req.write(data);
      } else if (Buffer.isBuffer(data)) {
        req.write(data);
      } else {
        req.write(JSON.stringify(data));
      }
    }
    
    req.end();
  });
}

/**
 * Upload a file to OpenAI
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - File ID
 */
async function uploadFile(filePath) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(filePath)) {
        reject(new Error(`File not found: ${filePath}`));
        return;
      }

      // Handle unsupported extensions by creating a temporary copy with .txt extension
      let tempFilePath = filePath;
      let needsCleanup = false;
      
      if (filePath.endsWith('.jsonl')) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        tempFilePath = filePath.replace('.jsonl', '.txt');
        fs.writeFileSync(tempFilePath, fileContent);
        console.log(`Created temporary file with .txt extension: ${tempFilePath}`);
        needsCleanup = true;
      }

      const fileStream = fs.createReadStream(tempFilePath);
      const fileName = path.basename(tempFilePath);
      const stats = fs.statSync(tempFilePath);
      
      // Create form data
      const form = new FormData();
      form.append('purpose', 'assistants');
      form.append('file', fileStream, {
        filename: fileName,
        contentType: fileName.endsWith('.json') ? 'application/json' : 'text/plain',
        knownLength: stats.size
      });
      
      // Make request
      const req = https.request({
        hostname: 'api.openai.com',
        path: '/v1/files',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v2',
          ...form.getHeaders()
        }
      }, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            // Clean up temporary file if needed
            if (needsCleanup && fs.existsSync(tempFilePath) && tempFilePath !== filePath) {
              fs.unlinkSync(tempFilePath);
              console.log(`Cleaned up temporary file: ${tempFilePath}`);
            }
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const parsedData = JSON.parse(responseData);
              if (parsedData.id) {
                console.log(`File uploaded: ${fileName} (ID: ${parsedData.id})`);
                resolve(parsedData.id);
              } else {
                reject(new Error('Failed to upload file: No ID returned'));
              }
            } else {
              console.error(`API Error (${res.statusCode}):`, responseData);
              reject(new Error(`API Error (${res.statusCode}): ${responseData}`));
            }
          } catch (error) {
            console.error('Error parsing API response:', error);
            reject(error);
          }
        });
      });
      
      req.on('error', (error) => {
        // Clean up temporary file if needed
        if (needsCleanup && fs.existsSync(tempFilePath) && tempFilePath !== filePath) {
          fs.unlinkSync(tempFilePath);
          console.log(`Cleaned up temporary file: ${tempFilePath}`);
        }
        
        console.error('Error uploading file:', error);
        reject(error);
      });
      
      // Pipe form data to request
      form.pipe(req);
      
    } catch (error) {
      console.error('Error in uploadFile:', error);
      reject(error);
    }
  });
}

/**
 * Create a vector store and add files to it
 * @param {string} name - Vector store name
 * @param {Array<string>} fileIds - File IDs to add to the vector store
 * @returns {Promise<object>} - Vector store object
 */
async function createVectorStore(name, fileIds) {
  console.log(`Creating vector store "${name}" with ${fileIds.length} files...`);
  const data = {
    name,
    file_ids: fileIds
  };
  
  const vectorStore = await makeApiRequest('POST', '/v1/vector_stores', data);
  console.log(`Vector store created with ID: ${vectorStore.id}`);
  
  // Poll for file ingestion completion
  let isComplete = false;
  let attempts = 0;
  const maxAttempts = 30; // 5 minutes with 10-second intervals
  
  console.log('Waiting for file ingestion to complete...');
  while (!isComplete && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    
    const status = await makeApiRequest('GET', `/v1/vector_stores/${vectorStore.id}`);
    console.log(`File ingestion status: ${status.file_counts.processed}/${status.file_counts.total} files processed`);
    
    if (status.file_counts.processed === status.file_counts.total) {
      isComplete = true;
      console.log('File ingestion complete!');
    }
    
    attempts++;
  }
  
  if (!isComplete) {
    console.warn('File ingestion timed out, but proceeding anyway...');
  }
  
  return vectorStore;
}

/**
 * Create a new assistant with vector store for file search
 * @param {object} options - Assistant options
 * @param {string} vectorStoreId - Vector store ID
 * @returns {Promise<object>} - Assistant object
 */
async function createAssistant(options, vectorStoreId) {
  const data = {
    name: options.name,
    instructions: options.instructions,
    model: options.model,
    tools: options.tools || [],
    tool_resources: {
      file_search: {
        vector_store_ids: [vectorStoreId]
      }
    }
  };
  
  return makeApiRequest('POST', '/v1/assistants', data);
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Creating a new assistant with file search capability using vector stores...');
    
    // File paths
    const filePath1 = path.join(__dirname, '..', 'formatted_finetuning_data.jsonl');
    const filePath2 = path.join(__dirname, '..', 'Clean_data', 'Lydia_hinge_data.json');
    
    // Check if files exist
    if (!fs.existsSync(filePath1)) {
      console.error(`File not found: ${filePath1}`);
      process.exit(1);
    }
    
    if (!fs.existsSync(filePath2)) {
      console.error(`File not found: ${filePath2}`);
      process.exit(1);
    }
    
    // Install form-data package if not already installed
    try {
      require.resolve('form-data');
    } catch (e) {
      console.log('Installing form-data package...');
      const { execSync } = require('child_process');
      execSync('npm install form-data', { stdio: 'inherit' });
      console.log('form-data package installed.');
    }
    
    // Upload files
    console.log('Uploading files...');
    const fileId1 = await uploadFile(filePath1);
    const fileId2 = await uploadFile(filePath2);
    const fileIds = [fileId1, fileId2];
    
    // Create vector store with files
    const vectorStore = await createVectorStore("Lydia's Data", fileIds);
    
    // Create assistant with vector store
    console.log('Creating assistant with vector store...');
    const assistant = await createAssistant({
      name: botName,
      instructions: systemPrompt,
      model: model,
      tools: [{ type: 'file_search' }]
    }, vectorStore.id);
    
    console.log('\n=== Assistant Created ===');
    console.log(`ID: ${assistant.id}`);
    console.log(`Name: ${assistant.name}`);
    console.log(`Model: ${assistant.model}`);
    console.log(`Tools: ${assistant.tools.map(tool => tool.type).join(', ')}`);
    console.log(`Vector Store ID: ${assistant.tool_resources?.file_search?.vector_store_ids[0]}`);
    
    // Save assistant ID to file
    const assistantIdFile = path.join(__dirname, 'assistant-id.txt');
    fs.writeFileSync(assistantIdFile, assistant.id);
    console.log(`\nAssistant ID saved to: ${assistantIdFile}`);
    
    // Save vector store ID to file for future reference
    const vectorStoreIdFile = path.join(__dirname, 'vector-store-id.txt');
    fs.writeFileSync(vectorStoreIdFile, vectorStore.id);
    console.log(`Vector Store ID saved to: ${vectorStoreIdFile}`);
    
    console.log('\nYou can now use this assistant in your application.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the main function
main();
