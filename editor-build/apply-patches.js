'use strict';
/* 墨阅定制补丁：应用到 node_modules/monaco-editor 源码后打包（升级 monaco 版本前请核对片段） */
const fs = require('fs');
const path = require('path');

const monacoDir = path.join(__dirname, 'node_modules', 'monaco-editor', 'esm', 'vs', 'editor', 'browser', 'controller');

function apply(file, replacements, name) {
  const p = path.join(monacoDir, file);
  if (!fs.existsSync(p)) {
    throw new Error('补丁目标不存在: ' + p + '（请先 npm install）');
  }
  let src = fs.readFileSync(p, 'utf8');
  let changed = false;
  for (const r of replacements) {
    if (src.indexOf(r.to) >= 0) {
      console.log('补丁已存在，跳过:', name);
      continue;
    }
    const idx = src.indexOf(r.from);
    if (idx < 0) {
      throw new Error('补丁匹配失败 [' + name + ']：monaco 版本可能已升级，请核对源码片段。期望片段开头: ' + r.from.slice(0, 60).replace(/\n/g, '\\n'));
    }
    src = src.slice(0, idx) + r.to + src.slice(idx + r.from.length);
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(p, src, 'utf8');
    console.log('已应用补丁:', name);
  }
}

/* 1) 上下/左右边缘自动滚动：最小/最大速度再降一档，起步更柔和（墨阅 v2 曲线） */
const vertical = {
  from: `        if (outsideDistanceInLines <= 1.5) {
            return Math.max(30, viewportInLines * (1 + outsideDistanceInLines));
        }
        if (outsideDistanceInLines <= 3) {
            return Math.max(60, viewportInLines * (2 + outsideDistanceInLines));
        }
        return Math.max(200, viewportInLines * (7 + outsideDistanceInLines));`,
  to: `        // [墨阅定制] 边缘自动滚动：最小/最大速度再降一档（v2）
        if (outsideDistanceInLines <= 1.5) {
            return Math.max(6, viewportInLines * (0.25 + outsideDistanceInLines * 0.4));
        }
        if (outsideDistanceInLines <= 3) {
            return Math.max(14, viewportInLines * (0.8 + outsideDistanceInLines * 0.4));
        }
        return Math.max(45, viewportInLines * (1.2 + outsideDistanceInLines * 0.15));`
};
const horizontal = {
  from: `        if (outsideDistanceInChars <= 1.5) {
            return Math.max(30, viewportInChars * (1 + outsideDistanceInChars));
        }
        if (outsideDistanceInChars <= 3) {
            return Math.max(60, viewportInChars * (2 + outsideDistanceInChars));
        }
        return Math.max(200, viewportInChars * (7 + outsideDistanceInChars));`,
  to: `        // [墨阅定制] 横向边缘自动滚动同款降速（v2）
        if (outsideDistanceInChars <= 1.5) {
            return Math.max(6, viewportInChars * (0.25 + outsideDistanceInChars * 0.4));
        }
        if (outsideDistanceInChars <= 3) {
            return Math.max(14, viewportInChars * (0.8 + outsideDistanceInChars * 0.4));
        }
        return Math.max(45, viewportInChars * (1.2 + outsideDistanceInChars * 0.15));`
};
apply('dragScrolling.js', [vertical], 'dragScrolling(TopBottom)');
apply('dragScrolling.js', [horizontal], 'dragScrolling(LeftRight)');

/* 2) 拖动文字出编辑区边界：立即取消（不越界生效，落点/移动全部停止） */
apply('mouseHandler.js', [
  {
    from: `        if (this._mouseState.isDragAndDrop) {
            this._viewController.emitMouseDrag({
                event: e,
                target: position
            });
        }`,
    to: `        if (this._mouseState.isDragAndDrop) {
            if (position.type === 13 /* MouseTargetType.OUTSIDE_EDITOR */) {
                // [墨阅定制] 拖动文字出编辑区边界：立即取消，不越界生效
                this._viewController.emitMouseDropCanceled();
                this._stop();
                this._mouseMoveMonitor.stopMonitoring();
                return;
            }
            this._viewController.emitMouseDrag({
                event: e,
                target: position
            });
        }`
  }
], 'mouseHandler(拖动出界取消)');
