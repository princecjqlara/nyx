/**
 * Nyx Agent — Fully Standalone Phone Auto-Caller APK
 *
 * ✅ No Termux needed — everything runs inside the APK
 * ✅ NVIDIA API key hardcoded — user just installs and goes
 * ✅ AI instructions fetched from Vercel dashboard
 * ✅ Android built-in TTS — no Piper setup needed
 * ✅ NVIDIA NIM for STT + LLM via cloud API
 */

// ═══════════════════════════════════════════
// CONFIG — API key is managed from the Vercel dashboard
// ═══════════════════════════════════════════
const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';
const STT_MODEL = 'nvidia/parakeet-ctc-1.1b-asr';
const LLM_MODEL = 'meta/llama-3.1-8b-instruct';

// ═══════════════════════════════════════════
// State
// ═══════════════════════════════════════════
let running = false;
let pollTimer = null;
let stats = { completed: 0, failed: 0, pending: 0 };
let config = {};
let aiInstructions = null; // Fetched from Vercel

// ═══════════════════════════════════════════
// Config (only dashboard URL + timings)
// ═══════════════════════════════════════════
function loadConfig() {
  const saved = localStorage.getItem('nyx_config_v3');
  const c = saved ? JSON.parse(saved) : {
    apiUrl: '', pollInterval: 5, ringTimeout: 30, callDelay: 10,
  };
  setTimeout(() => {
    document.getElementById('apiUrl').value = c.apiUrl || '';
    document.getElementById('pollInterval').value = c.pollInterval || 5;
    document.getElementById('ringTimeout').value = c.ringTimeout || 30;
    document.getElementById('callDelay').value = c.callDelay || 10;
  }, 100);
  config = c;
  return c;
}

function saveConfig() {
  config = {
    apiUrl: document.getElementById('apiUrl').value.replace(/\/+$/, ''),
    pollInterval: parseInt(document.getElementById('pollInterval').value) || 5,
    ringTimeout: parseInt(document.getElementById('ringTimeout').value) || 30,
    callDelay: parseInt(document.getElementById('callDelay').value) || 10,
  };
  localStorage.setItem('nyx_config_v3', JSON.stringify(config));
  addLog('✓ Settings saved', 'success');
}

// ═══════════════════════════════════════════
// Agent Control
// ═══════════════════════════════════════════
function toggleAgent() {
  running ? stopAgent() : startAgent();
}

async function startAgent() {
  if (!config.apiUrl) { addLog('Enter the Dashboard URL first!', 'error'); return; }

  // Fetch AI instructions from Vercel
  addLog('Fetching AI instructions from dashboard...', 'info');
  aiInstructions = await apiGet('/api/ai-instructions');
  if (aiInstructions) {
    if (!aiInstructions.nvidiaApiKey) {
      addLog('⚠ No NVIDIA API key set! Go to Dashboard → Settings to add it.', 'error');
      return;
    }
    addLog('✓ AI instructions + API key loaded', 'success');
    showInstructions(aiInstructions);
  } else {
    addLog('⚠ Could not connect to dashboard!', 'error');
    return;
  }

  running = true;
  updateUI();
  addLog('Agent started — polling for tasks...', 'success');
  pollForTasks();
}

function stopAgent() {
  running = false;
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
  updateUI();
  addLog('Agent stopped', 'warning');
}

// ═══════════════════════════════════════════
// Task Polling (from Vercel)
// ═══════════════════════════════════════════
async function pollForTasks() {
  if (!running) return;
  try {
    const statsData = await apiGet('/api/stats');
    if (statsData) {
      stats.pending = statsData.pendingCalls || 0;
      stats.completed = statsData.completedCalls || 0;
      stats.failed = statsData.failedCalls || 0;
      updateStats();
    }

    // Re-fetch instructions periodically (user may update them)
    const freshInstructions = await apiGet('/api/ai-instructions');
    if (freshInstructions) {
      aiInstructions = freshInstructions;
      showInstructions(aiInstructions);
    }

    const result = await apiPost('/api/call-tasks/claim');
    if (result && result.task) {
      await handleCall(result.task);
      addLog(`Waiting ${config.callDelay}s...`, 'info');
      pollTimer = setTimeout(pollForTasks, config.callDelay * 1000);
    } else {
      pollTimer = setTimeout(pollForTasks, config.pollInterval * 1000);
    }
  } catch (err) {
    addLog(`Poll error: ${err.message}`, 'error');
    pollTimer = setTimeout(pollForTasks, config.pollInterval * 1000);
  }
}

// ═══════════════════════════════════════════
// Call Flow (Listen → Think → Speak)
// ═══════════════════════════════════════════
async function handleCall(task) {
  const name = task.leadName || 'Unknown';
  const phone = task.leadPhone || '';
  const taskId = task.id;
  const leadId = task.leadId;
  const conversation = [];

  addLog(`═══ CALLING: ${name} (${phone}) ═══`, 'call');
  showCurrentCall(name, phone, 'Starting...');
  setStatus('calling');
  await apiPatch(`/api/call-tasks/${taskId}`, { status: 'in_progress' });

  // 1. Launch Viber call first
  showCurrentCall(name, phone, 'Dialing via Viber...');
  const callStarted = await launchViberCall(phone);
  if (!callStarted) {
    addLog('Failed to launch Viber', 'error');
    await apiPatch(`/api/call-tasks/${taskId}`, { status: 'failed', result: 'dial_error' });
    hideCurrentCall(); setStatus('running'); stats.failed++; updateStats();
    return;
  }

  // 2. Wait for connection
  showCurrentCall(name, phone, 'Ringing...');
  addLog('Ringing...', 'info');
  await sleep(config.ringTimeout * 1000);

  // 3. Speak opening line via Android TTS
  const opening = aiInstructions.openingLine || 'Hello, do you have a moment?';
  showCurrentCall(name, phone, 'Speaking opening...');
  addLog(`🔊 "${opening}"`, 'call');
  await speak(opening);
  conversation.push({ role: 'assistant', content: opening });

  // 4. Conversational loop
  const callStart = Date.now();
  const maxTurns = 6;
  let outcome = 'no_answer';
  let sentiment = 'neutral';

  for (let turn = 0; turn < maxTurns; turn++) {
    if (!running) break;

    // LISTEN
    showCurrentCall(name, phone, `🎤 Listening (${turn + 1}/${maxTurns})...`);
    addLog('🎤 Listening...', 'info');
    const audioBlob = await recordAudio(8);
    if (!audioBlob) { addLog('No audio, ending call', 'warning'); break; }

    // TRANSCRIBE via NVIDIA
    showCurrentCall(name, phone, '📝 Transcribing...');
    const userText = await nvidiaSTT(audioBlob);
    if (!userText) { addLog('No speech detected', 'warning'); break; }
    addLog(`👤 "${userText}"`, 'info');
    conversation.push({ role: 'user', content: userText });

    // Check for call-enders
    const lower = userText.toLowerCase();
    if (['bye', 'goodbye', 'not interested', 'stop calling', 'remove', 'don\'t call'].some(w => lower.includes(w))) {
      outcome = 'not_interested'; sentiment = 'negative';
      const closing = aiInstructions.closingLine || 'Thank you for your time!';
      addLog(`🔊 "${closing}"`, 'call');
      await speak(closing);
      conversation.push({ role: 'assistant', content: closing });
      break;
    }

    // THINK via NVIDIA LLM
    showCurrentCall(name, phone, '🧠 Thinking...');
    const aiReply = await nvidiaLLM(conversation, name, task.leadCompany);
    if (!aiReply) { addLog('LLM failed', 'warning'); break; }
    addLog(`🤖 "${aiReply}"`, 'call');
    conversation.push({ role: 'assistant', content: aiReply });

    // SPEAK via Android TTS
    showCurrentCall(name, phone, '🔊 Speaking...');
    await speak(aiReply);

    // Update sentiment
    if (['interested', 'yes', 'sure', 'tell me more', 'sounds good'].some(w => lower.includes(w))) {
      outcome = 'interested'; sentiment = 'positive';
    } else if (['busy', 'later', 'call back', 'maybe'].some(w => lower.includes(w))) {
      outcome = 'callback'; sentiment = 'neutral';
    } else {
      outcome = 'interested'; sentiment = 'neutral';
    }
  }

  // End
  const duration = Math.round((Date.now() - callStart) / 1000);
  hideCurrentCall(); setStatus('running');

  const transcript = conversation.map(m =>
    m.role === 'assistant' ? `Agent: ${m.content}` : `Lead: ${m.content}`
  ).join('\n');

  // AI Summary
  addLog('Generating summary...', 'info');
  const aiSummary = await nvidiaLLM([
    { role: 'system', content: 'Summarize this sales call in 2-3 sentences. Note interest level and follow-up actions needed.' },
    { role: 'user', content: transcript || 'No conversation took place.' },
  ]) || `Call with ${name} (${duration}s). Outcome: ${outcome}.`;

  // Report to dashboard
  await apiPatch(`/api/call-tasks/${taskId}`, { status: 'completed', result: outcome });
  await apiPost('/api/call-logs', {
    taskId, leadId, durationSeconds: duration,
    transcript, aiSummary, sentiment, outcome,
  });

  stats.completed++; updateStats();
  addLog(`✓ ${name}: ${outcome} (${duration}s)`, 'success');
}

// ═══════════════════════════════════════════
// NVIDIA NIM — Speech-to-Text
// ═══════════════════════════════════════════
async function nvidiaSTT(audioBlob) {
  try {
    const base64 = await blobToBase64(audioBlob);
    const resp = await fetch(`${NVIDIA_API_BASE}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiInstructions.nvidiaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: STT_MODEL, audio: base64, language: 'en' }),
    });
    if (!resp.ok) {
      addLog(`STT error: ${resp.status}`, 'error');
      return '';
    }
    return (await resp.json()).text || '';
  } catch (e) {
    addLog(`STT failed: ${e.message}`, 'error');
    return '';
  }
}

// ═══════════════════════════════════════════
// NVIDIA NIM — LLM Chat
// ═══════════════════════════════════════════
async function nvidiaLLM(conversation, leadName, leadCompany) {
  try {
    const sysPrompt = [
      aiInstructions?.systemPrompt || 'You are a sales representative.',
      aiInstructions?.callObjective ? `OBJECTIVE: ${aiInstructions.callObjective}` : '',
      aiInstructions?.doNotSay ? `NEVER SAY: ${aiInstructions.doNotSay}` : '',
      aiInstructions?.escalationRules ? `ESCALATION: ${aiInstructions.escalationRules}` : '',
      `Speaking with: ${leadName || 'the lead'}${leadCompany ? ` from ${leadCompany}` : ''}`,
      'Keep responses under 2 sentences. Be natural.',
    ].filter(Boolean).join('\n');

    const messages = [
      { role: 'system', content: sysPrompt },
      ...conversation.filter(m => m.role !== 'system'),
    ];

    const resp = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LLM_MODEL, messages,
        max_tokens: 150, temperature: 0.7, top_p: 0.9,
      }),
    });
    if (!resp.ok) {
      addLog(`LLM error: ${resp.status}`, 'error');
      return '';
    }
    return (await resp.json()).choices?.[0]?.message?.content?.trim() || '';
  } catch (e) {
    addLog(`LLM failed: ${e.message}`, 'error');
    return '';
  }
}

// ═══════════════════════════════════════════
// TTS — Android Built-in (no Termux needed)
// ═══════════════════════════════════════════
function speak(text) {
  return new Promise((resolve) => {
    if (!text) { resolve(); return; }
    if (!('speechSynthesis' in window)) {
      addLog('TTS not available', 'warning');
      resolve(); return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 1.0; u.pitch = 1.0;
    u.onend = resolve; u.onerror = resolve;
    speechSynthesis.speak(u);
  });
}

// ═══════════════════════════════════════════
// Audio Recording (WebView MediaRecorder)
// ═══════════════════════════════════════════
async function recordAudio(seconds) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm',
    });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    return new Promise((resolve) => {
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        resolve(chunks.length ? new Blob(chunks, { type: 'audio/webm' }) : null);
      };
      recorder.start();
      setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, seconds * 1000);
    });
  } catch (e) {
    addLog(`Mic error: ${e.message}`, 'error');
    return null;
  }
}

// ═══════════════════════════════════════════
// Viber Call (Android Intent)
// ═══════════════════════════════════════════
async function launchViberCall(phone) {
  try {
    window.open(`viber://call/${phone.replace(/[^0-9+]/g, '')}`, '_system');
    addLog(`Viber → ${phone}`, 'call');
    await sleep(3000);
    return true;
  } catch {
    try { window.open(`tel:${phone}`, '_system'); return true; }
    catch { return false; }
  }
}

// ═══════════════════════════════════════════
// Vercel API Helpers
// ═══════════════════════════════════════════
async function apiGet(p) {
  try { return await (await fetch(`${config.apiUrl}${p}`)).json(); } catch { return null; }
}
async function apiPost(p, b = {}) {
  try {
    const r = await fetch(`${config.apiUrl}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}
async function apiPatch(p, b = {}) {
  try {
    const r = await fetch(`${config.apiUrl}${p}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

// ═══════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════
function blobToBase64(blob) {
  return new Promise(r => { const fr = new FileReader(); fr.onloadend = () => r(fr.result.split(',')[1]); fr.readAsDataURL(blob); });
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════
// UI
// ═══════════════════════════════════════════
function updateUI() {
  const btn = document.getElementById('toggleAgent');
  const badge = document.getElementById('statusBadge');
  if (running) {
    btn.className = 'btn btn-stop'; btn.innerHTML = '■ Stop Agent';
    badge.className = 'status-badge running'; badge.textContent = 'Running';
  } else {
    btn.className = 'btn btn-start'; btn.innerHTML = '▶ Start Agent';
    badge.className = 'status-badge offline'; badge.textContent = 'Offline';
  }
}
function setStatus(s) {
  const b = document.getElementById('statusBadge');
  if (s === 'calling') { b.className = 'status-badge calling'; b.textContent = 'On Call'; }
  else { b.className = 'status-badge running'; b.textContent = 'Running'; }
}
function updateStats() {
  document.getElementById('statCompleted').textContent = stats.completed;
  document.getElementById('statFailed').textContent = stats.failed;
  document.getElementById('statPending').textContent = stats.pending;
}
function showCurrentCall(n, p, s) {
  document.getElementById('currentCall').style.display = 'block';
  document.getElementById('callName').textContent = n;
  document.getElementById('callPhone').textContent = p;
  document.getElementById('callStatus').textContent = s;
}
function hideCurrentCall() { document.getElementById('currentCall').style.display = 'none'; }

function showInstructions(instr) {
  const el = document.getElementById('instructionsPreview');
  const txt = document.getElementById('instrText');
  el.style.display = 'block';
  txt.textContent = instr.callObjective || instr.systemPrompt || 'No instructions set';
}

function addLog(msg, type = 'info') {
  const c = document.getElementById('logContainer');
  const e = document.createElement('div');
  e.className = `log-entry ${type}`;
  e.innerHTML = `<span class="time">${new Date().toLocaleTimeString('en-US', { hour12: false })}</span> ${msg}`;
  c.insertBefore(e, c.firstChild);
  while (c.children.length > 100) c.removeChild(c.lastChild);
}
function clearLog() { document.getElementById('logContainer').innerHTML = ''; addLog('Log cleared', 'info'); }

document.addEventListener('DOMContentLoaded', () => { loadConfig(); addLog('Nyx Agent ready — install & go', 'info'); });
