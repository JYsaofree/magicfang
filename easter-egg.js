// easter-egg.js
// 依赖：全局 supabase 客户端 (window.supabaseClient) 已初始化
// 移动端使用原生 touch 事件，支持拖拽、双指缩放，关闭按钮正常

(function() {
  function init() {
    if (!window.supabaseClient) {
      console.warn('彩蛋功能：supabaseClient 未就绪，稍后重试');
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

    // 关闭图片弹窗时重置
    function closeImagePanel() {
      imgPanel.classList.remove('open');
      imgPanel.style.cssText = '';
      mask.classList.remove('active');
      resetImage();
      if (window.setEggLock) window.setEggLock(false);
    }

    // 关闭所有弹窗
    function closeAll() {
      closeImagePanel();
      panel.classList.remove('open');
      eggInput.value = '';
      eggError.textContent = '';
      eggSubmit.disabled = false;
    }

    // ============= 触摸事件接管移动端（支持拖拽和缩放） =============
    let touchCache = new Map();       // 存储当前触摸点
    let dragStart = { x: 0, y: 0 };
    let lastPinchDist = 0;

    function onTouchStart(e) {
      // 如果触摸的是关闭按钮，让按钮自己处理，这里不干预
      if (e.target.closest('#eggImgClose')) return;

      e.preventDefault();
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        touchCache.set(t.identifier, { x: t.clientX, y: t.clientY });
      }

      if (touchCache.size === 1) {
        // 单指拖拽：记录起始偏移
        dragStart.x = imgState.x;
        dragStart.y = imgState.y;
      } else if (touchCache.size === 2) {
        const pts = [...touchCache.values()];
        lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        // 记录双指中点，后续缩放基于此点
        const cx = (pts[0].x + pts[1].x) / 2;
        const cy = (pts[0].y + pts[1].y) / 2;
        touchCache.set('pinchCenter', { x: cx, y: cy });
        // 记录缩放起始值
        touchCache.set('pinchStartScale', imgState.scale);
        touchCache.set('pinchStartX', imgState.x);
        touchCache.set('pinchStartY', imgState.y);
      }
    }

    function onTouchMove(e) {
      if (!imgPanel.classList.contains('open')) return;
      e.preventDefault();

      // 更新触摸点
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (touchCache.has(t.identifier)) {
          touchCache.get(t.identifier).x = t.clientX;
          touchCache.get(t.identifier).y = t.clientY;
        }
      }

      if (touchCache.size === 1) {
        // 单指拖拽
        const [pt] = touchCache.values();
        // 需要一个基准点，首次移动时记录
        if (!touchCache.has('dragBase')) {
          touchCache.set('dragBase', { x: pt.x, y: pt.y });
          return;
        }
        const base = touchCache.get('dragBase');
        const deltaX = pt.x - base.x;
        const deltaY = pt.y - base.y;
        imgState.x = dragStart.x + deltaX;
        imgState.y = dragStart.y + deltaY;
        applyTransform();
      } else if (touchCache.size === 2) {
        // 双指缩放
        const pts = [...touchCache.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (lastPinchDist > 0) {
          const scaleChange = dist / lastPinchDist;
          const newScale = imgState.scale * scaleChange;
          // 获取缩放中心（当前两指中点）
          const cx = (pts[0].x + pts[1].x) / 2;
          const cy = (pts[0].y + pts[1].y) / 2;
          // 获取图片在页面中的位置（基于当前 transform）
          const rect = prizeImg.getBoundingClientRect();
          const imgCenterX = rect.left + rect.width / 2;
          const imgCenterY = rect.top + rect.height / 2;
          // 计算鼠标/触摸点相对于图片中心的偏移
          const offsetX = cx - imgCenterX;
          const offsetY = cy - imgCenterY;
          // 调整平移使缩放中心保持不动
          imgState.x += offsetX * (1 - scaleChange);
          imgState.y += offsetY * (1 - scaleChange);
          imgState.scale = newScale;
          applyTransform();
        }
        lastPinchDist = dist;
      }
    }

    function onTouchEnd(e) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        touchCache.delete(e.changedTouches[i].identifier);
      }
      if (touchCache.size < 2) {
        lastPinchDist = 0;
        touchCache.delete('pinchCenter');
        touchCache.delete('pinchStartScale');
        touchCache.delete('pinchStartX');
        touchCache.delete('pinchStartY');
      }
      if (touchCache.size === 0) {
        touchCache.delete('dragBase');
      }
    }

    // 桌面端鼠标滚轮缩放
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

    // 绑定触摸事件到图片弹窗
    imgPanel.addEventListener('touchstart', onTouchStart, { passive: false });
    imgPanel.addEventListener('touchmove', onTouchMove, { passive: false });
    imgPanel.addEventListener('touchend', onTouchEnd);
    imgPanel.addEventListener('touchcancel', onTouchEnd);
    // 桌面端滚轮
    imgPanel.addEventListener('wheel', onWheel, { passive: false });

    // 打开图片弹窗时重置变换
    function openImagePanel() {
      resetImage();
      // 如果之前有触摸缓存，清空
      touchCache.clear();
      lastPinchDist = 0;
    }

    // 监听 open 类添加
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.target === imgPanel && imgPanel.classList.contains('open')) {
          openImagePanel();
        }
      });
    });
    observer.observe(imgPanel, { attributes: true, attributeFilter: ['class'] });

    // ---------- 按钮事件 ----------
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

    // 图片关闭按钮专用监听（同时阻止冒泡）
    function onImgClose(e) {
      e.stopPropagation();
      e.preventDefault();
      closeImagePanel();
    }
    eggImgClose.addEventListener('click', onImgClose);
    eggImgClose.addEventListener('touchend', onImgClose);

    // ---------- 兑换逻辑 ----------
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
        console.log('✅ 验证通过，图片路径:', imagePath);
        console.log('🖼️ 完整图片 URL:', imageUrl);

        // 设置全屏样式
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
            resetImage(); // 再次确保居中
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
