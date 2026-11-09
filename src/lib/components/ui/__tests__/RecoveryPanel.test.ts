// @vitest-environment happy-dom
import { mount, unmount, tick } from 'svelte';
import { afterEach, expect, it, vi } from 'vitest';
import RecoveryPanel from '../RecoveryPanel.svelte';
import { createProjectRecovery } from '../../../projects/projectRecovery';
import { createProjectRecoveryStorage, parseProjectRecoveryEnvelope, type ProjectRecoveryEnvelope } from '../../../projects/projectRecoveryStorage';
import { createDesignDocument } from '../../../projects/createDesignDocument';
let panel: ReturnType<typeof mount> | undefined;
let recovery: ReturnType<typeof createProjectRecovery> | undefined;
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="20"/></svg>';
function fixture() { return createDesignDocument({ name: 'A "quoted" long draft', kind: 'cutter', source: { type: 'svg', fileName: 'A.svg', svg } }); }
function deferred() { let resolve!: () => void; const promise = new Promise<void>(yes => { resolve = yes; }); return { promise, resolve }; }
function setup(options: { empty?: boolean; list?: () => Promise<void>; put?: () => Promise<void> } = {}) {
  const draft = parseProjectRecoveryEnvelope({ format: 'cookie-cutter-designer-recovery', version: 1, draftId: '11111111-1111-4111-8111-111111111111', savedAt: '2026-10-09T12:00:00Z', document: fixture() });
  const records = new Map<string, ProjectRecoveryEnvelope>(options.empty ? [] : [[draft.draftId, draft]]);
  const put = vi.fn(async (value: ProjectRecoveryEnvelope) => { await options.put?.(); records.set(value.draftId, value); });
  const storage = createProjectRecoveryStorage({ put, get: async id => records.get(id), getAll: async () => { await options.list?.(); return [...records.values()]; }, deleteExpected: async () => false });
  recovery = createProjectRecovery(storage, { createId: () => '22222222-2222-4222-8222-222222222222', now: () => new Date('2026-10-10T12:00:00Z') });
  const onResume = vi.fn(), onDelete = vi.fn(), onRefresh = vi.fn(() => { void recovery!.refresh(); }), onFlush = vi.fn(() => { void recovery!.flush(); });
  panel = mount(RecoveryPanel, { target: document.body.appendChild(document.createElement('div')), props: { recovery, onResume, onDelete, onRefresh, onFlush } });
  return { draft, put, records, onResume, onDelete, onRefresh, onFlush };
}
function button(text: string) { return [...document.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.trim() === text)!; }
afterEach(async () => { if (panel) await unmount(panel); if (recovery) await recovery.dispose(); panel = undefined; recovery = undefined; document.body.innerHTML = ''; });
it('renders listed drafts without invoking restore and passes exact contextual actions to the owner', async () => {
  const { draft, onResume, onDelete } = setup(); await recovery!.list(); await tick();
  expect(document.querySelector('section')?.getAttribute('aria-label')).toBe('Borradores de recuperación');
  const resume = button('Retomar el borrador'), remove = button('Eliminar el borrador');
  expect(resume.getAttribute('aria-label')).toBe(`Retomar el borrador ${draft.document.name}, ${draft.savedAt}`);
  expect(remove.getAttribute('aria-label')).toBe(`Eliminar el borrador ${draft.document.name}, ${draft.savedAt}`);
  expect(onResume).not.toHaveBeenCalled(); expect(onDelete).not.toHaveBeenCalled(); resume.click(); remove.click();
  expect(onResume).toHaveBeenCalledWith(draft); expect(onDelete).toHaveBeenCalledWith(draft);
});
it('does not claim a recovery save until the actual storage write resolves, prioritizes saving over older savedAt', async () => {
  let gate = deferred(); const { put } = setup({ put: () => gate.promise }); recovery!.observe(fixture(), 1, true); await tick();
  expect(document.body.textContent).toContain('Recuperación pendiente'); expect(document.body.textContent).not.toContain('Recuperación guardada a las');
  const flush = recovery!.flush(); await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1)); await tick();
  expect(document.body.textContent).toContain('Guardando el borrador de recuperación'); expect(document.body.textContent).not.toContain('Recuperación guardada a las');
  gate.resolve(); await flush; await tick(); expect(document.body.textContent).toContain('Recuperación guardada a las');
  gate = deferred(); recovery!.observe(fixture(), 1, true); const second = recovery!.flush(); await tick();
  expect(document.body.textContent).toContain('Guardando el borrador de recuperación'); expect(document.body.textContent).not.toContain('Recuperación guardada a las'); gate.resolve(); await second;
});
it('renders an empty list with a functional refresh action and separate local-first backup hint', async () => {
  const { onRefresh } = setup({ empty: true }); await recovery!.list(); await tick();
  expect(document.body.textContent).toContain('No hay ningún borrador de recuperación en este navegador'); button('Actualizar los borradores de recuperación').click(); expect(onRefresh).toHaveBeenCalledTimes(1);
  expect(document.body.textContent).toContain('siguen disponibles después de guardar el proyecto'); expect(document.body.textContent).toContain('.ccd.json');
});
it('announces list failure and retries the real list', async () => {
  let fail = true; const { onRefresh } = setup({ list: async () => { if (fail) throw new Error('list unavailable'); } }); await recovery!.list(); await tick();
  expect(document.querySelector('[role="alert"]')?.textContent).toContain('list unavailable'); fail = false; button('Reintentar la carga de los borradores de recuperación').click();
  await vi.waitFor(() => expect(button('Retomar el borrador')).toBeDefined()); expect(onRefresh).toHaveBeenCalledTimes(1);
});
it('announces failed write and exposes independent retry instead of optimistic success', async () => {
  let fail = true; const { records, onFlush } = setup({ empty: true, put: async () => { if (fail) throw new Error('disk full'); } }); recovery!.observe(fixture(), 1, true); await recovery!.flush(); await tick();
  expect(document.querySelector('[role="alert"]')?.textContent).toContain('disk full'); expect(document.body.textContent).not.toContain('Recuperación guardada a las');
  fail = false; button('Reintentar el guardado de recuperación').click(); await vi.waitFor(() => expect(records.size).toBe(1)); expect(onFlush).toHaveBeenCalledTimes(1);
});
