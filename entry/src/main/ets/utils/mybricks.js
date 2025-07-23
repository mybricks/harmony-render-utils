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
  }

  get value() {
    return this._values[0]
  }

  next(value) {
    log(this._log, JSON.stringify(value))
    this._values[0] = value
    this._observers.forEach((observer) => observer(value))
  }

  subscribe(observer) {
    if (this._values.length) {
      observer(this._values[0])
    }
    this._observers.add(observer)
  }

  unsubscribe(observer) {
    this._observers.delete(observer)
  }
}

/** 合并数据流 */
export const mergeSubjects = (...subjects) => {
  const mergeSubject = new Subject()

  subjects.forEach((subject) => {
    subject.subscribe((value) => {
      mergeSubject.next(value)
    })
  })

  return mergeSubject
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
  if (value?.subscribe) {
    value.subscribe((value) => {
      input(value, new Proxy({}, {
        get(_, key) {
          return (value) => {
            (rels[key] ||
              (rels[key] = new Subject({ log: `${EXE_TITLE_MAP["output"]} ${title} | ${key}` }))).next(value)
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
              (rels[key] = new Subject({ log: `${EXE_TITLE_MAP["output"]} ${title} | ${key}` }))).next(value)
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

// UI
export const createInputsHandle = (that, init = false) => {
  if (init) {
    /** 注册的输入 */
    const _inputEvents = {}
    /** 输入未完成注册，写入todo列表 */
    const _inputEventsTodo = {}
    /** 组件基础信息 */
    const _comInfo = {}

    const proxy = new Proxy({}, {
      get(_, key) {
        // 内置关键字
        if (key === "_inputEvents") {
          return _inputEvents;
        } else if (key === "_inputEventsTodo") {
          return _inputEventsTodo
        } else if (key === "_comInfo") {
          return _comInfo
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
    const { controller, columnVisibilityController, title } = that
    const { _inputEvents, _comInfo } = controller
    _comInfo.title = title;

    // 内置显示隐藏逻辑
    _inputEvents.show = (value) => {
      if (value?.subscribe) {
        value.subscribe((value) => {
          columnVisibilityController.setVisibility(Visibility.Visible)
        });
      } else {
        columnVisibilityController.setVisibility(Visibility.Visible)
      }
    }
    _inputEvents.hide = (value) => {
      if (value?.subscribe) {
        value.subscribe((value) => {
          columnVisibilityController.setVisibility(Visibility.None)
        });
      } else {
        columnVisibilityController.setVisibility(Visibility.None)
      }
    }
    _inputEvents.showOrHide = (value) => {
      if (value?.subscribe) {
        value.subscribe((value) => {
          columnVisibilityController.setVisibility(!!value ? Visibility.Visible : Visibility.None)
        });
      } else {
        columnVisibilityController.setVisibility(!!value ? Visibility.Visible : Visibility.None)
      }
    }

    const proxy = new Proxy(controller, {
      get(_, key) {
        return (input) => {
          if (!_inputEvents[key]) {
            // 第一次注册，处理TODO
            const _inputEventsTodo = controller._inputEventsTodo
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

    return proxy
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
          (rels[key] = new Subject({ log: `${EXE_TITLE_MAP["output"]} ${props.title} | ${key}` }))).next(value)
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
          if (value?.subscribe) {
            value.subscribe((value) => {
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
        if (value?.subscribe) {
          value.subscribe((value) => {
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
  return new Proxy(params.events, {
    get(target, key) {
      return target[key] || (() => {
      })
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
    subject.next(params?.value)
    return subject
  }

  /** 打开 */
  open(name, value) {
    const controller = pageController()

    if (value?.subscribe) {
      value.subscribe((value) => {
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

    if (value?.subscribe) {
      value.subscribe((value) => {
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
    this.appRouter.pop()
    setTimeout(() => {
      params.controller.commit.next(value)
    }, 100)
  }

  /** 取消 */
  cancel(name, value) {
    const params = this.appRouter.getParams(name)
    this.appRouter.pop()
    setTimeout(() => {
      params.controller.cancel.next(value)
    }, 100)
  }

  /** 应用，不关闭 */
  apply(name, value) {
    const params = this.appRouter.getParams(name)
    params.controller.apply.next(value)
  }

  /** 关闭 */
  close(name, value) {
    const params = this.appRouter.getParams(name)
    this.appRouter.pop()
    setTimeout(() => {
      params.controller.close.next(value)
    }, 100)
  }
}

// api
export const emit = (fn, value) => {
  const subject = new Subject()

  if (!fn) {
    return subject
  }

  if (value?.subscribe) {
    value.subscribe((value) => {
      const res = fn(value)

      if (res instanceof Promise) {
        res.then((value) => {
          subject.next(value)
        })
      } else {
        subject.next(res)
      }
    })
  } else {
    const res = fn(value)

    if (res instanceof Promise) {
      res.then((value) => {
        subject.next(value)
      })
    } else {
      subject.next(res)
    }
  }

  return subject;
}

/** 创建变量 */
export const createVariable = (initValue, callBack) => {
  const value = new Subject()
  value.next(initValue)
  const ref = {
    value,
    valueChanges: new Set()
  }

  return {
    /** 读取 */
    get(value) {
      const nextValue = new Subject()
      if (value?.subscribe) {
        value.subscribe(() => {
          nextValue.next(ref.value.value)
        })
      } else {
        nextValue.next(ref.value.value)
      }
      return nextValue
    },
    /** 赋值 */
    set(value) {
      const nextValue = new Subject()
      const next = (value) => {
        ref.value.next(value)
        ref.valueChanges.forEach((valueChange) => {
          valueChange(value)
        })
        nextValue.next(value)
        callBack(value)
      }
      if (value?.subscribe) {
        value.subscribe((value) => {
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
        ref.value.next(initValue)
        ref.valueChanges.forEach((valueChange) => {
          valueChange(initValue)
        })
        nextValue.next(initValue)
        callBack(initValue)
      }
      if (value?.subscribe) {
        value.subscribe(() => {
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
        subject.next(value)
      }

      ref.valueChanges.add(change);

      const result = {
        destroy() {
          ref.valueChanges.delete(change)
        },
        subscribe(next) {
          subject.subscribe(next)
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
    }
  }
}

/** 创建变量map */
export const createVars = (vars) => {
  return new Proxy(vars, {
    get(target, key) {
      const value = target[key]
      if (value) {
        return value.get().value
      }
      return value
    }
  })
}

/** 创建fx */
export const createFx = (fx) => {
  return (value, ...args) => {
    const outputs = {}

    const next = (value) => {
      const res = fx(value, ...args)
      if (res) {
        Object.entries(res).forEach(([key, value]) => {
          if (!outputs[key]) {
            outputs[key] = new Subject()
          }
          if (value?.subscribe) {
            value.subscribe((value) => {
              outputs[key].next(value)
            })
          } else {
            outputs[key].next(value)
          }
        })
      }
    }

    if (value?.subscribe) {
      value.subscribe((value) => {
        next(value)
      })
    } else {
      next(value)
    }

    return outputs
  }
}

/** 创建插槽IO */
export const createSlotsIO = () => {
  const slotsIOMap = {}
  return new Proxy({}, {
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
                inputsMap[key].next(value)
              }

              next.subscribe = (next) => {
                inputsMap[key].subscribe(next)
              }

              return next
            }
          }),
          outputs: new Proxy({}, {
            get(_, key) {
              return (next) => {
                return (value) => {
                  if (value?.subscribe) {
                    value.subscribe((value) => {
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
              if (value?.subscribe) {
                value.subscribe((value) => {
                  outputsMap[key].next(value)
                });
              } else {
                outputsMap[key].next(value)
              }
            }
          }
        })
      }

      if (!inputsMap[key]) {
        inputsMap[key] = new Subject()
      }

      const next = (value) => {
        if (value?.subscribe) {
          value.subscribe((value) => {
            inputsMap[key].next(value)
          });
        } else {
          inputsMap[key].next(value)
        }

        return new Proxy({}, {
          get(_, key) {
            return outputsMap[key] || (outputsMap[key] = new Subject())
          }
        })
      }

      next.subscribe = (next) => {
        inputsMap[key].subscribe(next)
      }

      return next
    }
  })
}

/**
 * 组件样式
 */
export const createStyles = (params) => {
  const { styles, parentSlot } = params;
  if (parentSlot?.itemWrap) {
    const { root, ...other } = parentSlot
    return other
  }
  return styles
}

/** [TODO] 记录API调用过程中变量的监听，调用回调后销毁 */
let apiRun = null;
let apiRunVariablesSubject = {};

export const api = (fn) => {
  return (value, cb = {}) => {
    const id = Math.random();
    let isDestroy = false;
    apiRun = id;
    fn(value, new Proxy(cb, {
      get(target, key) {
        return (value) => {
          if (value?.subscribe) {
            value.subscribe((next) => {
              if (isDestroy) {
                return
              }
              isDestroy = true
              target[key]?.(next)
              apiRunVariablesSubject[id]?.forEach((subject) => {
                subject.destroy()
              })
            })
          } else {
            if (isDestroy) {
              return
            }
            isDestroy = true
            target[key]?.(value)
            apiRunVariablesSubject[id]?.forEach((subject) => {
              subject.destroy()
            })
          }
        }
      }
    }))
    apiRun = null;
  }
}
