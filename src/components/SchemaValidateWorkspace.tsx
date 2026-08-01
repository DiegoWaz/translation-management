import { useEffect, useMemo, useState } from 'react'
import { cn } from '../helpers/cn'
import {
  compileZodSchemas,
  EXAMPLE_JSON,
  EXAMPLE_ZOD_DTO,
  parseJsonValue,
  validateWithZod,
  type ZodIssueRow,
} from '../helpers/zodCompile'
import { btnSecClass } from '../helpers/styles'
import { t, ui } from '../i18n/ui'
import { JsonCodeEditor } from './JsonCodeEditor'

export const SchemaValidateWorkspace = ({ isMobile }: { isMobile: boolean }) => {
  const [schemaSource, setSchemaSource] = useState(EXAMPLE_ZOD_DTO)
  const [jsonText, setJsonText] = useState(EXAMPLE_JSON)
  const [selectedSchema, setSelectedSchema] = useState('ProductPlotWithImageArrayDTO')
  const [autoValidate, setAutoValidate] = useState(true)

  const compiled = useMemo(() => compileZodSchemas(schemaSource), [schemaSource])

  useEffect(() => {
    if (!compiled.ok) return
    if (!compiled.module.schemas[selectedSchema]) {
      setSelectedSchema(compiled.module.names[compiled.module.names.length - 1] ?? compiled.module.names[0])
    }
  }, [compiled, selectedSchema])

  const jsonParsed = useMemo(() => parseJsonValue(jsonText), [jsonText])

  const validation = useMemo(() => {
    if (!autoValidate) return null
    if (!compiled.ok) return null
    const schema = compiled.module.schemas[selectedSchema]
    if (!schema) return null
    if (!jsonParsed.ok) return null
    return validateWithZod(schema, jsonParsed.value)
  }, [autoValidate, compiled, selectedSchema, jsonParsed])

  const runManual = () => {
    // Force recompute by toggling — validation is derived; just ensure auto is on
    setAutoValidate(true)
  }

  const issues: ZodIssueRow[] = validation && !validation.ok ? validation.issues : []
  const isValid = validation?.ok === true

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className={cn('border-b border-border bg-surface shrink-0 flex flex-wrap items-center gap-2', isMobile ? 'px-3 py-2.5' : 'px-5 py-3')}>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-fg">{ui.schema.title}</div>
          <div className="text-[11px] text-fg-muted">{ui.schema.subtitle}</div>
        </div>
        <div className="flex-1" />

        {compiled.ok && (
          <label className="flex items-center gap-1.5 text-[11px] text-fg-secondary">
            <span>{ui.schema.targetSchema}</span>
            <select
              value={selectedSchema}
              onChange={e => setSelectedSchema(e.target.value)}
              className="bg-elevated border border-border rounded-md text-fg text-[11px] font-mono px-2 py-1 outline-none max-w-[220px]"
            >
              {compiled.module.names.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
        )}

        <label className="flex items-center gap-1.5 text-[11px] text-fg-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoValidate}
            onChange={e => setAutoValidate(e.target.checked)}
            className="accent-[var(--brand)]"
          />
          {ui.schema.autoValidate}
        </label>

        <button
          type="button"
          onClick={() => {
            setSchemaSource(EXAMPLE_ZOD_DTO)
            setJsonText(EXAMPLE_JSON)
            setSelectedSchema('ProductPlotWithImageArrayDTO')
          }}
          className={cn(btnSecClass, 'text-[11px] py-1 px-2.5')}
        >
          {ui.schema.loadExample}
        </button>

        {!autoValidate && (
          <button type="button" onClick={runManual} className={cn(btnSecClass, 'text-[11px] py-1 px-2.5')}>
            {ui.schema.validate}
          </button>
        )}

        {compiled.ok && jsonParsed.ok && validation && (
          <span className={cn(
            'text-[11px] font-mono px-2 py-0.5 rounded-full border',
            isValid
              ? 'bg-success-bg border-border-success text-fg-success'
              : 'bg-warning-bg border-border-warning text-fg-warning',
          )}>
            {isValid
              ? ui.schema.valid
              : t(ui.schema.issueCount, { count: issues.length })}
          </span>
        )}
      </div>

      <div className={cn(
        'flex-1 min-h-0 grid gap-0',
        isMobile ? 'grid-rows-2' : 'grid-cols-2',
      )}>
        <div className={cn('min-h-0 flex flex-col overflow-hidden', !isMobile && 'border-r border-border')}>
          <div className="px-3 py-1.5 border-b border-border bg-surface flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-semibold text-fg-secondary">{ui.schema.dtoPane}</span>
            <div className="flex-1" />
            {compiled.ok ? (
              <span className="text-[10px] text-fg-success">
                {t(ui.schema.schemasFound, { count: compiled.module.names.length })}
              </span>
            ) : (
              <span className="text-[10px] text-fg-warning truncate max-w-[55%]" title={compiled.error}>
                {compiled.error === 'empty'
                  ? ui.schema.dtoEmpty
                  : compiled.error === 'no_const' || compiled.error === 'no_schema'
                    ? ui.schema.dtoNoSchema
                    : t(ui.schema.dtoCompileError, { message: compiled.error })}
              </span>
            )}
          </div>
          <textarea
            value={schemaSource}
            onChange={e => setSchemaSource(e.target.value)}
            spellCheck={false}
            placeholder={ui.schema.dtoPlaceholder}
            className="flex-1 min-h-0 w-full resize-none bg-transparent border-none outline-none px-3 py-2 text-[12px] font-mono text-fg"
          />
          <div className="px-3 py-1.5 border-t border-border bg-surface text-[10px] text-fg-muted shrink-0">
            {ui.schema.dtoHint}
          </div>
        </div>

        <div className="min-h-0 flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 border-b border-border bg-surface flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-semibold text-fg-secondary">{ui.schema.jsonPane}</span>
            <div className="flex-1" />
            {jsonParsed.ok ? (
              <span className="text-[10px] text-fg-success">{ui.schema.jsonValid}</span>
            ) : (
              <span className="text-[10px] text-fg-warning">
                {jsonText.trim() ? t(ui.schema.jsonError, { message: jsonParsed.error }) : ui.schema.jsonEmpty}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <JsonCodeEditor
              value={jsonText}
              onChange={setJsonText}
              className="h-full min-h-0 flex flex-col border-0 rounded-none"
            />
          </div>
        </div>
      </div>

      <div className="h-[min(280px,36vh)] shrink-0 border-t border-border flex flex-col overflow-hidden bg-row-even">
        <div className="px-3 py-1.5 border-b border-border bg-surface text-[11px] text-fg-muted shrink-0 flex items-center gap-2">
          <span className="font-semibold text-fg-secondary">{ui.schema.results}</span>
          {selectedSchema && (
            <span className="font-mono text-fg-brand">{selectedSchema}</span>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          {!compiled.ok || !jsonParsed.ok ? (
            <div className="h-full flex items-center justify-center text-sm text-fg-faint px-6 text-center">
              {ui.schema.waiting}
            </div>
          ) : isValid ? (
            <div className="h-full flex items-center justify-center text-sm text-fg-success px-6 text-center font-medium">
              {ui.schema.validMessage}
            </div>
          ) : issues.length > 0 ? (
            <table className="border-collapse text-[11px] font-mono w-full">
              <thead className="sticky top-0 bg-surface z-10">
                <tr>
                  <th className="w-10 px-2 py-1.5 border-b border-r border-border text-fg-muted text-left">#</th>
                  <th className="px-2 py-1.5 border-b border-r border-border text-fg-muted text-left w-[28%]">
                    {ui.schema.colPath}
                  </th>
                  <th className="px-2 py-1.5 border-b border-r border-border text-fg-muted text-left">
                    {ui.schema.colMessage}
                  </th>
                  <th className="px-2 py-1.5 border-b border-border text-fg-muted text-left w-[18%]">
                    {ui.schema.colCode}
                  </th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue, i) => (
                  <tr key={`${issue.path}-${i}`} className={i % 2 === 0 ? 'bg-warning-bg/40' : 'bg-warning-bg/20'}>
                    <td className="px-2 py-1.5 border-b border-r border-border-subtle text-fg-faint">{i + 1}</td>
                    <td className="px-2 py-1.5 border-b border-r border-border-subtle text-fg-brand font-semibold break-all">
                      {issue.path}
                    </td>
                    <td className="px-2 py-1.5 border-b border-r border-border-subtle text-fg-warning break-words">
                      {issue.message}
                    </td>
                    <td className="px-2 py-1.5 border-b border-border-subtle text-fg-muted">{issue.code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-fg-faint px-6 text-center">
              {ui.schema.waiting}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
