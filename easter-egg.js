// easter-egg.js
// 依赖：window.supabaseClient
// 每个彩蛋码独立图片与音频，左上角音符按钮控制播放/暂停

(function() {
  const DRAG_SPEED = 1.6;

  // ===== 全局音频控制 =====
  let bgMusic = null;
  let musicPlaying = false;

  function createAudio(url) {
    if (bgMusic) {
      bgMusic.pause();
      bgMusic.currentTime = 0;
      bgMusic = null;
    }
    if (!url) return null;
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0.8;
    audio.addEventListener('play', () => { musicPlaying = true; updateNoteButton(); });
    audio.addEventListener('pause', () => { musicPlaying = false; updateNoteButton(); });
    return audio;
  }

  function stopMusic() {
    if (bgMusic) {
      bgMusic.pause();
      bgMusic.currentTime = 0;
      bgMusic = null;
    }
    musicPlaying = false;
    updateNoteButton();
  }

  // 音符按钮 UI
  const noteBtn = document.createElement('button');
  noteBtn.id = 'eggMusicNote';
  noteBtn.innerHTML = '🎵';
  noteBtn.title = '播放/暂停音乐';
  document.body.appendChild(noteBtn);

  function updateNoteButton() {
    if (musicPlaying) {
      noteBtn.classList.add('spinning');
      noteBtn.classList.remove('paused');
    } else {
      noteBtn.classList.add('paused');
      if (!bgMusic) {
        noteBtn.classList.remove('show', 'spinning', 'paused');
        return;
      }
    }
    noteBtn.classList.add('show');
  }

  function hideNoteButton() {
    noteBtn.classList.remove('show', 'spinning', 'paused');
  }

  noteBtn.addEventListener('click', () => {
    if (!bgMusic) return;
    if (bgMusic.paused) {
      bgMusic.play().catch(e => console.log('恢复播放失败:', e));
    } else {
      bgMusic.pause();
    }
  });
  noteBtn.addEventListener('touchend', (e) => { e.preventDefault(); noteBtn.click(); });

  // ===== 原有 UI 创建 =====
  function init() {
    if (!window.supabaseClient) {
      setTimeout(init, 500);
      return;
    }
    createUI();
    bindEvents();
  }

  function createUI() {
    const body = document.body;

    const trigger = document.createElement('button');
    trigger.id = 'easterEggTrigger';
    trigger.innerHTML = '🥚';
    trigger.title = '彩蛋兑换';
    body.appendChild(trigger);

    const mask = document.createElement('div');
    mask.id = 'eggMask';
    body.appendChild(mask);

    const panel = document.createElement('div');
    panel.id = 'eggPanel';
    panel.className = 'egg-dialog';
    panel.innerHTML = `
      <button class="egg-close" id="eggClose">✕</button>
      <div class="egg-title">填写我们的彩蛋码吧~</div>
      <input id="eggInput" type="text" placeholder="输入兑换码" maxlength="30" autocomplete="off" inputmode="text">
      <button id="eggSubmit">兑换</button>
      <div id="eggError"></div>
    `;
    body.appendChild(panel);

    const imgPanel = document.createElement('div');
    imgPanel.id = 'eggImagePanel';
    imgPanel.className = 'egg-dialog';
    imgPanel.innerHTML = `
      <button class="egg-close" id="eggImgClose">✕</button>
      <img id="eggPrizeImg" src="" alt="彩蛋奖励">
    `;
    body.appendChild(imgPanel);

    const noticePanel = document.createElement('div');
    noticePanel.id = 'eggNoticePanel';
    noticePanel.className = 'egg-dialog';
    noticePanel.innerHTML = `
      <button class="egg-close" id="eggNoticeClose">✕</button>
      <div class="egg-notice-emoji">🎵</div>
      <div class="egg-notice-text">接下来有音乐喵~<br>注意音量~</div>
      <button id="eggNoticeStart" class="egg-notice-btn">开始吧</button>
    `;
    body.appendChild(noticePanel);
  }

  function bindEvents() {
    const trigger = document.getElementById('easterEggTrigger');
    const mask = document.getElementById('eggMask');
    const panel = document.getElementById('eggPanel');
    const imgPanel = document.getElementById('eggImagePanel');
    const noticePanel = document.getElementById('eggNoticePanel');
    const eggClose = document.getElementById('eggClose');
    const eggImgClose = document.getElementById('eggImgClose');
    const eggNoticeClose = document.getElementById('eggNoticeClose');
    const eggInput = document.getElementById('eggInput');
    const eggSubmit = document.getElementById('eggSubmit');
    const eggError = document.getElementById('eggError');
    const prizeImg = document.getElementById('eggPrizeImg');
    const noticeStartBtn = document.getElementById('eggNoticeStart');

    const imgState = { x: 0, y: 0, scale: 0.7 };
    const MIN_SCALE = 0.3;
    const MAX_SCALE = 3;

    function resetImage() {
      imgState.x = 0;
      imgState.y = 0;
      imgState.scale = 0.7;
      applyTransform();
    }

    function constrainPosition() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const naturalW = prizeImg.naturalWidth;
      const naturalH = prizeImg.naturalHeight;
      if (!naturalW || !naturalH) return;

      const dispW = naturalW * imgState.scale;
      const dispH = naturalH * imgState.scale;

      let minX, maxX, minY, maxY;

      if (dispW <= vw) {
        minX = -(vw - dispW) / 2;
        maxX = (vw - dispW) / 2;
      } else {
        minX = -(dispW - vw) / 2;
        maxX = (dispW - vw) / 2;
      }

      if (dispH <= vh) {
        minY = -(vh - dispH) / 2;
        maxY = (vh - dispH) / 2;
      } else {
        minY = -(dispH - vh) / 2;
        maxY = (dispH - vh) / 2;
      }

      imgState.x = Math.min(maxX, Math.max(minX, imgState.x));
      imgState.y = Math.min(maxY, Math.max(minY, imgState.y));
    }

    function applyTransform() {
      imgState.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, imgState.scale));
      prizeImg.style.transform =
        `translate(calc(-50% + ${imgState.x}px), calc(-50% + ${imgState.y}px)) scale(${imgState.scale})`;
    }

    function applyTransformWithConstraint() {
      constrainPosition();
      applyTransform();
    }

    function closeImagePanel() {
      imgPanel.classList.remove('open');
      imgPanel.style.cssText = '';
      mask.classList.remove('active');
      resetImage();
      clearGestureState();
      stopMusic();
      hideNoteButton();
      if (window.setEggLock) window.setEggLock(false);
    }

    function closeNoticePanel() {
      noticePanel.classList.remove('open');
      if (window.setEggLock) window.setEggLock(false);
    }

    function closeAll() {
      closeImagePanel();
      panel.classList.remove('open');
      noticePanel.classList.remove('open');
      eggInput.value = '';
      eggError.textContent = '';
      eggSubmit.disabled = false;
    }

    // ============= 手势处理 =============
    let pointers = new Map();
    let dragStart = null;
    let pinchStart = null;
    let pendingDrag = false;
    let pendingDragOrigin = { x: 0, y: 0, imgX: 0, imgY: 0 };

    function clearGestureState() {
      pointers.clear();
      dragStart = null;
      pinchStart = null;
      pendingDrag = false;
    }

    function getPointerCenter() {
      const pts = [...pointers.values()];
      return {
        x: (pts[0].clientX + pts[1].clientX) / 2,
        y: (pts[0].clientY + pts[1].clientY) / 2
      };
    }

    function onPointerDown(e) {
      if (e.target.closest('#eggImgClose') || e.target.closest('#eggMusicNote')) return;
      e.preventDefault();
      imgPanel.setPointerCapture(e.pointerId);

      pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

      const count = pointers.size;

      if (count === 1) {
        dragStart = {
          x: e.clientX,
          y: e.clientY,
          imgX: imgState.x,
          imgY: imgState.y
        };
        pinchStart = null;
        pendingDrag = false;
      } else if (count === 2) {
        const pts = [...pointers.values()];
        const dist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
        const center = getPointerCenter();

        pinchStart = {
          dist: dist,
          scale: imgState.scale,
          center: center,
          startCx: window.innerWidth / 2 + imgState.x,
          startCy: window.innerHeight / 2 + imgState.y
        };
        dragStart = null;
        pendingDrag = false;
      }
    }

    function onPointerMove(e) {
      if (!imgPanel.classList.contains('open')) return;
      e.preventDefault();

      if (!pointers.has(e.pointerId)) return;
      pointers.get(e.pointerId).clientX = e.clientX;
      pointers.get(e.pointerId).clientY = e.clientY;

      const count = pointers.size;

      if (count === 2 && pinchStart) {
        const pts = [...pointers.values()];
        const dist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
        if (pinchStart.dist === 0) return;

        const scaleChange = dist / pinchStart.dist;
        let newScale = pinchStart.scale * scaleChange;
        newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));

        const center = getPointerCenter();

        const anchorX = (pinchStart.center.x - pinchStart.startCx) / pinchStart.scale;
        const anchorY = (pinchStart.center.y - pinchStart.startCy) / pinchStart.scale;

        const newCx = center.x - newScale * anchorX;
        const newCy = center.y - newScale * anchorY;

        imgState.x = newCx - window.innerWidth / 2;
        imgState.y = newCy - window.innerHeight / 2;
        imgState.scale = newScale;

        applyTransform();
        return;
      }

      if (count === 1) {
        const [pt] = pointers.values();

        if (pendingDrag) {
          const dx = pt.clientX - pendingDragOrigin.x;
          const dy = pt.clientY - pendingDragOrigin.y;
          if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;

          pendingDrag = false;
          dragStart = {
            x: pendingDragOrigin.x,
            y: pendingDragOrigin.y,
            imgX: pendingDragOrigin.imgX,
            imgY: pendingDragOrigin.imgY
          };
        }

        if (dragStart) {
          const deltaX = (pt.clientX - dragStart.x) * DRAG_SPEED;
          const deltaY = (pt.clientY - dragStart.y) * DRAG_SPEED;
          imgState.x = dragStart.imgX + deltaX;
          imgState.y = dragStart.imgY + deltaY;
          applyTransformWithConstraint();
        }
      }
    }

    function onPointerUp(e) {
      pointers.delete(e.pointerId);
      const count = pointers.size;

      if (count === 0) {
        constrainPosition();
        applyTransform();
        clearGestureState();
      } else if (count === 1 && pinchStart) {
        const [pt] = pointers.values();
        pendingDrag = true;
        pendingDragOrigin = {
          x: pt.clientX,
          y: pt.clientY,
          imgX: imgState.x,
          imgY: imgState.y
        };
        pinchStart = null;
        dragStart = null;

        constrainPosition();
        applyTransform();
      }
    }

    function onWheel(e) {
      if (!imgPanel.classList.contains('open')) return;
      if (e.target.closest('#eggImgClose') || e.target.closest('#eggMusicNote')) return;
      e.preventDefault();

      const delta = -Math.sign(e.deltaY) * 0.1;
      let newScale = imgState.scale * (1 + delta);
      const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));

      if (Math.abs(clampedScale - imgState.scale) < 0.0001) return;

      const rect = prizeImg.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const imgCenterX = rect.left + rect.width / 2;
      const imgCenterY = rect.top + rect.height / 2;
      const offsetX = mouseX - imgCenterX;
      const offsetY = mouseY - imgCenterY;

      const realScaleChange = clampedScale / imgState.scale;
      imgState.x += offsetX * (1 - realScaleChange);
      imgState.y += offsetY * (1 - realScaleChange);
      imgState.scale = clampedScale;

      applyTransform();

      clearTimeout(imgPanel._wheelTimeout);
      imgPanel._wheelTimeout = setTimeout(() => {
        constrainPosition();
        applyTransform();
      }, 200);
    }

    imgPanel.addEventListener('pointerdown', onPointerDown);
    imgPanel.addEventListener('pointermove', onPointerMove);
    imgPanel.addEventListener('pointerup', onPointerUp);
    imgPanel.addEventListener('pointercancel', onPointerUp);
    imgPanel.addEventListener('pointerleave', onPointerUp);
    imgPanel.addEventListener('wheel', onWheel, { passive: false });

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.target === imgPanel && imgPanel.classList.contains('open')) {
          resetImage();
          clearGestureState();
        }
      });
    });
    observer.observe(imgPanel, { attributes: true, attributeFilter: ['class'] });

    // ---------- UI 事件 ----------
    const openPanel = () => {
      if (panel.classList.contains('open')) return;
      if (window.setEggLock) window.setEggLock(true);
      eggInput.value = '';
      eggError.textContent = '';
      mask.classList.add('active');
      panel.classList.add('open');
      setTimeout(() => eggInput.focus(), 100);
    };
    trigger.addEventListener('click', openPanel);
    trigger.addEventListener('touchend', (e) => { e.preventDefault(); openPanel(); });

    eggClose.addEventListener('click', closeAll);
    eggClose.addEventListener('touchend', (e) => { e.preventDefault(); closeAll(); });

    mask.addEventListener('click', () => {
      if (noticePanel.classList.contains('open')) {
        closeNoticePanel();
      } else {
        closeAll();
      }
    });
    mask.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (noticePanel.classList.contains('open')) closeNoticePanel();
      else closeAll();
    });

    function onImgClose(e) {
      e.stopPropagation();
      e.preventDefault();
      closeImagePanel();
    }
    eggImgClose.addEventListener('click', onImgClose);
    eggImgClose.addEventListener('touchend', onImgClose);

    eggNoticeClose.addEventListener('click', closeNoticePanel);
    eggNoticeClose.addEventListener('touchend', (e) => { e.preventDefault(); closeNoticePanel(); });

    // ---------- 兑换流程 ----------
    const handleSubmit = async () => {
      const code = eggInput.value.trim();
      if (!code) { eggError.textContent = '请输入彩蛋码'; return; }
      eggSubmit.disabled = true;
      eggError.textContent = '验证中…';

      try {
        const { data, error } = await window.supabaseClient.rpc(
          'verify_easter_egg', { code_text: code }
        );
        console.log('RPC 返回的 data:', JSON.stringify(data));
        console.log('RPC 返回的 error:', error);
        if (error) { eggError.textContent = '网络错误，请重试'; eggSubmit.disabled = false; return; }
        // RPC 返回的是数组，取第一项
        const result = Array.isArray(data) ? data[0] : data;
        if (!result || !result.image_path) {
          eggError.textContent = '填写错误喵';
          eggSubmit.disabled = false;
        return;
        }
        const imagePath = result.image_path;
        const musicPath = result.music_path;

        const supabaseUrl = 'https://zebyboiepollbowhidui.supabase.co';
        const imageUrl = `${supabaseUrl}/storage/v1/object/public/caise-eggs/${imagePath}`;
        const musicUrl = musicPath ? `${supabaseUrl}/storage/v1/object/public/music/${musicPath}` : null;

        panel.classList.remove('open');
        noticePanel.classList.add('open');
        eggSubmit.disabled = false;

        const onStart = async () => {
          noticeStartBtn.removeEventListener('click', onStart);
          noticePanel.classList.remove('open');

          imgPanel.style.cssText = `
            position: fixed; inset: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.95); z-index: 9999;
            display: flex; align-items: center; justify-content: center;
            transform: scale(1); margin: 0; padding: 0; border-radius: 0;
          `;
          resetImage();

          try {
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error(`服务器返回 ${response.status}`);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            prizeImg.src = blobUrl;
            prizeImg.onload = () => {
              URL.revokeObjectURL(blobUrl);
              resetImage();
            };
          } catch (fetchErr) {
            console.error('图片 fetch 失败:', fetchErr);
            eggError.textContent = '图片加载异常，请稍后重试';
            mask.classList.remove('active');
            if (window.setEggLock) window.setEggLock(false);
            return;
          }

          imgPanel.classList.add('open');

          if (musicUrl) {
            bgMusic = createAudio(musicUrl);
            if (bgMusic) {
              bgMusic.play().then(() => {
                musicPlaying = true;
                updateNoteButton();
              }).catch(e => console.log('自动播放被阻止:', e));
            }
          } else {
            hideNoteButton();
          }
        };

        noticeStartBtn.addEventListener('click', onStart);
        noticeStartBtn.addEventListener('touchend', (e) => {
          e.preventDefault();
          onStart();
        });

      } catch (err) {
        console.error('未知错误:', err);
        eggError.textContent = '出了点问题，请刷新';
        eggSubmit.disabled = false;
      }
    };

    eggSubmit.addEventListener('click', handleSubmit);
    eggSubmit.addEventListener('touchend', (e) => { e.preventDefault(); handleSubmit(); });

    eggInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') eggSubmit.click();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
