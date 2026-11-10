import './tsx-loader.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const { lessons } = await import('../src/lessons/registry.ts')
const { run, HOME } = await import('../src/lib/vfs.ts')

/** Plays commands the way the Simulation tab does and returns the state the goals see. */
function play(scenario, commands) {
  const { fs, cwd } = scenario.setup()
  const state = { fs, cwd: cwd ?? HOME, log: [] }
  const history = []
  for (const line of commands) {
    history.push(line)
    const r = run(state.fs, state.cwd, line, { history, host: scenario.host, commands: scenario.commands })
    state.log.push({ line, cwd: state.cwd, out: r.out.map((o) => o.text).join('\n') })
    state.fs = r.fs
    state.cwd = r.cwd
  }
  return state
}

for (const entry of lessons) {
  test(`${entry.id}: every ticket is solved by its own solution and unsolved at the start`, async () => {
    const lesson = await entry.load()
    for (const sc of lesson.simulation?.scenarios ?? []) {
      const start = play(sc, [])
      assert.ok(!sc.goals.every((g) => g.check(start)), `${sc.id} is already solved before any command`)
      const end = play(sc, sc.solution.filter((c) => !c.startsWith('# ')))
      const missed = sc.goals.filter((g) => !g.check(end)).map((g) => g.text)
      assert.deepEqual(missed, [], `${sc.id}: solution leaves goals unmet`)
      if (sc.Visual) assert.ok(renderToStaticMarkup(createElement(sc.Visual, { state: end })))
    }
  })
}

test('the Linux permissions and Processes lessons have tickets', async () => {
  for (const id of ['linux-permissions', 'processes']) {
    const lesson = await lessons.find((l) => l.id === id).load()
    assert.ok(lesson.simulation?.scenarios.length >= 3, `${id} needs tickets`)
  }
})
