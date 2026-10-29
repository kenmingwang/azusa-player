import { cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';

rmSync('dist-firefox', { recursive: true, force: true });
cpSync('dist', 'dist-firefox', { recursive: true });
const path = 'dist-firefox/manifest.json';
const m = JSON.parse(readFileSync(path, 'utf8'));
// Firefox 扩展 ID。默认值是占位，用于本地加载测试
const GECKO_ID = process.env.GECKO_ID ?? 'azusa-player-firefox@example.com';

// 后台：service_worker -> scripts（Firefox 用事件页面）
m.background = { scripts: [m.background.service_worker], type: 'module' };

// 设置页：用 options_ui
m.options_ui = { page: m.options_page, open_in_tab: true };
delete m.options_page;

// onShown / onHidden / refresh 是 firefox 专有，需要 menus 权限
m.permissions = [...new Set([...(m.permissions ?? []), 'menus'])];

m.browser_specific_settings = {
  gecko: {
    id: GECKO_ID,
    strict_min_version: '140.0',
    data_collection_permissions: { required: ['none'] },
  },
};

writeFileSync(path, JSON.stringify(m, null, 2));

