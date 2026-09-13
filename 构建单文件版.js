/**
 * 墨阅 Markdown 解析器 —— 构建离线单文件版
 * 将 lib/mermaid.min.js、lib/mathjax-tex-svg.js 与 lib/monaco/*（编辑器内核）内联进 index.html，
 * 生成无任何外部依赖的单个 HTML 文件（可离线分发到手机/其他电脑）。
 *
 * 用法：node 构建单文件版.js [Markdown解析目录]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const dir = process.argv[2] || __dirname;
const src = path.join(dir, 'index.html');
const out = path.join(dir, '墨阅解析.html'); /* 与 README / 发布产物同名，构建后无需手动改名 */

let html = fs.readFileSync(src, 'utf8');

/* 内联内容转义：防止库代码里的 </script> 提前终止标签 */
function inline(code) {
  return code.replace(/<\/script>/gi, '<\\/script>');
}

let changed = 0;

/* 1. mermaid：内联后立即关闭自动渲染（由页面手动控制主题与时机） */
html = html.replace(/<script src="lib\/mermaid\.min\.js" defer><\/script>/, function () {
  changed++;
  const code = fs.readFileSync(path.join(dir, 'lib', 'mermaid.min.js'), 'utf8');
  return '<script>\n' + inline(code) + '\n</script>\n' +
         '<script>if (window.mermaid) { try { mermaid.initialize({ startOnLoad: false }); } catch (e) {} }</script>';
});

/* 2. mathjax：配置脚本在其前、主逻辑在其后，顺序保持不变 */
html = html.replace(/<script src="lib\/mathjax-tex-svg\.js" defer><\/script>/, function () {
  changed++;
  const code = fs.readFileSync(path.join(dir, 'lib', 'mathjax-tex-svg.js'), 'utf8');
  return '<script>\n' + inline(code) + '\n</script>';
});

/* 3. Monaco 编辑器 CSS（内含 codicon 字体 data URI，可直接内联） */
html = html.replace(/<link rel="stylesheet" href="lib\/monaco\/editor\.bundle\.css">/, function () {
  changed++;
  const code = fs.readFileSync(path.join(dir, 'lib', 'monaco', 'editor.bundle.css'), 'utf8');
  return '<style>\n' + code + '\n</style>';
});

/* 4. Monaco 编辑器 JS（worker 已内联为 Blob 源码，单文件内零外部请求） */
html = html.replace(/<script src="lib\/monaco\/editor\.bundle\.js"><\/script>/, function () {
  changed++;
  const code = fs.readFileSync(path.join(dir, 'lib', 'monaco', 'editor.bundle.js'), 'utf8');
  return '<script>\n' + inline(code) + '\n</script>';
});

if (changed !== 4) {
  console.error('警告：预期替换 4 处库引用，实际 ' + changed + ' 处。请检查 index.html 的 script 标签。');
  process.exit(1);
}

fs.writeFileSync(out, html, 'utf8');
console.log('已生成：' + out);
console.log('大小：' + (fs.statSync(out).size / 1024 / 1024).toFixed(2) + ' MB');
