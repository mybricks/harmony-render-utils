import { context } from "./context"

const SUBJECT_NEXT = Symbol("SUBJECT_NEXT")
const SUBJECT_VALUE = Symbol("SUBJECT_VALUE")
const SUBJECT_SUBSCRIBE = Symbol("SUBJECT_SUBSCRIBE")
const SUBJECT_UNSUBSCRIBE = Symbol("SUBJECT_UNSUBSCRIBE")

const log = (...args) => {
  console.log("[MyBricks]", ...args)
}

const logger = {
  info: log,
  warn: log,
  error: log,
}

const EXE_TITLE_MAP = {
  output: "输出",
  input: "输入"
}

/** 数据流 */
export class Subject {
  _values = []
  _observers = new Set()
  _log = undefined

  constructor(params = {}) {
    this._log = params.log
    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) {
          return target[prop];
        }

        const subjectNext = new SubjectNext(prop)

        target[SUBJECT_SUBSCRIBE]((value) => {
          subjectNext[SUBJECT_NEXT](value)
        })

        return subjectNext
      }
    })
  }

  get [SUBJECT_VALUE]() {
    return this._values[0]
  }

  [SUBJECT_NEXT](value) {
    log(this._log, JSON.stringify(value))
    this._values[0] = value
    this._observers.forEach((observer) => observer(value))
  }

  [SUBJECT_SUBSCRIBE](observer) {
    if (this._values.length) {
      observer(this._values[0])
    }
    this._observers.add(observer)
  }

  [SUBJECT_UNSUBSCRIBE](observer) {
    this._observers.delete(observer)
  }
}

function getValueNextByPath(params) {
  const { value, path } = params
  let current = value
  for (const key of path) {
    if (current === null || current === undefined) {
      return undefined
    }
    current = current[key]
  }
  return current
}

class SubjectNext extends Subject {
  _path = []

  constructor(path) {
    super()

    this._path.push(path)

    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) {
          return target[prop];
        }

        target._path.push(prop)

        return target;
      }
    })
  }

  [SUBJECT_NEXT](value) {
    this._values[0] = value
    const nextValue = getValueNextByPath({ value, path: this._path })
    this._observers.forEach((observer) => observer(nextValue))
  }

  [SUBJECT_SUBSCRIBE](observer) {
    if (this._values.length) {
      observer(getValueNextByPath({ value: this._values[0], path: this._path }))
    }
    this._observers.add(observer)
  }
}

/** 合并数据流 */
export const merge = (...subjects) => {
  const merge = new Subject()

  subjects.forEach((subject) => {
    if (subject?.[SUBJECT_SUBSCRIBE]) {
      subject[SUBJECT_SUBSCRIBE]((value) => {
        merge[SUBJECT_NEXT](value)
      })
    } else {
      merge[SUBJECT_NEXT](subject)
    }
  })

  return merge
}

/** utils */
/**
 * 判断是否js多输入
 */
export const validateJsMultipleInputs = (input) => {
  return input.match(/\./); // input.xxx 为多输入模式
}

/** 组件的输入 */
const createReactiveInputHandler = (params) => {
  const { input, value, rels, title } = params;
  if (value?.[SUBJECT_SUBSCRIBE]) {
    value[SUBJECT_SUBSCRIBE]((value) => {
      input(value, new Proxy({}, {
        get(_, key) {
          return (value) => {
            (rels[key] ||
              (rels[key] = new Subject({ log: `${EXE_TITLE_MAP["output"]} ${title} | ${key}` })))[SUBJECT_NEXT](value)
          }
        }
      }))
    })
  } else {
    input(value, new Proxy({},
      {
        get(_, key) {
          return (value) => {
            (rels[key] ||
              (rels[key] = new Subject({ log: `${EXE_TITLE_MAP["output"]} ${title} | ${key}` })))[SUBJECT_NEXT](value)
          }
        }
      }
    ))
  }

  return new Proxy({},
    {
      get(_, key) {
        return rels[key] || (rels[key] = new Subject({ log: `${EXE_TITLE_MAP["output"]} ${title} | ${key}` }))
      }
    }
  )
}

const safeSetByPath = (params) => {
  const { data, path, value } = params;
  const nextIndex = path.length - 1;
  let current = data;
  let errorFlag = false;
  for (let i = 0; i < nextIndex; i++) {
    try {
      current = current[path[i]];
    } catch (error) {
      errorFlag = true;
      break;
    }
  }

  if (!errorFlag) {
    current[path[nextIndex]] = value;
  }
}

// UI
export const createInputsHandle = (params, init = false) => {
  if (init) {
    /** 注册的输入 */
    const _inputEvents = {}
    /** 输入未完成注册，写入todo列表 */
    const _inputEventsTodo = {}
    /** 组件基础信息 */
    const _comInfo = {}
    /** 全局 */
    const _context = {
      initStyles: {},
      initData: {},
    }

    const proxy = new Proxy({}, {
      get(_, key) {
        // 内置关键字
        if (key === "_inputEvents") {
          return _inputEvents;
        } else if (key === "_inputEventsTodo") {
          return _inputEventsTodo
        } else if (key === "_comInfo") {
          return _comInfo
        } else if (key === "_context") {
          return _context
        } else if (key === "_setStyle") {
          return (value0, value1) => {
            const next = (value) => {
              if (Object.prototype.toString.call(value) === "[object Object]") {
                Object.entries(value).forEach(([selector, nextStyle]) => {
                  if (!_context.styles) {
                    const { initStyles } = _context
                    if (!initStyles[selector]) {
                      initStyles[selector] = nextStyle
                    } else {
                      const initStyle = initStyles[selector]
                      Object.entries(nextStyle).forEach(([key, value]) => {
                        initStyle[key] = value
                      })
                    }
                    return
                  }
                  const { style } = _context.styles.getStyle(selector)
                  const updators = _context.styles.getUpdators(selector)

                  Object.entries(nextStyle).forEach(([key, value]) => {
                    style[key] = value
                  })

                  if (updators) {
                    updators.forEach((updator) => {
                      updator(selector, style)
                    })
                  }
                })
              }
            }

            if (typeof value0 === "string" && value1) {
              if (value1?.[SUBJECT_SUBSCRIBE]) {
                value1[SUBJECT_SUBSCRIBE]((value) => {
                  next({
                    [value0]: value
                  })
                })
              } else {
                next({
                  [value0]: value1
                })
              }
            } else {
              if (value0?.[SUBJECT_SUBSCRIBE]) {
                value0[SUBJECT_SUBSCRIBE]((value) => {
                  next(value)
                })
              } else {
                next(value0)
              }
            }
          }
        } else if (key === "_setData") {
          return (...args) => {
            if (args.length === 2) {
              const [path, value] = args

              const next = (params) => {
                const { path, value } = params
                if (!_context.data) {
                  const { initData } = _context
                  initData[path] = value
                  return
                }

                safeSetByPath({
                  data: _context.data,
                  path: path.split("."),
                  value
                })
              }

              if (value?.[SUBJECT_SUBSCRIBE]) {
                value0[SUBJECT_SUBSCRIBE]((value) => {
                  next({ value, path })
                })
              } else {
                next({ value, path })
              }
            }
          }
        }

        return (value) => {
          if (!_inputEvents[key]) {
            // 组件未完成输入注册
            if (!_inputEventsTodo[key]) {
              _inputEventsTodo[key] = []
            }

            const rels = {}

            _inputEventsTodo[key].push({
              value,
              rels,
            });

            return new Proxy({}, {
              get(_, key) {
                return rels[key] || (rels[key] = new Subject())
              }
            })
          }

          return createReactiveInputHandler({
            input(value, proxy) {
              log(`${EXE_TITLE_MAP["input"]} ${_comInfo.title} | ${key}`, JSON.stringify(value))
              return _inputEvents[key](value, proxy)
            },
            title: _comInfo.title,
            value,
            rels: {}
          })
        }
      }
    })

    return proxy;
  } else {
    if (!params.controller._context.inputs) {
      const { controller, title, styles } = params
      const { _inputEvents, _comInfo, _inputEventsTodo, _context } = controller
      _comInfo.title = title;
      _context.initModifier = {
        visibility: styles?.root?.display === "none" ? Visibility.None : Visibility.Visible
      }

      const createVisibilityHandler = (visibilityState) => {
        return (value) => {
          const setVisibility = () => {
            if (!_context.modifier?.attribute) {
              _context.initModifier.visibility = visibilityState
            } else {
              _context.modifier.attribute?.visibility(visibilityState)
            }
          }
          if (value?.[SUBJECT_SUBSCRIBE]) {
            value[SUBJECT_SUBSCRIBE](setVisibility);
          } else {
            setVisibility()
          }
        };
      };

      // 内置显示隐藏逻辑
      _inputEvents.show = createVisibilityHandler(Visibility.Visible)
      _inputEvents.hide = createVisibilityHandler(Visibility.None)
      _inputEvents.showOrHide = (value) => {
        const setVisibility = (value) => {
          if (!_context.modifier?.attribute) {
            _context.initModifier.visibility = !!value ? Visibility.Visible : Visibility.None
          } else {
            _context.modifier.attribute?.visibility(!!value ? Visibility.Visible : Visibility.None)
          }
        }
        if (value?.[SUBJECT_SUBSCRIBE]) {
          value[SUBJECT_SUBSCRIBE](setVisibility)
        } else {
          setVisibility(value)
        }
      }
        // 处理显示隐藏todo项
      ["show", "hide", "showOrHide"].forEach((key) => {
        const todo = _inputEventsTodo[key]
        if (todo) {
          Reflect.deleteProperty(_inputEventsTodo, key)

          todo.forEach(({ value }) => {
            _inputEvents[key](value)
          })
        }
      })

      const proxy = new Proxy(controller, {
        get(_, key) {
          return (input) => {
            if (!_inputEvents[key]) {
              // 第一次注册，处理TODO
              if (_inputEventsTodo[key]) {
                _inputEventsTodo[key].forEach(({ value, rels }) => {
                  createReactiveInputHandler({
                    input(value, proxy) {
                      log(`${EXE_TITLE_MAP["input"]} ${title} | ${key}`, JSON.stringify(value))
                      return input(value, proxy)
                    },
                    title,
                    value,
                    rels
                  })
                })
                Reflect.deleteProperty(_inputEventsTodo, key)
              }
            }

            _inputEvents[key] = input
          }
        }
      })

      params.controller._context.inputs = proxy;
    }

    return params.controller._context.inputs
  }
}

// JS
export const createJSHandle = (fn, options) => {
  let controller

  const { props, env } = options

  const inputs = new Proxy({}, {
    getOwnPropertyDescriptor() {
      return {
        enumerable: true,
        configurable: true,
      }
    },
    ownKeys() {
      return props.inputs
    },
    get() {
      return (input) => {
        // 约定只有一个输入
        controller = input
      }
    }
  })

  const rels = {}

  const outputs = new Proxy({}, {
    getOwnPropertyDescriptor() {
      return {
        enumerable: true,
        configurable: true,
      }
    },
    ownKeys() {
      return props.outputs
    },
    get(_, key) {
      return (value) => {
        (rels[key] ||
          (rels[key] = new Subject({ log: `${EXE_TITLE_MAP["output"]} ${props.title} | ${key}` })))[SUBJECT_NEXT](value)
      }
    }
  })

  fn({
    data: props.data,
    inputs,
    outputs,
    logger,
    env
  })

  const isJsMultipleInputs = props.inputs[0]
    ? validateJsMultipleInputs(props.inputs[0])
    : false;

  const exeOutputs = new Proxy(
    {},
    {
      get(_, key) {
        return rels[key] || (rels[key] = new Subject({ log: `${EXE_TITLE_MAP["output"]} ${props.title} | ${key}` }))
      },
    },
  )

  const exe = (...args) => {
    if (args.length) {
      // 调用输入
      if (isJsMultipleInputs) {
        // 多输入模式
        const length = args.length;
        let valueAry = {};
        args.forEach((value, index) => {
          if (value?.[SUBJECT_SUBSCRIBE]) {
            value[SUBJECT_SUBSCRIBE]((value) => {
              log(`${EXE_TITLE_MAP["input"]} ${props.title} | ${props.inputs[index]}`, JSON.stringify(value));
              valueAry[props.inputs[index]] = value
              if (Object.keys(valueAry).length === length) {
                createReactiveInputHandler({
                  input: controller,
                  value: valueAry,
                  rels,
                  title: props.title
                })
                // 触发输入后清除
                valueAry = {}
              }
            })
          } else {
            log(`${EXE_TITLE_MAP["input"]} ${props.title} | ${props.inputs[index]}`, JSON.stringify(value));
            valueAry[props.inputs[index]] = value

            if (Object.keys(valueAry).length === length) {
              createReactiveInputHandler({
                input: controller,
                value: valueAry,
                rels,
                title: props.title
              })
              // 触发输入后清除
              valueAry = {}
            }
          }
        })
      } else {
        // 非多输入
        const value = args[0]
        if (value?.[SUBJECT_SUBSCRIBE]) {
          value[SUBJECT_SUBSCRIBE]((value) => {
            log(`${EXE_TITLE_MAP["input"]} ${props.title} | ${props.inputs[0]}`, JSON.stringify(value));
            createReactiveInputHandler({
              input: controller,
              value,
              rels,
              title: props.title
            })
          })
        } else {
          log(`${EXE_TITLE_MAP["input"]} ${props.title} | ${props.inputs[0]}`, JSON.stringify(value));
          createReactiveInputHandler({
            input: controller,
            value,
            rels,
            title: props.title
          })
        }
      }
    }

    return exeOutputs;
  }

  return exe;
}

// 事件
export const createEventsHandle = (params) => {
  if (!params.controller._context.outputs) {
    params.controller._context.outputs = new Proxy(params.events || {}, {
      get(target, key) {
        const event = context.comEvent?.[params.uid]?.[key]
        if (event) {
          const { getVar } = params.controller._context
          return (value) => {
            event({
              getVar
            }, value)
          }
        }

        return target[key] || (() => {
        })
      }
    })
  }

  return params.controller._context.outputs
}

// 区块事件
export const createModuleEventsHandle = (events) => {
  return new Proxy(events, {
    get(_, key) {
      const event = events[key];

      if (event) {
        return (value) => {
          if (value?.[SUBJECT_SUBSCRIBE]) {
            value[SUBJECT_SUBSCRIBE]((value) => {
              events[key]?.(value)
            })
          } else {
            events[key]?.(value)
          }
        }
      }
    }
  })
}

// 场景打开、输出
export const pageController = () => {
  return new Proxy({
    commit: new Subject(),
    cancel: new Subject(),
    apply: new Subject(),
    close: new Subject(),
  }, {
    get(target, key) {
      return target[key]
    }
  })
}

export class Page {
  appRouter

  constructor(appRouter) {
    this.appRouter = appRouter
  }

  /** 获取当前页面入参 */
  getParams(name) {
    const params = this.appRouter.getParams(name)
    const subject = new Subject()
    subject[SUBJECT_NEXT](params?.value)
    return subject
  }

  /** 打开 */
  open(name, value) {
    const controller = pageController()

    if (value?.[SUBJECT_SUBSCRIBE]) {
      value[SUBJECT_SUBSCRIBE]((value) => {
        this.appRouter.push(name, { value, controller })
      })
    } else {
      this.appRouter.push(name, { value, controller })
    }

    return controller
  }

  /** 打开 */
  replace(name, value) {
    const controller = pageController()

    if (value?.[SUBJECT_SUBSCRIBE]) {
      value[SUBJECT_SUBSCRIBE]((value) => {
        this.appRouter.replace(name, { value, controller })
      })
    } else {
      this.appRouter.replace(name, { value, controller })
    }

    return controller
  }

  /** 确定 */
  commit(name, value) {
    const params = this.appRouter.getParams(name)

    setTimeout(() => {
      if (value?.[SUBJECT_SUBSCRIBE]) {
        value[SUBJECT_SUBSCRIBE]((value) => {
          params.controller.commit[SUBJECT_NEXT](value)
          this.appRouter.pop()
        })
      } else {
        params.controller.commit[SUBJECT_NEXT](value)
        this.appRouter.pop()
      }
    }, 100)
  }

  /** 取消 */
  cancel(name, value) {
    const params = this.appRouter.getParams(name)
    this.appRouter.pop()
    setTimeout(() => {
      if (value?.[SUBJECT_SUBSCRIBE]) {
        value[SUBJECT_SUBSCRIBE]((value) => {
          params.controller.cancel[SUBJECT_NEXT](value)
        })
      } else {
        params.controller.cancel[SUBJECT_NEXT](value)
      }
    }, 100)
  }

  /** 应用，不关闭 */
  apply(name, value) {
    const params = this.appRouter.getParams(name)
    if (value?.[SUBJECT_SUBSCRIBE]) {
      value[SUBJECT_SUBSCRIBE]((value) => {
        params.controller.apply[SUBJECT_NEXT](value)
      })
    } else {
      params.controller.apply[SUBJECT_NEXT](value)
    }
  }

  /** 关闭 */
  close(name, value) {
    const params = this.appRouter.getParams(name)
    setTimeout(() => {
      if (value?.[SUBJECT_SUBSCRIBE]) {
        value[SUBJECT_SUBSCRIBE]((value) => {
          params.controller.close[SUBJECT_NEXT](value)
          this.appRouter.pop()
        })
      } else {
        params.controller.close[SUBJECT_NEXT](value)
        this.appRouter.pop()
      }
    }, 100)
  }
}

// api
export const emit = (fn, value) => {
  const subject = new Subject()

  if (!fn) {
    return subject
  }

  if (value?.[SUBJECT_SUBSCRIBE]) {
    value[SUBJECT_SUBSCRIBE]((value) => {
      const res = fn(value)

      if (res instanceof Promise) {
        res.then((value) => {
          subject[SUBJECT_NEXT](value)
        })
      } else {
        subject[SUBJECT_NEXT](res)
      }
    })
  } else {
    const res = fn(value)

    if (res instanceof Promise) {
      res.then((value) => {
        subject[SUBJECT_NEXT](value)
      })
    } else {
      subject[SUBJECT_NEXT](res)
    }
  }

  return subject;
}

/** 创建变量 */
export const createVariable = (initValue) => {
  const value = new Subject()
  value[SUBJECT_NEXT](initValue)
  const ref = {
    value,
    valueChanges: new Set(),
    callBacksMap: new Map()
  }

  const variable = {
    /** 读取 */
    get(value) {
      const nextValue = new Subject()
      if (value?.[SUBJECT_SUBSCRIBE]) {
        value[SUBJECT_SUBSCRIBE](() => {
          nextValue[SUBJECT_NEXT](ref.value[SUBJECT_VALUE])
        })
      } else {
        nextValue[SUBJECT_NEXT](ref.value[SUBJECT_VALUE])
      }
      return nextValue
    },
    /** 赋值 */
    set(value) {
      const nextValue = new Subject()
      const next = (value) => {
        ref.value[SUBJECT_NEXT](value)
        ref.valueChanges.forEach((valueChange) => {
          valueChange(value)
        })
        nextValue[SUBJECT_NEXT](value)
      }
      if (value?.[SUBJECT_SUBSCRIBE]) {
        value[SUBJECT_SUBSCRIBE]((value) => {
          next(value)
        })
      } else {
        next(value)
      }
      return nextValue
    },
    /** 重置 */
    reset(value) {
      const nextValue = new Subject()
      const next = () => {
        ref.value[SUBJECT_NEXT](initValue)
        ref.valueChanges.forEach((valueChange) => {
          valueChange(initValue)
        })
        nextValue[SUBJECT_NEXT](initValue)
      }
      if (value?.[SUBJECT_SUBSCRIBE]) {
        value[SUBJECT_SUBSCRIBE](() => {
          next()
        })
      } else {
        next()
      }
      return nextValue
    },
    /** 值变更监听 */
    changed() {
      const subject = new Subject();

      const change = (value) => {
        subject[SUBJECT_NEXT](value)
      }

      ref.valueChanges.add(change);

      const result = {
        destroy() {
          ref.valueChanges.delete(change)
        },
        subscribe(next) {
          subject[SUBJECT_SUBSCRIBE](next)
        }
      }

      if (apiRun) {
        if (!apiRunVariablesSubject[apiRun]) {
          apiRunVariablesSubject[apiRun] = [result]
        } else {
          apiRunVariablesSubject[apiRun].push(result)
        }
      }

      return result
    },
    bind(callBack) {
      if (!ref.callBacksMap.has("")) {
        ref.callBacksMap.set("", new Set())
      }
      const callBacks = ref.callBacksMap.get("")
      callBacks.add(callBack)
      // 默认触发一次
      callBack(ref.value[SUBJECT_VALUE])
    },
    ext() {
      return {
        setValue(value) {
          variable.set(value)
        }
      }
    },
    registerChange(change) {
      ref.valueChanges.add(change)
    },
    unregisterChange(change) {
      ref.valueChanges.delete(change)
    }
  }

  return new Proxy({}, {
    get(_, key) {
      return variable[key]
    }
  })
}

/** 创建变量map */
export const createVars = (vars) => {
  return new Proxy(vars, {
    get(target, key) {
      const value = target[key]
      if (value) {
        return value.get()[SUBJECT_VALUE]
      }
      return value
    }
  })
}

/** 创建fx */
export const createFx = (fx) => {
  return (value, ...args) => {
    const outputs = {}

    const proxy = new Proxy({}, {
      get(_, key) {
        return outputs[key] || (outputs[key] = new Subject())
      }
    })

    const next = (value) => {
      const res = fx(value, ...args)
      if (res) {
        Object.entries(res).forEach(([key, value]) => {
          if (!outputs[key]) {
            outputs[key] = new Subject()
          }
          if (value?.[SUBJECT_SUBSCRIBE]) {
            value[SUBJECT_SUBSCRIBE]((value) => {
              outputs[key][SUBJECT_NEXT](value)
            })
          } else {
            outputs[key][SUBJECT_NEXT](value)
          }
        })
      }
    }

    if (value?.[SUBJECT_SUBSCRIBE]) {
      value[SUBJECT_SUBSCRIBE]((value) => {
        next(value)
      })
    } else {
      next(value)
    }

    return proxy
  }
}

/** 创建插槽IO */
export const createSlotsIO = (params) => {
  if (!params.controller._context.slotsIO) {
    const slotsIOMap = {}
    params.controller._context.slotsIO = new Proxy({}, {
      get(_, key) {
        if (!slotsIOMap[key]) {
          const inputsMap = {}
          slotsIOMap[key] = {
            inputs: new Proxy({}, {
              get(_, key) {
                if (!inputsMap[key]) {
                  inputsMap[key] = new Subject()
                }

                const next = (value) => {
                  inputsMap[key][SUBJECT_NEXT](value)
                }

                next[SUBJECT_SUBSCRIBE] = (next) => {
                  inputsMap[key][SUBJECT_SUBSCRIBE](next)
                }

                return next
              }
            }),
            outputs: new Proxy({}, {
              get(_, key) {
                return (next) => {
                  return (value) => {
                    if (value?.[SUBJECT_SUBSCRIBE]) {
                      value[SUBJECT_SUBSCRIBE]((value) => {
                        next(value)
                      })
                    } else {
                      next(value)
                    }
                  }
                }
              }
            })
          }
        }

        return slotsIOMap[key]
      }
    })
  }

  return params.controller._context.slotsIO
}

/**
 * 模块
 * [TODO] 暂时无法在多处使用关联输出项
 */
export const createModuleInputsHandle = () => {
  const inputsMap = {}
  const outputsMap = {}

  return new Proxy({}, {
    get(_, key) {
      if (key === "outputs") {
        return new Proxy({}, {
          get(_, key) {
            if (!outputsMap[key]) {
              outputsMap[key] = new Subject()
            }
            return (value) => {
              if (value?.[SUBJECT_SUBSCRIBE]) {
                value[SUBJECT_SUBSCRIBE]((value) => {
                  outputsMap[key][SUBJECT_NEXT](value)
                });
              } else {
                outputsMap[key][SUBJECT_NEXT](value)
              }
            }
          }
        })
      }

      if (!inputsMap[key]) {
        inputsMap[key] = new Subject()
      }

      const next = (value) => {
        if (value?.[SUBJECT_SUBSCRIBE]) {
          value[SUBJECT_SUBSCRIBE]((value) => {
            inputsMap[key][SUBJECT_NEXT](value)
          });
        } else {
          inputsMap[key][SUBJECT_NEXT](value)
        }

        return new Proxy({}, {
          get(_, key) {
            return outputsMap[key] || (outputsMap[key] = new Subject())
          }
        })
      }

      return new Proxy(next, {
        get(_, proxyKey) {
          if (proxyKey === "subscribe" || proxyKey === SUBJECT_SUBSCRIBE) {
            return (next) => {
              inputsMap[key][SUBJECT_SUBSCRIBE](next)
            }
          } else if (proxyKey === "value" || proxyKey === SUBJECT_VALUE) {
            return inputsMap[key][SUBJECT_VALUE]
          }
        }
      })
    }
  })
}

class Styles {
  styles = {}
  map = new Map()

  constructor(styles) {
    this.styles = styles
  }

  getStyle(selector) {
    let style = this.styles[selector]
    if (!style) {
      this.styles[selector] = {}
      style = this.styles[selector]
    }
    return {
      selector,
      style,
      setUpdator: (updator, uid) => {
        if (!this.map.has(selector)) {
          this.map.set(selector, new Map())
        }
        const selectorMap = this.map.get(selector)
        selectorMap.set(uid, updator)
      },
      ...style
    }
  }

  getUpdators(selector) {
    return this.map.get(selector)
  }
}

/**
 * 组件样式
 */
export const createStyles = (params) => {
  if (!params.controller._context.styles) {
    const initStyles = params.controller._context.initStyles
    const { styles, parentSlot } = params;
    Object.entries(initStyles).forEach(([selector, initStyle]) => {
      if (!styles[selector]) {
        styles[selector] = initStyle
      } else {
        const style = styles[selector]
        Object.entries(initStyle).forEach(([key, value]) => {
          style[key] = value
        })
      }
    })
    if (parentSlot?.itemWrap) {
      const { root, ...other } = styles
      params.controller._context.styles = new Styles(other)
    } else {
      params.controller._context.styles = new Styles(styles)
    }
  }

  return new Proxy({}, {
    ownKeys() {
      return Object.keys(params.styles)
    },
    getOwnPropertyDescriptor(k) {
      return {
        enumerable: true,
        configurable: true,
      }
    },
    get(_, key) {
      return params.controller._context.styles.getStyle(key)
    }
  })
}

/** [TODO] 记录API调用过程中变量的监听，调用回调后销毁 */
let apiRun = null;
let apiRunVariablesSubject = {};

/**
 * @returns {any}
 */
export const transformApi = (api) => {
  return (value, cb) => {
    const id = `${Math.random()}_${new Date().getTime()}`
    const outputs = {}
    const dispose = () => {

    }
    const proxy = new Proxy(dispose, {
      get(_, key) {
        return outputs[key] || (outputs[key] = new Subject())
      }
    })
    let isDispose = false;

    apiRun = id;

    const res = api(value)

    apiRun = null;

    if (res) {
      Object.entries(res).forEach(([key, value]) => {
        if (!outputs[key]) {
          outputs[key] = new Subject()
        }
        if (value?.[SUBJECT_SUBSCRIBE]) {
          value[SUBJECT_SUBSCRIBE]((value) => {
            if (isDispose) {
              return
            }
            isDispose = true
            outputs[key][SUBJECT_NEXT](value)
            cb?.[key]?.(value)
            apiRunVariablesSubject[id]?.forEach((subject) => {
              subject.destroy()
            })
          })
        } else {
          if (isDispose) {
            return
          }
          isDispose = true
          outputs[key][SUBJECT_NEXT](value)
          cb?.[key]?.(value)
          apiRunVariablesSubject[id]?.forEach((subject) => {
            subject.destroy()
          })
        }
      })
    }

    return proxy
  }
}

export const transformBus = (bus) => {
  return (newBus) => {
    Object.entries(newBus).forEach(([key, newBus]) => {
      bus[key] = (value) => {
        const outputs = {}

        const callBack = new Proxy({}, {
          get(_, key) {
            return (value) => {
              const output = outputs[key] || (outputs[key] = new Subject())
              output[SUBJECT_NEXT](value)
            }
          }
        })

        if (value?.[SUBJECT_SUBSCRIBE]) {
          value[SUBJECT_SUBSCRIBE]((value) => {
            newBus(value, callBack)
          })
        } else {
          newBus(value, callBack)
        }

        return new Proxy({}, {
          get(_, key) {
            return outputs[key] || (outputs[key] = new Subject())
          }
        })
      };
    })
  }
}

export const createBus = (bus) => {
  return () => {
    return new Proxy({}, {
      get() {
        return new Subject()
      }
    })
  }
}

export const join = (lastSubject, nextSubject) => {
  const subject = new Subject();
  const next = () => {
    if (nextSubject?.[SUBJECT_SUBSCRIBE]) {
      subject[SUBJECT_NEXT](nextSubject[SUBJECT_VALUE]);
    } else {
      subject[SUBJECT_NEXT](nextSubject);
    }
  }

  if (lastSubject?.[SUBJECT_SUBSCRIBE]) {
    lastSubject[SUBJECT_SUBSCRIBE](() => {
      next()
    });
  } else {
    next()
  }

  return subject;
};

export const createModifier = (params, Modifier) => {
  if (!params.controller._context.modifier) {
    params.controller._context.modifier = new Modifier(params.controller._context.initModifier);
  }
  return params.controller._context.modifier
}

export const createData = (params, Data) => {
  if (!params.controller._context.data) {
    const { initData } = params.controller._context
    const nextData = Object.assign({}, params.data)
    Object.entries(initData).forEach(([path, value]) => {
      safeSetByPath({
        data: nextData,
        path: path.split("."),
        value
      })
    })
    params.controller._context.data = new Data(nextData)
  }

  return params.controller._context.data
}

export function MyBricksDescriptor(params) {
  const { navigation, provider, vars } = params;

  return (target, key, descriptor) => {
    const originalMethod = descriptor.value
    descriptor.value = function (...args) {
      if (this.navigation?.navPathStack) {
        navigation.registConfig({
          navPathStack: this.navigation.navPathStack,
          entryRouter: this.navigation?.entryRouter
        })
      }
      if (this[provider]) {
        if (this.events) {
          this[provider].events = createModuleEventsHandle(this.events);
        }
        if (this.data) {
          this[provider].data = this.data;
        }
        if (this.controller) {
          this[provider].controller = this.controller;
        }

        const classProvider = this[provider]

        Object.getOwnPropertyNames(classProvider).forEach((key) => {
          const _context = classProvider[key]._context
          if (_context) {
            _context["this"] = this
            _context['getVar'] = (varName) => {
              const var0 = this[vars][varName]
              return var0.ext()
            }
          }
        })

      }
      const result = originalMethod.apply(this, args);
      return result
    }
    return descriptor
  }
}

export const onComEvent = (comEvent) => {
  context.comEvent = comEvent
}
