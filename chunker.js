//Copyright Luke Moody, 2011

function Tokeniser(str, context, lineNumber) {
	
	var parts = {
		
		// Strings
		// FIXME: Combine into one (use 'or' operator)
		sQuoteString: "\'[^\'\\r\\n\\\\]*(?:\\\\.[^\'\\r\\n\\\\]*)*\'",
		dQuoteString: '\"[^\"\\r\\n\\\\]*(?:\\\\.[^\"\\r\\n\\\\]*)*\"',
		
		// Logic
		logic: "!(?:\x3d)?|&&|<(?:\x3d)?|\x3d\x3d(?:\x3d)?|>(?:\x3d)?|\\|\\||\\|",
		
		// Operators
		arithmetic: "%|\\*|\\+(?:\\+)?|-(?:-)?|/",
		assignment: "%\x3d|\\*\x3d|\\+\x3d|-\x3d|/\x3d|\x3d",
		
		// Statements
		statements: "\\belse(?: if)?\\b|\\bif\\b|\\bbreak\\b|\\bcontinue\\b|\\bdo\\b|\\bfor\\b|\\bimport\\b|\\bnew\\b|\\bthis\\b|\\bvoid\\b|\\bcase\\b|\\bdefault\\b|\\bin\\b|\\breturn\\b|\\btypeof\\b|\\bwhile\\b|\\bcomment\\b|\\bdelete\\b|\\bexport\\b|\\blabel\\b|\\bswitch\\b|\\bwith\\b|\\btry\\b|\\bcatch\\b|\\benum\\b|\\bthrow\\b|\\bclass\\b|\\bextends\\b|\\bconst\\b|\\bfinally\\b|\\bdebugger\\b|\\bsuper\\b|\\bRegExp\\b|\\bprototype\\b",
		varS: "(var )([\\w_]+)",
		functionS: "(function)( [\\w_-]+)?",
		arguments: '\\\(\\w+,\\s*\\\)',
		argumentsSecondary: '(\\w+(,\\s)?)+',
		
		// Put this one at the start of the chunker maybe...
		singleComment: "//.*$",
		
		startMultiComment: '/\\*',
		endMultiComment: '\\*/',
		
		// Regexes
		regex: '/[^/]+/',
		
		// Numbers
		numbers: '^\\d+$',
		
		// Everything else!
		others: "\\w+|\\\(|\\\)|{|}|\\\.|,| |;|:|\\?|\\[|\\]|@|\xa3|\\$|\\^|\\\\|\\&|`|~",
		tabStop: '^' + context.tabXter + '+'

	};
	
	var chunker = new RegExp(
			parts.tabStop + 
			'|' + parts.singleComment +
			'|'	+ parts.startMultiComment +
			'|' + parts.endMultiComment +
			'|' + parts.arguments +
			'|' + parts.regex +
			'|' + parts.sQuoteString + 
			'|' + parts.dQuoteString + 
			'|' + parts.logic + 
			'|' + parts.varS + 
			'|' + parts.functionS + 
			'|' + parts.statements +
			'|' + parts.assignment +
			'|' + parts.arithmetic +
			'|' + parts.numbers +
			'|' + parts.others,
			'g'),
			
		matches, results = [];
		
	while( (matches = chunker.exec(str)) ) {
		// matches[0] will contain the whole regex match str
		results.push(matches);
	}
	
	var tempRegex,
		word, words = [];
	
	function Word(str, type, extra) {
		this.word = str;
		this.type = type;
		this.length = str.length * context.singleLetterWidth;
		if(extra) {
			this.extraLength = extra.length * context.singleLetterWidth;
			this.extra = extra;
			this.extraColour = UI.colours[type+'Extra'] || 'white';
		}
		if(type === 'startMultiComment') {
			this.color = UI.colours['singleComment'] || 'white';
		}
		else {
			this.colour = UI.colours[type] || 'white';
		}
		
	}
	
	for(var i = 0; i < results.length; ++i) {	
		
		// Tabstops
		tempRegex = new RegExp(parts.tabStop, 'g');
		if(tempRegex.test(results[i][0])) {
			context.tabIndex[lineNumber] = results[i][0].length / context.options.tabWidth;
			word = new Word(results[i][0], 'tabStop');
			words.push(word);
			continue;
		}
		
		// Comments
		tempRegex = new RegExp(parts.singleComment, 'ig');
		if(tempRegex.test(results[i][0])) {
			word = new Word(results[i][0], 'singleComment');
			words.push(word);
			continue;
		}
		
		tempRegex = new RegExp(parts.startMultiComment, 'ig');
		if(tempRegex.test(results[i][0])) {
			word = new Word(results[i][0], 'startMultiComment');
			words.push(word);
			continue;
		}
		tempRegex = new RegExp(parts.endMultiComment, 'ig');
		if(tempRegex.test(results[i][0])) {
			word = new Word(results[i][0], 'endMultiComment');
			words.push(word);
			continue;
		}
		
		
		// Numbers
		tempRegex = new RegExp(parts.numbers, 'ig');
		if(tempRegex.test(results[i][0])) {
			word = new Word(results[i][0], 'numbers');
			words.push(word);
			continue;
		}
			
		// Strings
		tempRegex = new RegExp(parts.sQuoteString, 'ig');
		if(tempRegex.test(results[i][0])) {
			word = new Word(results[i][0], 'string');
			words.push(word);
			continue;
		}
		
		tempRegex = new RegExp(parts.dQuoteString, 'ig');
		if(tempRegex.test(results[i][0])) {
			word = new Word(results[i][0], 'string');
			words.push(word);
			continue;
		}
		
		// Logic
		tempRegex = new RegExp(parts.logic, 'ig');
		if(tempRegex.test(results[i][0])) {
			word = new Word(results[i][0], 'logic');
			words.push(word);
			continue;
		}
		
		
		// Regexes
		tempRegex = new RegExp(parts.regex, 'ig');
		if(tempRegex.test(results[i][0])) {
			word = new Word(results[i][0], 'regex');
			words.push(word);
			continue;
		}
		
		// Arithmetic
		tempRegex = new RegExp(parts.arithmetic, 'ig');
		if(tempRegex.test(results[i][0])) {
			word = new Word(results[i][0], 'arithmetic');
			words.push(word);
			continue;
		}
		
		// Assignment
		tempRegex = new RegExp(parts.assignment, 'ig');
		if(tempRegex.test(results[i][0])) {
			word = new Word(results[i][0], 'assignment');
			words.push(word);
			continue;
		}
		
		// Statements 
		//(fn/var only)
		tempRegex = new RegExp(parts.varS, 'ig');
		if(tempRegex.test(results[i][0])) {
			word = new Word(results[i][1], 'varS', results[i][2]);
			words.push(word);
			continue;
		}
		tempRegex = new RegExp(parts.functionS, 'ig');
		if(tempRegex.test(results[i][0])) {
			word = new Word(results[i][3], 'functionS', results[i][4]);
			words.push(word);
			continue;
		}
		
		// Other statement types
		tempRegex = new RegExp(parts.statements, 'ig');
		if(tempRegex.test(results[i][0])) {
			word = new Word(results[i][0], 'statements');
			words.push(word);
			continue;
		}
		
		// Arguments
		tempRegex = new RegExp(parts.argumentsSecondary, 'ig');
		if(tempRegex.test(results[i][0])) {
			word = new Word(results[i][0], 'arguments');
			words.push(word);
			continue;
		}
		
		
		// Others
		tempRegex = new RegExp(parts.others, 'ig');
		if(tempRegex.test(results[i][0])) {
			word = new Word(results[i][0], 'others');
			words.push(word);
			continue;
		}
		
		// Here we catch characters we haven't accounted for yet
		word = new Word(results[i][0], 'others');
		words.push(word);
		
	}
	
	return words;
	
};
