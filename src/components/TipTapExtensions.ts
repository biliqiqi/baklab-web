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
          let modified = false

          newState.doc.descendants((node, pos) => {
            if (node.type.name == 'hardBreak') {
              const nextNode = newState.doc.nodeAt(pos + 1)

              if (nextNode?.type.name == 'hardBreak') {
                /* const $pos = newState.doc.resolve(pos) */
                /* const parentStart = $pos.before($pos.depth)
                 * const parentEnd = $pos.after($pos.depth) */

                tr.delete(pos, pos + 2)
                tr.split(pos)
                modified = true
              }
            }
          })

          return modified ? tr : null
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

            if (node.type.name !== 'codeBlock') {
              return false
            }

            const nodeStart = $from.before()
            const nodeEnd = $from.after()
            const content = node.textContent
            const pos = $from.pos - nodeStart

            const isAtEnd = pos >= content.length - 1
            if (isAtEnd && content.endsWith('\n')) {
              event.preventDefault()

              const tr = state.tr

              tr.delete(nodeEnd - 1, nodeEnd)

              const paragraph = schema.nodes.paragraph.create()
              tr.insert(nodeEnd - 1, paragraph)

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

            if (pos <= 1 && content.startsWith('\n')) {
              event.preventDefault()

              const tr = state.tr

              tr.delete(nodeStart + 1, nodeStart + 2)

              const paragraph = schema.nodes.paragraph.create()
              tr.insert(nodeStart, paragraph)

              const resolvedPos = tr.doc.resolve(nodeStart)
              tr.setSelection(TextSelection.create(tr.doc, resolvedPos.pos))

              view.dispatch(tr)
              return true
            }

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
