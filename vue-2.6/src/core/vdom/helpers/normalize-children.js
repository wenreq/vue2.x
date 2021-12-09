/* @flow */

import VNode, { createTextVNode } from 'core/vdom/vnode'
import { isFalse, isTrue, isDef, isUndef, isPrimitive } from 'shared/util'

// The template compiler attempts to minimize the need for normalization by
// statically analyzing the template at compile time.
//
// For plain HTML markup, normalization can be completely skipped because the
// generated render function is guaranteed to return Array<VNode>. There are
// two cases where extra normalization is needed:

// 1. When the children contains components - because a functional component 当子组件包含组件时——因为是一个功能性组件
// may return an Array instead of a single root. In this case, just a simple 可能返回一个数组而不是单个根。 在这种情况下，就简单一点
// normalization is needed - if any child is an Array, we flatten the whole 需要标准化-如果任何子数组是一个数组，我们平坦整个
// thing with Array.prototype.concat. It is guaranteed to be only 1-level deep 与数组。prototype.concat。 它保证只有1级深度
// because functional components already normalize their own children. 因为功能性组件已经规范化了它们自己的子组件。
export function simpleNormalizeChildren (children: any) {
  for (let i = 0; i < children.length; i++) {
    if (Array.isArray(children[i])) {
      return Array.prototype.concat.apply([], children)
    }
  }
  return children
}

// 2. When the children contains constructs that always generated nested Arrays, 当子元素包含总是生成嵌套数组的构造时，
// e.g. <template>, <slot>, v-for, or when the children is provided by user 例如:<template>， <slot>， v-for，或者当子节点由user提供时
// with hand-written render functions / JSX. In such cases a full normalization 使用手写的渲染函数 在这种情况下，需要进行完全的规范化
// is needed to cater to all possible types of children values. 需要迎合所有可能类型的儿童价值观。
export function normalizeChildren (children: any): ?Array<VNode> {
  return isPrimitive(children)
    ? [createTextVNode(children)]
    : Array.isArray(children)
      ? normalizeArrayChildren(children)
      : undefined
}

function isTextNode (node): boolean {
  return isDef(node) && isDef(node.text) && isFalse(node.isComment)
}

function normalizeArrayChildren (children: any, nestedIndex?: string): Array<VNode> {
  const res = []
  let i, c, lastIndex, last
  for (i = 0; i < children.length; i++) {
    c = children[i]
    if (isUndef(c) || typeof c === 'boolean') continue
    lastIndex = res.length - 1
    last = res[lastIndex]
    //  nested  嵌套的
    if (Array.isArray(c)) {
      if (c.length > 0) {
        c = normalizeArrayChildren(c, `${nestedIndex || ''}_${i}`)
        // merge adjacent text nodes 合并相邻文本节点
        if (isTextNode(c[0]) && isTextNode(last)) {
          res[lastIndex] = createTextVNode(last.text + (c[0]: any).text)
          c.shift()
        }
        res.push.apply(res, c)
      }
    } else if (isPrimitive(c)) {
      if (isTextNode(last)) {
        // merge adjacent text nodes 合并相邻文本节点
        // this is necessary for SSR hydration because text nodes are 这是必要的SSR水化，因为文本节点是  本质上合并时呈现的HTML字符串
        // essentially merged when rendered to HTML strings
        res[lastIndex] = createTextVNode(last.text + c)
      } else if (c !== '') {
        // convert primitive to vnode 将原语转换为vnode
        res.push(createTextVNode(c))
      }
    } else {
      if (isTextNode(c) && isTextNode(last)) {
        // merge adjacent text nodes 合并相邻文本节点
        res[lastIndex] = createTextVNode(last.text + c.text)
      } else {
        // default key for nested array children (likely generated by v-for) 嵌套数组子元素的默认键(可能由v-for生成)
        if (isTrue(children._isVList) &&
          isDef(c.tag) &&
          isUndef(c.key) &&
          isDef(nestedIndex)) {
          c.key = `__vlist${nestedIndex}_${i}__`
        }
        res.push(c)
      }
    }
  }
  return res
}
