/** 本地壁纸：在浏览器内处理成 data URL，不经过任何服务器。 */

export const MAX_LOCAL_WALLPAPER_INPUT = 30 * 1024 * 1024;
const MAX_KEEP_ORIGINAL = 2 * 1024 * 1024;
const MAX_GIF = 8 * 1024 * 1024;
const MAX_OUTPUT = 5 * 1024 * 1024;
const MAX_WIDTH = 2560;
const MAX_HEIGHT = 1440;

/** 等比缩小到不超过 maxW×maxH 的范围，不放大。 */
export function fitWithin(width: number, height: number, maxW = MAX_WIDTH, maxH = MAX_HEIGHT) {
  const scale = Math.min(1, maxW / width, maxH / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), scale };
}

export function isLocalImageUrl(url: string | undefined | null): boolean {
  return !!url && url.startsWith('data:image/');
}

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(blob);
  });

const decodeImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(objectUrl); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('图片无法解码，请换一张')); };
    img.src = objectUrl;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('图片压缩失败'))), 'image/jpeg', quality);
  });

/** 读取本地图片并返回可直接作为壁纸的 data URL；过大的图会缩小并转 JPEG。 */
export async function prepareLocalWallpaper(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('请选择图片文件');
  if (file.size > MAX_LOCAL_WALLPAPER_INPUT) throw new Error('图片不能超过 30 MB');

  // 动图和矢量图不能走 canvas，否则会变成静态位图
  if (file.type === 'image/gif') {
    if (file.size > MAX_GIF) throw new Error('GIF 不能超过 8 MB');
    return readAsDataUrl(file);
  }
  if (file.type === 'image/svg+xml') return readAsDataUrl(file);

  const img = await decodeImage(file);
  const { width, height, scale } = fitWithin(img.naturalWidth, img.naturalHeight);
  if (scale === 1 && file.size <= MAX_KEEP_ORIGINAL) return readAsDataUrl(file);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法处理图片');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.9;
  let blob = await canvasToBlob(canvas, quality);
  while (blob.size > MAX_OUTPUT && quality > 0.5) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, quality);
  }
  return readAsDataUrl(blob);
}
