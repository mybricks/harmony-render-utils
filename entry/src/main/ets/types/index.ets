import { AnyType, AnyObjectType } from "./any"
import { Subject } from "../utils/mybricks"

export declare namespace MyBricks {
  type Any = AnyType

  /** 组件数据源 */
  type Data = AnyObjectType

  /** 事件参数 */
  type EventValue = Any

  /** 事件 */
  type Events = Any

  /** 组件控制器 */
  type Controller = Record<string, (value?: EventValue) => Record<string, Any>>

  /** 模块控制器 */
  interface ModuleController extends Record<string, (value: EventValue) => Record<string, Any>> {
    outputs: Any
  }

  interface ItemWrapParams {
    id: string
    inputs: Any
  }

  interface ItemWrapResult {
    wrap: WrappedBuilder<Any>
    params: Any
  }

  /** 调用插槽传参 */
  interface SlotParams {
    id: string
    inputValues?: Any
    style?: Any
    itemWrap?: (params: ItemWrapParams) => ItemWrapResult
    outputs?: Any;
  }

  /** 插槽传参 */
  type SlotParamsInputValues = Record<string, Any>

  /** 内置JS计算组件相关定义 */
  interface JSParams {
    data: Data
    inputs: string[]
    outputs: string[]
    title?: string;
  }

  type JSReturn = (...values: MyBricks.EventValue[]) => Record<string, MyBricks.EventValue>

  interface JSData {
    runImmediate: boolean
  }

  interface CodeParams extends JSParams {
    data: JSData
  }

  type Codes = Record<string, (params: CodeParams) => (...values: MyBricks.EventValue[]) => Record<string, MyBricks.EventValue>>

  interface _EnvCurrentScenes {
    close: () => void;
  }

  /** _env */
  interface _Env {
    currentScenes: _EnvCurrentScenes
  }

  interface  Env {
    callConnector: Any,
    appRouter: Any,
    globalVars: Any
  }

  interface Var {
    get: (value: Any) => Subject
    set: (value: Any) => Subject
    reset: (value: Any) => Subject
  }

  type Api = (value: Any, callBack?: Any) => Controller
}
