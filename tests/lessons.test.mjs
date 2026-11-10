import './tsx-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const { lessons } = await import('../src/lessons/registry.ts');

test('navigation contains unique lesson IDs', () => {
  assert.equal(new Set(lessons.map(l => l.id)).size, lessons.length);
});
for (const entry of lessons) {
  test(`lazy lesson ${entry.id} loads with matching navigation and renders`, async () => {
    const lesson = await entry.load();
    for (const field of ['id', 'title', 'summary', 'minutes', 'tone', 'icon']) {
      assert.equal(lesson[field], entry[field], `${field} metadata drift`);
    }
    assert.ok(lesson.interview.length);
    assert.ok(lesson.commands.length);
    if (lesson.story) {
      for (let step = 0; step < lesson.story.sections.length; step++) {
        assert.ok(renderToStaticMarkup(createElement(lesson.story.Scene, { step })));
      }
    }
    if (lesson.Playground) assert.ok(renderToStaticMarkup(createElement(lesson.Playground)));
  });
}
