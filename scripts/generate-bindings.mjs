#!/usr/bin/env node
// Full code-generation pipeline:
//   C++ headers → crdt_c_api.h + crdt_c_api.cpp → CMakeLists.txt → crdt.ts
//
// Run via: npm run generate
//
// Naming convention: C++ class name drives everything.
//   GCounter  → toSnake → g_counter  → C prefix "g_counter_*"
//              → toPascal → GCounter  → TS type "GCounterHandle"
//
// Limitation: acronym-heavy names like "LWWRegister" become "LwwRegister" in TS.
// Use underscores in the class name ("Lww_Register") to control word boundaries.

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const root    = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const include = `${root}/crdt-lib/include`
const src     = `${root}/crdt-lib/src`

// ── name helpers ──────────────────────────────────────────────────────────────

// GCounter → g_counter,  OrSet → or_set,  LWWRegister → lww_register
function toSnake(s) {
  return s
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toLowerCase()
}

// g_counter → GCounter,  or_set → OrSet
const toPascal = s => s.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join('')
const toCamel  = s => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
const isPtr    = t => t.includes('*')
const emType   = t => t.trim() === 'void' ? 'null' : t.includes('char') ? "'string'" : "'number'"

// ── C++ type → C type mapping ─────────────────────────────────────────────────

// Returns { c: 'C type string', wrap: fn to wrap a call expression } or null if unmappable.
function retToC(type, className) {
  const base = type.replace(/const\s+/g, '').replace(/[&*]/g, '').replace(/\s+/g, ' ').trim()
  if (type.trim() === 'void')  return { c: 'void',   wrap: v => v }
  if (base === 'int')          return { c: 'int',    wrap: v => v }
  if (base === 'bool')         return { c: 'int',    wrap: v => `(int)(${v})` }
  if (base === 'float')        return { c: 'float',  wrap: v => v }
  if (base === 'double')       return { c: 'double', wrap: v => v }
  if (base === className)      return { c: 'void*',  wrap: v => v }
  return null
}

// Returns { cDecl: 'type name', cppUse: expression } or null if unmappable.
function paramToC(type, pname, className) {
  const base = type.replace(/const\s+/g, '').replace(/[&*]/g, '').replace(/\s+/g, ' ').trim()
  if (base === 'int')          return { cDecl: `int ${pname}`,         cppUse: pname }
  if (base === 'bool')         return { cDecl: `int ${pname}`,         cppUse: `(bool)${pname}` }
  if (base === 'float')        return { cDecl: `float ${pname}`,       cppUse: pname }
  if (base === 'double')       return { cDecl: `double ${pname}`,      cppUse: pname }
  if (base === 'std::string')  return { cDecl: `const char* ${pname}`, cppUse: `std::string(${pname})` }
  if (base === className)      return { cDecl: `void* ${pname}`,       cppUse: `*static_cast<${className}*>(${pname})`, isHandle: true }
  return null
}

// ── C++ header parser ─────────────────────────────────────────────────────────

function parseCppHeader(content) {
  content = content
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')

  const classMatch = content.match(/\bclass\s+(\w+)\s*(?::[^{]*)?\{/)
  if (!classMatch) return null
  const className = classMatch[1]

  const publicIdx = content.indexOf('public:')
  if (publicIdx === -1) return null

  const afterPublic = content.slice(publicIdx + 'public:'.length)
  const stopIdx     = afterPublic.search(/\b(?:private|protected)\s*:/)
  const publicSec   = stopIdx === -1 ? afterPublic : afterPublic.slice(0, stopIdx)

  // Strip inline bodies so we only match declarations
  const stripped = publicSec.replace(/\{[^{}]*\}/g, '')

  // Constructor
  const ctorRe    = new RegExp(`${className}\\s*\\(([^)]*)\\)\\s*;`)
  const ctorMatch = stripped.match(ctorRe)
  if (!ctorMatch) {
    console.warn(`  ⚠  No public constructor found for ${className} — skipping`)
    return null
  }

  // Methods
  const methods  = []
  const methodRe = /([a-zA-Z_][\w\s<>:*&]*?)\s+(\w+)\s*\(([^)]*)\)\s*(?:const\s*)?;/g
  for (const m of stripped.matchAll(methodRe)) {
    const ret  = m[1].replace(/\s+/g, ' ').trim()
    const name = m[2].trim()
    if (name === className || name.startsWith('~')) continue
    methods.push({ ret, name, params: parseParams(m[3]) })
  }

  return { className, ctorParams: parseParams(ctorMatch[1]), methods }
}

function parseParams(raw) {
  if (!raw.trim() || raw.trim() === 'void') return []
  return raw.split(',').map(p => {
    p = p.split('=')[0].trim()            // strip default values
    const nm     = p.match(/(\*?\w+)\s*$/)
    if (!nm) return { type: p, pname: 'arg' }
    const hasPtr = nm[1].startsWith('*')
    const pname  = nm[1].replace(/^\*/, '')
    const type   = (p.slice(0, p.lastIndexOf(nm[1])).trim() + (hasPtr ? '*' : '')).replace(/\s+/g, ' ')
    return { type, pname }
  })
}

// ── Phase 1: parse all class headers ─────────────────────────────────────────

const headerFiles = readdirSync(include)
  .filter(f => (f.endsWith('.hpp') || f.endsWith('.h')) && !f.includes('c_api'))

const classes = []
for (const file of headerFiles) {
  const parsed = parseCppHeader(readFileSync(`${include}/${file}`, 'utf8'))
  if (parsed) {
    classes.push({ ...parsed, headerFile: file })
    console.log(`  Parsed ${parsed.className} — ${parsed.methods.length} method(s)`)
  }
}

if (classes.length === 0) {
  console.error('No C++ classes found in include/. Nothing to generate.')
  process.exit(1)
}

// ── Phase 2: generate crdt_c_api.h and crdt_c_api.cpp ────────────────────────

const hLines   = []
const cppLines = []
const allFns   = []

hLines.push(`// AUTO-GENERATED — do not edit. Run: npm run generate`)
hLines.push(`#pragma once`)
hLines.push(``)
hLines.push(`#ifdef __cplusplus`)
hLines.push(`extern "C" {`)
hLines.push(`#endif`)

cppLines.push(`// AUTO-GENERATED — do not edit. Run: npm run generate`)
cppLines.push(`#include "crdt_c_api.h"`)
for (const { headerFile } of classes) cppLines.push(`#include "${headerFile}"`)

for (const { className, ctorParams, methods } of classes) {
  const prefix = toSnake(className)

  hLines.push(``, `// ${className}`)
  cppLines.push(``, `// ── ${className} ──`)

  // create
  const ctorC = ctorParams.map(p => paramToC(p.type, p.pname, className))
  if (ctorC.some(m => !m)) {
    console.warn(`  ⚠  Skipping ${className}: unmappable constructor param`)
    continue
  }
  const ctorDecl = ctorC.map(m => m.cDecl).join(', ')
  const ctorCall = ctorC.map(m => m.cppUse).join(', ')
  hLines.push(`void* ${prefix}_create(${ctorDecl});`)
  cppLines.push(`void* ${prefix}_create(${ctorDecl}) { return new ${className}(${ctorCall}); }`)
  allFns.push(`${prefix}_create`)

  // destroy
  hLines.push(`void  ${prefix}_destroy(void* handle);`)
  cppLines.push(`void  ${prefix}_destroy(void* handle) { delete static_cast<${className}*>(handle); }`)
  allFns.push(`${prefix}_destroy`)

  // methods
  for (const { ret, name, params } of methods) {
    const retMap = retToC(ret, className)
    if (!retMap) {
      console.warn(`  ⚠  Skipping ${className}::${name}(): unmappable return type '${ret}'`)
      continue
    }

    const paramMaps = params.map(p => paramToC(p.type, p.pname, className))
    if (paramMaps.some(m => !m)) {
      const bad = params[paramMaps.findIndex(m => !m)]
      console.warn(`  ⚠  Skipping ${className}::${name}(): unmappable param type '${bad.type}'`)
      continue
    }

    const fnName   = `${prefix}_${toSnake(name)}`
    const allDecls = [`void* handle`, ...paramMaps.map(m => m.cDecl)].join(', ')
    const callArgs = paramMaps.map(m => m.cppUse).join(', ')
    const callExpr = `static_cast<${className}*>(handle)->${name}(${callArgs})`
    const body     = ret.trim() === 'void' ? `${callExpr};` : `return ${retMap.wrap(callExpr)};`

    hLines.push(`${retMap.c.padEnd(6)} ${fnName}(${allDecls});`)
    cppLines.push(`${retMap.c} ${fnName}(${allDecls}) { ${body} }`)
    allFns.push(fnName)
  }
}

hLines.push(``, `#ifdef __cplusplus`, `}`, `#endif`, ``)

writeFileSync(`${include}/crdt_c_api.h`, hLines.join('\n'))
console.log('✓ crdt-lib/include/crdt_c_api.h')

writeFileSync(`${src}/crdt_c_api.cpp`, cppLines.join('\n') + '\n')
console.log('✓ crdt-lib/src/crdt_c_api.cpp')

// ── Phase 3: update EXPORTED_FUNCTIONS in CMakeLists.txt ─────────────────────

const exportedList = allFns.map(f => `\\"_${f}\\"`).join(',')
const cmake        = readFileSync(`${root}/crdt-lib/CMakeLists.txt`, 'utf8')
const newCmake     = cmake.replace(
  /"SHELL:-s EXPORTED_FUNCTIONS=\[.*?\]"/s,
  `"SHELL:-s EXPORTED_FUNCTIONS=[${exportedList}]"`
)
writeFileSync(`${root}/crdt-lib/CMakeLists.txt`, newCmake)
console.log('✓ crdt-lib/CMakeLists.txt')

// ── Phase 4: generate frontend/src/lib/crdt.ts ────────────────────────────────

// Parse the freshly-written C API header to build TS bindings
const apiSrc = readFileSync(`${include}/crdt_c_api.h`, 'utf8')
  .replace(/#[^\n]*/g, '')
  .replace(/\/\/[^\n]*/g, '')
  .replace(/extern\s*"C"\s*\{/g, '')
  .replace(/\}/g, '')

const fns = []
for (const m of apiSrc.matchAll(/([a-zA-Z_][\w\s*]*?)\s+([a-z_]\w*)\s*\(([^)]*)\)\s*;/g)) {
  const ret    = m[1].replace(/\s+/g, ' ').trim()
  const name   = m[2].trim()
  const params = (!m[3].trim() || m[3].trim() === 'void') ? [] :
    m[3].split(',').map(p => {
      p = p.trim()
      const nm     = p.match(/(\*?\w+)\s*$/)
      if (!nm) return { type: p, pname: 'arg' }
      const hasPtr = nm[1].startsWith('*')
      const pname  = nm[1].replace(/^\*/, '')
      const type   = (p.slice(0, p.lastIndexOf(nm[1])).trim() + (hasPtr ? '*' : '')).replace(/\s+/g, ' ')
      return { type, pname }
    })
  fns.push({ ret, name, params })
}

const groups = {}
for (const fn of fns) {
  const i      = fn.name.lastIndexOf('_')
  const type   = fn.name.slice(0, i)
  const action = fn.name.slice(i + 1)
  ;(groups[type] ??= []).push({ ...fn, action })
}

const out = []
out.push(`// AUTO-GENERATED by scripts/generate-bindings.mjs — run \`npm run generate\` to update`)
out.push(``)
out.push(`interface CRDTModule {`)
out.push(`  cwrap: (name: string, ret: string | null, args: string[]) => (...args: number[]) => number`)
out.push(`}`)
out.push(``)
out.push(`let modulePromise: Promise<CRDTModule> | null = null`)
out.push(``)
out.push(`function loadModule(): Promise<CRDTModule> {`)
out.push(`  if (modulePromise) return modulePromise`)
out.push(`  modulePromise = new Promise((resolve, reject) => {`)
out.push(`    const script = document.createElement('script')`)
out.push(`    script.src = '/crdt_wasm.js'`)
out.push(`    script.onload = async () => {`)
out.push(`      try { resolve(await (window as any).CRDTModule()) }`)
out.push(`      catch (e) { reject(e) }`)
out.push(`    }`)
out.push(`    script.onerror = () => reject(new Error('Failed to load crdt_wasm.js'))`)
out.push(`    document.head.appendChild(script)`)
out.push(`  })`)
out.push(`  return modulePromise`)
out.push(`}`)

for (const [typeName, tfns] of Object.entries(groups)) {
  const Pascal   = toPascal(typeName)
  const Handle   = `${Pascal}Handle`
  const createFn = tfns.find(f => f.action === 'create')
  const methods  = tfns.filter(f => f.action !== 'create' && f.action !== 'destroy')
  if (!createFn) continue

  out.push(``)
  out.push(`export interface ${Handle} {`)
  for (const fn of methods) {
    const mparams = fn.params.slice(1)
    const sig = mparams.map(p =>
      `${toCamel(p.pname)}: ${isPtr(p.type) ? Handle : (p.type.includes('char') ? 'string' : 'number')}`
    ).join(', ')
    out.push(`  ${toCamel(fn.action)}: (${sig}) => ${fn.ret === 'void' ? 'void' : 'number'}`)
  }
  out.push(`  destroy: () => void`)
  out.push(`  _ptr: number`)
  out.push(`}`)

  const ctorParams = createFn.params.map(p => `${toCamel(p.pname)}: number`).join(', ')
  out.push(``)
  out.push(`export async function create${Pascal}(${ctorParams}): Promise<${Handle}> {`)
  out.push(`  const M = await loadModule()`)
  out.push(``)

  const maxLen = Math.max(...tfns.map(f => toCamel(f.action).length))
  for (const fn of tfns) {
    const pad    = ' '.repeat(maxLen - toCamel(fn.action).length + 1)
    const emRet  = emType(fn.ret)
    const emArgs = fn.params.map(p => p.type.includes('char') ? "'string'" : "'number'").join(', ')
    out.push(`  const _${toCamel(fn.action)}${pad}= M.cwrap('${fn.name}', ${emRet}, [${emArgs}])`)
  }

  out.push(``)
  out.push(`  const ptr = _create(${createFn.params.map(p => toCamel(p.pname)).join(', ')})`)
  out.push(``)
  out.push(`  return {`)
  out.push(`    _ptr: ptr,`)
  for (const fn of methods) {
    const mparams  = fn.params.slice(1)
    const msig     = mparams.map(p => isPtr(p.type) ? `${toCamel(p.pname)}: ${Handle}` : toCamel(p.pname)).join(', ')
    const callArgs = ['ptr', ...mparams.map(p => isPtr(p.type) ? `${toCamel(p.pname)}._ptr` : toCamel(p.pname))].join(', ')
    out.push(`    ${toCamel(fn.action)}: (${msig}) => _${toCamel(fn.action)}(${callArgs}),`)
  }
  out.push(`    destroy: () => _destroy(ptr),`)
  out.push(`  }`)
  out.push(`}`)
}

writeFileSync(`${root}/frontend/src/lib/crdt.ts`, out.join('\n') + '\n')
console.log('✓ frontend/src/lib/crdt.ts')
console.log(`\nGenerated ${allFns.length} C function(s) for: ${classes.map(c => c.className).join(', ')}`)
