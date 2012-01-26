/** 
*	Creates Canvas tag, context, and wrapper.
*/
var CanvasElement = function(options) {

	var style;
	
	// Create elements
	this.wrapper 	= document.createElement('div');
	this.canvas 	= document.createElement('canvas');
	this.context 	= this.canvas.getContext('2d');
	
	// Style the canvas
	style 					= 	this.canvas.style;
	style.width 			= 	options.width + 'px';
	style.height 			= 	options.height + 'px';
	style.position 			= 	'absolute';
	style.top				= 	options.y + 'px';
	style.left 				= 	options.x + 'px';
	style.backgroundColor	= 	options.backgroundColor;
	style.cursor			= 	'text';
	
	// Append canvas to wrapper
	this.wrapper.appendChild(this.canvas);

};


/**
*	Creates the App Menu
*/
var AppMenu = function() {
	
};


/**
*	Creates the Status Bar
*/
var StatusBar = function() {
	
};


/**
*	Event Listener handlers
*/



/**
*	Scrollbar
*/
var Scrollbar = function() {
	var _self = this;
	_self.docH = null;
	_self.contH = null;
	_self.scrollH = null;
	_self.scrolLAreaH = null;
	_self.start = null;
	_self.rightEdge = null;
	_self.context = null;
	
	/*
		Rounded Rectangle code from: 
			http://cyberpython.wordpress.com/2010/05/20/javascript-draw-a-rounded-rectangle-on-an-html-5-canvas/
	
        x: Upper left corner's X coordinate
        y: Upper left corner's Y coordinate
        w: Rectangle's width
        h: Rectangle's height
        r: Corner radius
    */
    this.fillRoundedRect = function(x, y, w, h, r, that){
        _self.context.beginPath();
		_self.context.strokeStyle = that.options.scrollBarStrokeColor;
        _self.context.moveTo(x+r, y);
        _self.context.lineTo(x+w-r, y);
        _self.context.quadraticCurveTo(x+w, y, x+w, y+r);
        _self.context.lineTo(x+w, y+h-r);
        _self.context.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
        _self.context.lineTo(x+r, y+h);
        _self.context.quadraticCurveTo(x, y+h, x, y+h-r);
        _self.context.lineTo(x, y+r);
        _self.context.quadraticCurveTo(x, y, x+r, y);
		_self.context.stroke();
		_self.context.fillStyle = that.options.scrollBarColor;
        _self.context.fill();
    };

	this.calc = function(lines, maxDrawY, startDrawY, context, that) {

		var docH, contH, scrollH, scrollAreaH, start, rightEdge,
			opts = that.options;
			lHeight = opts.lineHeight;

		// Only draw the scrollbar if we need to
		if(lines.length < maxDrawY) {
			return;
		}

		_self.docH 			= 	lines.length * lHeight;
		_self.contH 		= 	maxDrawY * lHeight;
		_self.scrollAreaH 	= 	that.options.height - 10;
		_self.scrollH 		= 	(contH * scrollAreaH) / docH;
		_self.context 		= 	context;

		if(_self.scrollH < 15) {
			_self.scrollH = 15;
		}
		else if(_self.scrollH > _self.scrollAreaH) {
			_self.scrollH = _self.scrollAreaH;
		}

		_self.start 			= 	(((startDrawY * lHeight) / _self.docH) * _self.scrollAreaH) + 2;
		_self.rightEdge 		= 	opts.width - ((opts.scrollBarWidth) + 3.5);

	};
	
	this.draw = function(that) {
		_self.fillRoundedRect(
			_self.rightEdge, 
			_self.start, 
			that.options.scrollBarWidth, 
			_self.scrollH, 
			that.options.scrollBarWidth/2,
			that
		);
	};
};


/**
*	Selection
*/


/**
*	Gutter (& line numbers)
*/


/**
*	Drawer
*/
var Drawer = function() {
	
	var drawer, isActive = false;
	
	this.create = function() {
		drawer = document.createElement('div');
		drawer.className = 'drawer';
		document.body.appendChild(drawer);
	};
	
	this.addElement = function(el) {
		drawer.appendChild(el);
		drawer.style.bottom = -drawer.offsetHeight;
	};
	
	this.show = function() {
		if(!drawer) {
			this.create();
		}
		drawer.style.display = 'block';
		setTimeout(function() {
			drawer.style.bottom = '0px';
		}, 0);
		isActive = true;
	};
	
	this.hide = function() {
		drawer.style.bottom = -drawer.offsetHeight + 'px';
		setTimeout(function() {
			drawer.style.display = 'none';
			isActive = false;
		}, 500);
		
	};
	
	this.getStatus = function() {
		return isActive;
	}
};







