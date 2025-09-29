export const createEnv = (params) => {
  return params.controller._context.appContext?.env
}

export const _createEnv = (params) => {
  return params.controller._context.appContext?._env
}
