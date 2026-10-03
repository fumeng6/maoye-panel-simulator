import 数据 from './game/装备词条.json' with { type: 'json' }
import { 承音比例 } from './constants.js'

export const 装备部位 = { 主武器: '主武器', 副武器: '副武器', 环: '环', 佩: '佩', 头: '头', 胸: '胸', 胫甲: '胫甲', 腕甲: '腕甲' }
export const 部位顺序 = ['主武器', '副武器', '头', '胸', '环', '佩', '胫甲', '腕甲']
export const 词条槽 = { 宫: '宫', 商: '商', 角: '角', 徵: '徵', 羽: '羽', 定音: '定音' }
export const 调律槽位 = ['商', '角', '徵', '羽']
export const 五音槽位 = ['宫', ...调律槽位]
export const 词条属性 = 数据.属性
export const { 防具定音词条, 武器稀有词条, 招式定音范围 } = 数据
const 全部定音 = new Set(Object.values(防具定音词条).flat())
const 通用定音 = ['无相穿透', '外功穿透']
// 牵丝霖的治疗技定音明确保留；其余防御、治疗属性仍不参与模拟。
export const 是防御属性 = 名称 => 名称 !== '明川药典·治疗技增疗' && (['体', '御'].includes(名称) || /气血|防御|抗性|护盾|治疗|增疗|减伤/.test(名称 || ''))
export const 规范词条名称 = 名称 => ['单体类奇术增伤', '群体类奇术增伤'].includes(名称) ? '全奇术增伤' : 名称
const 是招式定音 = 名称 => 全部定音.has(名称)

export function 取宫槽池(部位) { return 数据.宫槽池[部位] || [] }
export function 取调律池(部位, 流派, 变体) {
  const 稀有 = 武器稀有词条[`${流派}_${变体}`]?.[部位]
  return [...new Set([
    ...(数据.调律池[部位] || []),
    ...(数据.转律池[流派]?.[部位] || []),
    ...(稀有 ? [稀有] : 数据.稀有池[部位] || [])
  ])]
}
export function 取定音池(部位, 流派, 变体) {
  return ['主武器', '副武器', '环', '佩'].includes(部位)
    ? 通用定音 : 防具定音词条[`${流派}_${变体}`] || []
}
export function 取词条池(槽位, 部位, 流派, 变体) {
  if (槽位 === '宫') return 取宫槽池(部位)
  if (槽位 === '定音') return 取定音池(部位, 流派, 变体)
  return 取调律池(部位, 流派, 变体)
}
export function 取词条范围(名称) {
  return 词条属性[名称]?.范围 || (是招式定音(名称) ? 招式定音范围 : [0, 0])
}
export function 是百分比词条(名称) {
  return 词条属性[名称]?.百分比 || 是招式定音(名称)
}
export function 是属性攻击(名称) {
  return /^(最小|最大)(鸣金|裂石|牵丝|破竹|无相)攻击$/.test(名称)
}
export function 受增益抗性影响(名称) {
  // 增疗不按敌人的增伤抗性折算。
  if (名称 === '明川药典·治疗技增疗') return false
  return ['稀有', '武器增伤'].includes(词条属性[名称]?.分类)
    || 是招式定音(名称) || 通用定音.includes(名称)
}
export const 是增伤词条 = 受增益抗性影响
export function 取词条满值(名称) { return 取词条范围(名称)[1] }
export function 取承音值(名称) {
  return 词条属性[名称]?.承音值 ?? Number((取词条满值(名称) * 承音比例).toFixed(4))
}
export function 格式化词条(名称, 值) {
  return `${Number(值 || 0).toFixed(2).replace(/\.?0+$/, '')}${是百分比词条(名称) ? '%' : ''}`
}
