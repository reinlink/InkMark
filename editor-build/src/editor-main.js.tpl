import * as monaco from 'monaco-editor/editor/editor.api.js';
import 'monaco-editor/languages/definitions/markdown/register.js';
// 补齐 editor.api 精简入口未包含的拖放贡献：
// - dnd.js：编辑区内选中文本的虚拟拖拽移动（虚线光标预览 + 单步撤销）
// - dropIntoEditorContribution.js：外部文本拖入插入（含落点预览指示）
import 'monaco-editor/editor/contrib/dnd/browser/dnd.js';
import 'monaco-editor/editor/contrib/dropOrPasteInto/browser/dropIntoEditorContribution.js';

// __WORKER_CODE__ 由构建脚本替换为 worker bundle 源码（Blob worker，离线可用）
self.MonacoEnvironment = {
  getWorker: function () {
    return new Worker(URL.createObjectURL(new Blob([__WORKER_CODE__], { type: 'text/javascript' })));
  }
};

window.monaco = monaco;
window.__monacoReady = true;
