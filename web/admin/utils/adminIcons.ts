import type { Component } from 'vue'
import {
  ArrowDown,
  Avatar,
  Box,
  ChatDotSquare,
  ChatLineSquare,
  DataLine,
  Document,
  Goods,
  Grid,
  House,
  Key,
  List,
  MagicStick,
  Medal,
  Money,
  RefreshLeft,
  Ticket,
  Tools,
  User,
  Van,
} from '@element-plus/icons-vue'

/**
 * 后台菜单/界面用到的图标白名单。
 * 显式列出（而非全量注册 @element-plus/icons-vue），以便打包时 tree-shaking。
 * 新增菜单图标时需在此登记。
 */
export const adminIcons: Record<string, Component> = {
  ArrowDown,
  Avatar,
  Box,
  ChatDotSquare,
  ChatLineSquare,
  DataLine,
  Document,
  Goods,
  Grid,
  House,
  Key,
  List,
  MagicStick,
  Medal,
  Money,
  RefreshLeft,
  Ticket,
  Tools,
  User,
  Van,
}

export function resolveAdminIcon(name: string | undefined): Component {
  return (name && adminIcons[name]) || DataLine
}
