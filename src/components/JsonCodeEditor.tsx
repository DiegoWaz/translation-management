import { useEffect, useMemo, useRef, type Ref } from 'react'
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { HighlightStyle, foldGutter, syntaxHighlighting } from '@codemirror/language'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { tags as t } from '@lezer/highlight'
import { cn } from '../helpers/cn'

const jsonHighlight = HighlightStyle.define([
  { tag: t.propertyName, color: 'var(--json-key)' },
  { tag: t.string, color: 'var(--json-string)' },
  { tag: t.number, color: 'var(--json-number)' },
  { tag: t.bool, color: 'var(--json-boolean)' },
  { tag: t.null, color: 'var(--json-null)' },
  { tag: t.punctuation, color: 'var(--json-punct)' },
  { tag: t.bracket, color: 'var(--json-bracket)' },
  { tag: t.squareBracket, color: 'var(--json-bracket)' },
  { tag: t.brace, color: 'var(--json-bracket)' },
  { tag: t.separator, color: 'var(--json-punct)' },
  { tag: t.invalid, color: 'var(--json-invalid)' },
])

const editorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--background-input)',
    color: 'var(--text-primary)',
    height: '100%',
    fontSize: '12px',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace",
    lineHeight: '1.55',
    overflow: 'auto',
  },
  '.cm-content': {
    caretColor: 'var(--text-primary)',
    padding: '10px 0',
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--text-brand)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'color-mix(in srgb, var(--brand) 28%, transparent) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'color-mix(in srgb, var(--background-row-hover) 80%, transparent)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--background-surface)',
    color: 'var(--text-faint)',
    border: 'none',
    borderRight: '1px solid var(--border-subtle)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--background-row-hover)',
    color: 'var(--text-muted)',
  },
  '.cm-foldGutter .cm-gutterElement': {
    padding: '0 4px',
    cursor: 'pointer',
    color: 'var(--text-muted)',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--background-elevated)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-brand)',
    margin: '0 2px',
    padding: '0 6px',
    borderRadius: '4px',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'color-mix(in srgb, var(--brand) 22%, transparent)',
    outline: '1px solid var(--border-brand-soft)',
  },
})

export const JsonCodeEditor = ({
  value,
  onChange,
  readOnly = false,
  autoFocus = false,
  className,
  onEscape,
  onSaveShortcut,
  editorRef,
}: {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  autoFocus?: boolean
  className?: string
  onEscape?: () => void
  onSaveShortcut?: () => void
  editorRef?: Ref<ReactCodeMirrorRef>
}) => {
  const onEscapeRef = useRef(onEscape)
  const onSaveRef = useRef(onSaveShortcut)
  useEffect(() => { onEscapeRef.current = onEscape }, [onEscape])
  useEffect(() => { onSaveRef.current = onSaveShortcut }, [onSaveShortcut])

  const extensions = useMemo(() => {
    const extras = [
      json(),
      lineNumbers(),
      foldGutter({
        openText: '▾',
        closedText: '▸',
      }),
      syntaxHighlighting(jsonHighlight),
      editorTheme,
      EditorView.lineWrapping,
      keymap.of([
        {
          key: 'Escape',
          run: () => {
            onEscapeRef.current?.()
            return Boolean(onEscapeRef.current)
          },
        },
        {
          key: 'Mod-Enter',
          run: () => {
            onSaveRef.current?.()
            return Boolean(onSaveRef.current)
          },
        },
      ]),
    ]
    if (readOnly) {
      extras.push(EditorState.readOnly.of(true), EditorView.editable.of(false))
    }
    return extras
  }, [readOnly])

  return (
    <div
      className={cn(
        'border border-border rounded-md overflow-hidden bg-input min-h-0',
        className,
      )}
    >
      <CodeMirror
        ref={editorRef}
        value={value}
        height="100%"
        theme="none"
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: !readOnly,
          highlightSelectionMatches: true,
          bracketMatching: true,
          closeBrackets: !readOnly,
          autocompletion: false,
          indentOnInput: true,
        }}
        extensions={extensions}
        editable={!readOnly}
        readOnly={readOnly}
        autoFocus={autoFocus}
        onChange={next => onChange?.(next)}
        className="h-full text-[12px] [&_.cm-editor]:h-full [&_.cm-editor]:outline-none"
      />
    </div>
  )
}
