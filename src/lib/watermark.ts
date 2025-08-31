// src/lib/watermark.ts
export type WatermarkOptions = {
  /** public/ altında erişilecek logo yolu */
  logoUrl?: string;
  /** Logonun fotoğraf genişliğine oranı (0.2 = %20)  */
  scale?: number;
  /** 0..1 arası opaklık */
  opacity?: number;
  /** true => deseni döşe; false => ortada tek logo */
  tile?: boolean;
  /** Çıkış kalitesi (JPEG) */
  quality?: number;
  /** Maks. genişlik (çok büyük fotoğrafları indirger) */
  maxWidth?: number;
};

function readAsDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

async function loadImage(src: string | Blob): Promise<HTMLImageElement> {
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  try {
    await new Promise((res, rej) => {
      const img = new Image();
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
  } finally {
    if (src instanceof Blob) URL.revokeObjectURL(url);
  }
  const img = new Image();
  img.src = typeof src === "string" ? src : URL.createObjectURL(src);
  return new Promise((res) => (img.onload = () => res(img)));
}

export async function applyWatermark(file: File, opts: WatermarkOptions = {}): Promise<File> {
  const {
    logoUrl = "/brand/watermark-logo.png",
    scale = 0.28, // fotoğraf genişliğinin %28’i
    opacity = 0.25, // belirgin ama rahatsız etmeyen seviye
    tile = false, // tek logo (false) ya da döşeme (true)
    quality = 0.9,
    maxWidth = 2400, // devasa fotoları biraz küçült
  } = opts;

  // Fotoğrafı ve logoyu yükle
  const photoDataUrl = await readAsDataURL(file);
  const photo = await loadImage(photoDataUrl);
  const logo = await loadImage(logoUrl);

  // Boyutlandırma
  const ratio = photo.naturalWidth / photo.naturalHeight;
  const targetW = Math.min(photo.naturalWidth, maxWidth);
  const targetH = Math.round(targetW / ratio);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";

  // Fotoğrafı çiz
  ctx.drawImage(photo, 0, 0, targetW, targetH);

  // Logo ölçüleri
  const wmW = Math.round(targetW * scale);
  const wmH = Math.round((logo.naturalHeight / logo.naturalWidth) * wmW);

  // Opaklık ayarı
  ctx.globalAlpha = opacity;

  if (tile) {
    // Döşeme: çapraz diyagonaller gibi aralıkla ser
    const step = Math.floor(wmW * 1.75);
    for (let y = -wmH; y < targetH + wmH; y += step) {
      for (let x = -wmW; x < targetW + wmW; x += step) {
        ctx.drawImage(logo, x, y, wmW, wmH);
      }
    }
  } else {
    // Tek logo: merkeze yerleştir
    const x = Math.round((targetW - wmW) / 2);
    const y = Math.round((targetH - wmH) / 2);
    ctx.drawImage(logo, x, y, wmW, wmH);
  }

  // Opaklığı sıfırla
  ctx.globalAlpha = 1;

  // Çıkış: JPEG
  const outBlob: Blob = await new Promise((res) =>
    canvas.toBlob((b) => res(b!), "image/jpeg", quality),
  );
  const newName = file.name.replace(/\.\w+$/, "") + "-wm.jpg";

  return new File([outBlob], newName, { type: "image/jpeg" });
}
