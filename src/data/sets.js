import 数据 from './game/套装.json' with { type: 'json' }
import { 取模板属性 } from './templateStats.js'
export const 套装数据 = Object.fromEntries(Object.entries(数据.分类).map(([分类, 列表]) => [
  分类, 列表.map(套装 => ({
    ...套装,
    面板加成: 取模板属性(数据.数值总表, 套装.加成属性, 套装.取值, 套装.数值覆盖)
  }))
]))
export function 取套装列表(分类) { return 套装数据[分类] || [] }
export function 取套装(分类, 键) { return 取套装列表(分类).find(item => item.键 === 键) || null }
