#!/usr/bin/env bun
// Manual real-client/SDK gate. Uses only a private access-only OAuth profile.
// The before hook substitutes an owned Primary-form context directory into the
// actual client prompt. It does not fabricate responses or replace the SDK.
// SDK cwd is intentionally distinct, so its own preset cannot make this pass.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, realpathSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { spyOn } from 'bun:test'

const meridian = realpathSync(process.env.E2E_MERIDIAN_ROOT)
const scrub = realpathSync(process.env.E2E_PLUGIN_PATH)
const grant = realpathSync(process.env.E2E_LIVE_PROFILE_FILE)
assert.equal(statSync(grant).mode & 0o077, 0, 'Profile input must be private')
const profiles = JSON.parse(readFileSync(grant, 'utf8'))
assert(Array.isArray(profiles) && profiles.length === 1 && profiles[0].type === 'oauth-token'
  && profiles[0].oauthToken && profiles[0].refreshToken === undefined)
const model = process.env.E2E_MODEL ?? 'claude-opus-5-5'
const mode = process.env.E2E_SCRUB_MODE ?? 'aggressive'
assert(['aggressive', 'minimal'].includes(mode))
const clientBin = process.env.E2E_OPENCODE_BIN ?? 'opencode'
const root = realpathSync(mkdtempSync(join(tmpdir(), 'scrub-primary-cwd-')))
for (const name of ['home', 'project', 'config', 'proxy', 'plugins', 'sessions']) mkdirSync(join(root, name), { mode: 0o700 })
const project = join(root, 'project')
const contextDir = join(project, 'primary-context')
mkdirSync(contextDir, { mode: 0o700 })
const cleanEnv = { ...process.env }
for (const key of Object.keys(cleanEnv)) if (/^(MERIDIAN_|CLAUDE_|CLAUDE_PROXY_|ANTHROPIC_|OPENAI_|OPENCODE_)/.test(key)) delete cleanEnv[key]
Object.assign(cleanEnv, { HOME: join(root, 'home'), PWD: project, OPENCODE_CONFIG_DIR: join(root, 'config'), OPENCODE_DISABLE_AUTOUPDATE: '1' })
for (const kind of ['CONFIG', 'DATA', 'CACHE', 'STATE']) cleanEnv[`XDG_${kind}_HOME`] = join(root, kind.toLowerCase())
for (const key of Object.keys(process.env)) if (/^(MERIDIAN_|CLAUDE_|CLAUDE_PROXY_|ANTHROPIC_|OPENAI_)/.test(key)) delete process.env[key]
Object.assign(process.env, { HOME: cleanEnv.HOME, MERIDIAN_CONFIG_DIR: join(root, 'proxy'), MERIDIAN_SESSION_DIR: join(root, 'sessions'),
  MERIDIAN_WORKDIR: project, MERIDIAN_TELEMETRY_PERSIST: '0', MERIDIAN_CREDENTIALS_READONLY: '1', MERIDIAN_NO_UPDATE_CHECK: '1',
  MERIDIAN_PASSTHROUGH: '1', MERIDIAN_OPENCODE_SCRUB_MODE: mode })
const version = spawnSync(clientBin, ['--version'], { encoding: 'utf8', env: cleanEnv, timeout: 10000 })
assert.equal(version.status, 0)
assert(/^1\./.test(version.stdout.trim()), 'This gate requires OpenCode V1')
const before = [], after = [], queries = [], wire = []
globalThis.__primaryCwdBefore = before
globalThis.__primaryCwdAfter = after
const beforePath = join(root, 'before.mjs'), afterPath = join(root, 'after.mjs')
writeFileSync(beforePath, `export default { name: 'primary-form-fixture', onRequest(ctx) {
  const system = ctx.systemContext || '';
  const changed = system.replace(/(^|\\n)([ \\t]*)Working directory:[^\\n]*/i, '$1$2Primary working directory: ' + ${JSON.stringify(contextDir)});
  globalThis.__primaryCwdBefore.push({adapter:ctx.adapter, injected:changed !== system,
    hasClientCwd:changed.includes(${JSON.stringify(contextDir)}), hasPrimary:changed.includes('Primary working directory:')});
  return {...ctx, systemContext:changed};
} }`)
writeFileSync(afterPath, `export default { name: 'primary-form-observer', onRequest(ctx) {
  const s=ctx.systemContext || ''; globalThis.__primaryCwdAfter.push({adapter:ctx.adapter,
    hasClientCwd:s.includes(${JSON.stringify(contextDir)}), hasWorkingDirectory:s.includes('Working directory:'),
    fingerprint:/You are powered by the model named|Here is some useful information about the environment you are running in:|<omo-env>/.test(s)});
  return ctx;
} }`)
const pluginConfigPath = join(root, 'plugins.json')
writeFileSync(pluginConfigPath, JSON.stringify({ plugins: [beforePath, scrub, afterPath].map(path => ({ path, enabled: true })) }))
const require = createRequire(join(meridian, 'package.json'))
const sdk = await import(pathToFileURL(require.resolve('@anthropic-ai/claude-agent-sdk')).href)
const actualQuery = sdk.query
const observer = spyOn(sdk, 'query').mockImplementation(input => {
  const system = input.options?.systemPrompt
  const append = typeof system === 'string' ? system : system?.append ?? ''
  const fact = { hasClientCwd: append.includes(contextDir), accountMatched: input.options?.env?.CLAUDE_CODE_OAUTH_TOKEN === profiles[0].oauthToken,
    models: [], result: false, error: false, iteratorJoined: false }
  queries.push(fact)
  const query = actualQuery(input)
  return new Proxy(query, { get(target, key) {
    if (key === Symbol.asyncIterator) return async function* () {
      try { for await (const message of query) {
        if (message.type === 'assistant' && typeof message.message?.model === 'string' && !fact.models.includes(message.message.model)) fact.models.push(message.message.model)
        if (message.type === 'result') {
          fact.result = true; fact.error = message.is_error === true
          // Never let an automatic client retry multiply a failed provider probe.
          if (fact.error && child?.exitCode === null && child?.signalCode === null) child.kill('SIGTERM')
        }
        yield message
      } } finally { fact.iteratorJoined = true }
    }
    const value = Reflect.get(target, key, target)
    return typeof value === 'function' ? value.bind(target) : value
  } })
})
const { startProxyServer } = await import(pathToFileURL(join(meridian, 'dist/server.js')).href)
let proxy, relay, child, closePromise, failure, childExit, childSignal
let stdout = '', stderr = '', spawnError, timedOut = false
const sockets = new Set(), active = new Set()
try {
  proxy = await startProxyServer({ port: 0, host: '127.0.0.1', silent: true, pluginConfigPath, pluginDir: join(root, 'plugins'), profiles, defaultProfile: profiles[0].id })
  if (!proxy.server.listening) await once(proxy.server, 'listening')
  const target = `http://127.0.0.1:${proxy.server.address().port}`
  const loaded = await (await fetch(target + '/plugins/list')).json()
  assert.equal(loaded.plugins.find(p => p.name === 'opencode-scrub')?.status, 'active')
  // Retain actual plugin-generated identity and route witnesses, not token/header values.
  const { createServer } = await import('node:http')
  relay = createServer((req, res) => {
    const task = (async () => {
      if (req.url?.includes('/messages')) wire.push({ route: req.url.split('?')[0], session: !!req.headers['x-opencode-session'],
        openCodeAgent: !!req.headers['x-opencode-agent'], signedTurn: !!req.headers['x-meridian-opencode-turn'] })
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const body = Buffer.concat(chunks)
      const headers = new Headers()
      for (const [key, value] of Object.entries(req.headers)) if (value && !['host', 'connection', 'content-length'].includes(key)) headers.set(key, Array.isArray(value) ? value.join(',') : value)
      const upstream = await fetch(target + req.url, { method: req.method, headers, ...(body.length ? { body } : {}), signal: AbortSignal.timeout(120000) })
      res.writeHead(upstream.status, Object.fromEntries(upstream.headers))
      if (upstream.body) for await (const chunk of upstream.body) { if (res.destroyed) break; res.write(chunk) }
      res.end()
    })().catch(error => { failure ??= error; res.destroy(error) }).finally(() => active.delete(task))
    active.add(task)
  })
  relay.on('connection', socket => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)) })
  await new Promise(resolve => relay.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${relay.address().port}`
  const setup = spawnSync('node', [join(meridian, 'dist/cli.js'), 'setup', '--v1'], { encoding: 'utf8', env: { ...cleanEnv, MERIDIAN_PORT: String(relay.address().port) }, timeout: 30000 })
  assert.equal(setup.status, 0, 'Isolated V1 setup failed')
  const configPath = join(root, 'config', 'opencode.json')
  const config = JSON.parse(readFileSync(configPath, 'utf8'))
  const clientPlugin = join(meridian, 'dist', 'meridian')
  assert.equal(config.plugin?.filter(path => realpathSync(path) === realpathSync(clientPlugin)).length, 1, 'Expected exactly one tested Meridian V1 plugin')
  Object.assign(config, { model: `anthropic/${model}`, small_model: `anthropic/${model}`, share: 'disabled', permission: 'deny',
    provider: { anthropic: { options: { apiKey: 'owned-loopback', baseURL: url }, models: { [model]: { name: model,
      limit: { context: 200000, output: 512 }, modalities: { input: ['text'], output: ['text'] }, reasoning: false, tool_call: true } } } } })
  writeFileSync(configPath, JSON.stringify(config), { mode: 0o600 })
  child = spawn(clientBin, ['run', '--format', 'json', '--title', 'owned-cwd-gate', '--model', `anthropic/${model}`, 'Briefly acknowledge this test request. Do not use tools.'],
    { cwd: project, env: cleanEnv, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
  closePromise = new Promise(resolve => child.once('close', (code, signal) => { childExit = code; childSignal = signal; resolve() }))
  child.once('error', error => { spawnError = error })
  child.stdout.on('data', chunk => { stdout += chunk; if (stdout.length > 2 * 1024 * 1024) child.kill('SIGTERM') })
  child.stderr.on('data', chunk => { stderr += chunk; if (stderr.length > 2 * 1024 * 1024) child.kill('SIGTERM') })
  const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM') }, 150000)
  const killTimer = setTimeout(() => { if (child.exitCode === null && child.signalCode === null) process.kill(-child.pid, 'SIGKILL') }, 155000)
  await closePromise
  clearTimeout(timer); clearTimeout(killTimer)
  if (spawnError) throw spawnError
  assert(!timedOut, 'Actual client exceeded deadline')
  assert.equal(childExit, 0, 'Actual client failed; inspect private stderr')
  const events = stdout.split('\n').filter(line => line.startsWith('{')).map(line => JSON.parse(line))
  assert(events.some(e => e.type === 'text' && e.part?.text), 'Actual client returned no text')
  assert(!events.some(e => e.type === 'error'), 'Actual client reported an error')
  assert(wire.some(w => ['/messages', '/v1/messages'].includes(w.route) && w.session && w.signedTurn), 'Missing real client-plugin request witnesses')
  assert(before.length && before.every(x => x.adapter === 'opencode' && x.injected && x.hasPrimary && x.hasClientCwd), 'Primary-form fixture did not arm')
  assert(after.length && after.every(x => x.adapter === 'opencode' && !x.fingerprint), 'Scrub changed adapter or retained fingerprints')
  assert(queries.length && queries.every(q => q.accountMatched && q.result && !q.error && q.iteratorJoined), 'Missing real joined successful SDK result')
  assert(queries.some(q => q.models.includes(model)), 'Served model did not match requested model')
  assert(after.every(x => x.hasClientCwd && x.hasWorkingDirectory) && queries.every(q => q.hasClientCwd), 'Primary working directory did not survive into the actual SDK system prompt')
} catch (error) { failure ??= error }
finally {
  if (child && closePromise) {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM')
    await closePromise
  }
  if (relay) {
    const closed = new Promise(resolve => relay.close(resolve))
    for (const socket of sockets) socket.destroy()
    await closed
    await Promise.all([...active])
  }
  if (proxy) await proxy.close()
  observer.mockRestore()
  writeFileSync(join(root, 'client.stdout'), stdout, { mode: 0o600 })
  writeFileSync(join(root, 'client.stderr'), stderr, { mode: 0o600 })
  const summary = { result: failure ? 'FAIL' : 'PASS', failure: failure?.message, root, mode, model,
    versions: { opencode: version.stdout.trim(), meridian: JSON.parse(readFileSync(join(meridian, 'package.json'))).version,
      sdk: JSON.parse(readFileSync(join(require.resolve('@anthropic-ai/claude-agent-sdk'), '..', 'package.json'))).version },
    childExit, childSignal, clientCloseJoined: !!closePromise, relayClosed: !!relay, activeHandlers: active.size, sockets: sockets.size,
    before, after, queries, wire }
  writeFileSync(join(root, 'proof.json'), JSON.stringify(summary, null, 2), { mode: 0o600 })
  console.log(JSON.stringify(summary))
}
if (failure) process.exitCode = 1
