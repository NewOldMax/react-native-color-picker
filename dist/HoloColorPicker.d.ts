import React from "react";
import Slider from "@react-native-community/slider";
import { HsvColor, IPickerProps, Point2D } from "./typeHelpers";
type SliderProps = {
    onValueChange?: (value: number) => void;
    value?: number;
};
export interface IHoloPickerProps extends IPickerProps {
    sliderComponent?: React.Component<SliderProps>;
}
export type IHoloPickerState = {
    color: HsvColor;
    pickerSize: number;
};
export declare class HoloColorPicker extends React.PureComponent<IHoloPickerProps, IHoloPickerState> {
    private _layout;
    private _pageX;
    private _pageY;
    private _isRTL;
    private _pickerResponder;
    private pickerContainer;
    constructor(props: IHoloPickerProps, ctx: any);
    _getColor(): HsvColor;
    _onColorSelected(): void;
    _onOldColorSelected(): void;
    _onSValueChange(s: number): void;
    _onVValueChange(v: number): void;
    _onColorChange(color: {
        h: number;
        s: any;
        v: any;
    }): void;
    _onLayout(l: {
        nativeEvent: {
            layout: {
                width: number;
                height: number;
                x: number;
                y: number;
            };
        };
    }): void;
    _handleColorChange: ({ x, y }: Point2D) => boolean;
    _computeHValue(x: number, y: number): number;
    _hValueToRad(deg: number): number;
    _getSlider(): typeof Slider | any;
    getColor(): string;
    render(): React.JSX.Element;
}
export {};
//# sourceMappingURL=HoloColorPicker.d.ts.map