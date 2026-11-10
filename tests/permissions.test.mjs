import test from 'node:test'
import assert from 'node:assert/strict'
import { run, initialFs, makeFs, applyMode, permString, HOME } from '../src/lib/vfs.ts'

const out = (r) => r.out.map((l) => l.text).join('\n')

test('chmod accepts octal and symbolic modes', () => {
  assert.equal(applyMode(0o644, '755', false), 0o755)
  assert.equal(applyMode(0o644, 'u+x', false), 0o744)
  assert.equal(applyMode(0o777, 'go-w', false), 0o755)
  assert.equal(applyMode(0o640, 'a=r', false), 0o444)
  // Capital X adds execute to folders (and to files that already have it), not to plain files.
  assert.equal(applyMode(0o600, 'u=rwX,go=rX', true), 0o755)
  assert.equal(applyMode(0o600, 'u=rwX,go=rX', false), 0o644)
  assert.equal(applyMode(0o644, 'bogus', false), null)
  assert.equal(permString(0o1777, true), 'drwxrwxrwt')
})

test('a script without the x bit cannot run as ./FILE, but runs after chmod u+x', () => {
  const fs = makeFs({ [`${HOME}/deploy.sh`]: { type: 'file', content: '#!/bin/bash\necho deploying\necho done', mode: 0o644, owner: 'joel' } })
  const denied = run(fs, HOME, './deploy.sh')
  assert.equal(denied.code, 126)
  assert.match(out(denied), /Permission denied/)
  const fixed = run(fs, HOME, 'chmod u+x deploy.sh && ./deploy.sh')
  assert.equal(fixed.code, 0)
  assert.match(out(fixed), /deploying\ndone/)
  assert.equal(fixed.fs[`${HOME}/deploy.sh`].mode, 0o744)
  // bash FILE only needs read permission.
  assert.equal(run(fs, HOME, 'bash deploy.sh').code, 0)
})

test('only the owner or root can chmod, and only root can chown', () => {
  const fs = makeFs({ '/opt/app.conf': 'x' })
  assert.match(out(run(fs, '/', 'chmod 600 /opt/app.conf')), /Operation not permitted/)
  assert.equal(run(fs, '/', 'sudo chmod 600 /opt/app.conf').fs['/opt/app.conf'].mode, 0o600)
  assert.match(out(run(fs, '/', 'chown joel /opt/app.conf')), /Operation not permitted/)
  const r = run(fs, '/', 'sudo chown joel:devs /opt/app.conf')
  assert.equal(r.fs['/opt/app.conf'].owner, 'joel')
  assert.equal(r.fs['/opt/app.conf'].group, 'devs')
  assert.match(out(run(r.fs, '/', 'ls -l /opt')), /-rw-r--r-- 1 joel +devs/)
})

test('group write lets a group member edit, others stay locked out', () => {
  const fs = makeFs({ '/opt/team/config.yml': { type: 'file', content: 'a: 1', owner: 'joel', group: 'devs', mode: 0o664 } })
  const priya = run(fs, '/', 'echo b | sudo -u priya tee -a /opt/team/config.yml')
  assert.equal(priya.code, 0)
  assert.equal(priya.fs['/opt/team/config.yml'].content, 'a: 1\nb')
  assert.equal(priya.fs['/opt/team/config.yml'].owner, 'joel')
  const www = run(fs, '/', 'echo c | sudo -u www-data tee -a /opt/team/config.yml')
  assert.match(out(www), /Permission denied/)
})

test('folder x bit controls cd; /root and /etc/shadow stay private', () => {
  const fs = { ...initialFs(), '/etc/shadow': { type: 'file', content: 'root:$6$...' } }
  assert.match(out(run(fs, HOME, 'cd /root')), /Permission denied/)
  assert.match(out(run(fs, HOME, 'cat /etc/shadow')), /Permission denied/)
  assert.equal(run(fs, HOME, 'sudo cat /etc/shadow').code, 0)
  const locked = run(fs, HOME, 'mkdir vault && chmod 600 vault')
  assert.match(out(run(locked.fs, HOME, 'cd vault')), /Permission denied/)
})

test('new files belong to whoever creates them; /tmp is writable by everyone', () => {
  const r = run(initialFs(), HOME, 'touch /tmp/a && sudo touch /tmp/b')
  assert.equal(r.fs['/tmp/a'].owner, 'joel')
  assert.equal(r.fs['/tmp/b'].owner, 'root')
})

test('find -perm finds world-writable files', () => {
  const fs = makeFs({
    '/var/www/shop': { type: 'dir', mode: 0o777 },
    '/var/www/shop/index.html': { type: 'file', content: '', mode: 0o666 },
    '/var/www/shop/app.js': { type: 'file', content: '', mode: 0o644 },
  })
  assert.deepEqual(out(run(fs, '/', 'find /var/www -perm -o+w')).split('\n'), ['/var/www/shop', '/var/www/shop/index.html'])
  assert.equal(out(run(fs, '/', 'find /var/www -type f -perm 644')), '/var/www/shop/app.js')
})

test('id, groups and stat describe users and files', () => {
  assert.equal(out(run(initialFs(), HOME, 'id priya')), 'uid=1001(priya) gid=1001(priya) groups=1001(priya),1002(devs)')
  assert.equal(out(run(initialFs(), HOME, 'groups priya')), 'priya : priya devs')
  assert.equal(out(run(initialFs(), HOME, 'stat -c "%a %U:%G %n" notes.txt')), '644 joel:joel notes.txt')
})

test('ls -ld shows the folder itself', () => {
  const r = run(initialFs(), HOME, 'ls -ld /tmp /root')
  assert.deepEqual(r.out.map((l) => l.text.split(' ')[0]), ['drwxrwxrwt', 'drwx------'])
})
