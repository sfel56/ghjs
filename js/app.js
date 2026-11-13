const BUILTIN_NODES = [
  "https://ghfast.top/",
  "https://proxy.gitwarp.top/",
  "https://gh-al.gitwarp.top/",
  "https://gh-proxy.org/",
  "https://gh-proxy.com/",
  "https://v4.gh-proxy.org/",
  "https://v6.gh-proxy.org/",
  "https://axisnow.gh-proxy.org/",
  "https://cdn.gh-proxy.org/",
  "https://git.yylx.win/",
  "https://fastgit.cc/",
  "https://ghproxy.felicity.land/"
];

const ALLOWED_HOSTS = new Set([
  "github.com",
  "www.github.com",
  "raw.githubusercontent.com",
  "gist.github.com",
  "gist.githubusercontent.com",
  "codeload.github.com",
  "objects.githubusercontent.com",
  "release-assets.githubusercontent.com",
  "gitlab.com"
]);

const TEST_TIMEOUT = 8000;
const COUNTDOWN_SECONDS = 3;
const STORE_SELECTED = "ghacc.selected";
const STORE_AUTOPICK = "ghacc.autopick";
const STORE_CUSTOM = "ghacc.customNodes";

const $ = (id) => document.getElementById(id);

const input = $("ghUrl");
const clearBtn = $("clearBtn");
const inputBox = $("inputBox");
const goBtn = $("goBtn");
const grid = $("nodeGrid");
const testBtn = $("testBtn");
const testBtnText = $("testBtnText");
const testIcon = $("testIcon");
const testSummary = $("testSummary");
const autoPick = $("autoPick");
const addBtn = $("addBtn");
const addRow = $("addRow");
const addInput = $("addInput");
const addConfirm = $("addConfirm");
const addCancel = $("addCancel");
const resultPanel = $("result");
const finalLink = $("finalLink");
const resultTip = $("resultTip");
const copyBtn = $("copyBtn");
const countBar = $("countBar");
const countText = $("countText");
const cancelBtn = $("cancelBtn");
const jumpNowBtn = $("jumpNowBtn");
const toast = $("toast");

const cards = new Map();
let customNodes = loadCustomNodes();
let selected = localStorage.getItem(STORE_SELECTED) || null;
if (!allNodes().includes(selected)) selected = null;

let testing = false;
let countdownTimer = null;
let countdownLink = null;
let toastTimer = null;

function loadCustomNodes() {
  try {
    const arr = JSON.parse(localStorage.getItem(STORE_CUSTOM) || "[]");
    if (!Array.isArray(arr)) return [];
    return arr.filter((u) => typeof u === "string" && /^https?:\/\//i.test(u));
  } catch {
    return [];
  }
}

function saveCustomNodes() {
  localStorage.setItem(STORE_CUSTOM, JSON.stringify(customNodes));
}

function allNodes() {
  return [...BUILTIN_NODES, ...customNodes];
}

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function showToast(msg, type) {
  toast.textContent = msg;
  toast.className = "toast" + (type ? " " + type : "");
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
}

function normalizeUrl(raw) {
  let url = raw.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (!ALLOWED_HOSTS.has(u.hostname)) return null;
  if (!u.pathname || u.pathname === "/") return null;
  return u.href;
}

function normalizeNodeUrl(raw) {
  let url = raw.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  u.hash = "";
  return u.href.replace(/\/?$/, "/");
}

function latencyClass(ms) {
  if (ms <= 300) return "ok";
  if (ms <= 800) return "good";
  if (ms <= 1600) return "slow";
  return "bad";
}

function setCardState(url, state) {
  const c = cards.get(url);
  if (!c) return;
  c.el.className = "node";
  c.dot.className = "dot";
  if (state === "testing") {
    c.dot.classList.add("testing");
    c.lat.textContent = "...";
  } else if (state === "idle") {
    c.lat.textContent = "--";
  } else if (state === "fail") {
    c.dot.classList.add("fail");
    c.lat.textContent = "超时";
  } else {
    c.dot.classList.add(latencyClass(state));
    c.el.classList.add(latencyClass(state));
    c.lat.textContent = state + "ms";
  }
  if (url === selected) c.el.classList.add("selected");
}

function refreshSelected() {
  cards.forEach(({ el }, url) => el.classList.toggle("selected", url === selected));
}

function selectNode(url) {
  selected = url;
  localStorage.setItem(STORE_SELECTED, url);
  refreshSelected();
}

function renderGrid() {
  grid.innerHTML = "";
  cards.clear();
  allNodes().forEach((url) => {
    const el = document.createElement("div");
    el.className = "node";
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.dataset.url = url;
    el.innerHTML =
      '<span class="dot"></span><span class="node-name"></span><span class="lat">--</span>';
    el.querySelector(".node-name").textContent = hostOf(url);

    if (!BUILTIN_NODES.includes(url)) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "node-del";
      del.title = "删除该线路";
      del.setAttribute("aria-label", "删除该线路");
      del.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteNode(url);
      });
      el.appendChild(del);
    }

    const activate = () => selectNode(url);
    el.addEventListener("click", activate);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    });

    grid.appendChild(el);
    cards.set(url, { el, dot: el.querySelector(".dot"), lat: el.querySelector(".lat") });
  });
  refreshSelected();
}

function deleteNode(url) {
  if (testing) return;
  customNodes = customNodes.filter((u) => u !== url);
  saveCustomNodes();
  if (selected === url) {
    selected = null;
    localStorage.removeItem(STORE_SELECTED);
  }
  renderGrid();
  showToast("已删除线路 " + hostOf(url), "ok");
}

async function testNode(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TEST_TIMEOUT);
  const start = performance.now();
  try {
    await fetch(url + "?_t=" + Date.now(), {
      mode: "no-cors",
      cache: "no-store",
      signal: ctrl.signal
    });
    return Math.max(1, Math.round(performance.now() - start));
  } catch {
    return -1;
  } finally {
    clearTimeout(timer);
  }
}

async function runTest() {
  if (testing) return;
  testing = true;
  testBtn.disabled = true;
  addBtn.disabled = true;
  testBtn.classList.add("loading");
  testBtnText.textContent = "测速中";
  testSummary.hidden = true;

  const nodes = allNodes();
  nodes.forEach((url) => setCardState(url, "testing"));

  const results = new Map();
  const queue = [...nodes];
  const worker = async () => {
    while (queue.length) {
      const url = queue.shift();
      const ms = await testNode(url);
      results.set(url, ms);
      setCardState(url, ms >= 0 ? ms : "fail");
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));

  const sorted = [...nodes].sort((a, b) => {
    const ma = results.get(a);
    const mb = results.get(b);
    if (ma < 0 && mb < 0) return 0;
    if (ma < 0) return 1;
    if (mb < 0) return -1;
    return ma - mb;
  });
  sorted.forEach((url) => grid.appendChild(cards.get(url).el));

  const okNodes = sorted.filter((u) => results.get(u) >= 0);
  const fastest = okNodes[0] || null;
  testSummary.innerHTML = "";
  if (okNodes.length) {
    const strong = document.createElement("strong");
    strong.textContent = okNodes.length + " 条可用";
    testSummary.append(
      "测速完成：",
      strong,
      " / " + (nodes.length - okNodes.length) + " 条超时，最快线路 " + hostOf(fastest) + "（" + results.get(fastest) + "ms）"
    );
    if (autoPick.checked && fastest) selectNode(fastest);
  } else {
    testSummary.textContent = "测速完成：所有线路均超时，请检查网络后重试";
  }
  testSummary.hidden = false;

  testing = false;
  testBtn.disabled = false;
  addBtn.disabled = false;
  testBtn.classList.remove("loading");
  testBtnText.textContent = "重新测速";
}

function toggleAddRow(show) {
  addRow.hidden = !show;
  addBtn.hidden = show;
  if (show) addInput.focus();
}

async function addCustomNode() {
  const normalized = normalizeNodeUrl(addInput.value);
  if (!normalized) {
    showToast("请输入有效的线路地址，如 https://example.workers.dev/", "err");
    addInput.focus();
    return;
  }
  if (allNodes().includes(normalized)) {
    showToast("该线路已存在", "err");
    return;
  }
  if (location.protocol === "https:" && normalized.startsWith("http:")) {
    showToast("提示：HTTP 线路在 HTTPS 页面下可能无法测速", "err");
  }
  customNodes.push(normalized);
  saveCustomNodes();
  addInput.value = "";
  renderGrid();
  toggleAddRow(false);
  showToast("已添加线路 " + hostOf(normalized), "ok");

  testBtn.disabled = true;
  const ms = await testNode(normalized);
  setCardState(normalized, ms >= 0 ? ms : "fail");
  testBtn.disabled = false;
}

function stopCountdown(msg) {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  if (msg) {
    countText.textContent = msg;
    resultTip.textContent = "已停止自动跳转，可复制链接手动打开";
  }
}

function startCountdown(link) {
  stopCountdown();
  countdownLink = link;
  let remain = COUNTDOWN_SECONDS;
  countText.textContent = remain + " 秒后自动跳转";
  countBar.classList.remove("run");
  countBar.style.transitionDuration = "0s";
  countBar.style.width = "100%";
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      countBar.classList.add("run");
      countBar.style.transitionDuration = remain + "s";
      countBar.style.width = "0%";
    });
  });
  countdownTimer = setInterval(() => {
    remain--;
    if (remain <= 0) {
      stopCountdown();
      window.location.href = countdownLink;
    } else {
      countText.textContent = remain + " 秒后自动跳转";
    }
  }, 1000);
}

function generate() {
  const url = normalizeUrl(input.value);
  if (!url) {
    inputBox.classList.add("error");
    setTimeout(() => inputBox.classList.remove("error"), 500);
    showToast("请输入有效的 GitHub 文件链接", "err");
    input.focus();
    return;
  }
  if (!selected) {
    showToast("请先选择一条加速线路，正在为您自动测速", "err");
    runTest().then(() => {
      if (selected) generate();
    });
    return;
  }
  const link = selected.replace(/\/?$/, "/") + url;
  finalLink.textContent = link;
  resultTip.textContent = "若浏览器未自动跳转，请复制链接手动打开";
  resultPanel.hidden = false;
  startCountdown(link);
  resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function copyLink() {
  const text = finalLink.textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast("链接已复制", "ok");
    return;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast("链接已复制", "ok");
    } catch {
      showToast("复制失败，请手动选择链接复制", "err");
    }
    ta.remove();
  }
}

input.addEventListener("input", () => {
  clearBtn.hidden = input.value.length === 0;
});
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") generate();
});
clearBtn.addEventListener("click", () => {
  input.value = "";
  clearBtn.hidden = true;
  input.focus();
});
goBtn.addEventListener("click", generate);
testBtn.addEventListener("click", runTest);
autoPick.addEventListener("change", () => {
  localStorage.setItem(STORE_AUTOPICK, autoPick.checked ? "1" : "0");
});
addBtn.addEventListener("click", () => toggleAddRow(true));
addCancel.addEventListener("click", () => {
  addInput.value = "";
  toggleAddRow(false);
});
addConfirm.addEventListener("click", addCustomNode);
addInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addCustomNode();
});
copyBtn.addEventListener("click", copyLink);
cancelBtn.addEventListener("click", () => stopCountdown("已取消自动跳转"));
jumpNowBtn.addEventListener("click", () => {
  if (countdownLink) window.location.href = countdownLink;
});
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    input.value = chip.dataset.ex;
    clearBtn.hidden = false;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  });
});

renderGrid();
autoPick.checked = localStorage.getItem(STORE_AUTOPICK) !== "0";
setTimeout(runTest, 350);
