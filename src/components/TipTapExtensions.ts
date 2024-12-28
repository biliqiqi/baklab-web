import HardBreak from '@tiptap/extension-hard-break'
import { Plugin, TextSelection } from '@tiptap/pm/state'
import { Extension } from '@tiptap/react'

export const CustomHardBreak = HardBreak.configure({
  keepMarks: false,
}).extend({
  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.setHardBreak(),
    }
  },
})

export const AutoBreak = Extension.create({
  name: 'autoBreak',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) {
            return null
          }

          const tr = newState.tr
          let modiffied = false

          newState.doc.descendants((node, pos) => {
            if (node.type.name == 'hardBreak') {
              const nextNode = newState.doc.nodeAt(pos + 1)

              if (nextNode?.type.name == 'hardBreak') {
                /* const $pos = newState.doc.resolve(pos) */
                /* const parentStart = $pos.before($pos.depth)
                 * const parentEnd = $pos.after($pos.depth) */

                tr.delete(pos, pos + 2)
                tr.split(pos)
                modiffied = true
              }
            }
          })

          return modiffied ? tr : null
        },
      }),
    ]
  },
})

export const CodeBlockEnter = Extension.create({
  name: 'codeBlockEnter',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleKeyDown: (view, event) => {
            if (event.key !== 'Enter') {
              return false
            }

            const { state } = view
            const { selection, schema } = state
            const { $from } = selection
            const node = $from.node()

            // 只处理代码块
            if (node.type.name !== 'codeBlock') {
              return false
            }

            // 获取代码块的内容和位置信息
            const nodeStart = $from.before()
            const nodeEnd = $from.after()
            const content = node.textContent
            const pos = $from.pos - nodeStart

            // 处理尾部连续换行
            const isAtEnd = pos >= content.length - 1
            if (isAtEnd && content.endsWith('\n')) {
              event.preventDefault()

              const tr = state.tr

              // 先删除代码块末尾的换行
              tr.delete(nodeEnd - 1, nodeEnd)

              // 插入新段落
              const paragraph = schema.nodes.paragraph.create()
              tr.insert(nodeEnd - 1, paragraph)

              // 计算新的光标位置
              // 需要考虑文档结构的变化
              const newDoc = tr.doc
              const resolvedPos = tr.doc.resolve(nodeEnd - 1)
              const newSelection = TextSelection.create(
                newDoc,
                resolvedPos.pos + 1
              )
              tr.setSelection(newSelection)

              view.dispatch(tr)
              return true
            }

            // 处理首部连续换行
            if (pos <= 1 && content.startsWith('\n')) {
              event.preventDefault()

              const tr = state.tr

              // 先删除代码块开头的换行
              tr.delete(nodeStart + 1, nodeStart + 2)

              // 在代码块前插入段落
              const paragraph = schema.nodes.paragraph.create()
              tr.insert(nodeStart, paragraph)

              // 计算新的光标位置
              const resolvedPos = tr.doc.resolve(nodeStart)
              tr.setSelection(TextSelection.create(tr.doc, resolvedPos.pos))

              view.dispatch(tr)
              return true
            }

            // 普通换行处理
            event.preventDefault()
            view.dispatch(state.tr.insertText('\n'))
            return true
          },
        },
      }),
    ]
  },
})

export const CodeBlockTab = Extension.create({
  name: 'codeBlockTab',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleKeyDown: (view, event) => {
            if (event.key !== 'Tab') {
              return false
            }

            const { state } = view
            const { selection } = state
            const { $from } = selection
            const node = $from.node()

            if (node.type.name === 'codeBlock') {
              event.preventDefault()

              // 插入两个空格作为缩进
              const tr = state.tr.insertText('  ', selection.from)
              view.dispatch(tr)

              return true
            }

            return false
          },
        },
      }),
    ]
  },
})
