class TextMessage {
    constructor(message, x, y, agent) {
        this.message = message;
        this.x = x;
        this.y = y;
        this.agent = agent || 'Noah Kornberg'; // Default to Noah if no agent specified
        this.birth = millis();
        this.lifetime = window.messageLifetime || random(8000, 12000);
        this.isVisible = true;
        this.currentChar = 0;
        this.charSpeed = 0.5;
        this.lastBlinkTime = millis();
        this.cursorVisible = true;
        this.blinkRate = 500;
        this.highlightedWords = new Map(); // Map to store highlighted word indices and their start times
        this.highlightDuration = window.highlightDuration || 3000; // 3 seconds
        this.maxHighlights = window.maxHighlights || 5; // Maximum number of highlighted words
        this.fullHighlight = false;
        this.highlightBeforeDeath = 1000; // Start highlighting 1 second before death
        this.highlightProgress = 0; // Progress of the highlight animation (0 to 1)
        this.processWords();
    }

    processWords() {
        let words = this.message.split(' ');
        this.words = words;
        
        // Calculate total width with current text size
        push();
        textSize(window.currentTextSize || 16);
        this.totalWidth = textWidth(this.message);
        pop();
    }

    updateHighlights() {
        const currentTime = millis();
        
        // Remove expired highlights
        for (const [index, startTime] of this.highlightedWords.entries()) {
            if (currentTime - startTime > (window.highlightDuration || 3000)) {
                this.highlightedWords.delete(index);
            }
        }

        // Add new highlights if we have fewer than max
        if (this.highlightedWords.size < (window.maxHighlights || 5) && random(1) < 0.1) { // 10% chance each frame
            const availableIndices = Array.from(Array(this.words.length).keys())
                .filter(i => !this.highlightedWords.has(i));
            
            if (availableIndices.length > 0) {
                const randomIndex = availableIndices[floor(random(availableIndices.length))];
                this.highlightedWords.set(randomIndex, currentTime);
            }
        }
    }

    update() {
        const now = millis();
        const age = now - this.birth;
        
        // Check if we should start full highlight
        if (age > this.lifetime - this.highlightBeforeDeath && !this.fullHighlight) {
            this.fullHighlight = true;
            this.highlightedWords.clear();
            this.highlightProgress = 0;
        }

        // Update highlight progress
        if (this.fullHighlight) {
            // Calculate progress over 500ms
            this.highlightProgress = min(1, (age - (this.lifetime - this.highlightBeforeDeath)) / 500);
        }

        // Update character count
        this.currentChar = min(this.message.length, 
            this.currentChar + this.charSpeed);

        // Update cursor blink
        if (now - this.lastBlinkTime > this.blinkRate) {
            this.cursorVisible = !this.cursorVisible;
            this.lastBlinkTime = now;
        }

        // Update highlights if not in full highlight mode
        if (!this.fullHighlight) {
            this.updateHighlights();
        }

        // Check if message should be removed
        if (age > this.lifetime) {
            this.isVisible = false;
        }

        // Recalculate width if text size changed
        push();
        textSize(window.currentTextSize || 16);
        this.totalWidth = textWidth(this.message);
        pop();
    }

    cleanup() {
        this.isVisible = false;
    }

    display() {
        if (!this.isVisible) return;

        push();
        const fontSize = window.currentTextSize || 16;
        textSize(fontSize);
        
        // Split into visible and hidden parts
        const visibleText = this.message.substring(0, Math.floor(this.currentChar));
        const words = visibleText.split(' ');

        // Calculate positions
        const totalWidth = textWidth(this.message);
        const startX = this.x - totalWidth/2;
        let currentX = startX;

        // Draw each word
        textAlign(LEFT, CENTER);
        fill(255);
        noStroke(); // Remove borders from highlights
        
        // If in full highlight mode, calculate which words should be highlighted
        if (this.fullHighlight) {
            const totalWords = words.length;
            const highlightedWordCount = Math.floor(totalWords * this.highlightProgress);
            
            // Highlight from back to front
            for (let i = totalWords - 1; i >= totalWords - highlightedWordCount; i--) {
                if (i >= 0) {
                    this.highlightedWords.set(i, true);
                }
            }
        }

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const wordWidth = textWidth(word + ' ');

            // Check if this word is highlighted
            if (this.highlightedWords.has(i)) {
                // Set highlight color based on agent
                if (this.agent === 'Lydia Graveline') {
                    fill(255, 105, 180); // Hot pink for Lydia
                } else {
                    fill(36, 46, 173); // Blue for Noah (default)
                }
                rect(currentX, this.y - fontSize/2 - 3, wordWidth, fontSize + 3);
                fill(255);
            }

            text(word + ' ', currentX, this.y);
            currentX += wordWidth;
        }

        // Draw cursor
        if (this.cursorVisible) {
            const cursorX = startX + textWidth(visibleText);
            stroke(255);
            strokeWeight(max(1, fontSize/16));
            const cursorHeight = fontSize * 0.8;
            line(cursorX, 
                 this.y - cursorHeight/2,
                 cursorX, 
                 this.y + cursorHeight/2);
        }
        
        pop();
    }
}
