/* Client-side cover compression.

   A phone photo is 3–5MB; Vercel caps a serverless request body at ~4.5MB and
   base64 inflates raw bytes by 4/3, so an uncompressed upload fails with an
   opaque 413. Downscale + re-encode in the browser instead: the user sees
   "compressing…" and the request stays comfortably small. */

const MAX_DIM = 1600;
const START_QUALITY = 0.82;
const MIN_QUALITY = 0.55;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("that file could not be read as an image"));
    };
    img.src = url;
  });
}

/* → { dataUrl, bytes, width, height } */
export async function compressImage(file, maxBytes = 2.4 * 1024 * 1024) {
  if (!file) throw new Error("no file selected");
  if (!/^image\//.test(file.type)) throw new Error("pick an image file (jpg, png, webp…)");
  /* SVG is refused on purpose: covers are served from our own origin and an
     SVG can carry <script>, which would run as the site (stored XSS). Ask for
     a raster image instead — any screenshot/photo format works. */
  if (file.type === "image/svg+xml" || /\.svgz?$/i.test(file.name || "")) {
    throw new Error("SVG isn't allowed for covers — please use a JPG, PNG or WebP");
  }

  const img = await loadImage(file);
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  /* step the quality down until it fits the budget */
  let quality = START_QUALITY;
  let dataUrl = canvas.toDataURL("image/webp", quality);
  while (dataUrl.length * 0.75 > maxBytes && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - 0.1);
    dataUrl = canvas.toDataURL("image/webp", quality);
  }
  return { dataUrl, bytes: Math.round(dataUrl.length * 0.75), width: w, height: h };
}

export const fmtBytes = (n) => {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1048576).toFixed(2)} MB`;
};
