<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  title?: string
  description?: string
  serverName?: string
  packageName?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Install MCP Server',
  description: 'Add Seal documentation to your AI assistant',
  serverName: 'seal-docs',
  packageName: '@seal-wallet/mcp-docs'
})

const copied = ref<string | null>(null)

// MCP configuration object
const mcpConfig = computed(() => ({
  command: 'npx',
  args: ['-y', props.packageName]
}))

// Cursor deeplink config (base64 encoded JSON)
const cursorDeeplink = computed(() => {
  const config = JSON.stringify(mcpConfig.value)
  const base64Config = btoa(config)
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${props.serverName}&config=${base64Config}`
})

// VS Code MCP config format
const vscodeConfig = computed(() => JSON.stringify({
  servers: {
    [props.serverName]: {
      ...mcpConfig.value,
      type: 'stdio'
    }
  }
}, null, 2))

// Claude Desktop config format
const claudeConfig = computed(() => JSON.stringify({
  mcpServers: {
    [props.serverName]: mcpConfig.value
  }
}, null, 2))

// Generic MCP config (for Cursor manual setup)
const cursorConfig = computed(() => JSON.stringify({
  mcpServers: {
    [props.serverName]: mcpConfig.value
  }
}, null, 2))

async function copyToClipboard(text: string, type: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = type
    setTimeout(() => {
      copied.value = null
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

function openCursorDeeplink() {
  window.open(cursorDeeplink.value, '_blank')
}
</script>

<template>
  <div class="mcp-install-container">
    <div class="mcp-install-header">
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
    </div>

    <div class="mcp-install-buttons">
      <!-- Cursor - One Click Install -->
      <div class="install-card cursor">
        <div class="card-header">
          <svg class="icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.1 5.1 7.63 12 4.18zM4 8.82l7 3.5v7.36l-7-3.5V8.82zm9 10.86v-7.36l7-3.5v7.36l-7 3.5z"/>
          </svg>
          <span>Cursor</span>
        </div>
        <p class="card-description">One-click install for Cursor IDE</p>
        <button class="install-button primary" @click="openCursorDeeplink">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
          Add to Cursor
        </button>
        <button class="copy-button" @click="copyToClipboard(cursorConfig, 'cursor')">
          {{ copied === 'cursor' ? '✓ Copied!' : 'Copy config' }}
        </button>
      </div>

      <!-- VS Code - GitHub Copilot -->
      <div class="install-card vscode">
        <div class="card-header">
          <svg class="icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/>
          </svg>
          <span>VS Code</span>
        </div>
        <p class="card-description">For GitHub Copilot Agent Mode</p>
        <button class="install-button" @click="copyToClipboard(vscodeConfig, 'vscode')">
          {{ copied === 'vscode' ? '✓ Copied!' : 'Copy .vscode/mcp.json' }}
        </button>
        <a href="https://code.visualstudio.com/docs/copilot/copilot-customization" target="_blank" class="learn-link">
          Learn more →
        </a>
      </div>

      <!-- Claude Desktop -->
      <div class="install-card claude">
        <div class="card-header">
          <svg class="icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>Claude Desktop</span>
        </div>
        <p class="card-description">Add to claude_desktop_config.json</p>
        <button class="install-button" @click="copyToClipboard(claudeConfig, 'claude')">
          {{ copied === 'claude' ? '✓ Copied!' : 'Copy config' }}
        </button>
        <a href="https://modelcontextprotocol.io/quickstart" target="_blank" class="learn-link">
          MCP Quickstart →
        </a>
      </div>
    </div>

    <details class="config-details">
      <summary>View full configuration</summary>
      <div class="config-tabs">
        <div class="config-tab">
          <h4>Cursor / Claude Desktop</h4>
          <pre><code>{{ cursorConfig }}</code></pre>
        </div>
        <div class="config-tab">
          <h4>VS Code (.vscode/mcp.json)</h4>
          <pre><code>{{ vscodeConfig }}</code></pre>
        </div>
      </div>
    </details>

    <div class="mcp-info">
      <span class="badge">📦 npm</span>
      <code class="package-name">{{ packageName }}</code>
      <span class="separator">•</span>
      <span class="badge safe">🔒 Read-only</span>
      <span class="note">No API key required</span>
    </div>
  </div>
</template>

<style scoped>
.mcp-install-container {
  margin: 24px 0;
  padding: 24px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--vp-c-bg-soft) 0%, var(--vp-c-bg-alt) 100%);
  border: 1px solid var(--vp-c-divider);
}

.mcp-install-header {
  text-align: center;
  margin-bottom: 24px;
}

.mcp-install-header h3 {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  color: var(--vp-c-text-1);
}

.mcp-install-header p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}

.mcp-install-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.install-card {
  padding: 20px;
  border-radius: 10px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  transition: all 0.2s ease;
}

.install-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.icon {
  width: 24px;
  height: 24px;
}

.cursor .icon { color: #6366f1; }
.vscode .icon { color: #007ACC; }
.claude .icon { color: #d4a574; }

.card-description {
  margin: 0 0 16px 0;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.install-button {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.15s ease;
}

.install-button:hover {
  background: var(--vp-c-bg-alt);
  border-color: var(--vp-c-brand-1);
}

.install-button.primary {
  background: var(--vp-c-brand-1);
  color: white;
  border-color: var(--vp-c-brand-1);
}

.install-button.primary:hover {
  background: var(--vp-c-brand-2);
}

.copy-button {
  width: 100%;
  margin-top: 8px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
  cursor: pointer;
  transition: color 0.15s ease;
}

.copy-button:hover {
  color: var(--vp-c-brand-1);
}

.learn-link {
  display: block;
  margin-top: 12px;
  font-size: 0.8rem;
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.learn-link:hover {
  text-decoration: underline;
}

.config-details {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--vp-c-divider);
}

.config-details summary {
  cursor: pointer;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  user-select: none;
}

.config-details summary:hover {
  color: var(--vp-c-brand-1);
}

.config-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.config-tab h4 {
  margin: 0 0 8px 0;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.config-tab pre {
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  overflow-x: auto;
  font-size: 0.8rem;
}

.config-tab code {
  font-family: var(--vp-font-family-mono);
}

.mcp-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.badge {
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--vp-c-bg);
  font-size: 0.75rem;
}

.badge.safe {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.package-name {
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  color: var(--vp-c-brand-1);
}

.separator {
  color: var(--vp-c-divider);
}

.note {
  opacity: 0.8;
}

@media (max-width: 640px) {
  .mcp-install-buttons {
    grid-template-columns: 1fr;
  }
  
  .config-tabs {
    grid-template-columns: 1fr;
  }
}
</style>
