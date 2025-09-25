# [1.0.30](https://github.com/mybricks/harmony-render-utils/compare/341777b..7c601ae) (2025-09-25)
 - 支持在组件事件内读写全局变量

# [1.0.29](https://github.com/mybricks/harmony-render-utils/compare/0919ab6..c860ca3) (2025-09-24)
 - 支持注册组件时候，读写变量、读输入、调用各类输出
 - 变量有默认值时，注册自动执行一次
 - 支持_setData修改组件数据源

# [1.0.28](https://github.com/mybricks/harmony-render-utils/compare/df8dd6e..fe9ecb1) (2025-09-22)
 - 支持读取流数据的任意层key

# [1.0.27](https://github.com/mybricks/harmony-render-utils/compare/7c3202b..4ea648f) (2025-09-17)
 - 支持变量监听
 - 兼容_setStyle，组件未渲染的情况

# [1.0.26](https://github.com/mybricks/harmony-render-utils/compare/7a976a0..f7d4b8d) (2025-09-17)
 - 支持ui组件配置默认隐藏
 - 优化modifier实例收集逻辑

# [1.0.25](https://github.com/mybricks/harmony-render-utils/compare/fdb649f..848b443) (2025-09-16)
 - 事件类型调整，不限制输入参数数量
 - 设置样式兼容处理，支持调用组件的「配置」

# [1.0.24](https://github.com/mybricks/harmony-render-utils/compare/6598728..7b36cb2) (2025-09-16)
 - 设置样式兼容处理

# [1.0.23](https://github.com/mybricks/harmony-render-utils/compare/f805735..6d9f6bc) (2025-09-16)
 - 兼容组件style为空的场景

# [1.0.22](https://github.com/mybricks/harmony-render-utils/compare/3a4439d..c310355) (2025-09-15)
 - 兼容组件style为空的场景

# [1.0.21](https://github.com/mybricks/harmony-render-utils/compare/b940e32..344b1f0) (2025-09-15)
 - 添加onComEvent，可由调用方自由配置组件事件行为
 - 支持ui组件调用「设置样式」

# [1.0.20](https://github.com/mybricks/harmony-render-utils/compare/6f2d464..cf29e47) (2025-09-11)
 - 路由pop时机优化

# [1.0.19](https://github.com/mybricks/harmony-render-utils/compare/7e4e00a..a019ecc) (2025-09-08)
 - MyBricksColumnModifier兼容style为空的情况

# [1.0.18](https://github.com/mybricks/harmony-render-utils/compare/50f5795..a23c466) (2025-09-03)
 - 更新装饰器，注入区块的data、controller

# [1.0.17](https://github.com/mybricks/harmony-render-utils/compare/164f1e3..5481b03) (2025-09-03)
 - 支持区块获取输入项

# [1.0.16](https://github.com/mybricks/harmony-render-utils/compare/26e7820..bfa4d46) (2025-08-29)
 - 修复CallConnector的错误拦截

# [1.0.15](https://github.com/mybricks/harmony-render-utils/compare/6613f48..0711c90) (2025-08-27)
 - createSlotsIO持久化处理

# [1.0.14](https://github.com/mybricks/harmony-render-utils/compare/7054e1c..343ef72) (2025-08-25)
 - 添加装饰器MyBricksDescriptor支持，简化区块部分内置代码

# [1.0.13](https://github.com/mybricks/harmony-render-utils/compare/dbedc11..87b5e53) (2025-08-19)
 - 导出createData

# [1.0.12](https://github.com/mybricks/harmony-render-utils/compare/c902d11..c706aa8) (2025-08-19)
 - CommonModifier支持传入初始值
 - 支持缓存data、inputs、outputs、style、modifier

# [1.0.11](https://github.com/mybricks/harmony-render-utils/compare/f00e9fe..7627eb8) (2025-08-18)
 - 导出merge，用于处理输出项被多次调用场景

# [1.0.10](https://github.com/mybricks/harmony-render-utils/compare/f00e9fe..7627eb8) (2025-08-15)
 - 导出createModifier

# [1.0.9](https://github.com/mybricks/harmony-render-utils/compare/bc568e1..4cbcabd) (2025-08-15)
 - 添加createModifier、CommonModifier等用于操作组件显示、隐藏，优化组件层级过多问题

# [1.0.8](https://github.com/mybricks/harmony-render-utils/compare/a896baf..5077937) (2025-08-06)
 - 添加createModuleEventsHandle，处理区块的events

# [1.0.7](https://github.com/mybricks/harmony-render-utils/compare/190b20c..aa1655a) (2025-07-31)
 - 添加join，用于贯通前后节点

# [1.0.6](https://github.com/mybricks/harmony-render-utils/compare/9aa5657..1b9e63c) (2025-07-28)
 - 支持新特性(系统总线)
 - 去除废弃代码(api)

# [1.0.5](https://github.com/mybricks/harmony-render-utils/compare/327cd8f..bfe64b1) (2025-07-23)
 - 添加transformApi
 - 更新Api类型定义

# [1.0.4](https://github.com/mybricks/harmony-render-utils/compare/3dfb615..6579231) (2025-07-23)
 - 修复显示隐藏输入列入todo后未执行

# [1.0.3](https://github.com/mybricks/harmony-render-utils/compare/be97356..1fb1f6a) (2025-07-23)
 - 添加api兼容性处理

# [1.0.2](https://github.com/mybricks/harmony-render-utils/compare/c6ae118..be97356) (2025-07-23)
 - 支持监听变量的变更
 - 添加api处理
 - 添加Api类型定义

# [1.0.1](https://github.com/mybricks/harmony-render-utils/commit/ec801248c633fce53da5df3b4f0ccb6111383261) (2025-07-16)
 - 初始化ui相关功能

# [1.0.0](https://github.com/mybricks/harmony-render-utils) (2025-07-15)
 - 初始化MyBricks.ai鸿蒙生态相关产物运行时工具包