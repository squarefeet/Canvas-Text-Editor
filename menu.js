function Menu(menuObj, parent) {
	
	// Setup the holders
	this.wrapper = null;
	this.menuObj = menuObj;
	this.menuObjects = [];
	
	// Make the wrapper
	this.wrapper = document.createElement('div');
	this.wrapper.className = 'menuWrapper';
	
	this.isActive = false;
	
	for(var i in menuObj) {
		this.addMenuItem(menuObj[i], i);
	}
	
	parent.appendChild(this.wrapper);	
};

Menu.prototype.addMenuItem = function(obj, index) {
	var i = 0, l = obj.length, element, menuWrapper, menuItem,
		that = this;
	
	element = document.createElement('a');
	element.textContent = index;
	element.href = '#';

	menuWrapper = document.createElement('div');
	menuWrapper.className = 'menuItemWrapper';

	
	for(var i in obj) {
		menuItem = document.createElement('a');
		menuItem.href = '#';
		menuItem.textContent = i;
		menuItem.onclick = (function(fn) {
			return function() {
				fn();
			}
		}(obj[i]));
		menuWrapper.appendChild(menuItem);
	}
	
	element.appendChild(menuWrapper);
	this.menuObjects.push(menuWrapper);
	this.wrapper.appendChild(element);	
};


var editorMenu = {
	'File': {
		'New': function() {
			log('new');
		},
		'Open': function() {
			log('open');
		},
		'Open Recent': function() {
			log('open recent');
		},
		'Save': function() {
			log('save');
		},
		'Save As...': function() {
			log('save as');
		},
	},
	'Edit': {
		'Find... | cmd+f': function() {
			myEditor.toggleFindReplace();
		}
	},
	'View': {
		'Increase Font Size': function() {
			myEditor.options.font = '20px Monaco';
			myEditor.options.lineHeight = 28;
			myEditor.setFont();
			myEditor.draw();
		},
		'Decrease Font Size': function() {
			myEditor.options.font = '12px Monaco';
			myEditor.options.lineHeight = 18;
			myEditor.setFont();
			myEditor.draw();
		}
	},
	'Text': [
	
	],
	'Navigation': [
	
	],
	'Snippets': [
	
	],
	'Window': [
	
	]
};