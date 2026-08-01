import { z, type ZodTypeAny } from 'zod'

export type CompiledZodModule = {
  schemas: Record<string, ZodTypeAny>
  names: string[]
}

export type ZodIssueRow = {
  path: string
  message: string
  code: string
}

const STRIP_IMPORT = /^\s*import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm
const STRIP_EXPORT_TYPE = /^\s*export\s+type\s+[^;]+;?\s*$/gm
const STRIP_INFER_TYPE = /\bexport\s+type\s+\w+\s*=\s*z\.infer<[^;]+>;?/g

/** Prepare pasted DTO / Zod source so it can run with only `z` in scope. */
export const prepareZodSource = (source: string): string => {
  return source
    .replace(STRIP_IMPORT, '')
    .replace(STRIP_INFER_TYPE, '')
    .replace(STRIP_EXPORT_TYPE, '')
    .replace(/\bexport\s+const\b/g, 'const')
    .replace(/\bexport\s+\{[^}]*\};?/g, '')
    .replace(/\bexport\s+default\b/g, 'const __default =')
    .trim()
}

const collectConstNames = (source: string): string[] => {
  const names: string[] = []
  const re = /\bconst\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source))) {
    if (!names.includes(m[1])) names.push(m[1])
  }
  return names
}

const isZodSchema = (value: unknown): value is ZodTypeAny =>
  Boolean(value)
  && typeof value === 'object'
  && typeof (value as { safeParse?: unknown }).safeParse === 'function'

/**
 * Compile pasted Zod DTO definitions. Only `z` is injected — paste a
 * self-contained snippet (include parent schemas like ExtendedProductDTO).
 */
export const compileZodSchemas = (
  source: string,
): { ok: true; module: CompiledZodModule } | { ok: false; error: string } => {
  const body = prepareZodSource(source)
  if (!body) return { ok: false, error: 'empty' }

  const names = collectConstNames(body)
  if (names.length === 0) return { ok: false, error: 'no_const' }

  const returnObj = `{ ${names.map(n => `${JSON.stringify(n)}: typeof ${n} !== "undefined" ? ${n} : undefined`).join(', ')} }`

  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const factory = new Function(
      'z',
      `"use strict";\n${body}\nreturn ${returnObj};`,
    )
    const raw = factory(z) as Record<string, unknown>
    const schemas: Record<string, ZodTypeAny> = {}
    for (const [name, value] of Object.entries(raw)) {
      if (isZodSchema(value)) schemas[name] = value
    }
    const schemaNames = Object.keys(schemas)
    if (schemaNames.length === 0) return { ok: false, error: 'no_schema' }
    return { ok: true, module: { schemas, names: schemaNames } }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, error: message }
  }
}

export const parseJsonValue = (
  text: string,
): { ok: true; value: unknown } | { ok: false; error: string } => {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, error: 'empty' }
  try {
    return { ok: true, value: JSON.parse(trimmed) }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export const validateWithZod = (
  schema: ZodTypeAny,
  data: unknown,
): { ok: true } | { ok: false; issues: ZodIssueRow[] } => {
  const result = schema.safeParse(data)
  if (result.success) return { ok: true }
  const issues: ZodIssueRow[] = result.error.issues.map(issue => ({
    path: issue.path.length > 0 ? issue.path.map(String).join('.') : '(root)',
    message: issue.message,
    code: String(issue.code ?? 'invalid'),
  }))
  return { ok: false, issues }
}

export const EXAMPLE_ZOD_DTO = `const VariantDTO = z.object({
  id: z.string().nullish(),
  imageURL: z.string().nullish(),
  description: z.string().nullish(),
  isDefault: z.boolean().nullish(),
});

const FlagDTO = z.object({
  id: z.string().nullish(),
  label: z.string().nullish(),
});

const ImageDTO = z.object({
  url: z.string(),
  alt: z.string().nullish(),
});

const ProductTypeDTO = z.enum(["physical", "digital"]);

const BaseProductPlotDTO = z.object({
  id: z.string(),
  name: z.string(),
  pricePerUnit: z.string().nullish(),
  valuePrice: z.number().nullish(),
  reviewsCount: z.number().nullish(),
  rating: z.number().nullish(),
  isMaster: z.boolean().default(false),
  masterId: z.string().nullish(),
  variants: z.array(VariantDTO).default([]),
  defaultVariantId: z.string().nullish(),
  defaultVariantName: z.string().nullish(),
  variantsCount: z.number().nullish(),
  type: ProductTypeDTO,
  flags: z.array(FlagDTO).nullish(),
  toolkitUrl: z.string().nullish(),
  earlyAccess: z.boolean().nullish(),
});

const ProductPlotWithImageArrayDTO = BaseProductPlotDTO.extend({
  images: z.array(ImageDTO).default([]),
});
`

export const EXAMPLE_JSON = `{
  "id": "prod_1",
  "name": "Demo product",
  "type": "physical",
  "valuePrice": 12.5,
  "isMaster": true,
  "images": [{ "url": "https://example.com/a.png" }],
  "variants": [{ "id": "v1", "isDefault": true }]
}
`
