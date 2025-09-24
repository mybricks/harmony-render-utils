import { context } from "./context"
import { SUBJECT_SUBSCRIBE } from "./constant"

/** 处理区块事件 */
export const createModuleEventsHandle = ({ that }) => {
  const { uid, events } = that
  return new Proxy(events, {
    get(_, key) {
      const event = uid ? (context.comEvent?.[uid]?.[key] || events[key]) : events[key]

      if (event) {
        return (value) => {
          if (value?.[SUBJECT_SUBSCRIBE]) {
            value[SUBJECT_SUBSCRIBE]((value) => {
              event(value)
            })
          } else {
            event(value)
          }
        }
      }
    }
  })
}
