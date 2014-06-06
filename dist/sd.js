/*! Hammer.JS - v1.1.3 - 2014-05-20
 * http://eightmedia.github.io/hammer.js
 *
 * Copyright (c) 2014 Jorik Tangelder <j.tangelder@gmail.com>;
 * Licensed under the MIT license */

(function(window, undefined) {
  'use strict';

/**
 * @main
 * @module hammer
 *
 * @class Hammer
 * @static
 */

/**
 * Hammer, use this to create instances
 * ````
 * var hammertime = new Hammer(myElement);
 * ````
 *
 * @method Hammer
 * @param {HTMLElement} element
 * @param {Object} [options={}]
 * @return {Hammer.Instance}
 */
var Hammer = function Hammer(element, options) {
    return new Hammer.Instance(element, options || {});
};

/**
 * version, as defined in package.json
 * the value will be set at each build
 * @property VERSION
 * @final
 * @type {String}
 */
Hammer.VERSION = '1.1.3';

/**
 * default settings.
 * more settings are defined per gesture at `/gestures`. Each gesture can be disabled/enabled
 * by setting it's name (like `swipe`) to false.
 * You can set the defaults for all instances by changing this object before creating an instance.
 * @example
 * ````
 *  Hammer.defaults.drag = false;
 *  Hammer.defaults.behavior.touchAction = 'pan-y';
 *  delete Hammer.defaults.behavior.userSelect;
 * ````
 * @property defaults
 * @type {Object}
 */
Hammer.defaults = {
    /**
     * this setting object adds styles and attributes to the element to prevent the browser from doing
     * its native behavior. The css properties are auto prefixed for the browsers when needed.
     * @property defaults.behavior
     * @type {Object}
     */
    behavior: {
        /**
         * Disables text selection to improve the dragging gesture. When the value is `none` it also sets
         * `onselectstart=false` for IE on the element. Mainly for desktop browsers.
         * @property defaults.behavior.userSelect
         * @type {String}
         * @default 'none'
         */
        userSelect: 'none',

        /**
         * Specifies whether and how a given region can be manipulated by the user (for instance, by panning or zooming).
         * Used by Chrome 35> and IE10>. By default this makes the element blocking any touch event.
         * @property defaults.behavior.touchAction
         * @type {String}
         * @default: 'pan-y'
         */
        touchAction: 'pan-y',

        /**
         * Disables the default callout shown when you touch and hold a touch target.
         * On iOS, when you touch and hold a touch target such as a link, Safari displays
         * a callout containing information about the link. This property allows you to disable that callout.
         * @property defaults.behavior.touchCallout
         * @type {String}
         * @default 'none'
         */
        touchCallout: 'none',

        /**
         * Specifies whether zooming is enabled. Used by IE10>
         * @property defaults.behavior.contentZooming
         * @type {String}
         * @default 'none'
         */
        contentZooming: 'none',

        /**
         * Specifies that an entire element should be draggable instead of its contents.
         * Mainly for desktop browsers.
         * @property defaults.behavior.userDrag
         * @type {String}
         * @default 'none'
         */
        userDrag: 'none',

        /**
         * Overrides the highlight color shown when the user taps a link or a JavaScript
         * clickable element in Safari on iPhone. This property obeys the alpha value, if specified.
         *
         * If you don't specify an alpha value, Safari on iPhone applies a default alpha value
         * to the color. To disable tap highlighting, set the alpha value to 0 (invisible).
         * If you set the alpha value to 1.0 (opaque), the element is not visible when tapped.
         * @property defaults.behavior.tapHighlightColor
         * @type {String}
         * @default 'rgba(0,0,0,0)'
         */
        tapHighlightColor: 'rgba(0,0,0,0)'
    }
};

/**
 * hammer document where the base events are added at
 * @property DOCUMENT
 * @type {HTMLElement}
 * @default window.document
 */
Hammer.DOCUMENT = document;

/**
 * detect support for pointer events
 * @property HAS_POINTEREVENTS
 * @type {Boolean}
 */
Hammer.HAS_POINTEREVENTS = navigator.pointerEnabled || navigator.msPointerEnabled;

/**
 * detect support for touch events
 * @property HAS_TOUCHEVENTS
 * @type {Boolean}
 */
Hammer.HAS_TOUCHEVENTS = ('ontouchstart' in window);

/**
 * detect mobile browsers
 * @property IS_MOBILE
 * @type {Boolean}
 */
Hammer.IS_MOBILE = /mobile|tablet|ip(ad|hone|od)|android|silk/i.test(navigator.userAgent);

/**
 * detect if we want to support mouseevents at all
 * @property NO_MOUSEEVENTS
 * @type {Boolean}
 */
Hammer.NO_MOUSEEVENTS = (Hammer.HAS_TOUCHEVENTS && Hammer.IS_MOBILE) || Hammer.HAS_POINTEREVENTS;

/**
 * interval in which Hammer recalculates current velocity/direction/angle in ms
 * @property CALCULATE_INTERVAL
 * @type {Number}
 * @default 25
 */
Hammer.CALCULATE_INTERVAL = 25;

/**
 * eventtypes per touchevent (start, move, end) are filled by `Event.determineEventTypes` on `setup`
 * the object contains the DOM event names per type (`EVENT_START`, `EVENT_MOVE`, `EVENT_END`)
 * @property EVENT_TYPES
 * @private
 * @writeOnce
 * @type {Object}
 */
var EVENT_TYPES = {};

/**
 * direction strings, for safe comparisons
 * @property DIRECTION_DOWN|LEFT|UP|RIGHT
 * @final
 * @type {String}
 * @default 'down' 'left' 'up' 'right'
 */
var DIRECTION_DOWN = Hammer.DIRECTION_DOWN = 'down';
var DIRECTION_LEFT = Hammer.DIRECTION_LEFT = 'left';
var DIRECTION_UP = Hammer.DIRECTION_UP = 'up';
var DIRECTION_RIGHT = Hammer.DIRECTION_RIGHT = 'right';

/**
 * pointertype strings, for safe comparisons
 * @property POINTER_MOUSE|TOUCH|PEN
 * @final
 * @type {String}
 * @default 'mouse' 'touch' 'pen'
 */
var POINTER_MOUSE = Hammer.POINTER_MOUSE = 'mouse';
var POINTER_TOUCH = Hammer.POINTER_TOUCH = 'touch';
var POINTER_PEN = Hammer.POINTER_PEN = 'pen';

/**
 * eventtypes
 * @property EVENT_START|MOVE|END|RELEASE|TOUCH
 * @final
 * @type {String}
 * @default 'start' 'change' 'move' 'end' 'release' 'touch'
 */
var EVENT_START = Hammer.EVENT_START = 'start';
var EVENT_MOVE = Hammer.EVENT_MOVE = 'move';
var EVENT_END = Hammer.EVENT_END = 'end';
var EVENT_RELEASE = Hammer.EVENT_RELEASE = 'release';
var EVENT_TOUCH = Hammer.EVENT_TOUCH = 'touch';

/**
 * if the window events are set...
 * @property READY
 * @writeOnce
 * @type {Boolean}
 * @default false
 */
Hammer.READY = false;

/**
 * plugins namespace
 * @property plugins
 * @type {Object}
 */
Hammer.plugins = Hammer.plugins || {};

/**
 * gestures namespace
 * see `/gestures` for the definitions
 * @property gestures
 * @type {Object}
 */
Hammer.gestures = Hammer.gestures || {};

/**
 * setup events to detect gestures on the document
 * this function is called when creating an new instance
 * @private
 */
function setup() {
    if(Hammer.READY) {
        return;
    }

    // find what eventtypes we add listeners to
    Event.determineEventTypes();

    // Register all gestures inside Hammer.gestures
    Utils.each(Hammer.gestures, function(gesture) {
        Detection.register(gesture);
    });

    // Add touch events on the document
    Event.onTouch(Hammer.DOCUMENT, EVENT_MOVE, Detection.detect);
    Event.onTouch(Hammer.DOCUMENT, EVENT_END, Detection.detect);

    // Hammer is ready...!
    Hammer.READY = true;
}

/**
 * @module hammer
 *
 * @class Utils
 * @static
 */
var Utils = Hammer.utils = {
    /**
     * extend method, could also be used for cloning when `dest` is an empty object.
     * changes the dest object
     * @method extend
     * @param {Object} dest
     * @param {Object} src
     * @param {Boolean} [merge=false]  do a merge
     * @return {Object} dest
     */
    extend: function extend(dest, src, merge) {
        for(var key in src) {
            if(!src.hasOwnProperty(key) || (dest[key] !== undefined && merge)) {
                continue;
            }
            dest[key] = src[key];
        }
        return dest;
    },

    /**
     * simple addEventListener wrapper
     * @method on
     * @param {HTMLElement} element
     * @param {String} type
     * @param {Function} handler
     */
    on: function on(element, type, handler) {
        element.addEventListener(type, handler, false);
    },

    /**
     * simple removeEventListener wrapper
     * @method off
     * @param {HTMLElement} element
     * @param {String} type
     * @param {Function} handler
     */
    off: function off(element, type, handler) {
        element.removeEventListener(type, handler, false);
    },

    /**
     * forEach over arrays and objects
     * @method each
     * @param {Object|Array} obj
     * @param {Function} iterator
     * @param {any} iterator.item
     * @param {Number} iterator.index
     * @param {Object|Array} iterator.obj the source object
     * @param {Object} context value to use as `this` in the iterator
     */
    each: function each(obj, iterator, context) {
        var i, len;

        // native forEach on arrays
        if('forEach' in obj) {
            obj.forEach(iterator, context);
        // arrays
        } else if(obj.length !== undefined) {
            for(i = 0, len = obj.length; i < len; i++) {
                if(iterator.call(context, obj[i], i, obj) === false) {
                    return;
                }
            }
        // objects
        } else {
            for(i in obj) {
                if(obj.hasOwnProperty(i) &&
                    iterator.call(context, obj[i], i, obj) === false) {
                    return;
                }
            }
        }
    },

    /**
     * find if a string contains the string using indexOf
     * @method inStr
     * @param {String} src
     * @param {String} find
     * @return {Boolean} found
     */
    inStr: function inStr(src, find) {
        return src.indexOf(find) > -1;
    },

    /**
     * find if a array contains the object using indexOf or a simple polyfill
     * @method inArray
     * @param {String} src
     * @param {String} find
     * @return {Boolean|Number} false when not found, or the index
     */
    inArray: function inArray(src, find) {
        if(src.indexOf) {
            var index = src.indexOf(find);
            return (index === -1) ? false : index;
        } else {
            for(var i = 0, len = src.length; i < len; i++) {
                if(src[i] === find) {
                    return i;
                }
            }
            return false;
        }
    },

    /**
     * convert an array-like object (`arguments`, `touchlist`) to an array
     * @method toArray
     * @param {Object} obj
     * @return {Array}
     */
    toArray: function toArray(obj) {
        return Array.prototype.slice.call(obj, 0);
    },

    /**
     * find if a node is in the given parent
     * @method hasParent
     * @param {HTMLElement} node
     * @param {HTMLElement} parent
     * @return {Boolean} found
     */
    hasParent: function hasParent(node, parent) {
        while(node) {
            if(node == parent) {
                return true;
            }
            node = node.parentNode;
        }
        return false;
    },

    /**
     * get the center of all the touches
     * @method getCenter
     * @param {Array} touches
     * @return {Object} center contains `pageX`, `pageY`, `clientX` and `clientY` properties
     */
    getCenter: function getCenter(touches) {
        var pageX = [],
            pageY = [],
            clientX = [],
            clientY = [],
            min = Math.min,
            max = Math.max;

        // no need to loop when only one touch
        if(touches.length === 1) {
            return {
                pageX: touches[0].pageX,
                pageY: touches[0].pageY,
                clientX: touches[0].clientX,
                clientY: touches[0].clientY
            };
        }

        Utils.each(touches, function(touch) {
            pageX.push(touch.pageX);
            pageY.push(touch.pageY);
            clientX.push(touch.clientX);
            clientY.push(touch.clientY);
        });

        return {
            pageX: (min.apply(Math, pageX) + max.apply(Math, pageX)) / 2,
            pageY: (min.apply(Math, pageY) + max.apply(Math, pageY)) / 2,
            clientX: (min.apply(Math, clientX) + max.apply(Math, clientX)) / 2,
            clientY: (min.apply(Math, clientY) + max.apply(Math, clientY)) / 2
        };
    },

    /**
     * calculate the velocity between two points. unit is in px per ms.
     * @method getVelocity
     * @param {Number} deltaTime
     * @param {Number} deltaX
     * @param {Number} deltaY
     * @return {Object} velocity `x` and `y`
     */
    getVelocity: function getVelocity(deltaTime, deltaX, deltaY) {
        return {
            x: Math.abs(deltaX / deltaTime) || 0,
            y: Math.abs(deltaY / deltaTime) || 0
        };
    },

    /**
     * calculate the angle between two coordinates
     * @method getAngle
     * @param {Touch} touch1
     * @param {Touch} touch2
     * @return {Number} angle
     */
    getAngle: function getAngle(touch1, touch2) {
        var x = touch2.clientX - touch1.clientX,
            y = touch2.clientY - touch1.clientY;

        return Math.atan2(y, x) * 180 / Math.PI;
    },

    /**
     * do a small comparision to get the direction between two touches.
     * @method getDirection
     * @param {Touch} touch1
     * @param {Touch} touch2
     * @return {String} direction matches `DIRECTION_LEFT|RIGHT|UP|DOWN`
     */
    getDirection: function getDirection(touch1, touch2) {
        var x = Math.abs(touch1.clientX - touch2.clientX),
            y = Math.abs(touch1.clientY - touch2.clientY);

        if(x >= y) {
            return touch1.clientX - touch2.clientX > 0 ? DIRECTION_LEFT : DIRECTION_RIGHT;
        }
        return touch1.clientY - touch2.clientY > 0 ? DIRECTION_UP : DIRECTION_DOWN;
    },

    /**
     * calculate the distance between two touches
     * @method getDistance
     * @param {Touch}touch1
     * @param {Touch} touch2
     * @return {Number} distance
     */
    getDistance: function getDistance(touch1, touch2) {
        var x = touch2.clientX - touch1.clientX,
            y = touch2.clientY - touch1.clientY;

        return Math.sqrt((x * x) + (y * y));
    },

    /**
     * calculate the scale factor between two touchLists
     * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
     * @method getScale
     * @param {Array} start array of touches
     * @param {Array} end array of touches
     * @return {Number} scale
     */
    getScale: function getScale(start, end) {
        // need two fingers...
        if(start.length >= 2 && end.length >= 2) {
            return this.getDistance(end[0], end[1]) / this.getDistance(start[0], start[1]);
        }
        return 1;
    },

    /**
     * calculate the rotation degrees between two touchLists
     * @method getRotation
     * @param {Array} start array of touches
     * @param {Array} end array of touches
     * @return {Number} rotation
     */
    getRotation: function getRotation(start, end) {
        // need two fingers
        if(start.length >= 2 && end.length >= 2) {
            return this.getAngle(end[1], end[0]) - this.getAngle(start[1], start[0]);
        }
        return 0;
    },

    /**
     * find out if the direction is vertical   *
     * @method isVertical
     * @param {String} direction matches `DIRECTION_UP|DOWN`
     * @return {Boolean} is_vertical
     */
    isVertical: function isVertical(direction) {
        return direction == DIRECTION_UP || direction == DIRECTION_DOWN;
    },

    /**
     * set css properties with their prefixes
     * @param {HTMLElement} element
     * @param {String} prop
     * @param {String} value
     * @param {Boolean} [toggle=true]
     * @return {Boolean}
     */
    setPrefixedCss: function setPrefixedCss(element, prop, value, toggle) {
        var prefixes = ['', 'Webkit', 'Moz', 'O', 'ms'];
        prop = Utils.toCamelCase(prop);

        for(var i = 0; i < prefixes.length; i++) {
            var p = prop;
            // prefixes
            if(prefixes[i]) {
                p = prefixes[i] + p.slice(0, 1).toUpperCase() + p.slice(1);
            }

            // test the style
            if(p in element.style) {
                element.style[p] = (toggle == null || toggle) && value || '';
                break;
            }
        }
    },

    /**
     * toggle browser default behavior by setting css properties.
     * `userSelect='none'` also sets `element.onselectstart` to false
     * `userDrag='none'` also sets `element.ondragstart` to false
     *
     * @method toggleBehavior
     * @param {HtmlElement} element
     * @param {Object} props
     * @param {Boolean} [toggle=true]
     */
    toggleBehavior: function toggleBehavior(element, props, toggle) {
        if(!props || !element || !element.style) {
            return;
        }

        // set the css properties
        Utils.each(props, function(value, prop) {
            Utils.setPrefixedCss(element, prop, value, toggle);
        });

        var falseFn = toggle && function() {
            return false;
        };

        // also the disable onselectstart
        if(props.userSelect == 'none') {
            element.onselectstart = falseFn;
        }
        // and disable ondragstart
        if(props.userDrag == 'none') {
            element.ondragstart = falseFn;
        }
    },

    /**
     * convert a string with underscores to camelCase
     * so prevent_default becomes preventDefault
     * @param {String} str
     * @return {String} camelCaseStr
     */
    toCamelCase: function toCamelCase(str) {
        return str.replace(/[_-]([a-z])/g, function(s) {
            return s[1].toUpperCase();
        });
    }
};


/**
 * @module hammer
 */
/**
 * @class Event
 * @static
 */
var Event = Hammer.event = {
    /**
     * when touch events have been fired, this is true
     * this is used to stop mouse events
     * @property prevent_mouseevents
     * @private
     * @type {Boolean}
     */
    preventMouseEvents: false,

    /**
     * if EVENT_START has been fired
     * @property started
     * @private
     * @type {Boolean}
     */
    started: false,

    /**
     * when the mouse is hold down, this is true
     * @property should_detect
     * @private
     * @type {Boolean}
     */
    shouldDetect: false,

    /**
     * simple event binder with a hook and support for multiple types
     * @method on
     * @param {HTMLElement} element
     * @param {String} type
     * @param {Function} handler
     * @param {Function} [hook]
     * @param {Object} hook.type
     */
    on: function on(element, type, handler, hook) {
        var types = type.split(' ');
        Utils.each(types, function(type) {
            Utils.on(element, type, handler);
            hook && hook(type);
        });
    },

    /**
     * simple event unbinder with a hook and support for multiple types
     * @method off
     * @param {HTMLElement} element
     * @param {String} type
     * @param {Function} handler
     * @param {Function} [hook]
     * @param {Object} hook.type
     */
    off: function off(element, type, handler, hook) {
        var types = type.split(' ');
        Utils.each(types, function(type) {
            Utils.off(element, type, handler);
            hook && hook(type);
        });
    },

    /**
     * the core touch event handler.
     * this finds out if we should to detect gestures
     * @method onTouch
     * @param {HTMLElement} element
     * @param {String} eventType matches `EVENT_START|MOVE|END`
     * @param {Function} handler
     * @return onTouchHandler {Function} the core event handler
     */
    onTouch: function onTouch(element, eventType, handler) {
        var self = this;

        var onTouchHandler = function onTouchHandler(ev) {
            var srcType = ev.type.toLowerCase(),
                isPointer = Hammer.HAS_POINTEREVENTS,
                isMouse = Utils.inStr(srcType, 'mouse'),
                triggerType;

            // if we are in a mouseevent, but there has been a touchevent triggered in this session
            // we want to do nothing. simply break out of the event.
            if(isMouse && self.preventMouseEvents) {
                return;

            // mousebutton must be down
            } else if(isMouse && eventType == EVENT_START && ev.button === 0) {
                self.preventMouseEvents = false;
                self.shouldDetect = true;
            } else if(isPointer && eventType == EVENT_START) {
                self.shouldDetect = (ev.buttons === 1 || PointerEvent.matchType(POINTER_TOUCH, ev));
            // just a valid start event, but no mouse
            } else if(!isMouse && eventType == EVENT_START) {
                self.preventMouseEvents = true;
                self.shouldDetect = true;
            }

            // update the pointer event before entering the detection
            if(isPointer && eventType != EVENT_END) {
                PointerEvent.updatePointer(eventType, ev);
            }

            // we are in a touch/down state, so allowed detection of gestures
            if(self.shouldDetect) {
                triggerType = self.doDetect.call(self, ev, eventType, element, handler);
            }

            // ...and we are done with the detection
            // so reset everything to start each detection totally fresh
            if(triggerType == EVENT_END) {
                self.preventMouseEvents = false;
                self.shouldDetect = false;
                PointerEvent.reset();
            // update the pointerevent object after the detection
            }

            if(isPointer && eventType == EVENT_END) {
                PointerEvent.updatePointer(eventType, ev);
            }
        };

        this.on(element, EVENT_TYPES[eventType], onTouchHandler);
        return onTouchHandler;
    },

    /**
     * the core detection method
     * this finds out what hammer-touch-events to trigger
     * @method doDetect
     * @param {Object} ev
     * @param {String} eventType matches `EVENT_START|MOVE|END`
     * @param {HTMLElement} element
     * @param {Function} handler
     * @return {String} triggerType matches `EVENT_START|MOVE|END`
     */
    doDetect: function doDetect(ev, eventType, element, handler) {
        var touchList = this.getTouchList(ev, eventType);
        var touchListLength = touchList.length;
        var triggerType = eventType;
        var triggerChange = touchList.trigger; // used by fakeMultitouch plugin
        var changedLength = touchListLength;

        // at each touchstart-like event we want also want to trigger a TOUCH event...
        if(eventType == EVENT_START) {
            triggerChange = EVENT_TOUCH;
        // ...the same for a touchend-like event
        } else if(eventType == EVENT_END) {
            triggerChange = EVENT_RELEASE;

            // keep track of how many touches have been removed
            changedLength = touchList.length - ((ev.changedTouches) ? ev.changedTouches.length : 1);
        }

        // after there are still touches on the screen,
        // we just want to trigger a MOVE event. so change the START or END to a MOVE
        // but only after detection has been started, the first time we actualy want a START
        if(changedLength > 0 && this.started) {
            triggerType = EVENT_MOVE;
        }

        // detection has been started, we keep track of this, see above
        this.started = true;

        // generate some event data, some basic information
        var evData = this.collectEventData(element, triggerType, touchList, ev);

        // trigger the triggerType event before the change (TOUCH, RELEASE) events
        // but the END event should be at last
        if(eventType != EVENT_END) {
            handler.call(Detection, evData);
        }

        // trigger a change (TOUCH, RELEASE) event, this means the length of the touches changed
        if(triggerChange) {
            evData.changedLength = changedLength;
            evData.eventType = triggerChange;

            handler.call(Detection, evData);

            evData.eventType = triggerType;
            delete evData.changedLength;
        }

        // trigger the END event
        if(triggerType == EVENT_END) {
            handler.call(Detection, evData);

            // ...and we are done with the detection
            // so reset everything to start each detection totally fresh
            this.started = false;
        }

        return triggerType;
    },

    /**
     * we have different events for each device/browser
     * determine what we need and set them in the EVENT_TYPES constant
     * the `onTouch` method is bind to these properties.
     * @method determineEventTypes
     * @return {Object} events
     */
    determineEventTypes: function determineEventTypes() {
        var types;
        if(Hammer.HAS_POINTEREVENTS) {
            if(window.PointerEvent) {
                types = [
                    'pointerdown',
                    'pointermove',
                    'pointerup pointercancel lostpointercapture'
                ];
            } else {
                types = [
                    'MSPointerDown',
                    'MSPointerMove',
                    'MSPointerUp MSPointerCancel MSLostPointerCapture'
                ];
            }
        } else if(Hammer.NO_MOUSEEVENTS) {
            types = [
                'touchstart',
                'touchmove',
                'touchend touchcancel'
            ];
        } else {
            types = [
                'touchstart mousedown',
                'touchmove mousemove',
                'touchend touchcancel mouseup'
            ];
        }

        EVENT_TYPES[EVENT_START] = types[0];
        EVENT_TYPES[EVENT_MOVE] = types[1];
        EVENT_TYPES[EVENT_END] = types[2];
        return EVENT_TYPES;
    },

    /**
     * create touchList depending on the event
     * @method getTouchList
     * @param {Object} ev
     * @param {String} eventType
     * @return {Array} touches
     */
    getTouchList: function getTouchList(ev, eventType) {
        // get the fake pointerEvent touchlist
        if(Hammer.HAS_POINTEREVENTS) {
            return PointerEvent.getTouchList();
        }

        // get the touchlist
        if(ev.touches) {
            if(eventType == EVENT_MOVE) {
                return ev.touches;
            }

            var identifiers = [];
            var concat = [].concat(Utils.toArray(ev.touches), Utils.toArray(ev.changedTouches));
            var touchList = [];

            Utils.each(concat, function(touch) {
                if(Utils.inArray(identifiers, touch.identifier) === false) {
                    touchList.push(touch);
                }
                identifiers.push(touch.identifier);
            });

            return touchList;
        }

        // make fake touchList from mouse position
        ev.identifier = 1;
        return [ev];
    },

    /**
     * collect basic event data
     * @method collectEventData
     * @param {HTMLElement} element
     * @param {String} eventType matches `EVENT_START|MOVE|END`
     * @param {Array} touches
     * @param {Object} ev
     * @return {Object} ev
     */
    collectEventData: function collectEventData(element, eventType, touches, ev) {
        // find out pointerType
        var pointerType = POINTER_TOUCH;
        if(Utils.inStr(ev.type, 'mouse') || PointerEvent.matchType(POINTER_MOUSE, ev)) {
            pointerType = POINTER_MOUSE;
        } else if(PointerEvent.matchType(POINTER_PEN, ev)) {
            pointerType = POINTER_PEN;
        }

        return {
            center: Utils.getCenter(touches),
            timeStamp: Date.now(),
            target: ev.target,
            touches: touches,
            eventType: eventType,
            pointerType: pointerType,
            srcEvent: ev,

            /**
             * prevent the browser default actions
             * mostly used to disable scrolling of the browser
             */
            preventDefault: function() {
                var srcEvent = this.srcEvent;
                srcEvent.preventManipulation && srcEvent.preventManipulation();
                srcEvent.preventDefault && srcEvent.preventDefault();
            },

            /**
             * stop bubbling the event up to its parents
             */
            stopPropagation: function() {
                this.srcEvent.stopPropagation();
            },

            /**
             * immediately stop gesture detection
             * might be useful after a swipe was detected
             * @return {*}
             */
            stopDetect: function() {
                return Detection.stopDetect();
            }
        };
    }
};


/**
 * @module hammer
 *
 * @class PointerEvent
 * @static
 */
var PointerEvent = Hammer.PointerEvent = {
    /**
     * holds all pointers, by `identifier`
     * @property pointers
     * @type {Object}
     */
    pointers: {},

    /**
     * get the pointers as an array
     * @method getTouchList
     * @return {Array} touchlist
     */
    getTouchList: function getTouchList() {
        var touchlist = [];
        // we can use forEach since pointerEvents only is in IE10
        Utils.each(this.pointers, function(pointer) {
            touchlist.push(pointer);
        });
        return touchlist;
    },

    /**
     * update the position of a pointer
     * @method updatePointer
     * @param {String} eventType matches `EVENT_START|MOVE|END`
     * @param {Object} pointerEvent
     */
    updatePointer: function updatePointer(eventType, pointerEvent) {
        if(eventType == EVENT_END || (eventType != EVENT_END && pointerEvent.buttons !== 1)) {
            delete this.pointers[pointerEvent.pointerId];
        } else {
            pointerEvent.identifier = pointerEvent.pointerId;
            this.pointers[pointerEvent.pointerId] = pointerEvent;
        }
    },

    /**
     * check if ev matches pointertype
     * @method matchType
     * @param {String} pointerType matches `POINTER_MOUSE|TOUCH|PEN`
     * @param {PointerEvent} ev
     */
    matchType: function matchType(pointerType, ev) {
        if(!ev.pointerType) {
            return false;
        }

        var pt = ev.pointerType,
            types = {};

        types[POINTER_MOUSE] = (pt === (ev.MSPOINTER_TYPE_MOUSE || POINTER_MOUSE));
        types[POINTER_TOUCH] = (pt === (ev.MSPOINTER_TYPE_TOUCH || POINTER_TOUCH));
        types[POINTER_PEN] = (pt === (ev.MSPOINTER_TYPE_PEN || POINTER_PEN));
        return types[pointerType];
    },

    /**
     * reset the stored pointers
     * @method reset
     */
    reset: function resetList() {
        this.pointers = {};
    }
};


/**
 * @module hammer
 *
 * @class Detection
 * @static
 */
var Detection = Hammer.detection = {
    // contains all registred Hammer.gestures in the correct order
    gestures: [],

    // data of the current Hammer.gesture detection session
    current: null,

    // the previous Hammer.gesture session data
    // is a full clone of the previous gesture.current object
    previous: null,

    // when this becomes true, no gestures are fired
    stopped: false,

    /**
     * start Hammer.gesture detection
     * @method startDetect
     * @param {Hammer.Instance} inst
     * @param {Object} eventData
     */
    startDetect: function startDetect(inst, eventData) {
        // already busy with a Hammer.gesture detection on an element
        if(this.current) {
            return;
        }

        this.stopped = false;

        // holds current session
        this.current = {
            inst: inst, // reference to HammerInstance we're working for
            startEvent: Utils.extend({}, eventData), // start eventData for distances, timing etc
            lastEvent: false, // last eventData
            lastCalcEvent: false, // last eventData for calculations.
            futureCalcEvent: false, // last eventData for calculations.
            lastCalcData: {}, // last lastCalcData
            name: '' // current gesture we're in/detected, can be 'tap', 'hold' etc
        };

        this.detect(eventData);
    },

    /**
     * Hammer.gesture detection
     * @method detect
     * @param {Object} eventData
     * @return {any}
     */
    detect: function detect(eventData) {
        if(!this.current || this.stopped) {
            return;
        }

        // extend event data with calculations about scale, distance etc
        eventData = this.extendEventData(eventData);

        // hammer instance and instance options
        var inst = this.current.inst,
            instOptions = inst.options;

        // call Hammer.gesture handlers
        Utils.each(this.gestures, function triggerGesture(gesture) {
            // only when the instance options have enabled this gesture
            if(!this.stopped && inst.enabled && instOptions[gesture.name]) {
                gesture.handler.call(gesture, eventData, inst);
            }
        }, this);

        // store as previous event event
        if(this.current) {
            this.current.lastEvent = eventData;
        }

        if(eventData.eventType == EVENT_END) {
            this.stopDetect();
        }

        return eventData;
    },

    /**
     * clear the Hammer.gesture vars
     * this is called on endDetect, but can also be used when a final Hammer.gesture has been detected
     * to stop other Hammer.gestures from being fired
     * @method stopDetect
     */
    stopDetect: function stopDetect() {
        // clone current data to the store as the previous gesture
        // used for the double tap gesture, since this is an other gesture detect session
        this.previous = Utils.extend({}, this.current);

        // reset the current
        this.current = null;
        this.stopped = true;
    },

    /**
     * calculate velocity, angle and direction
     * @method getVelocityData
     * @param {Object} ev
     * @param {Object} center
     * @param {Number} deltaTime
     * @param {Number} deltaX
     * @param {Number} deltaY
     */
    getCalculatedData: function getCalculatedData(ev, center, deltaTime, deltaX, deltaY) {
        var cur = this.current,
            recalc = false,
            calcEv = cur.lastCalcEvent,
            calcData = cur.lastCalcData;

        if(calcEv && ev.timeStamp - calcEv.timeStamp > Hammer.CALCULATE_INTERVAL) {
            center = calcEv.center;
            deltaTime = ev.timeStamp - calcEv.timeStamp;
            deltaX = ev.center.clientX - calcEv.center.clientX;
            deltaY = ev.center.clientY - calcEv.center.clientY;
            recalc = true;
        }

        if(ev.eventType == EVENT_TOUCH || ev.eventType == EVENT_RELEASE) {
            cur.futureCalcEvent = ev;
        }

        if(!cur.lastCalcEvent || recalc) {
            calcData.velocity = Utils.getVelocity(deltaTime, deltaX, deltaY);
            calcData.angle = Utils.getAngle(center, ev.center);
            calcData.direction = Utils.getDirection(center, ev.center);

            cur.lastCalcEvent = cur.futureCalcEvent || ev;
            cur.futureCalcEvent = ev;
        }

        ev.velocityX = calcData.velocity.x;
        ev.velocityY = calcData.velocity.y;
        ev.interimAngle = calcData.angle;
        ev.interimDirection = calcData.direction;
    },

    /**
     * extend eventData for Hammer.gestures
     * @method extendEventData
     * @param {Object} ev
     * @return {Object} ev
     */
    extendEventData: function extendEventData(ev) {
        var cur = this.current,
            startEv = cur.startEvent,
            lastEv = cur.lastEvent || startEv;

        // update the start touchlist to calculate the scale/rotation
        if(ev.eventType == EVENT_TOUCH || ev.eventType == EVENT_RELEASE) {
            startEv.touches = [];
            Utils.each(ev.touches, function(touch) {
                startEv.touches.push({
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
            });
        }

        var deltaTime = ev.timeStamp - startEv.timeStamp,
            deltaX = ev.center.clientX - startEv.center.clientX,
            deltaY = ev.center.clientY - startEv.center.clientY;

        this.getCalculatedData(ev, lastEv.center, deltaTime, deltaX, deltaY);

        Utils.extend(ev, {
            startEvent: startEv,

            deltaTime: deltaTime,
            deltaX: deltaX,
            deltaY: deltaY,

            distance: Utils.getDistance(startEv.center, ev.center),
            angle: Utils.getAngle(startEv.center, ev.center),
            direction: Utils.getDirection(startEv.center, ev.center),
            scale: Utils.getScale(startEv.touches, ev.touches),
            rotation: Utils.getRotation(startEv.touches, ev.touches)
        });

        return ev;
    },

    /**
     * register new gesture
     * @method register
     * @param {Object} gesture object, see `gestures/` for documentation
     * @return {Array} gestures
     */
    register: function register(gesture) {
        // add an enable gesture options if there is no given
        var options = gesture.defaults || {};
        if(options[gesture.name] === undefined) {
            options[gesture.name] = true;
        }

        // extend Hammer default options with the Hammer.gesture options
        Utils.extend(Hammer.defaults, options, true);

        // set its index
        gesture.index = gesture.index || 1000;

        // add Hammer.gesture to the list
        this.gestures.push(gesture);

        // sort the list by index
        this.gestures.sort(function(a, b) {
            if(a.index < b.index) {
                return -1;
            }
            if(a.index > b.index) {
                return 1;
            }
            return 0;
        });

        return this.gestures;
    }
};


/**
 * @module hammer
 */

/**
 * create new hammer instance
 * all methods should return the instance itself, so it is chainable.
 *
 * @class Instance
 * @constructor
 * @param {HTMLElement} element
 * @param {Object} [options={}] options are merged with `Hammer.defaults`
 * @return {Hammer.Instance}
 */
Hammer.Instance = function(element, options) {
    var self = this;

    // setup HammerJS window events and register all gestures
    // this also sets up the default options
    setup();

    /**
     * @property element
     * @type {HTMLElement}
     */
    this.element = element;

    /**
     * @property enabled
     * @type {Boolean}
     * @protected
     */
    this.enabled = true;

    /**
     * options, merged with the defaults
     * options with an _ are converted to camelCase
     * @property options
     * @type {Object}
     */
    Utils.each(options, function(value, name) {
        delete options[name];
        options[Utils.toCamelCase(name)] = value;
    });

    this.options = Utils.extend(Utils.extend({}, Hammer.defaults), options || {});

    // add some css to the element to prevent the browser from doing its native behavoir
    if(this.options.behavior) {
        Utils.toggleBehavior(this.element, this.options.behavior, true);
    }

    /**
     * event start handler on the element to start the detection
     * @property eventStartHandler
     * @type {Object}
     */
    this.eventStartHandler = Event.onTouch(element, EVENT_START, function(ev) {
        if(self.enabled && ev.eventType == EVENT_START) {
            Detection.startDetect(self, ev);
        } else if(ev.eventType == EVENT_TOUCH) {
            Detection.detect(ev);
        }
    });

    /**
     * keep a list of user event handlers which needs to be removed when calling 'dispose'
     * @property eventHandlers
     * @type {Array}
     */
    this.eventHandlers = [];
};

Hammer.Instance.prototype = {
    /**
     * bind events to the instance
     * @method on
     * @chainable
     * @param {String} gestures multiple gestures by splitting with a space
     * @param {Function} handler
     * @param {Object} handler.ev event object
     */
    on: function onEvent(gestures, handler) {
        var self = this;
        Event.on(self.element, gestures, handler, function(type) {
            self.eventHandlers.push({ gesture: type, handler: handler });
        });
        return self;
    },

    /**
     * unbind events to the instance
     * @method off
     * @chainable
     * @param {String} gestures
     * @param {Function} handler
     */
    off: function offEvent(gestures, handler) {
        var self = this;

        Event.off(self.element, gestures, handler, function(type) {
            var index = Utils.inArray({ gesture: type, handler: handler });
            if(index !== false) {
                self.eventHandlers.splice(index, 1);
            }
        });
        return self;
    },

    /**
     * trigger gesture event
     * @method trigger
     * @chainable
     * @param {String} gesture
     * @param {Object} [eventData]
     */
    trigger: function triggerEvent(gesture, eventData) {
        // optional
        if(!eventData) {
            eventData = {};
        }

        // create DOM event
        var event = Hammer.DOCUMENT.createEvent('Event');
        event.initEvent(gesture, true, true);
        event.gesture = eventData;

        // trigger on the target if it is in the instance element,
        // this is for event delegation tricks
        var element = this.element;
        if(Utils.hasParent(eventData.target, element)) {
            element = eventData.target;
        }

        element.dispatchEvent(event);
        return this;
    },

    /**
     * enable of disable hammer.js detection
     * @method enable
     * @chainable
     * @param {Boolean} state
     */
    enable: function enable(state) {
        this.enabled = state;
        return this;
    },

    /**
     * dispose this hammer instance
     * @method dispose
     * @return {Null}
     */
    dispose: function dispose() {
        var i, eh;

        // undo all changes made by stop_browser_behavior
        Utils.toggleBehavior(this.element, this.options.behavior, false);

        // unbind all custom event handlers
        for(i = -1; (eh = this.eventHandlers[++i]);) {
            Utils.off(this.element, eh.gesture, eh.handler);
        }

        this.eventHandlers = [];

        // unbind the start event listener
        Event.off(this.element, EVENT_TYPES[EVENT_START], this.eventStartHandler);

        return null;
    }
};


/**
 * @module gestures
 */
/**
 * Move with x fingers (default 1) around on the page.
 * Preventing the default browser behavior is a good way to improve feel and working.
 * ````
 *  hammertime.on("drag", function(ev) {
 *    console.log(ev);
 *    ev.gesture.preventDefault();
 *  });
 * ````
 *
 * @class Drag
 * @static
 */
/**
 * @event drag
 * @param {Object} ev
 */
/**
 * @event dragstart
 * @param {Object} ev
 */
/**
 * @event dragend
 * @param {Object} ev
 */
/**
 * @event drapleft
 * @param {Object} ev
 */
/**
 * @event dragright
 * @param {Object} ev
 */
/**
 * @event dragup
 * @param {Object} ev
 */
/**
 * @event dragdown
 * @param {Object} ev
 */

/**
 * @param {String} name
 */
(function(name) {
    var triggered = false;

    function dragGesture(ev, inst) {
        var cur = Detection.current;

        // max touches
        if(inst.options.dragMaxTouches > 0 &&
            ev.touches.length > inst.options.dragMaxTouches) {
            return;
        }

        switch(ev.eventType) {
            case EVENT_START:
                triggered = false;
                break;

            case EVENT_MOVE:
                // when the distance we moved is too small we skip this gesture
                // or we can be already in dragging
                if(ev.distance < inst.options.dragMinDistance &&
                    cur.name != name) {
                    return;
                }

                var startCenter = cur.startEvent.center;

                // we are dragging!
                if(cur.name != name) {
                    cur.name = name;
                    if(inst.options.dragDistanceCorrection && ev.distance > 0) {
                        // When a drag is triggered, set the event center to dragMinDistance pixels from the original event center.
                        // Without this correction, the dragged distance would jumpstart at dragMinDistance pixels instead of at 0.
                        // It might be useful to save the original start point somewhere
                        var factor = Math.abs(inst.options.dragMinDistance / ev.distance);
                        startCenter.pageX += ev.deltaX * factor;
                        startCenter.pageY += ev.deltaY * factor;
                        startCenter.clientX += ev.deltaX * factor;
                        startCenter.clientY += ev.deltaY * factor;

                        // recalculate event data using new start point
                        ev = Detection.extendEventData(ev);
                    }
                }

                // lock drag to axis?
                if(cur.lastEvent.dragLockToAxis ||
                    ( inst.options.dragLockToAxis &&
                        inst.options.dragLockMinDistance <= ev.distance
                        )) {
                    ev.dragLockToAxis = true;
                }

                // keep direction on the axis that the drag gesture started on
                var lastDirection = cur.lastEvent.direction;
                if(ev.dragLockToAxis && lastDirection !== ev.direction) {
                    if(Utils.isVertical(lastDirection)) {
                        ev.direction = (ev.deltaY < 0) ? DIRECTION_UP : DIRECTION_DOWN;
                    } else {
                        ev.direction = (ev.deltaX < 0) ? DIRECTION_LEFT : DIRECTION_RIGHT;
                    }
                }

                // first time, trigger dragstart event
                if(!triggered) {
                    inst.trigger(name + 'start', ev);
                    triggered = true;
                }

                // trigger events
                inst.trigger(name, ev);
                inst.trigger(name + ev.direction, ev);

                var isVertical = Utils.isVertical(ev.direction);

                // block the browser events
                if((inst.options.dragBlockVertical && isVertical) ||
                    (inst.options.dragBlockHorizontal && !isVertical)) {
                    ev.preventDefault();
                }
                break;

            case EVENT_RELEASE:
                if(triggered && ev.changedLength <= inst.options.dragMaxTouches) {
                    inst.trigger(name + 'end', ev);
                    triggered = false;
                }
                break;

            case EVENT_END:
                triggered = false;
                break;
        }
    }

    Hammer.gestures.Drag = {
        name: name,
        index: 50,
        handler: dragGesture,
        defaults: {
            /**
             * minimal movement that have to be made before the drag event gets triggered
             * @property dragMinDistance
             * @type {Number}
             * @default 10
             */
            dragMinDistance: 10,

            /**
             * Set dragDistanceCorrection to true to make the starting point of the drag
             * be calculated from where the drag was triggered, not from where the touch started.
             * Useful to avoid a jerk-starting drag, which can make fine-adjustments
             * through dragging difficult, and be visually unappealing.
             * @property dragDistanceCorrection
             * @type {Boolean}
             * @default true
             */
            dragDistanceCorrection: true,

            /**
             * set 0 for unlimited, but this can conflict with transform
             * @property dragMaxTouches
             * @type {Number}
             * @default 1
             */
            dragMaxTouches: 1,

            /**
             * prevent default browser behavior when dragging occurs
             * be careful with it, it makes the element a blocking element
             * when you are using the drag gesture, it is a good practice to set this true
             * @property dragBlockHorizontal
             * @type {Boolean}
             * @default false
             */
            dragBlockHorizontal: false,

            /**
             * same as `dragBlockHorizontal`, but for vertical movement
             * @property dragBlockVertical
             * @type {Boolean}
             * @default false
             */
            dragBlockVertical: false,

            /**
             * dragLockToAxis keeps the drag gesture on the axis that it started on,
             * It disallows vertical directions if the initial direction was horizontal, and vice versa.
             * @property dragLockToAxis
             * @type {Boolean}
             * @default false
             */
            dragLockToAxis: false,

            /**
             * drag lock only kicks in when distance > dragLockMinDistance
             * This way, locking occurs only when the distance has become large enough to reliably determine the direction
             * @property dragLockMinDistance
             * @type {Number}
             * @default 25
             */
            dragLockMinDistance: 25
        }
    };
})('drag');

/**
 * @module gestures
 */
/**
 * trigger a simple gesture event, so you can do anything in your handler.
 * only usable if you know what your doing...
 *
 * @class Gesture
 * @static
 */
/**
 * @event gesture
 * @param {Object} ev
 */
Hammer.gestures.Gesture = {
    name: 'gesture',
    index: 1337,
    handler: function releaseGesture(ev, inst) {
        inst.trigger(this.name, ev);
    }
};

/**
 * @module gestures
 */
/**
 * Touch stays at the same place for x time
 *
 * @class Hold
 * @static
 */
/**
 * @event hold
 * @param {Object} ev
 */

/**
 * @param {String} name
 */
(function(name) {
    var timer;

    function holdGesture(ev, inst) {
        var options = inst.options,
            current = Detection.current;

        switch(ev.eventType) {
            case EVENT_START:
                clearTimeout(timer);

                // set the gesture so we can check in the timeout if it still is
                current.name = name;

                // set timer and if after the timeout it still is hold,
                // we trigger the hold event
                timer = setTimeout(function() {
                    if(current && current.name == name) {
                        inst.trigger(name, ev);
                    }
                }, options.holdTimeout);
                break;

            case EVENT_MOVE:
                if(ev.distance > options.holdThreshold) {
                    clearTimeout(timer);
                }
                break;

            case EVENT_RELEASE:
                clearTimeout(timer);
                break;
        }
    }

    Hammer.gestures.Hold = {
        name: name,
        index: 10,
        defaults: {
            /**
             * @property holdTimeout
             * @type {Number}
             * @default 500
             */
            holdTimeout: 500,

            /**
             * movement allowed while holding
             * @property holdThreshold
             * @type {Number}
             * @default 2
             */
            holdThreshold: 2
        },
        handler: holdGesture
    };
})('hold');

/**
 * @module gestures
 */
/**
 * when a touch is being released from the page
 *
 * @class Release
 * @static
 */
/**
 * @event release
 * @param {Object} ev
 */
Hammer.gestures.Release = {
    name: 'release',
    index: Infinity,
    handler: function releaseGesture(ev, inst) {
        if(ev.eventType == EVENT_RELEASE) {
            inst.trigger(this.name, ev);
        }
    }
};

/**
 * @module gestures
 */
/**
 * triggers swipe events when the end velocity is above the threshold
 * for best usage, set `preventDefault` (on the drag gesture) to `true`
 * ````
 *  hammertime.on("dragleft swipeleft", function(ev) {
 *    console.log(ev);
 *    ev.gesture.preventDefault();
 *  });
 * ````
 *
 * @class Swipe
 * @static
 */
/**
 * @event swipe
 * @param {Object} ev
 */
/**
 * @event swipeleft
 * @param {Object} ev
 */
/**
 * @event swiperight
 * @param {Object} ev
 */
/**
 * @event swipeup
 * @param {Object} ev
 */
/**
 * @event swipedown
 * @param {Object} ev
 */
Hammer.gestures.Swipe = {
    name: 'swipe',
    index: 40,
    defaults: {
        /**
         * @property swipeMinTouches
         * @type {Number}
         * @default 1
         */
        swipeMinTouches: 1,

        /**
         * @property swipeMaxTouches
         * @type {Number}
         * @default 1
         */
        swipeMaxTouches: 1,

        /**
         * horizontal swipe velocity
         * @property swipeVelocityX
         * @type {Number}
         * @default 0.6
         */
        swipeVelocityX: 0.6,

        /**
         * vertical swipe velocity
         * @property swipeVelocityY
         * @type {Number}
         * @default 0.6
         */
        swipeVelocityY: 0.6
    },

    handler: function swipeGesture(ev, inst) {
        if(ev.eventType == EVENT_RELEASE) {
            var touches = ev.touches.length,
                options = inst.options;

            // max touches
            if(touches < options.swipeMinTouches ||
                touches > options.swipeMaxTouches) {
                return;
            }

            // when the distance we moved is too small we skip this gesture
            // or we can be already in dragging
            if(ev.velocityX > options.swipeVelocityX ||
                ev.velocityY > options.swipeVelocityY) {
                // trigger swipe events
                inst.trigger(this.name, ev);
                inst.trigger(this.name + ev.direction, ev);
            }
        }
    }
};

/**
 * @module gestures
 */
/**
 * Single tap and a double tap on a place
 *
 * @class Tap
 * @static
 */
/**
 * @event tap
 * @param {Object} ev
 */
/**
 * @event doubletap
 * @param {Object} ev
 */

/**
 * @param {String} name
 */
(function(name) {
    var hasMoved = false;

    function tapGesture(ev, inst) {
        var options = inst.options,
            current = Detection.current,
            prev = Detection.previous,
            sincePrev,
            didDoubleTap;

        switch(ev.eventType) {
            case EVENT_START:
                hasMoved = false;
                break;

            case EVENT_MOVE:
                hasMoved = hasMoved || (ev.distance > options.tapMaxDistance);
                break;

            case EVENT_END:
                if(!Utils.inStr(ev.srcEvent.type, 'cancel') && ev.deltaTime < options.tapMaxTime && !hasMoved) {
                    // previous gesture, for the double tap since these are two different gesture detections
                    sincePrev = prev && prev.lastEvent && ev.timeStamp - prev.lastEvent.timeStamp;
                    didDoubleTap = false;

                    // check if double tap
                    if(prev && prev.name == name &&
                        (sincePrev && sincePrev < options.doubleTapInterval) &&
                        ev.distance < options.doubleTapDistance) {
                        inst.trigger('doubletap', ev);
                        didDoubleTap = true;
                    }

                    // do a single tap
                    if(!didDoubleTap || options.tapAlways) {
                        current.name = name;
                        inst.trigger(current.name, ev);
                    }
                }
                break;
        }
    }

    Hammer.gestures.Tap = {
        name: name,
        index: 100,
        handler: tapGesture,
        defaults: {
            /**
             * max time of a tap, this is for the slow tappers
             * @property tapMaxTime
             * @type {Number}
             * @default 250
             */
            tapMaxTime: 250,

            /**
             * max distance of movement of a tap, this is for the slow tappers
             * @property tapMaxDistance
             * @type {Number}
             * @default 10
             */
            tapMaxDistance: 10,

            /**
             * always trigger the `tap` event, even while double-tapping
             * @property tapAlways
             * @type {Boolean}
             * @default true
             */
            tapAlways: true,

            /**
             * max distance between two taps
             * @property doubleTapDistance
             * @type {Number}
             * @default 20
             */
            doubleTapDistance: 20,

            /**
             * max time between two taps
             * @property doubleTapInterval
             * @type {Number}
             * @default 300
             */
            doubleTapInterval: 300
        }
    };
})('tap');

/**
 * @module gestures
 */
/**
 * when a touch is being touched at the page
 *
 * @class Touch
 * @static
 */
/**
 * @event touch
 * @param {Object} ev
 */
Hammer.gestures.Touch = {
    name: 'touch',
    index: -Infinity,
    defaults: {
        /**
         * call preventDefault at touchstart, and makes the element blocking by disabling the scrolling of the page,
         * but it improves gestures like transforming and dragging.
         * be careful with using this, it can be very annoying for users to be stuck on the page
         * @property preventDefault
         * @type {Boolean}
         * @default false
         */
        preventDefault: false,

        /**
         * disable mouse events, so only touch (or pen!) input triggers events
         * @property preventMouse
         * @type {Boolean}
         * @default false
         */
        preventMouse: false
    },
    handler: function touchGesture(ev, inst) {
        if(inst.options.preventMouse && ev.pointerType == POINTER_MOUSE) {
            ev.stopDetect();
            return;
        }

        if(inst.options.preventDefault) {
            ev.preventDefault();
        }

        if(ev.eventType == EVENT_TOUCH) {
            inst.trigger('touch', ev);
        }
    }
};

/**
 * @module gestures
 */
/**
 * User want to scale or rotate with 2 fingers
 * Preventing the default browser behavior is a good way to improve feel and working. This can be done with the
 * `preventDefault` option.
 *
 * @class Transform
 * @static
 */
/**
 * @event transform
 * @param {Object} ev
 */
/**
 * @event transformstart
 * @param {Object} ev
 */
/**
 * @event transformend
 * @param {Object} ev
 */
/**
 * @event pinchin
 * @param {Object} ev
 */
/**
 * @event pinchout
 * @param {Object} ev
 */
/**
 * @event rotate
 * @param {Object} ev
 */

/**
 * @param {String} name
 */
(function(name) {
    var triggered = false;

    function transformGesture(ev, inst) {
        switch(ev.eventType) {
            case EVENT_START:
                triggered = false;
                break;

            case EVENT_MOVE:
                // at least multitouch
                if(ev.touches.length < 2) {
                    return;
                }

                var scaleThreshold = Math.abs(1 - ev.scale);
                var rotationThreshold = Math.abs(ev.rotation);

                // when the distance we moved is too small we skip this gesture
                // or we can be already in dragging
                if(scaleThreshold < inst.options.transformMinScale &&
                    rotationThreshold < inst.options.transformMinRotation) {
                    return;
                }

                // we are transforming!
                Detection.current.name = name;

                // first time, trigger dragstart event
                if(!triggered) {
                    inst.trigger(name + 'start', ev);
                    triggered = true;
                }

                inst.trigger(name, ev); // basic transform event

                // trigger rotate event
                if(rotationThreshold > inst.options.transformMinRotation) {
                    inst.trigger('rotate', ev);
                }

                // trigger pinch event
                if(scaleThreshold > inst.options.transformMinScale) {
                    inst.trigger('pinch', ev);
                    inst.trigger('pinch' + (ev.scale < 1 ? 'in' : 'out'), ev);
                }
                break;

            case EVENT_RELEASE:
                if(triggered && ev.changedLength < 2) {
                    inst.trigger(name + 'end', ev);
                    triggered = false;
                }
                break;
        }
    }

    Hammer.gestures.Transform = {
        name: name,
        index: 45,
        defaults: {
            /**
             * minimal scale factor, no scale is 1, zoomin is to 0 and zoomout until higher then 1
             * @property transformMinScale
             * @type {Number}
             * @default 0.01
             */
            transformMinScale: 0.01,

            /**
             * rotation in degrees
             * @property transformMinRotation
             * @type {Number}
             * @default 1
             */
            transformMinRotation: 1
        },

        handler: transformGesture
    };
})('transform');

/**
 * @module hammer
 */

// AMD export
if(typeof define == 'function' && define.amd) {
    define(function() {
        return Hammer;
    });
// commonjs export
} else if(typeof module !== 'undefined' && module.exports) {
    module.exports = Hammer;
// browser export
} else {
    window.Hammer = Hammer;
}

})(window);// Copyright (c) 2009 Chris Wanstrath (Ruby)
// Copyright (c) 2010 Jan Lehnardt (JavaScript)
// Use of mustache.js is governed by the MIT
// license.
(function(root,factory){if(typeof exports==="object"&&exports){factory(exports)}else{var mustache={};factory(mustache);if(typeof define==="function"&&define.amd){define(mustache)}else{root.Mustache=mustache}}})(this,function(mustache){var whiteRe=/\s*/;var spaceRe=/\s+/;var nonSpaceRe=/\S/;var eqRe=/\s*=/;var curlyRe=/\s*\}/;var tagRe=/#|\^|\/|>|\{|&|=|!/;var RegExp_test=RegExp.prototype.test;function testRegExp(re,string){return RegExp_test.call(re,string)}function isWhitespace(string){return!testRegExp(nonSpaceRe,string)}var Object_toString=Object.prototype.toString;var isArray=Array.isArray||function(object){return Object_toString.call(object)==="[object Array]"};function isFunction(object){return typeof object==="function"}function escapeRegExp(string){return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g,"\\$&")}var entityMap={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","/":"&#x2F;"};function escapeHtml(string){return String(string).replace(/[&<>"'\/]/g,function(s){return entityMap[s]})}function Scanner(string){this.string=string;this.tail=string;this.pos=0}Scanner.prototype.eos=function(){return this.tail===""};Scanner.prototype.scan=function(re){var match=this.tail.match(re);if(match&&match.index===0){var string=match[0];this.tail=this.tail.substring(string.length);this.pos+=string.length;return string}return""};Scanner.prototype.scanUntil=function(re){var index=this.tail.search(re),match;switch(index){case-1:match=this.tail;this.tail="";break;case 0:match="";break;default:match=this.tail.substring(0,index);this.tail=this.tail.substring(index)}this.pos+=match.length;return match};function Context(view,parent){this.view=view==null?{}:view;this.parent=parent;this._cache={".":this.view}}Context.make=function(view){return view instanceof Context?view:new Context(view)};Context.prototype.push=function(view){return new Context(view,this)};Context.prototype.lookup=function(name){var value;if(name in this._cache){value=this._cache[name]}else{var context=this;while(context){if(name.indexOf(".")>0){value=context.view;var names=name.split("."),i=0;while(value!=null&&i<names.length){value=value[names[i++]]}}else{value=context.view[name]}if(value!=null)break;context=context.parent}this._cache[name]=value}if(isFunction(value)){value=value.call(this.view)}return value};function Writer(){this.clearCache()}Writer.prototype.clearCache=function(){this._cache={};this._partialCache={}};Writer.prototype.compile=function(template,tags){var fn=this._cache[template];if(!fn){var tokens=mustache.parse(template,tags);fn=this._cache[template]=this.compileTokens(tokens,template)}return fn};Writer.prototype.compilePartial=function(name,template,tags){var fn=this.compile(template,tags);this._partialCache[name]=fn;return fn};Writer.prototype.getPartial=function(name){if(!(name in this._partialCache)&&this._loadPartial){this.compilePartial(name,this._loadPartial(name))}return this._partialCache[name]};Writer.prototype.compileTokens=function(tokens,template){var self=this;return function(view,partials){if(partials){if(isFunction(partials)){self._loadPartial=partials}else{for(var name in partials){self.compilePartial(name,partials[name])}}}return renderTokens(tokens,self,Context.make(view),template)}};Writer.prototype.render=function(template,view,partials){return this.compile(template)(view,partials)};function renderTokens(tokens,writer,context,template){var buffer="";function subRender(template){return writer.render(template,context)}var token,tokenValue,value;for(var i=0,len=tokens.length;i<len;++i){token=tokens[i];tokenValue=token[1];switch(token[0]){case"#":value=context.lookup(tokenValue);if(typeof value==="object"||typeof value==="string"){if(isArray(value)){for(var j=0,jlen=value.length;j<jlen;++j){buffer+=renderTokens(token[4],writer,context.push(value[j]),template)}}else if(value){buffer+=renderTokens(token[4],writer,context.push(value),template)}}else if(isFunction(value)){var text=template==null?null:template.slice(token[3],token[5]);value=value.call(context.view,text,subRender);if(value!=null)buffer+=value}else if(value){buffer+=renderTokens(token[4],writer,context,template)}break;case"^":value=context.lookup(tokenValue);if(!value||isArray(value)&&value.length===0){buffer+=renderTokens(token[4],writer,context,template)}break;case">":value=writer.getPartial(tokenValue);if(isFunction(value))buffer+=value(context);break;case"&":value=context.lookup(tokenValue);if(value!=null)buffer+=value;break;case"name":value=context.lookup(tokenValue);if(value!=null)buffer+=mustache.escape(value);break;case"text":buffer+=tokenValue;break}}return buffer}function nestTokens(tokens){var tree=[];var collector=tree;var sections=[];var token;for(var i=0,len=tokens.length;i<len;++i){token=tokens[i];switch(token[0]){case"#":case"^":sections.push(token);collector.push(token);collector=token[4]=[];break;case"/":var section=sections.pop();section[5]=token[2];collector=sections.length>0?sections[sections.length-1][4]:tree;break;default:collector.push(token)}}return tree}function squashTokens(tokens){var squashedTokens=[];var token,lastToken;for(var i=0,len=tokens.length;i<len;++i){token=tokens[i];if(token){if(token[0]==="text"&&lastToken&&lastToken[0]==="text"){lastToken[1]+=token[1];lastToken[3]=token[3]}else{lastToken=token;squashedTokens.push(token)}}}return squashedTokens}function escapeTags(tags){return[new RegExp(escapeRegExp(tags[0])+"\\s*"),new RegExp("\\s*"+escapeRegExp(tags[1]))]}function parseTemplate(template,tags){template=template||"";tags=tags||mustache.tags;if(typeof tags==="string")tags=tags.split(spaceRe);if(tags.length!==2)throw new Error("Invalid tags: "+tags.join(", "));var tagRes=escapeTags(tags);var scanner=new Scanner(template);var sections=[];var tokens=[];var spaces=[];var hasTag=false;var nonSpace=false;function stripSpace(){if(hasTag&&!nonSpace){while(spaces.length){delete tokens[spaces.pop()]}}else{spaces=[]}hasTag=false;nonSpace=false}var start,type,value,chr,token,openSection;while(!scanner.eos()){start=scanner.pos;value=scanner.scanUntil(tagRes[0]);if(value){for(var i=0,len=value.length;i<len;++i){chr=value.charAt(i);if(isWhitespace(chr)){spaces.push(tokens.length)}else{nonSpace=true}tokens.push(["text",chr,start,start+1]);start+=1;if(chr=="\n")stripSpace()}}if(!scanner.scan(tagRes[0]))break;hasTag=true;type=scanner.scan(tagRe)||"name";scanner.scan(whiteRe);if(type==="="){value=scanner.scanUntil(eqRe);scanner.scan(eqRe);scanner.scanUntil(tagRes[1])}else if(type==="{"){value=scanner.scanUntil(new RegExp("\\s*"+escapeRegExp("}"+tags[1])));scanner.scan(curlyRe);scanner.scanUntil(tagRes[1]);type="&"}else{value=scanner.scanUntil(tagRes[1])}if(!scanner.scan(tagRes[1]))throw new Error("Unclosed tag at "+scanner.pos);token=[type,value,start,scanner.pos];tokens.push(token);if(type==="#"||type==="^"){sections.push(token)}else if(type==="/"){openSection=sections.pop();if(!openSection){throw new Error('Unopened section "'+value+'" at '+start)}if(openSection[1]!==value){throw new Error('Unclosed section "'+openSection[1]+'" at '+start)}}else if(type==="name"||type==="{"||type==="&"){nonSpace=true}else if(type==="="){tags=value.split(spaceRe);if(tags.length!==2){throw new Error("Invalid tags at "+start+": "+tags.join(", "))}tagRes=escapeTags(tags)}}openSection=sections.pop();if(openSection){throw new Error('Unclosed section "'+openSection[1]+'" at '+scanner.pos)}return nestTokens(squashTokens(tokens))}mustache.name="mustache.js";mustache.version="0.7.3";mustache.tags=["{{","}}"];mustache.Scanner=Scanner;mustache.Context=Context;mustache.Writer=Writer;mustache.parse=parseTemplate;mustache.escape=escapeHtml;var defaultWriter=new Writer;mustache.clearCache=function(){return defaultWriter.clearCache()};mustache.compile=function(template,tags){return defaultWriter.compile(template,tags)};mustache.compilePartial=function(name,template,tags){return defaultWriter.compilePartial(name,template,tags)};mustache.compileTokens=function(tokens,template){return defaultWriter.compileTokens(tokens,template)};mustache.render=function(template,view,partials){return defaultWriter.render(template,view,partials)};mustache.to_html=function(template,view,partials,send){var result=mustache.render(template,view,partials);if(isFunction(send)){send(result)}else{return result}}});
/*!
 *
 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
!function(a){if("function"==typeof bootstrap)bootstrap("promise",a);else if("object"==typeof exports)module.exports=a();else if("function"==typeof define&&define.amd)define(a);else if("undefined"!=typeof ses){if(!ses.ok())return;ses.makeQ=a}else Q=a()}(function(){"use strict";function a(a){return function(){return X.apply(a,arguments)}}function b(a){return a===Object(a)}function c(a){return"[object StopIteration]"===db(a)||a instanceof T}function d(a,b){if(Q&&b.stack&&"object"==typeof a&&null!==a&&a.stack&&-1===a.stack.indexOf(fb)){for(var c=[],d=b;d;d=d.source)d.stack&&c.unshift(d.stack);c.unshift(a.stack);var f=c.join("\n"+fb+"\n");a.stack=e(f)}}function e(a){for(var b=a.split("\n"),c=[],d=0;d<b.length;++d){var e=b[d];h(e)||f(e)||!e||c.push(e)}return c.join("\n")}function f(a){return-1!==a.indexOf("(module.js:")||-1!==a.indexOf("(node.js:")}function g(a){var b=/at .+ \((.+):(\d+):(?:\d+)\)$/.exec(a);if(b)return[b[1],Number(b[2])];var c=/at ([^ ]+):(\d+):(?:\d+)$/.exec(a);if(c)return[c[1],Number(c[2])];var d=/.*@(.+):(\d+)$/.exec(a);return d?[d[1],Number(d[2])]:void 0}function h(a){var b=g(a);if(!b)return!1;var c=b[0],d=b[1];return c===S&&d>=U&&kb>=d}function i(){if(Q)try{throw new Error}catch(a){var b=a.stack.split("\n"),c=b[0].indexOf("@")>0?b[1]:b[2],d=g(c);if(!d)return;return S=d[0],d[1]}}function j(a,b,c){return function(){return"undefined"!=typeof console&&"function"==typeof console.warn&&console.warn(b+" is deprecated, use "+c+" instead.",new Error("").stack),a.apply(a,arguments)}}function k(a){return r(a)?a:s(a)?D(a):C(a)}function l(){function a(a){b=a,f.source=a,Z(c,function(b,c){W(function(){a.promiseDispatch.apply(a,c)})},void 0),c=void 0,d=void 0}var b,c=[],d=[],e=ab(l.prototype),f=ab(o.prototype);if(f.promiseDispatch=function(a,e,f){var g=Y(arguments);c?(c.push(g),"when"===e&&f[1]&&d.push(f[1])):W(function(){b.promiseDispatch.apply(b,g)})},f.valueOf=function(){if(c)return f;var a=q(b);return r(a)&&(b=a),a},f.inspect=function(){return b?b.inspect():{state:"pending"}},k.longStackSupport&&Q)try{throw new Error}catch(g){f.stack=g.stack.substring(g.stack.indexOf("\n")+1)}return e.promise=f,e.resolve=function(c){b||a(k(c))},e.fulfill=function(c){b||a(C(c))},e.reject=function(c){b||a(B(c))},e.notify=function(a){b||Z(d,function(b,c){W(function(){c(a)})},void 0)},e}function m(a){if("function"!=typeof a)throw new TypeError("resolver must be a function.");var b=l();try{a(b.resolve,b.reject,b.notify)}catch(c){b.reject(c)}return b.promise}function n(a){return m(function(b,c){for(var d=0,e=a.length;e>d;d++)k(a[d]).then(b,c)})}function o(a,b,c){void 0===b&&(b=function(a){return B(new Error("Promise does not support operation: "+a))}),void 0===c&&(c=function(){return{state:"unknown"}});var d=ab(o.prototype);if(d.promiseDispatch=function(c,e,f){var g;try{g=a[e]?a[e].apply(d,f):b.call(d,e,f)}catch(h){g=B(h)}c&&c(g)},d.inspect=c,c){var e=c();"rejected"===e.state&&(d.exception=e.reason),d.valueOf=function(){var a=c();return"pending"===a.state||"rejected"===a.state?d:a.value}}return d}function p(a,b,c,d){return k(a).then(b,c,d)}function q(a){if(r(a)){var b=a.inspect();if("fulfilled"===b.state)return b.value}return a}function r(a){return b(a)&&"function"==typeof a.promiseDispatch&&"function"==typeof a.inspect}function s(a){return b(a)&&"function"==typeof a.then}function t(a){return r(a)&&"pending"===a.inspect().state}function u(a){return!r(a)||"fulfilled"===a.inspect().state}function v(a){return r(a)&&"rejected"===a.inspect().state}function w(){!ib&&"undefined"!=typeof window&&window.console&&console.warn("[Q] Unhandled rejection reasons (should be empty):",gb),ib=!0}function x(){for(var a=0;a<gb.length;a++){var b=gb[a];console.warn("Unhandled rejection reason:",b)}}function y(){gb.length=0,hb.length=0,ib=!1,jb||(jb=!0,"undefined"!=typeof process&&process.on&&process.on("exit",x))}function z(a,b){jb&&(hb.push(a),b&&"undefined"!=typeof b.stack?gb.push(b.stack):gb.push("(no stack) "+b),w())}function A(a){if(jb){var b=$(hb,a);-1!==b&&(hb.splice(b,1),gb.splice(b,1))}}function B(a){var b=o({when:function(b){return b&&A(this),b?b(a):this}},function(){return this},function(){return{state:"rejected",reason:a}});return z(b,a),b}function C(a){return o({when:function(){return a},get:function(b){return a[b]},set:function(b,c){a[b]=c},"delete":function(b){delete a[b]},post:function(b,c){return null===b||void 0===b?a.apply(void 0,c):a[b].apply(a,c)},apply:function(b,c){return a.apply(b,c)},keys:function(){return cb(a)}},void 0,function(){return{state:"fulfilled",value:a}})}function D(a){var b=l();return W(function(){try{a.then(b.resolve,b.reject,b.notify)}catch(c){b.reject(c)}}),b.promise}function E(a){return o({isDef:function(){}},function(b,c){return K(a,b,c)},function(){return k(a).inspect()})}function F(a,b,c){return k(a).spread(b,c)}function G(a){return function(){function b(a,b){var g;if(eb){try{g=d[a](b)}catch(h){return B(h)}return g.done?g.value:p(g.value,e,f)}try{g=d[a](b)}catch(h){return c(h)?h.value:B(h)}return p(g,e,f)}var d=a.apply(this,arguments),e=b.bind(b,"next"),f=b.bind(b,"throw");return e()}}function H(a){k.done(k.async(a)())}function I(a){throw new T(a)}function J(a){return function(){return F([this,L(arguments)],function(b,c){return a.apply(b,c)})}}function K(a,b,c){return k(a).dispatch(b,c)}function L(a){return p(a,function(a){var b=0,c=l();return Z(a,function(d,e,f){var g;r(e)&&"fulfilled"===(g=e.inspect()).state?a[f]=g.value:(++b,p(e,function(d){a[f]=d,0===--b&&c.resolve(a)},c.reject,function(a){c.notify({index:f,value:a})}))},void 0),0===b&&c.resolve(a),c.promise})}function M(a){return p(a,function(a){return a=_(a,k),p(L(_(a,function(a){return p(a,V,V)})),function(){return a})})}function N(a){return k(a).allSettled()}function O(a,b){return k(a).then(void 0,void 0,b)}function P(a,b){return k(a).nodeify(b)}var Q=!1;try{throw new Error}catch(R){Q=!!R.stack}var S,T,U=i(),V=function(){},W=function(){function a(){for(;b.next;){b=b.next;var c=b.task;b.task=void 0;var e=b.domain;e&&(b.domain=void 0,e.enter());try{c()}catch(g){if(f)throw e&&e.exit(),setTimeout(a,0),e&&e.enter(),g;setTimeout(function(){throw g},0)}e&&e.exit()}d=!1}var b={task:void 0,next:null},c=b,d=!1,e=void 0,f=!1;if(W=function(a){c=c.next={task:a,domain:f&&process.domain,next:null},d||(d=!0,e())},"undefined"!=typeof process&&process.nextTick)f=!0,e=function(){process.nextTick(a)};else if("function"==typeof setImmediate)e="undefined"!=typeof window?setImmediate.bind(window,a):function(){setImmediate(a)};else if("undefined"!=typeof MessageChannel){var g=new MessageChannel;g.port1.onmessage=function(){e=h,g.port1.onmessage=a,a()};var h=function(){g.port2.postMessage(0)};e=function(){setTimeout(a,0),h()}}else e=function(){setTimeout(a,0)};return W}(),X=Function.call,Y=a(Array.prototype.slice),Z=a(Array.prototype.reduce||function(a,b){var c=0,d=this.length;if(1===arguments.length)for(;;){if(c in this){b=this[c++];break}if(++c>=d)throw new TypeError}for(;d>c;c++)c in this&&(b=a(b,this[c],c));return b}),$=a(Array.prototype.indexOf||function(a){for(var b=0;b<this.length;b++)if(this[b]===a)return b;return-1}),_=a(Array.prototype.map||function(a,b){var c=this,d=[];return Z(c,function(e,f,g){d.push(a.call(b,f,g,c))},void 0),d}),ab=Object.create||function(a){function b(){}return b.prototype=a,new b},bb=a(Object.prototype.hasOwnProperty),cb=Object.keys||function(a){var b=[];for(var c in a)bb(a,c)&&b.push(c);return b},db=a(Object.prototype.toString);T="undefined"!=typeof ReturnValue?ReturnValue:function(a){this.value=a};var eb;try{new Function("(function* (){ yield 1; })"),eb=!0}catch(R){eb=!1}var fb="From previous event:";k.resolve=k,k.nextTick=W,k.longStackSupport=!1,k.defer=l,l.prototype.makeNodeResolver=function(){var a=this;return function(b,c){b?a.reject(b):arguments.length>2?a.resolve(Y(arguments,1)):a.resolve(c)}},k.promise=m,k.passByCopy=function(a){return a},o.prototype.passByCopy=function(){return this},k.join=function(a,b){return k(a).join(b)},o.prototype.join=function(a){return k([this,a]).spread(function(a,b){if(a===b)return a;throw new Error("Can't join: not the same: "+a+" "+b)})},k.race=n,o.prototype.race=function(){return this.then(k.race)},k.makePromise=o,o.prototype.toString=function(){return"[object Promise]"},o.prototype.then=function(a,b,c){function e(b){try{return"function"==typeof a?a(b):b}catch(c){return B(c)}}function f(a){if("function"==typeof b){d(a,h);try{return b(a)}catch(c){return B(c)}}return B(a)}function g(a){return"function"==typeof c?c(a):a}var h=this,i=l(),j=!1;return W(function(){h.promiseDispatch(function(a){j||(j=!0,i.resolve(e(a)))},"when",[function(a){j||(j=!0,i.resolve(f(a)))}])}),h.promiseDispatch(void 0,"when",[void 0,function(a){var b,c=!1;try{b=g(a)}catch(d){if(c=!0,!k.onerror)throw d;k.onerror(d)}c||i.notify(b)}]),i.promise},k.when=p,o.prototype.thenResolve=function(a){return this.then(function(){return a})},k.thenResolve=function(a,b){return k(a).thenResolve(b)},o.prototype.thenReject=function(a){return this.then(function(){throw a})},k.thenReject=function(a,b){return k(a).thenReject(b)},k.nearer=q,k.isPromise=r,k.isPromiseAlike=s,k.isPending=t,o.prototype.isPending=function(){return"pending"===this.inspect().state},k.isFulfilled=u,o.prototype.isFulfilled=function(){return"fulfilled"===this.inspect().state},k.isRejected=v,o.prototype.isRejected=function(){return"rejected"===this.inspect().state};var gb=[],hb=[],ib=!1,jb=!0;k.resetUnhandledRejections=y,k.getUnhandledReasons=function(){return gb.slice()},k.stopUnhandledRejectionTracking=function(){y(),"undefined"!=typeof process&&process.on&&process.removeListener("exit",x),jb=!1},y(),k.reject=B,k.fulfill=C,k.master=E,k.spread=F,o.prototype.spread=function(a,b){return this.all().then(function(b){return a.apply(void 0,b)},b)},k.async=G,k.spawn=H,k["return"]=I,k.promised=J,k.dispatch=K,o.prototype.dispatch=function(a,b){var c=this,d=l();return W(function(){c.promiseDispatch(d.resolve,a,b)}),d.promise},k.get=function(a,b){return k(a).dispatch("get",[b])},o.prototype.get=function(a){return this.dispatch("get",[a])},k.set=function(a,b,c){return k(a).dispatch("set",[b,c])},o.prototype.set=function(a,b){return this.dispatch("set",[a,b])},k.del=k["delete"]=function(a,b){return k(a).dispatch("delete",[b])},o.prototype.del=o.prototype["delete"]=function(a){return this.dispatch("delete",[a])},k.mapply=k.post=function(a,b,c){return k(a).dispatch("post",[b,c])},o.prototype.mapply=o.prototype.post=function(a,b){return this.dispatch("post",[a,b])},k.send=k.mcall=k.invoke=function(a,b){return k(a).dispatch("post",[b,Y(arguments,2)])},o.prototype.send=o.prototype.mcall=o.prototype.invoke=function(a){return this.dispatch("post",[a,Y(arguments,1)])},k.fapply=function(a,b){return k(a).dispatch("apply",[void 0,b])},o.prototype.fapply=function(a){return this.dispatch("apply",[void 0,a])},k["try"]=k.fcall=function(a){return k(a).dispatch("apply",[void 0,Y(arguments,1)])},o.prototype.fcall=function(){return this.dispatch("apply",[void 0,Y(arguments)])},k.fbind=function(a){var b=k(a),c=Y(arguments,1);return function(){return b.dispatch("apply",[this,c.concat(Y(arguments))])}},o.prototype.fbind=function(){var a=this,b=Y(arguments);return function(){return a.dispatch("apply",[this,b.concat(Y(arguments))])}},k.keys=function(a){return k(a).dispatch("keys",[])},o.prototype.keys=function(){return this.dispatch("keys",[])},k.all=L,o.prototype.all=function(){return L(this)},k.allResolved=j(M,"allResolved","allSettled"),o.prototype.allResolved=function(){return M(this)},k.allSettled=N,o.prototype.allSettled=function(){return this.then(function(a){return L(_(a,function(a){function b(){return a.inspect()}return a=k(a),a.then(b,b)}))})},k.fail=k["catch"]=function(a,b){return k(a).then(void 0,b)},o.prototype.fail=o.prototype["catch"]=function(a){return this.then(void 0,a)},k.progress=O,o.prototype.progress=function(a){return this.then(void 0,void 0,a)},k.fin=k["finally"]=function(a,b){return k(a)["finally"](b)},o.prototype.fin=o.prototype["finally"]=function(a){return a=k(a),this.then(function(b){return a.fcall().then(function(){return b})},function(b){return a.fcall().then(function(){throw b})})},k.done=function(a,b,c,d){return k(a).done(b,c,d)},o.prototype.done=function(a,b,c){var e=function(a){W(function(){if(d(a,f),!k.onerror)throw a;k.onerror(a)})},f=a||b||c?this.then(a,b,c):this;"object"==typeof process&&process&&process.domain&&(e=process.domain.bind(e)),f.then(void 0,e)},k.timeout=function(a,b,c){return k(a).timeout(b,c)},o.prototype.timeout=function(a,b){var c=l(),d=setTimeout(function(){c.reject(new Error(b||"Timed out after "+a+" ms"))},a);return this.then(function(a){clearTimeout(d),c.resolve(a)},function(a){clearTimeout(d),c.reject(a)},c.notify),c.promise},k.delay=function(a,b){return void 0===b&&(b=a,a=void 0),k(a).delay(b)},o.prototype.delay=function(a){return this.then(function(b){var c=l();return setTimeout(function(){c.resolve(b)},a),c.promise})},k.nfapply=function(a,b){return k(a).nfapply(b)},o.prototype.nfapply=function(a){var b=l(),c=Y(a);return c.push(b.makeNodeResolver()),this.fapply(c).fail(b.reject),b.promise},k.nfcall=function(a){var b=Y(arguments,1);return k(a).nfapply(b)},o.prototype.nfcall=function(){var a=Y(arguments),b=l();return a.push(b.makeNodeResolver()),this.fapply(a).fail(b.reject),b.promise},k.nfbind=k.denodeify=function(a){var b=Y(arguments,1);return function(){var c=b.concat(Y(arguments)),d=l();return c.push(d.makeNodeResolver()),k(a).fapply(c).fail(d.reject),d.promise}},o.prototype.nfbind=o.prototype.denodeify=function(){var a=Y(arguments);return a.unshift(this),k.denodeify.apply(void 0,a)},k.nbind=function(a,b){var c=Y(arguments,2);return function(){function d(){return a.apply(b,arguments)}var e=c.concat(Y(arguments)),f=l();return e.push(f.makeNodeResolver()),k(d).fapply(e).fail(f.reject),f.promise}},o.prototype.nbind=function(){var a=Y(arguments,0);return a.unshift(this),k.nbind.apply(void 0,a)},k.nmapply=k.npost=function(a,b,c){return k(a).npost(b,c)},o.prototype.nmapply=o.prototype.npost=function(a,b){var c=Y(b||[]),d=l();return c.push(d.makeNodeResolver()),this.dispatch("post",[a,c]).fail(d.reject),d.promise},k.nsend=k.nmcall=k.ninvoke=function(a,b){var c=Y(arguments,2),d=l();return c.push(d.makeNodeResolver()),k(a).dispatch("post",[b,c]).fail(d.reject),d.promise},o.prototype.nsend=o.prototype.nmcall=o.prototype.ninvoke=function(a){var b=Y(arguments,1),c=l();return b.push(c.makeNodeResolver()),this.dispatch("post",[a,b]).fail(c.reject),c.promise},k.nodeify=P,o.prototype.nodeify=function(a){return a?(this.then(function(b){W(function(){a(null,b)})},function(b){W(function(){a(b)})}),void 0):this};var kb=i();return k});
// Snap.svg 0.3.0
// 
// Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// 
// build: 2014-04-26
!function(a){var b,c,d="0.4.2",e="hasOwnProperty",f=/[\.\/]/,g="*",h=function(){},i=function(a,b){return a-b},j={n:{}},k=function(a,d){a=String(a);var e,f=c,g=Array.prototype.slice.call(arguments,2),h=k.listeners(a),j=0,l=[],m={},n=[],o=b;b=a,c=0;for(var p=0,q=h.length;q>p;p++)"zIndex"in h[p]&&(l.push(h[p].zIndex),h[p].zIndex<0&&(m[h[p].zIndex]=h[p]));for(l.sort(i);l[j]<0;)if(e=m[l[j++]],n.push(e.apply(d,g)),c)return c=f,n;for(p=0;q>p;p++)if(e=h[p],"zIndex"in e)if(e.zIndex==l[j]){if(n.push(e.apply(d,g)),c)break;do if(j++,e=m[l[j]],e&&n.push(e.apply(d,g)),c)break;while(e)}else m[e.zIndex]=e;else if(n.push(e.apply(d,g)),c)break;return c=f,b=o,n.length?n:null};k._events=j,k.listeners=function(a){var b,c,d,e,h,i,k,l,m=a.split(f),n=j,o=[n],p=[];for(e=0,h=m.length;h>e;e++){for(l=[],i=0,k=o.length;k>i;i++)for(n=o[i].n,c=[n[m[e]],n[g]],d=2;d--;)b=c[d],b&&(l.push(b),p=p.concat(b.f||[]));o=l}return p},k.on=function(a,b){if(a=String(a),"function"!=typeof b)return function(){};for(var c=a.split(f),d=j,e=0,g=c.length;g>e;e++)d=d.n,d=d.hasOwnProperty(c[e])&&d[c[e]]||(d[c[e]]={n:{}});for(d.f=d.f||[],e=0,g=d.f.length;g>e;e++)if(d.f[e]==b)return h;return d.f.push(b),function(a){+a==+a&&(b.zIndex=+a)}},k.f=function(a){var b=[].slice.call(arguments,1);return function(){k.apply(null,[a,null].concat(b).concat([].slice.call(arguments,0)))}},k.stop=function(){c=1},k.nt=function(a){return a?new RegExp("(?:\\.|\\/|^)"+a+"(?:\\.|\\/|$)").test(b):b},k.nts=function(){return b.split(f)},k.off=k.unbind=function(a,b){if(!a)return void(k._events=j={n:{}});var c,d,h,i,l,m,n,o=a.split(f),p=[j];for(i=0,l=o.length;l>i;i++)for(m=0;m<p.length;m+=h.length-2){if(h=[m,1],c=p[m].n,o[i]!=g)c[o[i]]&&h.push(c[o[i]]);else for(d in c)c[e](d)&&h.push(c[d]);p.splice.apply(p,h)}for(i=0,l=p.length;l>i;i++)for(c=p[i];c.n;){if(b){if(c.f){for(m=0,n=c.f.length;n>m;m++)if(c.f[m]==b){c.f.splice(m,1);break}!c.f.length&&delete c.f}for(d in c.n)if(c.n[e](d)&&c.n[d].f){var q=c.n[d].f;for(m=0,n=q.length;n>m;m++)if(q[m]==b){q.splice(m,1);break}!q.length&&delete c.n[d].f}}else{delete c.f;for(d in c.n)c.n[e](d)&&c.n[d].f&&delete c.n[d].f}c=c.n}},k.once=function(a,b){var c=function(){return k.unbind(a,c),b.apply(this,arguments)};return k.on(a,c)},k.version=d,k.toString=function(){return"You are running Eve "+d},"undefined"!=typeof module&&module.exports?module.exports=k:"undefined"!=typeof define?define("eve",[],function(){return k}):a.eve=k}(this),function(a,b){"function"==typeof define&&define.amd?define(["eve"],function(c){return b(a,c)}):b(a,a.eve)}(this,function(a,b){var c=function(b){var c={},d=a.requestAnimationFrame||a.webkitRequestAnimationFrame||a.mozRequestAnimationFrame||a.oRequestAnimationFrame||a.msRequestAnimationFrame||function(a){setTimeout(a,16)},e=Array.isArray||function(a){return a instanceof Array||"[object Array]"==Object.prototype.toString.call(a)},f=0,g="M"+(+new Date).toString(36),h=function(){return g+(f++).toString(36)},i=Date.now||function(){return+new Date},j=function(a){var b=this;if(null==a)return b.s;var c=b.s-a;b.b+=b.dur*c,b.B+=b.dur*c,b.s=a},k=function(a){var b=this;return null==a?b.spd:void(b.spd=a)},l=function(a){var b=this;return null==a?b.dur:(b.s=b.s*a/b.dur,void(b.dur=a))},m=function(){var a=this;delete c[a.id],a.update(),b("mina.stop."+a.id,a)},n=function(){var a=this;a.pdif||(delete c[a.id],a.update(),a.pdif=a.get()-a.b)},o=function(){var a=this;a.pdif&&(a.b=a.get()-a.pdif,delete a.pdif,c[a.id]=a)},p=function(){var a,b=this;if(e(b.start)){a=[];for(var c=0,d=b.start.length;d>c;c++)a[c]=+b.start[c]+(b.end[c]-b.start[c])*b.easing(b.s)}else a=+b.start+(b.end-b.start)*b.easing(b.s);b.set(a)},q=function(){var a=0;for(var e in c)if(c.hasOwnProperty(e)){var f=c[e],g=f.get();a++,f.s=(g-f.b)/(f.dur/f.spd),f.s>=1&&(delete c[e],f.s=1,a--,function(a){setTimeout(function(){b("mina.finish."+a.id,a)})}(f)),f.update()}a&&d(q)},r=function(a,b,e,f,g,i,s){var t={id:h(),start:a,end:b,b:e,s:0,dur:f-e,spd:1,get:g,set:i,easing:s||r.linear,status:j,speed:k,duration:l,stop:m,pause:n,resume:o,update:p};c[t.id]=t;var u,v=0;for(u in c)if(c.hasOwnProperty(u)&&(v++,2==v))break;return 1==v&&d(q),t};return r.time=i,r.getById=function(a){return c[a]||null},r.linear=function(a){return a},r.easeout=function(a){return Math.pow(a,1.7)},r.easein=function(a){return Math.pow(a,.48)},r.easeinout=function(a){if(1==a)return 1;if(0==a)return 0;var b=.48-a/1.04,c=Math.sqrt(.1734+b*b),d=c-b,e=Math.pow(Math.abs(d),1/3)*(0>d?-1:1),f=-c-b,g=Math.pow(Math.abs(f),1/3)*(0>f?-1:1),h=e+g+.5;return 3*(1-h)*h*h+h*h*h},r.backin=function(a){if(1==a)return 1;var b=1.70158;return a*a*((b+1)*a-b)},r.backout=function(a){if(0==a)return 0;a-=1;var b=1.70158;return a*a*((b+1)*a+b)+1},r.elastic=function(a){return a==!!a?a:Math.pow(2,-10*a)*Math.sin(2*(a-.075)*Math.PI/.3)+1},r.bounce=function(a){var b,c=7.5625,d=2.75;return 1/d>a?b=c*a*a:2/d>a?(a-=1.5/d,b=c*a*a+.75):2.5/d>a?(a-=2.25/d,b=c*a*a+.9375):(a-=2.625/d,b=c*a*a+.984375),b},a.mina=r,r}("undefined"==typeof b?function(){}:b),d=function(){function d(a,b){if(a){if(a.tagName)return z(a);if(a instanceof u)return a;if(null==b)return a=J.doc.querySelector(a),z(a)}return a=null==a?"100%":a,b=null==b?"100%":b,new y(a,b)}function e(a,b){if(b){if("#text"==a&&(a=J.doc.createTextNode(b.text||"")),"string"==typeof a&&(a=e(a)),"string"==typeof b)return"xlink:"==b.substring(0,6)?a.getAttributeNS(gb,b.substring(6)):"xml:"==b.substring(0,4)?a.getAttributeNS(hb,b.substring(4)):a.getAttribute(b);for(var c in b)if(b[K](c)){var d=L(b[c]);d?"xlink:"==c.substring(0,6)?a.setAttributeNS(gb,c.substring(6),d):"xml:"==c.substring(0,4)?a.setAttributeNS(hb,c.substring(4),d):a.setAttribute(c,d):a.removeAttribute(c)}}else a=J.doc.createElementNS(hb,a);return a}function f(a,b){return b=L.prototype.toLowerCase.call(b),"finite"==b?isFinite(a):"array"==b&&(a instanceof Array||Array.isArray&&Array.isArray(a))?!0:"null"==b&&null===a||b==typeof a&&null!==a||"object"==b&&a===Object(a)||V.call(a).slice(8,-1).toLowerCase()==b}function h(a){if("function"==typeof a||Object(a)!==a)return a;var b=new a.constructor;for(var c in a)a[K](c)&&(b[c]=h(a[c]));return b}function i(a,b){for(var c=0,d=a.length;d>c;c++)if(a[c]===b)return a.push(a.splice(c,1)[0])}function j(a,b,c){function d(){var e=Array.prototype.slice.call(arguments,0),f=e.join("␀"),g=d.cache=d.cache||{},h=d.count=d.count||[];return g[K](f)?(i(h,f),c?c(g[f]):g[f]):(h.length>=1e3&&delete g[h.shift()],h.push(f),g[f]=a.apply(b,e),c?c(g[f]):g[f])}return d}function k(a,b,c,d,e,f){if(null==e){var g=a-c,h=b-d;return g||h?(180+180*O.atan2(-h,-g)/S+360)%360:0}return k(a,b,e,f)-k(c,d,e,f)}function l(a){return a%360*S/180}function m(a){return 180*a/S%360}function n(a,b,c,d,e,f){return null==b&&"[object SVGMatrix]"==V.call(a)?(this.a=a.a,this.b=a.b,this.c=a.c,this.d=a.d,this.e=a.e,void(this.f=a.f)):void(null!=a?(this.a=+a,this.b=+b,this.c=+c,this.d=+d,this.e=+e,this.f=+f):(this.a=1,this.b=0,this.c=0,this.d=1,this.e=0,this.f=0))}function o(a){var b=[];return a=a.replace(/(?:^|\s)(\w+)\(([^)]+)\)/g,function(a,c,d){return d=d.split(/\s*,\s*|\s+/),"rotate"==c&&1==d.length&&d.push(0,0),"scale"==c&&(d.length>2?d=d.slice(0,2):2==d.length&&d.push(0,0),1==d.length&&d.push(d[0],0,0)),b.push("skewX"==c?["m",1,0,O.tan(l(d[0])),1,0,0]:"skewY"==c?["m",1,O.tan(l(d[0])),0,1,0,0]:[c.charAt(0)].concat(d)),a}),b}function p(a,b){var c=rb(a),d=new n;if(c)for(var e=0,f=c.length;f>e;e++){var g,h,i,j,k,l=c[e],m=l.length,o=L(l[0]).toLowerCase(),p=l[0]!=o,q=p?d.invert():0;"t"==o&&2==m?d.translate(l[1],0):"t"==o&&3==m?p?(g=q.x(0,0),h=q.y(0,0),i=q.x(l[1],l[2]),j=q.y(l[1],l[2]),d.translate(i-g,j-h)):d.translate(l[1],l[2]):"r"==o?2==m?(k=k||b,d.rotate(l[1],k.x+k.width/2,k.y+k.height/2)):4==m&&(p?(i=q.x(l[2],l[3]),j=q.y(l[2],l[3]),d.rotate(l[1],i,j)):d.rotate(l[1],l[2],l[3])):"s"==o?2==m||3==m?(k=k||b,d.scale(l[1],l[m-1],k.x+k.width/2,k.y+k.height/2)):4==m?p?(i=q.x(l[2],l[3]),j=q.y(l[2],l[3]),d.scale(l[1],l[1],i,j)):d.scale(l[1],l[1],l[2],l[3]):5==m&&(p?(i=q.x(l[3],l[4]),j=q.y(l[3],l[4]),d.scale(l[1],l[2],i,j)):d.scale(l[1],l[2],l[3],l[4])):"m"==o&&7==m&&d.add(l[1],l[2],l[3],l[4],l[5],l[6])}return d}function q(a,b){if(null==b){var c=!0;if(b=a.node.getAttribute("linearGradient"==a.type||"radialGradient"==a.type?"gradientTransform":"pattern"==a.type?"patternTransform":"transform"),!b)return new n;b=o(b)}else b=d._.rgTransform.test(b)?L(b).replace(/\.{3}|\u2026/g,a._.transform||T):o(b),f(b,"array")&&(b=d.path?d.path.toString.call(b):L(b)),a._.transform=b;var e=p(b,a.getBBox(1));return c?e:void(a.matrix=e)}function r(a){var b=a.node.ownerSVGElement&&z(a.node.ownerSVGElement)||a.node.parentNode&&z(a.node.parentNode)||d.select("svg")||d(0,0),c=b.select("defs"),e=null==c?!1:c.node;return e||(e=x("defs",b.node).node),e}function s(a,b,c){function d(a){return null==a?T:a==+a?a:(e(j,{width:a}),j.getBBox().width)}function f(a){return null==a?T:a==+a?a:(e(j,{height:a}),j.getBBox().height)}function g(d,e){null==b?i[d]=e(a.attr(d)||0):d==b&&(i=e(null==c?a.attr(d)||0:c))}var h=r(a),i={},j=h.querySelector(".svg---mgr");switch(j||(j=e("rect"),e(j,{width:10,height:10,"class":"svg---mgr"}),h.appendChild(j)),a.type){case"rect":g("rx",d),g("ry",f);case"image":g("width",d),g("height",f);case"text":g("x",d),g("y",f);break;case"circle":g("cx",d),g("cy",f),g("r",d);break;case"ellipse":g("cx",d),g("cy",f),g("rx",d),g("ry",f);break;case"line":g("x1",d),g("x2",d),g("y1",f),g("y2",f);break;case"marker":g("refX",d),g("markerWidth",d),g("refY",f),g("markerHeight",f);break;case"radialGradient":g("fx",d),g("fy",f);break;case"tspan":g("dx",d),g("dy",f);break;default:g(b,d)}return i}function t(a){f(a,"array")||(a=Array.prototype.slice.call(arguments,0));for(var b=0,c=0,d=this.node;this[b];)delete this[b++];for(b=0;b<a.length;b++)"set"==a[b].type?a[b].forEach(function(a){d.appendChild(a.node)}):d.appendChild(a[b].node);var e=d.childNodes;for(b=0;b<e.length;b++)this[c++]=z(e[b]);return this}function u(a){if(a.snap in ib)return ib[a.snap];var b,c=this.id=fb();try{b=a.ownerSVGElement}catch(d){}if(this.node=a,b&&(this.paper=new y(b)),this.type=a.tagName,this.anims={},this._={transform:[]},a.snap=c,ib[c]=this,"g"==this.type){this.add=t;for(var e in y.prototype)y.prototype[K](e)&&(this[e]=y.prototype[e])}}function v(a){for(var b,c=0,d=a.length;d>c;c++)if(b=b||a[c])return b}function w(a){this.node=a}function x(a,b){var c=e(a);b.appendChild(c);var d=z(c);return d}function y(a,b){var c,d,f,g=y.prototype;if(a&&"svg"==a.tagName){if(a.snap in ib)return ib[a.snap];c=new u(a),d=a.getElementsByTagName("desc")[0],f=a.getElementsByTagName("defs")[0],d||(d=e("desc"),d.appendChild(J.doc.createTextNode("Created with Snap")),c.node.appendChild(d)),f||(f=e("defs"),c.node.appendChild(f)),c.defs=f;for(var h in g)g[K](h)&&(c[h]=g[h]);c.paper=c.root=c}else c=x("svg",J.doc.body),e(c.node,{height:b,version:1.1,width:a,xmlns:hb});return c}function z(a){return a?a instanceof u||a instanceof w?a:"svg"==a.tagName?new y(a):new u(a):a}function A(){return this.selectAll("stop")}function B(a,b){var c=e("stop"),f={offset:+b+"%"};return a=d.color(a),f["stop-color"]=a.hex,a.opacity<1&&(f["stop-opacity"]=a.opacity),e(c,f),this.node.appendChild(c),this}function C(){if("linearGradient"==this.type){var a=e(this.node,"x1")||0,b=e(this.node,"x2")||1,c=e(this.node,"y1")||0,f=e(this.node,"y2")||0;return d._.box(a,c,O.abs(b-a),O.abs(f-c))}var g=this.node.cx||.5,h=this.node.cy||.5,i=this.node.r||0;return d._.box(g-i,h-i,2*i,2*i)}function D(a,c){function d(a,b){for(var c=(b-j)/(a-k),d=k;a>d;d++)h[d].offset=+(+j+c*(d-k)).toFixed(2);k=a,j=b}var f,g=v(b("snap.util.grad.parse",null,c));if(!g)return null;g.params.unshift(a),f="l"==g.type.toLowerCase()?E.apply(0,g.params):F.apply(0,g.params),g.type!=g.type.toLowerCase()&&e(f.node,{gradientUnits:"userSpaceOnUse"});var h=g.stops,i=h.length,j=0,k=0;i--;for(var l=0;i>l;l++)"offset"in h[l]&&d(l,h[l].offset);for(h[i].offset=h[i].offset||100,d(i,h[i].offset),l=0;i>=l;l++){var m=h[l];f.addStop(m.color,m.offset)}return f}function E(a,b,c,d,f){var g=x("linearGradient",a);return g.stops=A,g.addStop=B,g.getBBox=C,null!=b&&e(g.node,{x1:b,y1:c,x2:d,y2:f}),g}function F(a,b,c,d,f,g){var h=x("radialGradient",a);return h.stops=A,h.addStop=B,h.getBBox=C,null!=b&&e(h.node,{cx:b,cy:c,r:d}),null!=f&&null!=g&&e(h.node,{fx:f,fy:g}),h}function G(a){return function(c){if(b.stop(),c instanceof w&&1==c.node.childNodes.length&&("radialGradient"==c.node.firstChild.tagName||"linearGradient"==c.node.firstChild.tagName||"pattern"==c.node.firstChild.tagName)&&(c=c.node.firstChild,r(this).appendChild(c),c=z(c)),c instanceof u)if("radialGradient"==c.type||"linearGradient"==c.type||"pattern"==c.type){c.node.id||e(c.node,{id:c.id});var f=jb(c.node.id)}else f=c.attr(a);else if(f=d.color(c),f.error){var g=D(r(this),c);g?(g.node.id||e(g.node,{id:g.id}),f=jb(g.node.id)):f=c}else f=L(f);var h={};h[a]=f,e(this.node,h),this.node.style[a]=T}}function H(a){for(var b=[],c=a.childNodes,d=0,e=c.length;e>d;d++){var f=c[d];3==f.nodeType&&b.push(f.nodeValue),"tspan"==f.tagName&&b.push(1==f.childNodes.length&&3==f.firstChild.nodeType?f.firstChild.nodeValue:H(f))}return b}function I(){return b.stop(),this.node.style.fontSize}d.version="0.3.0",d.toString=function(){return"Snap v"+this.version},d._={};var J={win:a,doc:a.document};d._.glob=J;var K="hasOwnProperty",L=String,M=parseFloat,N=parseInt,O=Math,P=O.max,Q=O.min,R=O.abs,S=(O.pow,O.PI),T=(O.round,""),U=" ",V=Object.prototype.toString,W=/^\s*((#[a-f\d]{6})|(#[a-f\d]{3})|rgba?\(\s*([\d\.]+%?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+%?)?)\s*\)|hsba?\(\s*([\d\.]+(?:deg|\xb0|%)?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+(?:%?\s*,\s*[\d\.]+)?%?)\s*\)|hsla?\(\s*([\d\.]+(?:deg|\xb0|%)?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+(?:%?\s*,\s*[\d\.]+)?%?)\s*\))\s*$/i,X=/^url\(#?([^)]+)\)$/,Y="	\n\f\r   ᠎             　\u2028\u2029",Z=new RegExp("[,"+Y+"]+"),$=(new RegExp("["+Y+"]","g"),new RegExp("["+Y+"]*,["+Y+"]*")),_={hs:1,rg:1},ab=new RegExp("([a-z])["+Y+",]*((-?\\d*\\.?\\d*(?:e[\\-+]?\\d+)?["+Y+"]*,?["+Y+"]*)+)","ig"),bb=new RegExp("([rstm])["+Y+",]*((-?\\d*\\.?\\d*(?:e[\\-+]?\\d+)?["+Y+"]*,?["+Y+"]*)+)","ig"),cb=new RegExp("(-?\\d*\\.?\\d*(?:e[\\-+]?\\d+)?)["+Y+"]*,?["+Y+"]*","ig"),db=0,eb="S"+(+new Date).toString(36),fb=function(){return eb+(db++).toString(36)},gb="http://www.w3.org/1999/xlink",hb="http://www.w3.org/2000/svg",ib={},jb=d.url=function(a){return"url('#"+a+"')"};d._.$=e,d._.id=fb,d.format=function(){var a=/\{([^\}]+)\}/g,b=/(?:(?:^|\.)(.+?)(?=\[|\.|$|\()|\[('|")(.+?)\2\])(\(\))?/g,c=function(a,c,d){var e=d;return c.replace(b,function(a,b,c,d,f){b=b||d,e&&(b in e&&(e=e[b]),"function"==typeof e&&f&&(e=e()))}),e=(null==e||e==d?a:e)+""};return function(b,d){return L(b).replace(a,function(a,b){return c(a,b,d)})}}();var kb=function(){function a(){this.parentNode.removeChild(this)}return function(b,c){var d=J.doc.createElement("img"),e=J.doc.body;d.style.cssText="position:absolute;left:-9999em;top:-9999em",d.onload=function(){c.call(d),d.onload=d.onerror=null,e.removeChild(d)},d.onerror=a,e.appendChild(d),d.src=b}}();d._.clone=h,d._.cacher=j,d.rad=l,d.deg=m,d.angle=k,d.is=f,d.snapTo=function(a,b,c){if(c=f(c,"finite")?c:10,f(a,"array")){for(var d=a.length;d--;)if(R(a[d]-b)<=c)return a[d]}else{a=+a;var e=b%a;if(c>e)return b-e;if(e>a-c)return b-e+a}return b},function(a){function b(a){return a[0]*a[0]+a[1]*a[1]}function c(a){var c=O.sqrt(b(a));a[0]&&(a[0]/=c),a[1]&&(a[1]/=c)}a.add=function(a,b,c,d,e,f){var g,h,i,j,k=[[],[],[]],l=[[this.a,this.c,this.e],[this.b,this.d,this.f],[0,0,1]],m=[[a,c,e],[b,d,f],[0,0,1]];for(a&&a instanceof n&&(m=[[a.a,a.c,a.e],[a.b,a.d,a.f],[0,0,1]]),g=0;3>g;g++)for(h=0;3>h;h++){for(j=0,i=0;3>i;i++)j+=l[g][i]*m[i][h];k[g][h]=j}return this.a=k[0][0],this.b=k[1][0],this.c=k[0][1],this.d=k[1][1],this.e=k[0][2],this.f=k[1][2],this},a.invert=function(){var a=this,b=a.a*a.d-a.b*a.c;return new n(a.d/b,-a.b/b,-a.c/b,a.a/b,(a.c*a.f-a.d*a.e)/b,(a.b*a.e-a.a*a.f)/b)},a.clone=function(){return new n(this.a,this.b,this.c,this.d,this.e,this.f)},a.translate=function(a,b){return this.add(1,0,0,1,a,b)},a.scale=function(a,b,c,d){return null==b&&(b=a),(c||d)&&this.add(1,0,0,1,c,d),this.add(a,0,0,b,0,0),(c||d)&&this.add(1,0,0,1,-c,-d),this},a.rotate=function(a,b,c){a=l(a),b=b||0,c=c||0;var d=+O.cos(a).toFixed(9),e=+O.sin(a).toFixed(9);return this.add(d,e,-e,d,b,c),this.add(1,0,0,1,-b,-c)},a.x=function(a,b){return a*this.a+b*this.c+this.e},a.y=function(a,b){return a*this.b+b*this.d+this.f},a.get=function(a){return+this[L.fromCharCode(97+a)].toFixed(4)},a.toString=function(){return"matrix("+[this.get(0),this.get(1),this.get(2),this.get(3),this.get(4),this.get(5)].join()+")"},a.offset=function(){return[this.e.toFixed(4),this.f.toFixed(4)]},a.determinant=function(){return this.a*this.d-this.b*this.c},a.split=function(){var a={};a.dx=this.e,a.dy=this.f;var d=[[this.a,this.c],[this.b,this.d]];a.scalex=O.sqrt(b(d[0])),c(d[0]),a.shear=d[0][0]*d[1][0]+d[0][1]*d[1][1],d[1]=[d[1][0]-d[0][0]*a.shear,d[1][1]-d[0][1]*a.shear],a.scaley=O.sqrt(b(d[1])),c(d[1]),a.shear/=a.scaley,this.determinant()<0&&(a.scalex=-a.scalex);var e=-d[0][1],f=d[1][1];return 0>f?(a.rotate=m(O.acos(f)),0>e&&(a.rotate=360-a.rotate)):a.rotate=m(O.asin(e)),a.isSimple=!(+a.shear.toFixed(9)||a.scalex.toFixed(9)!=a.scaley.toFixed(9)&&a.rotate),a.isSuperSimple=!+a.shear.toFixed(9)&&a.scalex.toFixed(9)==a.scaley.toFixed(9)&&!a.rotate,a.noRotation=!+a.shear.toFixed(9)&&!a.rotate,a},a.toTransformString=function(a){var b=a||this.split();return+b.shear.toFixed(9)?"m"+[this.get(0),this.get(1),this.get(2),this.get(3),this.get(4),this.get(5)]:(b.scalex=+b.scalex.toFixed(4),b.scaley=+b.scaley.toFixed(4),b.rotate=+b.rotate.toFixed(4),(b.dx||b.dy?"t"+[+b.dx.toFixed(4),+b.dy.toFixed(4)]:T)+(1!=b.scalex||1!=b.scaley?"s"+[b.scalex,b.scaley,0,0]:T)+(b.rotate?"r"+[+b.rotate.toFixed(4),0,0]:T))}}(n.prototype),d.Matrix=n,d.getRGB=j(function(a){if(!a||(a=L(a)).indexOf("-")+1)return{r:-1,g:-1,b:-1,hex:"none",error:1,toString:ob};if("none"==a)return{r:-1,g:-1,b:-1,hex:"none",toString:ob};if(!(_[K](a.toLowerCase().substring(0,2))||"#"==a.charAt())&&(a=lb(a)),!a)return{r:-1,g:-1,b:-1,hex:"none",error:1,toString:ob};var b,c,e,g,h,i,j=a.match(W);return j?(j[2]&&(e=N(j[2].substring(5),16),c=N(j[2].substring(3,5),16),b=N(j[2].substring(1,3),16)),j[3]&&(e=N((h=j[3].charAt(3))+h,16),c=N((h=j[3].charAt(2))+h,16),b=N((h=j[3].charAt(1))+h,16)),j[4]&&(i=j[4].split($),b=M(i[0]),"%"==i[0].slice(-1)&&(b*=2.55),c=M(i[1]),"%"==i[1].slice(-1)&&(c*=2.55),e=M(i[2]),"%"==i[2].slice(-1)&&(e*=2.55),"rgba"==j[1].toLowerCase().slice(0,4)&&(g=M(i[3])),i[3]&&"%"==i[3].slice(-1)&&(g/=100)),j[5]?(i=j[5].split($),b=M(i[0]),"%"==i[0].slice(-1)&&(b/=100),c=M(i[1]),"%"==i[1].slice(-1)&&(c/=100),e=M(i[2]),"%"==i[2].slice(-1)&&(e/=100),("deg"==i[0].slice(-3)||"°"==i[0].slice(-1))&&(b/=360),"hsba"==j[1].toLowerCase().slice(0,4)&&(g=M(i[3])),i[3]&&"%"==i[3].slice(-1)&&(g/=100),d.hsb2rgb(b,c,e,g)):j[6]?(i=j[6].split($),b=M(i[0]),"%"==i[0].slice(-1)&&(b/=100),c=M(i[1]),"%"==i[1].slice(-1)&&(c/=100),e=M(i[2]),"%"==i[2].slice(-1)&&(e/=100),("deg"==i[0].slice(-3)||"°"==i[0].slice(-1))&&(b/=360),"hsla"==j[1].toLowerCase().slice(0,4)&&(g=M(i[3])),i[3]&&"%"==i[3].slice(-1)&&(g/=100),d.hsl2rgb(b,c,e,g)):(b=Q(O.round(b),255),c=Q(O.round(c),255),e=Q(O.round(e),255),g=Q(P(g,0),1),j={r:b,g:c,b:e,toString:ob},j.hex="#"+(16777216|e|c<<8|b<<16).toString(16).slice(1),j.opacity=f(g,"finite")?g:1,j)):{r:-1,g:-1,b:-1,hex:"none",error:1,toString:ob}},d),d.hsb=j(function(a,b,c){return d.hsb2rgb(a,b,c).hex}),d.hsl=j(function(a,b,c){return d.hsl2rgb(a,b,c).hex}),d.rgb=j(function(a,b,c,d){if(f(d,"finite")){var e=O.round;return"rgba("+[e(a),e(b),e(c),+d.toFixed(2)]+")"}return"#"+(16777216|c|b<<8|a<<16).toString(16).slice(1)});var lb=function(a){var b=J.doc.getElementsByTagName("head")[0],c="rgb(255, 0, 0)";return(lb=j(function(a){if("red"==a.toLowerCase())return c;b.style.color=c,b.style.color=a;var d=J.doc.defaultView.getComputedStyle(b,T).getPropertyValue("color");return d==c?null:d}))(a)},mb=function(){return"hsb("+[this.h,this.s,this.b]+")"},nb=function(){return"hsl("+[this.h,this.s,this.l]+")"},ob=function(){return 1==this.opacity||null==this.opacity?this.hex:"rgba("+[this.r,this.g,this.b,this.opacity]+")"},pb=function(a,b,c){if(null==b&&f(a,"object")&&"r"in a&&"g"in a&&"b"in a&&(c=a.b,b=a.g,a=a.r),null==b&&f(a,string)){var e=d.getRGB(a);a=e.r,b=e.g,c=e.b}return(a>1||b>1||c>1)&&(a/=255,b/=255,c/=255),[a,b,c]},qb=function(a,b,c,e){a=O.round(255*a),b=O.round(255*b),c=O.round(255*c);var g={r:a,g:b,b:c,opacity:f(e,"finite")?e:1,hex:d.rgb(a,b,c),toString:ob};return f(e,"finite")&&(g.opacity=e),g};d.color=function(a){var b;return f(a,"object")&&"h"in a&&"s"in a&&"b"in a?(b=d.hsb2rgb(a),a.r=b.r,a.g=b.g,a.b=b.b,a.opacity=1,a.hex=b.hex):f(a,"object")&&"h"in a&&"s"in a&&"l"in a?(b=d.hsl2rgb(a),a.r=b.r,a.g=b.g,a.b=b.b,a.opacity=1,a.hex=b.hex):(f(a,"string")&&(a=d.getRGB(a)),f(a,"object")&&"r"in a&&"g"in a&&"b"in a&&!("error"in a)?(b=d.rgb2hsl(a),a.h=b.h,a.s=b.s,a.l=b.l,b=d.rgb2hsb(a),a.v=b.b):(a={hex:"none"},a.r=a.g=a.b=a.h=a.s=a.v=a.l=-1,a.error=1)),a.toString=ob,a},d.hsb2rgb=function(a,b,c,d){f(a,"object")&&"h"in a&&"s"in a&&"b"in a&&(c=a.b,b=a.s,a=a.h,d=a.o),a*=360;var e,g,h,i,j;return a=a%360/60,j=c*b,i=j*(1-R(a%2-1)),e=g=h=c-j,a=~~a,e+=[j,i,0,0,i,j][a],g+=[i,j,j,i,0,0][a],h+=[0,0,i,j,j,i][a],qb(e,g,h,d)},d.hsl2rgb=function(a,b,c,d){f(a,"object")&&"h"in a&&"s"in a&&"l"in a&&(c=a.l,b=a.s,a=a.h),(a>1||b>1||c>1)&&(a/=360,b/=100,c/=100),a*=360;var e,g,h,i,j;return a=a%360/60,j=2*b*(.5>c?c:1-c),i=j*(1-R(a%2-1)),e=g=h=c-j/2,a=~~a,e+=[j,i,0,0,i,j][a],g+=[i,j,j,i,0,0][a],h+=[0,0,i,j,j,i][a],qb(e,g,h,d)},d.rgb2hsb=function(a,b,c){c=pb(a,b,c),a=c[0],b=c[1],c=c[2];var d,e,f,g;return f=P(a,b,c),g=f-Q(a,b,c),d=0==g?null:f==a?(b-c)/g:f==b?(c-a)/g+2:(a-b)/g+4,d=(d+360)%6*60/360,e=0==g?0:g/f,{h:d,s:e,b:f,toString:mb}},d.rgb2hsl=function(a,b,c){c=pb(a,b,c),a=c[0],b=c[1],c=c[2];var d,e,f,g,h,i;return g=P(a,b,c),h=Q(a,b,c),i=g-h,d=0==i?null:g==a?(b-c)/i:g==b?(c-a)/i+2:(a-b)/i+4,d=(d+360)%6*60/360,f=(g+h)/2,e=0==i?0:.5>f?i/(2*f):i/(2-2*f),{h:d,s:e,l:f,toString:nb}},d.parsePathString=function(a){if(!a)return null;var b=d.path(a);if(b.arr)return d.path.clone(b.arr);var c={a:7,c:6,o:2,h:1,l:2,m:2,r:4,q:4,s:4,t:2,v:1,u:3,z:0},e=[];return f(a,"array")&&f(a[0],"array")&&(e=d.path.clone(a)),e.length||L(a).replace(ab,function(a,b,d){var f=[],g=b.toLowerCase();if(d.replace(cb,function(a,b){b&&f.push(+b)}),"m"==g&&f.length>2&&(e.push([b].concat(f.splice(0,2))),g="l",b="m"==b?"l":"L"),"o"==g&&1==f.length&&e.push([b,f[0]]),"r"==g)e.push([b].concat(f));else for(;f.length>=c[g]&&(e.push([b].concat(f.splice(0,c[g]))),c[g]););}),e.toString=d.path.toString,b.arr=d.path.clone(e),e};var rb=d.parseTransformString=function(a){if(!a)return null;var b=[];return f(a,"array")&&f(a[0],"array")&&(b=d.path.clone(a)),b.length||L(a).replace(bb,function(a,c,d){{var e=[];c.toLowerCase()}d.replace(cb,function(a,b){b&&e.push(+b)}),b.push([c].concat(e))}),b.toString=d.path.toString,b};d._.svgTransform2string=o,d._.rgTransform=new RegExp("^[a-z]["+Y+"]*-?\\.?\\d","i"),d._.transform2matrix=p,d._unit2px=s;J.doc.contains||J.doc.compareDocumentPosition?function(a,b){var c=9==a.nodeType?a.documentElement:a,d=b&&b.parentNode;return a==d||!(!d||1!=d.nodeType||!(c.contains?c.contains(d):a.compareDocumentPosition&&16&a.compareDocumentPosition(d)))}:function(a,b){if(b)for(;b;)if(b=b.parentNode,b==a)return!0;return!1};d._.getSomeDefs=r,d.select=function(a){return z(J.doc.querySelector(a))},d.selectAll=function(a){for(var b=J.doc.querySelectorAll(a),c=(d.set||Array)(),e=0;e<b.length;e++)c.push(z(b[e]));return c},function(a){function g(a){function b(a,b){var c=e(a.node,b);c=c&&c.match(g),c=c&&c[2],c&&"#"==c.charAt()&&(c=c.substring(1),c&&(i[c]=(i[c]||[]).concat(function(c){var d={};d[b]=jb(c),e(a.node,d)})))}function c(a){var b=e(a.node,"xlink:href");b&&"#"==b.charAt()&&(b=b.substring(1),b&&(i[b]=(i[b]||[]).concat(function(b){a.attr("xlink:href","#"+b)})))}for(var d,f=a.selectAll("*"),g=/^\s*url\(("|'|)(.*)\1\)\s*$/,h=[],i={},j=0,k=f.length;k>j;j++){d=f[j],b(d,"fill"),b(d,"stroke"),b(d,"filter"),b(d,"mask"),b(d,"clip-path"),c(d);var l=e(d.node,"id");l&&(e(d.node,{id:d.id}),h.push({old:l,id:d.id}))}for(j=0,k=h.length;k>j;j++){var m=i[h[j].old];if(m)for(var n=0,o=m.length;o>n;n++)m[n](h[j].id)}}function h(a,b,c){return function(d){var e=d.slice(a,b);return 1==e.length&&(e=e[0]),c?c(e):e}}function i(a){return function(){var b=a?"<"+this.type:"",c=this.node.attributes,d=this.node.childNodes;if(a)for(var e=0,f=c.length;f>e;e++)b+=" "+c[e].name+'="'+c[e].value.replace(/"/g,'\\"')+'"';if(d.length){for(a&&(b+=">"),e=0,f=d.length;f>e;e++)3==d[e].nodeType?b+=d[e].nodeValue:1==d[e].nodeType&&(b+=z(d[e]).toString());a&&(b+="</"+this.type+">")}else a&&(b+="/>");return b}}a.attr=function(a,c){{var d=this;d.node}if(!a)return d;if(f(a,"string")){if(!(arguments.length>1))return v(b("snap.util.getattr."+a,d));var e={};e[a]=c,a=e}for(var g in a)a[K](g)&&b("snap.util.attr."+g,d,a[g]);return d},a.getBBox=function(a){var b=this;if("use"==b.type)if(b.original)b=b.original;else{var c=b.attr("xlink:href");b=J.doc.getElementById(c.substring(c.indexOf("#")+1))}if(b.removed)return{};var e=b._;return a?(e.bboxwt=d.path.get[b.type]?d.path.getBBox(b.realPath=d.path.get[b.type](b)):d._.box(b.node.getBBox()),d._.box(e.bboxwt)):(b.realPath=(d.path.get[b.type]||d.path.get.deflt)(b),e.bbox=d.path.getBBox(d.path.map(b.realPath,b.matrix)),d._.box(e.bbox))};var j=function(){return this.string};a.transform=function(a){var b=this._;if(null==a){var c=new n(this.node.getCTM()),d=q(this),f=d.toTransformString(),g=L(d)==L(this.matrix)?b.transform:f;return{string:g,globalMatrix:c,localMatrix:d,diffMatrix:c.clone().add(d.invert()),global:c.toTransformString(),local:f,toString:j}}return a instanceof n?this.matrix=a:q(this,a),this.node&&("linearGradient"==this.type||"radialGradient"==this.type?e(this.node,{gradientTransform:this.matrix}):"pattern"==this.type?e(this.node,{patternTransform:this.matrix}):e(this.node,{transform:this.matrix})),this},a.parent=function(){return z(this.node.parentNode)},a.append=a.add=function(a){if(a){if("set"==a.type){var b=this;return a.forEach(function(a){b.add(a)}),this}a=z(a),this.node.appendChild(a.node),a.paper=this.paper}return this},a.appendTo=function(a){return a&&(a=z(a),a.append(this)),this},a.prepend=function(a){if(a){a=z(a);var b=a.parent();this.node.insertBefore(a.node,this.node.firstChild),this.add&&this.add(),a.paper=this.paper,this.parent()&&this.parent().add(),b&&b.add()}return this},a.prependTo=function(a){return a=z(a),a.prepend(this),this},a.before=function(a){if("set"==a.type){var b=this;return a.forEach(function(a){var c=a.parent();b.node.parentNode.insertBefore(a.node,b.node),c&&c.add()}),this.parent().add(),this}a=z(a);var c=a.parent();return this.node.parentNode.insertBefore(a.node,this.node),this.parent()&&this.parent().add(),c&&c.add(),a.paper=this.paper,this},a.after=function(a){a=z(a);var b=a.parent();return this.node.nextSibling?this.node.parentNode.insertBefore(a.node,this.node.nextSibling):this.node.parentNode.appendChild(a.node),this.parent()&&this.parent().add(),b&&b.add(),a.paper=this.paper,this},a.insertBefore=function(a){a=z(a);var b=this.parent();return a.node.parentNode.insertBefore(this.node,a.node),this.paper=a.paper,b&&b.add(),a.parent()&&a.parent().add(),this},a.insertAfter=function(a){a=z(a);var b=this.parent();return a.node.parentNode.insertBefore(this.node,a.node.nextSibling),this.paper=a.paper,b&&b.add(),a.parent()&&a.parent().add(),this},a.remove=function(){var a=this.parent();return this.node.parentNode&&this.node.parentNode.removeChild(this.node),delete this.paper,this.removed=!0,a&&a.add(),this},a.select=function(a){return z(this.node.querySelector(a))},a.selectAll=function(a){for(var b=this.node.querySelectorAll(a),c=(d.set||Array)(),e=0;e<b.length;e++)c.push(z(b[e]));return c},a.asPX=function(a,b){return null==b&&(b=this.attr(a)),+s(this,a,b)},a.use=function(){var a,b=this.node.id;return b||(b=this.id,e(this.node,{id:b})),a="linearGradient"==this.type||"radialGradient"==this.type||"pattern"==this.type?x(this.type,this.node.parentNode):x("use",this.node.parentNode),e(a.node,{"xlink:href":"#"+b}),a.original=this,a};var k=/\S+/g;a.addClass=function(a){var b,c,d,e,f=(a||"").match(k)||[],g=this.node,h=g.className.baseVal,i=h.match(k)||[];if(f.length){for(b=0;d=f[b++];)c=i.indexOf(d),~c||i.push(d);e=i.join(" "),h!=e&&(g.className.baseVal=e)}},a.removeClass=function(a){var b,c,d,e,f=(a||"").match(k)||[],g=this.node,h=g.className.baseVal,i=h.match(k)||[];if(i.length){for(b=0;d=f[b++];)c=i.indexOf(d),~c&&i.splice(c,1);e=i.join(" "),h!=e&&(g.className.baseVal=e)}},a.hasClass=function(a){var b=this.node,c=b.className.baseVal,d=c.match(k)||[];return!!~d.indexOf(a)},a.toggleClass=function(a,b){if(null!=b)return b?this.addClass(a):this.removeClass(a);var c,d,e,f,g=(a||"").match(k)||[],h=this.node,i=h.className.baseVal,j=i.match(k)||[];for(c=0;e=g[c++];)d=j.indexOf(e),~d?j.splice(d,1):j.push(e);f=j.join(" "),i!=f&&(h.className.baseVal=f)},a.clone=function(){var a=z(this.node.cloneNode(!0));return e(a.node,"id")&&e(a.node,{id:a.id}),g(a),a.insertAfter(this),a},a.toDefs=function(){var a=r(this);return a.appendChild(this.node),this},a.pattern=function(a,b,c,d){var g=x("pattern",r(this));return null==a&&(a=this.getBBox()),f(a,"object")&&"x"in a&&(b=a.y,c=a.width,d=a.height,a=a.x),e(g.node,{x:a,y:b,width:c,height:d,patternUnits:"userSpaceOnUse",id:g.id,viewBox:[a,b,c,d].join(" ")}),g.node.appendChild(this.node),g},a.marker=function(a,b,c,d,g,h){var i=x("marker",r(this));return null==a&&(a=this.getBBox()),f(a,"object")&&"x"in a&&(b=a.y,c=a.width,d=a.height,g=a.refX||a.cx,h=a.refY||a.cy,a=a.x),e(i.node,{viewBox:[a,b,c,d].join(U),markerWidth:c,markerHeight:d,orient:"auto",refX:g||0,refY:h||0,id:i.id}),i.node.appendChild(this.node),i};var l=function(a,b,d,e){"function"!=typeof d||d.length||(e=d,d=c.linear),this.attr=a,this.dur=b,d&&(this.easing=d),e&&(this.callback=e)};d.animation=function(a,b,c,d){return new l(a,b,c,d)},a.inAnim=function(){var a=this,b=[];for(var c in a.anims)a.anims[K](c)&&!function(a){b.push({anim:new l(a._attrs,a.dur,a.easing,a._callback),curStatus:a.status(),status:function(b){return a.status(b)},stop:function(){a.stop()}})}(a.anims[c]);return b},d.animate=function(a,d,e,f,g,h){"function"!=typeof g||g.length||(h=g,g=c.linear);var i=c.time(),j=c(a,d,i,i+f,c.time,e,g);return h&&b.once("mina.finish."+j.id,h),j},a.stop=function(){for(var a=this.inAnim(),b=0,c=a.length;c>b;b++)a[b].stop();return this},a.animate=function(a,d,e,g){"function"!=typeof e||e.length||(g=e,e=c.linear),a instanceof l&&(g=a.callback,e=a.easing,d=e.dur,a=a.attr);var i,j,k,m,n=[],o=[],p={},q=this;for(var r in a)if(a[K](r)){q.equal?(m=q.equal(r,L(a[r])),i=m.from,j=m.to,k=m.f):(i=+q.attr(r),j=+a[r]);var s=f(i,"array")?i.length:1;p[r]=h(n.length,n.length+s,k),n=n.concat(i),o=o.concat(j)}var t=c.time(),u=c(n,o,t,t+d,c.time,function(a){var b={};for(var c in p)p[K](c)&&(b[c]=p[c](a));q.attr(b)},e);return q.anims[u.id]=u,u._attrs=a,u._callback=g,b.once("mina.finish."+u.id,function(){delete q.anims[u.id],g&&g.call(q)}),b.once("mina.stop."+u.id,function(){delete q.anims[u.id]}),q};var m={};a.data=function(a,c){var e=m[this.id]=m[this.id]||{};if(0==arguments.length)return b("snap.data.get."+this.id,this,e,null),e;if(1==arguments.length){if(d.is(a,"object")){for(var f in a)a[K](f)&&this.data(f,a[f]);return this}return b("snap.data.get."+this.id,this,e[a],a),e[a]}return e[a]=c,b("snap.data.set."+this.id,this,c,a),this},a.removeData=function(a){return null==a?m[this.id]={}:m[this.id]&&delete m[this.id][a],this},a.outerSVG=a.toString=i(1),a.innerSVG=i()}(u.prototype),d.parse=function(a){var b=J.doc.createDocumentFragment(),c=!0,d=J.doc.createElement("div");if(a=L(a),a.match(/^\s*<\s*svg(?:\s|>)/)||(a="<svg>"+a+"</svg>",c=!1),d.innerHTML=a,a=d.getElementsByTagName("svg")[0])if(c)b=a;else for(;a.firstChild;)b.appendChild(a.firstChild);return d.innerHTML=T,new w(b)},w.prototype.select=u.prototype.select,w.prototype.selectAll=u.prototype.selectAll,d.fragment=function(){for(var a=Array.prototype.slice.call(arguments,0),b=J.doc.createDocumentFragment(),c=0,e=a.length;e>c;c++){var f=a[c];
f.node&&f.node.nodeType&&b.appendChild(f.node),f.nodeType&&b.appendChild(f),"string"==typeof f&&b.appendChild(d.parse(f).node)}return new w(b)},function(a){a.el=function(a,b){return x(a,this.node).attr(b)},a.rect=function(a,b,c,d,e,g){var h;return null==g&&(g=e),f(a,"object")&&"[object Object]"==a?h=a:null!=a&&(h={x:a,y:b,width:c,height:d},null!=e&&(h.rx=e,h.ry=g)),this.el("rect",h)},a.circle=function(a,b,c){var d;return f(a,"object")&&"[object Object]"==a?d=a:null!=a&&(d={cx:a,cy:b,r:c}),this.el("circle",d)},a.image=function(a,b,c,d,g){var h=x("image",this.node);if(f(a,"object")&&"src"in a)h.attr(a);else if(null!=a){var i={"xlink:href":a,preserveAspectRatio:"none"};null!=b&&null!=c&&(i.x=b,i.y=c),null!=d&&null!=g?(i.width=d,i.height=g):kb(a,function(){e(h.node,{width:this.offsetWidth,height:this.offsetHeight})}),e(h.node,i)}return h},a.ellipse=function(a,b,c,d){var e=x("ellipse",this.node);return f(a,"object")&&"[object Object]"==a?e.attr(a):null!=a&&e.attr({cx:a,cy:b,rx:c,ry:d}),e},a.path=function(a){var b=x("path",this.node);return f(a,"object")&&!f(a,"array")?b.attr(a):a&&b.attr({d:a}),b},a.group=a.g=function(a){var b=x("g",this.node);return 1==arguments.length&&a&&!a.type?b.attr(a):arguments.length&&b.add(Array.prototype.slice.call(arguments,0)),b},a.svg=function(a,b,c,d,e,f){var g=x("svg",this.node),h={};return null!=a&&(h.width=a),null!=b&&(h.height=b),null!=c&&null!=d&&null!=e&&null!=f&&(h.viewBox=[c,d,e,f]),g.attr(h),g},a.use=function(a){var b=x("use",this.node);return a instanceof u&&(a.attr("id")||a.attr({id:fb()}),a=a.attr("id")),a&&b.attr({"xlink:href":a}),b},a.text=function(a,b,c){var d=x("text",this.node);return f(a,"object")?d.attr(a):null!=a&&d.attr({x:a,y:b,text:c||""}),d},a.line=function(a,b,c,d){var e=x("line",this.node);return f(a,"object")?e.attr(a):null!=a&&e.attr({x1:a,x2:c,y1:b,y2:d}),e},a.polyline=function(a){arguments.length>1&&(a=Array.prototype.slice.call(arguments,0));var b=x("polyline",this.node);return f(a,"object")&&!f(a,"array")?b.attr(a):null!=a&&b.attr({points:a}),b},a.polygon=function(a){arguments.length>1&&(a=Array.prototype.slice.call(arguments,0));var b=x("polygon",this.node);return f(a,"object")&&!f(a,"array")?b.attr(a):null!=a&&b.attr({points:a}),b},function(){a.gradient=function(a){return D(this.defs,a)},a.gradientLinear=function(a,b,c,d){return E(this.defs,a,b,c,d)},a.gradientRadial=function(a,b,c,d,e){return F(this.defs,a,b,c,d,e)},a.toString=function(){var a,b=J.doc.createDocumentFragment(),c=J.doc.createElement("div"),d=this.node.cloneNode(!0);return b.appendChild(c),c.appendChild(d),e(d,{xmlns:hb}),a=c.innerHTML,b.removeChild(b.firstChild),a},a.clear=function(){for(var a,b=this.node.firstChild;b;)a=b.nextSibling,"defs"!=b.tagName&&b.parentNode.removeChild(b),b=a}}()}(y.prototype),d.ajax=function(a,c,d,e){var g=new XMLHttpRequest,h=fb();if(g){if(f(c,"function"))e=d,d=c,c=null;else if(f(c,"object")){var i=[];for(var j in c)c.hasOwnProperty(j)&&i.push(encodeURIComponent(j)+"="+encodeURIComponent(c[j]));c=i.join("&")}return g.open(c?"POST":"GET",a,!0),g.setRequestHeader("X-Requested-With","XMLHttpRequest"),c&&g.setRequestHeader("Content-type","application/x-www-form-urlencoded"),d&&(b.once("snap.ajax."+h+".0",d),b.once("snap.ajax."+h+".200",d),b.once("snap.ajax."+h+".304",d)),g.onreadystatechange=function(){4==g.readyState&&b("snap.ajax."+h+"."+g.status,e,g)},4==g.readyState?g:(g.send(c),g)}},d.load=function(a,b,c){d.ajax(a,function(a){var e=d.parse(a.responseText);c?b.call(c,e):b(e)})},b.on("snap.util.attr.mask",function(a){if(a instanceof u||a instanceof w){if(b.stop(),a instanceof w&&1==a.node.childNodes.length&&(a=a.node.firstChild,r(this).appendChild(a),a=z(a)),"mask"==a.type)var c=a;else c=x("mask",r(this)),c.node.appendChild(a.node),!c.node.id&&e(c.node,{id:c.id});e(this.node,{mask:jb(c.id)})}}),function(a){b.on("snap.util.attr.clip",a),b.on("snap.util.attr.clip-path",a),b.on("snap.util.attr.clipPath",a)}(function(a){if(a instanceof u||a instanceof w){if(b.stop(),"clipPath"==a.type)var c=a;else c=x("clipPath",r(this)),c.node.appendChild(a.node),!c.node.id&&e(c.node,{id:c.id});e(this.node,{"clip-path":jb(c.id)})}}),b.on("snap.util.attr.fill",G("fill")),b.on("snap.util.attr.stroke",G("stroke"));var sb=/^([lr])(?:\(([^)]*)\))?(.*)$/i;b.on("snap.util.grad.parse",function(a){a=L(a);var b=a.match(sb);if(!b)return null;var c=b[1],d=b[2],e=b[3];return d=d.split(/\s*,\s*/).map(function(a){return+a==a?+a:a}),1==d.length&&0==d[0]&&(d=[]),e=e.split("-"),e=e.map(function(a){a=a.split(":");var b={color:a[0]};return a[1]&&(b.offset=parseFloat(a[1])),b}),{type:c,params:d,stops:e}}),b.on("snap.util.attr.d",function(a){b.stop(),f(a,"array")&&f(a[0],"array")&&(a=d.path.toString.call(a)),a=L(a),a.match(/[ruo]/i)&&(a=d.path.toAbsolute(a)),e(this.node,{d:a})})(-1),b.on("snap.util.attr.#text",function(a){b.stop(),a=L(a);for(var c=J.doc.createTextNode(a);this.node.firstChild;)this.node.removeChild(this.node.firstChild);this.node.appendChild(c)})(-1),b.on("snap.util.attr.path",function(a){b.stop(),this.attr({d:a})})(-1),b.on("snap.util.attr.class",function(a){b.stop(),this.node.className.baseVal=a})(-1),b.on("snap.util.attr.viewBox",function(a){var c;c=f(a,"object")&&"x"in a?[a.x,a.y,a.width,a.height].join(" "):f(a,"array")?a.join(" "):a,e(this.node,{viewBox:c}),b.stop()})(-1),b.on("snap.util.attr.transform",function(a){this.transform(a),b.stop()})(-1),b.on("snap.util.attr.r",function(a){"rect"==this.type&&(b.stop(),e(this.node,{rx:a,ry:a}))})(-1),b.on("snap.util.attr.textpath",function(a){if(b.stop(),"text"==this.type){var c,d,g;if(!a&&this.textPath){for(d=this.textPath;d.node.firstChild;)this.node.appendChild(d.node.firstChild);return d.remove(),void delete this.textPath}if(f(a,"string")){var h=r(this),i=z(h.parentNode).path(a);h.appendChild(i.node),c=i.id,i.attr({id:c})}else a=z(a),a instanceof u&&(c=a.attr("id"),c||(c=a.id,a.attr({id:c})));if(c)if(d=this.textPath,g=this.node,d)d.attr({"xlink:href":"#"+c});else{for(d=e("textPath",{"xlink:href":"#"+c});g.firstChild;)d.appendChild(g.firstChild);g.appendChild(d),this.textPath=z(d)}}})(-1),b.on("snap.util.attr.text",function(a){if("text"==this.type){for(var c=this.node,d=function(a){var b=e("tspan");if(f(a,"array"))for(var c=0;c<a.length;c++)b.appendChild(d(a[c]));else b.appendChild(J.doc.createTextNode(a));return b.normalize&&b.normalize(),b};c.firstChild;)c.removeChild(c.firstChild);for(var g=d(a);g.firstChild;)c.appendChild(g.firstChild)}b.stop()})(-1);var tb={"alignment-baseline":0,"baseline-shift":0,clip:0,"clip-path":0,"clip-rule":0,color:0,"color-interpolation":0,"color-interpolation-filters":0,"color-profile":0,"color-rendering":0,cursor:0,direction:0,display:0,"dominant-baseline":0,"enable-background":0,fill:0,"fill-opacity":0,"fill-rule":0,filter:0,"flood-color":0,"flood-opacity":0,font:0,"font-family":0,"font-size":0,"font-size-adjust":0,"font-stretch":0,"font-style":0,"font-variant":0,"font-weight":0,"glyph-orientation-horizontal":0,"glyph-orientation-vertical":0,"image-rendering":0,kerning:0,"letter-spacing":0,"lighting-color":0,marker:0,"marker-end":0,"marker-mid":0,"marker-start":0,mask:0,opacity:0,overflow:0,"pointer-events":0,"shape-rendering":0,"stop-color":0,"stop-opacity":0,stroke:0,"stroke-dasharray":0,"stroke-dashoffset":0,"stroke-linecap":0,"stroke-linejoin":0,"stroke-miterlimit":0,"stroke-opacity":0,"stroke-width":0,"text-anchor":0,"text-decoration":0,"text-rendering":0,"unicode-bidi":0,visibility:0,"word-spacing":0,"writing-mode":0};b.on("snap.util.attr",function(a){var c=b.nt(),d={};c=c.substring(c.lastIndexOf(".")+1),d[c]=a;var f=c.replace(/-(\w)/gi,function(a,b){return b.toUpperCase()}),g=c.replace(/[A-Z]/g,function(a){return"-"+a.toLowerCase()});tb[K](g)?this.node.style[f]=null==a?T:a:e(this.node,d)}),b.on("snap.util.getattr.transform",function(){return b.stop(),this.transform()})(-1),b.on("snap.util.getattr.textpath",function(){return b.stop(),this.textPath})(-1),function(){function a(a){return function(){b.stop();var c=J.doc.defaultView.getComputedStyle(this.node,null).getPropertyValue("marker-"+a);return"none"==c?c:d(J.doc.getElementById(c.match(X)[1]))}}function c(a){return function(c){b.stop();var d="marker"+a.charAt(0).toUpperCase()+a.substring(1);if(""==c||!c)return void(this.node.style[d]="none");if("marker"==c.type){var f=c.node.id;return f||e(c.node,{id:c.id}),void(this.node.style[d]=jb(f))}}}b.on("snap.util.getattr.marker-end",a("end"))(-1),b.on("snap.util.getattr.markerEnd",a("end"))(-1),b.on("snap.util.getattr.marker-start",a("start"))(-1),b.on("snap.util.getattr.markerStart",a("start"))(-1),b.on("snap.util.getattr.marker-mid",a("mid"))(-1),b.on("snap.util.getattr.markerMid",a("mid"))(-1),b.on("snap.util.attr.marker-end",c("end"))(-1),b.on("snap.util.attr.markerEnd",c("end"))(-1),b.on("snap.util.attr.marker-start",c("start"))(-1),b.on("snap.util.attr.markerStart",c("start"))(-1),b.on("snap.util.attr.marker-mid",c("mid"))(-1),b.on("snap.util.attr.markerMid",c("mid"))(-1)}(),b.on("snap.util.getattr.r",function(){return"rect"==this.type&&e(this.node,"rx")==e(this.node,"ry")?(b.stop(),e(this.node,"rx")):void 0})(-1),b.on("snap.util.getattr.text",function(){if("text"==this.type||"tspan"==this.type){b.stop();var a=H(this.node);return 1==a.length?a[0]:a}})(-1),b.on("snap.util.getattr.#text",function(){return this.node.textContent})(-1),b.on("snap.util.getattr.viewBox",function(){b.stop();var a=e(this.node,"viewBox");return a?(a=a.split(Z),d._.box(+a[0],+a[1],+a[2],+a[3])):void 0})(-1),b.on("snap.util.getattr.points",function(){var a=e(this.node,"points");return b.stop(),a.split(Z)}),b.on("snap.util.getattr.path",function(){var a=e(this.node,"d");return b.stop(),a}),b.on("snap.util.getattr.class",function(){return this.node.className.baseVal}),b.on("snap.util.getattr.fontSize",I)(-1),b.on("snap.util.getattr.font-size",I)(-1),b.on("snap.util.getattr",function(){var a=b.nt();a=a.substring(a.lastIndexOf(".")+1);var c=a.replace(/[A-Z]/g,function(a){return"-"+a.toLowerCase()});return tb[K](c)?J.doc.defaultView.getComputedStyle(this.node,null).getPropertyValue(c):e(this.node,a)});var ub=function(a){var b=a.getBoundingClientRect(),c=a.ownerDocument,d=c.body,e=c.documentElement,f=e.clientTop||d.clientTop||0,h=e.clientLeft||d.clientLeft||0,i=b.top+(g.win.pageYOffset||e.scrollTop||d.scrollTop)-f,j=b.left+(g.win.pageXOffset||e.scrollLeft||d.scrollLeft)-h;return{y:i,x:j}};return d.getElementByPoint=function(a,b){var c=this,d=(c.canvas,J.doc.elementFromPoint(a,b));if(J.win.opera&&"svg"==d.tagName){var e=ub(d),f=d.createSVGRect();f.x=a-e.x,f.y=b-e.y,f.width=f.height=1;var g=d.getIntersectionList(f,null);g.length&&(d=g[g.length-1])}return d?z(d):null},d.plugin=function(a){a(d,u,y,J)},J.win.Snap=d,d}();return d.plugin(function(a,b){function c(a){var b=c.ps=c.ps||{};return b[a]?b[a].sleep=100:b[a]={sleep:100},setTimeout(function(){for(var c in b)b[K](c)&&c!=a&&(b[c].sleep--,!b[c].sleep&&delete b[c])}),b[a]}function d(a,b,c,d){return null==a&&(a=b=c=d=0),null==b&&(b=a.y,c=a.width,d=a.height,a=a.x),{x:a,y:b,width:c,w:c,height:d,h:d,x2:a+c,y2:b+d,cx:a+c/2,cy:b+d/2,r1:N.min(c,d)/2,r2:N.max(c,d)/2,r0:N.sqrt(c*c+d*d)/2,path:w(a,b,c,d),vb:[a,b,c,d].join(" ")}}function e(){return this.join(",").replace(L,"$1")}function f(a){var b=J(a);return b.toString=e,b}function g(a,b,c,d,e,f,g,h,j){return null==j?n(a,b,c,d,e,f,g,h):i(a,b,c,d,e,f,g,h,o(a,b,c,d,e,f,g,h,j))}function h(c,d){function e(a){return+(+a).toFixed(3)}return a._.cacher(function(a,f,h){a instanceof b&&(a=a.attr("d")),a=E(a);for(var j,k,l,m,n,o="",p={},q=0,r=0,s=a.length;s>r;r++){if(l=a[r],"M"==l[0])j=+l[1],k=+l[2];else{if(m=g(j,k,l[1],l[2],l[3],l[4],l[5],l[6]),q+m>f){if(d&&!p.start){if(n=g(j,k,l[1],l[2],l[3],l[4],l[5],l[6],f-q),o+=["C"+e(n.start.x),e(n.start.y),e(n.m.x),e(n.m.y),e(n.x),e(n.y)],h)return o;p.start=o,o=["M"+e(n.x),e(n.y)+"C"+e(n.n.x),e(n.n.y),e(n.end.x),e(n.end.y),e(l[5]),e(l[6])].join(),q+=m,j=+l[5],k=+l[6];continue}if(!c&&!d)return n=g(j,k,l[1],l[2],l[3],l[4],l[5],l[6],f-q)}q+=m,j=+l[5],k=+l[6]}o+=l.shift()+l}return p.end=o,n=c?q:d?p:i(j,k,l[0],l[1],l[2],l[3],l[4],l[5],1)},null,a._.clone)}function i(a,b,c,d,e,f,g,h,i){var j=1-i,k=R(j,3),l=R(j,2),m=i*i,n=m*i,o=k*a+3*l*i*c+3*j*i*i*e+n*g,p=k*b+3*l*i*d+3*j*i*i*f+n*h,q=a+2*i*(c-a)+m*(e-2*c+a),r=b+2*i*(d-b)+m*(f-2*d+b),s=c+2*i*(e-c)+m*(g-2*e+c),t=d+2*i*(f-d)+m*(h-2*f+d),u=j*a+i*c,v=j*b+i*d,w=j*e+i*g,x=j*f+i*h,y=90-180*N.atan2(q-s,r-t)/O;return{x:o,y:p,m:{x:q,y:r},n:{x:s,y:t},start:{x:u,y:v},end:{x:w,y:x},alpha:y}}function j(b,c,e,f,g,h,i,j){a.is(b,"array")||(b=[b,c,e,f,g,h,i,j]);var k=D.apply(null,b);return d(k.min.x,k.min.y,k.max.x-k.min.x,k.max.y-k.min.y)}function k(a,b,c){return b>=a.x&&b<=a.x+a.width&&c>=a.y&&c<=a.y+a.height}function l(a,b){return a=d(a),b=d(b),k(b,a.x,a.y)||k(b,a.x2,a.y)||k(b,a.x,a.y2)||k(b,a.x2,a.y2)||k(a,b.x,b.y)||k(a,b.x2,b.y)||k(a,b.x,b.y2)||k(a,b.x2,b.y2)||(a.x<b.x2&&a.x>b.x||b.x<a.x2&&b.x>a.x)&&(a.y<b.y2&&a.y>b.y||b.y<a.y2&&b.y>a.y)}function m(a,b,c,d,e){var f=-3*b+9*c-9*d+3*e,g=a*f+6*b-12*c+6*d;return a*g-3*b+3*c}function n(a,b,c,d,e,f,g,h,i){null==i&&(i=1),i=i>1?1:0>i?0:i;for(var j=i/2,k=12,l=[-.1252,.1252,-.3678,.3678,-.5873,.5873,-.7699,.7699,-.9041,.9041,-.9816,.9816],n=[.2491,.2491,.2335,.2335,.2032,.2032,.1601,.1601,.1069,.1069,.0472,.0472],o=0,p=0;k>p;p++){var q=j*l[p]+j,r=m(q,a,c,e,g),s=m(q,b,d,f,h),t=r*r+s*s;o+=n[p]*N.sqrt(t)}return j*o}function o(a,b,c,d,e,f,g,h,i){if(!(0>i||n(a,b,c,d,e,f,g,h)<i)){var j,k=1,l=k/2,m=k-l,o=.01;for(j=n(a,b,c,d,e,f,g,h,m);S(j-i)>o;)l/=2,m+=(i>j?1:-1)*l,j=n(a,b,c,d,e,f,g,h,m);return m}}function p(a,b,c,d,e,f,g,h){if(!(Q(a,c)<P(e,g)||P(a,c)>Q(e,g)||Q(b,d)<P(f,h)||P(b,d)>Q(f,h))){var i=(a*d-b*c)*(e-g)-(a-c)*(e*h-f*g),j=(a*d-b*c)*(f-h)-(b-d)*(e*h-f*g),k=(a-c)*(f-h)-(b-d)*(e-g);if(k){var l=i/k,m=j/k,n=+l.toFixed(2),o=+m.toFixed(2);if(!(n<+P(a,c).toFixed(2)||n>+Q(a,c).toFixed(2)||n<+P(e,g).toFixed(2)||n>+Q(e,g).toFixed(2)||o<+P(b,d).toFixed(2)||o>+Q(b,d).toFixed(2)||o<+P(f,h).toFixed(2)||o>+Q(f,h).toFixed(2)))return{x:l,y:m}}}}function q(a,b,c){var d=j(a),e=j(b);if(!l(d,e))return c?0:[];for(var f=n.apply(0,a),g=n.apply(0,b),h=~~(f/5),k=~~(g/5),m=[],o=[],q={},r=c?0:[],s=0;h+1>s;s++){var t=i.apply(0,a.concat(s/h));m.push({x:t.x,y:t.y,t:s/h})}for(s=0;k+1>s;s++)t=i.apply(0,b.concat(s/k)),o.push({x:t.x,y:t.y,t:s/k});for(s=0;h>s;s++)for(var u=0;k>u;u++){var v=m[s],w=m[s+1],x=o[u],y=o[u+1],z=S(w.x-v.x)<.001?"y":"x",A=S(y.x-x.x)<.001?"y":"x",B=p(v.x,v.y,w.x,w.y,x.x,x.y,y.x,y.y);if(B){if(q[B.x.toFixed(4)]==B.y.toFixed(4))continue;q[B.x.toFixed(4)]=B.y.toFixed(4);var C=v.t+S((B[z]-v[z])/(w[z]-v[z]))*(w.t-v.t),D=x.t+S((B[A]-x[A])/(y[A]-x[A]))*(y.t-x.t);C>=0&&1>=C&&D>=0&&1>=D&&(c?r++:r.push({x:B.x,y:B.y,t1:C,t2:D}))}}return r}function r(a,b){return t(a,b)}function s(a,b){return t(a,b,1)}function t(a,b,c){a=E(a),b=E(b);for(var d,e,f,g,h,i,j,k,l,m,n=c?0:[],o=0,p=a.length;p>o;o++){var r=a[o];if("M"==r[0])d=h=r[1],e=i=r[2];else{"C"==r[0]?(l=[d,e].concat(r.slice(1)),d=l[6],e=l[7]):(l=[d,e,d,e,h,i,h,i],d=h,e=i);for(var s=0,t=b.length;t>s;s++){var u=b[s];if("M"==u[0])f=j=u[1],g=k=u[2];else{"C"==u[0]?(m=[f,g].concat(u.slice(1)),f=m[6],g=m[7]):(m=[f,g,f,g,j,k,j,k],f=j,g=k);var v=q(l,m,c);if(c)n+=v;else{for(var w=0,x=v.length;x>w;w++)v[w].segment1=o,v[w].segment2=s,v[w].bez1=l,v[w].bez2=m;n=n.concat(v)}}}}}return n}function u(a,b,c){var d=v(a);return k(d,b,c)&&t(a,[["M",b,c],["H",d.x2+10]],1)%2==1}function v(a){var b=c(a);if(b.bbox)return J(b.bbox);if(!a)return d();a=E(a);for(var e,f=0,g=0,h=[],i=[],j=0,k=a.length;k>j;j++)if(e=a[j],"M"==e[0])f=e[1],g=e[2],h.push(f),i.push(g);else{var l=D(f,g,e[1],e[2],e[3],e[4],e[5],e[6]);h=h.concat(l.min.x,l.max.x),i=i.concat(l.min.y,l.max.y),f=e[5],g=e[6]}var m=P.apply(0,h),n=P.apply(0,i),o=Q.apply(0,h),p=Q.apply(0,i),q=d(m,n,o-m,p-n);return b.bbox=J(q),q}function w(a,b,c,d,f){if(f)return[["M",+a+ +f,b],["l",c-2*f,0],["a",f,f,0,0,1,f,f],["l",0,d-2*f],["a",f,f,0,0,1,-f,f],["l",2*f-c,0],["a",f,f,0,0,1,-f,-f],["l",0,2*f-d],["a",f,f,0,0,1,f,-f],["z"]];var g=[["M",a,b],["l",c,0],["l",0,d],["l",-c,0],["z"]];return g.toString=e,g}function x(a,b,c,d,f){if(null==f&&null==d&&(d=c),a=+a,b=+b,c=+c,d=+d,null!=f)var g=Math.PI/180,h=a+c*Math.cos(-d*g),i=a+c*Math.cos(-f*g),j=b+c*Math.sin(-d*g),k=b+c*Math.sin(-f*g),l=[["M",h,j],["A",c,c,0,+(f-d>180),0,i,k]];else l=[["M",a,b],["m",0,-d],["a",c,d,0,1,1,0,2*d],["a",c,d,0,1,1,0,-2*d],["z"]];return l.toString=e,l}function y(b){var d=c(b),g=String.prototype.toLowerCase;if(d.rel)return f(d.rel);a.is(b,"array")&&a.is(b&&b[0],"array")||(b=a.parsePathString(b));var h=[],i=0,j=0,k=0,l=0,m=0;"M"==b[0][0]&&(i=b[0][1],j=b[0][2],k=i,l=j,m++,h.push(["M",i,j]));for(var n=m,o=b.length;o>n;n++){var p=h[n]=[],q=b[n];if(q[0]!=g.call(q[0]))switch(p[0]=g.call(q[0]),p[0]){case"a":p[1]=q[1],p[2]=q[2],p[3]=q[3],p[4]=q[4],p[5]=q[5],p[6]=+(q[6]-i).toFixed(3),p[7]=+(q[7]-j).toFixed(3);break;case"v":p[1]=+(q[1]-j).toFixed(3);break;case"m":k=q[1],l=q[2];default:for(var r=1,s=q.length;s>r;r++)p[r]=+(q[r]-(r%2?i:j)).toFixed(3)}else{p=h[n]=[],"m"==q[0]&&(k=q[1]+i,l=q[2]+j);for(var t=0,u=q.length;u>t;t++)h[n][t]=q[t]}var v=h[n].length;switch(h[n][0]){case"z":i=k,j=l;break;case"h":i+=+h[n][v-1];break;case"v":j+=+h[n][v-1];break;default:i+=+h[n][v-2],j+=+h[n][v-1]}}return h.toString=e,d.rel=f(h),h}function z(b){var d=c(b);if(d.abs)return f(d.abs);if(I(b,"array")&&I(b&&b[0],"array")||(b=a.parsePathString(b)),!b||!b.length)return[["M",0,0]];var g,h=[],i=0,j=0,k=0,l=0,m=0;"M"==b[0][0]&&(i=+b[0][1],j=+b[0][2],k=i,l=j,m++,h[0]=["M",i,j]);for(var n,o,p=3==b.length&&"M"==b[0][0]&&"R"==b[1][0].toUpperCase()&&"Z"==b[2][0].toUpperCase(),q=m,r=b.length;r>q;q++){if(h.push(n=[]),o=b[q],g=o[0],g!=g.toUpperCase())switch(n[0]=g.toUpperCase(),n[0]){case"A":n[1]=o[1],n[2]=o[2],n[3]=o[3],n[4]=o[4],n[5]=o[5],n[6]=+o[6]+i,n[7]=+o[7]+j;break;case"V":n[1]=+o[1]+j;break;case"H":n[1]=+o[1]+i;break;case"R":for(var s=[i,j].concat(o.slice(1)),t=2,u=s.length;u>t;t++)s[t]=+s[t]+i,s[++t]=+s[t]+j;h.pop(),h=h.concat(G(s,p));break;case"O":h.pop(),s=x(i,j,o[1],o[2]),s.push(s[0]),h=h.concat(s);break;case"U":h.pop(),h=h.concat(x(i,j,o[1],o[2],o[3])),n=["U"].concat(h[h.length-1].slice(-2));break;case"M":k=+o[1]+i,l=+o[2]+j;default:for(t=1,u=o.length;u>t;t++)n[t]=+o[t]+(t%2?i:j)}else if("R"==g)s=[i,j].concat(o.slice(1)),h.pop(),h=h.concat(G(s,p)),n=["R"].concat(o.slice(-2));else if("O"==g)h.pop(),s=x(i,j,o[1],o[2]),s.push(s[0]),h=h.concat(s);else if("U"==g)h.pop(),h=h.concat(x(i,j,o[1],o[2],o[3])),n=["U"].concat(h[h.length-1].slice(-2));else for(var v=0,w=o.length;w>v;v++)n[v]=o[v];if(g=g.toUpperCase(),"O"!=g)switch(n[0]){case"Z":i=+k,j=+l;break;case"H":i=n[1];break;case"V":j=n[1];break;case"M":k=n[n.length-2],l=n[n.length-1];default:i=n[n.length-2],j=n[n.length-1]}}return h.toString=e,d.abs=f(h),h}function A(a,b,c,d){return[a,b,c,d,c,d]}function B(a,b,c,d,e,f){var g=1/3,h=2/3;return[g*a+h*c,g*b+h*d,g*e+h*c,g*f+h*d,e,f]}function C(b,c,d,e,f,g,h,i,j,k){var l,m=120*O/180,n=O/180*(+f||0),o=[],p=a._.cacher(function(a,b,c){var d=a*N.cos(c)-b*N.sin(c),e=a*N.sin(c)+b*N.cos(c);return{x:d,y:e}});if(k)y=k[0],z=k[1],w=k[2],x=k[3];else{l=p(b,c,-n),b=l.x,c=l.y,l=p(i,j,-n),i=l.x,j=l.y;var q=(N.cos(O/180*f),N.sin(O/180*f),(b-i)/2),r=(c-j)/2,s=q*q/(d*d)+r*r/(e*e);s>1&&(s=N.sqrt(s),d=s*d,e=s*e);var t=d*d,u=e*e,v=(g==h?-1:1)*N.sqrt(S((t*u-t*r*r-u*q*q)/(t*r*r+u*q*q))),w=v*d*r/e+(b+i)/2,x=v*-e*q/d+(c+j)/2,y=N.asin(((c-x)/e).toFixed(9)),z=N.asin(((j-x)/e).toFixed(9));y=w>b?O-y:y,z=w>i?O-z:z,0>y&&(y=2*O+y),0>z&&(z=2*O+z),h&&y>z&&(y-=2*O),!h&&z>y&&(z-=2*O)}var A=z-y;if(S(A)>m){var B=z,D=i,E=j;z=y+m*(h&&z>y?1:-1),i=w+d*N.cos(z),j=x+e*N.sin(z),o=C(i,j,d,e,f,0,h,D,E,[z,B,w,x])}A=z-y;var F=N.cos(y),G=N.sin(y),H=N.cos(z),I=N.sin(z),J=N.tan(A/4),K=4/3*d*J,L=4/3*e*J,M=[b,c],P=[b+K*G,c-L*F],Q=[i+K*I,j-L*H],R=[i,j];if(P[0]=2*M[0]-P[0],P[1]=2*M[1]-P[1],k)return[P,Q,R].concat(o);o=[P,Q,R].concat(o).join().split(",");for(var T=[],U=0,V=o.length;V>U;U++)T[U]=U%2?p(o[U-1],o[U],n).y:p(o[U],o[U+1],n).x;return T}function D(a,b,c,d,e,f,g,h){for(var i,j,k,l,m,n,o,p,q=[],r=[[],[]],s=0;2>s;++s)if(0==s?(j=6*a-12*c+6*e,i=-3*a+9*c-9*e+3*g,k=3*c-3*a):(j=6*b-12*d+6*f,i=-3*b+9*d-9*f+3*h,k=3*d-3*b),S(i)<1e-12){if(S(j)<1e-12)continue;l=-k/j,l>0&&1>l&&q.push(l)}else o=j*j-4*k*i,p=N.sqrt(o),0>o||(m=(-j+p)/(2*i),m>0&&1>m&&q.push(m),n=(-j-p)/(2*i),n>0&&1>n&&q.push(n));for(var t,u=q.length,v=u;u--;)l=q[u],t=1-l,r[0][u]=t*t*t*a+3*t*t*l*c+3*t*l*l*e+l*l*l*g,r[1][u]=t*t*t*b+3*t*t*l*d+3*t*l*l*f+l*l*l*h;return r[0][v]=a,r[1][v]=b,r[0][v+1]=g,r[1][v+1]=h,r[0].length=r[1].length=v+2,{min:{x:P.apply(0,r[0]),y:P.apply(0,r[1])},max:{x:Q.apply(0,r[0]),y:Q.apply(0,r[1])}}}function E(a,b){var d=!b&&c(a);if(!b&&d.curve)return f(d.curve);for(var e=z(a),g=b&&z(b),h={x:0,y:0,bx:0,by:0,X:0,Y:0,qx:null,qy:null},i={x:0,y:0,bx:0,by:0,X:0,Y:0,qx:null,qy:null},j=(function(a,b,c){var d,e;if(!a)return["C",b.x,b.y,b.x,b.y,b.x,b.y];switch(!(a[0]in{T:1,Q:1})&&(b.qx=b.qy=null),a[0]){case"M":b.X=a[1],b.Y=a[2];break;case"A":a=["C"].concat(C.apply(0,[b.x,b.y].concat(a.slice(1))));break;case"S":"C"==c||"S"==c?(d=2*b.x-b.bx,e=2*b.y-b.by):(d=b.x,e=b.y),a=["C",d,e].concat(a.slice(1));break;case"T":"Q"==c||"T"==c?(b.qx=2*b.x-b.qx,b.qy=2*b.y-b.qy):(b.qx=b.x,b.qy=b.y),a=["C"].concat(B(b.x,b.y,b.qx,b.qy,a[1],a[2]));break;case"Q":b.qx=a[1],b.qy=a[2],a=["C"].concat(B(b.x,b.y,a[1],a[2],a[3],a[4]));break;case"L":a=["C"].concat(A(b.x,b.y,a[1],a[2]));break;case"H":a=["C"].concat(A(b.x,b.y,a[1],b.y));break;case"V":a=["C"].concat(A(b.x,b.y,b.x,a[1]));break;case"Z":a=["C"].concat(A(b.x,b.y,b.X,b.Y))}return a}),k=function(a,b){if(a[b].length>7){a[b].shift();for(var c=a[b];c.length;)m[b]="A",g&&(n[b]="A"),a.splice(b++,0,["C"].concat(c.splice(0,6)));a.splice(b,1),r=Q(e.length,g&&g.length||0)}},l=function(a,b,c,d,f){a&&b&&"M"==a[f][0]&&"M"!=b[f][0]&&(b.splice(f,0,["M",d.x,d.y]),c.bx=0,c.by=0,c.x=a[f][1],c.y=a[f][2],r=Q(e.length,g&&g.length||0))},m=[],n=[],o="",p="",q=0,r=Q(e.length,g&&g.length||0);r>q;q++){e[q]&&(o=e[q][0]),"C"!=o&&(m[q]=o,q&&(p=m[q-1])),e[q]=j(e[q],h,p),"A"!=m[q]&&"C"==o&&(m[q]="C"),k(e,q),g&&(g[q]&&(o=g[q][0]),"C"!=o&&(n[q]=o,q&&(p=n[q-1])),g[q]=j(g[q],i,p),"A"!=n[q]&&"C"==o&&(n[q]="C"),k(g,q)),l(e,g,h,i,q),l(g,e,i,h,q);var s=e[q],t=g&&g[q],u=s.length,v=g&&t.length;h.x=s[u-2],h.y=s[u-1],h.bx=M(s[u-4])||h.x,h.by=M(s[u-3])||h.y,i.bx=g&&(M(t[v-4])||i.x),i.by=g&&(M(t[v-3])||i.y),i.x=g&&t[v-2],i.y=g&&t[v-1]}return g||(d.curve=f(e)),g?[e,g]:e}function F(a,b){if(!b)return a;var c,d,e,f,g,h,i;for(a=E(a),e=0,g=a.length;g>e;e++)for(i=a[e],f=1,h=i.length;h>f;f+=2)c=b.x(i[f],i[f+1]),d=b.y(i[f],i[f+1]),i[f]=c,i[f+1]=d;return a}function G(a,b){for(var c=[],d=0,e=a.length;e-2*!b>d;d+=2){var f=[{x:+a[d-2],y:+a[d-1]},{x:+a[d],y:+a[d+1]},{x:+a[d+2],y:+a[d+3]},{x:+a[d+4],y:+a[d+5]}];b?d?e-4==d?f[3]={x:+a[0],y:+a[1]}:e-2==d&&(f[2]={x:+a[0],y:+a[1]},f[3]={x:+a[2],y:+a[3]}):f[0]={x:+a[e-2],y:+a[e-1]}:e-4==d?f[3]=f[2]:d||(f[0]={x:+a[d],y:+a[d+1]}),c.push(["C",(-f[0].x+6*f[1].x+f[2].x)/6,(-f[0].y+6*f[1].y+f[2].y)/6,(f[1].x+6*f[2].x-f[3].x)/6,(f[1].y+6*f[2].y-f[3].y)/6,f[2].x,f[2].y])}return c}var H=b.prototype,I=a.is,J=a._.clone,K="hasOwnProperty",L=/,?([a-z]),?/gi,M=parseFloat,N=Math,O=N.PI,P=N.min,Q=N.max,R=N.pow,S=N.abs,T=h(1),U=h(),V=h(0,1),W=a._unit2px,X={path:function(a){return a.attr("path")},circle:function(a){var b=W(a);return x(b.cx,b.cy,b.r)},ellipse:function(a){var b=W(a);return x(b.cx||0,b.cy||0,b.rx,b.ry)},rect:function(a){var b=W(a);return w(b.x||0,b.y||0,b.width,b.height,b.rx,b.ry)},image:function(a){var b=W(a);return w(b.x||0,b.y||0,b.width,b.height)},text:function(a){var b=a.node.getBBox();return w(b.x,b.y,b.width,b.height)},g:function(a){var b=a.node.getBBox();return w(b.x,b.y,b.width,b.height)},symbol:function(a){var b=a.getBBox();return w(b.x,b.y,b.width,b.height)},line:function(a){return"M"+[a.attr("x1")||0,a.attr("y1")||0,a.attr("x2"),a.attr("y2")]},polyline:function(a){return"M"+a.attr("points")},polygon:function(a){return"M"+a.attr("points")+"z"},svg:function(a){var b=a.node.getBBox();return w(b.x,b.y,b.width,b.height)},deflt:function(a){var b=a.node.getBBox();return w(b.x,b.y,b.width,b.height)}};a.path=c,a.path.getTotalLength=T,a.path.getPointAtLength=U,a.path.getSubpath=function(a,b,c){if(this.getTotalLength(a)-c<1e-6)return V(a,b).end;var d=V(a,c,1);return b?V(d,b).end:d},H.getTotalLength=function(){return this.node.getTotalLength?this.node.getTotalLength():void 0},H.getPointAtLength=function(a){return U(this.attr("d"),a)},H.getSubpath=function(b,c){return a.path.getSubpath(this.attr("d"),b,c)},a._.box=d,a.path.findDotsAtSegment=i,a.path.bezierBBox=j,a.path.isPointInsideBBox=k,a.path.isBBoxIntersect=l,a.path.intersection=r,a.path.intersectionNumber=s,a.path.isPointInside=u,a.path.getBBox=v,a.path.get=X,a.path.toRelative=y,a.path.toAbsolute=z,a.path.toCubic=E,a.path.map=F,a.path.toString=e,a.path.clone=f}),d.plugin(function(a){var b=Math.max,c=Math.min,d=function(a){if(this.items=[],this.length=0,this.type="set",a)for(var b=0,c=a.length;c>b;b++)a[b]&&(this[this.items.length]=this.items[this.items.length]=a[b],this.length++)},e=d.prototype;e.push=function(){for(var a,b,c=0,d=arguments.length;d>c;c++)a=arguments[c],a&&(b=this.items.length,this[b]=this.items[b]=a,this.length++);return this},e.pop=function(){return this.length&&delete this[this.length--],this.items.pop()},e.forEach=function(a,b){for(var c=0,d=this.items.length;d>c;c++)if(a.call(b,this.items[c],c)===!1)return this;return this},e.remove=function(){for(;this.length;)this.pop().remove();return this},e.attr=function(a){for(var b=0,c=this.items.length;c>b;b++)this.items[b].attr(a);return this},e.clear=function(){for(;this.length;)this.pop()},e.splice=function(a,e){a=0>a?b(this.length+a,0):a,e=b(0,c(this.length-a,e));var f,g=[],h=[],i=[];for(f=2;f<arguments.length;f++)i.push(arguments[f]);for(f=0;e>f;f++)h.push(this[a+f]);for(;f<this.length-a;f++)g.push(this[a+f]);var j=i.length;for(f=0;f<j+g.length;f++)this.items[a+f]=this[a+f]=j>f?i[f]:g[f-j];for(f=this.items.length=this.length-=e-j;this[f];)delete this[f++];return new d(h)},e.exclude=function(a){for(var b=0,c=this.length;c>b;b++)if(this[b]==a)return this.splice(b,1),!0;return!1},e.insertAfter=function(a){for(var b=this.items.length;b--;)this.items[b].insertAfter(a);return this},e.getBBox=function(){for(var a=[],d=[],e=[],f=[],g=this.items.length;g--;)if(!this.items[g].removed){var h=this.items[g].getBBox();a.push(h.x),d.push(h.y),e.push(h.x+h.width),f.push(h.y+h.height)}return a=c.apply(0,a),d=c.apply(0,d),e=b.apply(0,e),f=b.apply(0,f),{x:a,y:d,x2:e,y2:f,width:e-a,height:f-d,cx:a+(e-a)/2,cy:d+(f-d)/2}},e.clone=function(a){a=new d;for(var b=0,c=this.items.length;c>b;b++)a.push(this.items[b].clone());return a},e.toString=function(){return"Snap‘s set"},e.type="set",a.set=function(){var a=new d;return arguments.length&&a.push.apply(a,Array.prototype.slice.call(arguments,0)),a}}),d.plugin(function(a,b){function c(a){var b=a[0];switch(b.toLowerCase()){case"t":return[b,0,0];case"m":return[b,1,0,0,1,0,0];case"r":return 4==a.length?[b,0,a[2],a[3]]:[b,0];case"s":return 5==a.length?[b,1,1,a[3],a[4]]:3==a.length?[b,1,1]:[b,1]}}function d(b,d,e){d=l(d).replace(/\.{3}|\u2026/g,b),b=a.parseTransformString(b)||[],d=a.parseTransformString(d)||[];for(var f,g,j,k,m=Math.max(b.length,d.length),n=[],o=[],p=0;m>p;p++){if(j=b[p]||c(d[p]),k=d[p]||c(j),j[0]!=k[0]||"r"==j[0].toLowerCase()&&(j[2]!=k[2]||j[3]!=k[3])||"s"==j[0].toLowerCase()&&(j[3]!=k[3]||j[4]!=k[4])){b=a._.transform2matrix(b,e()),d=a._.transform2matrix(d,e()),n=[["m",b.a,b.b,b.c,b.d,b.e,b.f]],o=[["m",d.a,d.b,d.c,d.d,d.e,d.f]];break}for(n[p]=[],o[p]=[],f=0,g=Math.max(j.length,k.length);g>f;f++)f in j&&(n[p][f]=j[f]),f in k&&(o[p][f]=k[f])}return{from:i(n),to:i(o),f:h(n)}}function e(a){return a}function f(a){return function(b){return+b.toFixed(3)+a}}function g(b){return a.rgb(b[0],b[1],b[2])}function h(a){var b,c,d,e,f,g,h=0,i=[];for(b=0,c=a.length;c>b;b++){for(f="[",g=['"'+a[b][0]+'"'],d=1,e=a[b].length;e>d;d++)g[d]="val["+h++ +"]";f+=g+"]",i[b]=f}return Function("val","return Snap.path.toString.call(["+i+"])")}function i(a){for(var b=[],c=0,d=a.length;d>c;c++)for(var e=1,f=a[c].length;f>e;e++)b.push(a[c][e]);return b}var j={},k=/[a-z]+$/i,l=String;j.stroke=j.fill="colour",b.prototype.equal=function(b,c){var m,n,o=l(this.attr(b)||""),p=this;if(o==+o&&c==+c)return{from:+o,to:+c,f:e};if("colour"==j[b])return m=a.color(o),n=a.color(c),{from:[m.r,m.g,m.b,m.opacity],to:[n.r,n.g,n.b,n.opacity],f:g};if("transform"==b||"gradientTransform"==b||"patternTransform"==b)return c instanceof a.Matrix&&(c=c.toTransformString()),a._.rgTransform.test(c)||(c=a._.svgTransform2string(c)),d(o,c,function(){return p.getBBox(1)});if("d"==b||"path"==b)return m=a.path.toCubic(o,c),{from:i(m[0]),to:i(m[1]),f:h(m[0])};if("points"==b)return m=l(o).split(","),n=l(c).split(","),{from:m,to:n,f:function(a){return a}};var q=o.match(k),r=l(c).match(k);return q&&q==r?{from:parseFloat(o),to:parseFloat(c),f:f(q)}:{from:this.asPX(b),to:this.asPX(b,c),f:e}}}),d.plugin(function(a,c,d,e){for(var f=c.prototype,g="hasOwnProperty",h=("createTouch"in e.doc),i=["click","dblclick","mousedown","mousemove","mouseout","mouseover","mouseup","touchstart","touchmove","touchend","touchcancel"],j={mousedown:"touchstart",mousemove:"touchmove",mouseup:"touchend"},k=function(a){var b="y"==a?"scrollTop":"scrollLeft";return e.doc.documentElement[b]||e.doc.body[b]},l=function(){this.returnValue=!1},m=function(){return this.originalEvent.preventDefault()},n=function(){this.cancelBubble=!0},o=function(){return this.originalEvent.stopPropagation()},p=function(){return e.doc.addEventListener?function(a,b,c,d){var e=h&&j[b]?j[b]:b,f=function(e){var f=k("y"),i=k("x");if(h&&j[g](b))for(var l=0,n=e.targetTouches&&e.targetTouches.length;n>l;l++)if(e.targetTouches[l].target==a||a.contains(e.targetTouches[l].target)){var p=e;e=e.targetTouches[l],e.originalEvent=p,e.preventDefault=m,e.stopPropagation=o;break}var q=e.clientX+i,r=e.clientY+f;return c.call(d,e,q,r)};return b!==e&&a.addEventListener(b,f,!1),a.addEventListener(e,f,!1),function(){return b!==e&&a.removeEventListener(b,f,!1),a.removeEventListener(e,f,!1),!0}}:e.doc.attachEvent?function(a,b,c,d){var f=function(a){a=a||e.win.event;var b=k("y"),f=k("x"),g=a.clientX+f,h=a.clientY+b;return a.preventDefault=a.preventDefault||l,a.stopPropagation=a.stopPropagation||n,c.call(d,a,g,h)};a.attachEvent("on"+b,f);var g=function(){return a.detachEvent("on"+b,f),!0};return g}:void 0}(),q=[],r=function(c){for(var d,e=c.clientX,f=c.clientY,g=k("y"),i=k("x"),j=q.length;j--;){if(d=q[j],h){for(var l,m=c.touches&&c.touches.length;m--;)if(l=c.touches[m],l.identifier==d.el._drag.id||d.el.node.contains(l.target)){e=l.clientX,f=l.clientY,(c.originalEvent?c.originalEvent:c).preventDefault();break}}else c.preventDefault();{var n=d.el.node;a._.glob,n.nextSibling,n.parentNode,n.style.display}e+=i,f+=g,b("snap.drag.move."+d.el.id,d.move_scope||d.el,e-d.el._drag.x,f-d.el._drag.y,e,f,c)}},s=function(c){a.unmousemove(r).unmouseup(s);for(var d,e=q.length;e--;)d=q[e],d.el._drag={},b("snap.drag.end."+d.el.id,d.end_scope||d.start_scope||d.move_scope||d.el,c);q=[]},t=i.length;t--;)!function(b){a[b]=f[b]=function(c,d){return a.is(c,"function")&&(this.events=this.events||[],this.events.push({name:b,f:c,unbind:p(this.shape||this.node||e.doc,b,c,d||this)})),this},a["un"+b]=f["un"+b]=function(a){for(var c=this.events||[],d=c.length;d--;)if(c[d].name==b&&(c[d].f==a||!a))return c[d].unbind(),c.splice(d,1),!c.length&&delete this.events,this;return this}}(i[t]);f.hover=function(a,b,c,d){return this.mouseover(a,c).mouseout(b,d||c)},f.unhover=function(a,b){return this.unmouseover(a).unmouseout(b)};var u=[];f.drag=function(c,d,e,f,g,h){function i(i,j,k){(i.originalEvent||i).preventDefault(),this._drag.x=j,this._drag.y=k,this._drag.id=i.identifier,!q.length&&a.mousemove(r).mouseup(s),q.push({el:this,move_scope:f,start_scope:g,end_scope:h}),d&&b.on("snap.drag.start."+this.id,d),c&&b.on("snap.drag.move."+this.id,c),e&&b.on("snap.drag.end."+this.id,e),b("snap.drag.start."+this.id,g||f||this,j,k,i)}if(!arguments.length){var j;return this.drag(function(a,b){this.attr({transform:j+(j?"T":"t")+[a,b]})
},function(){j=this.transform().local})}return this._drag={},u.push({el:this,start:i}),this.mousedown(i),this},f.undrag=function(){for(var c=u.length;c--;)u[c].el==this&&(this.unmousedown(u[c].start),u.splice(c,1),b.unbind("snap.drag.*."+this.id));return!u.length&&a.unmousemove(r).unmouseup(s),this}}),d.plugin(function(a,c,d){var e=(c.prototype,d.prototype),f=/^\s*url\((.+)\)/,g=String,h=a._.$;a.filter={},e.filter=function(b){var d=this;"svg"!=d.type&&(d=d.paper);var e=a.parse(g(b)),f=a._.id(),i=(d.node.offsetWidth,d.node.offsetHeight,h("filter"));return h(i,{id:f,filterUnits:"userSpaceOnUse"}),i.appendChild(e.node),d.defs.appendChild(i),new c(i)},b.on("snap.util.getattr.filter",function(){b.stop();var c=h(this.node,"filter");if(c){var d=g(c).match(f);return d&&a.select(d[1])}}),b.on("snap.util.attr.filter",function(d){if(d instanceof c&&"filter"==d.type){b.stop();var e=d.node.id;e||(h(d.node,{id:d.id}),e=d.id),h(this.node,{filter:a.url(e)})}d&&"none"!=d||(b.stop(),this.node.removeAttribute("filter"))}),a.filter.blur=function(b,c){null==b&&(b=2);var d=null==c?b:[b,c];return a.format('<feGaussianBlur stdDeviation="{def}"/>',{def:d})},a.filter.blur.toString=function(){return this()},a.filter.shadow=function(b,c,d,e,f){return"string"==typeof d&&(e=d,f=e,d=4),"string"!=typeof e&&(f=e,e="#000"),e=e||"#000",null==d&&(d=4),null==f&&(f=1),null==b&&(b=0,c=2),null==c&&(c=b),e=a.color(e),a.format('<feGaussianBlur in="SourceAlpha" stdDeviation="{blur}"/><feOffset dx="{dx}" dy="{dy}" result="offsetblur"/><feFlood flood-color="{color}"/><feComposite in2="offsetblur" operator="in"/><feComponentTransfer><feFuncA type="linear" slope="{opacity}"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>',{color:e,dx:b,dy:c,blur:d,opacity:f})},a.filter.shadow.toString=function(){return this()},a.filter.grayscale=function(b){return null==b&&(b=1),a.format('<feColorMatrix type="matrix" values="{a} {b} {c} 0 0 {d} {e} {f} 0 0 {g} {b} {h} 0 0 0 0 0 1 0"/>',{a:.2126+.7874*(1-b),b:.7152-.7152*(1-b),c:.0722-.0722*(1-b),d:.2126-.2126*(1-b),e:.7152+.2848*(1-b),f:.0722-.0722*(1-b),g:.2126-.2126*(1-b),h:.0722+.9278*(1-b)})},a.filter.grayscale.toString=function(){return this()},a.filter.sepia=function(b){return null==b&&(b=1),a.format('<feColorMatrix type="matrix" values="{a} {b} {c} 0 0 {d} {e} {f} 0 0 {g} {h} {i} 0 0 0 0 0 1 0"/>',{a:.393+.607*(1-b),b:.769-.769*(1-b),c:.189-.189*(1-b),d:.349-.349*(1-b),e:.686+.314*(1-b),f:.168-.168*(1-b),g:.272-.272*(1-b),h:.534-.534*(1-b),i:.131+.869*(1-b)})},a.filter.sepia.toString=function(){return this()},a.filter.saturate=function(b){return null==b&&(b=1),a.format('<feColorMatrix type="saturate" values="{amount}"/>',{amount:1-b})},a.filter.saturate.toString=function(){return this()},a.filter.hueRotate=function(b){return b=b||0,a.format('<feColorMatrix type="hueRotate" values="{angle}"/>',{angle:b})},a.filter.hueRotate.toString=function(){return this()},a.filter.invert=function(b){return null==b&&(b=1),a.format('<feComponentTransfer><feFuncR type="table" tableValues="{amount} {amount2}"/><feFuncG type="table" tableValues="{amount} {amount2}"/><feFuncB type="table" tableValues="{amount} {amount2}"/></feComponentTransfer>',{amount:b,amount2:1-b})},a.filter.invert.toString=function(){return this()},a.filter.brightness=function(b){return null==b&&(b=1),a.format('<feComponentTransfer><feFuncR type="linear" slope="{amount}"/><feFuncG type="linear" slope="{amount}"/><feFuncB type="linear" slope="{amount}"/></feComponentTransfer>',{amount:b})},a.filter.brightness.toString=function(){return this()},a.filter.contrast=function(b){return null==b&&(b=1),a.format('<feComponentTransfer><feFuncR type="linear" slope="{amount}" intercept="{amount2}"/><feFuncG type="linear" slope="{amount}" intercept="{amount2}"/><feFuncB type="linear" slope="{amount}" intercept="{amount2}"/></feComponentTransfer>',{amount:b,amount2:.5-b/2})},a.filter.contrast.toString=function(){return this()}}),d});(function (global, factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        global.sd = factory();
    }
}(typeof window !== "undefined" ? window : this, function () {
/**
 * almond 0.2.7 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("vendor/almond", function(){});

// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define('common',[], function() {
    

    var common = {};

    // used similarly to libc's errno.  On a major error store a
    // string here (one of the sd.ERR_* ones defined directly below)
    common.err = null;

    common.errors = {
        ERR_VERSION: "bad xml or unknown smile version",
        ERR_BAD_TIME: "bad time (control) data",
    };

    // whether identifiers are a builtin.  Implementation is in
    // Builtin module in runtime_src.js
    common.builtins = {
        'max': {},
        'min': {},
        'pulse': {
            usesTime: true,
        },
    };

    common.reserved = {
        'if': true,
        'then': true,
        'else': true,
    };

    return common;
});

// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define('util',[], function() {
    

    var util = {};

    util.titleCase = function titleCase(str) {
        return str.replace(/(?:^|\s)\w/g, function(match) {
            return match.toUpperCase();
        });
    };

    /// dName converts a string into the format the user expects to
    /// see on a diagram.
    util.dName = function dName(s) {
        return s.replace(/\\n/g, '\n').replace(/_/g, ' ');
    };

    /// eName converts a string into the format used internally in
    /// the engine and drawing code with underscores.
    util.eName = function eName(s) {
        if (typeof s !== 'string')
            return '';
        return s.replace(/\\n/g, '_').replace(/\s/g, '_').toLowerCase();
    };

    /**
       Extracts the <simspecs> information into nice, usable, validated
       object.

       @param simspecs DOM node
       @return A validated specs object on success, null on failure
    */
    util.normalizeTimespec = function normalizeTimespec(specs) {
        if (!specs)
            return;
        if (!specs.savestep)
            specs.savestep = specs.dt;
        if (!specs['@method'])
            specs['@method'] = 'euler';
    };

    /**
       Turns the array of arguments into a hashset.  Bascially an object
       like:

       {arg1: true, arg2: true, ...}
    */
    util.set = function set() {
        var result = {};
        var i;
        for (i = 0; i < arguments.length; ++i)
            result[arguments[i]] = true;
        return result;
    };

    // swap the values at 2 indexes in the specified array, used for
    // quicksort.
    var swap = function swap(array, a, b) {
        var tmp = array[a];
        array[a] = array[b];
        array[b] = tmp;
    };

    // partition used in quicksort, based off pseudocode on wikipedia
    var partition = function partition(array, l, r, p) {
        var pValue = array[p];
        // move the pivot to the end
        swap(array, p, r);
        var i, store = l;
        for (i = l; i < r; ++i) {
            if (array[i].lessThan(pValue)) {
                swap(array, i, store);
                store += 1;
            }
        }
        // move pivot to final location.
        swap(array, store, r);
        return store;
    };

    // partition used in quicksort for numbers, based off pseudocode
    // on wikipedia
    util.partitionNum = function partitionNum(array, l, r, p) {
        var pValue = array[p];
        // move the pivot to the end
        swap(array, p, r);
        var i, store = l;
        for (i = l; i < r; ++i) {
            if (array[i] < pValue) {
                swap(array, i, store);
                store += 1;
            }
        }
        // move pivot to final location.
        swap(array, store, r);
        return store;
    };

    /**
       Quicksort implementation, sorts in place.
    */
    util.sort = function sort(array, l, r, part) {
        if (l === undefined) {
            l = 0;
            r = array.length - 1;
        }
        if (!part) {
            part = partition;
        }

        if (l >= r)
            return;

        var pivot = Math.floor(l + (r - l)/2);
        var newPivot = part(array, l, r, pivot);
        sort(array, l, newPivot - 1, part);
        sort(array, newPivot + 1, r, part);
    };

    /**
       Interpolates the y-value of the given index in the table.  If
       the index is outside the range of the table, the minimum or
       maximum value in the table is returned.

       @param table An object with x and y arrays.
       @param index The requested index into the given table.
       @return The y-value of the given index.
    */
    util.lookup = function lookup(table, index) {
        var size = table.x.length;
        if (size === 0)
            return NaN;

        var x = table.x;
        var y = table.y;

        if (index <= x[0])
            return y[0];
        else if (index >= x[size - 1])
            return y[size - 1];

        // binary search seems to be the most appropriate choice here.
        var low = 0;
        var high = size;
        var mid;
        while (low < high) {
            mid = Math.floor(low + (high - low)/2);
            if (x[mid] < index) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        var i = low;
        if (x[i] === index) {
            return y[i];
        } else {
            // slope = deltaY/deltaX
            var slope = (y[i] - y[i-1]) / (x[i] - x[i-1]);
            // y = m*x + b
            return (index - x[i-1])*slope + y[i-1];
        }
    };

    /**
       Returns the minimum of either of the arguments
    */
    util.min = function min(a, b) {
        return a < b ? a : b;
    };

    /**
       numArr returns a new array, composed of the result of calling
       parseFloat on every item in arr.
    */
    util.numArr = function numArr(arr) {
        var result = [];
        var i;
        for (i = 0; i < arr.length; i++) {
            result.push(parseFloat(arr[i]));
        }
        return result;
    };

    util.floatAttr = function floatAttr(o, n) {
        return parseFloat(o.getAttribute(n));
    };

    // wrapper/re-implementation of querySelector that works under
    // Node with xmldom.
    util.qs = function qs(e, s) {
        if (e.querySelector)
            return e.querySelector(s);

        var selectors = s.split('>');
        var curr = e;
        var i, j, n;

        outer:
        for (i = 0; curr && i < selectors.length; i++) {
            for (j = 0; j < curr.childNodes.length; j++) {
                n = curr.childNodes[j];
                if (!n.tagName)
                    continue;
                if (n.tagName.toLowerCase() === selectors[i].toLowerCase()) {
                    curr = n;
                    continue outer;
                }
            }
            curr = null;
        }
        return curr;
    };

    function querySelectorInner(e, selectors) {
        var sel = selectors[0];
        var rest = selectors.slice(1);
        var result = [];
        var child;
        var i;
        for (i in e.childNodes) {
            child = e.childNodes[i];
            if (child.tagName && child.tagName.toLowerCase() === sel) {
                if (rest.length)
                    result = result.concat(querySelectorInner(child, rest));
                else
                    result.push(child);
            }
        }
        return result;
    }

    // wrapper/re-implementation of querySelectorAll that works under
    // Node with xmldom
    util.qsa = function qsa(e, s) {
        if (e.querySelectorAll)
            return e.querySelectorAll(s);
        var selectors = s.split('>').map(function(sel) {
            return sel.toLowerCase();
        });

        return querySelectorInner(e, selectors);
    };

    util.isNaN = function isNaN(n) {
        return n !== n;
    };

    return util;
});

// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define('lex',['./common', './util'], function(common, util) {
    

    var lex = {};

    // constants, sort of...
    lex.TOKEN = 'token';
    lex.IDENT = 'word';
    lex.RESERVED = 'reserved';
    lex.NUMBER = 'number';

    // the idea is to use the scanner (& an eventual parser) to validate
    // the equations, especially for the macros

    // these are words reserved by SMILE
    var reservedWords = util.set('if', 'then', 'else');

    var isWhitespace = function isWhitespace(ch) {
        return (/\s/).test(ch);
    };
    var isNumberStart = function isNumberStart(ch) {
        return (/[\d\.]/).test(ch);
    };
    var isIdentifierStart = function isIdentifierStart(ch) {
        return (/[\w_]/).test(ch);
    };

    function Token(str, type, startLoc, endLoc) {
        this.tok = str;
        this.type = type;
        this.startLoc = startLoc;
        this.endLoc = endLoc;
    }

    function SourceLoc(line, pos) {
        this.line = line;
        this.pos = pos;
    }

    function Scanner(text) {
        this.textOrig = text;
        this.text = text.toLowerCase();
        this._len = text.length;
        this._pos = 0;
        this._peek = this.text[0];
        this._line = 0;
        this._lineStart = 0;
    }

    Scanner.prototype._getChar = function() {
        if (this._pos < this._len - 1) {
            this._pos += 1;
            this._peek = this.text[this._pos];
        } else {
            this._peek = null;
        }

        return this._peek;
    };
    Scanner.prototype._skipWhitespace = function() {
        do {
            if (this._peek === '\n') {
                this._line += 1;
                this._lineStart = this._pos + 1;
            }
            if (!isWhitespace(this._peek))
                break;
        } while (this._getChar() !== null);
    };
    Scanner.prototype._fastForward = function(num) {
        this._pos += num;
        if (this._pos < this._len) {
            this._peek = this.text[this._pos];
        } else {
            this._peek = null;
        }
    };
    Scanner.prototype._lexIdentifier = function(startPos) {
        var ident = /[\w_][\w\d_]*/.exec(this.text.substring(this._pos))[0];
        var len = ident.length;
        this._fastForward(len);
        var type;
        if (ident in reservedWords)
            type = lex.RESERVED;
        else
            type = lex.IDENT;
        return new Token(ident, type, startPos,
                         new SourceLoc(startPos.line, startPos.pos + len));
    };
    Scanner.prototype._lexNumber = function(startPos) {
        // we do a .toLowerCase before the string gets to here, so we
        // don't need to match for lower and upper cased 'e's.
        var numStr = /\d*(\.\d*)?(e(\d+(\.\d*)?)?)?/.exec(this.text.substring(this._pos))[0];
        var len = numStr.length;
        var num = parseFloat(numStr);
        this._fastForward(len);
        return new Token(num, lex.NUMBER, startPos,
                         new SourceLoc(startPos.line, startPos.pos + len));
    };
    Scanner.prototype.getToken = function() {
        this._skipWhitespace();
        var peek = this._peek;

        // at the end of the input, peek is null.
        if (peek === null || peek === undefined)
            return null;

        // keep track of the start of the token, relative to the start of
        // the current line.
        var start = this._pos - this._lineStart;
        var startLoc = new SourceLoc(this._line, start);

        // match two-char tokens; if its not a 2 char token return the
        // single char tok.
        switch (peek) {
        case '=':
            this._getChar();
            if (this._peek === '=') {
                // eat the second '=', since we matched.
                this.getChar();
                return new Token('==', lex.TOKEN, startLoc,
                                 new SourceLoc(this._line, start + 2));
            } else {
                return new Token('=', lex.TOKEN, startLoc,
                                 new SourceLoc(this._line, start + 1));
            }
            break;
        default:
            break;
        }

        if (isNumberStart(peek))
            return this._lexNumber(startLoc);

        if (isIdentifierStart(peek))
            return this._lexIdentifier(startLoc);

        // if we haven't matched by here, it must be a simple one char
        // token.  Eat that char and return the new token object.
        this._getChar();

        return new Token(peek, lex.TOKEN, startLoc,
                         new SourceLoc(this._line, start + 1));
    };
    lex.Scanner = Scanner;


    /**
       For a given equation string, returns a set of the identifiers
       found.  Identifiers exclude keywords (such as 'if' and 'then')
       as well as builtin functions ('pulse', 'max', etc).

       @param str An equation string, to be parsed by our lexer.
       @return A set of all identifiers.
    */
    lex.identifierSet = function identifierSet(str) {
        var scanner = new lex.Scanner(str);
        var result = {};
        var commentDepth = 0;
        var tok;
        while ((tok = scanner.getToken())) {
            if (tok.tok === '{') {
                commentDepth++;
            } else if (tok.tok === '}') {
                commentDepth--;
            } else if (commentDepth > 0) {
                // if inside of a {} delimited comment, skip the token
                continue;
            } else if (tok.type === lex.IDENT && !(tok.tok in common.builtins)) {
                result[tok.tok] = true;
            }
        }
        return result;
    };

    return lex;
});

// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define('vars',['./util', './common', './lex'], function(util, common, lex) {
    

    var Variable = function Variable(model, xmile) {
        // for subclasses, when instantiated for their prototypes
        if (arguments.length === 0)
            return;

        this.model = model;
        this.xmile = xmile;
        var eqn = xmile.eqn.toString().toLowerCase();
        this.eqn = eqn;
        this.name = util.eName(xmile['@name']);

        // for a flow or aux, we depend on variables that aren't built
        // in functions in the equation.
        this._deps = lex.identifierSet(eqn);
    };
    // returns a string of this variables initial equation. suitable for
    // exec()'ing
    Variable.prototype.initialEquation = function() {
        return this.eqn;
    };
    Variable.prototype.code = function(v) {
        if (this.isConst())
            return "this.initials['" + util.eName(this.name) + "']";
        var scanner = new lex.Scanner(this.eqn);
        var result = [];
        var commentDepth = 0;
        var scope;
        var tok;
        while ((tok = scanner.getToken())) {
            if (tok.tok === '{') {
                commentDepth++;
            } else if (tok.tok === '}') {
                commentDepth--;
            } else if (commentDepth > 0) {
                // if inside of a {} delimited comment, skip the token
                continue;
            } else if (tok.tok in common.reserved) {
                switch (tok.tok) {
                case 'if':
                    break; // skip
                case 'then':
                    result.push('?');
                    break;
                case 'else':
                    result.push(':');
                    break;
                }
            } else if (tok.type !== lex.IDENT) {
                result.push(tok.tok);
            } else if (tok.tok in common.builtins) {
                result.push(tok.tok);
                if (common.builtins[tok.tok].usesTime) {
                    scanner.getToken(); // is '('
                    scope = this.model.name === 'main' ? 'curr' : 'globalCurr';
                    result.push('(', 'dt', ',', scope + '[0]', ',');
                }
            } else if (tok.tok in v){
                result.push("curr[" + v[tok.tok] + "]");
            } else {
                result.push('globalCurr[this.ref["' + tok.tok + '"]]');
            }
        }
        if (!result.length) {
            //console.log('COMPAT empty equation for ' + this.name);
            result.push('0');
        }
        return result.join(' ');
    };
    Variable.prototype.getDeps = function() {
        if (this._allDeps)
            return this._allDeps;
        var allDeps = {};
        var v, n, nn, otherDeps;
        for (n in this._deps) {
            if (n in allDeps)
                continue;
            allDeps[n] = true;
            v = this.model.vars[n];
            if (!v)
                continue;
            otherDeps = v.getDeps();
            for (nn in otherDeps)
                allDeps[nn] = true;
        }
        this._allDeps = allDeps;
        return allDeps;
    };
    Variable.prototype.lessThan = function(that) {
        return this.name in that.getDeps();
    };
    Variable.prototype.isConst = function() {
        return isFinite(this.eqn);
    };


    var Stock = function Stock(model, xmile) {
        this.model = model;
        this.xmile = xmile;
        var eqn = xmile.eqn.toString().toLowerCase();
        this.name = util.eName(xmile['@name']);
        this.initial = eqn;
        this.eqn = eqn;
        if (!xmile.inflow)
            xmile.inflow = [];
        if (!(xmile.inflow instanceof Array))
            xmile.inflow = [xmile.inflow];
        if (!xmile.outflow)
            xmile.outflow = [];
        if (!(xmile.outflow instanceof Array))
            xmile.outflow = [xmile.outflow];
        this.inflows = xmile.inflow.map(function(s) {
            return util.eName(s);
        });
        this.outflows = xmile.outflow.map(function(s) {
            return util.eName(s);
        });

        // for a stock, the dependencies are any identifiers (that
        // aren't references to builtin functions) in the initial
        // variable string.  Deps are used for sorting equations into
        // the right order, so for now we don't add any of the flows.
        this._deps = lex.identifierSet(eqn);
    };
    Stock.prototype = new Variable();
    // returns a string of this variables initial equation. suitable for
    // exec()'ing
    Stock.prototype.initialEquation = function() {
        return this.initial;
    };
    Stock.prototype.code = function(v) {
        var eqn = "curr[" + v[this.name] + "] + (";
        if (this.inflows.length > 0)
            eqn += this.inflows.map(function(s) {return "curr[" + v[s] + "]";}).join('+');
        if (this.outflows.length > 0)
            eqn += '- (' + this.outflows.map(function(s) {return "curr[" + v[s] + "]";}).join('+') + ')';
        // stocks can have no inflows or outflows and still be valid
        if (this.inflows.length === 0 && this.outflows.length === 0) {
            eqn += '0';
        }
        eqn += ')*dt';
        return eqn;
    };

    var Table = function Table(model, xmile) {
        this.model = model;
        this.xmile = xmile;
        var eqn = xmile.eqn.toString().toLowerCase();
        this.eqn = eqn;
        this.name = util.eName(xmile['@name']);
        this.x = [];
        this.y = [];

        var ypts, sep;
        if (typeof xmile.gf.ypts === 'object') {
            sep = xmile.gf.ypts['@sep'] || ',';
            ypts = util.numArr(xmile.gf.ypts.keyValue.split(sep));
        } else {
            ypts = util.numArr(xmile.gf.ypts.split(','));
        }

        // FIXME(bp) unit test
        var xpts = null;
        if (typeof xmile.gf.xpts === 'object') {
            sep = xmile.gf.xpts['@sep'] || ',';
            xpts = util.numArr(xmile.gf.xpts.keyValue.split(sep));
        } else if (xmile.gf.xpts) {
            xpts = util.numArr(xmile.gf.xpts.split(','));
        }

        var xscale = xmile.gf.xscale;
        var xmin = xscale ? xscale['@min'] : 0;
        var xmax = xscale ? xscale['@max'] : 0;

        var i = 0, x = 0;
        for (i = 0; i < ypts.length; i++) {
            // either the x points have been explicitly specified, or
            // it is a linear mapping of points between xmin and xmax,
            // inclusive
            if (xpts)
                x = xpts[i];
            else
                x = (i/(ypts.length-1))*(xmax-xmin) + xmin;
            this.x.push(x);
            this.y.push(ypts[i]);
        }

        this._deps = lex.identifierSet(eqn);
    };
    Table.prototype = new Variable();
    Table.prototype.code = function() {
        if (!this.eqn)
            return null;
        var index = Variable.prototype.code.apply(this, arguments);
        return "lookup(this.tables['" + this.name + "'], " + index + ")";
    };

    var Module = function Module(project, parent, xmile) {
        this.project = project;
        this.parent = parent;
        this.xmile = xmile;
        this.name = util.eName(xmile['@name']);
        this.modelName = this.name;
        if (!xmile.connect)
            xmile.connect = [];
        if (!(xmile.connect instanceof Array))
            xmile.connect = [xmile.connect];
        this.refs = {};
        this._deps = {};
        var i, ref;
        for (i = 0; i < xmile.connect.length; i++) {
            ref = new Reference(xmile.connect[i]);
            this.refs[ref.name] = ref;
            this._deps[ref.ptr] = true;
        }
    };
    Module.prototype = new Variable();
    Module.prototype.getDeps = function() {
        if (this._allDeps)
            return this._allDeps;
        var allDeps = {};
        var v, n, nn, otherDeps, context, parts;
        for (n in this._deps) {
            if (n in allDeps)
                continue;
            if (n[0] === '.') {
                context = this.project.model(this.project.main.modelName);
                n = n.substr(1);
            } else {
                context = this.parent;
            }
            parts = n.split('.');
            v = context.lookup(n);
            if (!v) {
                console.log('couldnt find ' + n);
                continue;
            }
            if (!(v instanceof Stock))
                allDeps[parts[0]] = true;
            otherDeps = v.getDeps();
            for (nn in otherDeps)
                allDeps[nn] = true;
        }
        this._allDeps = allDeps;
        return allDeps;
    };
    Module.prototype.referencedModels = function(all) {
        if (!all)
            all = {};
        var mdl = this.project.model(this.modelName);
        var name = mdl.name;
        if (all[name]) {
            all[name].modules.push(this);
        } else {
            all[name] = {
                model:   mdl,
                modules: [this],
            };
        }
        var n;
        for (n in mdl.modules)
            mdl.modules[n].referencedModels(all);
        return all;
    };

    var Reference = function Reference(xmile) {
        this.xmile = xmile;
        this.name = util.eName(xmile['@to']);
        this.ptr = util.eName(xmile['@from']);
    };
    Reference.prototype = new Variable();
    Reference.prototype.code = function() {
        return 'curr["' + this.ptr + '"]';
    };
    Reference.prototype.lessThan = function(that) {
        return this.ptr in that.getDeps();
    };
    Reference.prototype.isConst = function() {
        // FIXME(bp) should actually lookup whether this.ptr is const,
        // but that requires module instance walking in Model which I
        // don't want to implement yet.
        return false;
    };

    return {
        'Variable': Variable,
        'Stock': Stock,
        'Table': Table,
        'Module': Module,
        'Reference': Reference,
    };
});

// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define('runtime',[], function() {
    
    var runtime = {};
    // unquoted source in 'lib/runtime_ugly.js'
    runtime.preamble = "/* jshint globalstrict: true, unused: false */\n/* global cmds: false, TIME: false, DEBUG: false, main: false */\n\n\nvar i32 = function i32(n) {\n    return n|0;\n};\n\nvar Simulation = function() {};\nSimulation.prototype.lookupOffset = function(id) {\n    //print(this.name + ': ' + id + ' resolving (' + this._shift + ')');\n    if (id === 'time')\n        return 0;\n    if (id[0] === '.')\n        id = id.substr(1);\n    if (id in this.offsets)\n        return this._shift + this.offsets[id];\n    var parts = id.split('.');\n    if (parts.length === 1 && id === \"\" && this.name in this.offsets)\n        return this._shift + this.offsets[this.name];\n    var nextSim = this.modules[parts[0]];\n    if (!nextSim)\n        return -1;\n    return nextSim.lookupOffset(parts.slice(1).join('.'));\n};\nSimulation.prototype.resolveAllSymbolicRefs = function() {\n    var n, ctx;\n    for (n in this.symRefs) {\n        if (this.symRefs[n][0] === '.')\n            ctx = main;\n        else\n            ctx = this.parent;\n        this.ref[n] = ctx.lookupOffset(this.symRefs[n]);\n        //print(this.name + ': ' + n + ' resolved to ' + this.ref[n]);\n    }\n    for (n in this.modules)\n        this.modules[n].resolveAllSymbolicRefs();\n};\nSimulation.prototype.varNames = function() {\n    var result = Object.keys(this.offsets).slice();\n    var ids;\n    var v, n;\n    for (v in this.modules) {\n        ids = [];\n        for (n in this.modules[v].varNames())\n            ids.push(v + '.' + n);\n        result = result.concat(ids);\n    }\n    if (this.name === 'main')\n        result.push('time');\n\n    return result;\n};\nSimulation.prototype.getNVars = function() {\n    var nVars = Object.keys(this.offsets).length;\n    var n;\n    for (n in this.modules)\n        nVars += this.modules[n].getNVars();\n    // if we're main, claim time\n    if (this.name === 'main')\n        nVars++;\n    return nVars;\n};\nSimulation.prototype.reset = function() {\n    var timespec = this.timespec;\n    var nSaveSteps = i32((timespec.stop - timespec.start)/timespec.savestep + 1);\n\n    this.stepNum = 0;\n\n    this.slab = new Float64Array(this.nVars*(nSaveSteps + 1));\n\n    var curr = this.curr();\n    curr[TIME] = timespec.start;\n    this.saveEvery = Math.max(1, i32(timespec.savestep/timespec.dt+0.5));\n\n    this.calcInitial(this.timespec.dt, curr);\n};\nSimulation.prototype.runTo = function(endTime) {\n    var dt = this.timespec.dt;\n\n    var curr = this.curr();\n    var next = this.slab.subarray((this.stepNum+1)*this.nVars,\n                                  (this.stepNum+2)*this.nVars);\n\n    while (curr[TIME] <= endTime) {\n        this.calcFlows(dt, curr);\n        this.calcStocks(dt, curr, next);\n\n        next[TIME] = curr[TIME] + dt;\n\n        if (this.stepNum++ % this.saveEvery !== 0) {\n            curr.set(next);\n        } else {\n            curr = next;\n            next = this.slab.subarray((i32(this.stepNum/this.saveEvery)+1)*this.nVars,\n                                      (i32(this.stepNum/this.saveEvery)+2)*this.nVars);\n        }\n    }\n};\nSimulation.prototype.runToEnd = function() {\n    return this.runTo(this.timespec.stop + 0.5*this.timespec.dt);\n};\nSimulation.prototype.curr = function() {\n    return this.slab.subarray((this.stepNum)*this.nVars,\n                              (this.stepNum+1)*this.nVars);\n};\nSimulation.prototype.setValue = function(name, value) {\n    var off = this.lookupOffset(name);\n    if (off === -1)\n        return;\n    this.curr()[off] = value;\n};\nSimulation.prototype.value = function(name) {\n    var off = this.lookupOffset(name);\n    if (off === -1)\n        return;\n    var saveNum = i32(this.stepNum/this.saveEvery);\n    var slabOff = this.nVars*saveNum;\n    return this.slab.subarray(slabOff, slabOff + this.nVars)[off];\n};\nSimulation.prototype.series = function(name) {\n    var saveNum = i32(this.stepNum/this.saveEvery);\n    var time = new Float64Array(saveNum);\n    var values = new Float64Array(saveNum);\n    var off = this.lookupOffset(name);\n    if (off === -1)\n        return;\n    //print(this.name + ': ' + name + ' resolved to ' + off);\n    var i, curr;\n    for (i=0; i < time.length; i++) {\n        curr = this.slab.subarray(i*this.nVars, (i+1)*this.nVars);\n        time[i] = curr[0];\n        values[i] = curr[off];\n    }\n    return {\n        'name': name,\n        'time': time,\n        'values': values,\n    };\n};\n\nfunction handleMessage(e) {\n    var id = e.data[0];\n    var cmd = e.data[1];\n    var args = e.data.slice(2);\n    var result;\n\n    if (cmds.hasOwnProperty(cmd))\n        result = cmds[cmd].apply(null, args);\n    else\n        result = [null, 'unknown command \"' + cmd + '\"'];\n\n    if (!Array.isArray(result))\n        result = [null, 'no result for [' + e.data.join(', ') + ']'];\n\n    // TODO(bp) look into transferrable objects\n    var msg = [id, result];\n    postMessage(msg);\n}\n\nvar desiredSeries = null;\n\nfunction initCmds(main) {\n    return {\n        'reset': function() {\n            main.reset();\n            return ['ok', null];\n        },\n        'set_val': function(name, val) {\n            main.setValue(name, val);\n            return ['ok', null];\n        },\n        'get_val': function() {\n            var result = {};\n            var i;\n            for (i=0; i < arguments.length; i++)\n                result[arguments[i]] = main.value(arguments[i]);\n            return [result, null];\n        },\n        'get_series': function() {\n            var result = {};\n            var i;\n            for (i=0; i<arguments.length; i++)\n                result[arguments[i]] = main.series(arguments[i]);\n            return [result, null];\n        },\n        'run_to': function(time) {\n            main.runTo(time);\n            return [main.value('time'), null];\n        },\n        'run_to_end': function() {\n            var result = {};\n            var i;\n            main.runToEnd();\n            if (desiredSeries) {\n                for (i = 0; i < desiredSeries.length; i++)\n                    result[desiredSeries[i]] = main.series(desiredSeries[i]);\n                return [result, null];\n            } else {\n                return [main.value('time'), null];\n            }\n        },\n        'set_desired_series': function(names) {\n            desiredSeries = names;\n            return ['ok', null];\n        },\n    };\n}\n\nfunction lookup(table, index) {\n    var size = table.x.length;\n    if (size === 0)\n        return NaN;\n\n    var x = table.x;\n    var y = table.y;\n\n    if (index <= x[0])\n        return y[0];\n    else if (index >= x[size - 1])\n        return y[size - 1];\n\n    // binary search seems to be the most appropriate choice here.\n    var low = 0;\n    var high = size;\n    var mid;\n    while (low < high) {\n        mid = Math.floor(low + (high - low)/2);\n        if (x[mid] < index) {\n            low = mid + 1;\n        } else {\n            high = mid;\n        }\n    }\n\n    var i = low;\n    if (x[i] === index) {\n        return y[i];\n    } else {\n        // slope = deltaY/deltaX\n        var slope = (y[i] - y[i-1]) / (x[i] - x[i-1]);\n        // y = m*x + b\n        return (index - x[i-1])*slope + y[i-1];\n    }\n}\n\nfunction max(a, b) {\n    a = +a;\n    b = +b;\n    return a > b ? a : b;\n}\n\nfunction min(a, b) {\n    a = +a;\n    b = +b;\n    return a < b ? a : b;\n}\n\nfunction pulse(dt, time, volume, firstPulse, interval) {\n    if (time < firstPulse)\n        return 0;\n    var nextPulse = firstPulse;\n    while (time >= nextPulse) {\n        if (time < nextPulse + dt)\n            return volume/dt;\n        else if (interval <= 0.0)\n            break;\n        else\n            nextPulse += interval;\n    }\n    return 0;\n}";
    // unquoted source in 'lib/epilogue_src.js'
    runtime.epilogue = "/* global main: false, print: true */\n\nif (typeof console !== 'undefined')\n    print = console.log;\n\nmain.runToEnd();\nvar series = {};\nvar header = 'time\\t';\nvar vars = main.varNames();\nvar i, v;\nfor (i = 0; i < vars.length; i++) {\n    v = vars[i];\n    if (v === 'time')\n        continue;\n    header += v + '\\t';\n    series[v] = main.series(v);\n}\nprint(header.substr(0, header.length-1));\n\nvar nSteps = main.series('time').time.length;\nvar msg = '';\nfor (i = 0; i < nSteps; i++) {\n    msg = '';\n    for (v in series) {\n        if (msg === '')\n            msg += series[v].time[i] + '\\t';\n        msg += series[v].values[i] + '\\t';\n    }\n    print(msg.substr(0, msg.length-1));\n}";
    // unquoted source in 'lib/draw.css'
    runtime.drawCSS = "<defs><style>\n/* <![CDATA[ */\n.spark-axis {\n    stroke-width: 0.125;\n    stroke-linecap: round;\n    stroke: #999;\n    fill: none;\n}\n\n.spark-line {\n    stroke-width: 0.5;\n    stroke-linecap: round;\n    stroke: #2299dd;\n    fill: none;\n}\n\ntext {\n    font-size: 12px;\n    font-family: \"Open Sans\";\n    font-weight: 300;\n    text-anchor: middle;\n    white-space: nowrap;\n    vertical-align: middle;\n}\n\n.left-aligned {\n    text-anchor: start;\n}\n/* ]]> */\n</style></defs>\n";

    return runtime;
});


/* global navigator: false, document: false */

define('draw',['./util', './vars', './runtime'], function(util, vars, runtime) {
    

    var AUX_RADIUS = 9;
    var LABEL_PAD = 6;
    var STROKE = 1;
    var CLOUD_PATH = 'M 25.731189,3.8741489 C 21.525742,3.8741489 18.07553,7.4486396 17.497605,12.06118 C 16.385384,10.910965 14.996889,10.217536 13.45908,10.217535 C 9.8781481,10.217535 6.9473481,13.959873 6.9473482,18.560807 C 6.9473482,19.228828 7.0507906,19.875499 7.166493,20.498196 C 3.850265,21.890233 1.5000346,25.3185 1.5000346,29.310191 C 1.5000346,34.243794 5.1009986,38.27659 9.6710049,38.715902 C 9.6186538,39.029349 9.6083922,39.33212 9.6083922,39.653348 C 9.6083922,45.134228 17.378069,49.59028 26.983444,49.590279 C 36.58882,49.590279 44.389805,45.134229 44.389803,39.653348 C 44.389803,39.35324 44.341646,39.071755 44.295883,38.778399 C 44.369863,38.780301 44.440617,38.778399 44.515029,38.778399 C 49.470875,38.778399 53.499966,34.536825 53.499965,29.310191 C 53.499965,24.377592 49.928977,20.313927 45.360301,19.873232 C 45.432415,19.39158 45.485527,18.91118 45.485527,18.404567 C 45.485527,13.821862 42.394553,10.092543 38.598118,10.092543 C 36.825927,10.092543 35.215888,10.918252 33.996078,12.248669 C 33.491655,7.5434856 29.994502,3.8741489 25.731189,3.8741489 z';
    var CLOUD_WIDTH = 55;
    var ARROWHEAD_RADIUS = 4;
    var CLOUD_RADIUS = 8;
    // FIXME(bp) this is a whack workaround, need to figure out a
    // better way to decide when to inverse a connector curve
    var INVERSE_FUZZ = 6;
    var MODULE_R = 5;
    var TEXT_ATTR = {
        'font-size': '12px',
        'font-family': 'Open Sans',
        'font-weight': '300',
        'text-anchor': 'middle',
        'white-space': 'nowrap',
        'vertical-align': 'middle',
    };
    var COLOR_CONN = 'gray';
    var COLOR_AUX = 'black';
    var Z_ORDER = {
        'flow': 1,
        'module': 2,
        'stock': 3,
        'aux': 4,
        'connector': 5,
    };
    var MIN_SCALE = .2;
    var Z_MAX = 6;
    var IS_CHROME = typeof navigator !== 'undefined' && navigator.userAgent.match(/Chrome/);

    var dName = util.dName, eName = util.eName;

    var hasKey = function hasKey(o, k) {
        return o.hasOwnProperty(k);
    };

    var isZero = function isZero(n) {
        return Math.abs(n) < 0.0000001;
    };

    var isNaN = util.isNaN;

    var square = function square(n) {
        return Math.pow(n, 2);
    };

    var pt = function pt(x, y) {
        return {'x': x, 'y': y};
    };

    var SIDE_MAP = {
        0: 'right',
        1: 'bottom',
        2: 'left',
        3: 'top',
    };

    var findSide = function findSide(element, defaultElement) {
        if (!defaultElement)
            defaultElement = 'bottom';
        var θ, i, side;
        if ('@label_side' in element) {
            side = element['@label_side'].toLowerCase();
            // FIXME(bp) handle center 'side' case
            if (side === 'center')
                return defaultElement;
            return side;
        }
        if ('@label_angle' in element) {
            θ = (element['@label_angle'] + 45) % 360;
            i = (θ/90)|0;
            return SIDE_MAP[i];
        }
        return defaultElement;
    };

    var cloudAt = function cloudAt(paper, x, y) {
        var scale = (AUX_RADIUS*2/CLOUD_WIDTH);
        var t = 'matrix(' + scale + ', 0, 0, ' + scale + ', ' +
            (x - AUX_RADIUS) + ', ' + (y - AUX_RADIUS) + ')';
        return paper.path(CLOUD_PATH).attr({
            'fill': '#ffffff',
            'stroke':'#6388dc',
            'stroke-width': 2,
            'stroke-linejoin': 'round',
            'stroke-miterlimit': 4,
        }).transform(t);
    };

    var circleFromPoints = function(p1, p2, p3) {
        var off = square(p2.x) + square(p2.y);
        var bc = (square(p1.x) + square(p1.y) - off)/2;
        var cd = (off - square(p3.x) - square(p3.y))/2;
        var det = (p1.x - p2.x)*(p2.y - p3.y) - (p2.x - p3.x)*(p1.y - p2.y);
        if (isZero(det)) {
            console.log('blerg');
            return;
        }
        var idet = 1/det;
        var cx = (bc*(p2.y - p3.y) - cd*(p1.y - p2.y))*idet;
        var cy = (cd*(p1.x - p2.x) - bc*(p2.x - p3.x))*idet;
        return {
            'x': cx,
            'y': cy,
            'r': Math.sqrt(Math.pow(p2.x - cx, 2) + Math.pow(p2.y - cy, 2)),
        };
    };

    var label = function label(paper, cx, cy, side, text, rw, rh) {
        rw = rw || AUX_RADIUS;
        rh = rh || AUX_RADIUS;
        var x, y;
        switch (side) {
        case 'top':
            x = cx;
            y = cy - rh - LABEL_PAD;
            break;
        case 'bottom':
            x = cx;
            y = cy + rh + LABEL_PAD;
            break;
        case 'left':
            x = cx - rw - LABEL_PAD;
            y = cy;
            break;
        case 'right':
            x = cx + rw + LABEL_PAD;
            y = cy;
            break;
        }

        var lbl = paper.text(x, y, text.split('\n')).attr(TEXT_ATTR);
        var lines = lbl.attr('text');
        if (typeof lines === 'string')
            lines = [lines];
        var spans = lbl.node.getElementsByTagName('tspan');
        var i, t, bb;
        var maxH = Number.MIN_VALUE, maxW = Number.MIN_VALUE;
        if (IS_CHROME) {
            // FIXME(bp) this is way faster as it avoids forced
            // layouts & node creation + deletion, but it only works
            // on Chrome.
            for (i = 0; i < spans.length; i++) {
                bb = spans[i].getBBox();
                if (bb.height > maxH)
                    maxH = bb.height;
                if (bb.width > maxW)
                    maxW = bb.width;
            }
        } else {
            for (i=0; i < lines.length; i++) {
                t = paper.text(0, 0, lines[i]).attr(TEXT_ATTR);
                bb = t.getBBox();
                if (bb.height > maxH)
                    maxH = bb.height;
                if (bb.width > maxW)
                    maxW = bb.width;
                t.remove();
            }
        }
        for (i = 0; i < spans.length; i++) {
            if (side === 'left' || side === 'right') {
                // TODO(bp) fix vertical centering
            }
            if (i > 0) {
                if (side === 'left')
                    spans[i].setAttribute('x', x - maxW/2);
                else
                    spans[i].setAttribute('x', x);
                spans[i].setAttribute('dy', 0.7*maxH);
            }
        }
        var off;
        switch (side) {
        case 'bottom':
            lbl.attr({y: y + LABEL_PAD});
            break;
        case 'top':
            lbl.attr({y: y - (spans.length-1)*(maxH/2) - LABEL_PAD*(spans.length > 1)});
            break;
        case 'left':
            // kind of gross, but I'm not sure what the correct metric
            // would be.  I think middle-align isn't working right or
            // something.
            if (spans.length > 1)
                off = (spans.length-2)*(maxH/2);
            else
                off = -maxH/4;

            lbl.attr({
                y: y - off,
                x: x - maxW/2
            });
            break;
        case 'right':
            lbl.node.classList.add('left-aligned');
            lbl.node.setAttribute('style', lbl.node.getAttribute('style').replace('middle', 'left'));
            lbl.attr({
                y: y - (spans.length-2)*(maxH/2)
            });
            break;
        }
        return lbl;
    };

    var last = function last(arr) {
        return arr[arr.length-1];
    };

    var arrowhead = function arrowhead(paper, x, y, r) {
        var head = 'M' + x + ',' + y + 'L' + (x-r) + ',' + (y + r/2) +
            'A' + r*3 + ',' + r*3 + ' 0 0,1 ' + (x-r) + ',' + (y - r/2) + 'z';
        return paper.path(head);
    };

    var sparkline = function sparkline(paper, cx, cy, w, h, time, values, graph) {
        var x = cx - w/2;
        var y = cy - h/2;
        var xMin = time[0];
        var xMax = last(time);
        var xSpan = xMax - xMin;
        var yMin = Math.min(0, Math.min.apply(null, values)); // 0 or below 0
        var yMax = Math.max.apply(null, values);
        var ySpan = (yMax - yMin) || 1;
        var p = '';
        var i;
        for (i = 0; i < values.length; i++) {
            if (isNaN(values[i])) {
                console.log('NaN at ' + time[i]);
            }
            p += (i === 0 ? 'M' : 'L') + (x + w*(time[i]-xMin)/xSpan) + ',' + (y + h - h*(values[i]-yMin)/ySpan);
        }
        var pAxis = 'M' + (x) + ',' + (y + h - h*(0-yMin)/ySpan) + 'L' + (x+w) + ',' + (y + h - h*(0-yMin)/ySpan);
        if (!graph) {
            return paper.g(
                paper.path(pAxis).attr({
                    'class': 'spark-axis',
                    'stroke-width': 0.125,
                    'stroke-linecap': 'round',
                    'stroke': '#999',
                    'fill': 'none',
                }),
                paper.path(p).attr({
                    'class': 'spark-line',
                    'stroke-width': 0.5,
                    'stroke-linecap': 'round',
                    'stroke': '#2299dd',
                    'fill': 'none',
                })
            );
        } else {
            var line = graph.node.querySelector('.spark-line');
            line.setAttribute('d', p);
            return graph;
        }
    };

    var DStock = function (drawing, element) {
        this.drawing = drawing;
        this.e = element;
        this.name = eName(element['@name']);
        this.dName = dName(element['@name']);

        this.cx = element['@x'];
        this.cy = element['@y'];
        this.w = 45;
        this.h = 35;
        this.color = this.drawing.colorOverride ? COLOR_AUX : element['@color'] || COLOR_AUX;
        this.labelSide = findSide(element);
    };
    DStock.prototype.init = function() {
        // we are a stock, and need to inform all the flows into and
        // out of us that they, in fact, flow in and out of us.

        var mEnt = this.drawing.model.vars[this.name];

        var i, n, dEnt;
        for (i=0; i < mEnt.inflows.length; i++) {
            n = mEnt.inflows[i];
            dEnt = this.drawing.named_ents[n];
            if (!dEnt) {
                console.log('failed connecting ' + this.name + ' .to ' + n);
                continue;
            }
            dEnt.to = this.name;
        }
        for (i=0; i < mEnt.outflows.length; i++) {
            n = mEnt.outflows[i];
            dEnt = this.drawing.named_ents[n];
            if (!dEnt) {
                console.log('failed connecting ' + this.name + ' .from ' + n);
                continue;
            }
            this.drawing.named_ents[n].from = this.name;
        }
    };
    DStock.prototype.draw = function() {
        var paper = this.drawing.paper;
        var w = this.w;
        var h = this.h;

        // FIXME: the ceil calls are for Stella Modeler compatability.
        this.set = this.drawing.group(
            paper.rect(Math.ceil(this.cx - w/2), Math.ceil(this.cy - h/2), w, h).attr({
                'fill': 'white',
                'stroke-width': STROKE,
                'stroke': this.color,
            })
        );
    };
    DStock.prototype.drawLabel = function() {
        var paper = this.drawing.paper;
        var w = this.w;
        var h = this.h;
        this.set.add(label(paper, this.cx, this.cy, this.labelSide, this.dName, w/2, h/2));
    };
    DStock.prototype.visualize = function(time, values) {
        var hadGraph = !!this.graph;
        this.graph = sparkline(this.drawing.paper,
                               this.cx, this.cy, this.w-4, this.h-4,
                               time, values, this.graph);
        if (!hadGraph)
            this.set.add(this.graph);
    };

    var DModule = function (drawing, element) {
        this.drawing = drawing;
        this.e = element;
        this.name = eName(element['@name']);
        this.dName = dName(element['@name']);

        this.cx = element['@x'];
        this.cy = element['@y'];
        this.w = 55;
        this.h = 45;
        this.color = this.drawing.colorOverride ? COLOR_AUX : element['@color'] || COLOR_AUX;
        this.labelSide = findSide(element);
    };
    DModule.prototype.init = function() {
    };
    DModule.prototype.draw = function() {
        var paper = this.drawing.paper;
        var w = this.w;
        var h = this.h;

        // FIXME: the ceil calls are for Stella Modeler compatability.
        this.set = this.drawing.group(
            paper.rect(Math.ceil(this.cx - w/2), Math.ceil(this.cy - h/2), w, h, MODULE_R, MODULE_R).attr({
                'fill': 'white',
                'stroke-width': STROKE,
                'stroke': this.color,
            })
        );
    };
    DModule.prototype.drawLabel = function() {
        var paper = this.drawing.paper;
        var w = this.w;
        var h = this.h;
        this.set.add(label(paper, this.cx, this.cy, this.labelSide, this.dName, w/2, h/2));
    };
    DModule.prototype.visualize = function(time, values) {
        var hadGraph = !!this.graph;
        this.graph = sparkline(this.drawing.paper,
                               this.cx, this.cy, this.w-6, this.h-6,
                               time, values, this.graph);
        if (!hadGraph)
            this.set.add(this.graph);
    };

    var DAux = function(drawing, element) {
        this.drawing = drawing;
        this.e = element;
        this.name = eName(element['@name']);
        this.dName = dName(element['@name']);

        this.cx = element['@x'];
        this.cy = element['@y'];
        this.color = this.drawing.colorOverride ? COLOR_AUX : element['@color'] || COLOR_AUX;
        this.labelSide = findSide(element);
    };
    DAux.prototype.init = function() {};
    DAux.prototype.draw = function() {
        var paper = this.drawing.paper;
        this.set = this.drawing.group(
            paper.circle(this.cx, this.cy, AUX_RADIUS).attr({
                'fill': 'white',
                'stroke-width': STROKE,
                'stroke': this.color,
            })
        );
    };
    DAux.prototype.drawLabel = function() {
        var paper = this.drawing.paper;
        this.set.add(label(paper, this.cx, this.cy, this.labelSide, this.dName));
    };
    DAux.prototype.visualize = function(time, values) {
        var hadGraph = !!this.graph;
        this.graph = sparkline(this.drawing.paper,
                               this.cx, this.cy, AUX_RADIUS, AUX_RADIUS,
                               time, values, this.graph);
        if (!hadGraph)
            this.set.add(this.graph);
    };

    var DFlow = function(drawing, element) {
        this.drawing = drawing;
        this.e = element;
        this.name = eName(element['@name']);
        this.dName = dName(element['@name']);
        this.cx = element['@x'];
        this.cy = element['@y'];
        this.to = null;
        this.from = null;
        this.color = this.drawing.colorOverride ? COLOR_AUX : element['@color'] || COLOR_AUX;
        this.labelSide = findSide(element);
    };
    DFlow.prototype.init = function() {};
    DFlow.prototype.draw = function() {
        var paper = this.drawing.paper;
        var cx = this.cx;
        var cy = this.cy;
        var pts = this.e.pts.pt;
        if (pts.length < 2) {
            console.log('ERROR: too few points for flow: ' + JSON.stringify(this));
            return;
        }
        var spath = '';
        var j;
        for (j = 0; j < pts.length; j++)
            spath += (j === 0 ? 'M' : 'L') + pts[j]['@x'] + ',' + pts[j]['@y'];

        var from_cloud;
        var cloud;
        this.set = this.drawing.group();
        if (!this.from) {
            cloud = cloudAt(paper, pts[0]['@x'], pts[0]['@y']);
            // when we are flowing out of a cloud, don't adjust the
            // length, just later the cloud above the pipe
            from_cloud = cloud;
        }
        var x, y, prevX, prevY;
        if (!this.to) {
            x = pts[pts.length-1]['@x'];
            y = pts[pts.length-1]['@y'];
            prevX = pts[pts.length-2]['@x'];
            prevY = pts[pts.length-2]['@y'];
            cloud = cloudAt(paper, x, y);
            this.set.add(cloud);
            if (prevX < x)
                pts[pts.length-1]['@x'] = x - CLOUD_RADIUS;
            if (prevX > x)
                pts[pts.length-1]['@x'] = x + CLOUD_RADIUS;
            if (prevY < y)
                pts[pts.length-1]['@y'] = y - CLOUD_RADIUS;
            if (prevY > y)
                pts[pts.length-1]['@y'] = y + CLOUD_RADIUS;
        }
        // recalcualte path after cloud intersection
        spath = '';
        var dx, dy, θ, arrowθ, lastPt;
        for (j = 0; j < pts.length; j++) {
            x = pts[j]['@x'];
            y = pts[j]['@y'];
            if (j === pts.length-1) {
                dx = x - pts[j-1]['@x'];
                dy = y - pts[j-1]['@y'];
                θ = Math.atan2(dy, dx) * 180/Math.PI;
                if (θ < 0)
                    θ += 360;
                if (θ >= 315 || θ < 45) {
                    x -= 4;
                    arrowθ = 0;
                } else if (θ >= 45 &&  θ < 135) {
                    y -= 4;
                    arrowθ = 90;
                } else if (θ >= 135 &&  θ < 225) {
                    x += 4;
                    arrowθ = 180;
                } else {
                    y += 4;
                    arrowθ = 270;
                }
            }
            spath += (j === 0 ? 'M' : 'L') + x + ',' + y;
        }
        this.set.add(paper.path(spath).attr({
            'stroke-width': STROKE*4,
            'stroke': this.color,
            'fill': 'none',
        }));

        lastPt = last(pts);
        this.set.add(arrowhead(paper, lastPt['@x'], lastPt['@y'], ARROWHEAD_RADIUS*2).attr({
            'transform': 'rotate(' + (arrowθ) + ',' + lastPt['@x'] + ',' + lastPt['@y'] + ')',
            'stroke': this.color,
            'stroke-width': 1,
            'fill': 'white',
            'stroke-linejoin': 'round',
        }));

        this.set.add(paper.path(spath).attr({
            'stroke': 'white',
            'stroke-width': STROKE*2,
            'fill': 'none',
        }));
        this.set.add(paper.circle(cx, cy, AUX_RADIUS).attr({
            'fill': 'white',
            'stroke-width': STROKE,
            'stroke': this.color,
        }));
        if (from_cloud)
            this.set.append(from_cloud);
    };
    DFlow.prototype.drawLabel = function() {
        var paper = this.drawing.paper;
        this.set.add(label(paper, this.cx, this.cy, this.labelSide, this.dName));
    };
    DFlow.prototype.visualize = function(time, values) {
        var hadGraph = !!this.graph;
        this.graph = sparkline(this.drawing.paper,
                               this.cx, this.cy, AUX_RADIUS, AUX_RADIUS,
                               time, values, this.graph);
        if (!hadGraph)
            this.set.add(this.graph);
    };

    var DConnector = function(drawing, element) {
        this.drawing = drawing;
        this.e = element;
        this.name = undefined;
        this.color = this.drawing.colorOverride ? COLOR_CONN : element['@color'] || COLOR_CONN;
    };
    DConnector.prototype.init = function() {};
    DConnector.prototype.draw = function() {
        var paper = this.drawing.paper;
        var cx = this.e['@x'];
        var cy = this.e['@y'];
        var fromEnt = this.drawing.named_ents[eName(this.e.from)];
        if (!fromEnt)
            return;
        var fx = fromEnt.cx;
        var fy = fromEnt.cy;
        var toEnt = this.drawing.named_ents[eName(this.e.to)];
        if (!toEnt)
            return;
        var tx = toEnt.cx;
        var ty = toEnt.cy;
        var circ = circleFromPoints(pt(cx, cy), pt(fx, fy), pt(tx, ty));
        var spath = '';
        var inv = 0;
        spath += 'M' + cx + ',' + cy;
        var dx, dy, startθ, endθ, spanθ, internalθ;

        var r;
        if (circ) {
            dx = fx - circ.x;
            dy = fy - circ.y;
            startθ = Math.atan2(dy, dx) * 180/Math.PI;
            dx = tx - circ.x;
            dy = ty - circ.y;
            endθ = Math.atan2(dy, dx) * 180/Math.PI;
            spanθ = endθ - startθ;
            while (spanθ < 0)
                spanθ += 360;
            spanθ %= 360;
            inv = spanθ <= 180 - INVERSE_FUZZ;

            // FIXME(bp) this is an approximation, a bad one.
            if (toEnt instanceof DModule)
                r = 25;
            else
                r = AUX_RADIUS;
            internalθ = Math.tan(r/circ.r)*180/Math.PI;
            tx = circ.x + circ.r*Math.cos((endθ + (inv ? -1 : 1)*internalθ)/180*Math.PI);
            ty = circ.y + circ.r*Math.sin((endθ + (inv ? -1 : 1)*internalθ)/180*Math.PI);

            spath += 'A' + circ.r + ',' + circ.r + ' 0 0,' + (inv ? '1' : '0') + ' ' + tx + ',' + ty;
        } else {
            dx = tx - fx;
            dy = ty - fy;
            endθ = Math.atan2(dy, dx) * 180/Math.PI;
            // TODO(bp) subtract AUX_RADIUS from path
            spath += 'L' + tx + ',' + ty;
        }

        var θ = 0;
        if (circ) {
            // from center of to aux
            //var slope1 = (i.y - ty)/(i.x - tx);
            // inverse from center of circ
            var slope2 = -Math.atan2((tx - circ.x), (ty - circ.y));
            θ = slope2*180/Math.PI;//(slope1+slope2)/2;
            if (inv)
                θ += 180;
        }

        this.set = this.drawing.group(
            paper.path(spath).attr({
                'stroke-width': STROKE/2,
                'stroke': this.color,
                'fill': 'none',
            }),
            paper.circle(cx, cy, 2).attr({'stroke-width':0, fill:'#c83639'}),
            arrowhead(paper, tx, ty, ARROWHEAD_RADIUS).attr({
                'transform': 'rotate(' + (θ) + ',' + tx + ',' + ty + ')',
                'stroke': this.color,
                'stroke-width': 1,
                'fill': this.color,
                'stroke-linejoin': 'round',
            })
        );
    };
    DConnector.prototype.drawLabel = function() {};

    var DTypes = {
        'stock': DStock,
        'flow': DFlow,
        'aux': DAux,
        'connector': DConnector,
        'module': DModule,
    };

    /**
       Drawing represents a stock-and-flow diagram of a SD model.
    */
    var Drawing = function(model, xmile, svgElement, overrideColors, enableMousewheel) {
        this.model = model;
        this.xmile = xmile;
        var svg;
        if (typeof svgElement === 'string') {
            if (svgElement.length > 0 && svgElement[0] === '#')
                svgElement = svgElement.substr(1);
            svg = document.getElementById(svgElement);
        } else {
            svg = svgElement;
        }
        svg.innerHTML = '';
        this.paper = new Snap(svg);
        var defs = svg.getElementsByTagName('defs')[0];
        if (defs)
            defs.outerHTML = runtime.drawCSS;
        else
            svg.innerHTML += runtime.drawCSS;
        this._selector = svgElement;
        this._g = this.paper.g();
        this._g.node.id = 'viewport';
        this.colorOverride = overrideColors;

        //var zoom = util.floatAttr(view, 'zoom')/100.0;
        svg.setAttribute('preserveAspectRatio', 'xMinYMin');
        var tz = 'translateZ(0px)';
        svg.style['-webkit-transform'] = tz;
        svg.style['-moz-transform'] = tz;
        svg.style['-ms-transform'] = tz;
        svg.style['-o-transform'] = tz;
        svg.style.transform = tz;

        var elems = [];
        var n, i;
        for (n in DTypes) {
            if (!(n in xmile))
                continue;
            if (!(xmile[n] instanceof Array))
                xmile[n] = [xmile[n]];
            for (i = 0; i < xmile[n].length; i++) {
                xmile[n][i]['@tagName'] = n;
                elems.push(xmile[n][i]);
            }
        }

        this.d_ents = [];
        this.z_ents = new Array(Z_MAX);
        for (i = 0; i < Z_MAX; i++)
            this.z_ents[i] = [];
        this.named_ents = {};

        var j, e, de, tagName;

        // create a drawing entity for each known tag in the display
        for (i = 0; i < elems.length; i++) {
            e = elems[i];
            tagName = e['@tagName'];
            if (!tagName)
                continue;
            if (!hasKey(DTypes, tagName)) {
                console.log('unknown draw ent type ' + e.tagName);
                continue;
            }
            de = new DTypes[tagName](this, e);
            this.d_ents.push(de);
            this.z_ents[Z_ORDER[tagName]].push(de);
            if (de.name)
                this.named_ents[de.name] = de;
        }

        // all draw ents need to be constructed and read in before we
        // can initialize them
        for (i = 0; i < this.d_ents.length; i++)
            this.d_ents[i].init();

        // TODO(bp) sort by draw order
        for (i = 0; i < Z_MAX; i++) {
            for (j = 0; j < this.z_ents[i].length; j++)
                this.z_ents[i][j].draw();
        }
        for (i = 0; i < Z_MAX; i++) {
            for (j = 0; j < this.z_ents[i].length; j++)
                this.z_ents[i][j].drawLabel();
        }

        // pieces to construct a transformation matrix from
        this._t = {
            'scale': 1,
            'dscale': 0,
            'x': 0,
            'y': 0,
            'dx': 0,
            'dy': 0,
        };

        var _this = this;

        //Hammer.plugins.showTouches();
        //Hammer.plugins.fakeMultitouch();
        var hammer = Hammer(svg, {
            preventDefault: true,
            gesture: true,
        });
        hammer.on('dragstart', function() {
            var drawing = _this;
            drawing.normalizeTransform();
        });
        hammer.on('drag', function(e) {
            var drawing = _this;
            drawing._t.dx = e.gesture.deltaX;
            drawing._t.dy = e.gesture.deltaY;
            drawing.transform();
        });
        hammer.on('dragend', function(e) {
            var drawing = _this;
            drawing.normalizeTransform();
            drawing.transform();
        });
        hammer.on('transformstart', function(e) {
            var drawing = _this;
            drawing.normalizeTransform();
        });
        hammer.on('pinch', function(e) {
            var drawing = _this;
            drawing.applyDScaleAt(e.gesture.scale-1, e.gesture.center);
            drawing.transform();
        });
        hammer.on('transformend', function(e) {
            var drawing = _this;
            drawing.normalizeTransform();
            drawing.transform();
        });

        if (!enableMousewheel)
            return;

        svg.onwheel = function(e) {
            var drawing = _this;
            var delta = -e.deltaY/20;
            drawing.applyDScaleAt(delta, e);
            drawing.normalizeTransform();
            drawing.transform();
        };
    };
    Drawing.prototype.applyDScaleAt = function(dscale, e) {
        this._t.dscale = dscale;
        if (this._t.scale + this._t.dscale < MIN_SCALE)
                this._t.dscale = MIN_SCALE - this._t.scale;
        this._t.dx = -(e.pageX - this._t.x)*(this._t.dscale)/this._t.scale;
        this._t.dy = -(e.pageY - this._t.y)*(this._t.dscale)/this._t.scale;
    };
    Drawing.prototype.transform = function(scale, x, y) {
        if (arguments.length === 3) {
            this._t.scale = scale;
            this._t.x = x;
            this._t.y = y;
        }
        var x = this._t.x + this._t.dx;
        var y = this._t.y + this._t.dy;
        var scale = this._t.scale + this._t.dscale;
        var matrix = 'translateZ(0px) matrix(' + scale + ',0,0,' + scale +
            ',' + x + ',' + y + ')';
        this._g.node.style['-webkit-transform'] = matrix;
        this._g.node.style['-moz-transform'] = matrix;
        this._g.node.style['-ms-transform'] = matrix;
        this._g.node.style.transform = matrix;
    };
    Drawing.prototype.normalizeTransform = function() {
        this._t.x += this._t.dx;
        this._t.y += this._t.dy;
        this._t.scale += this._t.dscale;
        if (this._t.scale < MIN_SCALE)
            this._t.scale = MIN_SCALE;
        this._t.dx = 0;
        this._t.dy = 0;
        this._t.dscale = 0;
    };
    Drawing.prototype.visualize = function(data) {
        // FIXME(bp) hack for compat
        if (data.project) {
            var sim = data;
            var d = this;
            sim.series.apply(sim, Object.keys(this.named_ents)).then(function(result) {
                var n, dEnt, data;
                for (n in result) {
                    data = result[n];
                    dEnt = d.named_ents[n];
                    if (!dEnt) {
                        console.log('sim data for non-drawn ' + n);
                        continue;
                    }
                    dEnt.visualize(data.time, data.values);
                }
            }).done();
        } else {
            var result = data;
            var n, dEnt;
            for (n in result) {
                data = result[n];
                dEnt = this.named_ents[n];
                if (!dEnt) {
                    console.log('sim data for non-drawn ' + n);
                    continue;
                }
                dEnt.visualize(data.time, data.values);
            }
        }
    };
    Drawing.prototype.group = function() {
        var g = this.paper.g.apply(this.paper, arguments);
        this._g.append(g);
        return g;
    };

    return {
        'Drawing': Drawing,
    };
});

// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

// XXX: this sim module can't depend on the model module, as model
// imports sim, and we don't want circular dependencies.
define('sim',['./util', './vars', './runtime'], function(util, vars, runtime) {
    

    // whether we map names -> offsets in a Float64Array, or use names
    // as object property lookups.  With DEBUG = true, equations are
    // easier to debug but run slower.
    var DEBUG = true;

    var SP = DEBUG ? '    ' : '';
    var NLSP = DEBUG ? '\n    ' : '';

    var tmpl = "{{&preamble}}\n\n" +
        "var TIME = 0;\n\n" +
        "{{#models}}\n" +
        "var {{&className}} = function {{&className}}(name, parent, offset, symRefs) {\n" +
        "    this.name = name;\n" +
        "    this.parent = parent;\n" +
        // if we are a module, record the offset in the curr & next
        // arrays we should be writing at
        "    this._shift = i32(offset);\n" +
        "    {{&init}}\n" +
        "    this.modules = {{&modules}};\n" +
        // symbolic references, which will get resolved into integer
        // offsets in the ref map after all Simulation objects have
        // been initialized.
        "    this.symRefs = symRefs || {};\n" +
        "    this.ref = {};\n" +
        "    this.nVars = this.getNVars();\n" +
        "    if (name === 'main')\n" +
        "        this.reset();\n" +
        "};\n" +
        "{{&className}}.prototype = new Simulation();\n" +
        "{{&className}}.prototype.initials = {{&initialVals}};\n" +
        "{{&className}}.prototype.timespec = {{&timespecVals}};\n" +
        "{{&className}}.prototype.offsets = {{&offsets}};\n" +
        "{{&className}}.prototype.tables = {{&tableVals}};\n" +
        "{{&className}}.prototype.calcInitial = function(dt, curr) {\n" +
        "    dt = +dt;\n" +
        "{{#isModule?}}\n" +
        "    var globalCurr = curr;\n" +
        "    curr = curr.subarray(this._shift, this._shift + this.nVars);\n" +
        "{{/isModule?}}\n" +
        "    {{&calcI}}\n" +
        "};\n" +
        "{{&className}}.prototype.calcFlows = function(dt, curr) {\n" +
        "    dt = +dt;\n" +
        "{{#isModule?}}\n" +
        "    var globalCurr = curr;\n" +
        "    curr = curr.subarray(this._shift, this._shift + this.nVars);\n" +
        "{{/isModule?}}\n" +
        "    {{&calcF}}\n" +
        "};\n" +
        "{{&className}}.prototype.calcStocks = function(dt, curr, next) {\n" +
        "    dt = +dt;\n" +
        "{{#isModule?}}\n" +
        "    var globalCurr = curr;\n" +
        "    curr = curr.subarray(this._shift, this._shift + this.nVars);\n" +
        "    next = next.subarray(this._shift, this._shift + this.nVars);\n" +
        "{{/isModule?}}\n" +
        "    {{&calcS}}\n" +
        "};\n\n" +
        "{{/models}}\n" +
        "var main = new {{&mainClassName}}('main');\n" +
        "main.resolveAllSymbolicRefs();\n\n" +
        "var cmds = initCmds(main);\n\n" +
        "{{&epilogue}}\n";

    var Sim = function Sim(root, isStandalone) {
        this.project = root.project;
        this.seq = 1; // message id sequence
        this.promised = {}; //callback storage, keyed by message id
        this.idSeq = {}; // variable offset sequence.  Time is always offset 0

        var models = root.referencedModels();
        var compiledModels = [];
        var n;
        for (n in models) {
            if (n === 'main')
                this.idSeq[n] = 1; // add 1 for time
            else
                this.idSeq[n] = 0;
            compiledModels.push(this._process(models[n].model, models[n].modules));
        }

        var source = Mustache.render(tmpl, {
            'preamble': runtime.preamble,
            'epilogue': isStandalone ? runtime.epilogue : 'onmessage = handleMessage;',
            'mainClassName': util.titleCase(root.modelName),
            'models': compiledModels
        });
        if (isStandalone) {
            console.log(source);
            return;
        }
        var blob = new Blob([source], {type: 'text/javascript'});
        this.worker = new Worker(window.URL.createObjectURL(blob));
        blob = null;
        source = null;
        var _this = this;
        this.worker.addEventListener('message', function(e) {
            var id = e.data[0];
            var result = e.data[1];
            var deferred = _this.promised[id];
            delete _this.promised[id];
            if (deferred) {
                if (result[1])
                    deferred.reject(result[1]);
                else
                    deferred.resolve(result[0]);
            }
        });
    };
    Sim.prototype._process = function(model, modules) {
        var run_initials = [];
        var run_flows = [];
        var run_stocks = [];

        var isRef = function isRef(n) {
            var i;
            for (i = 0; i < modules.length; i++) {
                if (n in modules[i].refs)
                    return true;
            }
            return false;
        };

        var offsets = {};
        var runtimeOffsets = {};

        // decide which run lists each variable has to be, based on
        // its type and const-ness
        var n, v, off;
        for (n in model.vars) {
            v = model.vars[n];
            if (v instanceof vars.Module) {
                run_initials.push(v);
                run_flows.push(v);
                run_stocks.push(v);
            } else if (v instanceof vars.Stock) {
                run_initials.push(v);
                run_stocks.push(v);
            } else if (v instanceof vars.Table) {
                run_flows.push(v);
            } else if (v.isConst()) {
                run_initials.push(v);
                run_stocks.push(v);
            } else {
                run_flows.push(v);
            }

            if (!(v instanceof vars.Module) && !isRef(n)) {
                off = this.nextID(model);
                runtimeOffsets[n] = off;
                if (DEBUG)
                    offsets[n] = off + '/*' + n + '*/';
                else
                    offsets[n] = off;
            }
        }

        // stocks don't have to be sorted, since they can only depend
        // on values calculated in the flows phase.
        util.sort(run_initials);
        util.sort(run_flows);

        var initials = {};
        var tables = {};

        var ci = [], cf = [], cs = [];
        var i, eqn;
        // FIXME(bp) some auxiliaries are referred to in stock intial
        // equations, they need to be promoted into initials.
        for (i = 0; i < run_initials.length; i++) {
            v = run_initials[i];
            if (v instanceof vars.Module) {
                eqn = 'this.modules["' + v.name + '"].calcInitial(dt, curr);';
            } else {
                if (isRef(v.name))
                    continue;
                if (v.isConst())
                    initials[v.name] = parseFloat(v.eqn);
                eqn = "curr[" + offsets[v.name] + "] = " + vars.Variable.prototype.code.apply(v, [offsets]) + ';';
            }
            ci.push(eqn);
        }
        for (i = 0; i < run_flows.length; i++) {
            v = run_flows[i];
            eqn = null;
            if (v instanceof vars.Module)
                eqn = 'this.modules["' + v.name + '"].calcFlows(dt, curr);';
            else if (!isRef(v.name))
                eqn = "curr[" + offsets[v.name] + "] = " + v.code(offsets) + ';';
            if (!eqn)
                continue;
            cf.push(eqn);
        }
        for (i = 0; i < run_stocks.length; i++) {
            v = run_stocks[i];
            if (v instanceof vars.Module)
                cs.push('this.modules["' + v.name + '"].calcStocks(dt, curr, next);');
            else if (!v.hasOwnProperty('initial'))
                cs.push("next[" + offsets[v.name] + "] = curr[" + offsets[v.name] + '];');
            else
                cs.push("next[" + offsets[v.name] + "] = " + v.code(offsets) + ';');
        }
        for (n in model.tables) {
            tables[n] = {
                'x': model.tables[n].x,
                'y': model.tables[n].y,
            };
        }
        var additional = '';
        var init = [];
        if (Object.keys(model.modules).length) {
            // +1 for implicit time
            if (model.name === 'main')
                additional = ' + 1';
            init.push('var off = Object.keys(this.offsets).length' + additional + ';');
        }
        var mods = [];
        mods.push('{');
        var ref;
        for (n in model.modules) {
            init.push('var ' + n + 'Refs = {');
            for (ref in model.modules[n].refs)
                init.push('    "' + ref + '": "' + model.modules[n].refs[ref].ptr + '",');
            init.push('};');
            init.push('var ' + n + ' = new ' + util.titleCase(model.modules[n].modelName) + '("' + n + '", this, off, ' + n + 'Refs);');
            init.push('off += ' + n + '.nVars;');
            mods.push('    "' + n + '": ' + n + ',');
        }
        mods.push('}');

        return {
            'name': model.name,
            'className': util.titleCase(model.name),
            'isModule?': model.name !== 'main',
            'modules': mods.join(NLSP),
            'init': init.join(NLSP),
            'initialVals': JSON.stringify(initials, null, SP),
            'timespecVals': JSON.stringify(model.timespec, null, SP),
            'tableVals': JSON.stringify(tables, null, SP),
            'calcI': ci.join(NLSP),
            'calcF': cf.join(NLSP),
            'calcS': cs.join(NLSP),
            'offsets': JSON.stringify(runtimeOffsets, null, SP),
        };
    };
    Sim.prototype.nextID = function(model) {
        return this.idSeq[model.name]++;
    };
    Sim.prototype._post = function() {
        var id = this.seq++;
        var args = [id];
        var i;
        for (i = 0; i < arguments.length; i++)
            args.push(arguments[i]);

        var deferred = Q.defer();
        this.promised[id] = deferred;
        this.worker.postMessage(args);
        return deferred.promise;
    };
    Sim.prototype.close = function() {
        this.worker.terminate();
        this.worker = null;
    };
    Sim.prototype.reset = function() {
        return this._post('reset');
    };
    Sim.prototype.setValue = function(name, val) {
        return this._post('set_val', name, val);
    };
    Sim.prototype.value = function() {
        var args = ['get_val'].concat(Array.prototype.slice.call(arguments));
        return this._post.apply(this, args);
    };
    Sim.prototype.series = function() {
        var args = ['get_series'].concat(Array.prototype.slice.call(arguments));
        return this._post.apply(this, args);
    };
    Sim.prototype.runTo = function(time) {
        return this._post('run_to', time);
    };
    Sim.prototype.runToEnd = function() {
        return this._post('run_to_end');
    };
    Sim.prototype.setDesiredSeries = function(names) {
        return this._post('set_desired_series', names);
    };

    return {
        'Sim': Sim,
    };
});

// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define('model',['./util', './vars', './common', './draw', './sim'], function(util, vars, common, draw, sim) {
    

    var VAR_TYPES = util.set('module', 'stock', 'aux', 'flow');

    var Model = function Model(project, xmile) {
        this.project = project;
        this.xmile = xmile;
        this.name = util.eName(xmile['@name']);
        this._parseVars(xmile.variables);
        if (xmile.sim_specs)
            this._timespec = xmile.sim_specs;
        else
            this._timespec = null;
        util.normalizeTimespec(this._timespec);
        this.valid = true;
        return;
    };
    Model.prototype = {
        get timespec() {
            if (this._timespec)
                return this._timespec;
            else
                return this.project.timespec;
        }
    };

    /**
       Validates & figures out all necessary variable information.
    */
    Model.prototype._parseVars = function(defs) {
        this.vars     = {};
        this.tables   = {};
        this.modules  = {};
        var xmile;

        // JXON doesn't have the capacity to know when we really want
        // things to be lists, this is a workaround.
        var type;
        for (type in VAR_TYPES) {
            // for every known type, make sure we have a list of
            // elements even if there is only one element (e.g. a
            // module)
            if (defs[type] && !(defs[type] instanceof Array))
                defs[type] = [defs[type]];
        }

        var module;
        var i = 0;
        if (defs.module) {
            for (i = 0; i < defs.module.length; i++) {
                xmile = defs.module[i];
                module = new vars.Module(this.project, this, xmile);
                this.modules[module.name] = module;
                this.vars[module.name] = module;
            }
        }

        var stock;
        if (defs.stock) {
            for (i = 0; i < defs.stock.length; i++) {
                xmile = defs.stock[i];
                stock = new vars.Stock(this, xmile);
                this.vars[stock.name] = stock;
            }
        }

        var aux;
        if (defs.aux) {
            for (i = 0; i < defs.aux.length; i++) {
                xmile = defs.aux[i];
                if (xmile.gf) {
                    aux = new vars.Table(this, xmile);
                    this.tables[aux.name] = aux;
                } else {
                    aux = new vars.Variable(this, xmile);
                }
                this.vars[aux.name] = aux;
            }
        }

        var flow;
        if (defs.flow) {
            for (i = 0; i < defs.flow.length; i++) {
                xmile = defs.flow[i];
                if (xmile.gf) {
                    flow = new vars.Table(this, xmile);
                    this.tables[flow.name] = flow;
                } else {
                    flow = new vars.Variable(this, xmile);
                }
                this.vars[flow.name] = flow;
            }
        }
    };
    Model.prototype.lookup = function(id) {
        if (id[0] === '.')
            id = id.substr(1);
        if (id in this.vars)
            return this.vars[id];
        var parts = id.split('.');
        var nextModel = this.project.models[this.modules[parts[0]].modelName];
        return nextModel.lookup(parts.slice(1).join('.'));
    };
    Model.prototype.sim = function(isStandalone) {
        if (this.name === 'main')
            return new sim.Sim(this.project.main, isStandalone);
        else
            return new sim.Sim(new vars.Module(this.project, null, 'main', this.name), isStandalone);
    };
    Model.prototype.drawing = function(svgElementID, overrideColors, enableMousewheel) {
        return new draw.Drawing(this, this.xmile.views.view[0], svgElementID,
                                overrideColors, enableMousewheel);
    };

    return {
        'Model': Model
    };
});

// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define('jxon',[], function() {
    

    /*function isObject(v) {
        return typeof v === 'object';
    }*/

    function parseText(val) {
        val = val.trim();
        if (/^\s*$/.test(val))
            return null;
        if (/^(?:true|false)$/i.test(val))
            return val.toLowerCase() === 'true';
        if (isFinite(val))
            return parseFloat(val);
        return val;
    }

    function jxonBuild(parent) {
        var result = true;
        var collectedText = '';
        var len = 0, i = 0;
        var attrib, node, prop, content;

        if (parent.hasAttributes()) {
            result = {};
            for (len = 0; len < parent.attributes.length; len++) {
                attrib = parent.attributes.item(len);
                result['@' + attrib.name.toLowerCase()] = parseText(attrib.value);
            }
        }
        if (parent.hasChildNodes()) {
            for (i = 0; i < parent.childNodes.length; i++) {
                node = parent.childNodes.item(i);
                switch (node.nodeType) {
                case 4: // CData
                    collectedText += node.nodeValue;
                    break;
                case 3: // Text
                    collectedText += node.nodeValue.trim();
                    break;
                case 1: // Element
                    if (!len) {
                        result = {};
                        len++;
                    }
                    prop = node.nodeName.toLowerCase();
                    content = jxonBuild(node);
                    if (result.hasOwnProperty(prop)) {
                        if (!(result[prop] instanceof Array))
                            result[prop] = [result[prop]];
                        result[prop].push(content);
                    } else {
                        result[prop] = content;
                    }
                    break;
                }
            }
        }
        if (collectedText) {
            if (len)
                result.keyValue = collectedText;
            else
                result = parseText(collectedText);
        }
        return result;
    }
    function jxonUnbuild(/*obj*/) {

    }

    return {
        'JXON': {
            'build':   jxonBuild,
            'unbuild': jxonUnbuild,
        },
    };
});

// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define('compat',['./util'], function(util) {
    

    var VENDOR = 'SDLabs';
    var PRODUCT = 'sd.js';
    var VERSION = '0.1';

    var VAR_TYPES = util.set('module', 'stock', 'aux', 'flow');

    function iseeMatch(xmile) {
        return (/isee/i).test(xmile.header.vendor);
    }

    function iseeTranslate(xmile) {
        var i, j, mdl, type, display;
        for (i = 0; i < xmile.model.length; i++) {
            mdl = xmile.model[i];

            mdl.views = {};
            mdl.views.view = [];
            if (mdl.views) {
                mdl.views.view.push(mdl.display);
                delete mdl.display;
            }
            if (mdl.interface) {
                mdl.interface['@name'] = 'interface';
                mdl.views.view.push(mdl.interface);
                delete mdl.interface;
            }

            mdl.variables = {};
            for (type in VAR_TYPES) {
                if (!mdl[type])
                    continue;
                mdl.variables[type] = mdl[type];
                delete mdl[type];
                if (!(mdl.variables[type] instanceof Array))
                    mdl.variables[type] = [mdl.variables[type]];
                if (!mdl.views.view[0][type])
                    mdl.views.view[0][type] = [];
                for (j = 0; j < mdl.variables[type].length; j++) {
                    display = mdl.variables[type][j].display;
                    display['@name'] = mdl.variables[type][j]['@name'];
                    if ('label_side' in display) {
                        display['@label_side'] = display.label_side;
                        delete display.label_side;
                    }
                    mdl.views.view[0][type].push(display);
                    delete mdl.variables[type][j].display;
                }
            }
        }
        xmile.header.vendor = VENDOR;
        xmile.header.product = {
            '@version': VERSION,
            'keyValue': PRODUCT,
        };
        xmile.header.version = VERSION;

        return xmile;
    }

    return {
        isee: {
            match: iseeMatch,
            translate: iseeTranslate,
        },
    };
});

// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define('project',['./common', './util', './model', './vars', './jxon', './compat'],
       function(common, util, model, vars, jxon, compat) {
    

    var JXON = jxon.JXON;
    var errors = common.errors;

    // TODO(bp) macro support/warnings

    var Project = function(xmileDoc) {
        common.err = null;

        if (!xmileDoc || xmileDoc.getElementsByTagName('parsererror').length !== 0) {
            common.err = errors.ERR_VERSION;
            this.valid = false;
            return;
        }

        // in Chrome/Firefox, item 0 is xmile.  Under node's XML DOM
        // item 0 is the <xml> prefix.  And I guess there could be
        // text nodes in there, so just explictly look for xmile
        var i = 0;
        while (i < xmileDoc.childNodes.length &&
               xmileDoc.childNodes.item(i).tagName !== 'xmile')
            i++;

        var xmile = JXON.build(xmileDoc.childNodes.item(i));

        if (!(xmile.model instanceof Array))
            xmile.model = [xmile.model];

        var n;
        for (n in compat) {
            if (compat[n].match(xmile))
                xmile = compat[n].translate(xmile);
        }

        if (xmile.header.smile['@version'] !== 1) {
            common.err = errors.ERR_VERSION;
            this.valid = false;
            return;
        }
        this.xmile = xmile;
        if (typeof xmile.header.name === 'string')
            this.name = xmile.header.name;
        else
            this.name = 'main project';

        // get our time info: start-time, end-time, dt, etc.
        this.timespec = xmile.sim_specs;
        if (!this.timespec) {
            this.valid = false;
            return;
        }
        util.normalizeTimespec(this.timespec);

        this.models = {};

        var mdl;
        for (i=0; i < xmile.model.length; i++) {
            mdl = xmile.model[i];
            if (!mdl['@name'])
                mdl['@name'] = 'main';
            this.models[mdl['@name']] = new model.Model(this, mdl);
        }
        this.main = new vars.Module(this, null, {'@name': 'main'});
        this.valid = true;
    };
    Project.prototype.model = function(name) {
        if (!name)
            name = 'main';
        return this.models[name];
    };

    return {
        'Project': Project,
    };
});

// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define('sd',['./common', './project', './model'], function(common, project, model) {
    

    var sd = {};

    sd.Project = project.Project;
    sd.Model = model.Model;
    /**
       Attempts to parse the given xml string describing an xmile
       model into a Model object, returning the Model on success, or
       null on error.  On error, a string describing what went wrong
       can be obtained by calling sd.error().

       @param xmlString A string containing a xmile model.
       @return A valid Model object on success, or null on error.
    */
    sd.newModel = function(xmlDoc) {
        var ctx = new sd.Project(xmlDoc);
        if (ctx.valid)
            return ctx.model();
        return null;
    };

    sd.load = function(url, cb, errCb) {
        var req = new XMLHttpRequest();
        req.onreadystatechange = function() {
            if (req.readyState !== 4)
                return;
            if (req.status >= 200 && req.status < 300) {
                var xml = req.responseXML;
                if (!xml)
                    xml = (new DOMParser()).parseFromString(req.responseText, 'application/xml');
                var mdl = sd.newModel(xml);
                cb(mdl);
            } else if (errCb) {
                errCb(req);
            }
        };
        req.open('GET', url, true);
        req.send();
    };

    sd.errors = common.errors;

    /**
       If newModel or a major operation (like creating a new sim from
       a model) fails, call sd.error() to get a string describing the
       error.  You can compare this to specific errors in sd.errors,
       or simply pass the error string to the user.  If an error
       hasn't occured, or if no information is available, error() will
       return null.

       @return A string error message, or null if one isn't available.
    */
    sd.error = function() {
        return common.err;
    };

    return sd;
});


    return require('sd');
}));
