#!/usr/bin/env bun
// Credentialless installed-plugin + actual Meridian loader/parser boundary.
// This is not native Windows, OpenCode-client, SDK or live model acceptance.
import assert from 'node:assert/strict'
import {mkdtempSync, writeFileSync, rmSync, readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join, resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'

const meridian = resolve(process.env.E2E_MERIDIAN_ROOT)
const entry = resolve(process.env.E2E_PLUGIN_PATH)
const output = resolve(process.env.E2E_REPORT)
const moduleAt = relative => import(pathToFileURL(join(meridian, relative)).href)
const {resolveOpenCodeScrub, configureOpenCodeScrub, verifyOpenCodeScrub} = await moduleAt('scripts/lib-opencode-scrub-preflight.mjs')
const {loadPlugins, getActiveTransforms} = await moduleAt('src/proxy/plugins/loader.ts')
const {getPluginStats} = await moduleAt('src/proxy/plugins/stats.ts')
const {createRequestContext, runTransformHook} = await moduleAt('src/proxy/transform.ts')
const {extractClientCwd, getConversationFingerprint} = await moduleAt('src/proxy/session/fingerprint.ts')
const installation = resolveOpenCodeScrub(entry)
const root = mkdtempSync(join(tmpdir(), 'scrub-cwd-package-'))
const originalMode = process.env.MERIDIAN_OPENCODE_SCRUB_MODE
const report = {scope:'credentialless installed plugin and Meridian parser; no client/model/platform acceptance', modelCalls:0, installation, harnessSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'), cases:[]}
report.implementationSha256 = createHash('sha256').update(readFileSync(join(dirname(entry), 'scrub.js'))).digest('hex')
try {
 const config = configureOpenCodeScrub(root, installation)
 const plugins = await loadPlugins(config.pluginDir, config.pluginConfigPath)
 const inventory = () => ({plugins:plugins.map(p => ({...p,stats:getPluginStats(p.name)}))})
 report.loaded = verifyOpenCodeScrub(inventory(), installation)
 const paths = ['C:\\work\\OpenCode', '/tmp/OhMyOpenCode project', '/tmp/You are powered by the model named Demo']
 const labels = ['Working directory', 'Primary working directory', 'primary WORKING DIRECTORY', 'Working\tdirectory']
 for (const mode of ['minimal','aggressive']) {
  process.env.MERIDIAN_OPENCODE_SCRUB_MODE = mode
  for (const cwd of paths) for (const label of labels) for (const bare of [false,true]) {
   const source = 'You are OpenCode, the best coding agent on the planet.\n' + (bare ? '' : 'Here is some useful information about the environment you are running in:\n') + `<env>\n  ${label}: ${cwd}\n</env>\nKeep project instructions.`
   const context = createRequestContext({adapter:'opencode',body:{},headers:new Headers(),model:'fixture-no-model-call',messages:[],systemContext:source,stream:false,workingDirectory:root})
   const result = runTransformHook(getActiveTransforms(plugins),'onRequest',context,'opencode')
   const repeated = runTransformHook(getActiveTransforms(plugins),'onRequest',result,'opencode')
   const actual = extractClientCwd({system:result.systemContext})
   const messages = [{role:'user',content:'same first message'}]
   report.cases.push({mode,cwd,label,bare,pathPreserved:actual===cwd,historyIdentityPreserved:getConversationFingerprint(messages,actual)===getConversationFingerprint(messages,cwd),idempotent:repeated.systemContext===result.systemContext,policyPreserved:result.systemContext.includes('Keep project instructions.')})
  }
  const source = '<env>\n  Working directory: /tmp/OpenCode\n</env>\nOrdinary Claude Code instructions.'
  const context = createRequestContext({adapter:'passthrough',body:{},headers:new Headers(),model:'fixture-no-model-call',messages:[],systemContext:source,stream:false,workingDirectory:root})
  const result = runTransformHook(getActiveTransforms(plugins),'onRequest',context,'passthrough')
  assert.equal(result.systemContext,source,'Unmarked passthrough traffic changed')
 }
 report.invoked = verifyOpenCodeScrub(inventory(),installation,true)
 report.failed = report.cases.filter(r=>!r.pathPreserved||!r.historyIdentityPreserved||!r.idempotent||!r.policyPreserved).length
 report.result = report.failed ? 'FAIL' : 'PASS'
 process.exitCode = report.failed ? 1 : 0
} finally {
 if (originalMode===undefined) delete process.env.MERIDIAN_OPENCODE_SCRUB_MODE
 else process.env.MERIDIAN_OPENCODE_SCRUB_MODE=originalMode
 rmSync(root,{recursive:true,force:true})
 writeFileSync(output,JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify({result:report.result,failed:report.failed,cases:report.cases.length,output}))
}
