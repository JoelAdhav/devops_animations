import test from 'node:test'
import assert from 'node:assert/strict'
import { readProgress, writeProgress, clearProgress, loadLastLesson, saveLastLesson } from '../src/lib/storage.ts'

function storage() {
  const data = new Map()
  globalThis.localStorage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) }
  return data
}

test('drafts survive reads, stay isolated, and reset without erasing completion', () => {
  const data = storage()
  data.set('dvl.progress', '["linux-fs"]')
  writeProgress('scenario.one', { cwd: '/home/joel', log: ['pwd'] })
  writeProgress('scenario.two', { cwd: '/' })
  assert.deepEqual(readProgress('scenario.one', (v) => v?.cwd === '/home/joel'), { cwd: '/home/joel', log: ['pwd'] })
  clearProgress('scenario.one')
  assert.equal(readProgress('scenario.one', (v) => v !== null), null)
  assert.deepEqual(readProgress('scenario.two', (v) => v?.cwd === '/'), { cwd: '/' })
  assert.equal(data.get('dvl.progress'), '["linux-fs"]')
})

test('malformed and incompatible drafts fall back safely', () => {
  const data = storage()
  data.set('dvl.draft.v1.last-lesson', '{invalid')
  assert.equal(loadLastLesson(), null)
  writeProgress('last-lesson', { id: 3, tab: 'sim' })
  assert.equal(loadLastLesson(), null)
  writeProgress('last-lesson', { id: 'dns', tab: 'unknown' })
  assert.equal(loadLastLesson(), null)
})

test('last lesson preserves both lesson and mode', () => {
  storage()
  saveLastLesson('load-balancing', 'sim')
  assert.deepEqual(loadLastLesson(), { id: 'load-balancing', tab: 'sim' })
  saveLastLesson('dns', 'learn')
  assert.deepEqual(loadLastLesson(), { id: 'dns', tab: 'learn' })
})

test('blocked storage never interrupts learning', () => {
  globalThis.localStorage = { getItem() { throw Error('blocked') }, setItem() { throw Error('quota') }, removeItem() { throw Error('blocked') } }
  assert.equal(loadLastLesson(), null)
  assert.doesNotThrow(() => saveLastLesson('dns', 'learn'))
  assert.doesNotThrow(() => clearProgress('scenario.one'))
})
