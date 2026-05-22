// easter-egg.js
// 依赖：window.supabaseClient
// 移动端手势：单指拖拽，双指缩放，简单可靠

(function() {
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
  }

  function bindEvents() {
    const trigger = document.getElementById('easterEggTrigger');
    const mask = document.getElementById('eggMask');
    const panel = document.getElementById('eggPanel');
    const imgPanel = document.getElementById('eggImagePanel');
    const eggClose = document.getElementById('eggClose');
    const eggImgClose = document.getElementById('eggImgClose');
    const eggInput = document.getElementById('eggInput');
    const eggSubmit = document.getElementById('eggSubmit');
    const eggError = document.getElementById('eggError');
    const prizeImg = document.getElementById('eggPrizeImg');

    // 图片变换状态
    const imgState = { x: 0, y: 0, scale: 1 };

    function resetImage() {
      imgState.x = 0;
      imgState.y = 0;
      imgState.scale = 1;
      prizeImg.style.transform = 'translate(-50%, -50%) scale(1)';
    }

    function applyTransform() {
      const min = 0.5, max = 5;
      imgState.scale = Math.min(max, Math.max(min, imgState.scale));
      prizeImg.style.transform =
        `translate(calc(-50% + ${imgState.x}px), calc(-50% + ${imgState.y}px)) scale(${imgState.scale})`;
    }

    function closeImagePanel() {
      imgPanel.classList.remove('open');
      imgPanel.style.cssText = '';
      mask.classList.remove('active');
      resetImage();
      clearTouches();
      if (window.setEggLock) window.setEggLock(false);
    }

    function closeAll() {
      closeImagePanel();
      panel.classList.remove('open');
      eggInput.value = '';
      eggError.textContent = '';
      eggSubmit.disabled = false;
    }

    // ============= 触摸手势核心 =============
    let activeTouches = new Map();       // identifier -> {x, y}
    let dragBase = null;                // 单指拖拽基准 {x, y, startX, startY}
    let pinchStart = null;             // 双指起始数据 {dist, scale, x, y, center}

    function clearTouches() {
      activeTouches.clear();
      dragBase = null;
      pinchStart = null;
    }

    function getTouchCenter() {
      const pts = [...activeTouches.values()];
      return {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2
      };
    }

    function handleTouchStart(e) {
      if (e.target.closest('#eggImgClose')) return;
      e.preventDefault();

      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
      }

      const count = activeTouches.size;

      if (count === 1) {
        // 开始单指拖拽（无论之前状态如何，直接重置基准）
        const [first] = activeTouches.values();
        dragBase = {
          x: first.x,
          y: first.y,
          startX: imgState.x,
          startY: imgState.y
        };
        pinchStart = null;
      } else if (count === 2) {
        // 开始双指缩放
        const pts = [...activeTouches.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        pinchStart = {
          dist: dist,
          scale: imgState.scale,
          x: imgState.x,
          y: imgState.y,
          center: getTouchCenter()
        };
        dragBase = null; // 停止可能存在的拖拽
      }
    }

    function handleTouchMove(e) {
      if (!imgPanel.classList.contains('open')) return;
      if (e.target.closest('#eggImgClose')) return;
      e.preventDefault();

      // 更新触摸点位置
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (activeTouches.has(t.identifier)) {
          activeTouches.get(t.identifier).x = t.clientX;
          activeTouches.get(t.identifier).y = t.clientY;
        }
      }

      const count = activeTouches.size;

      if (count === 1 && dragBase) {
        // 单指拖拽
        const [pt] = activeTouches.values();
        const deltaX = pt.x - dragBase.x;
        const deltaY = pt.y - dragBase.y;
        imgState.x = dragBase.startX + deltaX;
        imgState.y = dragBase.startY + deltaY;
        applyTransform();
      } else if (count === 2 && pinchStart) {
        // 双指缩放
        const pts = [...activeTouches.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (pinchStart.dist === 0) return;
        const scaleChange = dist / pinchStart.dist;
        const newScale = pinchStart.scale * scaleChange;
        const center = getTouchCenter();

        const rect = prizeImg.getBoundingClientRect();
        const imgCenterX = rect.left + rect.width / 2;
        const imgCenterY = rect.top + rect.height / 2;
        const offsetX = center.x - imgCenterX;
        const offsetY = center.y - imgCenterY;

        imgState.x = pinchStart.x + offsetX * (1 - scaleChange);
        imgState.y = pinchStart.y + offsetY * (1 - scaleChange);
        imgState.scale = newScale;
        applyTransform();
      }
    }

    function handleTouchEnd(e) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        activeTouches.delete(e.changedTouches[i].identifier);
      }

      const count = activeTouches.size;

      if (count === 0) {
        clearTouches();
      } else if (count === 1) {
        // 从双指变为单指：将剩余的单指作为新的拖拽起点，无缝衔接拖拽
        if (pinchStart) {
          const [pt] = activeTouches.values();
          dragBase = {
            x: pt.x,
            y: pt.y,
            startX: imgState.x,
            startY: imgState.y
          };
          pinchStart = null;
        }
        // 如果之前就是单指拖拽，保持 dragBase 不变（已经在 move 中更新）
      } else if (count === 2) {
        // 理论上不会进入，但保留
      }
    }

    // 桌面端滚轮缩放
    function onWheel(e) {
      if (!imgPanel.classList.contains('open')) return;
      if (e.target.closest('#eggImgClose')) return;
      e.preventDefault();
      const delta = -Math.sign(e.deltaY) * 0.1;
      const newScale = imgState.scale * (1 + delta);
      const rect = prizeImg.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const imgCenterX = rect.left + rect.width / 2;
      const imgCenterY = rect.top + rect.height / 2;
      const offsetX = mouseX - imgCenterX;
      const offsetY = mouseY - imgCenterY;
      imgState.x += offsetX * (1 - (1 + delta));
      imgState.y += offsetY * (1 - (1 + delta));
      imgState.scale = newScale;
      applyTransform();
    }

    // 绑定触摸事件
    imgPanel.addEventListener('touchstart', handleTouchStart, { passive: false });
    imgPanel.addEventListener('touchmove', handleTouchMove, { passive: false });
    imgPanel.addEventListener('touchend', handleTouchEnd);
    imgPanel.addEventListener('touchcancel', handleTouchEnd);
    imgPanel.addEventListener('wheel', onWheel, { passive: false });

    // 打开图片弹窗时重置状态
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.target === imgPanel && imgPanel.classList.contains('open')) {
          resetImage();
          clearTouches();
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

    mask.addEventListener('click', closeAll);
    mask.addEventListener('touchend', (e) => { e.preventDefault(); closeAll(); });

    function onImgClose(e) {
      e.stopPropagation();
      e.preventDefault();
      closeImagePanel();
    }
    eggImgClose.addEventListener('click', onImgClose);
    eggImgClose.addEventListener('touchend', onImgClose);

    // ---------- 兑换 ----------
    const handleSubmit = async () => {
      const code = eggInput.value.trim();
      if (!code) { eggError.textContent = '请输入彩蛋码'; return; }
      eggSubmit.disabled = true;
      eggError.textContent = '验证中…';

      try {
        const { data: imagePath, error } = await window.supabaseClient.rpc(
          'verify_easter_egg', { code_text: code }
        );
        if (error) { eggError.textContent = '网络错误，请重试'; eggSubmit.disabled = false; return; }
        if (!imagePath) { eggError.textContent = '填写错误喵'; eggSubmit.disabled = false; return; }

        const supabaseUrl = 'https://zebyboiepollbowhidui.supabase.co';
        const imageUrl = `${supabaseUrl}/storage/v1/object/public/caise-eggs/${imagePath}`;

        imgPanel.style.cssText = `
          position: fixed; inset: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.95); z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          transform: scale(1); margin: 0; padding: 0; border-radius: 0;
        `;
        resetImage();

        try {
          const response = await fetch(imageUrl);
          if (!response.ok) {
            const errText = await response.text();
            console.error('❌ Supabase 错误详情：', response.status, errText);
            throw new Error(`服务器返回 ${response.status}`);
          }
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
          eggSubmit.disabled = false;
          return;
        }

        panel.classList.remove('open');
        imgPanel.classList.add('open');
        eggSubmit.disabled = false;
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
