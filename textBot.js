class TextBot {
    constructor() {
        // Message array
        this.messages = [];
        
        // Styling
        this.fontSize = 16;
        this.lineHeight = 1.0; // Tighter line height for more compact text
        this.messagePaddingX = 12; // Exactly 12px horizontal padding
        this.messagePaddingY = 7;  // Exactly 7px vertical padding
        this.messageSpacing = 10;  // Space between messages
        this.containerPadding = 20; // Padding inside the container
        this.borderRadius = 18;    // Border radius for message bubbles
        
        // Colors
        this.userColor = color(0, 122, 255); // iMessage blue
        this.botColor = color('#E9E9EB');    // iMessage gray
        this.userTextColor = color(255);     // White text for user
        this.botTextColor = color(0);        // Black text for bot
        
        // Animation properties
        this.animationDuration = 300; // Animation duration in milliseconds
        this.animating = false;       // Flag to track if animation is in progress
        this.animationStartTime = 0;  // When the animation started
        this.animationProgress = 0;   // Current animation progress (0 to 1)
        this.messageHeight = 0;       // Height of a typical message for animation
        this.messagePositions = [];   // Array to store message positions
        this.finalPositionsReached = false; // Flag to track if final positions are reached
        
        // Typing indicator properties
        this.isTyping = false;        // Flag to track if typing animation is active
        this.typingStartTime = 0;     // When the typing animation started
        this.typingDuration = 2000;   // How long to show typing before message appears (2 seconds)
        this.typingDotRadius = 4;     // Radius of typing indicator dots
        this.typingDotSpacing = 6;    // Space between typing dots
        this.typingAnimationSpeed = 600; // Speed of dot animation in milliseconds
        this.typingIsBot = true;      // Whether the typing indicator is for bot or user
        this.pendingBotMessage = null; // Pending bot message to be added after typing
        
        // Delay properties
        this.typingDelay = 1000;      // 1 second delay before typing animation starts
        this.typingDelayActive = false; // Flag to track if delay is active
        this.typingDelayStartTime = 0;  // When the delay started
        this.waitingForBotResponse = false; // Flag to track if we're waiting for bot response
        
        // Add initial messages without animation
        this.messages.push({
            text: "Hello! How can I help you today?",
            isBot: true,
            timestamp: null
        });
        
        // Set up IPC listeners for direct bot responses
        try {
            const { ipcRenderer } = require('electron');
            
            // Listen for direct bot responses
            ipcRenderer.on('bot-response-received', (event, response) => {
                this.addBotMessage(response);
            });
            
            // Listen for direct user messages
            ipcRenderer.on('user-message-received', (event, message) => {
                this.addUserMessage(message);
            });
        } catch (error) {
            console.error('Error setting up IPC listeners:', error);
        }
    }
    
    // Add a user message
    addUserMessage(text) {
        if (text.trim().length === 0) return;
        
        // Add message to array
        this.messages.push({
            text: text,
            isBot: false,
            timestamp: null
        });
        
        // Set flag to indicate we're waiting for bot response
        this.waitingForBotResponse = true;
        
        // Start delay timer for typing animation
        this.typingDelayActive = true;
        this.typingDelayStartTime = millis();
    }
    
    // Add a bot message
    addBotMessage(text) {
        console.log("TextBot: Adding bot message:", text.substring(0, 50) + (text.length > 50 ? '...' : ''));
        
        // If typing indicator is active for a bot message, store it as pending
        if (this.isTyping && this.typingIsBot) {
            console.log("TextBot: Typing indicator active, storing as pending message");
            this.pendingBotMessage = text;
            return;
        }
        
        // Add message to array
        this.messages.push({
            text: text,
            isBot: true,
            timestamp: null
        });
        
        console.log("TextBot: Bot message added to messages array, length:", this.messages.length);
        
        // Start slide-up animation for existing messages
        this.startSlideUpAnimation();
        
        // Clear the waiting flag
        this.waitingForBotResponse = false;
    }
    
    // Start slide-up animation
    startSlideUpAnimation() {
        this.animating = true;
        this.animationStartTime = millis();
        this.animationProgress = 0; // Start from 0
        // Don't reset finalPositionsReached - we want to keep messages in their final positions
        
        // Pre-calculate message positions to ensure consistent spacing
        this.calculateMessagePositions();
    }
    
    // Calculate and store message positions for consistent spacing
    calculateMessagePositions() {
        // Store the position of each message
        this.messagePositions = [];
        
        // Start from the bottom of a typical chat area
        let currentY = 0;
        
        // Process messages from newest to oldest
        for (let i = this.messages.length - 1; i >= 0; i--) {
            const message = this.messages[i];
            if (message.text.length === 0) continue;
            
            // Calculate message dimensions
            const textLines = this.getWrappedTextLines(
                message.text, 
                500 * 0.45 - this.messagePaddingX * 2 // Use a standard width for calculation
            );
            const lineHeight = this.fontSize * this.lineHeight;
            const textHeight = textLines.length * lineHeight;
            const bubbleHeight = textHeight + this.messagePaddingY * 2;
            
            // Store the position and height
            this.messagePositions.unshift({
                index: i,
                y: currentY,
                height: bubbleHeight
            });
            
            // Move up for next message with consistent spacing
            currentY += (bubbleHeight + this.messageSpacing);
        }
    }
    
    // Update animation state
    updateAnimation() {
        if (this.animating) {
            const currentTime = millis();
            const elapsed = currentTime - this.animationStartTime;
            
            if (elapsed < this.animationDuration) {
                // Calculate animation progress (0 to 1)
                const progress = elapsed / this.animationDuration;
                
                // Use easeOutCubic for smooth deceleration
                const eased = 1 - Math.pow(1 - progress, 3);
                
                // Animation is in progress
                this.animationProgress = eased;
            } else {
                // Animation is complete
                this.animating = false;
                this.animationProgress = 1; // Keep at final position
                this.finalPositionsReached = true;
            }
        }
    }
    
    // Update the bot state
    update() {
        this.updateAnimation();
        this.updateTypingIndicator();
        this.updateTypingDelay();
    }
    
    // Draw the text bot
    draw() {
        // This method now delegates to drawMessages with default parameters
        // for backward compatibility
        const chatWidth = width * 0.6;
        const chatHeight = height * 0.6;
        const chatX = width / 2;
        const chatY = height * 0.4;
        
        this.drawMessages(chatX, chatY, chatWidth, chatHeight);
    }
    
    // Draw chat messages
    drawMessages(chatX, chatY, chatWidth, chatHeight) {
        push();
        
        // Draw chat container
        fill(240);
        noStroke();
        rectMode(CENTER);
        rect(chatX, chatY, chatWidth, chatHeight, 20);
        pop();
        
        // Create a simple clipping approach using a mask
        push();
        
        // Store the original canvas state
        const originalCanvas = document.getElementById('defaultCanvas0');
        const originalContext = originalCanvas.getContext('2d');
        
        // Create a clipping path using the chat container shape
        originalContext.save();
        originalContext.beginPath();
        
        // Calculate the clipping rectangle (slightly smaller than container)
        const padding = 5;
        const clipX = chatX - chatWidth/2 + padding;
        const clipY = chatY - chatHeight/2 + padding;
        const clipWidth = chatWidth - padding * 2;
        const clipHeight = chatHeight - padding * 2;
        
        // Create a rounded rectangle path
        const radius = 15; // Rounded corners
        originalContext.moveTo(clipX + radius, clipY);
        originalContext.lineTo(clipX + clipWidth - radius, clipY);
        originalContext.arcTo(clipX + clipWidth, clipY, clipX + clipWidth, clipY + radius, radius);
        originalContext.lineTo(clipX + clipWidth, clipY + clipHeight - radius);
        originalContext.arcTo(clipX + clipWidth, clipY + clipHeight, clipX + clipWidth - radius, clipY + clipHeight, radius);
        originalContext.lineTo(clipX + radius, clipY + clipHeight);
        originalContext.arcTo(clipX, clipY + clipHeight, clipX, clipY + clipHeight - radius, radius);
        originalContext.lineTo(clipX, clipY + radius);
        originalContext.arcTo(clipX, clipY, clipX + radius, clipY, radius);
        
        // Apply the clipping path
        originalContext.clip();
        
        // Calculate visible area for messages
        const visibleAreaY = chatY - chatHeight/2 + 50;
        const visibleAreaHeight = chatHeight - 60;
        
        // Start from the bottom of the visible area
        let currentY = visibleAreaY + visibleAreaHeight - this.containerPadding;
        
        // If typing indicator is active, draw it first at the bottom
        if (this.isTyping) {
            // Bubble dimensions for typing indicator
            const bubbleWidth = 70; // Width of typing indicator bubble
            const bubbleHeight = 35; // Height of typing indicator bubble
            
            // Position based on sender (bot or user)
            const bubbleX = this.typingIsBot ? 
                chatX - chatWidth/2 + bubbleWidth/2 + this.containerPadding : 
                chatX + chatWidth/2 - bubbleWidth/2 - this.containerPadding;
            
            // Draw the bubble
            this.drawMessageBubble(bubbleX, currentY, bubbleWidth, bubbleHeight, this.typingIsBot, true);
            
            // Draw the three animated dots
            push();
            const dotY = currentY;
            const dotBaseX = bubbleX - this.typingDotSpacing * 2;
            
            // Calculate animation for dots
            const currentTime = millis();
            const animationCycle = (currentTime % this.typingAnimationSpeed) / this.typingAnimationSpeed;
            
            // Draw each dot with its own animation offset
            for (let i = 0; i < 3; i++) {
                const dotX = dotBaseX + i * this.typingDotSpacing * 2;
                
                // Calculate dot animation (0-1-0 pulsing)
                const dotOffset = (i * 0.33 + animationCycle) % 1;
                const dotScale = 0.7 + 0.3 * Math.sin(dotOffset * Math.PI * 2);
                
                // Draw the dot
                fill(this.typingIsBot ? this.botTextColor : this.userTextColor);
                noStroke();
                ellipse(dotX, dotY, this.typingDotRadius * 2 * dotScale);
            }
            pop();
            
            // Move up for next message (typing indicator)
            currentY -= (bubbleHeight + this.messageSpacing);
        }
        
        // If we haven't calculated message positions yet, do it now
        if (this.messagePositions.length === 0 && this.messages.length > 0) {
            this.calculateMessagePositions();
        }
        
        // Draw messages from newest to oldest
        const fixedSpacing = this.messageSpacing; // Use a fixed spacing value for consistency
        
        for (let i = this.messages.length - 1; i >= 0; i--) {
            const message = this.messages[i];
            if (message.text.length === 0) continue;
            
            // Calculate message dimensions for drawing
            textSize(this.fontSize);
            const textLines = this.getWrappedTextLines(
                message.text, 
                chatWidth * 0.45 - this.messagePaddingX * 2
            );
            const lineHeight = this.fontSize * this.lineHeight;
            const textHeight = textLines.length * lineHeight;
            const bubbleHeight = textHeight + this.messagePaddingY * 2;
            
            // Apply animation if needed
            let bubbleY = currentY;
            
            // Apply animation to all messages except the newest one
            if (i < this.messages.length - 1 && (this.animating || this.finalPositionsReached)) {
                // Use a consistent fixed spacing for all messages
                const messageOffset = fixedSpacing;
                
                // Use the current animation progress or 1.0 if final positions reached
                const progress = this.finalPositionsReached && !this.animating ? 1.0 : this.animationProgress;
                
                // Move messages up by this amount (negative is up)
                bubbleY -= messageOffset * progress;
            }
            
            // Draw the message
            this.drawSingleMessage(
                message.text,
                message.isBot,
                null, // No timestamp
                chatX, chatY, chatWidth, chatHeight,
                bubbleY,
                visibleAreaY, visibleAreaHeight
            );
            
            // Move up for next message with consistent spacing
            currentY -= (bubbleHeight + fixedSpacing);
        }
        
        // Disable clipping when done
        originalContext.restore();
        
        pop(); // End clipping context
    }
    
    // Helper method to draw a single message
    drawSingleMessage(messageText, isBot, timestamp, chatX, chatY, chatWidth, chatHeight, bubbleY, visibleAreaY, visibleAreaHeight) {
        // Calculate message width based on text length (with min and max)
        // First, get the words and calculate their natural width
        const words = messageText.split(' ');
        let naturalWidth = 0;
        let longestWordWidth = 0;
        
        // Set text properties for measurement
        textSize(this.fontSize);
        
        // Find the longest word and calculate natural width
        for (let word of words) {
            const wordWidth = textWidth(word);
            naturalWidth += wordWidth + textWidth(' '); // Add space width
            longestWordWidth = max(longestWordWidth, wordWidth);
        }
        
        // Ensure we have at least the width of the longest word
        // but don't exceed the max width (45% of chat width)
        const maxAllowedWidth = chatWidth * 0.45;
        const minWidth = min(longestWordWidth + this.messagePaddingX * 2, maxAllowedWidth);
        const estimatedWidth = min(
            maxAllowedWidth,
            max(minWidth, min(naturalWidth + this.messagePaddingX * 2, maxAllowedWidth))
        );
        
        // Measure text height with wrapping
        const textLines = this.getWrappedTextLines(
            messageText, 
            estimatedWidth - this.messagePaddingX * 2
        );
        
        // Calculate exact text height based on font size and line height
        const lineHeight = this.fontSize * this.lineHeight;
        const textHeight = textLines.length * lineHeight;
        
        // Add exactly 7px padding to top and bottom (14px total)
        const bubbleHeight = textHeight + this.messagePaddingY * 2;
        
        // Position based on sender
        const bubbleWidth = estimatedWidth;
        const bubbleX = isBot ? 
            chatX - chatWidth/2 + bubbleWidth/2 + this.containerPadding : 
            chatX + chatWidth/2 - bubbleWidth/2 - this.containerPadding;
        
        // Skip if the message is completely outside the visible area
        if (bubbleY - bubbleHeight/2 < visibleAreaY - 100 || 
            bubbleY + bubbleHeight/2 > visibleAreaY + visibleAreaHeight + 100) {
            return;
        }
        
        // Draw the message bubble
        this.drawMessageBubble(bubbleX, bubbleY, bubbleWidth, bubbleHeight, isBot, false);
        
        // Draw the message text
        this.drawMessageText(bubbleX, bubbleY, bubbleWidth, bubbleHeight, messageText, isBot);
        
        // Draw timestamp
        if (timestamp) {
            this.drawTimestamp(bubbleX, bubbleY + bubbleHeight/2 + 15, bubbleWidth, timestamp, isBot);
        }
    }
    
    // Get current time formatted as HH:MM
    getCurrentTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    // Draw a message bubble
    drawMessageBubble(x, y, width, height, isBot, isTyping = false) {
        push();
        
        // Set fill color based on sender
        fill(isBot ? this.botColor : this.userColor);
        
        // No stroke
        noStroke();
        
        // Draw the bubble with rounded corners
        rectMode(CENTER);
        
        if (isTyping) {
            // For typing indicator, use a simple rounded rectangle
            rect(x, y, width, height, this.borderRadius);
        } else {
            // For regular messages, add tails
            if (isBot) {
                // Bot message (left side)
                rect(x, y, width, height, this.borderRadius, this.borderRadius, this.borderRadius, 0);
                
                // Add tail for bot message at bottom left corner
                beginShape();
                const tailX = x - width/2;
                const tailY = y + height/2;
                vertex(tailX, tailY - 10); // Start 10px up from the bottom corner
                vertex(tailX - 7, tailY); // Go 7px left from the corner
                vertex(tailX, tailY); // Back to the corner
                endShape(CLOSE);
            } else {
                // User message (right side)
                rect(x, y, width, height, this.borderRadius, this.borderRadius, 0, this.borderRadius);
                
                // Add tail for user message at bottom right corner
                beginShape();
                const tailX = x + width/2;
                const tailY = y + height/2;
                
                // Starting point (at the corner)
                vertex(tailX, tailY);
                
                // Create the tail shape
                vertex(tailX + 8, tailY); // Extend horizontally
                vertex(tailX, tailY - 12); // Go up diagonally
                
                endShape(CLOSE);
            }
        }
        
        pop();
    }
    
    // Draw message text
    drawMessageText(x, y, width, height, messageText, isBot) {
        push();
        // Set text properties
        textSize(this.fontSize);
        
        if (isBot) {
            fill(this.botTextColor);
            textAlign(LEFT, TOP); // Align to top-left for precise control
            
            // Bot message text positioning
            // Calculate exact text position with precisely 12px from left and 7px from top
            const textX = x - (width / 2) + this.messagePaddingX;
            const textY = y - (height / 2) + this.messagePaddingY;
            
            // Get wrapped text lines for more precise rendering
            const textWidth = width - (this.messagePaddingX * 2);
            const lines = this.getWrappedTextLines(messageText, textWidth);
            
            // Draw each line with proper spacing
            const lineHeight = this.fontSize * this.lineHeight;
            for (let i = 0; i < lines.length; i++) {
                const lineY = textY + (i * lineHeight);
                text(lines[i], textX, lineY, textWidth);
            }
        } else {
            fill(this.userTextColor);
            textAlign(LEFT, TOP); // Align to top-left for precise control
            
            // User message text positioning
            // Calculate exact text position with precisely 12px from left and 7px from top
            const textX = x - (width / 2) + this.messagePaddingX;
            const textY = y - (height / 2) + this.messagePaddingY;
            
            // Get wrapped text lines for more precise rendering
            const textWidth = width - (this.messagePaddingX * 2);
            const lines = this.getWrappedTextLines(messageText, textWidth);
            
            // Draw each line with proper spacing
            const lineHeight = this.fontSize * this.lineHeight;
            for (let i = 0; i < lines.length; i++) {
                const lineY = textY + (i * lineHeight);
                text(lines[i], textX, lineY, textWidth);
            }
        }
        
        pop();
    }
    
    // Draw timestamp
    drawTimestamp(x, y, bubbleWidth, timestamp, isBot) {
        push();
        textSize(10);
        textAlign(isBot ? LEFT : LEFT, TOP);
        fill(100);
        
        // Calculate position based on message width and alignment
        const textX = isBot ? 
            x - bubbleWidth/2 + this.messagePaddingX : 
            x - bubbleWidth/2 + this.messagePaddingX;
            
        text(timestamp, textX, y);
        pop();
    }
    
    // Helper function to get wrapped text lines
    getWrappedTextLines(str, maxWidth) {
        if (!str) return [];
        
        // Ensure maxWidth is positive
        maxWidth = max(50, maxWidth);
        
        const words = str.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const wordWidth = textWidth(word);
            
            // If a single word is longer than maxWidth, we need to wrap it
            if (wordWidth > maxWidth) {
                // If we have content in the current line, push it first
                if (currentLine !== '') {
                    lines.push(currentLine.trim());
                    currentLine = '';
                }
                
                // Add the long word (it will be cut off, but that's better than overflow)
                lines.push(word);
                continue;
            }
            
            const testLine = currentLine + word + ' ';
            const testWidth = textWidth(testLine);
            
            if (testWidth > maxWidth && currentLine !== '') {
                lines.push(currentLine.trim());
                currentLine = word + ' ';
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine.trim() !== '') {
            lines.push(currentLine.trim());
        }
        
        // Ensure we have at least one line
        if (lines.length === 0) {
            lines.push('');
        }
        
        return lines;
    }
    
    // Process a response from OpenAI
    async processResponse(prompt) {
        // Add user message
        this.addUserMessage(prompt);
        
        try {
            // Fetch response from OpenAI
            const response = await this.fetchResponseFromOpenAI(prompt);
            
            // Add bot message
            this.addBotMessage(response);
        } catch (error) {
            console.error('Error processing response:', error);
            // Show an error message instead of a preset response
            this.addBotMessage("I'm having trouble connecting right now. Can we try again?");
        }
    }
    
    // Simulate a response (for testing)
    simulateResponse(message) {
        // Check if the message came from the chatbot interface
        // If it did, we don't need to add it or fetch a response again
        if (message.startsWith('__CHATBOT_MESSAGE__')) {
            // This is a special marker that this message was already processed
            // Just remove the marker and add the user message
            this.addUserMessage(message.replace('__CHATBOT_MESSAGE__', ''));
            return;
        }
        
        // We don't add the user message here anymore
        // It will be added by the user-message-received listener in sketch.js
        // This prevents duplicate messages
        
        // Start typing indicator immediately
        this.startTypingIndicator(true);
        
        // Send the message to the chatbot via the API bridge
        if (window.api) {
            window.api.send('get-chatbot-response', message);
        } else {
            console.error('API bridge not available. Cannot send message to chatbot.');
            this.isTyping = false;
            this.addBotMessage("I'm sorry, I can't connect to my brain right now.");
        }
    }
    
    // Fetch response from OpenAI
    async fetchResponseFromOpenAI(prompt) {
        try {
            // Use the Node.js bridge to communicate with the OpenAI API
            const { ipcRenderer } = require('electron');
            
            // Create a promise that will be resolved when the response is received
            return new Promise((resolve, reject) => {
                // Send the prompt to the main process
                ipcRenderer.send('get-chatbot-response', prompt);
                
                // Listen for the response
                ipcRenderer.once('chatbot-response', (event, response) => {
                    resolve(response);
                });
                
                // Set a timeout in case the response takes too long
                setTimeout(() => {
                    reject(new Error('Response timeout'));
                }, 30000); // 30 seconds timeout
            });
        } catch (error) {
            console.error('Error fetching response from OpenAI:', error);
            return "I'm having trouble connecting right now. Can we try again?";
        }
    }
    
    // Update typing indicator state
    updateTypingIndicator() {
        if (!this.isTyping) return;
        
        const currentTime = millis();
        const elapsedTime = currentTime - this.typingStartTime;
        
        // Check if typing animation is complete
        if (elapsedTime >= this.typingDuration) {
            this.isTyping = false;
            
            // If there's a pending bot message, add it now
            if (this.pendingBotMessage) {
                console.log("TextBot: Typing complete, adding pending bot message:", 
                    this.pendingBotMessage.substring(0, 50) + (this.pendingBotMessage.length > 50 ? '...' : ''));
                
                // Add message to array without starting a new slide-up animation
                this.messages.push({
                    text: this.pendingBotMessage,
                    isBot: true,
                    timestamp: null
                });
                
                console.log("TextBot: Pending bot message added to messages array, length:", this.messages.length);
                
                // Reset pending message
                this.pendingBotMessage = null;
                
                // Reset waiting flag
                this.waitingForBotResponse = false;
                
                // Recalculate message positions without starting animation
                this.calculateMessagePositions();
            }
        }
    }
    
    // Update typing delay state
    updateTypingDelay() {
        if (!this.typingDelayActive) return;
        
        const currentTime = millis();
        const elapsedTime = currentTime - this.typingDelayStartTime;
        
        // Check if typing delay is complete
        if (elapsedTime >= this.typingDelay) {
            this.typingDelayActive = false;
            
            // Just start typing indicator without generating a preset response
            this.startTypingIndicator(true);
        }
    }
    
    // Generate a bot response
    generateBotResponse() {
        const responses = [
            "I'm thinking about that...",
            "That's an interesting point!",
            "Let me consider that for a moment.",
            "I have some thoughts on that.",
            "Here's what I think about that.",
            "I'm not sure I understand. Can you clarify?",
            "That's a great question!",
            "I've been wondering about that too.",
            "Let me share my perspective on that.",
            "I appreciate you bringing that up."
        ];
        
        // Choose a random response
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        return randomResponse;
    }
    
    // Start typing indicator animation
    startTypingIndicator(isBot = false) {
        this.isTyping = true;
        this.typingStartTime = millis();
        this.typingIsBot = isBot;
        this.typingText = '';
        this.typingIndex = 0;
        
        // If this is a bot typing, set the waiting flag
        if (isBot) {
            this.waitingForBotResponse = true;
        }
        
        // Start slide-up animation for existing messages
        this.startSlideUpAnimation();
    }
}
