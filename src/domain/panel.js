/**
 * 面板计算 - 把"装备词条 + 心法 + 套装 + 武学天赋"折算成战斗属性面板
 *
 * 计算链路：
 *   基础面板
 *   + 武库（本系属攻）
 *   + 心法
 *   + 套装
 *   + 装备词条
 *   + 劲敏势 -> 攻/会心/会意
 *   + 无相吸收（无相攻击/穿透 转为 本系攻击/穿透）
 *   + 武学天赋（含需求折算）
 *   = 原始总和 -> 判定有效值
 */

import { 基础面板, 装备基础数值 } from '../data/baseStats.js'
import { 转化系数, 判定常量, 增益抗性 } from '../data/constants.js'
import {
  取流派配置,
  取武库加成,
  五维折算属性,
  属性折算属性,
  直接生效属性
} from '../data/schools.js'
import { 心法属性 } from '../data/xinfa.js'
import { 取套装 } from '../data/sets.js'
import { 取词条范围, 是百分比词条, 受增益抗性影响, 是防御属性, 规范词条名称 } from '../data/affinities.js'

function 数值(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function 累加(面板, 名称, 值) {
  if (是防御属性(名称)) return
  const v = 数值(值)
  if (!v) return
  面板[名称] = (面板[名称] || 0) + v
}

/** 需求折算比例：实际值 / 需求值，上限 1 */
function 计算折算比例(面板, 需求) {
  if (!需求?.属性 || !需求?.需求值) return 1
  const 实际 = 数值(面板[需求.属性])
  const 封顶 = Math.max(0, Math.min(实际, 需求.需求值))
  return 封顶 / 需求.需求值
}

/**
 * 计算完整面板
 * @param {Object} params
 * @param {string} params.流派
 * @param {string} params.变体
 * @param {Object} params.套装选择  { 弓决, 武器 } 的键
 * @param {string[]} params.心法列表
 * @param {Object} params.装备词条   { 部位: { 槽位: { 名称, 值 } } }
 * @returns {Object} 面板结果
 */
export function 计算面板({ 流派, 变体, 套装选择 = {}, 心法列表 = [], 装备词条 = {} } = {}) {
  const 面板 = { ...基础面板 }
  // 每件装备按品质计入白值；防具四件没有攻击白值。
  for (const [部位, 金色数值] of Object.entries(装备基础数值.金色)) {
    const 白值 = 装备词条[部位]?.品质 === '紫色' ? 装备基础数值.紫色[部位] : 金色数值
    for (const [名称, 值] of Object.entries(白值)) 累加(面板, 名称, 值)
  }
  // 装备词条中"受增益抗性影响"部分（定音/神力）的累加账，单位为内部口径
  const 装备增益账 = {}
  const 流派配置 = 取流派配置(流派, 变体)

  // 1) 武库（本系属攻）
  if (流派配置?.本系属性) {
    const 加成 = 取武库加成(流派配置.本系属性)
    for (const [名称, 值] of Object.entries(加成)) 累加(面板, 名称, 值)
  }

  // 2) 心法
  for (const 名称 of 心法列表) {
    const 属性 = 心法属性[名称]
    if (!属性) continue
    for (const [k, v] of Object.entries(属性)) 累加(面板, k, v)
  }

  // 3) 套装
  for (const [分类, 键] of Object.entries(套装选择)) {
    if (分类 === '防具') continue
    const 套装 = 取套装(分类, 键)
    if (!套装) continue
    for (const [k, v] of Object.entries(套装.面板加成 || {})) 累加(面板, k, v)
  }

  // 4) 装备词条
  // 数据、配装和计算统一用百分数点数（会心 16.2 表示 16.2%）。
  // 同时记录"受增益抗性影响"词条的装备贡献，供后续折算。
  const 记录装备增益 = (名称, 换算值) => {
    if (!受增益抗性影响(名称)) return
    装备增益账[名称] = (装备增益账[名称] || 0) + 换算值
  }
  for (const 装备 of Object.values(装备词条)) {
    for (const 词条 of Object.values(装备 || {})) {
      if (!词条?.名称) continue
      const 换算值 = 数值(词条.值)
      const 名称 = 规范词条名称(词条.名称)
      if (是防御属性(名称)) continue
      累加(面板, 名称, 换算值)
      记录装备增益(名称, 换算值)
    }
  }

  // 5) 劲敏势 -> 攻/会心/会意
  const 敏 = 数值(面板.敏)
  const 势 = 数值(面板.势)
  const 劲 = 数值(面板.劲)

  累加(面板, '最小外功攻击', 敏 * 转化系数.敏转最小攻击 + 劲 * 转化系数.劲转最小攻击)
  累加(面板, '最大外功攻击', 势 * 转化系数.势转最大攻击 + 劲 * 转化系数.劲转最大攻击)
  累加(面板, '会心率', 敏 * 转化系数.敏转会心率)
  累加(面板, '会意率', 势 * 转化系数.势转会意率)

  // 6) 无相吸收：无相攻击/穿透 -> 本系攻击/穿透
  // 原始值完整吸收，装备来源账一起转移，展示有效值时只折算一次。
  const 本系 = 流派配置?.本系属性
  if (本系) {
    const 最小无相 = 数值(面板.最小无相攻击)
    const 最大无相 = 数值(面板.最大无相攻击)
    const 无相穿透原始 = 数值(面板.无相穿透)
    const 无相穿透装备 = 数值(装备增益账.无相穿透)
    if (最小无相) 累加(面板, `最小${本系}攻击`, 最小无相)
    if (最大无相) 累加(面板, `最大${本系}攻击`, 最大无相)
    if (无相穿透原始) 累加(面板, `${本系}穿透`, 无相穿透原始)
    装备增益账[`${本系}穿透`] = (装备增益账[`${本系}穿透`] || 0) + 无相穿透装备
  }

  // 7) 武学天赋（先加直接生效属性，再根据需求折算比例加受控属性）
  if (流派配置) {
    // 7.1 直接生效属性（不参与折算）
    for (const [名称, 原始值] of Object.entries(流派配置.武学天赋 || {})) {
      if (直接生效属性.includes(名称)) 累加(面板, 名称, 数值(原始值))
    }
    // 7.2 折算比例（在直接生效属性计入后才能正确取值）
    const 五维比例 = 计算折算比例(面板, 流派配置.五维需求)
    const 属性比例 = 计算折算比例(面板, 流派配置.属性需求)
    for (const [名称, 原始值] of Object.entries(流派配置.武学天赋 || {})) {
      let 值 = 数值(原始值)
      if (五维折算属性.includes(名称)) {
        值 *= 五维比例
      } else if (属性折算属性.includes(名称)) {
        值 *= 属性比例
      } else {
        continue
      }
      累加(面板, 名称, 值)
    }
  }

  // 8) 判定属性有效值
  const 有效 = 计算判定有效值(面板)

  // 9) 增益有效面板：受增益抗性影响的词条，
  //    有效值 = 非装备部分 + 装备部分 / (1 + 增益抗性)
  const 增益有效 = {}
  const 抗性分母 = 1 + 增益抗性
  for (const [名称, 值] of Object.entries(面板)) {
    if (!受增益抗性影响(名称) && !装备增益账[名称]) continue
    const 装备部分 = 数值(装备增益账[名称])
    增益有效[名称] = 折算增益(数值(值), 装备部分, 抗性分母)
  }

  return {
    原始面板: 面板,
    有效面板: 有效,
    增益有效面板: 增益有效,
    本系属性: 本系 || null
  }
}

/**
 * 增益抗性折算：装备部分按 1/(1+抗性) 折算，其余部分保持不变。
 * @param {number} 原始  面板原始合计
 * @param {number} 装备部分  其中来自装备定音/神力词条的部分
 * @param {number} 抗性分母  默认 1+增益抗性
 */
function 折算增益(原始, 装备部分, 抗性分母 = 1 + 增益抗性) {
  const 非装备 = 原始 - 装备部分
  return 非装备 + 装备部分 / 抗性分母
}

/** 判定三率在敌人抗性折算后的有效值 */
function 计算判定有效值(面板) {
  const 抗性分母 = 1 + 判定常量.判定抗性

  const 基线 = 判定常量.精准基线
  const 精准原始 = 数值(面板.精准率)
  const 精准有效 = Math.min(
    判定常量.精准上限,
    基线 + (精准原始 - 基线) / 抗性分母
  )

  const 会心原始 = 数值(面板.会心率)
  const 会心有效 = Math.min(判定常量.会心率上限, 会心原始 / 抗性分母)

  const 会意原始 = 数值(面板.会意率)
  const 会意有效 = Math.min(判定常量.会意率上限, 会意原始 / 抗性分母)

  return {
    精准率: 精准有效,
    会心率: 会心有效,
    会意率: 会意有效
  }
}

/**
 * 格式化：整数（攻击、劲敏势等游戏内取整显示）
 */
export function 格式化整数(v) {
  return String(Math.round(数值(v)))
}

/**
 * 格式化：百分比（内部为百分数点数，如 16.2 -> "16.2%"）
 */
export function 格式化百分比(v) {
  return `${数值(v).toFixed(1)}%`
}

/** 格式化：穿透（保留 1 位小数） */
export function 格式化穿透(v) {
  return 数值(v).toFixed(1)
}

/** 取词条的展示范围文本（用于输入提示） */
export function 词条范围文本(名称) {
  const [min, max] = 取词条范围(名称)
  if (是百分比词条(名称)) {
    return `${min}% ~ ${max}%`
  }
  return `${min} ~ ${max}`
}
