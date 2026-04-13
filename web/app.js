const statusEl = document.getElementById('status');
const outputEl = document.getElementById('output');
const errorsEl = document.getElementById('errors');
const codeEl = document.getElementById('code');
const runBtn = document.getElementById('run-btn');
const clearBtn = document.getElementById('clear-btn');
const copyBtn = document.getElementById('copy-btn');
const exampleSelect = document.getElementById('example-select');
const loadExampleBtn = document.getElementById('load-example');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const sidebarEl = document.getElementById('sidebar');
const libTabsEl = document.getElementById('lib-tabs');
const searchInputEl = document.getElementById('search-input');
const exampleListEl = document.getElementById('example-list');
const saveBtn = document.getElementById('save-btn');
const loadBtn = document.getElementById('load-btn');
const downloadBtn = document.getElementById('download-btn');
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');
const closeHelpBtn = document.getElementById('close-help');
const toastEl = document.getElementById('toast');
const adviceEl = document.getElementById('advice');
const runAllBtn = document.getElementById('run-all-btn');
const reportModal = document.getElementById('report-modal');
const closeReportBtn = document.getElementById('close-report');
const reportContentEl = document.getElementById('report-content');
const annotateToggle = document.getElementById('annotate-toggle');
const answerToggle = document.getElementById('answer-toggle');
let pyodide = null;
const catalogs = { numpy: null, pandas: null, tasks: null, trainer3: null };
let currentLib = 'numpy';
let currentItem = null;
let currentAssetMeta = null;
const loadedPackages = new Set();
const downloadedAssets = new Set();

const IMPORT_PACKAGE_MAP = {
  numpy: 'numpy',
  pandas: 'pandas',
  scipy: 'scipy',
  sklearn: 'scikit-learn',
  matplotlib: 'matplotlib',
  seaborn: 'seaborn',
  PIL: 'pillow',
  pillow: 'pillow',
};

function extractImports(code = '') {
  const out = new Set();
  const lines = (code || '').split('\n');
  for (const line of lines) {
    const m1 = line.match(/^\s*import\s+([A-Za-z0-9_\.]+)/);
    const m2 = line.match(/^\s*from\s+([A-Za-z0-9_\.]+)\s+import\s+/);
    const mod = (m1?.[1] || m2?.[1] || '').split('.')[0];
    if (mod) out.add(mod);
  }
  if (/\bread_excel\s*\(/.test(code)) out.add('openpyxl');
  return Array.from(out);
}

async function ensureRuntimePackages(code = '') {
  const imports = extractImports(code);
  const pkgs = [];
  for (const name of imports) {
    const pkg = IMPORT_PACKAGE_MAP[name] || (name === 'openpyxl' ? 'openpyxl' : null);
    if (pkg && !loadedPackages.has(pkg)) pkgs.push(pkg);
  }
  if (!pkgs.length) return;

  const nativePkgs = pkgs.filter(p => p !== 'openpyxl');
  const pipPkgs = pkgs.filter(p => p === 'openpyxl');
  if (nativePkgs.length) {
    try {
      await pyodide.loadPackage(nativePkgs);
      nativePkgs.forEach(p => loadedPackages.add(p));
    } catch (e) {
      console.warn('部分包加载失败:', nativePkgs, e);
    }
  }
  if (pipPkgs.length) {
    try {
      await pyodide.loadPackage('micropip');
      await pyodide.runPythonAsync(`
import micropip
await micropip.install("openpyxl")
`);
      pipPkgs.forEach(p => loadedPackages.add(p));
    } catch (e) {
      console.warn('openpyxl 安装失败:', e);
    }
  }
}

function encodeAssetUrl(path) {
  return path.split('/').map(seg => encodeURIComponent(seg)).join('/');
}

async function fetchAssetBinary(relPath) {
  const encoded = encodeAssetUrl(relPath);
  const candidates = [
    `./${encoded}`,
    `../${encoded}`,
    encoded,
    `/${encoded}`,
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        return { ok: true, url, bytes: new Uint8Array(await res.arrayBuffer()) };
      }
    } catch {}
  }
  return { ok: false, url: candidates[0], bytes: null };
}

function ensureFsDir(path) {
  const idx = path.lastIndexOf('/');
  if (idx <= 0) return;
  const dir = path.slice(0, idx);
  try {
    pyodide.FS.mkdirTree(dir);
  } catch {}
}

async function ensureExampleAssets(meta) {
  if (!meta || !meta.notebookDir || !meta.assets || !meta.assets.length) return;
  for (const asset of meta.assets) {
    const key = `${meta.notebookDir}::${asset}`;
    if (downloadedAssets.has(key)) continue;
    const relPath = `${meta.notebookDir}/${asset}`;
    const ret = await fetchAssetBinary(relPath);
    if (!ret.ok || !ret.bytes) {
      console.warn('资源下载失败:', relPath);
      continue;
    }
    const fsPath = `/${asset.replace(/^\/+/, '')}`;
    ensureFsDir(fsPath);
    pyodide.FS.writeFile(fsPath, ret.bytes);
    downloadedAssets.add(key);
  }
}

function setBusy(busy) {
  runBtn.disabled = busy;
  loadExampleBtn.disabled = busy;
  if (busy) {
    statusEl.textContent = '⌛ 正在运行代码...';
  } else {
    statusEl.textContent = '✅ 就绪';
  }
}

async function initPyodide() {
  statusEl.textContent = '⏳ 正在加载 Pyodide... 首次加载可能稍慢';
  pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/' });
  // 预加载常用包
  statusEl.textContent = '📦 正在加载基础包 numpy / pandas / pillow ...';
  try {
    await pyodide.loadPackage(['numpy', 'pandas', 'pillow']);
    ['numpy', 'pandas', 'pillow'].forEach(p => loadedPackages.add(p));
  } catch (e) {
    console.warn('加载包失败，可继续仅用 Python 基础运行。', e);
  }
  statusEl.textContent = '✅ 就绪';
  runBtn.disabled = false;
}

function indentPy(code, spaces = 8) {
  const pad = ' '.repeat(spaces);
  return code.split('\n').map(l => pad + l).join('\n');
}

function normalizeIndent(code) {
  const lines = (code || '').replace(/\t/g, '    ').split('\n');
  const nonComment = lines.filter(l => l.trim() && !l.trim().startsWith('#'));
  if (nonComment.length === 0) return 'pass';
  const indents = nonComment.map(l => (l.match(/^ +/) || [''])[0].length);
  const base = Math.min(...indents);
  return lines.map(l => l.startsWith(' ') ? l.slice(Math.min(base, (l.match(/^ +/) || [''])[0].length)) : l).join('\n');
}

async function runCode() {
  if (!pyodide) return;
  setBusy(true);
  errorsEl.textContent = '';
  outputEl.textContent = '';
  const userCode = normalizeIndent(codeEl.value);
  try {
    await ensureRuntimePackages(userCode);
    await ensureExampleAssets(currentAssetMeta);
  } catch (e) {
    errorsEl.textContent = `准备运行环境失败: ${e}`;
    setBusy(false);
    return;
  }
  const py = `
import sys, io, traceback, contextlib, os
_stdout, _stderr = io.StringIO(), io.StringIO()
os.chdir("/")
with contextlib.redirect_stdout(_stdout), contextlib.redirect_stderr(_stderr):
    try:
${indentPy(userCode)}
    except Exception:
        traceback.print_exc()
out = _stdout.getvalue()
err = _stderr.getvalue()
`;
  try {
    await pyodide.runPythonAsync(py);
    const out = pyodide.globals.get('out');
    const err = pyodide.globals.get('err');
    outputEl.textContent = out ? out.toString() : '';
    errorsEl.textContent = err ? err.toString() : '';
    if (err && err.toString()) {
      showAdvice(err.toString());
    } else if (adviceEl) {
      adviceEl.innerHTML = '';
    }
  } catch (e) {
    errorsEl.textContent = e.toString();
    showAdvice(errorsEl.textContent);
  } finally {
    setBusy(false);
  }
}

function clearScreen() {
  outputEl.textContent = '';
  errorsEl.textContent = '';
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(codeEl.value);
    statusEl.textContent = '📋 已复制代码到剪贴板';
  } catch {
    statusEl.textContent = '⚠️ 复制失败，请手动复制';
  }
}

const EXAMPLES = {
  blank: `# 欢迎使用 AI Course Lab（浏览器端 Python）
# 你可以直接在此处编写 Python 代码，然后点击「运行」按钮。
# 若加载了 numpy/pandas，可直接导入并使用。

print('Hello, AI Course!')`,
  numpy: `import numpy as np

a = np.arange(12).reshape(3, 4)
print('a =\\n', a)
print('切片 a[:2, 1:3] =\\n', a[:2, 1:3])

b = np.array([10, 20, 30, 40])
print('广播 a + b =\\n', a + b)

print('均值:', a.mean(), '标准差:', a.std())`,
  numpy_funcs: `import numpy as np

np.random.seed(0)

print('创建数组:')
print('array:', np.array([1, 2, 3]))
print('zeros:', np.zeros((2, 3)))
print('ones:', np.ones((2, 3)))
print('arange:', np.arange(0, 10, 2))
print('linspace:', np.linspace(0, 1, 5))
print('eye:', np.eye(3))

print('\\n形状变换:')
x = np.arange(12)
print('x:', x)
print('reshape(3,4):\\n', x.reshape(3, 4))
print('ravel:', x.reshape(3, 4).ravel())
print('transpose:', np.transpose(np.arange(6).reshape(2, 3)))

print('\\n索引与切片:')
a = np.arange(1, 13).reshape(3, 4)
print('a=\\n', a)
print('a[0, 1]:', a[0, 1])
print('a[:2, 1:3]=\\n', a[:2, 1:3])
mask = a % 2 == 0
print('布尔索引偶数:\\n', a[mask])
print('花式索引 a[[0,2],[1,3]]:', a[[0, 2], [1, 3]])

print('\\n聚合运算:')
print('sum:', a.sum(), 'mean:', a.mean(), 'std:', a.std())
print('axis=0 求列和:', a.sum(axis=0))
print('axis=1 求行最大值:', a.max(axis=1), 'argmax 行位置:', a.argmax(axis=1))

print('\\n广播:')
b = np.array([10, 20, 30, 40])
print('a+b=\\n', a + b)
print('a*2=\\n', a * 2)

print('\\n拼接与堆叠:')
m1 = np.arange(6).reshape(2, 3)
m2 = (np.arange(6) + 100).reshape(2, 3)
print('concatenate axis=0=\\n', np.concatenate([m1, m2], axis=0))
print('hstack=\\n', np.hstack([m1, m2]))
print('vstack=\\n', np.vstack([m1, m2]))

print('\\n排序与去重:')
v = np.array([3, 1, 2, 3, 2, 1])
print('unique:', np.unique(v))
print('sort:', np.sort(v))

print('\\n线性代数与点积:')
u = np.array([1, 2, 3])
w = np.array([4, 5, 6])
print('dot(u,w):', np.dot(u, w))
M = np.array([[1., 2.], [3., 4.]])
N = np.array([[5., 6.], [7., 8.]])
print('M@N=\\n', M @ N)

print('\\n随机数:')
print('rand(2,3)=\\n', np.random.rand(2, 3))
print('normal(0,1,5)=', np.random.normal(0, 1, size=5))

print('\\n类型与转换:')
q = np.array([1.2, 3.7, -2.1])
print('dtype:', q.dtype)
print('astype(int):', q.astype(int))`,
  pandas: `import pandas as pd
import numpy as np

df = pd.DataFrame({
    'age': [23, 25, np.nan, 30, 28],
    'city': ['BJ', 'SH', 'GZ', 'BJ', None],
    'score': [85, 92, 76, 88, 90],
})
print('原始数据:\\n', df)

# 缺失值处理与类型转换
df['age'] = df['age'].fillna(df['age'].median()).astype('int64')
df['city'] = df['city'].fillna('UNK')

print('\\n基本统计:\\n', df.describe(include='all'))
print('\\n分组聚合（城市均分）:\\n', df.groupby('city')['score'].mean())`,
  preprocess: `# 演示：标准化与训练/测试划分（仅用 numpy）
import numpy as np
from math import isfinite

np.random.seed(42)
X = np.random.randn(100, 4) * np.array([1.0, 5.0, 10.0, 0.5]) + np.array([0.0, 2.0, -3.0, 1.0])
y = (X[:, 0] + 0.1 * X[:, 1] > 0).astype(int)

idx = np.arange(len(X))
np.random.shuffle(idx)
train, test = idx[:80], idx[80:]
X_tr, X_te = X[train], X[test]
y_tr, y_te = y[train], y[test]

mu = X_tr.mean(axis=0)
sigma = X_tr.std(axis=0) + 1e-8
X_tr_std = (X_tr - mu) / sigma
X_te_std = (X_te - mu) / sigma

print('训练集形状:', X_tr_std.shape, '测试集形状:', X_te_std.shape)
print('标准化后训练集均值≈0:', np.round(X_tr_std.mean(0), 3))
print('标准化后训练集方差≈1:', np.round(X_tr_std.std(0), 3))`
};

function loadExample() {
  const key = exampleSelect.value;
  codeEl.value = EXAMPLES[key] || EXAMPLES.blank;
  currentItem = null;
  currentAssetMeta = null;
}

function saveDraft() {
  const v = codeEl.value || '';
  localStorage.setItem('ai_course_draft', v);
  if (toastEl) {
    toastEl.textContent = '已保存草稿';
    toastEl.classList.remove('hidden');
    setTimeout(() => toastEl.classList.add('hidden'), 1600);
  }
}

function loadDraft() {
  const v = localStorage.getItem('ai_course_draft') || '';
  codeEl.value = v;
  if (toastEl) {
    toastEl.textContent = '已恢复草稿';
    toastEl.classList.remove('hidden');
    setTimeout(() => toastEl.classList.add('hidden'), 1600);
  }
}

function downloadCode() {
  const blob = new Blob([codeEl.value || ''], { type: 'text/x-python' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ai_course_lab.py';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

let autoSaveTimer = null;
function onEditorInput() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    localStorage.setItem('ai_course_draft', codeEl.value || '');
  }, 600);
}

function openHelp() {
  if (helpModal) helpModal.classList.remove('hidden');
}

function closeHelp() {
  if (helpModal) helpModal.classList.add('hidden');
}

function showAdvice(errText) {
  if (!adviceEl) return;
  let items = [];
  const t = (errText || '').toLowerCase();
  if (t.includes('modulenotfounderror')) {
    items.push('确认是否导入了可用包。页面已预加载 numpy 与 pandas。');
  }
  if (t.includes('syntaxerror')) {
    items.push('检查缩进与符号，避免中文字符或混用空格/Tab。');
  }
  if (t.includes('shape') || t.includes('broadcast')) {
    items.push('检查数组形状是否匹配广播规则，必要时使用 reshape/expand_dims。');
  }
  if (t.includes('keyerror')) {
    items.push('检查列名或键是否存在，可用 df.columns 查看。');
  }
  if (t.includes('typeerror')) {
    items.push('确认数据类型是否满足操作要求，尝试 astype 转换。');
  }
  adviceEl.innerHTML = items.length ? '建议：<ul>' + items.map(i => '<li>' + i + '</li>').join('') + '</ul>' : '';
}

function bindShortcuts() {
  document.addEventListener('keydown', (e) => {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key === 'Enter') {
      e.preventDefault();
      runCode();
    } else if (meta && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      saveDraft();
    } else if (meta && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      loadDraft();
    } else if (e.key === 'Escape') {
      if (sidebarEl && !sidebarEl.classList.contains('hidden')) sidebarEl.classList.add('hidden');
      if (helpModal && !helpModal.classList.contains('hidden')) helpModal.classList.add('hidden');
    }
  });
}

function onboarding() {
  const key = 'ai_course_onboarded';
  if (!localStorage.getItem(key)) {
    openHelp();
    localStorage.setItem(key, '1');
    if (toastEl) {
      toastEl.textContent = '欢迎使用，按 Ctrl/Cmd+Enter 运行代码';
      toastEl.classList.remove('hidden');
      setTimeout(() => toastEl.classList.add('hidden'), 1600);
    }
  }
}

async function fetchCatalog(lib) {
  if (catalogs[lib]) return catalogs[lib];
  let url = `./examples/${lib}.json`;
  if (lib === 'tasks') url = './exercises/tasks.json';
  if (lib === 'trainer3') url = './exercises/trainer3.json';
  const res = await fetch(url);
  const data = await res.json();
  catalogs[lib] = data;
  return data;
}

function pickItemSource(it) {
  const useAnswer = !answerToggle || !!answerToggle.checked;
  return useAnswer ? (it.answer_code || it.code || '') : (it.template_code || it.code || '');
}

function renderCatalog(data, keyword = '') {
  exampleListEl.innerHTML = '';
  const kw = keyword.trim().toLowerCase();
  for (const group of data.groups) {
    const items = group.items.filter(it => {
      if (!kw) return true;
      return (it.id && it.id.toLowerCase().includes(kw)) ||
             (it.title && it.title.toLowerCase().includes(kw)) ||
             (group.title && group.title.toLowerCase().includes(kw));
    });
    if (!items.length) continue;
    const g = document.createElement('div');
    g.className = 'example-group';
    const h = document.createElement('h4');
    h.textContent = group.title;
    g.appendChild(h);
    for (const it of items) {
      const d = document.createElement('div');
      d.className = 'example-item';
      d.innerHTML = `<div>${it.title || it.id}</div><div class="id">${it.id || ''}</div>`;
      d.addEventListener('click', () => {
        currentItem = it;
        currentAssetMeta = {
          notebookDir: it.notebook_dir || '',
          assets: it.assets || [],
        };
        const raw = pickItemSource(it);
        let src = decodeSnippet(raw);
        if (annotateToggle && annotateToggle.checked) {
          src = annotateCode(src, it.goals || []);
        }
        codeEl.value = src;
        statusEl.textContent = `📄 已加载示例：${it.title || it.id}`;
        if (it.goals && adviceEl) {
          adviceEl.innerHTML = '目标：<ul>' + it.goals.map(g => `<li>${g}</li>`).join('') + '</ul>';
        }
      });
      g.appendChild(d);
    }
    exampleListEl.appendChild(g);
  }
}

async function openLibrary(lib) {
  currentLib = lib;
  Array.from(libTabsEl.querySelectorAll('button')).forEach(b => {
    b.classList.toggle('active', b.dataset.lib === lib);
  });
  const data = await fetchCatalog(lib);
  renderCatalog(data, searchInputEl.value);
  sidebarEl.classList.remove('hidden');
}

function toggleSidebar() {
  if (sidebarEl && sidebarEl.classList.contains('hidden')) {
    openLibrary(currentLib);
  } else if (sidebarEl) {
    sidebarEl.classList.add('hidden');
  }
}

function decodeSnippet(raw) {
  const s = (raw || '').replace(/\r\n/g, '\n');
  let out = '';
  let i = 0;
  let inSingle = false, inDouble = false, inTriSingle = false, inTriDouble = false;
  let escape = false;
  const len = s.length;
  while (i < len) {
    const ch = s[i];
    const next = i + 1 < len ? s[i + 1] : '';
    const next2 = i + 2 < len ? s[i + 2] : '';
    // Handle quote state transitions
    if (!inSingle && !inDouble && !inTriSingle && !inTriDouble) {
      // Outside strings: replace \n and \t
      if (ch === '\\' && next === 'n') {
        out += '\n'; i += 2; continue;
      }
      if (ch === '\\' && next === 't') {
        out += '\t'; i += 2; continue;
      }
      if (ch === "'" && next === "'" && next2 === "'") {
        inTriSingle = true; out += ch + next + next2; i += 3; continue;
      }
      if (ch === '"' && next === '"' && next2 === '"') {
        inTriDouble = true; out += ch + next + next2; i += 3; continue;
      }
      if (ch === "'") { inSingle = true; out += ch; i += 1; continue; }
      if (ch === '"') { inDouble = true; out += ch; i += 1; continue; }
      out += ch; i += 1; continue;
    } else {
      // Inside strings: just copy with escape handling and detect end
      out += ch;
      if (escape) { escape = false; i += 1; continue; }
      if (ch === '\\') { escape = true; i += 1; continue; }
      if (inTriSingle && ch === "'" && next === "'" && next2 === "'") {
        out += next + next2; inTriSingle = false; i += 3; continue;
      }
      if (inTriDouble && ch === '"' && next === '"' && next2 === '"') {
        out += next + next2; inTriDouble = false; i += 3; continue;
      }
      if (inSingle && ch === "'") { inSingle = false; i += 1; continue; }
      if (inDouble && ch === '"') { inDouble = false; i += 1; continue; }
      i += 1;
    }
  }
  return out;
}

function annotateCode(src, goals = []) {
  const lines = src.split('\n');
  const rules = [
    [/^\s*import\s+pandas\s+as\s+pd\b/, '# 导入 pandas 以处理表格/序列数据'],
    [/^\s*import\s+numpy\s+as\s+np\b/, '# 导入 numpy 以进行数值计算'],
    [/pd\.DataFrame\(/, '# 构造 DataFrame 表格数据'],
    [/pd\.Series\(/, '# 构造 Series 序列数据'],
    [/\.info\(\)\s*$/, '# 查看数据表结构与列类型'],
    [/isna\(\)\.sum\(\)/, '# 统计各列缺失值数量'],
    [/describe\(/, '# 输出综合描述统计'],
    [/head\(\)/, '# 查看前几行样例'],
    [/groupby\(/, '# 按组分组（groupby）'],
    [/agg\(/, '# 聚合统计（agg）'],
    [/sort_values\(/, '# 对结果排序'],
    [/pd\.merge\(/, '# 合并两张表（merge）'],
    [/pivot_table\(/, '# 透视表（宽表）'],
    [/\.melt\(/, '# 宽表转长表（melt）'],
    [/np\.random\.seed\(/, '# 固定随机种子以复现结果'],
    [/np\.random\.randn\(/, '# 生成服从标准正态分布的随机数'],
    [/mean\(/, '# 计算均值'],
    [/std\(/, '# 计算标准差'],
    [/resample\(/, '# 重采样时间序列'],
    [/get_dummies\(/, '# One-Hot 编码分类变量'],
    [/clip\(/, '# 截断/裁剪取值范围'],
    [/astype\(/, '# 转换数据类型'],
  ];
  const out = [];
  if (goals && goals.length) {
    out.push('# 目标分解：');
    goals.forEach((g, idx) => out.push(`# ${idx + 1}) ${g}`));
    out.push('');
  }
  for (const line of lines) {
    if (line.trim().startsWith('#') || line.trim() === '') {
      out.push(line);
      continue;
    }
    const rule = rules.find(r => r[0].test(line));
    if (rule) out.push(rule[1]);
    out.push(line);
  }
  return out.join('\n');
}

async function runSnippet(code) {
  let src = normalizeIndent(decodeSnippet(code));
  await ensureRuntimePackages(src);
  if (annotateToggle && annotateToggle.checked) {
    src = annotateCode(src);
  }
  const py = `
import sys, io, traceback, contextlib, os
_stdout, _stderr = io.StringIO(), io.StringIO()
os.chdir("/")
with contextlib.redirect_stdout(_stdout), contextlib.redirect_stderr(_stderr):
    try:
${indentPy(src)}
    except Exception:
        traceback.print_exc()
out = _stdout.getvalue()
err = _stderr.getvalue()
`;
  await pyodide.runPythonAsync(py);
  const out = pyodide.globals.get('out');
  const err = pyodide.globals.get('err');
  return { out: out ? out.toString() : '', err: err ? err.toString() : '' };
}

async function runAllExamples() {
  if (!pyodide) return;
  setBusy(true);
  statusEl.textContent = '⏳ 正在批量运行示例（NumPy/Pandas/任务/三级素材）...';
  const libs = ['numpy', 'pandas', 'tasks', 'trainer3'];
  const results = [];
  for (const lib of libs) {
    const cat = await fetchCatalog(lib);
    for (const group of cat.groups) {
      for (const it of group.items) {
        try {
          await ensureExampleAssets({ notebookDir: it.notebook_dir || '', assets: it.assets || [] });
          const code = (it.answer_code || it.code || '');
          const { err } = await runSnippet(code);
          const ok = !err;
          results.push({ lib, group: group.title, id: it.id || '', title: it.title || it.id || '', ok, err });
        } catch (e) {
          results.push({ lib, group: group.title, id: it.id || '', title: it.title || it.id || '', ok: false, err: String(e) });
        }
        await new Promise(r => setTimeout(r, 0));
      }
    }
  }
  const passed = results.filter(r => r.ok).length;
  const failed = results.length - passed;
  const html = [
    `<div class="report-summary">总计 ${results.length} 项；通过 ${passed}；失败 ${failed}</div>`,
    '<div class="report-list">',
    ...results.map(r => {
      const cls = r.ok ? 'ok' : 'fail';
      const err = r.ok ? '' : `<pre>${(r.err || '').split('\\n').slice(0, 6).join('\\n')}</pre>`;
      return `<div class="report-item ${cls}"><strong>[${r.lib}] ${r.group} - ${r.title}</strong>${err}</div>`;
    }),
    '</div>'
  ].join('');
  if (reportContentEl) reportContentEl.innerHTML = html;
  if (reportModal) reportModal.classList.remove('hidden');
  setBusy(false);
  statusEl.textContent = failed ? `⚠️ 批量执行完成：失败 ${failed} 项` : '✅ 批量执行全部通过';
}

runBtn.addEventListener('click', runCode);
clearBtn.addEventListener('click', clearScreen);
copyBtn.addEventListener('click', copyCode);
loadExampleBtn.addEventListener('click', loadExample);
if (toggleSidebarBtn) toggleSidebarBtn.addEventListener('click', toggleSidebar);
if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', () => sidebarEl.classList.add('hidden'));
if (libTabsEl) libTabsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-lib]');
  if (!btn) return;
  openLibrary(btn.dataset.lib);
});
if (searchInputEl) searchInputEl.addEventListener('input', async () => {
  const data = await fetchCatalog(currentLib);
  renderCatalog(data, searchInputEl.value);
});
if (answerToggle) answerToggle.addEventListener('change', () => {
  if (!currentItem) return;
  let src = decodeSnippet(pickItemSource(currentItem));
  if (annotateToggle && annotateToggle.checked) {
    src = annotateCode(src, currentItem.goals || []);
  }
  codeEl.value = src;
});

if (saveBtn) saveBtn.addEventListener('click', saveDraft);
if (loadBtn) loadBtn.addEventListener('click', loadDraft);
if (downloadBtn) downloadBtn.addEventListener('click', downloadCode);
if (helpBtn) helpBtn.addEventListener('click', openHelp);
if (closeHelpBtn) closeHelpBtn.addEventListener('click', closeHelp);
if (runAllBtn) runAllBtn.addEventListener('click', runAllExamples);
if (closeReportBtn) closeReportBtn.addEventListener('click', () => reportModal.classList.add('hidden'));
if (codeEl) codeEl.addEventListener('input', onEditorInput);

// 默认加载空白示例
loadExample();
initPyodide();
bindShortcuts();
