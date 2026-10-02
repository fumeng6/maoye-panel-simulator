import { 计算面板 } from './panel.js'
import { 判定常量 } from '../data/constants.js'
import { 部位顺序, 取词条池, 取词条满值, 是百分比词条 } from '../data/affinities.js'

export const 整数 = value => Math.floor(value || 0)
export const 小数 = value => Number(value || 0).toFixed(1)
export const 百分比 = value => `${(Math.floor((value || 0) * 10 + 1e-8) / 10).toFixed(1)}%`
export const 进度 = (value, max) => Math.max(0, Math.min(100, max ? value / max * 100 : 0))
export const 进度颜色 = ratio => `hsl(${Math.round(Math.max(0, Math.min(100, ratio)) * 1.2)}, 62%, 43%)`

export function 装备属性上限(name, school, variant) {
  let slots = 0
  for (const part of 部位顺序) {
    // 商角徵羽不可重复，因此同属性在一件装备的四音中最多出现一次。
    for (const tone of ['宫', '商', '定音']) {
      if (取词条池(tone, part, school, variant).includes(name)) slots++
    }
  }
  return 取词条满值(name) * slots
}

export function 取面板展示(state) {
  const panel = 计算面板(state)
  const raw = panel.原始面板
  const base = 计算面板({ ...state, 装备词条: {} }).原始面板
  const attacks = [...new Set(['外功', panel.本系属性, '鸣金', '裂石', '破竹', '牵丝'])]
    .filter(key => raw[`最小${key}攻击`] || raw[`最大${key}攻击`])
    .map(key => ({ key, min: raw[`最小${key}攻击`] || 0, max: raw[`最大${key}攻击`] || 0, absorbedMin: key === panel.本系属性 ? raw.最小无相攻击 || 0 : 0, absorbedMax: key === panel.本系属性 ? raw.最大无相攻击 || 0 : 0 }))
  const limits = { 精准率: 判定常量.精准上限, 会心率: 判定常量.会心率上限, 会意率: 判定常量.会意率上限 }
  const rates = Object.entries(limits).map(([key, max]) => {
    const effective = panel.有效面板[key]
    const ratio = 进度(effective, max)
    const whiteCap = key === '精准率' ? 判定常量.精准基线 + (max - 判定常量.精准基线) * (1 + 判定常量.判定抗性) : max * (1 + 判定常量.判定抗性)
    return { key, value: raw[key] || 0, effective, max, whiteCap, overflow: Math.max(0, (raw[key] || 0) - whiteCap), ratio, color: 进度颜色(ratio) }
  })
  const direct = ['直接会心率', '直接会意率'].filter(key => raw[key]).map(key => ({ key, value: raw[key] }))
  const modifiers = Object.keys(raw).filter(key => raw[key] && (/穿透|加成|增伤|增效/.test(key)) && !['会心伤害加成', '会意伤害加成', '无相穿透', `${panel.本系属性}伤害加成`].includes(key)).map(key => {
    let max = 装备属性上限(key, state.流派, state.变体)
    if (key === `${panel.本系属性}穿透`) {
      max += (base[key] || 0) + 装备属性上限('无相穿透', state.流派, state.变体)
    }
    const [schoolName, moveName] = key.includes('·') ? key.split('·') : ['', key]
    return { key, schoolName, moveName, value: raw[key], effective: panel.增益有效面板[key], max, ratio: max ? 进度(raw[key], max) : 100, percent: 是百分比词条(key) || /加成|增伤|增效/.test(key) }
  })
  return { panel, raw, attacks, rates, direct, modifiers }
}

export function 显示增益(item, effective = false) {
  const value = effective ? item.effective : item.value
  return item.percent ? 百分比(value) : 小数(value)
}

export function 显示攻击(item) {
  const bound = (value, bonus) => `${整数(value)}${bonus ? `(+${整数(bonus)})` : ''}`
  return item.min > item.max
    ? `最小 ${bound(item.min, item.absorbedMin)} / 最大 ${bound(item.max, item.absorbedMax)}`
    : `${bound(item.min, item.absorbedMin)}～${bound(item.max, item.absorbedMax)}`
}
