// ==========================================================================
// Speech Transcription Quality Checker - Application Logic
// ==========================================================================

(function() {
  'use strict';

  // --- Constants & Keys ---
  const STORAGE_KEY_ANSWERS = 'speech_gaze_answers_v1';
  const STORAGE_KEY_SETTINGS = 'speech_gaze_settings_v1';
  const STORAGE_KEY_LAST_ID = 'speech_gaze_last_id_v1';

  // --- App State ---
  let items = window.SPEECH_DATA || [];
  let answers = {}; // id -> { status: 'ok'|'ng'|'', note: '', updated_at: '' }
  let settings = {
    autoAdvance: true,
    vibrate: true,
    shortcuts: true,
    audioBaseUrl: '',
    audioSourceType: 'relative' // 'relative' | 'blob' | 'custom'
  };

  let currentId = 1;
  let currentGroupStartId = 1; // 1, 101, 201, ...
  let currentView = 'card'; // 'card' | 'list'
  let listFilter = 'all'; // 'all' | 'unanswered' | 'ok' | 'ng' | 'note'
  let listSearchQuery = '';
  let localAudioBlobUrls = {}; // groupStartId -> blobUrl

  // --- DOM Elements ---
  const dom = {
    // Header & Progress
    headerGroupLabel: document.getElementById('headerGroupLabel'),
    viewToggleBtn: document.getElementById('viewToggleBtn'),
    viewToggleIcon: document.getElementById('viewToggleIcon'),
    exportModalOpenBtn: document.getElementById('exportModalOpenBtn'),
    exportBadge: document.getElementById('exportBadge'),
    menuModalOpenBtn: document.getElementById('menuModalOpenBtn'),
    progressPercent: document.getElementById('progressPercent'),
    answeredCount: document.getElementById('answeredCount'),
    totalCount: document.getElementById('totalCount'),
    countOk: document.getElementById('countOk'),
    countNg: document.getElementById('countNg'),
    countPending: document.getElementById('countPending'),
    progressBarOk: document.getElementById('progressBarOk'),
    progressBarNg: document.getElementById('progressBarNg'),

    // Audio Panel
    audioPanel: document.getElementById('audioPanel'),
    mainAudio: document.getElementById('mainAudio'),
    currentAudioName: document.getElementById('currentAudioName'),
    audioSourceBadge: document.getElementById('audioSourceBadge'),
    audioSourceSelectBtn: document.getElementById('audioSourceSelectBtn'),
    audioPanelToggleBtn: document.getElementById('audioPanelToggleBtn'),
    audioControlsBody: document.getElementById('audioControlsBody'),
    audioSeekBar: document.getElementById('audioSeekBar'),
    currentTimeLabel: document.getElementById('currentTimeLabel'),
    durationTimeLabel: document.getElementById('durationTimeLabel'),
    btnPlayPause: document.getElementById('btnPlayPause'),
    playIcon: document.getElementById('playIcon'),
    btnBack5: document.getElementById('btnBack5'),
    btnForward5: document.getElementById('btnForward5'),
    btnSpeed: document.getElementById('btnSpeed'),
    btnSyncAudio: document.getElementById('btnSyncAudio'),

    // Views
    cardView: document.getElementById('cardView'),
    listView: document.getElementById('listView'),

    // Card View Elements
    groupSelect: document.getElementById('groupSelect'),
    btnJumpUnanswered: document.getElementById('btnJumpUnanswered'),
    checkerCard: document.getElementById('checkerCard'),
    cardId: document.getElementById('cardId'),
    currentIndexDisplay: document.getElementById('currentIndexDisplay'),
    groupTotalDisplay: document.getElementById('groupTotalDisplay'),
    cardTimeBadge: document.getElementById('cardTimeBadge'),
    cardDirectionBadge: document.getElementById('cardDirectionBadge'),
    cardSpeechText: document.getElementById('cardSpeechText'),
    cardSourceAudio: document.getElementById('cardSourceAudio'),
    btnJudgeOk: document.getElementById('btnJudgeOk'),
    btnJudgeNg: document.getElementById('btnJudgeNg'),
    btnJudgeClear: document.getElementById('btnJudgeClear'),
    autoAdvanceCheck: document.getElementById('autoAdvanceCheck'),
    cardNoteInput: document.getElementById('cardNoteInput'),
    btnPrevCard: document.getElementById('btnPrevCard'),
    btnNextCard: document.getElementById('btnNextCard'),
    currentCardStatusPill: document.getElementById('currentCardStatusPill'),

    // List View Elements
    listFilterAllCount: document.getElementById('listFilterAllCount'),
    listFilterPendingCount: document.getElementById('listFilterPendingCount'),
    listFilterOkCount: document.getElementById('listFilterOkCount'),
    listFilterNgCount: document.getElementById('listFilterNgCount'),
    listFilterNoteCount: document.getElementById('listFilterNoteCount'),
    listSearchInput: document.getElementById('listSearchInput'),
    listContainer: document.getElementById('listContainer'),

    // Mobile Action Bar
    mobileActionBar: document.getElementById('mobileActionBar'),
    mobileBtnPrev: document.getElementById('mobileBtnPrev'),
    mobileBtnNext: document.getElementById('mobileBtnNext'),
    mobileBtnOk: document.getElementById('mobileBtnOk'),
    mobileBtnNg: document.getElementById('mobileBtnNg'),

    // Modals
    exportModal: document.getElementById('exportModal'),
    exportModalCloseBtn: document.getElementById('exportModalCloseBtn'),
    modalAnsweredCount: document.getElementById('modalAnsweredCount'),
    modalAnsweredRate: document.getElementById('modalAnsweredRate'),
    modalCountOk: document.getElementById('modalCountOk'),
    modalCountNg: document.getElementById('modalCountNg'),
    modalCountPending: document.getElementById('modalCountPending'),
    btnExportCsv: document.getElementById('btnExportCsv'),
    btnExportJson: document.getElementById('btnExportJson'),
    btnShareData: document.getElementById('btnShareData'),
    btnCopyData: document.getElementById('btnCopyData'),
    btnTriggerImport: document.getElementById('btnTriggerImport'),
    importFileInput: document.getElementById('importFileInput'),

    audioSourceModal: document.getElementById('audioSourceModal'),
    audioSourceModalCloseBtn: document.getElementById('audioSourceModalCloseBtn'),
    btnSetAudioDefault: document.getElementById('btnSetAudioDefault'),
    localAudioFileInput: document.getElementById('localAudioFileInput'),
    audioBaseUrlInput: document.getElementById('audioBaseUrlInput'),
    btnSaveAudioBaseUrl: document.getElementById('btnSaveAudioBaseUrl'),

    menuModal: document.getElementById('menuModal'),
    menuModalCloseBtn: document.getElementById('menuModalCloseBtn'),
    menuAutoAdvanceCheck: document.getElementById('menuAutoAdvanceCheck'),
    menuVibrateCheck: document.getElementById('menuVibrateCheck'),
    menuShortcutsCheck: document.getElementById('menuShortcutsCheck'),
    btnResetAllData: document.getElementById('btnResetAllData'),

    toast: document.getElementById('toast')
  };

  // --- Initialization ---
  function init() {
    loadSettings();
    loadAnswers();

    if (!items || items.length === 0) {
      showToast('⚠️ データが見つかりません (data.js を確認してください)');
      return;
    }

    dom.totalCount.textContent = items.length;
    dom.listFilterAllCount.textContent = items.length;

    // Restore last viewed ID
    const lastId = parseInt(localStorage.getItem(STORAGE_KEY_LAST_ID), 10);
    if (lastId && lastId >= 1 && lastId <= items.length) {
      currentId = lastId;
    }

    updateGroupFromId(currentId);
    setupEventListeners();
    updateUI();
    loadAudioForCurrentGroup();
  }

  // --- Persistence ---
  function loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        settings = Object.assign(settings, JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to parse settings:', e);
    }
    dom.autoAdvanceCheck.checked = settings.autoAdvance;
    dom.menuAutoAdvanceCheck.checked = settings.autoAdvance;
    dom.menuVibrateCheck.checked = settings.vibrate;
    dom.menuShortcutsCheck.checked = settings.shortcuts;
    if (settings.audioBaseUrl) {
      dom.audioBaseUrlInput.value = settings.audioBaseUrl;
    }
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }

  function loadAnswers() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ANSWERS);
      if (saved) {
        answers = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse answers:', e);
      answers = {};
    }
  }

  function saveAnswers() {
    localStorage.setItem(STORAGE_KEY_ANSWERS, JSON.stringify(answers));
    localStorage.setItem(STORAGE_KEY_LAST_ID, currentId.toString());
    updateProgressStats();
  }

  // --- Audio Management ---
  const speeds = [1.0, 1.25, 1.5, 2.0, 0.8];
  let currentSpeedIdx = 0;

  function getAudioFileNameForGroup(startId) {
    const endId = Math.min(items.length, startId + 99);
    const startStr = String(startId).padStart(3, '0');
    const endStr = String(endId).padStart(3, '0');
    return `speech_gaze_${startStr}_${endStr}.mp3`;
  }

  function getAudioUrlForGroup(startId) {
    // 1. Local blob URL if uploaded
    if (localAudioBlobUrls[startId]) {
      return { url: localAudioBlobUrls[startId], type: 'ローカルファイル' };
    }
    const fileName = getAudioFileNameForGroup(startId);
    // 2. Custom Base URL
    if (settings.audioBaseUrl) {
      const base = settings.audioBaseUrl.endsWith('/') ? settings.audioBaseUrl : settings.audioBaseUrl + '/';
      return { url: base + fileName, type: '外部URL' };
    }
    // 3. Default relative path (works on GitHub Pages if speech_gaze_audios folder is deployed)
    return { url: `./speech_gaze_audios/${fileName}`, type: '相対パス' };
  }

  function loadAudioForCurrentGroup() {
    const fileName = getAudioFileNameForGroup(currentGroupStartId);
    const audioInfo = getAudioUrlForGroup(currentGroupStartId);
    
    dom.currentAudioName.textContent = fileName;
    dom.audioSourceBadge.textContent = audioInfo.type;

    if (dom.mainAudio.src !== audioInfo.url) {
      const isPlaying = !dom.mainAudio.paused;
      dom.mainAudio.src = audioInfo.url;
      dom.mainAudio.load();
      if (isPlaying) {
        dom.mainAudio.play().catch(() => {});
      }
    }
  }

  function togglePlayPause() {
    if (dom.mainAudio.paused) {
      dom.mainAudio.play().then(() => {
        dom.playIcon.textContent = '⏸';
      }).catch(err => {
        showToast('⚠️ 音声の自動再生がブロックされたか、ファイルが見つかりません');
      });
    } else {
      dom.mainAudio.pause();
      dom.playIcon.textContent = '▶';
    }
  }

  // --- Group & Navigation ---
  function updateGroupFromId(id) {
    const groupStart = Math.floor((id - 1) / 100) * 100 + 1;
    if (groupStart !== currentGroupStartId) {
      currentGroupStartId = groupStart;
      dom.groupSelect.value = groupStart.toString();
      const endId = Math.min(items.length, currentGroupStartId + 99);
      dom.headerGroupLabel.textContent = `Group (${currentGroupStartId}〜${endId})`;
      loadAudioForCurrentGroup();
    }
  }

  function goToId(id) {
    if (id < 1 || id > items.length) return;
    currentId = id;
    updateGroupFromId(currentId);
    saveAnswers();
    updateUI();
  }

  function findNextUnansweredId(fromId) {
    // Search forward
    for (let i = fromId; i <= items.length; i++) {
      if (!answers[i] || !answers[i].status) {
        return i;
      }
    }
    // Wrap around search from 1
    for (let i = 1; i < fromId; i++) {
      if (!answers[i] || !answers[i].status) {
        return i;
      }
    }
    return null; // All answered!
  }

  // --- Judgment & Input ---
  function setJudgment(status) {
    const existing = answers[currentId] || { note: '' };
    answers[currentId] = {
      status: status,
      note: dom.cardNoteInput.value.trim(),
      updated_at: new Date().toISOString()
    };

    triggerVibration();
    saveAnswers();
    updateUI();

    if (status === 'ok') {
      showToast(`✓ #${currentId} を「◯ 問題なし」に設定しました`);
      if (settings.autoAdvance) {
        setTimeout(() => {
          const nextUnanswered = findNextUnansweredId(currentId + 1);
          if (nextUnanswered) {
            goToId(nextUnanswered);
          } else if (currentId < items.length) {
            goToId(currentId + 1);
          } else {
            showToast('🎉 全てのレコードの判定が完了しました！');
          }
        }, 220);
      }
    } else if (status === 'ng') {
      showToast(`× #${currentId} を「× 問題あり」に設定しました`);
      dom.cardNoteInput.focus();
    }
  }

  function clearJudgment() {
    if (answers[currentId]) {
      delete answers[currentId];
      saveAnswers();
      updateUI();
      showToast(`🔄 #${currentId} の判定をリセットしました`);
    }
  }

  function triggerVibration() {
    if (settings.vibrate && 'vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch (e) {}
    }
  }

  // --- UI Renderers ---
  function updateUI() {
    const item = items[currentId - 1];
    if (!item) return;

    // Card Meta
    dom.cardId.textContent = `#${item.id}`;
    const groupEnd = Math.min(items.length, currentGroupStartId + 99);
    dom.currentIndexDisplay.textContent = (item.id - currentGroupStartId + 1);
    dom.groupTotalDisplay.textContent = (groupEnd - currentGroupStartId + 1);

    const startSec = item.start_time.toFixed(1);
    const endSec = item.end_time.toFixed(1);
    const durSec = item.duration.toFixed(1);
    dom.cardTimeBadge.textContent = `⏱ ${formatSeconds(item.start_time)} - ${formatSeconds(item.end_time)} (${durSec}秒)`;

    if (item.dominant_direction) {
      dom.cardDirectionBadge.textContent = `👀 視線: ${item.dominant_direction}`;
      dom.cardDirectionBadge.style.display = 'inline-block';
    } else {
      dom.cardDirectionBadge.style.display = 'none';
    }

    // Speech Text
    dom.cardSpeechText.textContent = item.speech_text || '（テキストなし）';
    dom.cardSourceAudio.textContent = `${item.audio_file || '不明'} (${item.csv_file || ''})`;

    // Judgment status & note
    const ans = answers[currentId] || { status: '', note: '' };
    dom.cardNoteInput.value = ans.note || '';

    dom.btnJudgeOk.classList.toggle('selected', ans.status === 'ok');
    dom.btnJudgeNg.classList.toggle('selected', ans.status === 'ng');

    dom.checkerCard.classList.remove('is-ok', 'is-ng');
    if (ans.status === 'ok') dom.checkerCard.classList.add('is-ok');
    if (ans.status === 'ng') dom.checkerCard.classList.add('is-ng');

    dom.currentCardStatusPill.className = 'nav-status-pill';
    if (ans.status === 'ok') {
      dom.currentCardStatusPill.classList.add('ok');
      dom.currentCardStatusPill.textContent = '◯ 問題なし';
    } else if (ans.status === 'ng') {
      dom.currentCardStatusPill.classList.add('ng');
      dom.currentCardStatusPill.textContent = '× 問題あり';
    } else {
      dom.currentCardStatusPill.textContent = '未回答';
    }

    // Mobile action bar button states
    dom.mobileBtnOk.style.opacity = ans.status === 'ok' ? '1' : '0.85';
    dom.mobileBtnNg.style.opacity = ans.status === 'ng' ? '1' : '0.85';

    // Navigation buttons disabled states
    dom.btnPrevCard.disabled = (currentId <= 1);
    dom.mobileBtnPrev.disabled = (currentId <= 1);
    dom.btnNextCard.disabled = (currentId >= items.length);
    dom.mobileBtnNext.disabled = (currentId >= items.length);

    updateProgressStats();

    if (currentView === 'list') {
      renderListView();
    }
  }

  function updateProgressStats() {
    let ok = 0;
    let ng = 0;
    let withNote = 0;

    for (let id = 1; id <= items.length; id++) {
      const a = answers[id];
      if (a) {
        if (a.status === 'ok') ok++;
        else if (a.status === 'ng') ng++;
        if (a.note && a.note.trim()) withNote++;
      }
    }

    const answered = ok + ng;
    const total = items.length;
    const pending = total - answered;
    const pct = total > 0 ? ((answered / total) * 100).toFixed(1) : 0;

    dom.answeredCount.textContent = answered;
    dom.progressPercent.textContent = `${pct}%`;
    dom.countOk.textContent = ok;
    dom.countNg.textContent = ng;
    dom.countPending.textContent = pending;
    dom.exportBadge.textContent = answered;

    const okPct = (ok / total) * 100;
    const ngPct = (ng / total) * 100;
    dom.progressBarOk.style.width = `${okPct}%`;
    dom.progressBarNg.style.width = `${ngPct}%`;

    // Modal stats
    dom.modalAnsweredCount.textContent = answered;
    dom.modalAnsweredRate.textContent = `${pct}%`;
    dom.modalCountOk.textContent = ok;
    dom.modalCountNg.textContent = ng;
    dom.modalCountPending.textContent = pending;

    // List filter pills count
    dom.listFilterPendingCount.textContent = pending;
    dom.listFilterOkCount.textContent = ok;
    dom.listFilterNgCount.textContent = ng;
    dom.listFilterNoteCount.textContent = withNote;
  }

  function renderListView() {
    dom.listContainer.innerHTML = '';
    const query = listSearchQuery.toLowerCase().trim();

    const filtered = items.filter(item => {
      const ans = answers[item.id] || { status: '', note: '' };
      
      // Filter tab check
      if (listFilter === 'unanswered' && ans.status) return false;
      if (listFilter === 'ok' && ans.status !== 'ok') return false;
      if (listFilter === 'ng' && ans.status !== 'ng') return false;
      if (listFilter === 'note' && (!ans.note || !ans.note.trim())) return false;

      // Search query check
      if (query) {
        const textMatch = (item.speech_text || '').toLowerCase().includes(query);
        const noteMatch = (ans.note || '').toLowerCase().includes(query);
        const idMatch = String(item.id).includes(query);
        return textMatch || noteMatch || idMatch;
      }
      return true;
    });

    if (filtered.length === 0) {
      dom.listContainer.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 0.9rem;">一致するレコードがありません</div>`;
      return;
    }

    // Limit render to 150 items for smooth mobile scrolling
    const displayItems = filtered.slice(0, 150);

    const fragment = document.createDocumentFragment();
    displayItems.forEach(item => {
      const ans = answers[item.id] || { status: '', note: '' };
      const row = document.createElement('div');
      row.className = `list-item-row ${ans.status ? 'is-' + ans.status : ''}`;
      
      let badgeHtml = '<span class="list-status-badge pending">・</span>';
      if (ans.status === 'ok') badgeHtml = '<span class="list-status-badge ok">◯</span>';
      if (ans.status === 'ng') badgeHtml = '<span class="list-status-badge ng">×</span>';

      const notePreview = ans.note ? `<div class="list-note-preview">📝 ${escapeHtml(ans.note)}</div>` : '';

      row.innerHTML = `
        <div class="list-item-info">
          <div class="list-item-top">
            <span class="list-id-badge">#${item.id}</span>
            <span class="list-time">${formatSeconds(item.start_time)} - ${formatSeconds(item.end_time)}</span>
          </div>
          <div class="list-speech-text">${escapeHtml(item.speech_text)}</div>
          ${notePreview}
        </div>
        ${badgeHtml}
      `;

      row.addEventListener('click', () => {
        goToId(item.id);
        switchView('card');
      });

      fragment.appendChild(row);
    });

    dom.listContainer.appendChild(fragment);

    if (filtered.length > 150) {
      const moreHint = document.createElement('div');
      moreHint.style.textAlign = 'center';
      moreHint.style.padding = '12px';
      moreHint.style.color = 'var(--text-muted)';
      moreHint.style.fontSize = '0.78rem';
      moreHint.textContent = `（他 ${filtered.length - 150} 件が省略されています。検索で絞り込んでください）`;
      dom.listContainer.appendChild(moreHint);
    }
  }

  function switchView(viewName) {
    currentView = viewName;
    if (viewName === 'card') {
      dom.cardView.classList.add('active');
      dom.listView.classList.remove('active');
      dom.viewToggleIcon.textContent = '📑';
      dom.mobileActionBar.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
    } else {
      dom.cardView.classList.remove('active');
      dom.listView.classList.add('active');
      dom.viewToggleIcon.textContent = '📇';
      dom.mobileActionBar.style.display = 'none';
      renderListView();
    }
  }

  // --- Export Functions ---
  function exportCsv() {
    // UTF-8 BOM
    let csvContent = '\uFEFF';
    // Header
    csvContent += 'id,audio_file,start_time,end_time,duration,speech_text,dominant_direction,judgment,remarks,updated_at\n';

    items.forEach(item => {
      const ans = answers[item.id] || { status: '', note: '', updated_at: '' };
      let judgmentLabel = '';
      if (ans.status === 'ok') judgmentLabel = '◯';
      if (ans.status === 'ng') judgmentLabel = '×';

      const row = [
        item.id,
        csvQuote(item.audio_file),
        item.start_time,
        item.end_time,
        item.duration,
        csvQuote(item.speech_text),
        csvQuote(item.dominant_direction),
        csvQuote(judgmentLabel),
        csvQuote(ans.note || ''),
        csvQuote(ans.updated_at || '')
      ];
      csvContent += row.join(',') + '\n';
    });

    const timestamp = getFormattedTimestamp();
    const fileName = `speech_gaze_verified_${timestamp}.csv`;
    downloadBlob(csvContent, fileName, 'text/csv;charset=utf-8;');
    showToast(`📥 ${fileName} をダウンロードしました`);
  }

  function exportJson() {
    const exportData = {
      exported_at: new Date().toISOString(),
      total_items: items.length,
      answers: answers
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const timestamp = getFormattedTimestamp();
    const fileName = `speech_gaze_answers_${timestamp}.json`;
    downloadBlob(jsonStr, fileName, 'application/json');
    showToast(`📥 ${fileName} をダウンロードしました`);
  }

  function shareData() {
    const timestamp = getFormattedTimestamp();
    const jsonStr = JSON.stringify({
      exported_at: new Date().toISOString(),
      total_items: items.length,
      answers: answers
    }, null, 2);

    const fileName = `speech_gaze_answers_${timestamp}.json`;

    if (navigator.share) {
      try {
        const file = new File([jsonStr], fileName, { type: 'application/json' });
        navigator.share({
          title: '音声文字起こし検証 回答データ',
          text: `検証結果データ (${Object.keys(answers).length}件回答済み)`,
          files: [file]
        }).then(() => {
          showToast('📤 共有しました');
        }).catch(err => {
          if (err.name !== 'AbortError') {
            copyToClipboard(jsonStr);
          }
        });
      } catch (e) {
        copyToClipboard(jsonStr);
      }
    } else {
      copyToClipboard(jsonStr);
    }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('📋 クリップボードに回答データをコピーしました！');
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('📋 クリップボードにコピーしました！');
  }

  function downloadBlob(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }

  // --- Import Functions ---
  function importFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const text = e.target.result;
      try {
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(text);
          if (data && data.answers) {
            answers = Object.assign(answers, data.answers);
            saveAnswers();
            updateUI();
            showToast(`✅ ${Object.keys(data.answers).length}件の回答をインポートしました！`);
            closeAllModals();
            return;
          }
        } else if (file.name.endsWith('.csv')) {
          // Parse CSV
          const importedCount = parseCsvAnswers(text);
          saveAnswers();
          updateUI();
          showToast(`✅ ${importedCount}件の回答をインポートしました！`);
          closeAllModals();
          return;
        }
        throw new Error('サポートされていないファイル形式です');
      } catch (err) {
        showToast(`❌ インポートに失敗しました: ${err.message}`);
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function parseCsvAnswers(csvText) {
    const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (lines.length < 2) return 0;

    const headers = parseCsvLine(lines[0]);
    const idIdx = headers.indexOf('id');
    let judgmentIdx = headers.indexOf('judgment');
    if (judgmentIdx === -1) judgmentIdx = headers.indexOf('判定');
    let noteIdx = headers.indexOf('remarks');
    if (noteIdx === -1) noteIdx = headers.indexOf('note');
    if (noteIdx === -1) noteIdx = headers.indexOf('備考');

    if (idIdx === -1) throw new Error('CSVに "id" 列が見つかりません');

    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = parseCsvLine(lines[i]);
      const id = parseInt(cols[idIdx], 10);
      if (!id) continue;

      let status = '';
      if (judgmentIdx !== -1) {
        const val = cols[judgmentIdx];
        if (val === '◯' || val === '○' || val.toLowerCase() === 'ok') status = 'ok';
        if (val === '×' || val === 'x' || val.toLowerCase() === 'ng') status = 'ng';
      }

      const note = (noteIdx !== -1 && cols[noteIdx]) ? cols[noteIdx] : '';

      if (status || note) {
        answers[id] = {
          status: status,
          note: note,
          updated_at: new Date().toISOString()
        };
        count++;
      }
    }
    return count;
  }

  function parseCsvLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        result.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur);
    return result;
  }

  // --- Event Listeners ---
  function setupEventListeners() {
    // View Toggle
    dom.viewToggleBtn.addEventListener('click', () => {
      switchView(currentView === 'card' ? 'list' : 'card');
    });

    // Modals open/close
    dom.exportModalOpenBtn.addEventListener('click', () => {
      updateProgressStats();
      dom.exportModal.classList.add('active');
    });
    dom.exportModalCloseBtn.addEventListener('click', () => dom.exportModal.classList.remove('active'));

    dom.audioSourceSelectBtn.addEventListener('click', () => dom.audioSourceModal.classList.add('active'));
    dom.audioSourceModalCloseBtn.addEventListener('click', () => dom.audioSourceModal.classList.remove('active'));

    dom.menuModalOpenBtn.addEventListener('click', () => dom.menuModal.classList.add('active'));
    dom.menuModalCloseBtn.addEventListener('click', () => dom.menuModal.classList.remove('active'));

    // Close on outside click
    [dom.exportModal, dom.audioSourceModal, dom.menuModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    });

    // Group select
    dom.groupSelect.addEventListener('change', (e) => {
      goToId(parseInt(e.target.value, 10));
    });

    dom.btnJumpUnanswered.addEventListener('click', () => {
      const nextId = findNextUnansweredId(currentId);
      if (nextId) {
        goToId(nextId);
        showToast(`⏩ 未回答の #${nextId} へジャンプしました`);
      } else {
        showToast('🎉 全てのレコードが回答済みです！');
      }
    });

    // Judgment buttons (Card View)
    dom.btnJudgeOk.addEventListener('click', () => setJudgment('ok'));
    dom.btnJudgeNg.addEventListener('click', () => setJudgment('ng'));
    dom.btnJudgeClear.addEventListener('click', clearJudgment);

    // Mobile action bar buttons
    dom.mobileBtnOk.addEventListener('click', () => setJudgment('ok'));
    dom.mobileBtnNg.addEventListener('click', () => setJudgment('ng'));
    dom.mobileBtnPrev.addEventListener('click', () => goToId(currentId - 1));
    dom.mobileBtnNext.addEventListener('click', () => goToId(currentId + 1));

    // Card Prev / Next
    dom.btnPrevCard.addEventListener('click', () => goToId(currentId - 1));
    dom.btnNextCard.addEventListener('click', () => goToId(currentId + 1));

    // Note input auto-save
    dom.cardNoteInput.addEventListener('input', () => {
      const ans = answers[currentId] || { status: '' };
      ans.note = dom.cardNoteInput.value;
      ans.updated_at = new Date().toISOString();
      answers[currentId] = ans;
      saveAnswers();
    });

    // Quick Tag buttons
    document.querySelectorAll('.quick-tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-text');
        const cur = dom.cardNoteInput.value.trim();
        dom.cardNoteInput.value = cur ? `${cur}、${text}` : text;
        dom.cardNoteInput.dispatchEvent(new Event('input'));
        triggerVibration();
      });
    });

    // Auto Advance checkbox sync
    dom.autoAdvanceCheck.addEventListener('change', (e) => {
      settings.autoAdvance = e.target.checked;
      dom.menuAutoAdvanceCheck.checked = e.target.checked;
      saveSettings();
    });
    dom.menuAutoAdvanceCheck.addEventListener('change', (e) => {
      settings.autoAdvance = e.target.checked;
      dom.autoAdvanceCheck.checked = e.target.checked;
      saveSettings();
    });

    // Menu settings
    dom.menuVibrateCheck.addEventListener('change', (e) => {
      settings.vibrate = e.target.checked;
      saveSettings();
    });
    dom.menuShortcutsCheck.addEventListener('change', (e) => {
      settings.shortcuts = e.target.checked;
      saveSettings();
    });

    // Audio controls
    dom.btnPlayPause.addEventListener('click', togglePlayPause);
    dom.btnBack5.addEventListener('click', () => {
      dom.mainAudio.currentTime = Math.max(0, dom.mainAudio.currentTime - 5);
    });
    dom.btnForward5.addEventListener('click', () => {
      dom.mainAudio.currentTime = Math.min(dom.mainAudio.duration || 9999, dom.mainAudio.currentTime + 5);
    });

    dom.btnSpeed.addEventListener('click', () => {
      currentSpeedIdx = (currentSpeedIdx + 1) % speeds.length;
      const spd = speeds[currentSpeedIdx];
      dom.mainAudio.playbackRate = spd;
      dom.btnSpeed.textContent = `${spd.toFixed(1)}x`;
    });

    dom.audioPanelToggleBtn.addEventListener('click', () => {
      dom.audioControlsBody.classList.toggle('collapsed');
      dom.audioPanelToggleBtn.textContent = dom.audioControlsBody.classList.contains('collapsed') ? '▼' : '▲';
    });

    dom.mainAudio.addEventListener('timeupdate', () => {
      const cur = dom.mainAudio.currentTime;
      const dur = dom.mainAudio.duration || 0;
      dom.currentTimeLabel.textContent = formatSeconds(cur);
      dom.durationTimeLabel.textContent = formatSeconds(dur);
      if (dur > 0) {
        dom.audioSeekBar.value = (cur / dur) * 100;
      }
    });

    dom.audioSeekBar.addEventListener('input', () => {
      const dur = dom.mainAudio.duration || 0;
      if (dur > 0) {
        dom.mainAudio.currentTime = (dom.audioSeekBar.value / 100) * dur;
      }
    });

    // Sync audio with current ID (estimate relative position in 100-item batch)
    dom.btnSyncAudio.addEventListener('click', () => {
      const idxInGroup = currentId - currentGroupStartId; // 0 to 99
      const dur = dom.mainAudio.duration;
      if (dur && dur > 0) {
        const estimatedTime = (idxInGroup / 100) * dur;
        dom.mainAudio.currentTime = estimatedTime;
        showToast(`📍 ID #${currentId} 付近へシークしました`);
      } else {
        showToast('⚠️ 音声ファイルが読み込まれていません');
      }
    });

    // Audio Source Modal
    dom.btnSetAudioDefault.addEventListener('click', () => {
      settings.audioBaseUrl = '';
      localAudioBlobUrls = {};
      saveSettings();
      loadAudioForCurrentGroup();
      showToast('標準設定（相対パス）に戻しました');
      dom.audioSourceModal.classList.remove('active');
    });

    dom.localAudioFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        localAudioBlobUrls[currentGroupStartId] = url;
        loadAudioForCurrentGroup();
        showToast(`🎵 ${file.name} を読み込みました`);
        dom.audioSourceModal.classList.remove('active');
      }
    });

    dom.btnSaveAudioBaseUrl.addEventListener('click', () => {
      settings.audioBaseUrl = dom.audioBaseUrlInput.value.trim();
      saveSettings();
      loadAudioForCurrentGroup();
      showToast('Base URL を保存しました');
      dom.audioSourceModal.classList.remove('active');
    });

    // Export Buttons
    dom.btnExportCsv.addEventListener('click', exportCsv);
    dom.btnExportJson.addEventListener('click', exportJson);
    dom.btnShareData.addEventListener('click', shareData);
    dom.btnCopyData.addEventListener('click', () => {
      const jsonStr = JSON.stringify({
        exported_at: new Date().toISOString(),
        total_items: items.length,
        answers: answers
      }, null, 2);
      copyToClipboard(jsonStr);
    });

    // Import Trigger
    dom.btnTriggerImport.addEventListener('click', () => dom.importFileInput.click());
    dom.importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        importFile(file);
        e.target.value = '';
      }
    });

    // Reset All Data
    dom.btnResetAllData.addEventListener('click', () => {
      if (confirm('本当にすべての回答データを初期化しますか？この操作は取り消せません。')) {
        answers = {};
        saveAnswers();
        updateUI();
        showToast('🗑 すべての回答データをリセットしました');
        dom.menuModal.classList.remove('active');
      }
    });

    // List View Filters
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        listFilter = pill.getAttribute('data-filter');
        renderListView();
      });
    });

    dom.listSearchInput.addEventListener('input', (e) => {
      listSearchQuery = e.target.value;
      renderListView();
    });

    // Keyboard Shortcuts (PC support)
    window.addEventListener('keydown', (e) => {
      if (!settings.shortcuts) return;
      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'textarea' || tag === 'input') return;

      if (e.key === '1' || e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        setJudgment('ok');
      } else if (e.key === '2' || e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        setJudgment('ng');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToId(currentId + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToId(currentId - 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlayPause();
      }
    });
  }

  // --- Utilities ---
  function closeAllModals() {
    dom.exportModal.classList.remove('active');
    dom.audioSourceModal.classList.remove('active');
    dom.menuModal.classList.remove('active');
  }

  function showToast(msg) {
    dom.toast.textContent = msg;
    dom.toast.classList.add('show');
    clearTimeout(dom.toast._timeout);
    dom.toast._timeout = setTimeout(() => {
      dom.toast.classList.remove('show');
    }, 2500);
  }

  function formatSeconds(sec) {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function getFormattedTimestamp() {
    const d = new Date();
    const YYYY = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${YYYY}${MM}${DD}_${hh}${mm}`;
  }

  function csvQuote(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Start the application
  window.addEventListener('DOMContentLoaded', init);

})();
