// @vitest-environment happy-dom

import { mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App.svelte';

let mountedApp: ReturnType<typeof mount> | null = null;

afterEach(async () => {
  if (mountedApp) await unmount(mountedApp);
  mountedApp = null;
  document.body.innerHTML = '';
  document.documentElement.classList.remove('dark-mode');
  localStorage.clear();
});

function renderApp(): void {
  const target = document.createElement('div');
  document.body.appendChild(target);
  mountedApp = mount(App, { target });
}

describe('App UX states', () => {
  it('restores, exposes and persists the selected theme', async () => {
    localStorage.setItem('cookie-cutter-theme', 'dark');
    renderApp();

    await vi.waitFor(() => {
      expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
    });

    const themeButton = document.querySelector<HTMLButtonElement>('button[aria-label="Activar tema claro"]');
    expect(themeButton?.getAttribute('aria-pressed')).toBe('true');
    themeButton?.click();

    expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
    expect(localStorage.getItem('cookie-cutter-theme')).toBe('light');
  });

  it('opens Bibliothèque de formes directly and exposes its active navigation state', async () => {
    renderApp();

    const navigationButton = document.querySelector<HTMLButtonElement>('button[title="Biblioteca de formas"]');
    navigationButton?.click();

    await vi.waitFor(() => {
      expect(document.getElementById('shape-library-title')?.textContent).toBe('Biblioteca de formas');
    });

    expect(navigationButton?.getAttribute('aria-current')).toBe('page');
    expect(document.querySelector('button[aria-label^="Utiliser la forme "]')).not.toBeNull();

    const seasonalFilter = Array.from(document.querySelectorAll<HTMLButtonElement>('.category-filter'))
      .find((button) => button.textContent?.trim() === 'Temporadas');
    seasonalFilter?.click();
    await vi.waitFor(() => {
      expect(seasonalFilter?.getAttribute('aria-pressed')).toBe('true');
    });
  });

  it('explains Gemini data handling before enabling the connection action', async () => {
    renderApp();

    document.querySelector<HTMLButtonElement>('button[title="Herramientas de IA (Gemini)"]')?.click();

    await vi.waitFor(() => {
      expect(document.querySelector('summary')?.textContent).toContain('Obtener una clave API gratuita');
    });

    const guide = document.querySelector<HTMLDetailsElement>('details.info-box');
    const connectButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.trim() === 'Conectar Gemini');

    expect(guide?.open).toBe(false);
    expect(document.getElementById('gemini-key-privacy')?.textContent).toContain('datos necesarios');
    expect(connectButton?.disabled).toBe(true);
  });
});
