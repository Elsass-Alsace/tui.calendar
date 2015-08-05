/**
 * @fileoverview Handling creation events from drag handler and time grid view
 * @author NHN Ent. FE Development Team <e0242@nhnent.com>
 */
'use strict';

var util = global.ne.util;
var datetime = require('../../datetime');
var domutil = require('../../common/domutil');
var TimeCreationGuide = require('./creationGuide');
var timeCore = require('./core');

var parseViewIDRx = /^view-time-date[\s]view-(\d+)/;

/**
 * @constructor
 * @implements {Handler}
 * @mixes timeCore
 * @mixes CustomEvents
 * @param {Drag} [dragHandler] - Drag handler instance.
 * @param {TimeGrid} [timeGridView] - TimeGrid view instance.
 * @param {Base} [baseController] - Base controller instance.
 */
function TimeCreation(dragHandler, timeGridView, baseController) {
    /**
     * Drag handler instance.
     * @type {Drag}
     */
    this.dragHandler = null;

    /**
     * TimeGrid view instance.
     * @type {TimeGrid}
     */
    this.timeGridView = null;

    /**
     * Base controller instance.
     * @type {Base}
     */
    this.baseController = null;

    /**
     * @type {TimeCreationGuide}
     */
    // this._guide = new TimeCreationGuide(this);

    /**
     * Temporary function for single drag session's calc.
     * @type {function}
     */
    this._getEventDataFunc = null;

    /**
     * Temporary function for drag start data cache.
     * @type {object}
     */
    this._dragStart = null;

    if (arguments.length) {
        this.connect.apply(this, arguments);
    }
}

/**
 * Destroy method
 */
TimeCreation.prototype.destroy = function() {
    this._guide.destroy();
    this.dragHandler.off(this);
    this.dragHandler = this.timeGridView = this.baseController =
        this._getEventDataFunc = this._dragStart = this._guide = null;
};

/**
 * Connect handler, view, controllers for event creations.
 * @param {Drag} [dragHandler] - Drag handler instance.
 * @param {TimeGrid} [timeGridView] - TimeGrid view instance.
 * @param {Base} [baseController] - Base controller instance.
 */
TimeCreation.prototype.connect = function(dragHandler, timeGridView, baseController) {
    this.dragHandler = dragHandler;
    this.timeGridView = timeGridView;
    this.baseController = baseController;

    dragHandler.on({
        dragStart: this._onDragStart
    }, this);
};

/**
 * Check target element is expected condition for activate this plugins.
 * @param {HTMLElement} target - The element to check
 * @returns {(boolean|Time)} - return Time view instance when satiate condition.
 */
TimeCreation.prototype.checkExpectedCondition = function(target) {
    var cssClass = domutil.getClass(target),
        matches;

    if (cssClass === 'view-time-date-event-block') {
        target = target.parentNode;
        cssClass = domutil.getClass(target);
    }

    matches = cssClass.match(parseViewIDRx);

    if (!matches || matches.length < 2) {
        return false;
    }

    return util.pick(this.timeGridView.childs.items, matches[1]);
};

/**
 * Drag#dragStart event handler.
 * @emits TimeCreation#time_creation_dragstart
 * @param {object} dragStartEventData - Drag#dragStart event data.
 * @param {string} [overrideEventName] - override emitted event name when supplied.
 * @param {function} [revise] - supply function for revise event data before emit.
 */
TimeCreation.prototype._onDragStart = function(dragStartEventData, overrideEventName, revise) {
    var target = dragStartEventData.target,
        result = this.checkExpectedCondition(target),
        getEventDataFunc,
        eventData;

    if (!result) {
        return;
    }

    getEventDataFunc = this._getEventDataFunc = this._retriveEventData(result);
    eventData = this._dragStart = getEventDataFunc(dragStartEventData.originEvent);

    if (revise) {
        revise(eventData);
    }

    this.dragHandler.on({
        drag: this._onDrag,
        dragEnd: this._onDragEnd,
        click: this._onClick
    }, this);

    /**
     * @event TimeCreation#time_creation_dragstart
     * @type {object}
     * @property {Time} relatedView - time view instance related with mouse position.
     * @property {MouseEvent} originEvent - mouse event object.
     * @property {number} mouseY - mouse Y px mouse event.
     * @property {number} gridY - grid Y index value related with mouseY value.
     * @property {number} timeY - milliseconds value of mouseY points.
     * @property {number} nearestGridY - nearest grid index related with mouseY value.
     * @property {number} nearestGridTimeY - time value for nearestGridY.
     */
    this.fire(overrideEventName || 'time_creation_dragstart', eventData);
};

/**
 * Drag#drag event handler
 * @emits TimeCreation#time_creation_drag
 * @param {object} dragEventData - event data from Drag#drag.
 * @param {string} [overrideEventName] - override emitted event name when supplied.
 * @param {function} [revise] - supply function for revise event data before emit.
 */
TimeCreation.prototype._onDrag = function(dragEventData, overrideEventName, revise) {
    var getEventDataFunc = this._getEventDataFunc,
        eventData;

    if (!getEventDataFunc) {
        return;
    }

    eventData = getEventDataFunc(dragEventData.originEvent);
    eventData.nearestGridY += 0.5;

    if (revise) {
        revise(eventData);
    }

    /**
     * @event TimeCreation#time_creation_drag
     * @type {object}
     * @property {Time} relatedView - time view instance related with mouse position.
     * @property {MouseEvent} originEvent - mouse event object.
     * @property {number} mouseY - mouse Y px mouse event.
     * @property {number} gridY - grid Y index value related with mouseY value.
     * @property {number} timeY - milliseconds value of mouseY points.
     * @property {number} nearestGridY - nearest grid index related with mouseY value.
     * @property {number} nearestGridTimeY - time value for nearestGridY.
     */
    this.fire(overrideEventName || 'time_creation_drag', eventData);
};

/**
 * Drag#dragEnd event handler
 * @emits TimeCreation#time_creation_dragend
 * @param {object} dragEndEventData - event data from Drag#dragend
 */
TimeCreation.prototype._onDragEnd = function(dragEndEventData) {
    var dragStart = this._dragStart;

    this.dragHandler.off({
        drag: this._onDrag,
        dragEnd: this._onDragEnd,
        click: this._onClick
    }, this);

    function reviseFunc(eventData) {
        eventData.range = [
            dragStart.timeY,
            eventData.timeY + datetime.millisecondsFrom('hour', 0.5)
        ];
        eventData.nearestRange = [
            dragStart.nearestGridTimeY,
            eventData.nearestGridTimeY + datetime.millisecondsFrom('hour', 0.5)
        ];
    }

    /**
     * @event TimeCreation#time_creation_dragend
     * @type {object}
     * @property {Time} relatedView - time view instance related with mouse position.
     * @property {MouseEvent} originEvent - mouse event object.
     * @property {number} mouseY - mouse Y px mouse event.
     * @property {number} gridY - grid Y index value related with mouseY value.
     * @property {number} timeY - milliseconds value of mouseY points.
     * @property {number} nearestGridY - nearest grid index related with mouseY value.
     * @property {number} nearestGridTimeY - time value for nearestGridY.
     * @property {number[]} range - milliseconds range between drag start and end.
     * @property {number[]} nearestRange - milliseconds range related with nearestGridY between start and end.
     */
    this._onDrag(dragEndEventData, 'time_creation_dragend', reviseFunc);

    this._dragStart = this._getEventDataFunc = null;
};

/**
 * Drag#click event handler
 * @emits TimeCreation#time_creation_click
 * @param {object} clickEventData - event data from Drag#click.
 */
TimeCreation.prototype._onClick = function(clickEventData) {
    this.dragHandler.off({
        drag: this._onDrag,
        dragEnd: this._onDragEnd,
        click: this._onClick
    }, this);

    /**
     * @event TimeCreation#time_creation_click
     * @type {object}
     * @property {Time} relatedView - time view instance related with mouse position.
     * @property {MouseEvent} originEvent - mouse event object.
     * @property {number} mouseY - mouse Y px mouse event.
     * @property {number} gridY - grid Y index value related with mouseY value.
     * @property {number} timeY - milliseconds value of mouseY points.
     * @property {number} nearestGridY - nearest grid index related with mouseY value.
     * @property {number} nearestGridTimeY - time value for nearestGridY.
     */
    this._onDrag(clickEventData, 'time_creation_click');

    this._dragStart = this._getEventDataFunc = null;
};

timeCore.mixin(TimeCreation);
util.CustomEvents.mixin(TimeCreation);

module.exports = TimeCreation;
