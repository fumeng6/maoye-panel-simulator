import { defineStore } from 'pinia'
import { 计算面板 } from '../domain/panel.js'
import { 部位顺序, 词条槽, 调律槽位, 五音槽位, 取词条池, 取词条范围, 取承音值, 是属性攻击, 是防御属性, 规范词条名称 } from '../data/affinities.js'
import { 流派注册表 } from '../data/schools.js'
import { 心法属性 } from '../data/xinfa.js'
import { 取套装 } from '../data/sets.js'

export function 建空白装备() {
  return { ...Object.fromEntries(Object.values(词条槽).map(s => [s, { 名称: '', 值: 0 }])), 承音: false }
}
function 建全部装备() { return Object.fromEntries(部位顺序.map(s => [s, 建空白装备()])) }

// 配装导入、装备弹窗共用这些实际游戏约束。
export function 整理装备(装备, 部位, 流派, 变体) {
  const out = 建空白装备()
  const 清除防具定音 = ['头', '胸', '胫甲', '腕甲'].includes(部位) && 装备?.定音?.名称 && !取词条池('定音', 部位, 流派, 变体).includes(规范词条名称(装备.定音.名称))
  out.承音 = 装备?.承音 === true && !清除防具定音
  const used = new Set()
  let 属性攻击数 = 0
  for (const 槽位 of Object.values(词条槽)) {
    // 定音库精简后，旧方案只清除失效定音，五音仍保留；承音退回原值。
    if (槽位 === '定音' && 清除防具定音) continue
    const old = 装备?.[槽位]
    const item = old && { ...old, 名称: 规范词条名称(old.名称) }
    if (!item?.名称) continue
    const 承音前 = 装备?.承音前数值?.[槽位]
    if (清除防具定音 && 装备.承音 && 五音槽位.includes(槽位) && 规范词条名称(承音前?.名称) === item.名称 && Number.isFinite(承音前?.值)) item.值 = 承音前.值
    if (是防御属性(item.名称)) continue
    if (!取词条池(槽位, 部位, 流派, 变体).includes(item.名称)) throw Error(`${部位}·${槽位}：${item.名称} 不在当前词条池中`)
    if (!Number.isFinite(item.值)) throw Error(`${部位}·${槽位}：请输入有效数值`)
    if (调律槽位.includes(槽位)) {
      if (used.has(item.名称)) throw Error(`${部位}：商角徵羽词条不能重复`)
      used.add(item.名称)
      if (是属性攻击(item.名称) && ++属性攻击数 > 2) throw Error(`${部位}：商角徵羽最多两条属性攻击`)
    }
    const [min, max] = 取词条范围(item.名称)
    const upper = out.承音 && 五音槽位.includes(槽位) ? 取承音值(item.名称) : max
    out[槽位] = { 名称: item.名称, 值: Math.max(min, Math.min(upper, item.值)) }
  }
  if (!五音槽位.every(s => out[s].名称)) {
    if (out.定音.名称 && !Object.values(词条槽).some(s => 是防御属性(装备?.[s]?.名称))) throw Error(`${部位}：配置宫商角徵羽后才能解锁定音`)
    out.定音 = { 名称: '', 值: 0 }
    out.承音 = false
  }
  if (out.承音 && !out.定音.名称) throw Error(`${部位}：配置六槽后才能承音`)
  if (out.承音 && 装备.承音前数值) {
    out.承音前数值 = {}
    for (const 槽位 of 五音槽位) {
      const item = 装备.承音前数值[槽位]
      const name = 规范词条名称(item?.名称)
      if (name !== out[槽位].名称 || !Number.isFinite(item?.值)) continue
      const [min, max] = 取词条范围(name)
      out.承音前数值[槽位] = { 名称: name, 值: Math.max(min, Math.min(max, item.值)) }
    }
  }
  return out
}

export function 整理配置(文件) {
      if (文件?.格式版本 !== 1 || !文件.配置) throw Error('请选择本模拟器导出的配装 JSON 文件')
      const c = 文件.配置
      if (!流派注册表[c.流派]?.[c.变体]) throw Error('文件中的流派尚未支持')
      if (!Array.isArray(c.心法列表) || c.心法列表.length > 4 || new Set(c.心法列表).size !== c.心法列表.length) throw Error('心法列表无效')
      // 已移除心法不再生效，旧方案仍保留其他配置。
      const 心法列表 = c.心法列表.filter(n => !['归燕经', '婆娑影', '丹心篆'].includes(n))
      if (心法列表.some(n => !Object.hasOwn(心法属性, n))) throw Error('心法列表无效')
      const sets = {}
      for (const 分类 of ['弓决', '武器']) {
        const key = c.套装选择?.[分类] || ''
        if (key && !取套装(分类, key)) throw Error(`${分类}套装尚未支持`)
        sets[分类] = key
      }
      const equip = {}
      for (const 部位 of 部位顺序) equip[部位] = 整理装备(c.装备词条?.[部位], 部位, c.流派, c.变体)
  return { 流派: c.流派, 变体: c.变体, 心法列表, 套装选择: sets, 装备词条: equip }
}

export const useSimulatorStore = defineStore('simulator', {
  state: () => ({ 流派: '', 变体: '', 心法列表: [], 套装选择: { 弓决: '', 武器: '' }, 装备词条: 建全部装备() }),
  getters: {
    已选流派: state => Boolean(流派注册表[state.流派]?.[state.变体]),
    面板: state => state.流派 ? 计算面板(state) : null,
    已配槽数: state => Object.values(state.装备词条).reduce((n, e) => n + Object.values(词条槽).filter(s => e[s]?.名称).length, 0)
  },
  actions: {
    选择流派(流派, 变体) {
      if (!流派注册表[流派]?.[变体]) return 0
      if (流派 === this.流派 && 变体 === this.变体) return 0
      this.流派 = 流派
      this.变体 = 变体
      if (流派 === '破竹' && 变体 === '樽') this.套装选择.武器 = 'qingshang'
      let 清除数 = 0
      for (const 部位 of 部位顺序) {
        const 装备 = this.装备词条[部位]
        for (const 槽位 of Object.values(词条槽)) {
          if (装备[槽位].名称 && !取词条池(槽位, 部位, 流派, 变体).includes(装备[槽位].名称)) {
            装备[槽位] = { 名称: '', 值: 0 }
            清除数++
          }
        }
        if (!五音槽位.every(s => 装备[s].名称)) {
          if (装备.定音.名称) 清除数++
          装备.定音 = { 名称: '', 值: 0 }
        }
        if (!装备.定音.名称) 装备.承音 = false
        if (!装备.承音) delete 装备.承音前数值
      }
      return 清除数
    },
    保存部位(部位, 装备) { this.装备词条[部位] = 整理装备(装备, 部位, this.流派, this.变体) },
    清除部位(部位) { this.装备词条[部位] = 建空白装备() },
    重置装备() { this.装备词条 = 建全部装备() },
    设置心法列表(列表) {
      this.心法列表 = [...new Set(列表)].filter(n => Object.hasOwn(心法属性, n)).slice(0, 4)
    },
    清空心法() { this.心法列表 = [] },
    导出配置() {
      return { 格式版本: 1, 配置: JSON.parse(JSON.stringify(this.$state)) }
    },
    加载配置(文件) {
      this.$patch(整理配置(文件))
    }
  }
})
