"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriangleColorPicker = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const tinycolor2_1 = __importDefault(require("tinycolor2"));
const utils_1 = require("./utils");
function makeRotationKey(props, angle) {
    const { rotationHackFactor } = props;
    if (rotationHackFactor < 1) {
        return undefined;
    }
    const key = Math.floor(angle * rotationHackFactor);
    return `r${key}`;
}
class TriangleColorPicker extends react_1.default.PureComponent {
    _layout;
    _pageX;
    _pageY;
    _isRTL;
    _pickerResponder;
    _changingHColor;
    pickerContainerRef;
    static defaultProps = {
        rotationHackFactor: 100,
    };
    constructor(props, ctx) {
        super(props, ctx);
        const state = {
            color: { h: 0, s: 1, v: 1 },
            pickerSize: null,
        };
        if (props.oldColor) {
            state.color = (0, tinycolor2_1.default)(props.oldColor).toHsv();
        }
        if (props.defaultColor) {
            state.color = (0, tinycolor2_1.default)(props.defaultColor).toHsv();
        }
        this.state = state;
        this._layout = { width: 0, height: 0, x: 0, y: 0 };
        this._pageX = 0;
        this._pageY = 0;
        this._onLayout = this._onLayout.bind(this);
        this._onSValueChange = this._onSValueChange.bind(this);
        this._onVValueChange = this._onVValueChange.bind(this);
        this._onColorSelected = this._onColorSelected.bind(this);
        this._onOldColorSelected = this._onOldColorSelected.bind(this);
        this._isRTL = react_native_1.I18nManager.isRTL;
        this._pickerResponder = (0, utils_1.createPanResponder)({
            onStart: ({ x, y }) => {
                const { s, v } = this._computeColorFromTriangle({ x, y });
                this._changingHColor = s > 1 || s < 0 || v > 1 || v < 0;
                this._handleColorChange({ x, y });
                return true;
            },
            onMove: this._handleColorChange,
        });
        this.pickerContainerRef = react_1.default.createRef(); // Create the ref here
    }
    _getColor() {
        const passedColor = typeof this.props.color === "string"
            ? (0, tinycolor2_1.default)(this.props.color).toHsv()
            : this.props.color;
        return passedColor || this.state.color;
    }
    _onColorSelected() {
        const { onColorSelected } = this.props;
        const color = (0, tinycolor2_1.default)(this._getColor()).toHexString();
        onColorSelected && onColorSelected(color);
    }
    _onOldColorSelected() {
        const { oldColor, onOldColorSelected } = this.props;
        const color = (0, tinycolor2_1.default)(oldColor);
        this.setState({ color: color.toHsv() });
        onOldColorSelected && onOldColorSelected(color.toHexString());
    }
    _onSValueChange(s) {
        const { h, v } = this._getColor();
        this._onColorChange({ h, s, v });
    }
    _onVValueChange(v) {
        const { h, s } = this._getColor();
        this._onColorChange({ h, s, v });
    }
    _onColorChange(color) {
        this.setState({ color });
        if (this.props.onColorChange) {
            this.props.onColorChange(color);
        }
    }
    _onLayout(l) {
        this._layout = l.nativeEvent.layout;
        const { width, height } = this._layout;
        const pickerSize = Math.min(width, height);
        if (this.state.pickerSize !== pickerSize) {
            this.setState({ pickerSize });
        }
        // layout.x, layout.y is always 0
        // we always measure because layout is the same even though picker is moved on the page
        react_native_1.InteractionManager.runAfterInteractions(() => {
            // measure only after (possible) animation ended
            this.pickerContainerRef.current &&
                this.pickerContainerRef.current.measure((x, y, width, height, pageX, pageY) => {
                    // picker position in the screen
                    this._pageX = pageX;
                    this._pageY = pageY;
                });
        });
    }
    _computeHValue(x, y) {
        const mx = this.state.pickerSize / 2;
        const my = this.state.pickerSize / 2;
        const dx = x - mx;
        const dy = y - my;
        const rad = Math.atan2(dx, dy) + Math.PI + Math.PI / 2;
        return ((rad * 180) / Math.PI) % 360;
    }
    _hValueToRad(deg) {
        const rad = (deg * Math.PI) / 180;
        return rad - Math.PI - Math.PI / 2;
    }
    getColor() {
        return (0, tinycolor2_1.default)(this._getColor()).toHexString();
    }
    _handleColorChange = ({ x, y }) => {
        if (this._changingHColor) {
            this._handleHColorChange({ x, y });
        }
        else {
            this._handleSVColorChange({ x, y });
        }
        return true;
    };
    _handleHColorChange({ x, y }) {
        const { s, v } = this._getColor();
        const marginLeft = (this._layout.width - this.state.pickerSize) / 2;
        const marginTop = (this._layout.height - this.state.pickerSize) / 2;
        const relativeX = x - this._pageX - marginLeft;
        const relativeY = y - this._pageY - marginTop;
        const h = this._computeHValue(relativeX, relativeY);
        this._onColorChange({ h, s, v });
    }
    _handleSVColorChange({ x, y }) {
        const { h, s: rawS, v: rawV } = this._computeColorFromTriangle({ x, y });
        const s = Math.min(Math.max(0, rawS), 1);
        const v = Math.min(Math.max(0, rawV), 1);
        this._onColorChange({ h, s, v });
    }
    _normalizeTriangleTouch(s, v, sRatio) {
        const CORNER_ZONE_SIZE = 0.12; // relative size to be considered as corner zone
        const NORMAL_MARGIN = 0.1; // relative triangle margin to be considered as touch in triangle
        const CORNER_MARGIN = 0.05; // relative triangle margin to be considered as touch in triangle in corner zone
        let margin = NORMAL_MARGIN;
        const posNS = v > 0 ? 1 - (1 - s) * sRatio : 1 - s * sRatio;
        const negNS = v > 0 ? s * sRatio : (1 - s) * sRatio;
        const ns = s > 1 ? posNS : negNS; // normalized s value according to ratio and s value
        const rightCorner = s > 1 - CORNER_ZONE_SIZE && v > 1 - CORNER_ZONE_SIZE;
        const leftCorner = ns < 0 + CORNER_ZONE_SIZE && v > 1 - CORNER_ZONE_SIZE;
        const topCorner = ns < 0 + CORNER_ZONE_SIZE && v < 0 + CORNER_ZONE_SIZE;
        if (rightCorner) {
            return { s, v };
        }
        if (leftCorner || topCorner) {
            margin = CORNER_MARGIN;
        }
        // color normalization according to margin
        s = s < 0 && ns > 0 - margin ? 0 : s;
        s = s > 1 && ns < 1 + margin ? 1 : s;
        v = v < 0 && v > 0 - margin ? 0 : v;
        v = v > 1 && v < 1 + margin ? 1 : v;
        return { s, v };
    }
    /**
     * Computes s, v from position (x, y). If position is outside of triangle,
     * it will return invalid values (greater than 1 or lower than 0)
     */
    _computeColorFromTriangle({ x, y }) {
        const { pickerSize } = this.state;
        const { triangleHeight, triangleWidth } = getPickerProperties(pickerSize);
        const left = pickerSize / 2 - triangleWidth / 2;
        const top = pickerSize / 2 - (2 * triangleHeight) / 3;
        // triangle relative coordinates
        const marginLeft = (this._layout.width - this.state.pickerSize) / 2;
        const marginTop = (this._layout.height - this.state.pickerSize) / 2;
        const relativeX = x - this._pageX - marginLeft - left;
        const relativeY = y - this._pageY - marginTop - top;
        // rotation
        const { h } = this._getColor();
        const deg = (h - 330 + 360) % 360; // starting angle is 330 due to comfortable calculation
        const rad = (deg * Math.PI) / 180;
        const center = {
            x: triangleWidth / 2,
            y: (2 * triangleHeight) / 3,
        };
        const rotated = (0, utils_1.rotatePoint)({ x: relativeX, y: relativeY }, rad, center);
        const line = (triangleWidth * rotated.y) / triangleHeight;
        const margin = triangleWidth / 2 - ((triangleWidth / 2) * rotated.y) / triangleHeight;
        const s = (rotated.x - margin) / line;
        const v = rotated.y / triangleHeight;
        // normalize
        const normalized = this._normalizeTriangleTouch(s, v, line / triangleHeight);
        return { h, s: normalized.s, v: normalized.v };
    }
    render() {
        const { pickerSize } = this.state;
        const { oldColor, style } = this.props;
        const color = this._getColor();
        const { h } = color;
        const angle = this._hValueToRad(h);
        const selectedColor = (0, tinycolor2_1.default)(color).toHexString();
        const indicatorColor = (0, tinycolor2_1.default)({ h, s: 1, v: 1 }).toHexString();
        const computed = makeComputedStyles({
            pickerSize,
            selectedColorHsv: color,
            indicatorColor,
            angle,
            isRTL: this._isRTL,
        });
        // Hack for https://github.com/instea/react-native-color-picker/issues/17
        const rotationHack = makeRotationKey(this.props, angle);
        return (<react_native_1.View style={style}>
        <react_native_1.View onLayout={this._onLayout} ref={this.pickerContainerRef} style={styles.pickerContainer}>
          {!pickerSize ? null : (<react_native_1.View>
              <react_native_1.View key={rotationHack} style={[styles.triangleContainer, computed.triangleContainer]}>
                <react_native_1.View style={[
                    styles.triangleUnderlayingColor,
                    computed.triangleUnderlayingColor,
                ]}/>
                <react_native_1.Image style={[computed.triangleImage]} source={require("../resources/hsv_triangle_mask.png")}/>
              </react_native_1.View>
              <react_native_1.View {...this._pickerResponder.panHandlers} style={[computed.picker]} collapsable={false}>
                <react_native_1.Image source={require("../resources/color-circle.png")} resizeMode="contain" style={[styles.pickerImage]}/>
                <react_native_1.View key={rotationHack} style={[styles.pickerIndicator, computed.pickerIndicator]}>
                  <react_native_1.View style={[
                    styles.pickerIndicatorTick,
                    computed.pickerIndicatorTick,
                ]}/>
                </react_native_1.View>
                <react_native_1.View style={[styles.svIndicator, computed.svIndicator]}/>
              </react_native_1.View>
            </react_native_1.View>)}
        </react_native_1.View>
        {this.props.hideControls == true ? null : (<react_native_1.View style={[styles.colorPreviews, computed.colorPreviews]}>
            {oldColor && (<react_native_1.TouchableOpacity style={[styles.colorPreview, { backgroundColor: oldColor }]} onPress={this._onOldColorSelected} activeOpacity={0.7}/>)}
            <react_native_1.TouchableOpacity style={[styles.colorPreview, { backgroundColor: selectedColor }]} onPress={this._onColorSelected} activeOpacity={0.7}/>
          </react_native_1.View>)}
      </react_native_1.View>);
    }
}
exports.TriangleColorPicker = TriangleColorPicker;
function getPickerProperties(pickerSize) {
    const indicatorPickerRatio = 42 / 510; // computed from picker image
    const originalIndicatorSize = indicatorPickerRatio * pickerSize;
    const indicatorSize = originalIndicatorSize;
    const pickerPadding = originalIndicatorSize / 3;
    const triangleSize = pickerSize - 6 * pickerPadding;
    const triangleRadius = triangleSize / 2;
    const triangleHeight = (triangleRadius * 3) / 2;
    const triangleWidth = 2 * triangleRadius * Math.sqrt(3 / 4); // pythagorean theorem
    return {
        triangleSize,
        triangleRadius,
        triangleHeight,
        triangleWidth,
        indicatorPickerRatio,
        indicatorSize,
        pickerPadding,
    };
}
const makeComputedStyles = ({ indicatorColor, angle, pickerSize, selectedColorHsv, isRTL, }) => {
    const { triangleSize, triangleHeight, triangleWidth, indicatorSize, pickerPadding, } = getPickerProperties(pickerSize);
    /* ===== INDICATOR ===== */
    const indicatorRadius = pickerSize / 2 - indicatorSize / 2 - pickerPadding;
    const mx = pickerSize / 2;
    const my = pickerSize / 2;
    const dx = Math.cos(angle) * indicatorRadius;
    const dy = Math.sin(angle) * indicatorRadius;
    /* ===== TRIANGLE ===== */
    const triangleTop = pickerPadding * 3;
    const triangleLeft = pickerPadding * 3;
    const triangleAngle = -angle + Math.PI / 3;
    /* ===== SV INDICATOR ===== */
    const markerColor = "rgba(0,0,0,0.8)";
    const { s, v, h } = selectedColorHsv;
    const svIndicatorSize = 18;
    const svY = v * triangleHeight;
    const margin = triangleWidth / 2 - v * (triangleWidth / 2);
    const svX = s * (triangleWidth - 2 * margin) + margin;
    const svIndicatorMarginLeft = (pickerSize - triangleWidth) / 2;
    const svIndicatorMarginTop = (pickerSize - (4 * triangleHeight) / 3) / 2;
    const deg = (h - 330 + 360) % 360; // starting angle is 330 due to comfortable calculation
    const rad = (deg * Math.PI) / 180;
    const center = { x: pickerSize / 2, y: pickerSize / 2 };
    const notRotatedPoint = {
        x: svIndicatorMarginTop + svY,
        y: svIndicatorMarginLeft + svX,
    };
    const svIndicatorPoint = (0, utils_1.rotatePoint)(notRotatedPoint, rad, center);
    return {
        picker: {
            padding: pickerPadding,
            width: pickerSize,
            height: pickerSize,
        },
        pickerIndicator: {
            top: mx + dx - indicatorSize / 2,
            [isRTL ? "right" : "left"]: my + dy - indicatorSize / 2,
            width: indicatorSize,
            height: indicatorSize,
            transform: [
                {
                    rotate: -angle + "rad",
                },
            ],
        },
        pickerIndicatorTick: {
            height: indicatorSize / 2,
            backgroundColor: markerColor,
        },
        svIndicator: {
            top: svIndicatorPoint.x - svIndicatorSize / 2,
            [isRTL ? "right" : "left"]: svIndicatorPoint.y - svIndicatorSize / 2,
            width: svIndicatorSize,
            height: svIndicatorSize,
            borderRadius: svIndicatorSize / 2,
            borderColor: markerColor,
        },
        triangleContainer: {
            width: triangleSize,
            height: triangleSize,
            transform: [
                {
                    rotate: triangleAngle + "rad",
                },
            ],
            top: triangleTop,
            left: triangleLeft,
        },
        triangleImage: {
            width: triangleWidth,
            height: triangleHeight,
        },
        triangleUnderlayingColor: {
            left: (triangleSize - triangleWidth) / 2,
            borderLeftWidth: triangleWidth / 2,
            borderRightWidth: triangleWidth / 2,
            borderBottomWidth: triangleHeight,
            borderBottomColor: indicatorColor,
        },
        colorPreviews: {
            height: pickerSize * 0.1, // responsive height
        },
    };
};
const styles = react_native_1.StyleSheet.create({
    pickerContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    pickerImage: {
        flex: 1,
        width: null,
        height: null,
    },
    pickerIndicator: {
        position: "absolute",
        alignItems: "center",
        justifyContent: "center",
    },
    triangleContainer: {
        position: "absolute",
        alignItems: "center",
    },
    triangleUnderlayingColor: {
        position: "absolute",
        top: 0,
        width: 0,
        height: 0,
        backgroundColor: "transparent",
        borderStyle: "solid",
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
    },
    pickerAlignment: {
        alignItems: "center",
    },
    svIndicator: {
        position: "absolute",
        borderWidth: 4,
    },
    pickerIndicatorTick: {
        width: 5,
    },
    colorPreviews: {
        flexDirection: "row",
    },
    colorPreview: {
        flex: 1,
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJpYW5nbGVDb2xvclBpY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9UcmlhbmdsZUNvbG9yUGlja2VyLnRzeCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxrREFBeUI7QUFDekIsK0NBUXFCO0FBQ3JCLDREQUFrQztBQUdsQyxtQ0FBeUQ7QUFFekQsU0FBUyxlQUFlLENBQUMsS0FBMkIsRUFBRSxLQUFhO0lBQ2pFLE1BQU0sRUFBRSxrQkFBa0IsRUFBRSxHQUFHLEtBQUssQ0FBQTtJQUVwQyxJQUFJLGtCQUFrQixHQUFHLENBQUMsRUFBRSxDQUFDO1FBQzNCLE9BQU8sU0FBUyxDQUFBO0lBQ2xCLENBQUM7SUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxDQUFBO0lBRWxELE9BQU8sSUFBSSxHQUFHLEVBQUUsQ0FBQTtBQUNsQixDQUFDO0FBWUQsTUFBYSxtQkFBb0IsU0FBUSxlQUFLLENBQUMsYUFHOUM7SUFDUyxPQUFPLENBQTBEO0lBQ2pFLE1BQU0sQ0FBUztJQUNmLE1BQU0sQ0FBUztJQUNmLE1BQU0sQ0FBVTtJQUNoQixnQkFBZ0IsQ0FBdUI7SUFDdkMsZUFBZSxDQUFVO0lBQ3pCLGtCQUFrQixDQUF3QjtJQUUzQyxNQUFNLENBQUMsWUFBWSxHQUF5QjtRQUNqRCxrQkFBa0IsRUFBRSxHQUFHO0tBQ3hCLENBQUM7SUFFRixZQUFZLEtBQTJCLEVBQUUsR0FBUTtRQUMvQyxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBRWpCLE1BQU0sS0FBSyxHQUFHO1lBQ1osS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDM0IsVUFBVSxFQUFFLElBQUk7U0FDakIsQ0FBQTtRQUVELElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25C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RixDQUFBO0FBQ0gsQ0FBQyxDQUFBO0FBRUQsTUFBTSxNQUFNLEdBQUcseUJBQVUsQ0FBQyxNQUFNLENBQUM7SUFDL0IsZUFBZSxFQUFFO1FBQ2YsSUFBSSxFQUFFLENBQUM7UUFDUCxVQUFVLEVBQUUsUUFBUTtRQUNwQixjQUFjLEVBQUUsUUFBUTtLQUN6QjtJQUNELFdBQVcsRUFBRTtRQUNYLElBQUksRUFBRSxDQUFDO1FBQ1AsS0FBSyxFQUFFLElBQUk7UUFDWCxNQUFNLEVBQUUsSUFBSTtLQUNiO0lBQ0QsZUFBZSxFQUFFO1FBQ2YsUUFBUSxFQUFFLFVBQVU7UUFDcEIsVUFBVSxFQUFFLFFBQVE7UUFDcEIsY0FBYyxFQUFFLFFBQVE7S0FDekI7SUFDRCxpQkFBaUIsRUFBRTtRQUNqQixRQUFRLEVBQUUsVUFBVTtRQUNwQixVQUFVLEVBQUUsUUFBUTtLQUNyQjtJQUNELHdCQUF3QixFQUFFO1FBQ3hCLFFBQVEsRUFBRSxVQUFVO1FBQ3BCLEdBQUcsRUFBRSxDQUFDO1FBQ04sS0FBSyxFQUFFLENBQUM7UUFDUixNQUFNLEVBQUUsQ0FBQztRQUNULGVBQWUsRUFBRSxhQUFhO1FBQzlCLFdBQVcsRUFBRSxPQUFPO1FBQ3BCLGVBQWUsRUFBRSxhQUFhO1FBQzlCLGdCQUFnQixFQUFFLGFBQWE7S0FDaEM7SUFDRCxlQUFlLEVBQUU7UUFDZixVQUFVLEVBQUUsUUFBUTtLQUNyQjtJQUNELFdBQVcsRUFBRTtRQUNYLFFBQVEsRUFBRSxVQUFVO1FBQ3BCLFdBQVcsRUFBRSxDQUFDO0tBQ2Y7SUFDRCxtQkFBbUIsRUFBRTtRQUNuQixLQUFLLEVBQUUsQ0FBQztLQUNUO0lBQ0QsYUFBYSxFQUFFO1FBQ2IsYUFBYSxFQUFFLEtBQUs7S0FDckI7SUFDRCxZQUFZLEVBQUU7UUFDWixJQUFJLEVBQUUsQ0FBQztLQUNSO0NBQ0YsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0IGZyb20gXCJyZWFjdFwiXG5pbXBvcnQge1xuICBJMThuTWFuYWdlcixcbiAgSW1hZ2UsXG4gIEludGVyYWN0aW9uTWFuYWdlcixcbiAgUGFuUmVzcG9uZGVySW5zdGFuY2UsXG4gIFN0eWxlU2hlZXQsXG4gIFRvdWNoYWJsZU9wYWNpdHksXG4gIFZpZXcsXG59IGZyb20gXCJyZWFjdC1uYXRpdmVcIlxuaW1wb3J0IHRpbnljb2xvciBmcm9tIFwidGlueWNvbG9yMlwiXG5cbmltcG9ydCB7IEhzdkNvbG9yLCBJUGlja2VyUHJvcHMsIFBvaW50MkQgfSBmcm9tIFwiLi90eXBlSGVscGVyc1wiXG5pbXBvcnQgeyBjcmVhdGVQYW5SZXNwb25kZXIsIHJvdGF0ZVBvaW50IH0gZnJvbSBcIi4vdXRpbHNcIlxuXG5mdW5jdGlvbiBtYWtlUm90YXRpb25LZXkocHJvcHM6IElUcmlhbmdsZVBpY2tlclByb3BzLCBhbmdsZTogbnVtYmVyKSB7XG4gIGNvbnN0IHsgcm90YXRpb25IYWNrRmFjdG9yIH0gPSBwcm9wc1xuXG4gIGlmIChyb3RhdGlvbkhhY2tGYWN0b3IgPCAxKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG5cbiAgY29uc3Qga2V5ID0gTWF0aC5mbG9vcihhbmdsZSAqIHJvdGF0aW9uSGFja0ZhY3RvcilcblxuICByZXR1cm4gYHIke2tleX1gXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSVRyaWFuZ2xlUGlja2VyUHJvcHMgZXh0ZW5kcyBJUGlja2VyUHJvcHMge1xuICByb3RhdGlvbkhhY2tGYWN0b3I/OiBudW1iZXI7XG4gIGhpZGVDb250cm9scz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCB0eXBlIElUcmlhbmdsZVBpY2tlclN0YXRlID0ge1xuICBjb2xvcjogSHN2Q29sb3I7XG4gIHBpY2tlclNpemU6IG51bWJlcjtcbn07XG5cbmV4cG9ydCBjbGFzcyBUcmlhbmdsZUNvbG9yUGlja2VyIGV4dGVuZHMgUmVhY3QuUHVyZUNvbXBvbmVudDxcbiAgSVRyaWFuZ2xlUGlja2VyUHJvcHMsXG4gIElUcmlhbmdsZVBpY2tlclN0YXRlXG4+IHtcbiAgcHJpdmF0ZSBfbGF5b3V0OiB7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyOyB4OiBudW1iZXI7IHk6IG51bWJlciB9O1xuICBwcml2YXRlIF9wYWdlWDogbnVtYmVyO1xuICBwcml2YXRlIF9wYWdlWTogbnVtYmVyO1xuICBwcml2YXRlIF9pc1JUTDogYm9vbGVhbjtcbiAgcHJpdmF0ZSBfcGlja2VyUmVzcG9uZGVyOiBQYW5SZXNwb25kZXJJbnN0YW5jZTtcbiAgcHJpdmF0ZSBfY2hhbmdpbmdIQ29sb3I6IGJvb2xlYW47XG4gIHByaXZhdGUgcGlja2VyQ29udGFpbmVyUmVmOiBSZWFjdC5SZWZPYmplY3Q8Vmlldz47XG5cbiAgcHVibGljIHN0YXRpYyBkZWZhdWx0UHJvcHM6IElUcmlhbmdsZVBpY2tlclByb3BzID0ge1xuICAgIHJvdGF0aW9uSGFja0ZhY3RvcjogMTAwLFxuICB9O1xuXG4gIGNvbnN0cnVjdG9yKHByb3BzOiBJVHJpYW5nbGVQaWNrZXJQcm9wcywgY3R4OiBhbnkpIHtcbiAgICBzdXBlcihwcm9wcywgY3R4KVxuXG4gICAgY29uc3Qgc3RhdGUgPSB7XG4gICAgICBjb2xvcjogeyBoOiAwLCBzOiAxLCB2OiAxIH0sXG4gICAgICBwaWNrZXJTaXplOiBudWxsLFxuICAgIH1cblxuICAgIGlmIChwcm9wcy5vbGRDb2xvcikge1xuICAgICAgc3RhdGUuY29sb3IgPSB0aW55Y29sb3IocHJvcHMub2xkQ29sb3IpLnRvSHN2KClcbiAgICB9XG5cbiAgICBpZiAocHJvcHMuZGVmYXVsdENvbG9yKSB7XG4gICAgICBzdGF0ZS5jb2xvciA9IHRpbnljb2xvcihwcm9wcy5kZWZhdWx0Q29sb3IpLnRvSHN2KClcbiAgICB9XG5cbiAgICB0aGlzLnN0YXRlID0gc3RhdGVcbiAgICB0aGlzLl9sYXlvdXQgPSB7IHdpZHRoOiAwLCBoZWlnaHQ6IDAsIHg6IDAsIHk6IDAgfVxuICAgIHRoaXMuX3BhZ2VYID0gMFxuICAgIHRoaXMuX3BhZ2VZID0gMFxuICAgIHRoaXMuX29uTGF5b3V0ID0gdGhpcy5fb25MYXlvdXQuYmluZCh0aGlzKVxuICAgIHRoaXMuX29uU1ZhbHVlQ2hhbmdlID0gdGhpcy5fb25TVmFsdWVDaGFuZ2UuYmluZCh0aGlzKVxuICAgIHRoaXMuX29uVlZhbHVlQ2hhbmdlID0gdGhpcy5fb25WVmFsdWVDaGFuZ2UuYmluZCh0aGlzKVxuICAgIHRoaXMuX29uQ29sb3JTZWxlY3RlZCA9IHRoaXMuX29uQ29sb3JTZWxlY3RlZC5iaW5kKHRoaXMpXG4gICAgdGhpcy5fb25PbGRDb2xvclNlbGVjdGVkID0gdGhpcy5fb25PbGRDb2xvclNlbGVjdGVkLmJpbmQodGhpcylcbiAgICB0aGlzLl9pc1JUTCA9IEkxOG5NYW5hZ2VyLmlzUlRMXG5cbiAgICB0aGlzLl9waWNrZXJSZXNwb25kZXIgPSBjcmVhdGVQYW5SZXNwb25kZXIoe1xuICAgICAgb25TdGFydDogKHsgeCwgeSB9KSA9PiB7XG4gICAgICAgIGNvbnN0IHsgcywgdiB9ID0gdGhpcy5fY29tcHV0ZUNvbG9yRnJvbVRyaWFuZ2xlKHsgeCwgeSB9KVxuICAgICAgICB0aGlzLl9jaGFuZ2luZ0hDb2xvciA9IHMgPiAxIHx8IHMgPCAwIHx8IHYgPiAxIHx8IHYgPCAwXG4gICAgICAgIHRoaXMuX2hhbmRsZUNvbG9yQ2hhbmdlKHsgeCwgeSB9KVxuXG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9LFxuICAgICAgb25Nb3ZlOiB0aGlzLl9oYW5kbGVDb2xvckNoYW5nZSxcbiAgICB9KVxuXG4gICAgdGhpcy5waWNrZXJDb250YWluZXJSZWYgPSBSZWFjdC5jcmVhdGVSZWYoKTsgLy8gQ3JlYXRlIHRoZSByZWYgaGVyZVxuICB9XG5cbiAgX2dldENvbG9yKCkge1xuICAgIGNvbnN0IHBhc3NlZENvbG9yID1cbiAgICAgIHR5cGVvZiB0aGlzLnByb3BzLmNvbG9yID09PSBcInN0cmluZ1wiXG4gICAgICAgID8gdGlueWNvbG9yKHRoaXMucHJvcHMuY29sb3IpLnRvSHN2KClcbiAgICAgICAgOiB0aGlzLnByb3BzLmNvbG9yXG4gICAgcmV0dXJuIHBhc3NlZENvbG9yIHx8IHRoaXMuc3RhdGUuY29sb3JcbiAgfVxuXG4gIF9vbkNvbG9yU2VsZWN0ZWQoKSB7XG4gICAgY29uc3QgeyBvbkNvbG9yU2VsZWN0ZWQgfSA9IHRoaXMucHJvcHNcbiAgICBjb25zdCBjb2xvciA9IHRpbnljb2xvcih0aGlzLl9nZXRDb2xvcigpKS50b0hleFN0cmluZygpXG4gICAgb25Db2xvclNlbGVjdGVkICYmIG9uQ29sb3JTZWxlY3RlZChjb2xvcilcbiAgfVxuXG4gIF9vbk9sZENvbG9yU2VsZWN0ZWQoKSB7XG4gICAgY29uc3QgeyBvbGRDb2xvciwgb25PbGRDb2xvclNlbGVjdGVkIH0gPSB0aGlzLnByb3BzXG4gICAgY29uc3QgY29sb3IgPSB0aW55Y29sb3Iob2xkQ29sb3IpXG4gICAgdGhpcy5zZXRTdGF0ZSh7IGNvbG9yOiBjb2xvci50b0hzdigpIH0pXG4gICAgb25PbGRDb2xvclNlbGVjdGVkICYmIG9uT2xkQ29sb3JTZWxlY3RlZChjb2xvci50b0hleFN0cmluZygpKVxuICB9XG5cbiAgX29uU1ZhbHVlQ2hhbmdlKHMpIHtcbiAgICBjb25zdCB7IGgsIHYgfSA9IHRoaXMuX2dldENvbG9yKClcbiAgICB0aGlzLl9vbkNvbG9yQ2hhbmdlKHsgaCwgcywgdiB9KVxuICB9XG5cbiAgX29uVlZhbHVlQ2hhbmdlKHYpIHtcbiAgICBjb25zdCB7IGgsIHMgfSA9IHRoaXMuX2dldENvbG9yKClcbiAgICB0aGlzLl9vbkNvbG9yQ2hhbmdlKHsgaCwgcywgdiB9KVxuICB9XG5cbiAgX29uQ29sb3JDaGFuZ2UoY29sb3IpIHtcbiAgICB0aGlzLnNldFN0YXRlKHsgY29sb3IgfSlcbiAgICBpZiAodGhpcy5wcm9wcy5vbkNvbG9yQ2hhbmdlKSB7XG4gICAgICB0aGlzLnByb3BzLm9uQ29sb3JDaGFuZ2UoY29sb3IpXG4gICAgfVxuICB9XG5cbiAgX29uTGF5b3V0KGwpIHtcbiAgICB0aGlzLl9sYXlvdXQgPSBsLm5hdGl2ZUV2ZW50LmxheW91dFxuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gdGhpcy5fbGF5b3V0XG4gICAgY29uc3QgcGlja2VyU2l6ZSA9IE1hdGgubWluKHdpZHRoLCBoZWlnaHQpXG4gICAgaWYgKHRoaXMuc3RhdGUucGlja2VyU2l6ZSAhPT0gcGlja2VyU2l6ZSkge1xuICAgICAgdGhpcy5zZXRTdGF0ZSh7IHBpY2tlclNpemUgfSlcbiAgICB9XG4gICAgLy8gbGF5b3V0LngsIGxheW91dC55IGlzIGFsd2F5cyAwXG4gICAgLy8gd2UgYWx3YXlzIG1lYXN1cmUgYmVjYXVzZSBsYXlvdXQgaXMgdGhlIHNhbWUgZXZlbiB0aG91Z2ggcGlja2VyIGlzIG1vdmVkIG9uIHRoZSBwYWdlXG4gICAgSW50ZXJhY3Rpb25NYW5hZ2VyLnJ1bkFmdGVySW50ZXJhY3Rpb25zKCgpID0+IHtcbiAgICAgIC8vIG1lYXN1cmUgb25seSBhZnRlciAocG9zc2libGUpIGFuaW1hdGlvbiBlbmRlZFxuICAgICAgdGhpcy5waWNrZXJDb250YWluZXJSZWYuY3VycmVudCAmJlxuICAgICAgICAodGhpcy5waWNrZXJDb250YWluZXJSZWYuY3VycmVudCBhcyBhbnkpLm1lYXN1cmUoXG4gICAgICAgICAgKHgsIHksIHdpZHRoLCBoZWlnaHQsIHBhZ2VYLCBwYWdlWSkgPT4ge1xuICAgICAgICAgICAgLy8gcGlja2VyIHBvc2l0aW9uIGluIHRoZSBzY3JlZW5cbiAgICAgICAgICAgIHRoaXMuX3BhZ2VYID0gcGFnZVhcbiAgICAgICAgICAgIHRoaXMuX3BhZ2VZID0gcGFnZVlcbiAgICAgICAgICB9XG4gICAgICAgIClcbiAgICB9KVxuICB9XG5cbiAgX2NvbXB1dGVIVmFsdWUoeDogbnVtYmVyLCB5OiBudW1iZXIpIHtcbiAgICBjb25zdCBteCA9IHRoaXMuc3RhdGUucGlja2VyU2l6ZSAvIDJcbiAgICBjb25zdCBteSA9IHRoaXMuc3RhdGUucGlja2VyU2l6ZSAvIDJcbiAgICBjb25zdCBkeCA9IHggLSBteFxuICAgIGNvbnN0IGR5ID0geSAtIG15XG4gICAgY29uc3QgcmFkID0gTWF0aC5hdGFuMihkeCwgZHkpICsgTWF0aC5QSSArIE1hdGguUEkgLyAyXG4gICAgcmV0dXJuICgocmFkICogMTgwKSAvIE1hdGguUEkpICUgMzYwXG4gIH1cblxuICBfaFZhbHVlVG9SYWQoZGVnOiBudW1iZXIpIHtcbiAgICBjb25zdCByYWQgPSAoZGVnICogTWF0aC5QSSkgLyAxODBcbiAgICByZXR1cm4gcmFkIC0gTWF0aC5QSSAtIE1hdGguUEkgLyAyXG4gIH1cblxuICBnZXRDb2xvcigpIHtcbiAgICByZXR1cm4gdGlueWNvbG9yKHRoaXMuX2dldENvbG9yKCkpLnRvSGV4U3RyaW5nKClcbiAgfVxuXG4gIF9oYW5kbGVDb2xvckNoYW5nZSA9ICh7IHgsIHkgfTogUG9pbnQyRCkgPT4ge1xuICAgIGlmICh0aGlzLl9jaGFuZ2luZ0hDb2xvcikge1xuICAgICAgdGhpcy5faGFuZGxlSENvbG9yQ2hhbmdlKHsgeCwgeSB9KVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9oYW5kbGVTVkNvbG9yQ2hhbmdlKHsgeCwgeSB9KVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlXG4gIH07XG5cbiAgX2hhbmRsZUhDb2xvckNoYW5nZSh7IHgsIHkgfTogUG9pbnQyRCkge1xuICAgIGNvbnN0IHsgcywgdiB9ID0gdGhpcy5fZ2V0Q29sb3IoKVxuICAgIGNvbnN0IG1hcmdpbkxlZnQgPSAodGhpcy5fbGF5b3V0LndpZHRoIC0gdGhpcy5zdGF0ZS5waWNrZXJTaXplKSAvIDJcbiAgICBjb25zdCBtYXJnaW5Ub3AgPSAodGhpcy5fbGF5b3V0LmhlaWdodCAtIHRoaXMuc3RhdGUucGlja2VyU2l6ZSkgLyAyXG4gICAgY29uc3QgcmVsYXRpdmVYID0geCAtIHRoaXMuX3BhZ2VYIC0gbWFyZ2luTGVmdFxuICAgIGNvbnN0IHJlbGF0aXZlWSA9IHkgLSB0aGlzLl9wYWdlWSAtIG1hcmdpblRvcFxuICAgIGNvbnN0IGggPSB0aGlzLl9jb21wdXRlSFZhbHVlKHJlbGF0aXZlWCwgcmVsYXRpdmVZKVxuICAgIHRoaXMuX29uQ29sb3JDaGFuZ2UoeyBoLCBzLCB2IH0pXG4gIH1cblxuICBfaGFuZGxlU1ZDb2xvckNoYW5nZSh7IHgsIHkgfSkge1xuICAgIGNvbnN0IHsgaCwgczogcmF3UywgdjogcmF3ViB9ID0gdGhpcy5fY29tcHV0ZUNvbG9yRnJvbVRyaWFuZ2xlKHsgeCwgeSB9KVxuICAgIGNvbnN0IHMgPSBNYXRoLm1pbihNYXRoLm1heCgwLCByYXdTKSwgMSlcbiAgICBjb25zdCB2ID0gTWF0aC5taW4oTWF0aC5tYXgoMCwgcmF3ViksIDEpXG4gICAgdGhpcy5fb25Db2xvckNoYW5nZSh7IGgsIHMsIHYgfSlcbiAgfVxuXG4gIF9ub3JtYWxpemVUcmlhbmdsZVRvdWNoKHMsIHYsIHNSYXRpbykge1xuICAgIGNvbnN0IENPUk5FUl9aT05FX1NJWkUgPSAwLjEyIC8vIHJlbGF0aXZlIHNpemUgdG8gYmUgY29uc2lkZXJlZCBhcyBjb3JuZXIgem9uZVxuICAgIGNvbnN0IE5PUk1BTF9NQVJHSU4gPSAwLjEgLy8gcmVsYXRpdmUgdHJpYW5nbGUgbWFyZ2luIHRvIGJlIGNvbnNpZGVyZWQgYXMgdG91Y2ggaW4gdHJpYW5nbGVcbiAgICBjb25zdCBDT1JORVJfTUFSR0lOID0gMC4wNSAvLyByZWxhdGl2ZSB0cmlhbmdsZSBtYXJnaW4gdG8gYmUgY29uc2lkZXJlZCBhcyB0b3VjaCBpbiB0cmlhbmdsZSBpbiBjb3JuZXIgem9uZVxuICAgIGxldCBtYXJnaW4gPSBOT1JNQUxfTUFSR0lOXG5cbiAgICBjb25zdCBwb3NOUyA9IHYgPiAwID8gMSAtICgxIC0gcykgKiBzUmF0aW8gOiAxIC0gcyAqIHNSYXRpb1xuICAgIGNvbnN0IG5lZ05TID0gdiA+IDAgPyBzICogc1JhdGlvIDogKDEgLSBzKSAqIHNSYXRpb1xuICAgIGNvbnN0IG5zID0gcyA+IDEgPyBwb3NOUyA6IG5lZ05TIC8vIG5vcm1hbGl6ZWQgcyB2YWx1ZSBhY2NvcmRpbmcgdG8gcmF0aW8gYW5kIHMgdmFsdWVcblxuICAgIGNvbnN0IHJpZ2h0Q29ybmVyID0gcyA+IDEgLSBDT1JORVJfWk9ORV9TSVpFICYmIHYgPiAxIC0gQ09STkVSX1pPTkVfU0laRVxuICAgIGNvbnN0IGxlZnRDb3JuZXIgPSBucyA8IDAgKyBDT1JORVJfWk9ORV9TSVpFICYmIHYgPiAxIC0gQ09STkVSX1pPTkVfU0laRVxuICAgIGNvbnN0IHRvcENvcm5lciA9IG5zIDwgMCArIENPUk5FUl9aT05FX1NJWkUgJiYgdiA8IDAgKyBDT1JORVJfWk9ORV9TSVpFXG4gICAgaWYgKHJpZ2h0Q29ybmVyKSB7XG4gICAgICByZXR1cm4geyBzLCB2IH1cbiAgICB9XG4gICAgaWYgKGxlZnRDb3JuZXIgfHwgdG9wQ29ybmVyKSB7XG4gICAgICBtYXJnaW4gPSBDT1JORVJfTUFSR0lOXG4gICAgfVxuICAgIC8vIGNvbG9yIG5vcm1hbGl6YXRpb24gYWNjb3JkaW5nIHRvIG1hcmdpblxuICAgIHMgPSBzIDwgMCAmJiBucyA+IDAgLSBtYXJnaW4gPyAwIDogc1xuICAgIHMgPSBzID4gMSAmJiBucyA8IDEgKyBtYXJnaW4gPyAxIDogc1xuICAgIHYgPSB2IDwgMCAmJiB2ID4gMCAtIG1hcmdpbiA/IDAgOiB2XG4gICAgdiA9IHYgPiAxICYmIHYgPCAxICsgbWFyZ2luID8gMSA6IHZcbiAgICByZXR1cm4geyBzLCB2IH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wdXRlcyBzLCB2IGZyb20gcG9zaXRpb24gKHgsIHkpLiBJZiBwb3NpdGlvbiBpcyBvdXRzaWRlIG9mIHRyaWFuZ2xlLFxuICAgKiBpdCB3aWxsIHJldHVybiBpbnZhbGlkIHZhbHVlcyAoZ3JlYXRlciB0aGFuIDEgb3IgbG93ZXIgdGhhbiAwKVxuICAgKi9cbiAgX2NvbXB1dGVDb2xvckZyb21UcmlhbmdsZSh7IHgsIHkgfSkge1xuICAgIGNvbnN0IHsgcGlja2VyU2l6ZSB9ID0gdGhpcy5zdGF0ZVxuICAgIGNvbnN0IHsgdHJpYW5nbGVIZWlnaHQsIHRyaWFuZ2xlV2lkdGggfSA9IGdldFBpY2tlclByb3BlcnRpZXMocGlja2VyU2l6ZSlcblxuICAgIGNvbnN0IGxlZnQgPSBwaWNrZXJTaXplIC8gMiAtIHRyaWFuZ2xlV2lkdGggLyAyXG4gICAgY29uc3QgdG9wID0gcGlja2VyU2l6ZSAvIDIgLSAoMiAqIHRyaWFuZ2xlSGVpZ2h0KSAvIDNcblxuICAgIC8vIHRyaWFuZ2xlIHJlbGF0aXZlIGNvb3JkaW5hdGVzXG4gICAgY29uc3QgbWFyZ2luTGVmdCA9ICh0aGlzLl9sYXlvdXQud2lkdGggLSB0aGlzLnN0YXRlLnBpY2tlclNpemUpIC8gMlxuICAgIGNvbnN0IG1hcmdpblRvcCA9ICh0aGlzLl9sYXlvdXQuaGVpZ2h0IC0gdGhpcy5zdGF0ZS5waWNrZXJTaXplKSAvIDJcbiAgICBjb25zdCByZWxhdGl2ZVggPSB4IC0gdGhpcy5fcGFnZVggLSBtYXJnaW5MZWZ0IC0gbGVmdFxuICAgIGNvbnN0IHJlbGF0aXZlWSA9IHkgLSB0aGlzLl9wYWdlWSAtIG1hcmdpblRvcCAtIHRvcFxuXG4gICAgLy8gcm90YXRpb25cbiAgICBjb25zdCB7IGggfSA9IHRoaXMuX2dldENvbG9yKClcbiAgICBjb25zdCBkZWcgPSAoaCAtIDMzMCArIDM2MCkgJSAzNjAgLy8gc3RhcnRpbmcgYW5nbGUgaXMgMzMwIGR1ZSB0byBjb21mb3J0YWJsZSBjYWxjdWxhdGlvblxuICAgIGNvbnN0IHJhZCA9IChkZWcgKiBNYXRoLlBJKSAvIDE4MFxuICAgIGNvbnN0IGNlbnRlciA9IHtcbiAgICAgIHg6IHRyaWFuZ2xlV2lkdGggLyAyLFxuICAgICAgeTogKDIgKiB0cmlhbmdsZUhlaWdodCkgLyAzLFxuICAgIH1cbiAgICBjb25zdCByb3RhdGVkID0gcm90YXRlUG9pbnQoeyB4OiByZWxhdGl2ZVgsIHk6IHJlbGF0aXZlWSB9LCByYWQsIGNlbnRlcilcblxuICAgIGNvbnN0IGxpbmUgPSAodHJpYW5nbGVXaWR0aCAqIHJvdGF0ZWQueSkgLyB0cmlhbmdsZUhlaWdodFxuICAgIGNvbnN0IG1hcmdpbiA9XG4gICAgICB0cmlhbmdsZVdpZHRoIC8gMiAtICgodHJpYW5nbGVXaWR0aCAvIDIpICogcm90YXRlZC55KSAvIHRyaWFuZ2xlSGVpZ2h0XG4gICAgY29uc3QgcyA9IChyb3RhdGVkLnggLSBtYXJnaW4pIC8gbGluZVxuICAgIGNvbnN0IHYgPSByb3RhdGVkLnkgLyB0cmlhbmdsZUhlaWdodFxuXG4gICAgLy8gbm9ybWFsaXplXG4gICAgY29uc3Qgbm9ybWFsaXplZCA9IHRoaXMuX25vcm1hbGl6ZVRyaWFuZ2xlVG91Y2goXG4gICAgICBzLFxuICAgICAgdixcbiAgICAgIGxpbmUgLyB0cmlhbmdsZUhlaWdodFxuICAgIClcblxuICAgIHJldHVybiB7IGgsIHM6IG5vcm1hbGl6ZWQucywgdjogbm9ybWFsaXplZC52IH1cbiAgfVxuXG4gIHJlbmRlcigpIHtcbiAgICBjb25zdCB7IHBpY2tlclNpemUgfSA9IHRoaXMuc3RhdGVcbiAgICBjb25zdCB7IG9sZENvbG9yLCBzdHlsZSB9ID0gdGhpcy5wcm9wc1xuICAgIGNvbnN0IGNvbG9yID0gdGhpcy5fZ2V0Q29sb3IoKVxuICAgIGNvbnN0IHsgaCB9ID0gY29sb3JcbiAgICBjb25zdCBhbmdsZSA9IHRoaXMuX2hWYWx1ZVRvUmFkKGgpXG4gICAgY29uc3Qgc2VsZWN0ZWRDb2xvciA9IHRpbnljb2xvcihjb2xvcikudG9IZXhTdHJpbmcoKVxuICAgIGNvbnN0IGluZGljYXRvckNvbG9yID0gdGlueWNvbG9yKHsgaCwgczogMSwgdjogMSB9KS50b0hleFN0cmluZygpXG4gICAgY29uc3QgY29tcHV0ZWQgPSBtYWtlQ29tcHV0ZWRTdHlsZXMoe1xuICAgICAgcGlja2VyU2l6ZSxcbiAgICAgIHNlbGVjdGVkQ29sb3JIc3Y6IGNvbG9yLFxuICAgICAgaW5kaWNhdG9yQ29sb3IsXG4gICAgICBhbmdsZSxcbiAgICAgIGlzUlRMOiB0aGlzLl9pc1JUTCxcbiAgICB9KVxuICAgIC8vIEhhY2sgZm9yIGh0dHBzOi8vZ2l0aHViLmNvbS9pbnN0ZWEvcmVhY3QtbmF0aXZlLWNvbG9yLXBpY2tlci9pc3N1ZXMvMTdcbiAgICBjb25zdCByb3RhdGlvbkhhY2sgPSBtYWtlUm90YXRpb25LZXkodGhpcy5wcm9wcywgYW5nbGUpXG4gICAgcmV0dXJuIChcbiAgICAgIDxWaWV3IHN0eWxlPXtzdHlsZX0+XG4gICAgICAgIDxWaWV3XG4gICAgICAgICAgb25MYXlvdXQ9e3RoaXMuX29uTGF5b3V0fVxuICAgICAgICAgIHJlZj17dGhpcy5waWNrZXJDb250YWluZXJSZWZ9XG4gICAgICAgICAgc3R5bGU9e3N0eWxlcy5waWNrZXJDb250YWluZXJ9XG4gICAgICAgID5cbiAgICAgICAgICB7IXBpY2tlclNpemUgPyBudWxsIDogKFxuICAgICAgICAgICAgPFZpZXc+XG4gICAgICAgICAgICAgIDxWaWV3XG4gICAgICAgICAgICAgICAga2V5PXtyb3RhdGlvbkhhY2t9XG4gICAgICAgICAgICAgICAgc3R5bGU9e1tzdHlsZXMudHJpYW5nbGVDb250YWluZXIsIGNvbXB1dGVkLnRyaWFuZ2xlQ29udGFpbmVyXX1cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDxWaWV3XG4gICAgICAgICAgICAgICAgICBzdHlsZT17W1xuICAgICAgICAgICAgICAgICAgICBzdHlsZXMudHJpYW5nbGVVbmRlcmxheWluZ0NvbG9yLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZC50cmlhbmdsZVVuZGVybGF5aW5nQ29sb3IsXG4gICAgICAgICAgICAgICAgICBdfVxuICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgPEltYWdlXG4gICAgICAgICAgICAgICAgICBzdHlsZT17W2NvbXB1dGVkLnRyaWFuZ2xlSW1hZ2VdfVxuICAgICAgICAgICAgICAgICAgc291cmNlPXtyZXF1aXJlKFwiLi4vcmVzb3VyY2VzL2hzdl90cmlhbmdsZV9tYXNrLnBuZ1wiKX1cbiAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICA8L1ZpZXc+XG4gICAgICAgICAgICAgIDxWaWV3XG4gICAgICAgICAgICAgICAgey4uLnRoaXMuX3BpY2tlclJlc3BvbmRlci5wYW5IYW5kbGVyc31cbiAgICAgICAgICAgICAgICBzdHlsZT17W2NvbXB1dGVkLnBpY2tlcl19XG4gICAgICAgICAgICAgICAgY29sbGFwc2FibGU9e2ZhbHNlfVxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPEltYWdlXG4gICAgICAgICAgICAgICAgICBzb3VyY2U9e3JlcXVpcmUoXCIuLi9yZXNvdXJjZXMvY29sb3ItY2lyY2xlLnBuZ1wiKX1cbiAgICAgICAgICAgICAgICAgIHJlc2l6ZU1vZGU9XCJjb250YWluXCJcbiAgICAgICAgICAgICAgICAgIHN0eWxlPXtbc3R5bGVzLnBpY2tlckltYWdlXX1cbiAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgIDxWaWV3XG4gICAgICAgICAgICAgICAgICBrZXk9e3JvdGF0aW9uSGFja31cbiAgICAgICAgICAgICAgICAgIHN0eWxlPXtbc3R5bGVzLnBpY2tlckluZGljYXRvciwgY29tcHV0ZWQucGlja2VySW5kaWNhdG9yXX1cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8Vmlld1xuICAgICAgICAgICAgICAgICAgICBzdHlsZT17W1xuICAgICAgICAgICAgICAgICAgICAgIHN0eWxlcy5waWNrZXJJbmRpY2F0b3JUaWNrLFxuICAgICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkLnBpY2tlckluZGljYXRvclRpY2ssXG4gICAgICAgICAgICAgICAgICAgIF19XG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgIDwvVmlldz5cbiAgICAgICAgICAgICAgICA8VmlldyBzdHlsZT17W3N0eWxlcy5zdkluZGljYXRvciwgY29tcHV0ZWQuc3ZJbmRpY2F0b3JdfSAvPlxuICAgICAgICAgICAgICA8L1ZpZXc+XG4gICAgICAgICAgICA8L1ZpZXc+XG4gICAgICAgICAgKX1cbiAgICAgICAgPC9WaWV3PlxuICAgICAgICB7dGhpcy5wcm9wcy5oaWRlQ29udHJvbHMgPT0gdHJ1ZSA/IG51bGwgOiAoXG4gICAgICAgICAgPFZpZXcgc3R5bGU9e1tzdHlsZXMuY29sb3JQcmV2aWV3cywgY29tcHV0ZWQuY29sb3JQcmV2aWV3c119PlxuICAgICAgICAgICAge29sZENvbG9yICYmIChcbiAgICAgICAgICAgICAgPFRvdWNoYWJsZU9wYWNpdHlcbiAgICAgICAgICAgICAgICBzdHlsZT17W3N0eWxlcy5jb2xvclByZXZpZXcsIHsgYmFja2dyb3VuZENvbG9yOiBvbGRDb2xvciB9XX1cbiAgICAgICAgICAgICAgICBvblByZXNzPXt0aGlzLl9vbk9sZENvbG9yU2VsZWN0ZWR9XG4gICAgICAgICAgICAgICAgYWN0aXZlT3BhY2l0eT17MC43fVxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgKX1cbiAgICAgICAgICAgIDxUb3VjaGFibGVPcGFjaXR5XG4gICAgICAgICAgICAgIHN0eWxlPXtbc3R5bGVzLmNvbG9yUHJldmlldywgeyBiYWNrZ3JvdW5kQ29sb3I6IHNlbGVjdGVkQ29sb3IgfV19XG4gICAgICAgICAgICAgIG9uUHJlc3M9e3RoaXMuX29uQ29sb3JTZWxlY3RlZH1cbiAgICAgICAgICAgICAgYWN0aXZlT3BhY2l0eT17MC43fVxuICAgICAgICAgICAgLz5cbiAgICAgICAgICA8L1ZpZXc+XG4gICAgICAgICl9XG4gICAgICA8L1ZpZXc+XG4gICAgKVxuICB9XG59XG5cbmZ1bmN0aW9uIGdldFBpY2tlclByb3BlcnRpZXMocGlja2VyU2l6ZSkge1xuICBjb25zdCBpbmRpY2F0b3JQaWNrZXJSYXRpbyA9IDQyIC8gNTEwIC8vIGNvbXB1dGVkIGZyb20gcGlja2VyIGltYWdlXG4gIGNvbnN0IG9yaWdpbmFsSW5kaWNhdG9yU2l6ZSA9IGluZGljYXRvclBpY2tlclJhdGlvICogcGlja2VyU2l6ZVxuICBjb25zdCBpbmRpY2F0b3JTaXplID0gb3JpZ2luYWxJbmRpY2F0b3JTaXplXG4gIGNvbnN0IHBpY2tlclBhZGRpbmcgPSBvcmlnaW5hbEluZGljYXRvclNpemUgLyAzXG5cbiAgY29uc3QgdHJpYW5nbGVTaXplID0gcGlja2VyU2l6ZSAtIDYgKiBwaWNrZXJQYWRkaW5nXG4gIGNvbnN0IHRyaWFuZ2xlUmFkaXVzID0gdHJpYW5nbGVTaXplIC8gMlxuICBjb25zdCB0cmlhbmdsZUhlaWdodCA9ICh0cmlhbmdsZVJhZGl1cyAqIDMpIC8gMlxuICBjb25zdCB0cmlhbmdsZVdpZHRoID0gMiAqIHRyaWFuZ2xlUmFkaXVzICogTWF0aC5zcXJ0KDMgLyA0KSAvLyBweXRoYWdvcmVhbiB0aGVvcmVtXG5cbiAgcmV0dXJuIHtcbiAgICB0cmlhbmdsZVNpemUsXG4gICAgdHJpYW5nbGVSYWRpdXMsXG4gICAgdHJpYW5nbGVIZWlnaHQsXG4gICAgdHJpYW5nbGVXaWR0aCxcbiAgICBpbmRpY2F0b3JQaWNrZXJSYXRpbyxcbiAgICBpbmRpY2F0b3JTaXplLFxuICAgIHBpY2tlclBhZGRpbmcsXG4gIH1cbn1cblxuY29uc3QgbWFrZUNvbXB1dGVkU3R5bGVzID0gKHtcbiAgaW5kaWNhdG9yQ29sb3IsXG4gIGFuZ2xlLFxuICBwaWNrZXJTaXplLFxuICBzZWxlY3RlZENvbG9ySHN2LFxuICBpc1JUTCxcbn0pID0+IHtcbiAgY29uc3Qge1xuICAgIHRyaWFuZ2xlU2l6ZSxcbiAgICB0cmlhbmdsZUhlaWdodCxcbiAgICB0cmlhbmdsZVdpZHRoLFxuICAgIGluZGljYXRvclNpemUsXG4gICAgcGlja2VyUGFkZGluZyxcbiAgfSA9IGdldFBpY2tlclByb3BlcnRpZXMocGlja2VyU2l6ZSlcblxuICAvKiA9PT09PSBJTkRJQ0FUT1IgPT09PT0gKi9cbiAgY29uc3QgaW5kaWNhdG9yUmFkaXVzID0gcGlja2VyU2l6ZSAvIDIgLSBpbmRpY2F0b3JTaXplIC8gMiAtIHBpY2tlclBhZGRpbmdcbiAgY29uc3QgbXggPSBwaWNrZXJTaXplIC8gMlxuICBjb25zdCBteSA9IHBpY2tlclNpemUgLyAyXG4gIGNvbnN0IGR4ID0gTWF0aC5jb3MoYW5nbGUpICogaW5kaWNhdG9yUmFkaXVzXG4gIGNvbnN0IGR5ID0gTWF0aC5zaW4oYW5nbGUpICogaW5kaWNhdG9yUmFkaXVzXG5cbiAgLyogPT09PT0gVFJJQU5HTEUgPT09PT0gKi9cbiAgY29uc3QgdHJpYW5nbGVUb3AgPSBwaWNrZXJQYWRkaW5nICogM1xuICBjb25zdCB0cmlhbmdsZUxlZnQgPSBwaWNrZXJQYWRkaW5nICogM1xuICBjb25zdCB0cmlhbmdsZUFuZ2xlID0gLWFuZ2xlICsgTWF0aC5QSSAvIDNcblxuICAvKiA9PT09PSBTViBJTkRJQ0FUT1IgPT09PT0gKi9cbiAgY29uc3QgbWFya2VyQ29sb3IgPSBcInJnYmEoMCwwLDAsMC44KVwiXG4gIGNvbnN0IHsgcywgdiwgaCB9ID0gc2VsZWN0ZWRDb2xvckhzdlxuICBjb25zdCBzdkluZGljYXRvclNpemUgPSAxOFxuICBjb25zdCBzdlkgPSB2ICogdHJpYW5nbGVIZWlnaHRcbiAgY29uc3QgbWFyZ2luID0gdHJpYW5nbGVXaWR0aCAvIDIgLSB2ICogKHRyaWFuZ2xlV2lkdGggLyAyKVxuICBjb25zdCBzdlggPSBzICogKHRyaWFuZ2xlV2lkdGggLSAyICogbWFyZ2luKSArIG1hcmdpblxuICBjb25zdCBzdkluZGljYXRvck1hcmdpbkxlZnQgPSAocGlja2VyU2l6ZSAtIHRyaWFuZ2xlV2lkdGgpIC8gMlxuICBjb25zdCBzdkluZGljYXRvck1hcmdpblRvcCA9IChwaWNrZXJTaXplIC0gKDQgKiB0cmlhbmdsZUhlaWdodCkgLyAzKSAvIDJcblxuICBjb25zdCBkZWcgPSAoaCAtIDMzMCArIDM2MCkgJSAzNjAgLy8gc3RhcnRpbmcgYW5nbGUgaXMgMzMwIGR1ZSB0byBjb21mb3J0YWJsZSBjYWxjdWxhdGlvblxuICBjb25zdCByYWQgPSAoZGVnICogTWF0aC5QSSkgLyAxODBcbiAgY29uc3QgY2VudGVyID0geyB4OiBwaWNrZXJTaXplIC8gMiwgeTogcGlja2VyU2l6ZSAvIDIgfVxuICBjb25zdCBub3RSb3RhdGVkUG9pbnQgPSB7XG4gICAgeDogc3ZJbmRpY2F0b3JNYXJnaW5Ub3AgKyBzdlksXG4gICAgeTogc3ZJbmRpY2F0b3JNYXJnaW5MZWZ0ICsgc3ZYLFxuICB9XG4gIGNvbnN0IHN2SW5kaWNhdG9yUG9pbnQgPSByb3RhdGVQb2ludChub3RSb3RhdGVkUG9pbnQsIHJhZCwgY2VudGVyKVxuXG4gIHJldHVybiB7XG4gICAgcGlja2VyOiB7XG4gICAgICBwYWRkaW5nOiBwaWNrZXJQYWRkaW5nLFxuICAgICAgd2lkdGg6IHBpY2tlclNpemUsXG4gICAgICBoZWlnaHQ6IHBpY2tlclNpemUsXG4gICAgfSxcbiAgICBwaWNrZXJJbmRpY2F0b3I6IHtcbiAgICAgIHRvcDogbXggKyBkeCAtIGluZGljYXRvclNpemUgLyAyLFxuICAgICAgW2lzUlRMID8gXCJyaWdodFwiIDogXCJsZWZ0XCJdOiBteSArIGR5IC0gaW5kaWNhdG9yU2l6ZSAvIDIsXG4gICAgICB3aWR0aDogaW5kaWNhdG9yU2l6ZSxcbiAgICAgIGhlaWdodDogaW5kaWNhdG9yU2l6ZSxcbiAgICAgIHRyYW5zZm9ybTogW1xuICAgICAgICB7XG4gICAgICAgICAgcm90YXRlOiAtYW5nbGUgKyBcInJhZFwiLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9LFxuICAgIHBpY2tlckluZGljYXRvclRpY2s6IHtcbiAgICAgIGhlaWdodDogaW5kaWNhdG9yU2l6ZSAvIDIsXG4gICAgICBiYWNrZ3JvdW5kQ29sb3I6IG1hcmtlckNvbG9yLFxuICAgIH0sXG4gICAgc3ZJbmRpY2F0b3I6IHtcbiAgICAgIHRvcDogc3ZJbmRpY2F0b3JQb2ludC54IC0gc3ZJbmRpY2F0b3JTaXplIC8gMixcbiAgICAgIFtpc1JUTCA/IFwicmlnaHRcIiA6IFwibGVmdFwiXTogc3ZJbmRpY2F0b3JQb2ludC55IC0gc3ZJbmRpY2F0b3JTaXplIC8gMixcbiAgICAgIHdpZHRoOiBzdkluZGljYXRvclNpemUsXG4gICAgICBoZWlnaHQ6IHN2SW5kaWNhdG9yU2l6ZSxcbiAgICAgIGJvcmRlclJhZGl1czogc3ZJbmRpY2F0b3JTaXplIC8gMixcbiAgICAgIGJvcmRlckNvbG9yOiBtYXJrZXJDb2xvcixcbiAgICB9LFxuICAgIHRyaWFuZ2xlQ29udGFpbmVyOiB7XG4gICAgICB3aWR0aDogdHJpYW5nbGVTaXplLFxuICAgICAgaGVpZ2h0OiB0cmlhbmdsZVNpemUsXG4gICAgICB0cmFuc2Zvcm06IFtcbiAgICAgICAge1xuICAgICAgICAgIHJvdGF0ZTogdHJpYW5nbGVBbmdsZSArIFwicmFkXCIsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdG9wOiB0cmlhbmdsZVRvcCxcbiAgICAgIGxlZnQ6IHRyaWFuZ2xlTGVmdCxcbiAgICB9LFxuICAgIHRyaWFuZ2xlSW1hZ2U6IHtcbiAgICAgIHdpZHRoOiB0cmlhbmdsZVdpZHRoLFxuICAgICAgaGVpZ2h0OiB0cmlhbmdsZUhlaWdodCxcbiAgICB9LFxuICAgIHRyaWFuZ2xlVW5kZXJsYXlpbmdDb2xvcjoge1xuICAgICAgbGVmdDogKHRyaWFuZ2xlU2l6ZSAtIHRyaWFuZ2xlV2lkdGgpIC8gMixcbiAgICAgIGJvcmRlckxlZnRXaWR0aDogdHJpYW5nbGVXaWR0aCAvIDIsXG4gICAgICBib3JkZXJSaWdodFdpZHRoOiB0cmlhbmdsZVdpZHRoIC8gMixcbiAgICAgIGJvcmRlckJvdHRvbVdpZHRoOiB0cmlhbmdsZUhlaWdodCxcbiAgICAgIGJvcmRlckJvdHRvbUNvbG9yOiBpbmRpY2F0b3JDb2xvcixcbiAgICB9LFxuICAgIGNvbG9yUHJldmlld3M6IHtcbiAgICAgIGhlaWdodDogcGlja2VyU2l6ZSAqIDAuMSwgLy8gcmVzcG9uc2l2ZSBoZWlnaHRcbiAgICB9LFxuICB9XG59XG5cbmNvbnN0IHN0eWxlcyA9IFN0eWxlU2hlZXQuY3JlYXRlKHtcbiAgcGlja2VyQ29udGFpbmVyOiB7XG4gICAgZmxleDogMSxcbiAgICBhbGlnbkl0ZW1zOiBcImNlbnRlclwiLFxuICAgIGp1c3RpZnlDb250ZW50OiBcImNlbnRlclwiLFxuICB9LFxuICBwaWNrZXJJbWFnZToge1xuICAgIGZsZXg6IDEsXG4gICAgd2lkdGg6IG51bGwsXG4gICAgaGVpZ2h0OiBudWxsLFxuICB9LFxuICBwaWNrZXJJbmRpY2F0b3I6IHtcbiAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgIGFsaWduSXRlbXM6IFwiY2VudGVyXCIsXG4gICAganVzdGlmeUNvbnRlbnQ6IFwiY2VudGVyXCIsXG4gIH0sXG4gIHRyaWFuZ2xlQ29udGFpbmVyOiB7XG4gICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICBhbGlnbkl0ZW1zOiBcImNlbnRlclwiLFxuICB9LFxuICB0cmlhbmdsZVVuZGVybGF5aW5nQ29sb3I6IHtcbiAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgIHRvcDogMCxcbiAgICB3aWR0aDogMCxcbiAgICBoZWlnaHQ6IDAsXG4gICAgYmFja2dyb3VuZENvbG9yOiBcInRyYW5zcGFyZW50XCIsXG4gICAgYm9yZGVyU3R5bGU6IFwic29saWRcIixcbiAgICBib3JkZXJMZWZ0Q29sb3I6IFwidHJhbnNwYXJlbnRcIixcbiAgICBib3JkZXJSaWdodENvbG9yOiBcInRyYW5zcGFyZW50XCIsXG4gIH0sXG4gIHBpY2tlckFsaWdubWVudDoge1xuICAgIGFsaWduSXRlbXM6IFwiY2VudGVyXCIsXG4gIH0sXG4gIHN2SW5kaWNhdG9yOiB7XG4gICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICBib3JkZXJXaWR0aDogNCxcbiAgfSxcbiAgcGlja2VySW5kaWNhdG9yVGljazoge1xuICAgIHdpZHRoOiA1LFxuICB9LFxuICBjb2xvclByZXZpZXdzOiB7XG4gICAgZmxleERpcmVjdGlvbjogXCJyb3dcIixcbiAgfSxcbiAgY29sb3JQcmV2aWV3OiB7XG4gICAgZmxleDogMSxcbiAgfSxcbn0pXG4iXX0=