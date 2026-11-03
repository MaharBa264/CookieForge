// @vitest-environment happy-dom
import { mount, unmount, tick } from 'svelte';
import { afterEach, expect, it } from 'vitest';
import SketchWorkspace from '../SketchWorkspace.svelte';
import { createDesignSessionStore } from '../../../stores/designSessionStore';
import { createDesignDocument } from '../../../projects/createDesignDocument';
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 10 L90 10 L90 90 L10 90 Z"/></svg>';
let component: ReturnType<typeof mount> | undefined;
afterEach(async () => { if (component) await unmount(component); component = undefined; document.body.innerHTML = ''; });
function setup() {
 const initial = createDesignDocument({ name: 'Sketch', kind: 'cutter', source: { type: 'svg', svg, fileName: 'sketch.svg' } });
 const session = createDesignSessionStore(initial);
 component = mount(SketchWorkspace, { target: document.body.appendChild(document.createElement('div')), props: { session } });
 const canvas = document.querySelector('svg')!;
 Object.defineProperty(canvas, 'setPointerCapture', { value: () => {} });
 Object.defineProperty(canvas, 'getScreenCTM', { value: () => ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }) });
 return { session, canvas };
}
function pointer(target: Element, type: string, x = 20, y = 20) { target.dispatchEvent(new PointerEvent(type, { pointerId: 1, button: 0, clientX: x, clientY: y, bubbles: true })); }
it('selects individual contours by stroke and keyboard without mutating the project', async () => {
 const original = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 10 L40 10 L40 40 Z"/><path d="M60 60 L90 60 L90 90 Z"/></svg>';
 const document = createDesignDocument({ name: 'Two paths', kind: 'cutter', source: { type: 'svg', svg: original, fileName: 'two.svg' } });
 const session = createDesignSessionStore(document);
 const baseline = session.getDocument();
 component = mount(SketchWorkspace, { target: globalThis.document.body.appendChild(globalThis.document.createElement('div')), props: { session } });
 await tick();
 const targets = [...globalThis.document.querySelectorAll<SVGPathElement>('path[aria-label^="Seleccionar contorno"]')];
 expect(targets).toHaveLength(2);
 expect(targets[0].getAttribute('aria-pressed')).toBe('true');
 targets[1].dispatchEvent(new MouseEvent('click', { bubbles: true })); await tick();
 expect(targets[0].getAttribute('aria-pressed')).toBe('false');
 expect(targets[1].getAttribute('aria-pressed')).toBe('true');
 expect(globalThis.document.querySelector<HTMLSelectElement>('.sketch-workspace select')?.value).toBe('1');
 expect(session.getDocument()).toBe(baseline);
 expect(session.getDocument()?.sketch.svg).toBe(original);
 targets[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await tick();
 expect(targets[0].getAttribute('aria-pressed')).toBe('true');
 expect(session.getDocument()).toBe(baseline);
});
it('keeps contour roles as a nonpersistent draft and clears them after an edit', async () => {
 const original = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 10 L40 10 L40 40 Z"/><path d="M60 60 L90 60 L90 90 Z"/></svg>';
 const initial = createDesignDocument({ name: 'Operations', kind: 'cutter', source: { type: 'svg', svg: original, fileName: 'operations.svg' } });
 const session = createDesignSessionStore(initial);
 component = mount(SketchWorkspace, { target: document.body.appendChild(document.createElement('div')), props: { session } });
 await tick();
 const baseline = session.getDocument();
 const operations = document.querySelector<HTMLSelectElement>('select[aria-label="Operación del contorno"]')!;
 expect(operations.value).toBe('unassigned');
 operations.value = 'cut'; operations.dispatchEvent(new Event('change', { bubbles: true })); await tick();
 expect(operations.value).toBe('cut');
 const targets = [...document.querySelectorAll<SVGPathElement>('path[aria-label^="Seleccionar contorno"]')];
 targets[1].dispatchEvent(new MouseEvent('click', { bubbles: true })); await tick();
 expect(operations.value).toBe('unassigned');
 operations.value = 'engrave'; operations.dispatchEvent(new Event('change', { bubbles: true })); await tick();
 expect(operations.value).toBe('engrave');
 targets[0].dispatchEvent(new MouseEvent('click', { bubbles: true })); await tick();
 expect(operations.value).toBe('cut');
 expect(session.getDocument()).toBe(baseline);
 expect(session.getDocument()?.sketch.svg).toBe(original);
 session.updateSketch(original.replace('L40 40', 'L42 40')); await tick();
 expect(operations.value).toBe('unassigned');
 expect(session.getDocument()?.sketch.revision).toBe(baseline!.sketch.revision + 1);
});
it('opening does not mutate; drag preview commits once on release', async () => {
 const { session, canvas } = setup(); const baseline = session.getDocument(); await tick(); expect(session.getDocument()).toBe(baseline);
 pointer(document.querySelector('circle')!, 'pointerdown');
 pointer(canvas, 'pointermove', 20, 20); pointer(canvas, 'pointermove', 25, 25); await tick();
 expect(session.getDocument()).toBe(baseline);
 pointer(canvas, 'pointerup', 25, 25); await tick();
 expect(session.getDocument()?.sketch.revision).toBe(baseline!.sketch.revision + 1);
 expect(session.getDocument()?.sketch.svg).toContain('M25 25'); expect(session.getDocument()?.source).toEqual(baseline!.source);
});
it('keeps each visual point small while providing a larger accessible drag target', async () => {
 const { session, canvas } = setup(); await tick();
 const hit = canvas.querySelector<SVGCircleElement>('circle[role="button"]')!;
 const visible = canvas.querySelector<SVGCircleElement>('circle[aria-hidden="true"]')!;
 expect(Number(hit.getAttribute('r'))).toBeGreaterThanOrEqual(100 / 13);
 expect(Number(hit.getAttribute('r'))).toBeGreaterThan(Number(visible.getAttribute('r')));
 expect(visible.getAttribute('pointer-events')).toBe('none');
 expect(hit.getAttribute('aria-label')).toContain('1');
 const baseline = session.getDocument()!;
 pointer(hit, 'pointerdown'); pointer(canvas, 'pointermove', 25, 25); pointer(canvas, 'pointerup', 25, 25); await tick();
 expect(session.getDocument()?.sketch.revision).toBe(baseline.sketch.revision + 1);
});
it.each(['escape', 'cancel', 'switch', 'history'])('discards draft after %s instead of publishing stale gesture', async action => {
 const { session, canvas } = setup(); const baseline = session.getDocument()!;
 pointer(document.querySelector('circle')!, 'pointerdown'); pointer(canvas, 'pointermove', 25, 25);
 if (action === 'escape') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
 if (action === 'cancel') pointer(canvas, 'pointercancel');
 if (action === 'switch') session.replace({ ...baseline, name: 'Other project' });
 if (action === 'history') session.restoreHistory(baseline, session.getSessionEpoch());
 const expected = session.getDocument(); await tick(); pointer(canvas, 'pointerup'); await tick(); expect(session.getDocument()).toBe(expected);
});
it('keyboard editing and empty state use the actual session', async () => {
 const { session } = setup(); const point = document.querySelector('circle')!;
 point.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await tick();
 expect(session.getDocument()?.sketch.svg).toContain('M11 10');
 session.clear(); await tick(); expect(document.body.textContent).toContain('Importá o abrí un proyecto');
});
