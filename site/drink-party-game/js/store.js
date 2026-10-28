// store.js —— 惩罚题库的本地持久化与模板
// 使用 localStorage（浏览器自带的本地存储）：数据存在当前设备的浏览器里，
// 关浏览器不丢，但清缓存/换设备会丢。纯前端、无需后端。
window.DPG = window.DPG || {};
DPG.store = (function () {
  'use strict';

  const KEY = 'dpg.tasks';

  // 内置 4 套模板，用户可一键追加后再自行增删
  const TEMPLATES = {
    classic: { name: '经典罚酒', tasks: [
      '罚一口', '罚一杯', '自罚三杯', '指定左边的人代喝',
      '和右边的人碰杯干掉', '喝到下个人中奖为止', '自选一位陪喝'
    ]},
    truth: { name: '真心话', tasks: [
      '最近一次哭是因为什么', '最糗的一件事', '暗恋过谁',
      '初恋叫什么名字', '上一次撒谎是什么时候', '在场谁最让你心动'
    ]},
    dare: { name: '大冒险', tasks: [
      '对左边的人说一句情话', '表演一个才艺', '做十个深蹲',
      '模仿在场某人的说话', '给右二位打个电话', '用杯子给对面敬酒'
    ]},
    mild: { name: '轻度养身', tasks: [
      '喝一口水', '吃一口菜', '做十个深蹲',
      '夸左边的人一句', '深呼吸三次', '给全场倒一杯酒'
    ]}
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr.filter(function (s) { return typeof s === 'string'; });
      }
    } catch (e) { /* 损坏数据则回到默认 */ }
    // 首次使用：自动种入「经典罚酒」模板
    const initial = TEMPLATES.classic.tasks.slice();
    save(initial);
    return initial;
  }

  function save(tasks) {
    try {
      localStorage.setItem(KEY, JSON.stringify(tasks));
    } catch (e) { /* 存储满或禁用时静默失败 */ }
  }

  function random(tasks) {
    if (!tasks || !tasks.length) return null;
    return tasks[Math.floor(Math.random() * tasks.length)];
  }

  return { TEMPLATES: TEMPLATES, load: load, save: save, random: random };
})();
