// Copyright 2011, Luke Moody.
var myDrawer = null;

function TextEditor(options) {
	
	/**
	*	Some internal variables.
	*/
	var canvas, context, 
		currentLine = 0, currentChar = 0,
		lines = [[]],
		
		foundMultiLineOpen = false,
		
		// Some character vars
		lastKeyPressed = '',
		
		functionList = [],
		
		// cursorState is a boolean that gets switched to its opposite value
		// whenever the updateCursor function is fired (every n milliseconds)
		cursorState = true,
		cursorX = 0,
		cursorY = 0,
		
		wheelY = 0,
		wheelX = 0,
		
		startDrawY = 0,
		maxDrawY = 0,
		
		selections = {
			isDoingSelection: false,
			startX: 0,
			startY: 0,
			newX: 0,
			newY: 0		
		},
		
		// This object holds booleans as to whether certain modifier keys are set or not
		modifierKeys = {
			'cmd': false,
			'shift': false,
			'ctrl': false
		},
		
		// Stores references to the statusBar elements
		statusBar = {},
		
		// Undo history... (??!)
		history = [],
		historyPos = 0,
		isDoingUndo = false,
		
		// Keep a reference to the current instance of this object
		// so we can still access it when the 'this' object has a different scope
		that = this,
		
		// Find/Replace
		createdFindReplace = false,
		findMatches = [],
		findMatchesCurrentIndex = -1;

	
	this.singleLetterWidth = null;
	this.currentIndent = 0;
	this.tabIndex = [];
	this.functionListSelected = 0;
	this.gutter = null;
	this.tabXter = '';
	this.menu = null;
	this.wrapper = null;
	
	this.hasFocus = true;
	
	/**
	*	Holds options for the current instance
	*/
	this.options = {
		font: '12px Monaco',
		newLine: '\n',
		lineHeight: 18,
		fontColor: 'rgba(255,255,255,1)',
		lineHighlightColor: 'rgba(0, 0, 0, 0.35)',
		backgroundColor: 'rgba(0,47,82,1)',
		selectionColor: 'rgba(179, 101, 57, 0.75)',
		width: 500,
		height: 300,
		x: 0,
		y: 0,
		topPadding: 5,
		rightPadding: 5,
		bottomPadding: 5,
		leftPadding: 5,
		parentElement: document.body,
		blinkingCursor: true,
		cursorBlinkRate: 500,
		
		tabWidth: 4,
		tabStopCharacter: '#@@#',
		
		scrollBarColor: 'rgba(255,255,255,0.6)',
		scrollBarStrokeColor: 'rgba(0, 0, 0, 0.7)',
		scrollBarWidth: 7,
		
		syntaxHighlight: true,
		wrapLines: false,
		lineLength: 50
	};
	
	
	/**
	*	Sets the options provided.
	*
	*	@param options The options object to use as a base.
	*/
	this.setOptions = function(options) {
		var i;
		for(i in options) {
			this.options[i] = options[i];
		}
	};
	
	
	if(options) {
		this.setOptions(options);
	}
	
	/**
	*	Enable/Disable the editor and its listeners
	*/
	this.enable = function() {
		that.hasFocus = true;
		var docBody = document.body;
		that.bind(docBody, 'keydown', that.onKeyDown, false);
		that.bind(docBody, 'keyup', that.onKeyUp, false);
		that.bind(docBody, 'keypress', that.onKeyPress, false);
		that.bind(window, 'mousewheel', that.onWheelScroll, false);
		that.bind(canvas, 'mousedown', that.onMouseDown, false);
	};
	this.disable = function() {
		that.hasFocus = false;
		var docBody = document.body;
		that.unbind(docBody, 'keydown', that.onKeyDown, false);
		that.unbind(docBody, 'keyup', that.onKeyUp, false);
		that.unbind(docBody, 'keypress', that.onKeyPress, false);
		that.unbind(window, 'mousewheel', that.onWheelScroll, false);
		that.unbind(canvas, 'mousedown', that.onMouseDown, false);
	};
	
	
	/**
	*	Creates the canvas element, keypress events, etc.
	*/
	this.create = function() {
		var options = this.options,
			style, docBody = document.body;
		
		// Create the tabXter
		this.createTabXter();
		
		this.wrapper = document.createElement('div');
		
		
		// Create & style the canvas element
		canvas = document.createElement('canvas');
		style = canvas.style;
		canvas.width = options.width;
		canvas.height = options.height;
		style.position = 'absolute';
		style.top = options.y + 'px';
		style.left = options.x + 'px';
		style.backgroundColor = options.backgroundColor;
		style.cursor = 'text';
		
		// Set the context for the canvas
		context = canvas.getContext('2d');
		
		
		// Bind the keypresses
		this.bind(docBody, 'keydown', this.onKeyDown, false);
		this.bind(docBody, 'keyup', this.onKeyUp, false);
		this.bind(docBody, 'keypress', this.onKeyPress, false);
		this.bind(window, 'mousewheel', this.onWheelScroll, false);
		this.bind(canvas, 'mousedown', this.onMouseDown, false);
		
		// Append to the canvas to the parentElement specified in this.options.
		this.wrapper.appendChild(canvas);
		options.parentElement.appendChild(this.wrapper);	
		
		// Create menus
		this.createMenu();
		
		// Create the 'HUD' elements
		this.createHUD();
		
		// Set the font
		this.setFont();
		
		// Start the blinking cursor if specified
		if(this.options.blinkingCursor) {
			this.toggleCursorState();
		}
		
		// Draw the canvas
		this.draw();
		
		myDrawer = new Drawer();
		myDrawer.create();
		
	};
	
	this.createMenu = function() {
		that.menu = new Menu(editorMenu, that.options.parentElement);		
	};
	
	this.printLines = function(index) {
		console.log(lines[index]);
	}
	
	/**
	*	Toggles the state of cursorState
	*/
	this.toggleCursorState = function() {
		// Flip the state of the cursor
		cursorState = !cursorState;
		
		// Draw the canvas (using 'that', not 'this', as scope changed to DOM Window)
		that.draw();
		
		// Call this function again after n milliseconds
		setTimeout(arguments.callee, that.options.cursorBlinkRate);
	};
	
	/**
	*	Measures the given string and returns its width
	*/
	this.measureText = function(str) {
		return context.measureText(str).width;
	};
	
	/**
	*	Makes the tabXter string. Called on editor creation and when tabsize is changed
	*/
	this.createTabXter = function() {
		var i = 0; l = that.options.tabWidth;
		
		for(i; i < l; ++i) {
			that.tabXter += ' ';
		}		
	};
	
	/**
	*	Binds events...
	*/
	this.bind = function(element, type, handler, bubble) {
		element.addEventListener(type, handler, bubble);
	};
	this.unbind = function(element, type, handler, bubble) {
		element.removeEventListener(type, handler, bubble);
	};
	
	/**
	*	Sets the font for the canvas
	*/
	this.setFont = function() {
		context.font = this.options.font;
		that.singleLetterWidth = this.measureText('a');
	};
	
	/**
	*	A little preventDefault shortcut
	*/
	this.preventDefault = function(e) {
		if(e && e.preventDefault) {
			e.preventDefault();
		}
	};
	
	/**
	*	Draw the canvas!
	*/
	this.draw = function(typing) {
		var options = this.options,
			i = 0, numLines = lines.length,
			currentLineStr;

		if(!that.hasFocus) {
			return;
		}
		
		// Decide what line we should start drawing from and to
		maxDrawY = Math.floor( (options.height-15) / this.options.lineHeight);
		
		// Clear the canvas so we can draw it again
		context.clearRect(0, 0, options.width, options.height);
		
		if(selections.isDoingSelection) {
			this.drawSelection();
			
			// switch fill colour back to normal
			context.fillStyle = this.options.fontColor;
		}
		
		if(numLines > maxDrawY) {
			i = startDrawY;
			numLines = Math.min(startDrawY + maxDrawY, lines.length);
		}
		else {
			numLines = maxDrawY;
		}
		
		
		// Loop through our lines and print them out
		for(i; i < numLines; ++i) {
			if(i === currentLine) {
				// Highlight the current line
				this.highlightLine(i-startDrawY);
				that.currentIndent = that.tabIndex[i] || 0;

				// Then switch fill colour back to normal
				context.fillStyle = this.options.fontColor;
			}
			if(lines[i]) {
				currentLineStr = lines[i].join('');
				this.scanLines(currentLineStr, i);
			}
			
		}
		
		// Draw the cursor (but only if we need to)
		if(cursorState || typing) {
			this.drawCursor();
		}
		
		// Update display elements
		this.updateStatusBar();
		that.gutter.style.top = -((this.options.lineHeight * startDrawY))  + that.options.y + 'px';
		this.drawScrollBar();
	};
	
	/**
	*	Highlight the specified line
	*/
	this.highlightLine = function(line) {
		var o = this.options,
			lineH = o.lineHeight;
		
		context.fillStyle = o.lineHighlightColor;
		context.fillRect(0, (lineH * line)+ 6, o.width, lineH-1);
	};
	
	/**
	*	Scans a line and looks out for specific things...
	*/
	function inArray(arr, str, property) {
		for(var i = 0; i < arr.length; ++i) {
			if(arr[i] && arr[i][property] && (arr[i][property] === str || arr[i][property] + '()' === str)) {
				return true;
			}
		}
		return false;
	}
	
	this.scanLines = function(str, index) {
		//FIXME!
		var words = str.split(' '),
			currentCharOffset = this.options.leftPadding,
			currentWord;
		
		this.grammarDetection['functionName'](str, index);
		
		if(this.options.syntaxHighlight) {
			var tokens = Tokeniser(str, that, index);
		
			for(var x = 0; x < tokens.length; ++x) {
				currentWord = tokens[x];
				
				if(currentWord.type === 'startMultiComment') {
					foundMultiLineOpen = true;
				}
				
				
				context.fillStyle = foundMultiLineOpen ? 'rgba(0, 136, 255, 1)' : currentWord.colour;
				context.fillText(currentWord.word, currentCharOffset, (this.options.lineHeight * (index+1-startDrawY)));
			
				currentCharOffset += currentWord.length;
			
				if(currentWord.extra) {
					context.fillStyle = currentWord.extraColour;
					context.fillText(currentWord.extra, currentCharOffset, (this.options.lineHeight * (index+1-startDrawY)));
					currentCharOffset += currentWord.extraLength;
				}
				
				if(currentWord.type === 'endMultiComment') {
					foundMultiLineOpen = false;
				}
			}
		}
		else {
			context.fillStyle = this.options.fontColor;
			context.fillText(str, currentCharOffset, (this.options.lineHeight * (index+1-startDrawY)));
			currentCharOffset += str.length;
		}
	};
	
	
	this.grammarDetection = {
		'functionName': function(str, index) {
			//REGEX for finding function names:
			var oRegExp = new RegExp("(\\bfunction\\s+(\\w+)\\([^\\(]*\\))|(\\b(\\w+)\\s*[\x3d:]\\s*function\\s*\\([^\\(]*\\))", "g"),
				oMatches,
				results;
				
			while ((oMatches = oRegExp.exec(str)) !== null) {
				results = oMatches;
			}

			if(results && (results[2] || results[4])) {
				functionList[index] = {
					name: (results[2] || results[4]),
					line: index
				}
				that.drawFunctionIndex();
			}
			else {
				functionList[index] = undefined;
			}
		}
	}
	
	/**
	*	Draw the cursor
	*/
	this.drawCursor = function() {
		var w = (this.singleLetterWidth || this.measureText(lastKeyPressed)),
			xPos = (currentChar * w) + 4.5,
			yPos = (this.options.lineHeight * (currentLine-startDrawY)) + 6.5;
		
		context.beginPath();
		context.strokeStyle = this.options.fontColor;
		context.lineWidth = 1;
		context.moveTo(xPos, yPos);
		context.lineTo(xPos, yPos + this.options.lineHeight-1.5);
		context.stroke();
		
		cursorX = xPos;
		cursorY = yPos;		
	};
	
	/**
	*	EVENTS
	*/
	this.onKeyDown = function(e) {
		var keyFn = that.handleKeys,
			k = e.keyCode;
		
		var isOffscreen = that.isLineOffscreen(currentLine);

		if(isOffscreen && 
			k !== 91 && k !== 93 && k !== 16 && k !== 17
		) {
			that.scrollToOffscreenLine(isOffscreen);
		}
		
		if(k === 70 && modifierKeys['cmd']) {
			return that.handleKeys['cmdF'](e);
		}
		else if(k === 9) {
			return keyFn['tab'].call(that, e);
		}
		else if(k === 13) {
			return keyFn['enter'].call(that, e);
		}
		else if(k === 8) {
			return keyFn['backspace'].call(that, e);
		}
		else if(k === 32) {
			return keyFn['spacebar'].call(that, e);
		}
		else if(k === 38 || k === 40 || k === 37 || k === 39) {
			return keyFn['arrowKeys'].call(that, e);
		}
		else if(k === 46) {
			return keyFn['delete'].call(that, e);
		}
		else if(k === 38 || k === 40 || k === 37 || k === 39) {
			return keyFn['arrowKeys'].call(that, e);
		}
		else if(k === 91 || k === 93) {
			modifierKeys['cmd'] = true;
			return keyFn['cmd'].call(that, e);
		}
		else if(k === 16) {
			modifierKeys['shift'] = true;
			return keyFn['shift'].call(that, e);
		}
		else if(k === 17) {
			modifierKeys['ctrl'] = true;
			return keyFn['ctrl'].call(that, e);
		}
	};
	
	this.onKeyUp = function(e){
		var k = e.keyCode;
		
		if(k === 91 || k === 93) {
			modifierKeys['cmd'] = false;
		}
		else if(k === 16) {
			modifierKeys['shift'] = false;
		}
		else if(k === 17) {
			modifierKeys['ctrl'] = false;
		}
	};
	
	this.onKeyPress = function(e) {
		var key = String.fromCharCode(e.charCode),
			keyCode = e.which;
		
		if(keyCode === 39) {
			that.handleChars.addChar(currentLine, currentChar, '\'');
			that.handleChars.addChar(currentLine, currentChar, '\'');
			--currentChar;
		}
		else if(keyCode === 34) {
			that.handleChars.addChar(currentLine, currentChar, '"');
			that.handleChars.addChar(currentLine, currentChar, '"');
			--currentChar;
		}
		
		// Handle multiline comments
		else if(keyCode === 42 && lines[currentLine][currentChar-1] === '/'){
			that.handleChars['openMultiComment'](e);
		}
		else if(keyCode === 42 && lines[currentLine][currentChar] === '*' && lines[currentLine][currentChar+1] === '/') {
			++currentChar;
		}
		else if(keyCode === 47 && lines[currentLine][currentChar-1] === '*' && lines[currentLine][currentChar] === '/') {
			++currentChar;
		}

		// Handle opening brace
		else if(keyCode === 123) {
			that.handleChars['openBrace'](e);
		}
		
		// Opening parenthesis
		else if(keyCode === 40) {
			that.handleChars['openParenthesis'](e);
		}
		
		// Open Square Bracket
		else if(keyCode === 91) {
			that.handleChars['openSquareBracket'](e);
		}
		
		// Handle auto-closed brace
		else if(keyCode === 125 && lines[currentLine][currentChar] === '}') {
			++currentChar;
		}
		
		// Handle auto-closed parentheses
		else if(keyCode === 41 && lines[currentLine][currentChar] === ')') {
			++currentChar;
		}
		
		// Handle auto-closed brackets
		else if(keyCode === 93 && lines[currentLine][currentChar] === ']') {
			++currentChar;
		}
		
		else {
			// Using 'that' instead of 'this, as scope has changed.
			that.handleChars.addChar(currentLine, currentChar, key);
		}
		
		that.draw(true);
	};
	
	this.onWheelScroll = function(e) {
		that.preventDefault(e);
		
		var wheelData = Math.floor(e.detail ? e.detail * -1 : e.wheelDeltaY / 40);
		
		var x = Math.floor(e.wheelDeltaX),
			y = Math.floor(e.wheelDeltaY);

		if(lines.length < maxDrawY) {
			return;
		}
		
		if(wheelData > 0) {
			
			//wheelData -= 2;
			
			if((startDrawY-wheelData) >= 0) {
				startDrawY -= wheelData;
			}
			else {
				startDrawY = 0;
			}
			
			that.draw(true);
		}
		else if(y < 0) {
			
			//wheelData += 2;
			
			if(startDrawY - wheelData < (lines.length-maxDrawY)-1) {
				startDrawY -= wheelData;
			}
			else {
				startDrawY = (lines.length - maxDrawY) - 1;
			}
			
			that.draw(true);
		}

		if(x > 0) {
			console.log('LEFT');
		}
		else if(x < 0){
			console.log('RIGHT')
		}
		
		wheelY = y;
		wheelX = x;
	};
	
	
	this.onMouseDown = function(e) {
		var pos = that.posFromEvent(e);
		
		currentLine = pos.y + startDrawY;
		currentChar = pos.x;
		
		that.draw(true);
		
		// Set the start co-ords of the selection rectangle
		selections.startX = pos.pixelX;
		selections.startY = pos.pixelY;

		that.bind(canvas, 'mousemove', that.onMouseMove, false);
		that.bind(canvas, 'mouseup', that.onMouseUp, false);
	};
	this.onMouseMove = function(e) {
		var pos = that.posFromEvent(e);
		
		selections.isDoingSelection = false;
		
		currentLine = pos.y + startDrawY;
		currentChar = pos.x;
		
		// Set the 'isDoingSelection' flag
		selections.isDoingSelection = true;
		selections.newX = pos.pixelX;
		selections.newY = pos.pixelY;
		
		that.draw(true);
	};
	this.onMouseUp = function(e) {
		var pos = that.posFromEvent(e);
		
		that.hasFocus = true;
		
		selections.isDoingSelection = false;
		
		currentLine = pos.y + startDrawY;
		currentChar = pos.x;
		
		canvas.removeEventListener('mousemove', that.onMouseMove, false);
		canvas.removeEventListener('mouseup', that.onMouseUp, false);
		
		that.draw(true);
	};
	
	this.posFromEvent = function(e) {
		var x = e.x - 47, 
			y = e.y - that.options.topPadding - that.options.y,
			w = that.singleLetterWidth, 
			h = that.options.lineHeight,
			newX, newY;
		
		y = (y > 0 ? y : 0);
		
		newX = Math.floor(x/w);
		newY = Math.floor(y/h);
		
		newY = Math.min(newY, (lines.length-1));
		newX = Math.min(newX, lines[newY].length);
		
		return {
			x: newX,
			y: newY,
			pixelX: x,
			pixelY: y
		};
	};
	
	this.drawSelection = function() {
		
		//return;
		
		// FIXME: this.
		var charStartX, charStartY, charNewX, charNewY;
		
		// Set fill colour
		context.fillStyle = this.options.selectionColor;
		
		charStartX = Math.floor(selections.startX / that.singleLetterWidth) + (that.options.leftPadding + 45);
		charStartY = Math.floor(selections.startY / that.options.lineHeight) + that.options.lineHeight + 10;
		charNewX = currentChar * that.singleLetterWidth;
		charNewY = currentLine * that.options.lineHeight;
		
		// Fill the rectangle
		context.fillRect(charStartX, charStartY, (charNewX - charStartX), (charNewY - charStartY));
	
	};
	
	
	this.isLineOffscreen = function(line) {
		if(line < startDrawY) {
			return 'above';
		}
		else if(line > startDrawY + maxDrawY) {
			return 'below';
		}
		return false;
	};
	this.scrollToOffscreenLine = function(type) {
		if(type === 'above') {
			startDrawY = currentLine;
		}
		else if(type === 'below') {
			startDrawY = (currentLine - maxDrawY+1);
		}
	};
	
	
	/**
	*	All our key handing functions.
	*/
	this.handleKeys = {
		'tab': function(e) {
			var i = 0, l = that.options.tabWidth;
			
			// Stop the default tab action from occuring.
			that.preventDefault(e);
			
			// Add the ' ' (space) character n times.
			for(i; i < l; ++i) {
				that.handleChars.addChar(currentLine, currentChar, ' ');
			}
			
			if(!arguments[1]) {
				//++that.currentIndent;
			}
			
			// Draw the canvas with the 'typing' flag set to true so the cursor doesn't blink.
			that.draw(true);
			
			return false;
		},
		'enter': function(e) {
			// Stop the default tab action from occuring.
			that.preventDefault(e);
			
			if(lines[currentLine][currentChar-1] === '{' && lastKeyPressed !== '??') {
				lastKeyPressed = '??';
				that.handleLines.splitAndIndent.call(that, currentChar, lines[currentLine]);
			}
			else {
				lastKeyPressed = 'e';
				that.handleLines.splitLine.call(that, currentChar, lines[currentLine]);
				that.createLineNumbers();
			}
			
			return false;
		},
		'backspace': function(e) {
			var oldLine, existingLines = ''+lines.length;
			
			that.preventDefault(e);
			
			var tab = '', tabXter = '';
			
			for(var i = (currentChar-1); i > ((currentChar-1) - that.options.tabWidth); --i) {
				tab += lines[currentLine][i];
				tabXter += ' ';
			}
			
			
			if(tab === tabXter) {
				lines[currentLine].splice((currentChar-that.options.tabWidth), that.options.tabWidth);
				currentChar -= that.options.tabWidth;
				--that.currentIndent;
				that.tabIndex[currentLine] = that.tabIndex[currentLine] - 1;
				that.draw(true);
				return false;
			}			
			
			// Stop if at top of document
			if(currentChar === 0 && currentLine === 0) {
				return false;
			}
			
			// Take remaining characters on the line and move them up
			else if(currentChar === 0 && currentLine !== 0) {
				--currentLine;
				currentChar = lines[currentLine].length;
				oldLine = lines.splice(currentLine+1, 1);				
				lines[currentLine] = lines[currentLine].concat(oldLine[0]);
			}
			
			else if(modifierKeys['cmd']) {
				lines[currentLine].length = 0;
				currentChar = 0;
			}
			
			// Otherwise, do a normal backspace - remove one character from the line.
			else {
				lines[currentLine].splice(currentChar-1, 1);
				--currentChar;
			}
			
			if(lines.length < existingLines) {
				that.removeLineNumber();
			}
			
			that.draw(true);
			
			return false;
		},
		'delete': function(e) {
			var oldContent, existingLines = ''+lines.length;
			
			this.preventDefault(e);
			
			// If at the end a line, move the next line up
			if(currentChar === lines[currentLine].length && lines[currentLine + 1]) {
				oldContent = lines.splice(currentLine+1, 1);
				lines[currentLine] = lines[currentLine].concat(oldContent[0]);
			}
			
			// Else, do a normal delete
			else {
				lines[currentLine].splice(currentChar, 1);
			}
			
			if(lines.length < existingLines) {
				this.removeLineNumber();
			}
			
			this.draw(true);
			
			return false;
		},
		'spacebar': function(e) {
			this.preventDefault(e);
			this.handleChars.addChar(currentLine, currentChar, ' ');
			this.draw(true);
			return false;
		},
		'arrowKeys': function(e, key) {
			this.preventDefault(e);
			
			var isOffscreen;
			
			switch(e.keyCode) {
				// up
				case 38:
					if(modifierKeys['cmd']) {
						currentLine = 0;
						startDrawY = 0;
					}
					else if(lines[currentLine-1]) {
						--currentLine;
						
						isOffscreen = that.isLineOffscreen(currentLine);
						
						if(isOffscreen) {
							that.scrollToOffscreenLine(isOffscreen);
						}

						if(lines[currentLine].length < lines[currentLine+1].length && currentChar > lines[currentLine].length) {
							currentChar = lines[currentLine].length;
						}
					}
				break;
				
				// down
				case 40:
					if(modifierKeys['cmd']) {
						currentLine = (lines.length-1);
						startDrawY = currentLine - (maxDrawY-1);
					}
					else if(lines[currentLine+1]) {
						++currentLine;
						
						isOffscreen = that.isLineOffscreen(currentLine);
						
						if(isOffscreen) {
							that.scrollToOffscreenLine(isOffscreen);
						}
						
						if(lines[currentLine].length < lines[currentLine-1].length && currentChar > lines[currentLine].length) {
							currentChar = lines[currentLine].length;
						}
					}
				break;
				
				// left
				case 37:
					if(modifierKeys['cmd']) {
						currentChar = 0;
					}
					else if(currentChar-1 >= 0) {
						--currentChar;
					}
				break;
				
				// right
				case 39:
					if(modifierKeys['cmd']) {
						currentChar = lines[currentLine].length;
					}
					else if(currentChar+1 <= lines[currentLine].length) {
						++currentChar;
					}
				break;
			}
			
			this.draw(true);
			
			return false;
		},
		'cmd': function(e){
			
		},
		'shift': function(e) {
			
		},
		'ctrl': function(e) {
			
		},
		'cmdF': function(e) {
			that.preventDefault(e);
			that.toggleFindReplace();
			return false;
		}
	};
	
	
	/**
	*	All the line handling functions
	*/
	this.handleLines = {
		newLine: function() {
			// Push a new array into the lines array
			lines.push([]);
			
			// Add one to the currentLine variable
			++currentLine;
			
			// Redraw the canvas
			that.draw();
		},
		splitLine: function(position, line) {
			
			// Splice the current line array
			var newContent = line.splice(position, line.length);
			
			// Push the spliced content into a new line
			lines.splice(currentLine+1, 0, newContent);
			
			// Add one to currentLine var
			++currentLine;
			
			// Add whitespace at the beginning of the next line if we've already indented			
			for(var x = 0; x < that.currentIndent; ++x) {
				for(var i = 0; i < that.options.tabWidth; ++i) {
					lines[currentLine].unshift(' ');
				}
			}
			
			// Reset the currentChar value
			currentChar = that.currentIndent*that.options.tabWidth;
			
			
			// Calculate whether we've exceeded the allowable height
			maxDrawY = Math.floor( (that.options.height-15) / that.options.lineHeight),
			numLines = lines.length;
			
			if(numLines > maxDrawY) {
				++startDrawY;
			}
			
			// Redraw the canvas
			that.draw(true);
		},
		splitAndIndent: function(position, line) {
			// Add a new line
			that.handleKeys['enter'].call(that);
			
			// Add a tabStop
			that.handleKeys['tab'].call(that);
			
			// Add a new Line
			that.handleKeys['enter'].call(that);

			// Reset the currentChar
			--currentLine;
			currentChar = lines[currentLine].length;
			
			if(startDrawY > 0) {
				startDrawY -= 1;
			}
						
			that.draw(true);
		}
	};
	
	/**
	*	All the character handling function
	*/
	this.handleChars = {
		addChar: function(lineNum, index, char) {

			// Log the last key pressed (mostly so we can use it when positioning the cursor)
			lastKeyPressed = char;
			
			// Add a new character to the specified array in the lines array at the specified point.
			lines[lineNum].splice(index, 0, char);
			
			// simple (and broken!) line wrapping
			if(that.options.wrapLines && lines[lineNum].length+1 > that.options.lineLength) {
				that.handleLines['splitLine'](index, lines[lineNum]);
			}
			
			// Add one to the character count
			++currentChar;
		},
		'openBrace': function(e) {			
			that.handleChars.addChar(currentLine, currentChar, '{');
			that.handleChars.addChar(currentLine, currentChar, '}');
			--currentChar;
			lastKeyPressed = '{';			
		},
		'openParenthesis': function(e) {
			that.handleChars.addChar(currentLine, currentChar, '(');
			that.handleChars.addChar(currentLine, currentChar, ')');
			--currentChar;
		},
		'openSquareBracket': function(e){
			that.handleChars.addChar(currentLine, currentChar, '[');
			that.handleChars.addChar(currentLine, currentChar, ']');
			--currentChar;
		},
		'openMultiComment': function(e){
			that.handleChars.addChar(currentLine, currentChar, '*');
			that.handleChars.addChar(currentLine, currentChar, '*');
			that.handleChars.addChar(currentLine, currentChar, '/');
			currentChar -= 2;
		}
	};
	
	this.runCode = function() {
		var str = '';
		for(var i = 0; i < lines.length; ++i) {
			str += lines[i].join('');
		}
		try {
			eval(str);
		}
		catch(e){
			log(e);
		}
	};
	
	this.drawFunctionIndex = function() {
		var opt;
		
		if(statusBar.fnList.hasChildNodes()) {
			while(statusBar.fnList.hasChildNodes()) {
				statusBar.fnList.removeChild(statusBar.fnList.childNodes[0]);
			}
		}
		
		for(var i = 0; i < functionList.length; ++i) {
			if(functionList[i] !== undefined) {
				opt = document.createElement('option');
				opt.value = '(' + (functionList[i].line+1) + '): ' + functionList[i].name;
				opt.textContent = '(' + (functionList[i].line+1) + '): ' + functionList[i].name;
				opt.fnList = functionList[i];
				statusBar.fnList.appendChild(opt);
			}
		}
		
		statusBar.fnList.selectedIndex = that.functionListSelected;
		
		statusBar.fnList.onchange = function() {
			that.functionListSelected = statusBar.fnList.selectedIndex;
			currentLine = statusBar.fnList[statusBar.fnList.selectedIndex].fnList.line;

			if(lines.length - maxDrawY < currentLine && currentLine > maxDrawY) {
				startDrawY = lines.length - maxDrawY;
			}
			else {
				startDrawY = currentLine;
			}
			
			that.draw();
		}
	};
	
	/**
	*	Makes the bottom bit (!)
	*/
	this.createHUD = function() {
		
		// Make bottom container
		this.createStatusBar();
		
		// Draw gutter
		this.createGutter();
		
		// Draw line Numbers
		this.createLineNumbers();
		
	};
	
	/**
	*	Creates the 'status' bar.
	*/
	this.createStatusBar = function() {
		var container, lineCol, tabSize, tabSizeTitle,
			tab1, tab2, tab3, tab4, tab5, tab6, tab7, tab8,
			
			fnIndex, fnIndexSelect;
		
		container = document.createElement('div');
		container.className = 'statusBar';
		
		// Make line/column readout
		lineCol = document.createElement('span');
		lineCol.className = 'lineCol';
		
		// Tabsize element
		tabSize = document.createElement('select');
		tabSize.className = 'tabSize';
		
		tab1 = document.createElement('option');
		tab1.value = '1';
		tab1.textContent = '1';
		tabSize.appendChild(tab1);
		tab2 = document.createElement('option');
		tab2.value = '2';
		tab2.textContent = '2';
		tabSize.appendChild(tab2);
		tab3 = document.createElement('option');
		tab3.value = '3';
		tab3.textContent = '3';
		tabSize.appendChild(tab3);
		tab4 = document.createElement('option');
		tab4.value = '4';
		tab4.textContent = '4';
		tabSize.appendChild(tab4);
		tab5 = document.createElement('option');
		tab5.value = '5';
		tab5.textContent = '5';
		tabSize.appendChild(tab5);
		tab6 = document.createElement('option');
		tab6.value = '6';
		tab6.textContent = '6';
		tabSize.appendChild(tab6);
		tab7 = document.createElement('option');
		tab7.value = '7';
		tab7.textContent = '7';
		tabSize.appendChild(tab7);
		tab8 = document.createElement('option');
		tab8.value = '8';
		tab8.textContent = '8';
		tabSize.appendChild(tab8);
		
		tabSize.selectedIndex = (this.options.tabWidth-1);
		
		tabSize.onchange = function() {
			that.options.tabWidth = this.selectedIndex +1;
			that.createTabXter();
			that.draw();
		};
		
		tabSizeTitle = document.createElement('span');
		tabSizeTitle.className = 'tabSize';
		tabSizeTitle.textContent = 'Tab Size: ';
		
		tabSizeTitle.appendChild(tabSize);
		
		// Make function list holders
		fnIndex = document.createElement('span');
		fnIndex.className = 'functionList';
		fnIndex.textContent = 'Functions: ';

		fnIndexSelect = document.createElement('select');
		fnIndexSelect.className = 'functionList';
		fnIndex.appendChild(fnIndexSelect);
		
		// Store shortcuts to these elements
		statusBar.container = container;
		statusBar.lineCol = lineCol;
		statusBar.tabSize = tabSize;
		statusBar.fnList = fnIndexSelect;
		
		var runLink = document.createElement('a');
		runLink.textContent = '>>>';
		runLink.onclick = function() {
			if(confirm('Run this code?')) {
				that.runCode();
			}
		};
		runLink.className = 'tabSize';
		runLink.style.color = '#333 !important';
		
		
		// Append elements to container
		container.appendChild(lineCol);
		container.appendChild(tabSizeTitle);
		container.appendChild(fnIndex);
		container.appendChild(runLink);
		
		// Append container to DOM (parentElement specified in this.options)
		this.options.parentElement.appendChild(container);
	};
	
	/**
	*	Updates the bottom bit
	*/
	this.updateStatusBar = function() {
		statusBar.lineCol.innerHTML = 'Line: ' + (currentLine+1) + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Column: ' + (currentChar+1);
	};
	
	// Draw gutter
	this.createGutter = function() {
		var gutter = document.createElement('div');
		gutter.className = 'gutter';
		gutter.style.paddingTop = (that.options.topPadding+3) + 'px';
		gutter.style.top = that.options.y + 'px';
		gutter.style.maxHeight = that.options.height + 'px';
		this.options.parentElement.appendChild(gutter);
		this.gutter = gutter;
	};
	
	// Draw line Numbers
	this.createLineNumbers = function() {
		
		if(!that.hasFocus) {
			return;
		}
		
		var makeSingleLine = function(i) {
			var line = document.createElement('p');
			line.className = 'lineNumber';
			line.textContent = i;
			line.style.height = that.options.lineHeight + 'px';
			that.gutter.appendChild(line);
		};
	
		makeSingleLine(lines.length);
	};
	
	// Remove a line number
	this.removeLineNumber = function() {
		var lines = this.gutter.getElementsByTagName('p');
		this.gutter.removeChild(lines[lines.length-1]);
	};
	
	
	// Draws the scrollbar (!!)
	this.drawScrollBar = function() {
		
		var docH, contH, scrollH, scrollAreaH, start, rightEdge;
		
		// Only draw the scrollbar if we need to
		if(lines.length < maxDrawY) {
			return;
		}
		
		docH = lines.length * that.options.lineHeight;
		contH = maxDrawY * that.options.lineHeight;
		scrollAreaH = that.options.height - 10;
		scrollH = (contH * scrollAreaH) / docH;
		
		if(scrollH < 15) {
			scrollH = 15;
		}
		else if(scrollH > scrollAreaH) {
			scrollH = scrollAreaH;
		}

		start = (((startDrawY* that.options.lineHeight) / docH) * scrollAreaH) + 2;
		rightEdge = that.options.width-((that.options.scrollBarWidth) + 3.5);
		
		/*
			Rounded Rectangle code from: 
				http://cyberpython.wordpress.com/2010/05/20/javascript-draw-a-rounded-rectangle-on-an-html-5-canvas/
		
	        x: Upper left corner's X coordinate
	        y: Upper left corner's Y coordinate
	        w: Rectangle's width
	        h: Rectangle's height
	        r: Corner radius
	    */
	    function fillRoundedRect(x, y, w, h, r){
	        context.beginPath();
			context.strokeStyle = that.options.scrollBarStrokeColor;
	        context.moveTo(x+r, y);
	        context.lineTo(x+w-r, y);
	        context.quadraticCurveTo(x+w, y, x+w, y+r);
	        context.lineTo(x+w, y+h-r);
	        context.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
	        context.lineTo(x+r, y+h);
	        context.quadraticCurveTo(x, y+h, x, y+h-r);
	        context.lineTo(x, y+r);
	        context.quadraticCurveTo(x, y, x+r, y);
			context.stroke();
			context.fillStyle = that.options.scrollBarColor;
	        context.fill();
	    }
	
		fillRoundedRect(rightEdge, start, that.options.scrollBarWidth, scrollH, that.options.scrollBarWidth/2);

	};
	
	
	
	/**
	*	Import textfiles...
	*		Start with strings...
	*/
	this.getFile = function(url) {
		var txtFile = new XMLHttpRequest();
		txtFile.open("GET", url, true);
		txtFile.onreadystatechange = function() {
			if (txtFile.readyState === 4) {
				if (txtFile.status === 200) {
					that.importFile(txtFile.responseText);					
				}
			}
		};
		txtFile.send();
	};
	
	this.importFile = function(file) {
		var split = file.split('\n');
		
		for(var i = 0; i < split.length; ++i) {
			lines[i] = split[i].split('');
			currentChar = lines[i].length;
			if(i < split.length-1) {
				that.handleChars.addChar(currentLine, currentChar, ' ');
				that.handleKeys['enter']();
			}
		}

		currentChar = lines[lines.length-1].length;
		//that.handleChars.addChar(currentLine, currentChar, ' ');
		that.draw(true);
	};
	
	
	
	// FIND / REPLACE
	this.createFindReplace = function() {
		var wrapper, find, replace, search, close,
			nextMatch, prevMatch, replaceS, replaceAll;
		
		wrapper = document.createElement('div');
		find = document.createElement('input');
		replace = document.createElement('input');
		close = document.createElement('div');
		
		prevMatch = document.createElement('div');
		nextMatch = document.createElement('div');
		replaceS = document.createElement('div');
		replaceAll = document.createElement('div');
		search = document.createElement('div');
		
		wrapper.className = 'findReplace';
		close.className = 'button close';
		prevMatch.className = 'button prevMatch';
		nextMatch.className = 'button nextMatch';
		replaceS.className = 'button replace';
		replaceAll.className = 'button replaceAll';
		search.className = 'button search';
		
		
		find.type = 'text';
		find.placeholder = 'Find...';
		replace.type = 'text';
		replace.placeholder = 'Replace...';
		
		find.onfocus = function() {
			that.disable();
		};
		replace.onfocus = function() {
			that.disable();
		};
		find.onblur = function() {
			that.enable();
		};
		replace.onblur = function() {
			that.enable();
		};
		
		find.onchange = function() {
			findMatches.length = 0;
		};
		
		
		close.onclick = function() {
			myDrawer.hide();
		};
		search.onclick = function() {
			that.find(find.value);
		};		
		prevMatch.onclick = function() {
			that.prevMatch();
		};
		nextMatch.onclick = function() {
			that.nextMatch();
		};
		replaceAll.onclick = function() {
			that.replaceAll(find.value, replace.value);
		};
		
		
		wrapper.appendChild(find);
		wrapper.appendChild(replace);
		wrapper.appendChild(prevMatch);
		wrapper.appendChild(nextMatch);
		wrapper.appendChild(replaceS);
		wrapper.appendChild(replaceAll);
		wrapper.appendChild(search);
		wrapper.appendChild(close);
		
		myDrawer.addElement(wrapper);
		createdFindReplace = true;
		
	};
	this.toggleFindReplace = function() {
		if(!createdFindReplace) {
			that.createFindReplace();
		}
		if(myDrawer.getStatus()) {
			myDrawer.hide();
		}
		else {
			myDrawer.show();
		}
	};
	
	this.find = function(str) {
		var i = 0, l = lines.length,
			indexOfStr, currentLine;
		
		if(str === '') {
			log('Please enter a search term');
			return;
		}
		
		for(i; i < l; ++i) {
			currentLine = lines[i].join('');
			
			indexOfStr = currentLine.indexOf(str);
			if(indexOfStr > -1) {
				findMatches.push({
					line: i,
					char: indexOfStr
				});
				log('Line: ' + (i+1) + ', character: ' + indexOfStr);
			}
		}
		
		if(findMatches.length === 0) {
			log('No matches found');
		}
	};
	
	this.replaceAll = function(findStr, replaceStr) {
		
		var i = 0, l = findMatches.length, currentMatch, currentLine;
		
		if(l === 0) {
			that.find(findStr);
			l = findMatches.length;
			if(l === 0) {
				log('No matches found :(');
				return;
			}
		}
		
		for(i; i < l; ++i) {
			currentMatch = findMatches[i];
			currentLine = lines[currentMatch.line].join('');
			currentLine = currentLine.replace(findStr, replaceStr);
			lines[currentMatch.line] = currentLine.split('');
		}
		
		that.draw();
		
	};
	
	this.prevMatch = function() {
		if(findMatches.length > 0 && (findMatchesCurrentIndex-1 < 0)) {
			--findMatchesCurrentIndex;
			currentMatch = findMatches[findMatchesCurrentIndex];
			startDrawY = currentMatch.line;
			currentLine = currentMatch.line;
			currentChar = currentMatch.char;
			that.draw();
		}
	};
	
	this.nextMatch = function() {
		var currentMatch;
		
		if(findMatches.length > 0 && (findMatchesCurrentIndex+1 < findMatches.length)) {
			++findMatchesCurrentIndex;
			currentMatch = findMatches[findMatchesCurrentIndex];
			startDrawY = currentMatch.line;
			currentLine = currentMatch.line;
			currentChar = currentMatch.char;			
			that.draw();
		}
	};
};

var myEditor, myOtherEditor;

function makeEditor() {
	myEditor = new TextEditor({
		width: window.innerWidth - 45,
		height: (window.innerHeight-30),
		x: 45,
		y: 20
	});
	myEditor.create();
	
	// myOtherEditor = new TextEditor();
	// myOtherEditor.setOptions({
	// 	width: window.innerWidth - 45,
	// 	height: (window.innerHeight/2),
	// 	x: 45,
	// 	y: window.innerHeight/2
	// });
	// myOtherEditor.create();
	
	//myEditor.getFile('http://www.codefodder.com/sandbox/editor/test.txt')
	//myEditor.importFile('function() {\n    \n}');
};

function log(str) {
	console.log(str);
};
