// easter-egg.js
// 依赖：全局 supabase 客户端 (window.supabaseClient) 已初始化
// 支持图片弹窗的拖拽移动和双指缩放

(function() {
  // 等待页面加载完成
  function init() {
    if (!window.supabaseClient) {
      console.warn('彩蛋功能：supabaseClient 未就绪，稍后重试');
      setTimeout(init, 500);
      return;
    }
    createUI();
    bindEvents();
  }

  // ---------- 创建 DOM ----------
  function createUI() {
    const body = document.body;

    // 彩蛋按钮
    const trigger = document.createElement('button');
    trigger.id = 'easterEggTrigger';
    trigger.innerHTML = '🥚';
    trigger.title = '彩蛋兑换';
    body.appendChild(trigger);

    // 遮罩
    const mask = document.createElement('div');
    mask.id = 'eggMask';
    body.appendChild(mask);

    // 输入弹窗
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

    // 图片弹窗
    const imgPanel = document.createElement('div');
    imgPanel.id = 'eggImagePanel';
    imgPanel.className = 'egg-dialog';
    imgPanel.innerHTML = `
      <button class="egg-close" id="eggImgClose">✕</button>
      <img id="eggPrizeImg" src="" alt="彩蛋奖励">
    `;
    body.appendChild(imgPanel);
  }

  // ---------- 事件绑定 ----------
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
    let imgTransform = {
      x: 0,
      y: 0,
      scale: 1
    };

    // 重置图片变换到初始状态（居中，比例1）
    function resetImageTransform() {
      imgTransform.x = 0;
      imgTransform.y = 0;
      imgTransform.scale = 1;
      prizeImg.style.transform = `translate(-50%, -50%) scale(1)`;
    }

    // 应用当前变换
    function applyImageTransform() {
      // 限制缩放范围
      const minScale = 0.5;
      const maxScale = 5;
      imgTransform.scale = Math.min(maxScale, Math.max(minScale, imgTransform.scale));

      prizeImg.style.transform = `translate(calc(-50% + ${imgTransform.x}px), calc(-50% + ${imgTransform.y}px)) scale(${imgTransform.scale})`;
    }

    // 图片弹窗交互：拖拽与缩放
    let pointers = new Map(); // 存储当前所有活动指针
    let lastPinchDist = 0;
    let isDragging = false;
    let dragStartTransform = { x: 0, y: 0 };

    function onPointerDown(e) {
      // 如果点击的是关闭按钮，不处理拖拽/缩放
      if (e.target.closest('#eggImgClose')) return;
      e.preventDefault();
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1) {
        // 单指开始拖拽
        isDragging = true;
        dragStartTransform.x = imgTransform.x;
        dragStartTransform.y = imgTransform.y;
        prizeImg.style.transition = 'none'; // 取消过渡效果
      } else if (pointers.size === 2) {
        // 双指开始缩放
        isDragging = false;
        const pts = [...pointers.values()];
        lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        // 记录缩放开始时的状态，用于在缩放过程中实时调整焦点
      }
    }

    function onPointerMove(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      e.preventDefault();

      if (pointers.size === 1 && isDragging) {
        // 单指拖拽
        const pt = pointers.values().next().value;
        const dx = pt.x - (dragStartTransform._originX || 0);
        const dy = pt.y - (dragStartTransform._originY || 0);
        // 我们需要计算相对于拖拽开始时的偏移量，更准确的方式：
        if (!dragStartTransform._originX) {
          // 记录拖拽开始时第一个点的位置
          dragStartTransform._originX = pt.x;
          dragStartTransform._originY = pt.y;
          return;
        }
        const deltaX = pt.x - dragStartTransform._originX;
        const deltaY = pt.y - dragStartTransform._originY;
        imgTransform.x = dragStartTransform.x + deltaX;
        imgTransform.y = dragStartTransform.y + deltaY;
        applyImageTransform();
      } else if (pointers.size === 2) {
        // 双指缩放
        const pts = [...pointers.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (lastPinchDist > 0) {
          const scaleChange = dist / lastPinchDist;
          const newScale = imgTransform.scale * scaleChange;
          // 计算缩放中心（两指中点）
          const centerX = (pts[0].x + pts[1].x) / 2;
          const centerY = (pts[0].y + pts[1].y) / 2;
          // 获取图片在页面中的位置（基于当前 transform）
          const rect = prizeImg.getBoundingClientRect();
          const imgCenterX = rect.left + rect.width / 2;
          const imgCenterY = rect.top + rect.height / 2;
          // 计算相对于图片中心的偏移量
          const offsetX = centerX - imgCenterX;
          const offsetY = centerY - imgCenterY;
          // 新的偏移量：保持缩放中心点不动
          imgTransform.x += offsetX * (1 - scaleChange);
          imgTransform.y += offsetY * (1 - scaleChange);
          imgTransform.scale = newScale;
          applyImageTransform();
        }
        lastPinchDist = dist;
      }
    }

    function onPointerUp(e) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) {
        lastPinchDist = 0;
      }
      if (pointers.size === 0) {
        isDragging = false;
        // 清理拖拽起始点记录
        dragStartTransform._originX = undefined;
        dragStartTransform._originY = undefined;
        prizeImg.style.transition = '';
      }
    }

    // 鼠标滚轮缩放（桌面端）
    function onWheel(e) {
      if (e.target.closest('#eggImgClose')) return;
      e.preventDefault();
      const delta = -Math.sign(e.deltaY) * 0.1; // 每滚一次缩放0.1
      const newScale = imgTransform.scale * (1 + delta);
      // 以鼠标位置为缩放中心
      const rect = prizeImg.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const imgCenterX = rect.left + rect.width / 2;
      const imgCenterY = rect.top + rect.height / 2;
      const offsetX = mouseX - imgCenterX;
      const offsetY = mouseY - imgCenterY;
      imgTransform.x += offsetX * (1 - (1 + delta));
      imgTransform.y += offsetY * (1 - (1 + delta));
      imgTransform.scale = newScale;
      applyImageTransform();
    }

    // 绑定图片弹窗交互事件
    imgPanel.addEventListener('pointerdown', onPointerDown);
    imgPanel.addEventListener('pointermove', onPointerMove);
    imgPanel.addEventListener('pointerup', onPointerUp);
    imgPanel.addEventListener('pointercancel', onPointerUp);
    imgPanel.addEventListener('pointerleave', onPointerUp); // 确保离开时清理
    imgPanel.addEventListener('wheel', onWheel, { passive: false });

    // 重置图片变换当弹窗打开时
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target === imgPanel && imgPanel.classList.contains('open')) {
          resetImageTransform();
        }
      });
    });
    observer.observe(imgPanel, { attributes: true, attributeFilter: ['class'] });

    // 打开输入窗口（支持触摸）
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
    trigger.addEventListener('touchend', (e) => {
      e.preventDefault();
      openPanel();
    });

    // 关闭所有弹窗（同时解锁魔方）
    function closeAll(e) {
      if (e) e.stopPropagation();
      if (window.setEggLock) window.setEggLock(false);
      mask.classList.remove('active');
      panel.classList.remove('open');
      imgPanel.classList.remove('open');
      imgPanel.style.cssText = '';  // 清除内联样式
      eggInput.value = '';
      eggError.textContent = '';
      eggSubmit.disabled = false;
      // 重置图片变换
      resetImageTransform();
      // 清理指针状态
      pointers.clear();
      isDragging = false;
    }

    eggClose.addEventListener('click', closeAll);
    eggClose.addEventListener('touchend', (e) => {
      e.preventDefault();
      closeAll(e);
    });
    mask.addEventListener('click', closeAll);
    mask.addEventListener('touchend', (e) => {
      e.preventDefault();
      closeAll(e);
    });

    // 图片弹窗关闭按钮（单独处理，同时清除内联样式）
    const closeImagePanel = (e) => {
      e.stopPropagation();
      e.preventDefault();
      imgPanel.classList.remove('open');
      imgPanel.style.cssText = '';
      mask.classList.remove('active');
      if (window.setEggLock) window.setEggLock(false);
      resetImageTransform();
      pointers.clear();
      isDragging = false;
    };
    eggImgClose.addEventListener('click', closeImagePanel);
    eggImgClose.addEventListener('touchend', closeImagePanel);

    // 提交验证
    const handleSubmit = async () => {
      const code = eggInput.value.trim();
      if (!code) {
        eggError.textContent = '请输入彩蛋码';
        return;
      }

      eggSubmit.disabled = true;
      eggError.textContent = '验证中…';

      try {
        const { data: imagePath, error } = await window.supabaseClient.rpc(
          'verify_easter_egg',
          { code_text: code }
        );

        if (error) {
          console.error('验证错误:', error);
          eggError.textContent = '网络错误，请重试';
          eggSubmit.disabled = false;
          return;
        }

        if (!imagePath) {
          eggError.textContent = '填写错误喵';
          eggSubmit.disabled = false;
          return;
        }

        const supabaseUrl = 'https://zebyboiepollbowhidui.supabase.co';
        const imageUrl = `${supabaseUrl}/storage/v1/object/public/caise-eggs/${imagePath}`;
        console.log('✅ 验证通过，图片路径:', imagePath);
        console.log('🖼️ 完整图片 URL:', imageUrl);

        // 设置图片弹窗全屏样式
        imgPanel.style.cssText = `
          position: fixed; inset: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.95); z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          transform: scale(1); margin: 0; padding: 0; border-radius: 0;
        `;
        // 先重置图片变换
        resetImageTransform();

        // 加载图片
        try {
          const response = await fetch(imageUrl);
          if (!response.ok) {
            const errText = await response.text();
            console.error('❌ Supabase 错误详情：', response.status, errText);
            throw new Error(`服务器返回 ${response.status}: ${errText}`);
          }
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          prizeImg.src = blobUrl;
          prizeImg.onload = () => {
            URL.revokeObjectURL(blobUrl);
            // 图片加载完成后，可能尺寸改变，重新应用初始居中
            resetImageTransform();
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
    eggSubmit.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleSubmit();
    });

    // 回车键提交
    eggInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        eggSubmit.click();
      }
    });
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
