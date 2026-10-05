// 内置插画（public/assets/city-editorial.png，由独立生图交接）。
// 运行时取回并转为 data URL，进预览与导出；取不到（或超 5MB）时回退几何占位。
import { LIMITS } from './themes.js';

let cache = null;

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

export function getEditorialAsset() {
  if (cache) return cache;
  cache = (async () => {
    try {
      const url = new URL('assets/city-editorial.png', document.baseURI).href;
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      if (!blob.type.startsWith('image/') || blob.size > LIMITS.imageBytes) return null;
      return await blobToDataUrl(blob);
    } catch {
      return null;
    }
  })();
  return cache;
}
