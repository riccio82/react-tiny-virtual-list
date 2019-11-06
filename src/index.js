import * as tslib_1 from "tslib";
import * as React from 'react';
import * as PropTypes from 'prop-types';
import SizeAndPositionManager from './SizeAndPositionManager';
import { ALIGNMENT, DIRECTION, SCROLL_CHANGE_REASON, marginProp, oppositeMarginProp, positionProp, scrollProp, sizeProp, transformProp, } from './constants';
export { DIRECTION as ScrollDirection } from './constants';
const STYLE_WRAPPER = {
    overflow: 'auto',
    willChange: 'transform',
    WebkitOverflowScrolling: 'touch',
};
const STYLE_INNER = {
    position: 'relative',
    width: '100%',
    minHeight: '100%',
};
const STYLE_ITEM = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
};
const STYLE_STICKY_ITEM = Object.assign({}, STYLE_ITEM, { position: 'sticky' });
export default class VirtualList extends React.PureComponent {
    constructor() {
        super(...arguments);
        this.itemSizeGetter = (itemSize) => {
            return index => this.getSize(index, itemSize);
        };
        this.sizeAndPositionManager = new SizeAndPositionManager({
            itemCount: this.props.itemCount,
            itemSizeGetter: this.itemSizeGetter(this.props.itemSize),
            estimatedItemSize: this.getEstimatedItemSize(),
        });
        this.state = {
            offset: this.props.scrollOffset ||
                (this.props.scrollToIndex != null &&
                    this.getOffsetForIndex(this.props.scrollToIndex)) ||
                0,
            scrollChangeReason: SCROLL_CHANGE_REASON.REQUESTED,
        };
        this.styleCache = {};
        this.getRootNodeRef = (node) => {
            this.rootNode = node;
        };
        this.getInnerNodeRef = (node) => {
            this.innerNode = node;
        };
        this.handleScroll = event => {
            const { onScroll } = this.props;
            const offset = this.getNodeOffset();
            if (offset < 0 ||
                // this.state.offset === offset ||
                event.target !== this.rootNode) {
                return;
            }
            this.setState({
                offset,
                scrollChangeReason: SCROLL_CHANGE_REASON.OBSERVED,
            });
            if (typeof onScroll === 'function') {
                onScroll(offset, event);
            }
        };
    }
    componentDidMount() {
        const { scrollOffset, scrollToIndex } = this.props;
        this.rootNode.addEventListener('scroll', this.handleScroll, {
            passive: true,
        });
        if (scrollOffset != null) {
            this.scrollTo(scrollOffset, true);
        }
        else if (scrollToIndex != null) {
            this.scrollTo(this.getOffsetForIndex(scrollToIndex), true);
        }
    }
    componentWillReceiveProps(nextProps) {
        const { estimatedItemSize, itemCount, itemSize, scrollOffset, scrollToAlignment, scrollToIndex, } = this.props;
        const scrollPropsHaveChanged = nextProps.scrollToIndex !== scrollToIndex ||
            nextProps.scrollToAlignment !== scrollToAlignment;
        const itemPropsHaveChanged = nextProps.itemCount !== itemCount ||
            nextProps.itemSize !== itemSize ||
            nextProps.estimatedItemSize !== estimatedItemSize;
        if (nextProps.itemSize !== itemSize) {
            this.sizeAndPositionManager.updateConfig({
                itemSizeGetter: this.itemSizeGetter(nextProps.itemSize),
            });
        }
        if (nextProps.itemCount !== itemCount ||
            nextProps.estimatedItemSize !== estimatedItemSize) {
            this.sizeAndPositionManager.updateConfig({
                itemCount: nextProps.itemCount,
                estimatedItemSize: this.getEstimatedItemSize(nextProps),
            });
        }
        if (itemPropsHaveChanged) {
            this.recomputeSizes();
        }
        if (nextProps.scrollOffset !== scrollOffset) {
            this.setState({
                offset: nextProps.scrollOffset || 0,
                scrollChangeReason: SCROLL_CHANGE_REASON.REQUESTED,
            });
        }
        else if (typeof nextProps.scrollToIndex === 'number' &&
            (scrollPropsHaveChanged || itemPropsHaveChanged)) {
            this.setState({
                offset: this.getOffsetForIndex(nextProps.scrollToIndex, nextProps.scrollToAlignment, nextProps.itemCount),
                scrollChangeReason: SCROLL_CHANGE_REASON.REQUESTED,
            });
        }
    }
    componentDidUpdate(_, prevState) {
        const { offset, scrollChangeReason } = this.state;
        if (prevState.offset !== offset &&
            scrollChangeReason === SCROLL_CHANGE_REASON.REQUESTED) {
            this.scrollTo(offset);
        }
    }
    componentWillUnmount() {
        this.rootNode.removeEventListener('scroll', this.handleScroll);
    }
    scrollTo(value, skipTransition = false) {
        const { scrollDirection = DIRECTION.VERTICAL } = this.props;
        // We use the FLIP technique to animate the scroll change.
        // See https://aerotwist.com/blog/flip-your-animations/ for more info.
        // Get the element's rect which will be used to determine how far the list
        // has scrolled once the scroll position has been set
        const preScrollRect = this.innerNode.getBoundingClientRect();
        // Scroll to the right position
        this.rootNode[scrollProp[scrollDirection]] = value;
        // Return early and perform no animation if forced, or no transition has
        // been passed
        if (skipTransition ||
            this.props.scrollToTransition === undefined ||
            this.innerNode.style.transition !== '') {
            return;
        }
        // The rect of the element after being scrolled lets us calculate the
        // distance it has travelled
        const postScrollRect = this.innerNode.getBoundingClientRect();
        const delta = preScrollRect[positionProp[scrollDirection]] -
            postScrollRect[positionProp[scrollDirection]];
        // Set `translateX` or `translateY` (depending on the scroll direction) in
        // order to move the element back to the original position before scrolling
        this.innerNode.style.transform = `${transformProp[scrollDirection]}(${delta}px)`;
        // Wait for the next frame, then add a transition to the element and move it
        // back to its current position. This makes the browser animate the
        // transform as if the element moved from its location pre-scroll to its
        // final location.
        requestAnimationFrame(() => {
            this.innerNode.style.transition = this.props.scrollToTransition || '';
            this.innerNode.style.transitionProperty = 'transform';
            this.innerNode.style.transform = '';
        });
        // We listen to the end of the transition in order to perform some cleanup
        const reset = () => {
            this.innerNode.style.transition = '';
            this.innerNode.style.transitionProperty = '';
            this.innerNode.removeEventListener('transitionend', reset);
        };
        this.innerNode.addEventListener('transitionend', reset);
    }
    getOffsetForIndex(index, scrollToAlignment = this.props.scrollToAlignment, itemCount = this.props.itemCount) {
        const { scrollDirection = DIRECTION.VERTICAL } = this.props;
        if (index < 0 || index >= itemCount) {
            index = 0;
        }
        return this.sizeAndPositionManager.getUpdatedOffsetForIndex({
            align: scrollToAlignment,
            containerSize: this.props[sizeProp[scrollDirection]],
            currentOffset: (this.state && this.state.offset) || 0,
            targetIndex: index,
        });
    }
    recomputeSizes(startIndex = 0) {
        this.styleCache = {};
        this.sizeAndPositionManager.resetItem(startIndex);
    }
    render() {
        const _a = this.props, { estimatedItemSize, height, overscanCount = 3, renderItem, itemCount, itemSize, onItemsRendered, onScroll, scrollDirection = DIRECTION.VERTICAL, scrollToTransition, scrollOffset, scrollToIndex, scrollToAlignment, stickyIndices, style, width } = _a, props = tslib_1.__rest(_a, ["estimatedItemSize", "height", "overscanCount", "renderItem", "itemCount", "itemSize", "onItemsRendered", "onScroll", "scrollDirection", "scrollToTransition", "scrollOffset", "scrollToIndex", "scrollToAlignment", "stickyIndices", "style", "width"]);
        const { offset } = this.state;
        const { start, stop } = this.sizeAndPositionManager.getVisibleRange({
            containerSize: this.props[sizeProp[scrollDirection]] || 0,
            offset,
            overscanCount,
        });
        const items = [];
        // const wrapperStyle = {...STYLE_WRAPPER, ...style, height, width};
        const innerStyle = Object.assign({}, STYLE_INNER, { [sizeProp[scrollDirection]]: this.sizeAndPositionManager.getTotalSize() });
        if (stickyIndices != null && stickyIndices.length !== 0) {
            stickyIndices.forEach((index) => items.push(renderItem({
                index,
                style: this.getStyle(index, true),
            })));
            if (scrollDirection === DIRECTION.HORIZONTAL) {
                innerStyle.display = 'flex';
            }
        }
        if (typeof start !== 'undefined' && typeof stop !== 'undefined') {
            for (let index = start; index <= stop; index++) {
                if (stickyIndices != null && stickyIndices.includes(index)) {
                    continue;
                }
                items.push(renderItem({
                    index,
                    style: this.getStyle(index, false),
                }));
            }
            if (typeof onItemsRendered === 'function') {
                onItemsRendered({
                    startIndex: start,
                    stopIndex: stop,
                });
            }
        }
        // @ts-ignore
        // @ts-ignore
        // @ts-ignore
        return (React.createElement("div", Object.assign({ ref: this.getRootNodeRef }, props, { onScroll: (e) => this.handleScroll(e), style: Object.assign({}, STYLE_WRAPPER, style, { height, width }) }),
            React.createElement("div", { ref: this.getInnerNodeRef, style: Object.assign({}, STYLE_INNER, { willChange: scrollToTransition === undefined ? null : 'transform', [sizeProp[scrollDirection]]: this.sizeAndPositionManager.getTotalSize() }) }, items)));
    }
    getNodeOffset() {
        const { scrollDirection = DIRECTION.VERTICAL } = this.props;
        return this.rootNode[scrollProp[scrollDirection]];
    }
    getEstimatedItemSize(props = this.props) {
        return (props.estimatedItemSize ||
            (typeof props.itemSize === 'number' && props.itemSize) ||
            50);
    }
    getSize(index, itemSize) {
        if (typeof itemSize === 'function') {
            return itemSize(index);
        }
        return Array.isArray(itemSize) ? itemSize[index] : itemSize;
    }
    getStyle(index, sticky) {
        const style = this.styleCache[index];
        if (style) {
            return style;
        }
        const { scrollDirection = DIRECTION.VERTICAL } = this.props;
        const { size, offset, } = this.sizeAndPositionManager.getSizeAndPositionForIndex(index);
        return (this.styleCache[index] = sticky
            ? Object.assign({}, STYLE_STICKY_ITEM, { [sizeProp[scrollDirection]]: size, [marginProp[scrollDirection]]: offset, [oppositeMarginProp[scrollDirection]]: -(offset + size), zIndex: 1 }) : Object.assign({}, STYLE_ITEM, { [sizeProp[scrollDirection]]: size, [positionProp[scrollDirection]]: offset }));
    }
}
VirtualList.defaultProps = {
    overscanCount: 3,
    scrollDirection: DIRECTION.VERTICAL,
    width: '100%',
};
VirtualList.propTypes = {
    estimatedItemSize: PropTypes.number,
    height: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
        .isRequired,
    itemCount: PropTypes.number.isRequired,
    itemSize: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.array,
        PropTypes.func,
    ]).isRequired,
    onScroll: PropTypes.func,
    onItemsRendered: PropTypes.func,
    overscanCount: PropTypes.number,
    renderItem: PropTypes.func.isRequired,
    scrollOffset: PropTypes.number,
    scrollToIndex: PropTypes.number,
    scrollToAlignment: PropTypes.oneOf([
        ALIGNMENT.AUTO,
        ALIGNMENT.START,
        ALIGNMENT.CENTER,
        ALIGNMENT.END,
    ]),
    scrollToTransition: PropTypes.string,
    scrollDirection: PropTypes.oneOf([
        DIRECTION.HORIZONTAL,
        DIRECTION.VERTICAL,
    ]),
    stickyIndices: PropTypes.arrayOf(PropTypes.number),
    style: PropTypes.object,
    width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};
