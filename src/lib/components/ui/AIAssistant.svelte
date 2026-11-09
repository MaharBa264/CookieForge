<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import {
    getAPIKey,
    suggestDesignImprovements,
    optimizeSVGWithAI,
    generateDesignVariations,
  } from '../../utils/geminiAPI';
  import { pathData } from '../../stores/cookieCutterStore';
  import type { CookieCutterParams } from '../../types/CookieCutter';
  import AIImageGenerator from './AIImageGenerator.svelte';

  interface Props {
    params: CookieCutterParams;
    svgContent: string | null;
    captureOperationValidity?: () => (() => boolean);
    onOptimizedSVG?: (svg: string, validity: () => boolean) => void;
  }

  let { params, svgContent, captureOperationValidity, onOptimizedSVG }: Props = $props();

  let alive = true;
  let sequence = 0;
  let successTimer: ReturnType<typeof setTimeout> | undefined;
  onDestroy(() => { alive = false; sequence++; clearTimeout(successTimer); });
  $effect(() => { svgContent; params; sequence++; isProcessing = false; clearTimeout(successTimer); });
  function beginOperation() {
    const token = ++sequence;
    const source = svgContent;
    const paths = $pathData;
    const parameters = JSON.stringify(params);
    const local = () => alive && token === sequence && source === svgContent && (source !== null || paths === $pathData) && parameters === JSON.stringify(params);
    let validity: () => boolean;
    try { validity = captureOperationValidity ? captureOperationValidity() : () => true; } catch { return null; }
    const current = () => {
      if (!local()) return false;
      try { return validity() === true && local(); } catch { return false; }
    };
    return current() ? { local, current, validity } : null;
  }
  function handoff(svg: string, validity: () => boolean) {
    if (onOptimizedSVG) onOptimizedSVG(svg, validity);
    else dispatch('optimizedSVG', svg);
  }

  const dispatch = createEventDispatcher<{
    optimizedSVG: string;
    applyVariation: string;
  }>();

  let showPanel = $state(false);
  let activeTab = $state<'generate' | 'suggestions' | 'optimize' | 'variations'>('generate');
  let isProcessing = $state(false);
  let suggestions = $state<string[]>([]);
  let variations = $state<string[]>([]);
  let error = $state('');
  let apiKey = $state<string | null>(null);

  // Check for API key on mount
  $effect(() => {
    apiKey = getAPIKey();

    // Listen for API key changes
    function handleAPIKeyChange() {
      apiKey = getAPIKey();
      if (showPanel && !apiKey) {
        error = 'Primero configurá tu clave de API de Gemini';
      } else if (apiKey) {
        error = '';
      }
    }

    window.addEventListener('gemini-api-key-changed', handleAPIKeyChange);

    return () => {
      window.removeEventListener('gemini-api-key-changed', handleAPIKeyChange);
    };
  });

  // Refresh API key when panel opens
  function togglePanel() {
    showPanel = !showPanel;
    if (showPanel) {
      apiKey = getAPIKey();
      if (!apiKey) {
        error = 'Primero configurá tu clave de API de Gemini';
      }
    }
  }

  async function getSuggestions() {
    if (!apiKey) {
      error = 'Clé API requise';
      return;
    }

    if (!svgContent && !$pathData) {
      error = 'Primero importá un dibujo';
      return;
    }

    const operation = beginOperation();
    if (!operation) return;
    isProcessing = true;
    error = '';
    suggestions = [];

    try {
      const dataToUse = svgContent || $pathData || '';
      const result = await suggestDesignImprovements(dataToUse, params, apiKey);
      if (operation.current()) suggestions = result;
    } catch (err) {
      if (operation.current()) error = err instanceof Error ? err.message : 'No se pudieron obtener sugerencias';
    } finally {
      if (operation.local()) isProcessing = false;
    }
  }

  async function optimizeSVG() {
    if (!apiKey || !svgContent) {
      error = 'Se requieren la clave de API y el contenido SVG';
      return;
    }

    const operation = beginOperation();
    if (!operation) return;
    isProcessing = true;
    error = '';

    try {
      const result = await optimizeSVGWithAI(svgContent, apiKey);
      if (!operation.current()) return;
      // Note: optimizeSVGWithAI now returns original SVG with analysis in console
      handoff(result, operation.validity);
      if (!operation.local()) return;
      // Show success message briefly
      error = '✅ ¡Análisis del SVG terminado! Mirá la consola del navegador (F12) para ver las recomendaciones de optimización.';
      clearTimeout(successTimer);
      successTimer = setTimeout(() => {
        if (operation.local() && error.startsWith('✅')) error = '';
      }, 5000);
    } catch (err) {
      if (!operation.current()) return;
      error = err instanceof Error ? err.message : 'No se pudo analizar el SVG';
      console.error('Error al analizar el SVG:', err);
    } finally {
      if (operation.local()) isProcessing = false;
    }
  }

  async function getVariations() {
    if (!apiKey) {
      error = 'Clé API requise';
      return;
    }

    const operation = beginOperation();
    if (!operation) return;
    const description = prompt('Describí el dibujo del que querés variantes:');
    if (!description || !operation.current()) return;

    isProcessing = true;
    error = '';
    variations = [];

    try {
      const result = await generateDesignVariations(description, apiKey);
      if (operation.current()) variations = result;
    } catch (err) {
      if (operation.current()) error = err instanceof Error ? err.message : 'No se pudieron generar variantes';
    } finally {
      if (operation.local()) isProcessing = false;
    }
  }

</script>

<div class="ai-assistant">
  <button
    class="ai-toggle"
    onclick={togglePanel}
    class:active={showPanel}
    aria-expanded={showPanel}
    aria-controls="ai-assistant-panel"
  >
    🤖 Asistente de IA {#if !apiKey}<span class="badge">Sin conectar</span>{/if}
  </button>

  {#if showPanel}
    <div class="ai-panel" id="ai-assistant-panel">
      <div class="panel-header">
        <h3>🤖 Asistente de IA para el diseño</h3>
        <button class="close-btn" onclick={() => (showPanel = false)} aria-label="Cerrar el asistente de IA">×</button>
      </div>

      {#if !apiKey}
        <div class="warning-box">
          <p><strong>⚠️ Clé API requise</strong></p>
          <p>Configurá tu clave de API de Gemini en los ajustes para usar las funciones de IA.</p>
        </div>
      {:else}
        <div class="tabs">
          <button
            class="tab"
            class:active={activeTab === 'generate'}
            onclick={() => (activeTab = 'generate')}
          >
            ✨ Generar
          </button>
          <button
            class="tab"
            class:active={activeTab === 'suggestions'}
            onclick={() => (activeTab = 'suggestions')}
          >
            💡 Sugerencias
          </button>
          <button
            class="tab"
            class:active={activeTab === 'optimize'}
            onclick={() => (activeTab = 'optimize')}
          >
            ⚡ Analizar
          </button>
          <button
            class="tab"
            class:active={activeTab === 'variations'}
            onclick={() => (activeTab = 'variations')}
          >
            🎨 Variantes
          </button>
        </div>

        <div class="tab-content">
          {#if activeTab === 'generate'}
            <div class="tab-pane">
              <AIImageGenerator {captureOperationValidity} sourceKey={svgContent} onImageGenerated={handoff} />
            </div>
          {:else if activeTab === 'suggestions'}
            <div class="tab-pane">
              <p>Obtené sugerencias de la IA para mejorar tu dibujo antes de la impresión 3D.</p>

              {#if !svgContent && !$pathData}
                <div class="info-message">
                  <p>⚠️ Primero importá un dibujo para obtener sugerencias de la IA.</p>
                </div>
              {/if}

              <button
                class="btn-primary"
                onclick={getSuggestions}
                disabled={isProcessing || (!svgContent && !$pathData)}
              >
                {isProcessing ? 'Analizando…' : 'Obtener sugerencias'}
              </button>

              {#if suggestions.length > 0}
                <div class="results">
                  <h4>Sugerencias:</h4>
                  <ol>
                    {#each suggestions as suggestion}
                      <li>{suggestion}</li>
                    {/each}
                  </ol>
                </div>
              {/if}
            </div>
          {:else if activeTab === 'optimize'}
            <div class="tab-pane">
              <p>Obtené un análisis de la complejidad de tu SVG y consejos de optimización de la IA.</p>

              <div class="info-message" style="background: #e0f2fe; border-color: #0284c7; color: #0c4a6e;">
                <p>ℹ️ <strong>Nota:</strong> esta función analiza tu SVG y muestra consejos de optimización en la consola del navegador. La modificación directa del SVG por parte de la IA es experimental.</p>
              </div>

              <button
                class="btn-primary"
                onclick={optimizeSVG}
                disabled={isProcessing || !svgContent}
              >
                {isProcessing ? 'Analizando…' : 'Analizar el SVG'}
              </button>
              <p class="hint">Mirá la consola del navegador (F12) para ver las recomendaciones detalladas.</p>
            </div>
          {:else if activeTab === 'variations'}
            <div class="tab-pane">
              <p>Generá variantes creativas de un dibujo a partir de una descripción.</p>
              <button class="btn-primary" onclick={getVariations} disabled={isProcessing}>
                {isProcessing ? 'Generando…' : 'Generar variantes'}
              </button>

              {#if variations.length > 0}
                <div class="results">
                  <h4>Variantes del dibujo:</h4>
                  <ol>
                    {#each variations as variation}
                      <li>{variation}</li>
                    {/each}
                  </ol>
                </div>
              {/if}
            </div>
          {/if}

          {#if error}
            <div class="error-box" class:success={error.startsWith('✅')}>
              <p>{error}</p>
            </div>
          {/if}
        </div>

        <div class="powered-by">
          Propulsé par <strong>Gemini 2.5 Flash</strong>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .ai-assistant {
    position: relative;
  }

  .ai-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  }

  .ai-toggle:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .ai-toggle.active {
    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
  }

  .badge {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 12px;
  }

  .ai-panel {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 0.5rem;
    width: 400px;
    max-width: 90vw;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 1000;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 1.125rem;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    color: #333;
  }

  .warning-box {
    padding: 1rem;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 6px;
    margin: 1rem;
  }

  .warning-box p {
    margin: 0.25rem 0;
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid #e0e0e0;
  }

  .tab {
    flex: 1;
    padding: 0.75rem;
    background: none;
    border: none;
    cursor: pointer;
    font-weight: 500;
    color: #666;
    transition: color 0.2s, background 0.2s;
  }

  .tab:hover {
    background: #f5f5f5;
  }

  .tab.active {
    color: #667eea;
    border-bottom: 2px solid #667eea;
  }

  .tab-content {
    padding: 1rem;
  }

  .tab-pane p {
    margin: 0 0 1rem 0;
    color: #666;
  }

  .btn-primary {
    width: 100%;
    padding: 0.75rem;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    background: #5568d3;
  }

  .btn-primary:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .hint {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: #999;
    font-style: italic;
  }

  .info-message {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: #fffbeb;
    border: 1px solid #fbbf24;
    border-radius: 6px;
    color: #92400e;
  }

  .info-message p {
    margin: 0;
    font-size: 0.875rem;
  }

  .results {
    margin-top: 1rem;
    padding: 1rem;
    background: #f9f9f9;
    border-radius: 6px;
  }

  .results h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
  }

  .results ol {
    margin: 0;
    padding-left: 1.5rem;
  }

  .results li {
    margin: 0.5rem 0;
    color: #333;
  }

  .error-box {
    margin-top: 1rem;
    padding: 1rem;
    background: #f8d7da;
    border: 1px solid #f5c2c7;
    border-radius: 6px;
  }

  .error-box.success {
    background: #d4edda;
    border: 1px solid #c3e6cb;
  }

  .error-box p {
    margin: 0;
    color: #842029;
  }

  .error-box.success p {
    color: #155724;
  }

  .powered-by {
    padding: 0.75rem 1rem;
    border-top: 1px solid #e0e0e0;
    text-align: center;
    font-size: 0.875rem;
    color: #666;
  }

  .powered-by strong {
    color: #667eea;
  }
</style>
