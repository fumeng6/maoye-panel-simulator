/**
 * 模拟器状态 Store
 *
 * 统一管理三类用户输入：
 *   1. 流派/变体选择
 *   2. 心法选择
 *   3. 装备词条配置
 * 并派生出最终战斗属性面板。
 */

import { defineStore } from 'pinia'
import { 计算面板 } from '../domain/panel.js'
import {
  装备部位,
  部位顺序,
  词条槽,
  调律槽位,
  取词条池,
  取词条范围,
  是百分比词条
} from '../data/affinities.js'
import { 流派注册表 } from '../data/schools.js'

/** 承音比例：将宫商角徵羽槽位数值设为满值的 94% */
export const CHENGYIN_RATIO = 0.94

/** 生成某部位的空白装备（宫 + 商角徵羽 + 定音） */
function 建空白装备() {
  return {
    [词条槽.宫]: { 名称: '', 值: 0 },
    [词条槽.商]: { 名称: '', 值: 0 },
    [词条槽.角]: { 名称: '', 值: 0 },
    [词条槽.徵]: { 名称: '', 值: 0 },
    [词条槽.羽]: { 名称: '', 值: 0 },
    [词条槽.定音]: { 名称: '', 值: 0 },
    承音: false
  }
}

function 建全部装备() {
  const out = {}
  for (const 部位 of 部位顺序) out[部位] = 建空白装备()
  return out
}

export const useSimulatorStore = defineStore('simulator', {
  state: () => ({
    // 流派
    流派: '',
    变体: '',
    // 心法（最多 4 本）
    心法列表: [],
    // 套装选择
    套装选择: { 弓决: '', 武器: '', 防具: '' },
    // 装备词条
    装备词条: 建全部装备()
  }),

  getters: {
    /** 是否已选择流派 */
    已选流派(state) {
      return Boolean(state.流派 && state.变体)
    },

    /** 当前流派的所有变体 */
    变体列表(state) {
      if (!state.流派) return []
      return Object.keys(流派注册表[state.流派] || {})
    },

    /** 完整的战斗属性面板 */
    面板(state) {
      if (!state.流派 || !state.变体) return null
      return 计算面板({
        流派: state.流派,
        变体: state.变体,
        套装选择: state.套装选择,
        心法列表: state.心法列表,
        装备词条: state.装备词条
      })
    }
  },

  actions: {
    选择流派(流派, 变体) {
      this.流派 = 流派
      this.变体 = 变体
      this.重置装备()
      this.心法列表 = []
    },

    切换变体(变体) {
      this.变体 = 变体
      this.重置装备()
    },

    重置装备() {
      this.装备词条 = 建全部装备()
    },

    /** 取某部位某槽位的可选词条列表 */
    取可选词条(部位, 槽位) {
      return 取词条池(槽位, 部位, this.流派, this.变体)
    },

    /** 设置词条名称，并自动填入满值 */
    设置词条(部位, 槽位, 名称) {
      const 目标 = this.装备词条[部位][槽位]
      目标.名称 = 名称
      if (名称) {
        const [, max] = 取词条范围(名称)
        目标.值 = max
      } else {
        目标.值 = 0
      }
    },

    /** 设置词条数值（限制在值域内） */
    设置词条值(部位, 槽位, 值) {
      const 目标 = this.装备词条[部位][槽位]
      if (!目标.名称) return
      const [min, max] = 取词条范围(目标.名称)
      const n = Number(值)
      目标.值 = Math.max(min, Math.min(max, Number.isFinite(n) ? n : min))
    },

    /** 清空某槽位 */
    清空槽位(部位, 槽位) {
      this.装备词条[部位][槽位] = { 名称: '', 值: 0 }
    },

    /** 清除某部位全部词条 */
    清除部位(部位) {
      this.装备词条[部位] = 建空白装备()
    },

    /**
     * 对某部位应用承音：宫/商/角/徵/羽 五个槽位的数值改为满值的 94%。
     * 定音槽不受承音影响。
     */
    应用承音(部位) {
      const 装备 = this.装备词条[部位]
      if (!装备) return
      for (const 槽位 of [词条槽.宫, ...调律槽位]) {
        const 词条 = 装备[槽位]
        if (!词条?.名称) continue
        const [, max] = 取词条范围(词条.名称)
        词条.值 = max * CHENGYIN_RATIO
      }
      装备.承音 = true
    },

    /** 取消承音标记 */
    取消承音(部位) {
      if (this.装备词条[部位]) this.装备词条[部位].承音 = false
    },

    /** 心法增删 */
    切换心法(名称) {
      const idx = this.心法列表.indexOf(名称)
      if (idx >= 0) {
        this.心法列表.splice(idx, 1)
      } else if (this.心法列表.length < 4) {
        this.心法列表.push(名称)
      }
    },

    /** 直接设置心法列表（对话框内选择时使用） */
    设置心法列表(列表) {
      this.心法列表 = [...(列表 || [])].slice(0, 4)
    },

    /** 清空心法 */
    清空心法() {
      this.心法列表 = []
    }
  }
})

export { 装备部位, 部位顺序, 词条槽, 调律槽位, 是百分比词条 }
