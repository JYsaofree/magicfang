// easter-egg.js
// 依赖：window.supabaseClient
// 使用 pointer 事件统一桌面和移动端，支持拖拽、缩放

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
      clearGestureState();
      if (window.setEggLock) window.setEggLock(false);
    }

    function closeAll() {
      closeImagePanel();
      panel.classList.remove('open');
      eggInput.value = '';
      eggError.textContent = '';
      eggSubmit.disabled = false;
    }

    // ============= Pointer 事件手势处理 =============
    let pointers = new Map();       // pointerId -> {clientX, clientY}
    let dragStart = null;          // 拖拽起始 {x, y, imgX, imgY}
    let pinchStart = null;         // 缩放起始 {dist, scale, x, y, center}

    function clearGestureState() {
      pointers.clear();
      dragStart = null;
      pinchStart = null;
    }

    function getPointerCenter() {
      const pts = [...pointers.values()];
      return {
        x: (pts[0].clientX + pts[1].clientX) / 2,
        y: (pts[0].clientY + pts[1].clientY) / 2
      };
    }

    function onPointerDown(e) {
      if (e.target.closest('#eggImgClose')) return;
      e.preventDefault();
      imgPanel.setPointerCapture(e.pointerId);

      pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

      const count = pointers.size;

      if (count === 1) {
        // 开始拖拽（鼠标或单指）
        dragStart = {
          x: e.clientX,
          y: e.clientY,
          imgX: imgState.x,
          imgY: imgState.y
        };
        pinchStart = null;
      } else if (count === 2) {
        // 开始双指缩放
        const pts = [...pointers.values()];
        const dist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
        pinchStart = {
          dist: dist,
          scale: imgState.scale,
          x: imgState.x,
          y: imgState.y,
          center: getPointerCenter()
        };
        dragStart = null;
      }
    }

    function onPointerMove(e) {
      if (!imgPanel.classList.contains('open')) return;
      e.preventDefault();

      if (!pointers.has(e.pointerId)) return;
      pointers.get(e.pointerId).clientX = e.clientX;
      pointers.get(e.pointerId).clientY = e.clientY;

      const count = pointers.size;

      if (count === 1 && dragStart) {
        // 拖拽中
        const [pt] = pointers.values();
        const deltaX = pt.clientX - dragStart.x;
        const deltaY = pt.clientY - dragStart.y;
        imgState.x = dragStart.imgX + deltaX;
        imgState.y = dragStart.imgY + deltaY;
        applyTransform();
      } else if (count === 2 && pinchStart) {
        // 缩放中
        const pts = [...pointers.values()];
        const dist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
        if (pinchStart.dist === 0) return;
        const scaleChange = dist / pinchStart.dist;
        const newScale = pinchStart.scale * scaleChange;
        const center = getPointerCenter();

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

    function onPointerUp(e) {
      pointers.delete(e.pointerId);
      const count = pointers.size;

      if (count === 0) {
        clearGestureState();
      } else if (count === 1 && pinchStart) {
        // 从双指变为单指：将剩余指针作为新的拖拽起点
        const [pt] = pointers.values();
        dragStart = {
          x: pt.clientX,
          y: pt.clientY,
          imgX: imgState.x,
          imgY: imgState.y
        };
        pinchStart = null;
      }
      // 如果 count === 1 且之前就是拖拽，继续保持 dragStart（已更新坐标）
    }

    // 滚轮缩放（桌面端）
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

    // 绑定 pointer 事件
    imgPanel.addEventListener('pointerdown', onPointerDown);
    imgPanel.addEventListener('pointermove', onPointerMove);
    imgPanel.addEventListener('pointerup', onPointerUp);
    imgPanel.addEventListener('pointercancel', onPointerUp);
    imgPanel.addEventListener('pointerleave', onPointerUp); // 确保离开时清理
    imgPanel.addEventListener('wheel', onWheel, { passive: false });

    // 打开图片弹窗时重置状态
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
