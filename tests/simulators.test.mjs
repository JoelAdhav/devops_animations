import test from 'node:test'
import assert from 'node:assert/strict'
import { run, initialFs, HOME } from '../src/lib/vfs.ts'
import { hostRange } from '../src/lib/cidr.ts'

test('failed AND chains skip dependents but resume at semicolons', () => {
  const result = run(initialFs(), HOME, 'cat missing && echo skipped && touch skipped.txt; echo should-run && touch resumed.txt')
  assert.equal(result.code, 0)
  assert.equal(result.out.at(-1).text, 'should-run')
  assert.ok(!result.fs[`${HOME}/skipped.txt`])
  assert.equal(result.fs[`${HOME}/resumed.txt`].type, 'file')
  assert.ok(!result.out.some((line) => line.text === 'skipped'))
})

test('a failed terminal AND chain retains its failure exit code', () => {
  const result = run(initialFs(), HOME, 'cat missing && echo skipped && echo also-skipped')
  assert.equal(result.code, 1)
  assert.equal(result.out.length, 1)
})

for (const command of ['cp -r', 'mv']) {
  test(`${command} preserves existing files on directory destination conflicts`, () => {
    const fs = initialFs()
    const before = structuredClone(fs)
    const result = run(fs, HOME, `${command} projects notes.txt`)
    assert.equal(result.code, 1)
    assert.deepEqual(result.fs, before)
    assert.deepEqual(fs, before)
    assert.match(result.out[0].text, /different types/)
  })

  test(`${command} detects a conflicting child inside an existing destination directory`, () => {
    const fs = initialFs()
    fs[`${HOME}/target`] = { type: 'dir' }
    fs[`${HOME}/target/projects`] = { type: 'file', content: 'keep me' }
    const before = structuredClone(fs)
    const result = run(fs, HOME, `${command} projects target`)
    assert.equal(result.code, 1)
    assert.deepEqual(result.fs, before)
  })

  test(`${command} still supports valid directory transfers`, () => {
    const fs = initialFs()
    const result = run(fs, HOME, `${command} projects projects-copy`)
    assert.equal(result.code, 0)
    for (const [path, node] of Object.entries(fs).filter(([path]) => path.startsWith(`${HOME}/projects`))) {
      const copy = result.fs[path.replace(`${HOME}/projects`, `${HOME}/projects-copy`)]
      // mv keeps the node as is; cp (like real cp without -p) makes the copier the owner.
      if (command === 'mv') assert.deepEqual(copy, node)
      else assert.deepEqual({ type: copy.type, content: copy.content, owner: copy.owner }, { type: node.type, content: node.content, owner: 'joel' })
      assert.equal(!!result.fs[path], command !== 'mv')
    }
  })
}

test('AWS /16, /24 and /28 reserve the first four and final addresses', () => {
  for (const prefix of [16, 24, 28]) {
    const network = 0x0a000000
    const total = 2 ** (32 - prefix)
    assert.deepEqual(hostRange(network, network + total - 1, prefix, true), {
      valid: true, usable: total - 5, first: network + 4, last: network + total - 2,
    })
  }
})

test('unsupported AWS subnet prefixes never report usable addresses', () => {
  for (const prefix of [8, 15, 29, 30, 31, 32]) {
    assert.deepEqual(hostRange(0, 2 ** (32 - prefix) - 1, prefix, true), {
      valid: false, usable: 0, first: null, last: null,
    })
  }
})

test('ordinary /30, point-to-point /31 and host-route /32 remain available', () => {
  assert.deepEqual(hostRange(0, 3, 30, false), { valid: true, usable: 2, first: 1, last: 2 })
  assert.deepEqual(hostRange(0, 1, 31, false), { valid: true, usable: 2, first: 0, last: 1 })
  assert.deepEqual(hostRange(0xffffffff, 0xffffffff, 32, false), { valid: true, usable: 1, first: 0xffffffff, last: 0xffffffff })
})
