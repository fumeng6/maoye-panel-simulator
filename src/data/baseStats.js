import 数据 from './game/基础属性.json' with { type: 'json' }
export const 武库 = 数据.武库
export const 装备基础数值 = 数据.装备基础数值
export const 基础面板 = {}
for (const 来源 of Object.values(数据.基础来源)) {
  for (const [属性, 值] of Object.entries(来源)) {
    基础面板[属性] = (基础面板[属性] || 0) + 值
  }
}
