const fs = require('fs');
const path = require('path');

async function main() {
  /* 依赖不存在时自动安装（首次构建 / node_modules 被清理后） */
  if (!fs.existsSync(path.join(__dirname, 'node_modules', 'monaco-editor'))) {
    console.log('未检测到 node_modules，正在执行 npm install ...');
    require('child_process').execSync('npm install --no-audit --no-fund', { cwd: __dirname, stdio: 'inherit' });
  }
  /* 墨阅定制补丁：边缘滚动降速 + 拖动出界取消（见 apply-patches.js） */
  const esbuild = require('esbuild');
  require('./apply-patches.js');

  const outDir = path.resolve(__dirname, '..', 'lib', 'monaco');
  const tmpDir = path.join(__dirname, '.tmp');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  /* 1. worker bundle（生成在 build 目录内，便于解析 node_modules） */
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'worker-main.js')],
    bundle: true,
    minify: true,
    format: 'iife',
    outfile: path.join(tmpDir, 'editor.worker.js'),
    target: ['chrome90', 'safari14']
  });
  const workerCode = fs.readFileSync(path.join(tmpDir, 'editor.worker.js'), 'utf8');

  /* 2. main bundle（worker 内联为 Blob 源码） */
  let main = fs.readFileSync(path.join(__dirname, 'src', 'editor-main.js.tpl'), 'utf8');
  main = main.replace('__WORKER_CODE__', JSON.stringify(workerCode));
  const gen = path.join(tmpDir, 'editor-main.generated.js');
  fs.writeFileSync(gen, main, 'utf8');

  await esbuild.build({
    entryPoints: [gen],
    bundle: true,
    minify: true,
    format: 'iife',
    outfile: path.join(outDir, 'editor.bundle.js'),
    target: ['chrome90', 'safari14'],
    loader: { '.css': 'css' }
  });

  /* css 输出改名（esbuild 与 js 同名前缀输出到 outDir） */
  const cssGen = path.join(outDir, 'editor-main.generated.css');
  if (fs.existsSync(cssGen)) {
    fs.renameSync(cssGen, path.join(outDir, 'editor.bundle.css'));
  }

  /* 清理临时目录 */
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log('已生成 lib/monaco/:');
  for (const f of ['editor.bundle.js', 'editor.bundle.css']) {
    const p = path.join(outDir, f);
    console.log('  ' + f + '  ' + (fs.statSync(p).size / 1024).toFixed(1) + ' KB');
  }
}
main().catch(function (e) { console.error(e); process.exit(1); });