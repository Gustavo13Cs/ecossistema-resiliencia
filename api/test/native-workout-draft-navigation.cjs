// Prova complementar: o runner Cypress aceita beforeunload automaticamente.
// Chrome/CDP independente permite observar e recusar o diálogo nativo de verdade.
const { spawn } = require('node:child_process');
const { mkdir, mkdtemp, readFile, rm, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { EventEmitter } = require('node:events');
const assert = require('node:assert/strict');

const origin = 'http://localhost:3001';
const spaMode = process.argv.includes('--spa');
const sessionMode = process.argv.includes('--session-back');
const pause = () => new Promise(resolve => setTimeout(resolve, 40));

async function until(check, label) {
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    try { if (await check()) return; } catch { /* documento em navegação */ }
    await pause();
  }
  throw new Error(`Native browser condition failed: ${label}`);
}

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const events = new EventEmitter();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const waiting = pending.get(message.id);
      if (!waiting) return;
      pending.delete(message.id);
      if (message.error) waiting.reject(new Error(message.error.message));
      else waiting.resolve(message.result);
    } else events.emit(message.method, message.params);
  };
  const disconnected = () => {
    for (const waiting of pending.values()) waiting.reject(new Error('DevTools connection closed'));
    pending.clear();
  };
  socket.onclose = disconnected;
  socket.onerror = disconnected;
  return {
    events, close: () => socket.close(),
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        pending.set(++id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
  };
}

async function main() {
  const input = [];
  for await (const chunk of process.stdin) input.push(chunk);
  const fixture = JSON.parse(Buffer.concat(input).toString());
  const cookies = Array.isArray(fixture) ? fixture : fixture.cookies;
  assert(cookies.every(cookie => cookie.domain === 'localhost'));
  const directory = await mkdtemp(join(tmpdir(), 'safemove-task7-chrome-'));
  const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${directory}`, 'about:blank'], { stdio: 'ignore' });
  const chromeExited = new Promise(resolve => chrome.once('exit', resolve));
  let cdp;
  let primaryFailure;
  const httpFailures = [];
  try {
    let port;
    await until(async () => {
      port = Number((await readFile(join(directory, 'DevToolsActivePort'), 'utf8')).split('\n')[0]);
      return Boolean(port);
    }, 'Chrome DevTools startup');
    const target = await (await fetch(`http://localhost:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    cdp = await connect(target.webSocketDebuggerUrl);
    const browser = (await cdp.send('Browser.getVersion')).product;
    await cdp.send('Page.enable');
    const bfcacheNotUsedReasons = new Set();
    cdp.events.on('Page.backForwardCacheNotUsed', event => {
      for (const explanation of event.notRestoredExplanations) bfcacheNotUsedReasons.add(explanation.reason);
    });
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');
    cdp.events.on('Network.responseReceived', ({ response }) => {
      const url = new URL(response.url);
      if (url.pathname.startsWith('/api/') && response.status >= 400) httpFailures.push({ route: url.pathname.replace(/[a-f0-9-]{36}/g, ':id'), status: response.status });
    });
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const transferCookies = values => {
      assert(values.every(cookie => cookie.domain === 'localhost'));
      return cdp.send('Network.setCookies', { cookies: values.map(({ name, value, domain, path, httpOnly, secure }) => ({ name, value, domain, path, httpOnly, secure })) });
    };
    await transferCookies(cookies);
    const pageShows = [];
    cdp.events.on('Runtime.bindingCalled', ({ payload }) => pageShows.push(JSON.parse(payload)));
    await cdp.send('Runtime.addBinding', { name: '__task7PageShow' });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `
      ${spaMode ? '' : "Object.defineProperty(window, 'navigation', { configurable: true, value: undefined });"}
      window.__task7DocumentId = crypto.randomUUID();
      window.addEventListener('pageshow', event => window.__task7PageShow(JSON.stringify({ persisted: event.persisted })));
    ` });
    const evaluate = async expression => {
      const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const click = async expression => {
      const point = await evaluate(`(() => { const element = ${expression}; if (!element) throw new Error('Missing native click target'); element.scrollIntoView({ block: 'center' }); const rect = element.getBoundingClientRect(); const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2; if (!element.contains(document.elementFromPoint(x,y))) throw new Error('Native click target covered'); return {x,y}; })()`);
      for (const type of ['mousePressed', 'mouseReleased']) await cdp.send('Input.dispatchMouseEvent', { type, ...point, button: 'left', clickCount: 1 });
    };
    const navigate = async (path, appNavigation = false) => {
      const before = await evaluate('window.__task7DocumentId');
      if (appNavigation) await click(`Array.from(document.querySelectorAll('a')).find(link => link.getAttribute('href') === ${JSON.stringify(path)})`);
      else await cdp.send('Page.navigate', { url: origin + path });
      await until(() => evaluate(`location.pathname === ${JSON.stringify(path)} && document.readyState === 'complete' && window.__task7DocumentId ${appNavigation ? '===' : '!=='} ${JSON.stringify(before)}`), 'document navigation');
    };
    const api = async (method, path, body, expectedStatus) => evaluate(`(async () => {
      const { csrfToken: csrf } = await (await fetch('/api/auth/csrf', { credentials: 'include' })).json();
      const response = await fetch('/api' + ${JSON.stringify(path)}, { method: ${JSON.stringify(method)}, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf || '' }, ${body === undefined ? '' : `body: JSON.stringify(${JSON.stringify(body)}),`} credentials: 'include' });
      if (${expectedStatus ? `response.status !== ${expectedStatus}` : '!response.ok'}) throw new Error('Unexpected real HTTP response: ' + response.status + ' ' + ${JSON.stringify(method + ' ' + path)} + ' ' + JSON.stringify(await response.json()));
      return await response.json();
    })()`);
    await navigate('/home');
    await until(() => evaluate(`document.body.textContent.includes('Área de treinamento')`), 'authenticated Personal browser');
    if (process.argv.includes('--change-active')) {
      const workout = await api('POST', '/workouts', fixture.workout);
      process.stdout.write(JSON.stringify({ id: workout.id, realOtherBrowserTab: true }));
      return;
    }
    const client = await api('POST', '/clients', { name: spaMode ? 'Task7 Navegação SPA top level' : 'Task7 Navegação nativa' });
    const draft = await api('POST', '/workouts/drafts', { clientId: client.id, content: { title: 'Task7 Texto nativo salvo', splits: [{ name: 'Treino A', exercises: [{ name: 'Remada', sets: '3', reps: '10' }] }] } });
    const path = `/clientes/${client.id}/rascunhos/${draft.id}`;
    await navigate(`/clientes/${client.id}`);
    const isEditor = () => evaluate(`Boolean(document.querySelector('#draft-title')) && !document.querySelector('#draft-title').disabled`);
    let initialDocument;
    if (spaMode) {
      initialDocument = await evaluate('window.__task7DocumentId');
      await until(() => evaluate(`Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'Continuar rascunho')`), 'record ready');
      await navigate('/home', true);
      await until(() => evaluate(`Boolean(document.querySelector('a[href="/clientes/${client.id}"]'))`), 'dashboard link ready');
      await navigate(`/clientes/${client.id}`, true);
      await until(() => evaluate(`Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'Continuar rascunho')`), 'record ready again');
      await click(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Continuar rascunho')`);
    } else await navigate(path);
    await until(isEditor, 'fallback editor ready');
    if (spaMode) {
      assert.equal(await evaluate('window.__task7DocumentId'), initialDocument);
      assert.equal(await evaluate(`window.top === window && Boolean(window.navigation)`), true);
      await evaluate(`window.navigation.addEventListener('navigate', event => { if (event.navigationType === 'traverse') window.__task7LastTraversal = { cancelable: event.cancelable, sameDocument: event.destination.sameDocument }; })`);
    } else assert.equal(await evaluate(`window.navigation === undefined && new URL(performance.getEntriesByType('navigation')[0].name).pathname === location.pathname`), true);
    const typeDirty = async () => {
      await until(isEditor, 'editor before typing');
      const point = await evaluate(`(() => { const input = document.querySelector('#draft-title'); input.scrollIntoView({ block: 'center' }); const rect = input.getBoundingClientRect(); const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2; if (document.elementFromPoint(x,y) !== input) throw new Error('Input covered'); return { x,y }; })()`);
      for (const type of ['mousePressed', 'mouseReleased']) await cdp.send('Input.dispatchMouseEvent', { type, ...point, button: 'left', clickCount: 1 });
      await cdp.send('Input.insertText', { text: ' dirty nativo' });
      await until(() => evaluate(`document.body.textContent.includes('Alterações não salvas')`), 'dirty state after real input');
    };
    const history = async () => (await cdp.send('Page.getNavigationHistory'));
    const move = async (entryId, accept) => {
      if (spaMode) {
        await cdp.send('Page.navigateToHistoryEntry', { entryId });
        await until(() => evaluate(`Boolean(document.querySelector('[role="alertdialog"]'))`), 'SPA history confirmation');
        assert.deepEqual(await evaluate('window.__task7LastTraversal'), { cancelable: true, sameDocument: true });
        assert.equal(await evaluate('document.activeElement.textContent.trim()'), 'Cancelar');
        if (accept) await click(`Array.from(document.querySelectorAll('[role="alertdialog"] button')).find(button => button.textContent.trim() === 'Sair sem salvar alterações')`);
        else {
          await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
          await cdp.send('Input.dispatchKeyEvent', { type: 'char', text: '\r', unmodifiedText: '\r' });
          await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
          await until(() => evaluate(`!document.querySelector('[role="alertdialog"]') && document.activeElement.id === 'draft-title'`), 'keyboard cancellation restores focus');
        }
        return;
      }
      const dialog = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('No native beforeunload dialog observed')), 4000);
        cdp.events.once('Page.javascriptDialogOpening', event => { clearTimeout(timer); resolve(event); });
      });
      const navigation = cdp.send('Page.navigateToHistoryEntry', { entryId }).catch(error => error);
      assert.equal((await dialog).type, 'beforeunload');
      await cdp.send('Page.handleJavaScriptDialog', { accept });
      await navigation;
    };
    await typeDirty();
    if (sessionMode) {
      // Troca de conta também é exercida SEM um 403 prévio no documento antigo.
      const oldEditor = (await history()).entries.at(-1);
      await transferCookies(fixture.personalBCookies);
      const leaving = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Missing native dialog during session switch')), 4000);
        cdp.events.once('Page.javascriptDialogOpening', event => { clearTimeout(timer); resolve(event); });
      });
      const exitDocument = cdp.send('Page.navigate', { url: origin + '/home' }).catch(error => error);
      assert.equal((await leaving).type, 'beforeunload');
      await cdp.send('Page.handleJavaScriptDialog', { accept: true });
      await exitDocument;
      await until(() => evaluate(`location.pathname === '/home' && document.body.textContent.includes('Aluno Exclusivo Personal B')`), 'B session after leaving dirty A document');
      await cdp.send('Page.navigateToHistoryEntry', { entryId: oldEditor.id });
      await until(() => evaluate(`location.pathname === ${JSON.stringify(path)} && !document.querySelector('#draft-title') && /indisponível|Restabeleça seu acesso/.test(document.body.textContent)`), 'Back after session switch without prior 403');
      assert.equal(await evaluate(`document.body.textContent.includes('Task7 Texto nativo salvo') || document.body.textContent.includes('dirty nativo')`), false);
      await transferCookies(cookies);
      assert.equal((await api('GET', '/auth/me')).user.sub, '31000000-0000-4000-8000-000000000002');
      await navigate('/home');
      await navigate(path);
      await until(isEditor, 'A editor restored through a fresh authorized document');
      await typeDirty();
      await transferCookies(fixture.nutritionCookies);
      assert.equal((await api('GET', '/auth/me')).user.role, 'NUTRITIONIST');
      const denied = await api('PUT', `/workouts/drafts/${draft.id}`, { expectedVersion: draft.version, content: draft.content }, 403);
      assert.notEqual(denied.message, 'Token CSRF inválido.');
      await click(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Salvar rascunho')`);
      await until(() => evaluate(`!document.querySelector('#draft-title') && document.body.textContent.includes('Restabeleça seu acesso')`), '403 purges native editor');
      await transferCookies(fixture.personalBCookies);
      await navigate('/home');
      await until(() => evaluate(`document.body.textContent.includes('Aluno Exclusivo Personal B')`), 'real B session after document load');
      const entries = await history();
      await cdp.send('Page.navigateToHistoryEntry', { entryId: entries.entries[entries.currentIndex - 1].id });
      await until(() => evaluate(`location.pathname === ${JSON.stringify(path)} && !document.querySelector('#draft-title') && /indisponível|Restabeleça seu acesso/.test(document.body.textContent)`), 'Back after 403 and B session does not restore A');
      assert.equal(await evaluate(`document.body.textContent.includes('Task7 Texto nativo salvo') || document.body.textContent.includes('dirty nativo')`), false);
      process.stdout.write(JSON.stringify({ browser, mode: 'document-session-back', realRole403: true, oldClinicalStateAbsentAfterBack: true, sessionSwitchWithoutPrior403: true, pageShows, bfcacheObserved: pageShows.some(event => event.persisted), bfcacheNotUsedReasons: [...bfcacheNotUsedReasons] }));
      return;
    }
    const initial = await history();
    const previous = initial.entries[initial.currentIndex - 1];
    for (let attempt = 0; attempt < 2; attempt++) {
      await move(previous.id, false);
      assert.equal(await evaluate(`location.pathname === ${JSON.stringify(path)} && document.querySelector('#draft-title').value.includes('dirty nativo')`), true);
      assert.deepEqual((await history()).entries.map(entry => entry.id), initial.entries.map(entry => entry.id));
    }
    await move(previous.id, true);
    await until(() => evaluate(`location.pathname === ${JSON.stringify(`/clientes/${client.id}`)}`), 'accepted Back actual destination');
    await cdp.send('Page.navigateToHistoryEntry', { entryId: initial.entries[initial.currentIndex].id });
    await until(isEditor, 'Forward returns editor');
    // Reload retoma explicitamente o snapshot salvo caso o navegador restaure estado local.
    if (!spaMode) {
      const documentBeforeReload = await evaluate('window.__task7DocumentId');
      await cdp.send('Page.reload');
      // O ACK de Page.reload pode chegar enquanto o editor antigo ainda existe.
      await until(async () =>
        (await evaluate('window.__task7DocumentId')) !== documentBeforeReload && await isEditor(),
      'clean editor in the new document after explicit reload');
    }
    assert.equal(await evaluate(`document.querySelector('#draft-title').value`), draft.content.title);
    await navigate('/treinos', spaMode);
    const withForward = await history();
    const editor = withForward.entries[withForward.currentIndex - 1];
    await cdp.send('Page.navigateToHistoryEntry', { entryId: editor.id });
    await until(isEditor, 'Back returns clean editor before Forward');
    await typeDirty();
    await move(withForward.entries[withForward.currentIndex].id, false);
    assert.equal(await evaluate(`document.querySelector('#draft-title').value.includes('dirty nativo')`), true);
    await move(withForward.entries[withForward.currentIndex].id, true);
    await until(() => evaluate(`location.pathname === '/treinos'`), 'accepted Forward destination');
    await cdp.send('Page.navigateToHistoryEntry', { entryId: editor.id });
    await until(isEditor, 'Back returns editor before jump');
    await typeDirty();
    const home = (await history()).entries.filter(entry => entry.url === origin + '/home').at(-1);
    await move(home.id, false);
    assert.equal(await evaluate(`location.pathname === ${JSON.stringify(path)} && document.querySelector('#draft-title').value.includes('dirty nativo')`), true);
    await move(home.id, true);
    await until(() => evaluate(`location.pathname === '/home'`), 'accepted multi-entry traversal destination');
    if (spaMode) assert.equal(await evaluate('window.__task7DocumentId'), initialDocument);
    const artifacts = [];
    if (!spaMode && process.env.TASK7_FINAL_INSPECTIONS === '1') {
      const artifactDirectory = join(__dirname, '../../.superpowers/artifacts/personal-workout-drafts');
      await mkdir(artifactDirectory, { recursive: true });
      await navigate(path);
      await until(isEditor, 'final desktop inspection');
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
      const desktop = join(artifactDirectory, 'task-7-desktop-1440x900.png');
      await writeFile(desktop, Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
      artifacts.push(desktop);
      const finalized = await api('POST', `/workouts/drafts/${draft.id}/finalize`, { expectedVersion: draft.version });
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      await navigate(`/clientes/${client.id}/treinos/${finalized.finalizedWorkoutId}`);
      await until(() => evaluate(`document.querySelector('h1')?.textContent === 'Task7 Texto nativo salvo'`), 'final mobile saved reader inspection');
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
      const mobile = join(artifactDirectory, 'task-7-mobile-390x844.png');
      await writeFile(mobile, Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
      artifacts.push(mobile);
    }
    process.stdout.write(JSON.stringify({ browser, mode: spaMode ? 'spa-top-level' : 'document', backCancellations: 2, forwardCancellations: 1, jumpCancellations: 1, acceptedDestinations: 3, keyboardAndFocus: spaMode, navigationApiAbsentFromDocumentStart: !spaMode, pageShows, bfcacheObserved: pageShows.some(event => event.persisted), bfcacheNotUsedReasons: [...bfcacheNotUsedReasons], artifacts }));
  } catch (error) {
    error.message += ` [HTTP failures: ${JSON.stringify(httpFailures)}]`;
    primaryFailure = error;
    throw error;
  } finally {
    try {
      if (cdp) await cdp.send('Browser.close').catch(() => undefined);
      const deadline = Date.now() + 2000;
      while (chrome.exitCode === null && Date.now() < deadline) await pause();
      if (chrome.exitCode === null) chrome.kill('SIGTERM');
      await chromeExited;
      cdp?.close();
      await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    } catch (error) {
      if (primaryFailure) console.error(`Owned Chrome cleanup also failed: ${error.message}`);
      else throw error;
    }
  }
}

void main().catch(error => { console.error(error.message); process.exitCode = 1; });
