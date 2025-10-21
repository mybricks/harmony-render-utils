import { Subject } from "./Subject"
import { safeSetByPath, safeGetByPath } from "./utils"
import { SUBJECT_NEXT, SUBJECT_SUBSCRIBE, SUBJECT_VALUE } from "./constant"

/** 创建变量 */
export const createVariable = (...args) => {
  const execOnceOnReg = args.length > 0
  const initValue = args[0]
  const value = new Subject()
  value[SUBJECT_NEXT](initValue)
  const ref = {
    value,
    valueChanges: new Set(),
    callBacksMap: new Map()
  }

  const variable = {
    /** 读取 */
    get(value, path) {
      const nextValue = new Subject()
      const next = () => {
        nextValue[SUBJECT_NEXT](path ? safeGetByPath({
          data: ref.value[SUBJECT_VALUE],
          path: path.split(".")
        }) : ref.value[SUBJECT_VALUE])
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
    /** 赋值 */
    set(value, path) {
      const nextValue = new Subject()
      const next = (value) => {
        if (path) {
          safeSetByPath({
            data: ref.value[SUBJECT_VALUE],
            path: path.split("."),
            value: value
          })

          value = ref.value[SUBJECT_VALUE]
        }

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
        },
        getValue() {
          return ref.value[SUBJECT_VALUE]
        }
      }
    },
    registerChange(change) {
      ref.valueChanges.add(change)
      if (execOnceOnReg) {
        change(ref.value[SUBJECT_VALUE])
      }
    },
    unregisterChange(change) {
      ref.valueChanges.delete(change)
    },
    // 内置的赋值操作
    setTrue() {
      return variable.set(true)
    },
    setFalse() {
      return variable.set(false)
    },
    setAryAdd(value) {
      const nextValue = new Subject()

      if (Array.isArray(ref.value[SUBJECT_VALUE])) {
        const next = (value) => {
          const arrayValue = ref.value[SUBJECT_VALUE].concat(value)
          ref.value[SUBJECT_NEXT](arrayValue)
          ref.valueChanges.forEach((valueChange) => {
            valueChange(arrayValue)
          })
          nextValue[SUBJECT_NEXT](arrayValue)
        }
        if (value?.[SUBJECT_SUBSCRIBE]) {
          value[SUBJECT_SUBSCRIBE]((value) => {
            next(value)
          })
        } else {
          next(value)
        }
      }

      return nextValue
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
