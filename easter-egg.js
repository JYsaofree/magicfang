// easter-egg.js
// 依赖：全局 supabase 客户端 (window.supabase) 已初始化

(function() {
  // 等待页面加载完成
  function init() {
    // 检查 supabase 是否可用
    if (!window.supabase) {
      console.warn('彩蛋功能：supabase 未就绪，稍后重试');
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
      <input id="eggInput" type="text" placeholder="输入兑换码" maxlength="30" autocomplete="off">
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

    // 打开输入窗口
    trigger.addEventListener('click', () => {
      // 防止和魔方操作冲突
      if (panel.classList.contains('open')) return;
      // 锁定魔方操作
      if (window.setEggLock) window.setEggLock(true);
      eggInput.value = '';
      eggError.textContent = '';
      mask.classList.add('active');
      panel.classList.add('open');
      setTimeout(() => eggInput.focus(), 100);
    });

    // 关闭所有弹窗
    function closeAll() {
      // 解锁魔方操作
      if (window.setEggLock) window.setEggLock(false);
      mask.classList.remove('active');
      panel.classList.remove('open');
      imgPanel.classList.remove('open');
      eggInput.value = '';
      eggError.textContent = '';
      eggSubmit.disabled = false;
    }

    eggClose.addEventListener('click', closeAll);
    mask.addEventListener('click', closeAll);
    eggImgClose.addEventListener('click', () => {
      imgPanel.classList.remove('open');
      mask.classList.remove('active');
      // 解锁魔方
      if (window.setEggLock) window.setEggLock(false);
    });

    // 提交验证
    eggSubmit.addEventListener('click', async () => {
      const code = eggInput.value.trim();
      if (!code) {
        eggError.textContent = '请输入彩蛋码';
        return;
      }

      eggSubmit.disabled = true;
      eggError.textContent = '验证中…';

        try {
            const { data: imagePath, error } = await window.supabase.rpc(
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

            // 直接使用公开链接（Storage 桶已设为 public）
            const supabaseUrl = 'https://zebyboiepollbowhidui.supabase.co';
            const imageUrl = `${supabaseUrl}/storage/v1/object/public/easter-eggs/${imagePath}`;
            prizeImg.src = imageUrl;
            panel.classList.remove('open');
            imgPanel.classList.add('open');
            eggSubmit.disabled = false;
        } catch (err) {
            console.error('未知错误:', err);
            eggError.textContent = '出了点问题，请刷新';
            eggSubmit.disabled = false;
        }
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
