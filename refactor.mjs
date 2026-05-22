import fs from 'fs';
import path from 'path';

const basePath = process.cwd();
const srcPath = path.join(basePath, 'src');

const fileMapping = {
  // Components
  'components/AppSidebar.tsx': 'modules/core/components/AppSidebar.tsx',
  'components/AuthGuard.tsx': 'modules/core/components/AuthGuard.tsx',
  'components/WhatsAppQrOverlay.tsx': 'modules/core/components/WhatsAppQrOverlay.tsx',
  'components/ClientProviders.tsx': 'modules/core/components/ClientProviders.tsx',
  'components/PanelSettingsModal.tsx': 'modules/core/components/PanelSettingsModal.tsx',
  'components/PanelSettingsProvider.tsx': 'modules/core/hooks/PanelSettingsProvider.tsx',
  'components/ChatMessageContent.tsx': 'modules/inbox/components/ChatMessageContent.tsx',
  'components/TicketToolsPanel.tsx': 'modules/inbox/components/TicketToolsPanel.tsx',
  'components/FinanceiroPanel.tsx': 'modules/financeiro/components/FinanceiroPanel.tsx',
  'components/VeiculosClienteLinks.tsx': 'modules/financeiro/components/VeiculosClienteLinks.tsx',
  'components/MonitoramentoPanel.tsx': 'modules/monitoramento/components/MonitoramentoPanel.tsx',
  'components/StatusVeiculoPanel.tsx': 'modules/monitoramento/components/StatusVeiculoPanel.tsx',

  // Libs
  'lib/api.ts': 'modules/core/lib/api.ts',
  'lib/auth.ts': 'modules/core/lib/auth.ts',
  'lib/roles.ts': 'modules/core/lib/roles.ts',
  'lib/panel-settings.ts': 'modules/core/lib/panel-settings.ts',
  'lib/whatsapp.ts': 'modules/inbox/api/whatsapp.ts',
  'lib/financeiro.ts': 'modules/financeiro/api/financeiro.ts',
  'lib/crm.ts': 'modules/financeiro/api/crm.ts',
  'lib/rastreamento.ts': 'modules/monitoramento/api/rastreamento.ts',
  'lib/placa.ts': 'modules/monitoramento/api/placa.ts',
  'lib/cobranca.ts': 'modules/cobranca/api/cobranca.ts',
};

// Create directories
const directoriesToCreate = new Set();
for (const dest of Object.values(fileMapping)) {
  directoriesToCreate.add(path.dirname(path.join(srcPath, dest)));
}

for (const dir of directoriesToCreate) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Map short module name to new path for regex replacement
const importReplacements = [];

for (const [oldPath, newPath] of Object.entries(fileMapping)) {
  const oldImportPrefix = `@/${oldPath.replace(/\.tsx?$/, '')}`;
  const newImportPrefix = `@/${newPath.replace(/\.tsx?$/, '')}`;
  importReplacements.push({ old: oldImportPrefix, new: newImportPrefix });

  // Also catch relative imports like `../components/X` or `../../lib/Y`
  // It's safer to just regex replace the specific filename in imports.
  // We will do a generic replacement for standard @/ imports first.
}

// Helper to walk directories
function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const allFiles = [];
walkDir(srcPath, (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    allFiles.push(filePath);
  }
});

// Update imports
for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  for (const [oldRel, newRel] of Object.entries(fileMapping)) {
    const oldBase = oldRel.replace(/\.tsx?$/, '');
    const newBase = newRel.replace(/\.tsx?$/, '');
    
    // Replace absolute imports @/components/X -> @/modules/core/components/X
    const exactRegex = new RegExp(`(['"])\\@/${oldBase}(['"])`, 'g');
    if (exactRegex.test(content)) {
      content = content.replace(exactRegex, `$1@/${newBase}$2`);
      changed = true;
    }

    // Try to catch relative imports based on the filename
    const fileName = path.basename(oldBase);
    // matches '../components/AppSidebar' or '../../lib/api'
    const relRegex = new RegExp(`(['"])[\\./]+(components|lib)/${fileName}(['"])`, 'g');
    if (relRegex.test(content)) {
      // Convert relative to absolute alias @/
      content = content.replace(relRegex, `$1@/${newBase}$3`);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated imports in: ${file.replace(basePath, '')}`);
  }
}

// Move files
for (const [oldRel, newRel] of Object.entries(fileMapping)) {
  const oldFull = path.join(srcPath, oldRel);
  const newFull = path.join(srcPath, newRel);
  if (fs.existsSync(oldFull)) {
    fs.renameSync(oldFull, newFull);
    console.log(`Moved: ${oldRel} -> ${newRel}`);
  }
}

// Remove empty directories if they exist and are empty
try {
  if (fs.readdirSync(path.join(srcPath, 'components')).length === 0) {
    fs.rmdirSync(path.join(srcPath, 'components'));
  }
  if (fs.readdirSync(path.join(srcPath, 'lib')).length === 0) {
    fs.rmdirSync(path.join(srcPath, 'lib'));
  }
} catch (e) {
  // Ignore
}

console.log('Refactor script completed successfully.');
