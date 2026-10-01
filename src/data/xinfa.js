import 数据 from './game/心法.json' with { type: 'json' }
import { 取模板属性 } from './templateStats.js'
export const 心法记录 = 数据.心法
export const 心法属性 = Object.fromEntries(Object.entries(数据.心法).map(([名称, 心法]) => {
  const 类别 = `${心法.品质}${心法.归属 === '通用' ? '通用' : '本流派'}`
  return [名称, 取模板属性(数据.数值总表[类别] || {}, 心法.属性, 心法.取值, 心法.数值覆盖)]
}))
export const 心法列表 = Object.keys(心法属性)
const 分组 = {}
for (const [名称, 心法] of Object.entries(心法记录)) {
  const 归属 = 心法.归属
  const 名称分组 = 归属 === '通用' ? '通用心法' : 归属 === '未记录' ? '其他心法' : `${归属.slice(0, 2)}·${归属.slice(2)}`
  if (!分组[名称分组]) 分组[名称分组] = []
  分组[名称分组].push(名称)
}
export const 心法分组 = Object.entries(分组).map(([name, books]) => ({ name, books }))
