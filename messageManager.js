class MessageManager {
    constructor() {
        this.displayMessages = [];
        this.isLoaded = false;
        this.lastMessageTime = 0;
        this.maxAttempts = 15;
        
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

    clearCache() {
        this.messageCache.clear();
    }

    getRandomMessage() {
        const index = Math.floor(random(this.totalMessages));
        const message = this.messageData[index].message;
        
        // Calculate width using current text size
        push();
        textSize(window.currentTextSize || 16);
        const width = textWidth(message);
        pop();
        
        return { message, width };
    }

    checkOverlap(x, y, messageWidth) {
        const fontSize = window.currentTextSize || 16;
        const margin = fontSize * 0.1; // Margin for spacing
        const box = {
            left: x - messageWidth/2 - margin,
            right: x + messageWidth/2 + margin,
            top: y - fontSize/2 - margin,
            bottom: y + fontSize/2 + margin
        };

        for (const msg of this.displayMessages) {
            if (!msg.isVisible) continue;

            const msgFontSize = window.currentTextSize || 16;
            const msgWidth = this.getMessageWidth(msg.message);
            const msgBox = {
                left: msg.x - msgWidth/2 - margin,
                right: msg.x + msgWidth/2 + margin,
                top: msg.y - msgFontSize/2 - margin,
                bottom: msg.y + msgFontSize/2 + margin
            };

            if (!(box.right < msgBox.left || 
                  box.left > msgBox.right || 
                  box.bottom < msgBox.top || 
                  box.top > msgBox.bottom)) {
                return true; // Overlap detected
            }
        }
        return false;
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
        const margin = fontSize;
        
        for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
            const messageData = this.getRandomMessage();
            const messageWidth = this.getMessageWidth(messageData.message);
            
            const x = random(messageWidth/2 + margin, width - messageWidth/2 - margin);
            const y = random(fontSize + margin, height - fontSize - margin);
            
            if (!this.checkOverlap(x, y, messageWidth)) {
                const message = new TextMessage(messageData.message, x, y);
                this.displayMessages.push(message);
                return true;
            }
        }
        return false;
    }

    cleanupMessages() {
        const now = millis();
        this.displayMessages = this.displayMessages.filter(msg => {
            const keep = msg.isVisible && (now - msg.birth < msg.lifetime);
            if (!keep) {
                msg.cleanup();
            }
            return keep;
        });
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

        // Check if font size changed
        const currentFontSize = window.currentTextSize || 16;
        if (currentFontSize !== this.lastFontSize) {
            this.handleFontSizeChange();
            this.lastFontSize = currentFontSize;
        }

        const maxMessages = window.maxMessages || 15;
        const messageInterval = window.messageInterval || 1000;
        
        if (!this.lowPerformanceMode && 
            now - this.lastMessageTime > messageInterval && 
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
        const fontSizeChange = currentFontSize - this.lastFontSize;
        
        // Clear message width cache as it depends on font size
        this.messageCache.clear();
        
        // Sort messages by vertical position for top-to-bottom processing
        const messages = [...this.displayMessages].sort((a, b) => a.y - b.y);
        
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            if (!msg.isVisible) continue;

            const messageWidth = this.getMessageWidth(msg.message);
            let overlaps = this.checkOverlap(msg.x, msg.y, messageWidth);
            
            if (overlaps) {
                // Try to resolve overlap by moving horizontally first
                let resolved = false;
                const horizontalSteps = [-1, 1]; // Try left then right
                const stepSize = currentFontSize * 0.5;
                
                for (let step of horizontalSteps) {
                    for (let j = 1; j <= 5; j++) { // Try up to 5 steps in each direction
                        const newX = msg.x + (stepSize * j * step);
                        if (!this.checkOverlap(newX, msg.y, messageWidth)) {
                            msg.x = newX;
                            resolved = true;
                            break;
                        }
                    }
                    if (resolved) break;
                }
                
                // If horizontal movement didn't work, try moving vertically
                if (!resolved) {
                    // If font size increased, move down. If decreased, move up
                    const direction = fontSizeChange > 0 ? 1 : -1;
                    for (let j = 1; j <= 10; j++) { // Try up to 10 vertical positions
                        const newY = msg.y + (stepSize * j * direction);
                        if (!this.checkOverlap(msg.x, newY, messageWidth)) {
                            msg.y = newY;
                            resolved = true;
                            break;
                        }
                    }
                }
                
                // If still not resolved, try random position as last resort
                if (!resolved) {
                    this.findNewPosition(msg);
                }
            }
        }
    }

    findNewPosition(msg) {
        const fontSize = window.currentTextSize || 16;
        const margin = fontSize;
        const messageWidth = this.getMessageWidth(msg.message);
        
        for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
            const x = random(messageWidth/2 + margin, width - messageWidth/2 - margin);
            const y = random(fontSize + margin, height - fontSize - margin);
            
            if (!this.checkOverlap(x, y, messageWidth)) {
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
        for (const msg of this.displayMessages) {
            if (msg.isVisible) {
                msg.display();
            }
        }
    }

    getMessageCount() {
        return this.totalMessages;
    }
}
