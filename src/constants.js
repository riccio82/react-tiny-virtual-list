export var ALIGNMENT;
(function (ALIGNMENT) {
    ALIGNMENT["AUTO"] = "auto";
    ALIGNMENT["START"] = "start";
    ALIGNMENT["CENTER"] = "center";
    ALIGNMENT["END"] = "end";
})(ALIGNMENT || (ALIGNMENT = {}));
export var DIRECTION;
(function (DIRECTION) {
    DIRECTION["HORIZONTAL"] = "horizontal";
    DIRECTION["VERTICAL"] = "vertical";
})(DIRECTION || (DIRECTION = {}));
export var SCROLL_CHANGE_REASON;
(function (SCROLL_CHANGE_REASON) {
    SCROLL_CHANGE_REASON["OBSERVED"] = "observed";
    SCROLL_CHANGE_REASON["REQUESTED"] = "requested";
})(SCROLL_CHANGE_REASON || (SCROLL_CHANGE_REASON = {}));
export const scrollProp = {
    [DIRECTION.VERTICAL]: 'scrollTop',
    [DIRECTION.HORIZONTAL]: 'scrollLeft',
};
export const sizeProp = {
    [DIRECTION.VERTICAL]: 'height',
    [DIRECTION.HORIZONTAL]: 'width',
};
export const positionProp = {
    [DIRECTION.VERTICAL]: 'top',
    [DIRECTION.HORIZONTAL]: 'left',
};
export const marginProp = {
    [DIRECTION.VERTICAL]: 'marginTop',
    [DIRECTION.HORIZONTAL]: 'marginLeft',
};
export const oppositeMarginProp = {
    [DIRECTION.VERTICAL]: 'marginBottom',
    [DIRECTION.HORIZONTAL]: 'marginRight',
};
export const transformProp = {
    [DIRECTION.VERTICAL]: 'translateY',
    [DIRECTION.HORIZONTAL]: 'translateX',
};
