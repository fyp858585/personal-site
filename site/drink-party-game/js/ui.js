// ui.js -- 视图切换、按钮接线、题库管理页、结果展示、初始化
window.DPG = window.DPG || {};
DPG.ui = (function () {
  'use strict';

  var tasks = [];
  var toastTimer;
  var resultTimer;
  var revealTimer;
  var RESULT_DURATION = 4000;   // 选定惩罚后结果展示时间（毫秒），几秒后自动消失
  var REVEAL_DELAY = 1500;      // 中签者高亮单独保持的时间，之后再弹出惩罚列表

  function init() {
    tasks = DPG.store.load();
    DPG.game.init(document.getElementById('play-area'));
    bind();
    renderTasks();
    setCount(0);
    updateMainButton();
  }

  // 统一的点击绑定：手机多点触控下 click 常不触发，改用 touchstart（触控开始事件）；
  // preventDefault 抑制随后合成的 click，靠 touched 标志去重；桌面无 touch 时回退到 click。
  function bindTap(el, handler) {
    var touched = false;
    el.addEventListener('touchstart', function (e) {
      e.preventDefault();
      e.stopPropagation();
      touched = true;
      handler();
    }, { passive: false });
    el.addEventListener('click', function () {
      if (touched) { touched = false; return; }
      handler();
    });
  }

  function bind() {
    bindTap(document.getElementById('start-btn'), onMainButton);
    bindTap(document.getElementById('tasks-btn'), openTasksPage);
    bindTap(document.getElementById('tasks-close'), closeTasksPage);
    bindTap(document.getElementById('task-add-btn'), onAddTask);
    bindTap(document.getElementById('clear-btn'), onClear);
    bindTap(document.getElementById('export-btn'), onExport);
    bindTap(document.getElementById('reset-btn'), onReset);
    bindTap(document.getElementById('result-banner'), onAgain);   // 点横幅也可立即继续
    bindTap(document.getElementById('picker-random'), onPickRandom);

    document.getElementById('task-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') onAddTask();
    });
    document.getElementById('import-btn').addEventListener('change', onImport);

    var tpls = document.querySelectorAll('.tpl-btn');
    for (var i = 0; i < tpls.length; i++) {
      bindTap(tpls[i], (function (key) {
        return function () { onLoadTemplate(key); };
      })(tpls[i].dataset.tpl));
    }
  }

  function setCount(n) {
    document.getElementById('counter').textContent = n + ' 人按住';
    var hint = document.getElementById('hint');
    if (n > 0) hint.classList.add('fade');
    else hint.classList.remove('fade');
  }

  // 主按钮随状态切换文案：空闲=开始抽签，结果=再来一局，动画/揭晓/选择中置灰
  function updateMainButton() {
    var btn = document.getElementById('start-btn');
    var phase = DPG.game.getPhase();
    btn.textContent = (phase === 'result') ? '再来一局' : '开始抽签';
    var busy = phase === 'animating' || phase === 'reveal' || phase === 'choosing';
    btn.classList.toggle('busy', busy);
  }

  function onMainButton() {
    if (DPG.game.getPhase() === 'result') { onAgain(); return; }
    onStart();
  }

  function onStart() {
    if (DPG.game.getPhase() !== 'idle') return;
    if (DPG.game.count() < 2) { toast('至少需要 2 人按住屏幕'); return; }
    DPG.game.draw().then(function (winner) {
      if (winner) revealWinner();
      else updateMainButton();
    });
    updateMainButton();   // 进入 animating，按钮置灰
  }

  // 中签揭晓：先让中奖圆点高亮单独保持一段时间，给足仪式感，再弹惩罚列表
  function revealWinner() {
    DPG.game.setPhase('reveal');
    updateMainButton();
    clearTimeout(revealTimer);
    revealTimer = setTimeout(showTaskPicker, REVEAL_DELAY);
  }

  // 弹出惩罚列表，让中签者自己挑一个（或随机）
  function showTaskPicker() {
    if (tasks.length === 0) {            // 题库为空：跳过选择，直接提示
      showPickedResult(null);
      return;
    }
    DPG.game.setPhase('choosing');
    renderPicker();
    document.getElementById('task-picker').classList.remove('hidden');
    updateMainButton();
  }

  function renderPicker() {
    var list = document.getElementById('picker-list');
    list.innerHTML = '';
    tasks.forEach(function (text) {
      var item = document.createElement('button');
      item.className = 'picker-item';
      item.textContent = text;
      bindTap(item, function () { onPickTask(text); });
      list.appendChild(item);
    });
  }

  function onPickTask(task) {
    DPG.game.buzz(30);                   // 选中惩罚时短促震动
    document.getElementById('task-picker').classList.add('hidden');
    showPickedResult(task);
  }

  function onPickRandom() {
    if (tasks.length === 0) return;
    onPickTask(DPG.store.random(tasks));
  }

  function showPickedResult(task) {
    DPG.game.setPhase('result');
    document.getElementById('result-task').textContent =
      task || '（题库为空，去「题库」添加惩罚吧）';
    document.getElementById('result-banner').classList.remove('hidden');
    updateMainButton();
    clearTimeout(resultTimer);
    resultTimer = setTimeout(onAgain, RESULT_DURATION);   // 几秒后自动消失
  }

  function onAgain() {
    clearTimeout(resultTimer);
    clearTimeout(revealTimer);
    document.getElementById('result-banner').classList.add('hidden');
    document.getElementById('task-picker').classList.add('hidden');
    DPG.game.reset();      // 清除所有圆点与中奖高亮，回到 idle
    updateMainButton();
  }

  // ===== 题库管理页 =====
  function openTasksPage() {
    renderTasks();
    document.getElementById('tasks-page').classList.remove('hidden');
  }
  function closeTasksPage() {
    document.getElementById('tasks-page').classList.add('hidden');
  }

  function onAddTask() {
    var input = document.getElementById('task-input');
    var v = input.value.trim();
    if (!v) { toast('请输入内容'); return; }
    tasks.push(v);
    DPG.store.save(tasks);
    input.value = '';
    renderTasks();
    input.focus();
  }

  function renderTasks() {
    var list = document.getElementById('task-list');
    list.innerHTML = '';
    if (tasks.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'empty-hint';
      empty.textContent = '题库为空，请添加任务或加载下方模板';
      list.appendChild(empty);
      return;
    }
    tasks.forEach(function (text, i) {
      var item = document.createElement('div');
      item.className = 'task-item';

      var input = document.createElement('input');
      input.className = 'task-text';
      input.type = 'text';
      input.value = text;
      input.maxLength = 40;
      input.addEventListener('change', function () {
        var v = input.value.trim();
        if (v) tasks[i] = v;
        else input.value = tasks[i];
        DPG.store.save(tasks);
      });

      var del = document.createElement('button');
      del.className = 'task-del';
      del.textContent = '✕';
      bindTap(del, function () {
        tasks.splice(i, 1);
        DPG.store.save(tasks);
        renderTasks();
      });

      item.appendChild(input);
      item.appendChild(del);
      list.appendChild(item);
    });
  }

  function onLoadTemplate(key) {
    var tpl = DPG.store.TEMPLATES[key];
    if (!tpl) return;
    tasks = tasks.concat(tpl.tasks.slice());
    DPG.store.save(tasks);
    renderTasks();
    toast('已追加「' + tpl.name + '」' + tpl.tasks.length + ' 条');
  }

  function onClear() {
    if (tasks.length === 0) { toast('题库已是空的'); return; }
    if (!confirm('确定清空所有任务？')) return;
    tasks = [];
    DPG.store.save(tasks);
    renderTasks();
    toast('已清空');
  }

  function onReset() {
    if (!confirm('恢复为默认题库（经典罚酒）？当前题库将被替换')) return;
    tasks = DPG.store.TEMPLATES.classic.tasks.slice();
    DPG.store.save(tasks);
    renderTasks();
    toast('已恢复默认');
  }

  // 导出：下载一个 .json 文件，方便分享/备份到微信或手机
  function onExport() {
    var data = JSON.stringify(tasks, null, 2);
    var blob = new Blob([data], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'drink-party-tasks.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('已导出题库文件');
  }

  // 导入：从 .json 文件恢复题库（纯前端跨设备迁移的唯一办法）
  function onImport(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var arr = JSON.parse(reader.result);
        if (!Array.isArray(arr)) throw new Error('bad');
        tasks = arr
          .filter(function (s) { return typeof s === 'string' && s.trim(); })
          .map(function (s) { return s.trim(); });
        DPG.store.save(tasks);
        renderTasks();
        toast('已导入 ' + tasks.length + ' 条');
      } catch (err) {
        toast('文件格式不对，应为 JSON 字符串数组');
      }
    };
    reader.onerror = function () { toast('读取文件失败'); };
    reader.readAsText(file);
    e.target.value = '';   // 重置，便于重复导入同一文件
  }

  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add('hidden'); }, 2000);
  }

  return { init: init, setCount: setCount };
})();

document.addEventListener('DOMContentLoaded', function () { DPG.ui.init(); });
