class MessageManager {
    constructor() {
        this.displayMessages = [];
        this.isLoaded = false;
        this.lastMessageTime = 0;
        this.maxAttempts = 15;
        this.messageInterval = window.messageInterval || 1000; // Add messageInterval property
        
        // Cache for message widths
        this.messageCache = new Map();
        
        // Performance tracking
        this.lastCleanup = 0;
        this.cleanupInterval = 5000;
        this.lastPerformanceCheck = 0;
        this.performanceCheckInterval = 1000;
        this.lowPerformanceMode = false;
        
        // Font size tracking
        this.lastFontSize = window.currentTextSize || 16;
        this.fontSizeTransitionSpeed = 0.2; // Controls how quickly font size changes are applied
        this.fontTransitionActive = false;
        this.targetFontSize = this.lastFontSize;
        this.currentTransitionFontSize = this.lastFontSize;
        
        // Custom words array
        this.customWords = [];
        this.currentWordIndex = 0; // Track current word index for cycling
        
        // Bounding box visualization
        this.showBoundingBoxes = false;
    }

    loadMessages(data) {
        if (!data.messages || !Array.isArray(data.messages)) {
            console.error('Invalid data format');
            return;
        }
        this.messageData = data.messages;
        this.totalMessages = this.messageData.length;
        this.isLoaded = true;
    }
    
    loadCustomWords(words) {
        if (!Array.isArray(words) || words.length === 0) {
            console.error('Invalid words array');
            return;
        }
        this.customWords = words;
        this.totalMessages = this.customWords.length;
        this.isLoaded = true;
        console.log(`Loaded ${this.totalMessages} custom words`);
    }

    clearCache() {
        this.messageCache.clear();
    }

    getRandomMessage() {
        if (this.customWords && this.customWords.length > 0) {
            // Use custom words and cycle through them
            const message = this.customWords[this.currentWordIndex];
            
            // Move to the next word, cycling back to the beginning if needed
            this.currentWordIndex = (this.currentWordIndex + 1) % this.customWords.length;
            
            // Calculate width using current text size
            push();
            textSize(window.currentTextSize || 16);
            const width = textWidth(message);
            pop();
            
            return { message, width };
        } else if (this.messageData && this.messageData.length > 0) {
            // Fallback to message data if available
            const index = Math.floor(random(this.totalMessages));
            const message = this.messageData[index].message;
            
            // Calculate width using current text size
            push();
            textSize(window.currentTextSize || 16);
            const width = textWidth(message);
            pop();
            
            return { message, width };
        } else {
            // Default message if nothing is available
            const message = "No messages available";
            
            push();
            textSize(window.currentTextSize || 16);
            const width = textWidth(message);
            pop();
            
            return { message, width };
        }
    }

    checkOverlap(x, y, messageWidth, fontSize) {
        // Calculate the exact dimensions of the highlight box
        const padding = fontSize * 0.1; // Same padding as in TextMessage class
        
        const box = {
            left: x - messageWidth/2 - 5,
            right: x + messageWidth/2 + 5,
            top: y - fontSize/2 - padding,
            bottom: y + fontSize/2 + padding
        };

        // Debug overlap detection for large fonts
        const isLargeFont = fontSize >= 60;
        if (isLargeFont && this.displayMessages.length > 0) {
            console.log(`Checking overlap for message at (${x}, ${y}) with font size ${fontSize}`);
        }

        for (const msg of this.displayMessages) {
            if (!msg.isVisible) continue;
            if (msg.x === x && msg.y === y) continue; // Skip comparing with itself

            const msgFontSize = window.currentTextSize || 16;
            const msgWidth = this.getMessageWidth(msg.message);
            const msgPadding = msgFontSize * 0.1; // Same padding as in TextMessage class
            
            const msgBox = {
                left: msg.x - msgWidth/2 - 5,
                right: msg.x + msgWidth/2 + 5,
                top: msg.y - msgFontSize/2 - msgPadding,
                bottom: msg.y + msgFontSize/2 + msgPadding
            };

            // Check for overlap
            const overlaps = !(box.right < msgBox.left || 
                              box.left > msgBox.right || 
                              box.bottom < msgBox.top || 
                              box.top > msgBox.bottom);
            
            // Debug overlap detection for large fonts
            if (isLargeFont && overlaps) {
                console.log(`Overlap detected with message at (${msg.x}, ${msg.y})`);
            }

            if (overlaps) {
                return true; // Overlap detected
            }
        }
        
        return false; // No overlap
    }

    getMessageWidth(message) {
        const fontSize = window.currentTextSize || 16;
        const cacheKey = `${message}-${fontSize}`;
        
        if (!this.messageCache.has(cacheKey)) {
            textSize(fontSize);
            this.messageCache.set(cacheKey, textWidth(message));
        }
        return this.messageCache.get(cacheKey);
    }

    createNewMessage() {
        if (!this.isLoaded) return false;

        const fontSize = window.currentTextSize || 16;
        const boundingBoxMultiplier = window.boundingBoxSize || 0.3;
        const padding = fontSize * boundingBoxMultiplier;
        
        // Increase attempts for larger font sizes
        const maxTotalAttempts = fontSize >= 60 ? this.maxAttempts * 8 : this.maxAttempts * 4;
        
        // Track attempts to find a position
        let totalAttempts = 0;
        
        // Try to find a position without overlap
        while (totalAttempts < maxTotalAttempts) {
            const messageData = this.getRandomMessage();
            const messageWidth = this.getMessageWidth(messageData.message);
            
            // Calculate available width and height
            const availableWidth = width - (2 * padding);
            const availableHeight = height - (2 * padding);
            
            // Skip if the message is too wide for the screen
            if (messageWidth > availableWidth) {
                totalAttempts++;
                continue;
            }
            
            // Use random placement for all font sizes
            const x = random(messageWidth/2 + padding, width - messageWidth/2 - padding);
            const y = random(fontSize + padding, height - fontSize - padding);
            
            // Ensure message is within bounds
            if (x - messageWidth/2 < padding || 
                x + messageWidth/2 > width - padding ||
                y - fontSize < padding ||
                y + fontSize/2 > height - padding) {
                totalAttempts++;
                continue;
            }
            
            // Perform a thorough overlap check
            let hasOverlap = false;
            
            // First use our checkOverlap function
            hasOverlap = this.checkOverlap(x, y, messageWidth, fontSize);
            
            // Only create message if there's absolutely no overlap
            if (!hasOverlap) {
                console.log(`Creating new message at (${x}, ${y}) with font size ${fontSize}`);
                const message = new TextMessage(messageData.message, x, y);
                this.displayMessages.push(message);
                
                // Double-check after creation to ensure no overlap
                const finalCheck = this.checkForAnyOverlap();
                if (finalCheck) {
                    console.warn("Overlap detected after message creation! Removing newest message.");
                    this.displayMessages.pop();
                    return false;
                }
                
                return true;
            }
            
            totalAttempts++;
        }
        
        // Never force placement if no space is available
        console.log("No space available for new message. Skipping message creation.");
        return false;
    }
    
    // Helper method to check if any messages overlap with each other
    checkForAnyOverlap() {
        const messages = this.displayMessages.filter(msg => msg.isVisible);
        
        for (let i = 0; i < messages.length; i++) {
            const msg1 = messages[i];
            const fontSize = window.currentTextSize || 16;
            const padding = fontSize * 0.1; // Same padding as in TextMessage class
            const msgWidth = this.getMessageWidth(msg1.message);
            
            const box1 = {
                left: msg1.x - msgWidth/2 - 5,
                right: msg1.x + msgWidth/2 + 5,
                top: msg1.y - fontSize/2 - padding,
                bottom: msg1.y + fontSize/2 + padding
            };
            
            for (let j = i + 1; j < messages.length; j++) {
                const msg2 = messages[j];
                const msg2Width = this.getMessageWidth(msg2.message);
                
                const box2 = {
                    left: msg2.x - msg2Width/2 - 5,
                    right: msg2.x + msg2Width/2 + 5,
                    top: msg2.y - fontSize/2 - padding,
                    bottom: msg2.y + fontSize/2 + padding
                };
                
                if (!(box1.right < box2.left || 
                      box1.left > box2.right || 
                      box1.bottom < box2.top || 
                      box1.top > box2.bottom)) {
                    console.log(`Overlap detected between messages at (${msg1.x}, ${msg1.y}) and (${msg2.x}, ${msg2.y})`);
                    return true;
                }
            }
        }
        
        return false;
    }

    cleanupMessages() {
        const now = millis();
        
        // Count visible messages before cleanup
        const visibleBefore = this.displayMessages.filter(msg => msg.isVisible).length;
        
        this.displayMessages = this.displayMessages.filter(msg => {
            const keep = msg.isVisible && (now - msg.birth < msg.lifetime);
            if (!keep) {
                msg.cleanup();
            }
            return keep;
        });
        
        // Count visible messages after cleanup
        const visibleAfter = this.displayMessages.length;
        
        // Log if we cleaned up a significant number of messages
        if (visibleBefore - visibleAfter > 3) {
            console.log(`Cleaned up ${visibleBefore - visibleAfter} messages. ${visibleAfter} remaining.`);
        }
    }

    checkPerformance() {
        const now = millis();
        if (now - this.lastPerformanceCheck > this.performanceCheckInterval) {
            const fps = frameRate();
            this.lowPerformanceMode = fps < 30;
            
            const maxMessages = window.maxMessages || 15;
            if (this.lowPerformanceMode) {
                while (this.displayMessages.length > maxMessages/2) {
                    const msg = this.displayMessages.shift();
                    if (msg) msg.cleanup();
                }
            }
            
            this.lastPerformanceCheck = now;
        }
    }

    update() {
        const now = millis();
        
        this.checkPerformance();
        
        if (now - this.lastCleanup > this.cleanupInterval) {
            this.cleanupMessages();
            this.lastCleanup = now;
        }

        // Check if font size target changed
        const targetFontSize = window.currentTextSize || 16;
        if (targetFontSize !== this.targetFontSize) {
            this.targetFontSize = targetFontSize;
            this.fontTransitionActive = true;
        }
        
        // Handle smooth font size transition
        if (this.fontTransitionActive) {
            // Check if transition speed is 1 (instant change)
            if (this.fontSizeTransitionSpeed >= 1) {
                // Apply instant change
                this.currentTransitionFontSize = this.targetFontSize;
                this.fontTransitionActive = false;
                
                // Apply final font size and handle positioning
                this.handleFontSizeChange();
                this.lastFontSize = this.currentTransitionFontSize;
            } else {
                // Calculate new transition font size with easing
                const diff = this.targetFontSize - this.currentTransitionFontSize;
                if (Math.abs(diff) < 0.1) {
                    // Close enough to target, complete the transition
                    this.currentTransitionFontSize = this.targetFontSize;
                    this.fontTransitionActive = false;
                    
                    // Apply final font size and handle positioning
                    if (this.currentTransitionFontSize !== this.lastFontSize) {
                        this.handleFontSizeChange();
                        this.lastFontSize = this.currentTransitionFontSize;
                    }
                } else {
                    // Smooth transition with easing
                    this.currentTransitionFontSize += diff * this.fontSizeTransitionSpeed;
                    
                    // Update positions gradually during transition
                    if (frameCount % 5 === 0) { // Only update every 5 frames for performance
                        this.handleFontSizeChange();
                    }
                }
            }
            
            // Apply the transition font size
            window.currentTextSize = this.currentTransitionFontSize;
        }

        const maxMessages = window.maxMessages || 15;
        
        if (!this.lowPerformanceMode && 
            now - this.lastMessageTime > this.messageInterval && 
            this.displayMessages.length < maxMessages) {
            if (this.createNewMessage()) {
                this.lastMessageTime = now;
            }
        }

        for (const msg of this.displayMessages) {
            if (msg.isVisible) {
                msg.update();
            }
        }
    }

    handleFontSizeChange() {
        const currentFontSize = window.currentTextSize || 16;
        const isLargeFont = currentFontSize >= 60;
        
        // Clear message width cache as it depends on font size
        this.messageCache.clear();
        
        // Sort messages by age (oldest first) to prioritize keeping older messages
        const messages = [...this.displayMessages].sort((a, b) => a.birth - b.birth);
        
        // For very large font sizes, we may need to reduce the number of messages
        if (isLargeFont) {
            const maxMessagesForLargeFont = Math.min(
                window.maxMessages || 15, 
                Math.floor(15 * (80 / currentFontSize)) // Scale down max messages based on font size
            );
            
            console.log(`Large font size detected (${currentFontSize}px). Limiting to ${maxMessagesForLargeFont} messages.`);
            
            // If we have more messages than the limit, remove the newest ones
            if (messages.length > maxMessagesForLargeFont) {
                // Keep the oldest messages up to the limit
                const messagesToKeep = messages.slice(0, maxMessagesForLargeFont);
                const messagesToRemove = messages.slice(maxMessagesForLargeFont);
                
                // Remove excess messages
                for (const msg of messagesToRemove) {
                    msg.isVisible = false;
                    msg.cleanup();
                }
                
                // Update display messages
                this.displayMessages = this.displayMessages.filter(msg => messagesToKeep.includes(msg));
            }
        }
        
        // First check which messages actually need repositioning
        const messagesToReposition = [];
        
        for (const msg of this.displayMessages) {
            if (!msg.isVisible) continue;
            
            const messageWidth = this.getMessageWidth(msg.message);
            
            // Check if the message would be too wide for the screen with the new font size
            const margin = isLargeFont ? currentFontSize * 1.25 : currentFontSize * 0.75;
            const availableWidth = width - (2 * margin);
            
            if (messageWidth > availableWidth) {
                // Message is too wide for screen, mark for removal
                msg.isVisible = false;
                msg.cleanup();
                continue;
            }
            
            // Check if the message would overlap with any other message at its current position
            // Only reposition if there's an overlap
            if (this.checkOverlap(msg.x, msg.y, messageWidth, currentFontSize)) {
                messagesToReposition.push(msg);
            }
        }
        
        // Clean up any messages that were marked as not visible
        this.displayMessages = this.displayMessages.filter(msg => msg.isVisible);
        
        // Only redistribute messages that actually need repositioning
        if (messagesToReposition.length > 0) {
            this.redistributeMessages(messagesToReposition, currentFontSize);
            
            // After redistribution, check if any messages still overlap
            // If they do, remove them (prioritizing keeping older messages)
            const stillOverlapping = this.displayMessages.filter(msg => {
                if (!msg.isVisible) return false;
                
                const messageWidth = this.getMessageWidth(msg.message);
                return this.checkOverlap(msg.x, msg.y, messageWidth, currentFontSize);
            });
            
            if (stillOverlapping.length > 0) {
                console.log(`${stillOverlapping.length} messages still overlap after redistribution. Removing newest ones.`);
                
                // Sort by age (newest first) to remove newest messages first
                stillOverlapping.sort((a, b) => b.birth - a.birth);
                
                // Remove half of the overlapping messages
                const messagesToRemove = stillOverlapping.slice(0, Math.ceil(stillOverlapping.length / 2));
                
                for (const msg of messagesToRemove) {
                    msg.isVisible = false;
                    msg.cleanup();
                }
                
                // Update display messages
                this.displayMessages = this.displayMessages.filter(msg => msg.isVisible);
                
                // Try redistributing again with the remaining messages
                this.redistributeMessages(this.displayMessages, currentFontSize);
            }
        }
    }
    
    redistributeMessages(messages, fontSize) {
        // If no messages, nothing to do
        if (messages.length === 0) return;
        
        // Calculate available space
        const margin = fontSize * 0.75; // Consistent margin calculation
        const availableWidth = width - (2 * margin);
        const availableHeight = height - (2 * margin);
        
        // Create a grid system for better distribution
        const gridCellSize = fontSize * 4; // Increase grid cell size based on font size
        const gridColumns = Math.floor(availableWidth / gridCellSize);
        const gridRows = Math.floor(availableHeight / gridCellSize);
        
        // Track occupied grid cells - initialize with cells occupied by messages that don't need repositioning
        const occupiedCells = new Set();
        
        // First mark cells occupied by messages that aren't being repositioned
        for (const msg of this.displayMessages) {
            if (!msg.isVisible) continue;
            
            // Skip messages that are in our repositioning list
            if (messages.includes(msg)) continue;
            
            // Mark this message's cell as occupied
            const row = Math.floor((msg.y - margin) / gridCellSize);
            const col = Math.floor((msg.x - margin) / gridCellSize);
            occupiedCells.add(`${row}-${col}`);
            
            // Also mark adjacent cells as occupied to ensure better spacing
            for (let r = row - 1; r <= row + 1; r++) {
                for (let c = col - 1; c <= col + 1; c++) {
                    if (r >= 0 && r < gridRows && c >= 0 && c < gridColumns) {
                        occupiedCells.add(`${r}-${c}`);
                    }
                }
            }
        }
        
        // Try to find positions for messages that need repositioning
        for (const msg of messages) {
            const messageWidth = this.getMessageWidth(msg.message);
            
            // First try to keep the message at its current position with minimal movement
            let positioned = false;
            
            // Try small adjustments around the current position first
            const adjustments = [
                [0, 0],     // Try current position first (might work with new font size)
                [-1, 0],    // Left
                [1, 0],     // Right
                [0, -1],    // Up
                [0, 1],     // Down
                [-1, -1],   // Up-Left
                [-1, 1],    // Down-Left
                [1, -1],    // Up-Right
                [1, 1]      // Down-Right
            ];
            
            const adjustmentSize = fontSize;
            
            // Try small adjustments first
            for (const [xAdj, yAdj] of adjustments) {
                const newX = msg.x + (xAdj * adjustmentSize);
                const newY = msg.y + (yAdj * adjustmentSize);
                
                // Skip if the message would go outside the canvas
                if (newX - messageWidth/2 < margin || 
                    newX + messageWidth/2 > width - margin ||
                    newY - fontSize < margin ||
                    newY + fontSize/2 > height - margin) {
                    continue;
                }
                
                // Check if this position works
                if (!this.checkOverlap(newX, newY, messageWidth, fontSize)) {
                    msg.x = newX;
                    msg.y = newY;
                    
                    // Mark grid cell as occupied
                    const row = Math.floor((newY - margin) / gridCellSize);
                    const col = Math.floor((newX - margin) / gridCellSize);
                    occupiedCells.add(`${row}-${col}`);
                    
                    // Also mark adjacent cells as occupied
                    for (let r = row - 1; r <= row + 1; r++) {
                        for (let c = col - 1; c <= col + 1; c++) {
                            if (r >= 0 && r < gridRows && c >= 0 && c < gridColumns) {
                                occupiedCells.add(`${r}-${c}`);
                            }
                        }
                    }
                    
                    positioned = true;
                    break;
                }
            }
            
            // If small adjustments didn't work, try to find a position in the grid
            if (!positioned) {
                // Try to keep message near its current position if possible
                let bestX = msg.x;
                let bestY = msg.y;
                let bestDistance = Infinity;
                
                // Try grid positions
                for (let row = 0; row < gridRows; row++) {
                    for (let col = 0; col < gridColumns; col++) {
                        const cellKey = `${row}-${col}`;
                        if (occupiedCells.has(cellKey)) continue;
                        
                        const x = (col * gridCellSize) + (gridCellSize / 2) + margin;
                        const y = (row * gridCellSize) + (gridCellSize / 2) + margin;
                        
                        // Skip if message would extend beyond canvas
                        if (x - messageWidth/2 < margin || 
                            x + messageWidth/2 > width - margin ||
                            y - fontSize < margin ||
                            y + fontSize/2 > height - margin) {
                            continue;
                        }
                        
                        // Calculate distance from original position
                        const distance = dist(x, y, msg.x, msg.y);
                        
                        // Check if this position is better than current best
                        if (distance < bestDistance && !this.checkOverlap(x, y, messageWidth, fontSize)) {
                            bestX = x;
                            bestY = y;
                            bestDistance = distance;
                            positioned = true;
                        }
                    }
                }
                
                if (positioned) {
                    // Update message position
                    msg.x = bestX;
                    msg.y = bestY;
                    
                    // Mark grid cell as occupied
                    const row = Math.floor((bestY - margin) / gridCellSize);
                    const col = Math.floor((bestX - margin) / gridCellSize);
                    occupiedCells.add(`${row}-${col}`);
                    
                    // Also mark adjacent cells as occupied
                    for (let r = row - 1; r <= row + 1; r++) {
                        for (let c = col - 1; c <= col + 1; c++) {
                            if (r >= 0 && r < gridRows && c >= 0 && c < gridColumns) {
                                occupiedCells.add(`${r}-${c}`);
                            }
                        }
                    }
                } else {
                    // If no good position found, try random position as last resort
                    this.findNewPosition(msg);
                }
            }
        }
    }

    findNewPosition(msg) {
        const fontSize = window.currentTextSize || 16;
        const margin = fontSize * 0.75; // Consistent margin calculation
        const messageWidth = this.getMessageWidth(msg.message);
        
        for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
            const x = random(messageWidth/2 + margin, width - messageWidth/2 - margin);
            const y = random(fontSize + margin, height - fontSize - margin);
            
            if (!this.checkOverlap(x, y, messageWidth, fontSize)) {
                msg.x = x;
                msg.y = y;
                return true;
            }
        }
        return false;
    }

    randomizePositions() {
        // Sort messages randomly to avoid bias
        const messages = [...this.displayMessages]
            .filter(msg => msg.isVisible)
            .sort(() => Math.random() - 0.5);
        
        for (const msg of messages) {
            // Try to find a new position
            if (!this.findNewPosition(msg)) {
                msg.isVisible = false; // Hide message if no position found
            }
        }
    }

    display() {
        for (const message of this.displayMessages) {
            if (!message.isVisible) continue;
            
            message.display();
            
            // Draw bounding box if enabled
            if (window.showBoundingBoxes) {
                const fontSize = window.currentTextSize || 16;
                const padding = fontSize * 0.1; // Same padding as in TextMessage class
                
                // Get the actual visible text width (without cursor)
                const visibleText = message.message.substring(0, Math.floor(message.currentChar));
                let messageWidth;
                
                push();
                textSize(fontSize);
                messageWidth = textWidth(visibleText);
                pop();
                
                // Calculate bounding box to match exactly the text (without cursor)
                const box = {
                    left: message.x - messageWidth/2 - 5,
                    right: message.x + messageWidth/2 + 5,
                    top: message.y - fontSize/2 - padding,
                    bottom: message.y + fontSize/2 + padding
                };
                
                push();
                stroke(255, 0, 0); // Red outline
                strokeWeight(2);
                noFill();
                rectMode(CORNERS);
                rect(box.left, box.top, box.right, box.bottom);
                pop();
            }
        }
    }

    getMessageCount() {
        return this.totalMessages;
    }
}
