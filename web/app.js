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

let pyodide = null;
const catalogs = { numpy: null, pandas: null };
let currentLib = 'numpy';

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
  statusEl.textContent = '📦 正在加载 numpy / pandas ...';
  try {
    await pyodide.loadPackage(['numpy', 'pandas']);
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

async function runCode() {
  if (!pyodide) return;
  setBusy(true);
  errorsEl.textContent = '';
  outputEl.textContent = '';
  const userCode = codeEl.value;
  const py = `
import sys, io, traceback, contextlib
_stdout, _stderr = io.StringIO(), io.StringIO()
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
  } catch (e) {
    errorsEl.textContent = e.toString();
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
}

async function fetchCatalog(lib) {
  if (catalogs[lib]) return catalogs[lib];
  const res = await fetch(`./examples/${lib}.json`);
  const data = await res.json();
  catalogs[lib] = data;
  return data;
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
        codeEl.value = it.code || '';
        statusEl.textContent = `📄 已加载示例：${it.title || it.id}`;
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

// 默认加载空白示例
loadExample();
initPyodide();
