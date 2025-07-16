import type { MyBricks } from "./types";
import { createInputsHandle, createModuleInputsHandle } from "./utils";

export * from "./types";
export * from "./utils";
export * from "./ui";

const Controller = () => {
  return createInputsHandle({}, true) as MyBricks.Controller;
}

const ModuleController = () => {
  return createModuleInputsHandle() as MyBricks.ModuleController;
}

export {
  Controller,
  ModuleController,
}

const uuid = new Date().getTime();
console.log("[MyBricks - test]", String(uuid));
