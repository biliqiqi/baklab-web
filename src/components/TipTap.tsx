import Bold from '@tiptap/extension-bold'
import CodeBlock from '@tiptap/extension-code-block'
import Document from '@tiptap/extension-document'
import History from '@tiptap/extension-history'
import Paragraph from '@tiptap/extension-paragraph'
import Placeholder from '@tiptap/extension-placeholder'
import Strike from '@tiptap/extension-strike'
import Text from '@tiptap/extension-text'
import { TextSelection } from '@tiptap/pm/state'
import {
  BubbleMenu,
  Editor,
  EditorContent,
  EditorContentProps,
  useEditor,
} from '@tiptap/react'
import { VariantProps, cva } from 'class-variance-authority'
import { CodeIcon } from 'lucide-react'
import { unescapeAll } from 'markdown-it/lib/common/utils.mjs'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Markdown } from 'tiptap-markdown'
import { useDebouncedCallback } from 'use-debounce'

import { cn, noop } from '@/lib/utils'

import {
  AutoBreak,
  CodeBlockEnter,
  CodeBlockTab,
  CustomHardBreak,
} from './TipTapExtensions'
import { Button } from './ui/button'

const tiptapVariant = cva(
  'min-h-[40px] h-full w-full mt-0 rounded-md border border-input bg-white px-3 py-2 text-base \
  ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none \
  focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 \
  disabled:cursor-not-allowed disabled:opacity-50 \
  data-[disabled="1"]:cursor-not-allowed data-[disabled="1"]:opacity-50 \
  overflow-y-auto',
  {
    variants: {
      state: {
        default: '',
        invalid:
          'ring-2 ring-primary ring-offset-2 ring-destructive focus-visible:ring-destructive',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  }
)

export interface TipTapProps
  extends Omit<
      EditorContentProps,
      'editor' | 'onChange' | 'value' | 'onResize'
    >,
    VariantProps<typeof tiptapVariant> {
  onChange?: (val: string) => void
  value?: string
  hideBubble?: boolean
  onResize?: (width: number, height: number) => void
}

export interface TipTapRef {
  editor: Editor | null
  element: HTMLDivElement | null
}

const TipTap = React.forwardRef<TipTapRef, TipTapProps>(
  (
    {
      state,
      disabled = false,
      onChange = noop,
      hideBubble = false,
      value,
      placeholder,
      onResize = noop,
      ...props
    },
    ref
  ) => {
    const elementRef = React.useRef<HTMLDivElement>(null)
    const lastContentRef = React.useRef<string>('')
    const { t } = useTranslation()

    const debouncedOnChange = useDebouncedCallback((content: string) => {
      if (content !== value) {
        onChange(content)
      }
    }, 100)

    const handleUpdate = React.useCallback(
      ({ editor }: { editor: Editor }) => {
        /* eslint-disable-next-line */
        const rawMarkdown: string = editor.storage.markdown.getMarkdown() || ''

        if (rawMarkdown !== lastContentRef.current) {
          lastContentRef.current = rawMarkdown
          const mdVal = unescapeAll(rawMarkdown)
          debouncedOnChange(mdVal)
        }
      },
      [debouncedOnChange]
    )

    const editor = useEditor({
      content: value,
      extensions: [
        Document,
        Bold,
        Paragraph,
        Text.configure({
          code: true,
        }),
        CustomHardBreak,
        AutoBreak,
        CodeBlock,
        CodeBlockEnter,
        CodeBlockTab,
        Strike,
        History,
        Markdown,
        Placeholder.configure({
          placeholder,
        }),
      ],
      editorProps: {
        attributes: {
          class: cn(tiptapVariant({ state })),
          ...(disabled ? { 'data-disabled': '1' } : {}),
        },
        transformPasted(slice) {
          return slice
        },
        handleClick(view, pos) {
          const { empty } = view.state.selection
          if (!empty) {
            const tr = view.state.tr.setSelection(
              TextSelection.create(view.state.doc, pos)
            )
            view.dispatch(tr)
            return true
          }
          return false
        },
      },
      editable: !disabled,
      onUpdate: handleUpdate,
    })

    const onKeyUp = React.useCallback(
      (_e: React.KeyboardEvent<HTMLDivElement>) => {
        /* e.stopPropagation() */
      },
      []
    )

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.ctrlKey && e.key.toLowerCase() == 'b') {
        e.stopPropagation()
      }
    }

    React.useImperativeHandle(
      ref,
      () => ({
        editor,
        element: elementRef.current,
      }),
      [editor]
    )

    React.useEffect(() => {
      /* console.log('value change: ', value) */
      if (
        editor &&
        editor.storage.markdown &&
        /* eslint-disable-next-line */
        value != editor.storage.markdown.getMarkdown()
      ) {
        editor.commands.setContent(value || '')
      }
    }, [value, editor])

    React.useEffect(() => {
      let resizeObserver: ResizeObserver | null = null

      if (elementRef.current) {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect
            onResize(width, height)
          }
        })
        resizeObserver.observe(elementRef.current)
      }

      return () => {
        if (resizeObserver) {
          resizeObserver.disconnect()
        }
        if (editor) {
          editor.destroy()
        }
      }
    }, [editor, onResize])

    React.useEffect(() => {
      if (editor !== null && placeholder !== '') {
        editor.extensionManager.extensions.filter(
          (extension) => extension.name === 'placeholder'
          // eslint-disable-next-line
        )[0].options['placeholder'] = placeholder
        editor.view.dispatch(editor.state.tr)
      }
    }, [editor, placeholder])

    if (!editor) return null

    return (
      <>
        <BubbleMenu
          editor={editor}
          className={cn(
            'flex items-center px-2 h-[32px] bg-white border-[1px] rounded-sm shadow-md overflow-hidden',
            hideBubble && 'hidden'
          )}
        >
          <Button
            variant={editor.isActive('bold') ? 'default' : 'ghost'}
            size="sm"
            className="px-3 h-full text-lg rounded-none"
            onClick={(e) => {
              e.preventDefault()
              editor.commands.toggleBold()
            }}
            title={t('bold')}
          >
            <b>B</b>
          </Button>
          <Button
            variant={editor.isActive('codeBlock') ? 'default' : 'ghost'}
            size="sm"
            className="px-3 h-full text-lg rounded-none font-sans"
            onClick={(e) => {
              e.preventDefault()
              editor.commands.toggleCodeBlock()
            }}
            title={t('codeBlock')}
          >
            <CodeIcon size={18} className="align-bottom" />
          </Button>
          <Button
            variant={editor.isActive('strike') ? 'default' : 'ghost'}
            size="sm"
            className="px-3 h-full text-lg rounded-none"
            onClick={(e) => {
              e.preventDefault()
              editor.commands.toggleStrike()
            }}
            title={t('middleLine')}
          >
            <del>S</del>
          </Button>
        </BubbleMenu>
        <EditorContent
          ref={elementRef}
          editor={editor}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          className="b-article-content"
          {...props}
        />
      </>
    )
  }
)

export default TipTap
