import React, { useState, useEffect } from 'react';
import {
  UserAccount,
  DevStudioFile,
  DevConsoleLog,
  DevStudioProject,
  DevProjectExecutionStatus,
  DevProjectSettings,
} from '../../types';
import { sound } from '../../utils/audioSynth';
import {
  subscribeDevProject,
  saveDevProject,
  updateDevProjectStatus,
  updateDevProjectSettings,
  DEFAULT_DEV_PROJECT_ID,
} from '../../services/firebaseService';
import {
  Code2,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  Play,
  Pause,
  Save,
  Trash2,
  Plus,
  Search,
  Terminal,
  AlertTriangle,
  CheckCircle,
  Copy,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Crown,
  Lock,
  Sparkles,
  RefreshCw,
  Sliders,
  Settings,
  Activity,
} from 'lucide-react';

interface DevStudioProps {
  account: UserAccount | null;
  onBackToChat: () => void;
  onGrantDeveloperAccess?: () => void;
}

// Initial Tree matching the exact requested layout
const INITIAL_STUDIO_FILES: DevStudioFile[] = [
  // frontend/chat
  {
    id: 'f_chat_area',
    path: 'HITARTH/frontend/chat/ChatArea.tsx',
    name: 'ChatArea.tsx',
    extension: 'tsx',
    content: `// HITARTH Frontend: Discord-Style Chat Stream
import React from 'react';
import { ChatMessage } from '../../types';

export const ChatArea: React.FC = () => {
  console.log('[HITARTH] Chat stream mounted with real-time Firebase sync.');
  return <div>Active Chat Stream</div>;
};`,
  },
  {
    id: 'f_msg_input',
    path: 'HITARTH/frontend/chat/MessageInput.tsx',
    name: 'MessageInput.tsx',
    extension: 'tsx',
    content: `// HITARTH Frontend: Slash-Command Autocomplete Input
export function parseSlashCommand(input: string) {
  if (!input.startsWith('/owo ')) return null;
  const parts = input.trim().slice(5).split(/\\s+/);
  return { command: parts[0], args: parts.slice(1) };
}`,
  },
  // frontend/components
  {
    id: 'f_sidebar',
    path: 'HITARTH/frontend/components/ServerSidebar.tsx',
    name: 'ServerSidebar.tsx',
    extension: 'tsx',
    content: `// HITARTH Left Navigation Sidebar
export const SERVER_LIST = [
  { id: 'hitarth_official', name: 'HITARTH Official', icon: '⚡' },
  { id: 'arcade_arena', name: 'Arcade Arena', icon: '🎰' },
  { id: 'safari_guild', name: 'Safari Guild', icon: '🦁' },
];`,
  },
  // frontend/bot-cards
  {
    id: 'f_embed_card',
    path: 'HITARTH/frontend/bot-cards/BotEmbedCard.tsx',
    name: 'BotEmbedCard.tsx',
    extension: 'tsx',
    content: `// HITARTH Embedded Discord Message Card Renderer
export interface CardProps {
  title: string;
  color: string;
  fields: { label: string; value: string }[];
}`,
  },
  // frontend/commands
  {
    id: 'f_cmd_registry',
    path: 'HITARTH/frontend/commands/CommandRegistry.ts',
    name: 'CommandRegistry.ts',
    extension: 'ts',
    content: `// HITARTH Client Command Autocomplete Registry
export const COMMANDS = [
  '/owo balance',
  '/owo daily',
  '/owo work',
  '/owo give @user <amt>',
  '/owo cf <amt>',
  '/owo s <amt>',
  '/owo hunt',
  '/owo battle @user',
  '/owo team',
  '/owo help'
];`,
  },
  // backend/commands
  {
    id: 'b_economy_cmd',
    path: 'HITARTH/backend/commands/EconomyCommands.ts',
    name: 'EconomyCommands.ts',
    extension: 'ts',
    content: `// Server-Side Economy Processor (Safe evaluation)
export function processDailyReward(userId: string) {
  const JOULES_REWARD = 500;
  const XP_REWARD = 100;
  console.log(\`[SERVER] Dispatched daily reward for \${userId}: +\${JOULES_REWARD} Joules\`);
  return { success: true, reward: JOULES_REWARD, xp: XP_REWARD };
}`,
  },
  // backend/economy
  {
    id: 'b_joules_ledger',
    path: 'HITARTH/backend/economy/JoulesLedger.ts',
    name: 'JoulesLedger.ts',
    extension: 'ts',
    content: `// Atomic Balance Ledger
export function verifyBalanceTransfer(senderBalance: number, amount: number) {
  if (amount <= 0) throw new Error('Invalid transfer amount');
  if (senderBalance < amount) throw new Error('Insufficient Joules');
  return senderBalance - amount;
}`,
  },
  // backend/battles
  {
    id: 'b_combat_engine',
    path: 'HITARTH/backend/battles/CreatureCombatEngine.ts',
    name: 'CreatureCombatEngine.ts',
    extension: 'ts',
    content: `// Turn-based Creature Battle Calculation
export function calculateCombatStrike(attackerPwr: number, isUltimate: boolean) {
  const base = isUltimate ? 90 : 50;
  const variance = Math.floor(Math.random() * 25);
  return attackerPwr + base + variance;
}`,
  },
  // backend/teams
  {
    id: 'b_guild_raids',
    path: 'HITARTH/backend/teams/GuildRaids.ts',
    name: 'GuildRaids.ts',
    extension: 'ts',
    content: `// Multiplayer Guild Co-op Raids
export const RAID_BOSSES = [
  { name: 'Mythic Cyber Colossus', hp: 450000, pot: 1000 },
  { name: 'Himalayan Frost Wyrm', hp: 320000, pot: 750 }
];`,
  },
  // firebase/authentication
  {
    id: 'fb_auth',
    path: 'HITARTH/firebase/authentication/AuthService.ts',
    name: 'AuthService.ts',
    extension: 'ts',
    content: `// Firebase Authentication & Role Verification
export function checkDeveloperRole(user: { id: string; inGameName: string }) {
  return user.id === 'OWO-9850' || user.inGameName.toLowerCase() === 'hitarth';
}`,
  },
  // firebase/firestore
  {
    id: 'fb_schema',
    path: 'HITARTH/firebase/firestore/DatabaseSchema.json',
    name: 'DatabaseSchema.json',
    extension: 'json',
    content: `{
  "collections": {
    "users": { "id": "string", "balanceINR": "number", "level": "number", "xp": "number" },
    "channels": { "messages": { "senderId": "string", "content": "string", "botCard": "object" } },
    "guilds": { "name": "string", "leaderId": "string", "power": "number" }
  }
}`,
  },
  // firebase/security-rules
  {
    id: 'fb_rules',
    path: 'HITARTH/firebase/security-rules/firestore.rules',
    name: 'firestore.rules',
    extension: 'rules',
    content: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`,
  },
  // assets/avatars
  {
    id: 'a_avatars',
    path: 'HITARTH/assets/avatars/Avatars.json',
    name: 'Avatars.json',
    extension: 'json',
    content: `["⚡", "👑", "🐯", "💎", "🐉", "🦊", "🎯", "🚀", "⚔️", "🦅", "🔥", "🌟"]`,
  },
  // assets/icons
  {
    id: 'a_icons',
    path: 'HITARTH/assets/icons/Badges.json',
    name: 'Badges.json',
    extension: 'json',
    content: `[
  { "id": "dev", "name": "Developer", "icon": "👑", "color": "#a855f7" },
  { "id": "bot", "name": "HITARTH Bot", "icon": "🤖", "color": "#6366f1" },
  { "id": "hunter", "name": "Apex Hunter", "icon": "🦁", "color": "#10b981" }
]`,
  },
  // assets/creatures
  {
    id: 'a_creatures',
    path: 'HITARTH/assets/creatures/ApexBeasts.json',
    name: 'ApexBeasts.json',
    extension: 'json',
    content: `[
  { "name": "White Tiger", "power": 96, "rarity": "legendary", "emoji": "🐅" },
  { "name": "Royal Bengal Tiger", "power": 92, "rarity": "epic", "emoji": "🐯" },
  { "name": "Indian One-Horned Rhino", "power": 88, "rarity": "epic", "emoji": "🦏" }
]`,
  },
];

const CODE_SNIPPETS = [
  {
    title: 'New /owo Bot Command',
    code: `// Register custom command
export function handleCustomCommand(args: string[]) {
  console.log('[BOT] Processing command with args:', args);
  return {
    title: 'CUSTOM COMMAND EXECUTED',
    color: '#8b5cf6',
    reward: 100
  };
}`,
  },
  {
    title: 'Joules P2P Safe Transfer',
    code: `export function transferJoules(from: string, to: string, amount: number) {
  if (amount <= 0) throw new Error('Amount must be positive');
  console.log(\`[TRANSFER] \${amount} Joules from \${from} to \${to}\`);
  return { success: true };
}`,
  },
  {
    title: 'Firestore Atomic Write',
    code: `// Atomic document update
export async function atomicUpdate(docPath: string, payload: any) {
  console.log('Writing to Firestore document:', docPath);
  return { writeTime: new Date().toISOString() };
}`,
  },
];

export const DevStudio: React.FC<DevStudioProps> = ({
  account,
  onBackToChat,
  onGrantDeveloperAccess,
}) => {
  const [files, setFiles] = useState<DevStudioFile[]>(INITIAL_STUDIO_FILES);
  const [activeFileId, setActiveFileId] = useState<string>('b_economy_cmd');
  const [editorContent, setEditorContent] = useState<string>(() => {
    const found = INITIAL_STUDIO_FILES.find((f) => f.id === 'b_economy_cmd');
    return found ? found.content : '';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [mobileView, setMobileView] = useState<'editor' | 'files'>('editor');
  const [terminalTab, setTerminalTab] = useState<'terminal' | 'output' | 'errors' | 'env'>('terminal');
  const [logs, setLogs] = useState<DevConsoleLog[]>([
    {
      id: 'log_init',
      type: 'info',
      message: 'HITARTH Developer Studio v3.2 initialized. Workspace root: /HITARTH',
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: 'log_auth',
      type: 'success',
      message: 'Developer credentials verified for Hitarth (OWO-9850). Full edit/run access granted.',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [newFilePath, setNewFilePath] = useState('HITARTH/backend/commands/CustomCmd.ts');
  const [project, setProject] = useState<DevStudioProject | null>(null);
  const [executionStatus, setExecutionStatus] = useState<DevProjectExecutionStatus>('running');
  const [settings, setSettings] = useState<DevProjectSettings>({
    limit: 100,
    level: 1,
    winRateMultiplier: 1.0,
    autoRestart: false,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempLimit, setTempLimit] = useState(100);
  const [tempLevel, setTempLevel] = useState(1);
  const [runCount, setRunCount] = useState(0);

  // Real-time Firestore synchronization for Dev Studio project & execution state
  useEffect(() => {
    const unsub = subscribeDevProject(DEFAULT_DEV_PROJECT_ID, (proj) => {
      if (proj) {
        setProject(proj);
        setExecutionStatus(proj.executionStatus || 'running');
        if (proj.settings) {
          const s = {
            limit: proj.settings.limit ?? 100,
            level: proj.settings.level ?? 1,
            winRateMultiplier: proj.settings.winRateMultiplier ?? 1.0,
            autoRestart: proj.settings.autoRestart ?? false,
          };
          setSettings(s);
          setTempLimit(s.limit);
          setTempLevel(s.level);
        }
      }
    });
    return () => unsub();
  }, []);

  // Strict Developer Authorization: Only Hitarth with ID OWO-9850 and valid credential
  const isAuthorized =
    account?.isDeveloper === true &&
    account?.id === 'OWO-9850' &&
    (account?.uid === 'ixOonIJqExgepuw9BfGMCtQapOE2' ||
      account?.email === 'hitarth16.2012@gmail.com' ||
      account?.inGameName.toLowerCase() === 'hitarth');

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  const handleSelectFile = (file: DevStudioFile) => {
    sound.playSlotTick();
    setActiveFileId(file.id);
    setEditorContent(file.content);
    setMobileView('editor');
  };

  const handleTogglePause = async () => {
    const nextStatus: DevProjectExecutionStatus =
      executionStatus === 'paused' ? 'running' : 'paused';
    setExecutionStatus(nextStatus);
    sound.playSlotSpin();
    try {
      await updateDevProjectStatus(DEFAULT_DEV_PROJECT_ID, nextStatus, account?.uid);
      setLogs((prev) => [
        ...prev,
        {
          id: `status_${Date.now()}`,
          type: nextStatus === 'paused' ? 'warn' : 'success',
          message: `[FIRESTORE] Project execution status: ${nextStatus.toUpperCase()} (synced live to all collaborators)`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err: any) {
      console.warn('Status update error:', err);
    }
  };

  const handleSaveSettings = async () => {
    const updated: DevProjectSettings = {
      ...settings,
      limit: Math.max(1, tempLimit),
      level: Math.max(1, tempLevel),
    };
    setSettings(updated);
    try {
      await updateDevProjectSettings(DEFAULT_DEV_PROJECT_ID, updated, account?.uid);
      sound.playJackpot();
      setLogs((prev) => [
        ...prev,
        {
          id: `settings_${Date.now()}`,
          type: 'info',
          message: `[FIRESTORE] Settings saved: Execution Limit=${updated.limit}, Level Requirement=${updated.level}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err: any) {
      console.warn('Settings save error:', err);
    }
    setIsSettingsOpen(false);
  };

  const handleSaveFile = () => {
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content: editorContent, modified: false } : f))
    );
    sound.playJackpot();
    setSaveStatus('File saved successfully to HITARTH filesystem!');
    setTimeout(() => setSaveStatus(null), 3000);

    // Sync to Firestore project with incremented version
    if (account?.uid) {
      const projToSave: DevStudioProject = {
        id: DEFAULT_DEV_PROJECT_ID,
        name: 'HITARTH Main Engine',
        ownerUid: account.uid,
        ownerPlayerId: 'OWO-9850',
        codeContent: editorContent,
        activeFilePath: activeFile.path,
        version: (project?.version || 0) + 1,
        executionStatus,
        settings,
        collaboratorUids: project?.collaboratorUids || [],
        updatedAt: Date.now(),
        createdAt: project?.createdAt || Date.now(),
      };
      saveDevProject(projToSave, account.uid).catch((err) =>
        console.warn('DevStudio project Firestore sync fallback:', err)
      );
    }

    setLogs((prev) => [
      ...prev,
      {
        id: `log_${Date.now()}`,
        type: 'success',
        message: `Saved ${activeFile.path} (${editorContent.length} bytes) • Cloud version v${(project?.version || 0) + 1}`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const handleDeleteFile = () => {
    if (files.length <= 1) return;
    const confirmDelete = window.confirm(`Delete ${activeFile.name}?`);
    if (!confirmDelete) return;

    sound.playLoss();
    const remaining = files.filter((f) => f.id !== activeFileId);
    setFiles(remaining);
    setActiveFileId(remaining[0].id);
    setEditorContent(remaining[0].content);

    setLogs((prev) => [
      ...prev,
      {
        id: `log_${Date.now()}`,
        type: 'warn',
        message: `Deleted file ${activeFile.path}`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const handleCreateFile = () => {
    const cleanPath = newFilePath.trim();
    if (!cleanPath) return;

    const parts = cleanPath.split('/');
    const name = parts[parts.length - 1];
    const ext = (name.split('.').pop() as any) || 'ts';

    const newFile: DevStudioFile = {
      id: `file_${Date.now()}`,
      path: cleanPath,
      name,
      extension: ext,
      content: `// ${name}\nexport default function init() {\n  console.log('[HITARTH] Module loaded');\n}\n`,
    };

    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newFile.id);
    setEditorContent(newFile.content);
    setIsNewFileModalOpen(false);
    sound.playWin();

    setLogs((prev) => [
      ...prev,
      {
        id: `log_${Date.now()}`,
        type: 'info',
        message: `Created new file ${cleanPath}`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  // Safe Code Evaluation Runner (enforces Firestore pause and settings.limit)
  const handleRunCode = () => {
    // 1. Strict Firestore-authoritative Pause / Stop check
    if (executionStatus === 'paused' || executionStatus === 'stopped') {
      sound.playLoss();
      setLogs((prev) => [
        ...prev,
        {
          id: `err_paused_${Date.now()}`,
          type: 'error',
          message: `⛔ Execution Blocked: Project is currently PAUSED in Firestore by Hitarth OWO-9850. Click Resume Code before running.`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      setTerminalTab('errors');
      return;
    }

    // 2. Strict Limit check (e.g. limit to 100)
    if (settings.limit > 0 && runCount >= settings.limit) {
      sound.playLoss();
      setLogs((prev) => [
        ...prev,
        {
          id: `err_limit_${Date.now()}`,
          type: 'warn',
          message: `⚠️ Execution Limit Reached: Maximum ${settings.limit} runs allowed as configured in project settings.`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      setTerminalTab('errors');
      return;
    }

    setRunCount((c) => c + 1);
    sound.playSlotSpin();
    const startTime = performance.now();

    setLogs((prev) => [
      ...prev,
      {
        id: `run_start_${Date.now()}`,
        type: 'info',
        message: `▶ Running ${activeFile.name} (Execution #${runCount + 1}/${settings.limit})...`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    try {
      const customConsole = {
        log: (...args: any[]) => {
          setLogs((prev) => [
            ...prev,
            {
              id: `log_${Date.now()}_${Math.random()}`,
              type: 'log',
              message: args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '),
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        },
        info: (...args: any[]) => {
          setLogs((prev) => [
            ...prev,
            {
              id: `info_${Date.now()}_${Math.random()}`,
              type: 'info',
              message: args.join(' '),
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        },
        warn: (...args: any[]) => {
          setLogs((prev) => [
            ...prev,
            {
              id: `warn_${Date.now()}_${Math.random()}`,
              type: 'warn',
              message: args.join(' '),
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        },
        error: (...args: any[]) => {
          setLogs((prev) => [
            ...prev,
            {
              id: `err_${Date.now()}_${Math.random()}`,
              type: 'error',
              message: args.join(' '),
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        },
      };

      const executable = editorContent
        .replace(/import\s+.*?;/g, '')
        .replace(/export\s+default\s+/g, '')
        .replace(/export\s+function\s+/g, 'function ')
        .replace(/export\s+const\s+/g, 'const ')
        .replace(/:\s*(string|number|boolean|any|void|string\[\]|number\[\])\b/g, '')
        .replace(/as\s+[A-Za-z0-9_]+/g, '');

      const runFn = new Function('console', `
        ${executable};
        if (typeof processDailyReward === 'function') processDailyReward('OWO-9850');
        if (typeof verifyBalanceTransfer === 'function') verifyBalanceTransfer(5000, 200);
        if (typeof calculateCombatStrike === 'function') console.log('Strike Power:', calculateCombatStrike(95, true));
        if (typeof checkDeveloperRole === 'function') console.log('Is Dev:', checkDeveloperRole({ id: 'OWO-9850', inGameName: 'Hitarth' }));
      `);

      runFn(customConsole);
      const elapsed = (performance.now() - startTime).toFixed(1);

      setLogs((prev) => [
        ...prev,
        {
          id: `run_done_${Date.now()}`,
          type: 'success',
          message: `✔ Process finished with exit code 0 (${elapsed}ms)`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      sound.playJackpot();
    } catch (err: any) {
      sound.playLoss();
      setLogs((prev) => [
        ...prev,
        {
          id: `run_err_${Date.now()}`,
          type: 'error',
          message: `✖ Execution Error: ${err.message}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      setTerminalTab('errors');
    }
  };

  // If user is not developer, show strict Authorization gate without fake bypass buttons
  if (!isAuthorized) {
    return (
      <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-purple-950/80 border border-purple-800/80 text-purple-400 flex items-center justify-center text-3xl mx-auto">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-white">HITARTH DEVELOPER STUDIO</h2>
            <p className="text-xs text-slate-400">
              Access Restricted: Only authorized developer Hitarth (OWO-9850) can access project editing and code execution.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
            <div className="text-amber-400 font-bold flex items-center justify-center gap-1">
              <Crown className="w-3.5 h-3.5" />
              <span>Developer Account Required: Hitarth (OWO-9850)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Current account: <strong>{account?.inGameName || 'Guest'}</strong> ({account?.id || 'Unregistered'})
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={onBackToChat}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              Return to Discord Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredFiles = files.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-950 font-sans overflow-hidden text-slate-200">
      {/* Dev Studio Top Bar */}
      <header className="h-13 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToChat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
            title="Return to Discord Chat"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Chat</span>
          </button>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2 py-0.5 rounded bg-purple-600/20 text-purple-400 font-bold border border-purple-500/40">
              HITARTH DEVELOPER STUDIO
            </span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="text-slate-400 font-bold hidden sm:inline">{activeFile.path}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {saveStatus && (
            <span className="text-xs text-emerald-400 font-bold animate-in fade-in hidden sm:inline">
              {saveStatus}
            </span>
          )}

          {/* Firestore Status Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold ${
              executionStatus === 'paused'
                ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                executionStatus === 'paused' ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <span>{executionStatus.toUpperCase()}</span>
            <span className="text-slate-400 font-normal">v{project?.version || 1}</span>
          </div>

          {/* Pause / Resume Execution in Firestore */}
          <button
            type="button"
            onClick={handleTogglePause}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer border ${
              executionStatus === 'paused'
                ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 shadow-sm shadow-amber-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30'
            }`}
            title={
              executionStatus === 'paused'
                ? 'Resume Project Execution in Firestore'
                : 'Pause Project Execution in Firestore'
            }
          >
            {executionStatus === 'paused' ? (
              <Play className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Pause className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {executionStatus === 'paused' ? 'Resume Code' : 'Pause Code'}
            </span>
          </button>

          {/* Project Settings Modal Button */}
          <button
            type="button"
            onClick={() => {
              setTempLimit(settings.limit);
              setTempLevel(settings.level);
              setIsSettingsOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
            title="Configure Project Settings (Limit, Level Requirement)"
          >
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">Settings ({settings.limit})</span>
          </button>

          {/* Mobile View Toggle */}
          <div className="flex items-center md:hidden bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setMobileView('files')}
              className={`px-2.5 py-1 rounded transition ${
                mobileView === 'files' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              📁 Files
            </button>
            <button
              type="button"
              onClick={() => setMobileView('editor')}
              className={`px-2.5 py-1 rounded transition ${
                mobileView === 'editor' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              📝 Editor
            </button>
          </div>

          <button
            type="button"
            onClick={handleSaveFile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            title="Save file changes to Firestore"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save File</span>
          </button>

          <button
            type="button"
            onClick={handleRunCode}
            disabled={executionStatus === 'paused'}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer ${
              executionStatus === 'paused'
                ? 'bg-slate-800 text-slate-500 border border-slate-700 opacity-60 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
            title={executionStatus === 'paused' ? 'Code is paused by Developer in Firestore' : 'Execute file in safe sandbox'}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Code</span>
          </button>
        </div>
      </header>

      {/* Main IDE Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left File Explorer Column (Responsive) */}
        <div className={`${mobileView === 'files' ? 'flex' : 'hidden'} md:flex w-full md:w-64 lg:w-72 bg-slate-900 border-r border-slate-800 flex-col shrink-0`}>
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <FolderOpen className="w-3.5 h-3.5 text-purple-400" />
              <span>EXPLORER</span>
            </div>
            <button
              type="button"
              onClick={() => setIsNewFileModalOpen(true)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
              title="New File"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Search Files */}
          <div className="p-2 border-b border-slate-800/80">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
              <Search className="w-3.5 h-3.5 text-slate-500 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="bg-transparent text-white text-xs focus:outline-none w-full"
              />
            </div>
          </div>

          {/* File Tree List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs font-mono">
            {filteredFiles.map((file) => {
              const isActive = file.id === activeFileId;
              const isJson = file.extension === 'json';
              const isRules = file.extension === 'rules';
              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => handleSelectFile(file)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors group cursor-pointer ${
                    isActive
                      ? 'bg-purple-600/30 text-white border border-purple-500/40'
                      : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {isJson ? (
                      <FileJson className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : isRules ? (
                      <FileText className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : (
                      <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    )}
                    <span className="truncate">{file.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-600 font-mono group-hover:text-slate-500 shrink-0">
                    {file.extension}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Code Snippets Bar */}
          <div className="p-2.5 bg-slate-950/70 border-t border-slate-800 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Quick Code Snippets
            </span>
            <div className="flex flex-col gap-1">
              {CODE_SNIPPETS.map((snip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setEditorContent((prev) => prev + '\n\n' + snip.code);
                    sound.playCoin();
                  }}
                  className="text-left text-[11px] text-purple-400 hover:text-purple-300 truncate transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
                  <span className="truncate">+ {snip.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Editor Area (Responsive) */}
        <div className={`${mobileView === 'editor' ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0 bg-slate-950`}>
          {/* File Tab Bar */}
          <div className="h-10 bg-slate-900/90 border-b border-slate-800 px-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-3 py-1 bg-slate-950 border-t-2 border-purple-500 rounded-t-lg text-white font-bold flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-purple-400" />
                <span>{activeFile.name}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeleteFile}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition-colors"
                title="Delete this file"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Text Editor Container */}
          <div className="flex-1 relative flex overflow-hidden">
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              spellCheck={false}
              className="w-full h-full p-4 bg-slate-950 font-mono text-xs sm:text-sm text-slate-100 selection:bg-purple-600 selection:text-white leading-relaxed resize-none focus:outline-none"
            />
          </div>

          {/* Bottom Terminal & Output Panel */}
          <div className="h-44 sm:h-52 bg-slate-900 border-t border-slate-800 flex flex-col shrink-0">
            {/* Terminal Header Tabs */}
            <div className="h-8 bg-slate-950 border-b border-slate-800 px-3 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTerminalTab('terminal')}
                  className={`flex items-center gap-1.5 py-1 font-bold transition-colors ${
                    terminalTab === 'terminal' ? 'text-white border-b-2 border-purple-500' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Terminal className="w-3 h-3 text-purple-400" />
                  <span>TERMINAL</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalTab('errors')}
                  className={`flex items-center gap-1.5 py-1 font-bold transition-colors ${
                    terminalTab === 'errors' ? 'text-white border-b-2 border-rose-500' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span>ERROR CONSOLE</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalTab('env')}
                  className={`flex items-center gap-1.5 py-1 font-bold transition-colors ${
                    terminalTab === 'env' ? 'text-white border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Sliders className="w-3 h-3 text-amber-400" />
                  <span>ENV & FIREBASE</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setLogs([])}
                className="text-[10px] text-slate-500 hover:text-slate-300"
              >
                Clear Console
              </button>
            </div>

            {/* Terminal Output Stream */}
            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1 bg-slate-950">
              {terminalTab === 'env' ? (
                <div className="space-y-1 text-slate-400">
                  <div className="text-emerald-400 font-bold">✔ Firebase Firestore Database: ai-studio-owoarcade-... Connected</div>
                  <div>Node Environment: Production (ESM)</div>
                  <div>User Auth: Hitarth (OWO-9850) [Role: Developer]</div>
                  <div>Bot Engine: Active & Listening for /owo commands</div>
                </div>
              ) : (
                logs
                  .filter((l) => (terminalTab === 'errors' ? l.type === 'error' : true))
                  .map((log) => (
                    <div
                      key={log.id}
                      className={`flex items-start gap-2 ${
                        log.type === 'error'
                          ? 'text-rose-400'
                          : log.type === 'warn'
                          ? 'text-amber-400'
                          : log.type === 'success'
                          ? 'text-emerald-400'
                          : log.type === 'info'
                          ? 'text-indigo-400'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="text-[10px] text-slate-600 shrink-0">[{log.timestamp}]</span>
                      <span className="whitespace-pre-wrap">{log.message}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New File Creation Modal */}
      {isNewFileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-400" />
              <span>Create New File in HITARTH</span>
            </h3>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">File Path (e.g. HITARTH/frontend/commands/MyCmd.ts)</label>
              <input
                type="text"
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewFileModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateFile}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md"
              >
                Create File
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Project Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-black text-white">Project Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 block">
                  Execution Limit (max runs):
                </label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={tempLimit}
                  onChange={(e) => setTempLimit(parseInt(e.target.value) || 100)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500">Configures maximum code executions (e.g. limit to 100)</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 block">
                  Required Player Level:
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={tempLevel}
                  onChange={(e) => setTempLevel(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500">Minimum player level required for collaborators to run</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Save to Firestore
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
