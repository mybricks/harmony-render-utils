import { AttributeUpdater } from "@ohos.arkui.modifier"
import type { MyBricks } from "../types";

type Style = Record<string, string | number | Resource>;
type Styles = Record<string, Style>;

interface MyBricksComponentBuilderParams {
  uid: string
  title?: string
  controller?: MyBricks.Controller
  data: MyBricks.Data
  events?: MyBricks.Events
  styles: Styles
  slots?: (params: MyBricks.SlotParams) => void
  slotsIO?: MyBricks.Any
  parentSlot?: MyBricks.SlotParams
}

class MyBricksColumnModifier implements AttributeModifier<ColumnAttribute> {
  style: Style;

  constructor(style: Style) {
    this.style = style;
  }

  applyNormalAttribute(instance: ColumnAttribute): void {
    const style = this.style;
    if (!style) {
      return;
    }
    // width
    instance.width(style.width);
    // height
    instance.height(style.height);
    // zIndex
    instance.zIndex(style.zIndex as number);
    // marginTop
    // marginBottom
    // marginLeft
    // marginRight
    instance.margin({
      top: style.marginTop,
      right: style.marginRight,
      bottom: style.marginBottom,
      left: style.marginLeft
    })
    // paddingTop
    // paddingRight
    // paddingBottom
    // paddingLeft
    instance.padding({
      top: style.paddingTop,
      right: style.paddingRight,
      bottom: style.paddingBottom,
      left: style.paddingLeft
    })
    // flex
    if (typeof style.flex === "number") {
      instance.flexGrow(style.flex as number)
      instance.flexShrink(1)
      instance.flexBasis("0%")
    } else {
      instance.flexShrink(0)
    }
    // position
    if (["absolute", "fixed"].includes(style.position as string)) {
      instance.position({
        top: style.top as number,
        left: style.left as number,
        right: style.right as number,
        bottom: style.bottom as number,
      })
    }
  }
}

@ObservedV2
class ColumnVisibilityController {
  @Trace visibility = Visibility.Visible;
  setVisibility = (visibility: Visibility) => {
    this.visibility = visibility
  }
}

@Builder
function Slot(params: MyBricks.SlotParams) {
}

interface CommonModifierParams {
  visibility: Visibility
}

class CommonModifier extends AttributeUpdater<CommonAttribute> {
  private _initModifier: CommonModifierParams;

  constructor(_initModifier: CommonModifierParams) {
    super();
    this._initModifier = _initModifier;
  }

  initializeModifier(instance: CommonAttribute): void {
    instance.visibility(this._initModifier.visibility)
  }
}


interface MyBricksModifierStyle {
  selector: string
  style: Style
  setUpdator: MyBricks.Any
}

class MyBricksModifier<T> extends AttributeUpdater<T> {
  private _context: MyBricks.Any = {}

  constructor(style: MyBricks.Any, uid?: string) {
    super()
    this._context.style = style
    this._context.selector = style.selector
    this._context.selectors = new Set<string>(style.selector)
    this._context.uid = uid || style.selector
  }

  initializeModifier(instance: T): void {
    // 注册更新事件
    this._context.update = (style: Style) => {
      this.updateNormalAttribute(instance, style)
    }

    this._context.style.setUpdator((selector: string, style: Style) => {
      if (selector === this._context.selector) {
        this.updateNormalAttribute(instance, style)
      }
    }, this._context.uid)
    this.updateNormalAttribute(instance, this._context.style.style)
  }

  setStyle(style: MyBricks.Any) {
    this._context.selector = style.selector

    style.setUpdator((selector: string, style: Style) => {
      if (selector === this._context.selector) {
        this._context.update(style)
      }
    }, this._context.uid)

    this._context.update(style.style)
  }

  updateNormalAttribute(instance: T, style: Style) {
  }
}

export {
  MyBricksColumnModifier, ColumnVisibilityController, Slot, CommonModifier, MyBricksModifier }

export type {
  MyBricksComponentBuilderParams, Style, Styles
}
