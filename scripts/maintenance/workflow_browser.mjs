// Controla únicamente Chrome headless con perfil temporal del verificador B4.
import { writeFile } from 'node:fs/promises';

const [port, width, height, screenshot] = process.argv.slice(2);
const page = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let nextId = 0;
const pending = new Map();
const errors = [];
socket.onmessage = ({ data }) => {
  const event = JSON.parse(data);
  if (event.id && pending.has(event.id)) {
    const { resolve, reject, timer } = pending.get(event.id);
    clearTimeout(timer); pending.delete(event.id);
    if (event.error) reject(new Error(event.error.message)); else resolve(event.result);
  }
  if (event.method === 'Runtime.exceptionThrown') errors.push(event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text);
  if (event.method === 'Network.responseReceived' && event.params.response.status >= 400 && !event.params.response.url.endsWith('/favicon.ico')) errors.push(`HTTP ${event.params.response.status}: ${event.params.response.url}`);
};
function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout ${method}`)); }, 20000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
}
try {
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: Number(width), height: Number(height), screenWidth: Number(width), screenHeight: Number(height), deviceScaleFactor: 1, mobile: Number(width) < 600 });
  await send('Page.navigate', { url: 'http://127.0.0.1:18004/output/playwright/workflow-harness.html' });
  let report;
  for (let i = 0; i < 45; i++) {
    const result = await send('Runtime.evaluate', { expression: 'document.getElementById("b4-test-result")?.textContent', returnByValue: true });
    if (result.result.value && result.result.value !== 'pending') { report = JSON.parse(result.result.value); break; }
    if (errors.length) throw new Error(errors[0]);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!report) throw new Error('UI no terminó de cargar');
  await new Promise((resolve) => setTimeout(resolve, 300));
  try {
    const capture = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false,
      clip: { x: 0, y: 0, width: Number(width), height: Number(height), scale: 1 } });
    await writeFile(screenshot, Buffer.from(capture.data, 'base64'));
    report.screenshot = true;
  } catch { report.screenshot = false; }
  console.log(JSON.stringify(report));
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  console.log(JSON.stringify({ passed: false, error: error.message })); process.exitCode = 1;
} finally { socket.close(); }
