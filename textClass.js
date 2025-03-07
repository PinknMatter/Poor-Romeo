class TextMessage {
    constructor(message, x, y) {
        this.message = message;
        this.x = x;
        this.y = y;
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
        
        // Use highlight colors from the color sheet
        this.highlightColors = [
            COLORS.HIGHLIGHT.RED,
            COLORS.HIGHLIGHT.GREEN,
            COLORS.HIGHLIGHT.BLUE,
            COLORS.HIGHLIGHT.YELLOW
        ];
        
        // Add any other colors from HIGHLIGHT that exist
        if (COLORS.HIGHLIGHT.MAGENTA) this.highlightColors.push(COLORS.HIGHLIGHT.MAGENTA);
        if (COLORS.HIGHLIGHT.CYAN) this.highlightColors.push(COLORS.HIGHLIGHT.CYAN);
        if (COLORS.HIGHLIGHT.ORANGE) this.highlightColors.push(COLORS.HIGHLIGHT.ORANGE);
        if (COLORS.HIGHLIGHT.PURPLE) this.highlightColors.push(COLORS.HIGHLIGHT.PURPLE);
        
        this.deathHighlightColor = [36, 46, 173]; // Default highlight color for death animation
        this.processWords();
        this.lastFontSize = window.currentTextSize || 16; // Track the font size when message was created
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
        for (const [index, data] of this.highlightedWords.entries()) {
            if (currentTime - data.startTime > (window.highlightDuration || 3000)) {
                this.highlightedWords.delete(index);
            }
        }

        // Add new highlights if we have fewer than max
        if (this.highlightedWords.size < (window.maxHighlights || 5) && random(1) < 0.1) { // 10% chance each frame
            const availableIndices = Array.from(Array(this.words.length).keys())
                .filter(i => !this.highlightedWords.has(i));
            
            if (availableIndices.length > 0) {
                const randomIndex = availableIndices[floor(random(availableIndices.length))];
                const randomColorIndex = floor(random(this.highlightColors.length));
                const color = this.highlightColors[randomColorIndex];
                
                this.highlightedWords.set(randomIndex, {
                    startTime: currentTime,
                    color: color
                });
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

        // Check if font size has changed and update width if needed
        const currentFontSize = window.currentTextSize || 16;
        if (this.lastFontSize !== currentFontSize) {
            this.lastFontSize = currentFontSize;
            this.processWords(); // Recalculate width with new font size
        }
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

        // Calculate positions - use the current totalWidth, which is updated when font size changes
        const startX = this.x - this.totalWidth/2;
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
                    this.highlightedWords.set(i, {
                        startTime: millis(),
                        color: this.deathHighlightColor,
                        isFullHighlight: true // Mark that this is part of the full highlight
                    });
                }
            }
        }

        // Pre-calculate word widths to ensure consistent spacing
        const wordWidths = [];
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            // Calculate width of just the word (without space)
            const wordWidth = textWidth(word);
            // Calculate width of space if needed
            const spaceWidth = (i < words.length - 1) ? textWidth(' ') : 0;
            
            wordWidths.push({ 
                wordWidth: wordWidth,
                spaceWidth: spaceWidth,
                totalWidth: wordWidth + spaceWidth,
                word: word
            });
        }

        for (let i = 0; i < words.length; i++) {
            const wordInfo = wordWidths[i];
            
            // Check if this word is highlighted
            if (this.highlightedWords.has(i)) {
                const highlightData = this.highlightedWords.get(i);
                const highlightColor = highlightData.color || this.deathHighlightColor;
                const isFullHighlight = highlightData.isFullHighlight || false;
                
                // Add padding to highlight rectangle for better appearance
                const padding = fontSize * 0.1;
                fill(highlightColor[0], highlightColor[1], highlightColor[2]);
                
                if (isFullHighlight && wordInfo.spaceWidth > 0) {
                    // For full highlight mode, include the space after the word
                    rect(currentX - padding, 
                         this.y - fontSize/2 - padding, 
                         wordInfo.totalWidth + padding * 2, 
                         fontSize + padding * 2);
                } else {
                    // For normal highlighting, only highlight the word itself
                    rect(currentX - padding, 
                         this.y - fontSize/2 - padding, 
                         wordInfo.wordWidth + padding * 2, 
                         fontSize + padding * 2);
                }
                     
                fill(255);
            }

            // Draw the word
            text(wordInfo.word, currentX, this.y);
            currentX += wordInfo.wordWidth;
            
            // Draw the space separately (if not the last word)
            if (wordInfo.spaceWidth > 0) {
                text(' ', currentX, this.y);
                currentX += wordInfo.spaceWidth;
            }
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
