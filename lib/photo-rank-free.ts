/**
 * Classificação visual local e gratuita para fotografias de imóveis.
 * Não utiliza API externa de IA, serviços pagos ou reconhecimento de ambientes.
 * Mede métricas de qualidade fotográfica e diversidade; NÃO reconhece "quarto",
 * "banheiro" ou detalhes que dependem de análise semântica.
 *
 * Todo o processamento é feito no navegador (Canvas), após seleção/autorização
 * do usuário. Fotos remotas precisam permitir leitura CORS.
 */

export type PhotoSource = { id: string; source: Blob | string; roomGroup?: string | null };

type VisualFeatures = {
  id: string;
  quality: number;
  grayHash: number[];
  avgR: number;
  avgG: number;
  avgB: number;
  histogram: number[];
};

const ANALYSIS_WIDTH = 160;
const ANALYSIS_HEIGHT = 120;

const between = (value: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, value));

function gaussianLike(value: number, target: number, tolerance: number) {
  return between(1 - Math.abs(value - target) / tolerance, 0, 1);
}

async function analyze(item: PhotoSource): Promise<VisualFeatures> {
  let blob: Blob;
  if (typeof item.source === 'string') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(item.source, { mode: 'cors', signal: controller.signal });
      if (!response.ok) throw new Error('Imagem indisponível');
      blob = await response.blob();
    } finally {
      clearTimeout(timer);
    }
  } else {
    blob = item.source;
  }
  if (!blob.type.startsWith('image/')) throw new Error('Arquivo não é imagem');
  const bitmap = await createImageBitmap(blob);
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;
  try {
    if (originalWidth < 1 || originalHeight < 1) throw new Error('Imagem vazia');
    const canvas = document.createElement('canvas');
    canvas.width = ANALYSIS_WIDTH;
    canvas.height = ANALYSIS_HEIGHT;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas indisponível');

    // Mantém o aspecto sem deixar margens artificiais na análise.
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / originalWidth, canvas.height / originalHeight);
    const w = originalWidth * scale;
    const h = originalHeight * scale;
    ctx.drawImage(bitmap, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);

    // Recorta a parte realmente desenhada; ignora bordas criadas no Canvas.
    const cropX = Math.floor((canvas.width - w) / 2);
    const cropY = Math.floor((canvas.height - h) / 2);
    const cropW = Math.min(canvas.width - cropX, Math.max(1, Math.floor(w)));
    const cropH = Math.min(canvas.height - cropY, Math.max(1, Math.floor(h)));
    const { data } = ctx.getImageData(cropX, cropY, cropW, cropH);
    const count = cropW * cropH;
    if (count < 100) throw new Error('Imagem muito pequena');

    const grayscale = new Float32Array(count);
    let luminanceSum = 0;
    let squareSum = 0;
    let saturationSum = 0;
    let clipped = 0;
    let rSum = 0, gSum = 0, bSum = 0;
    const histogram = Array.from({ length: 8 }, () => 0);

    for (let index = 0; index < count; index++) {
      const i = index * 4;
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const light = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      grayscale[index] = light;
      luminanceSum += light;
      squareSum += light * light;
      saturationSum += spread;
      rSum += r;
      gSum += g;
      bSum += b;
      histogram[Math.min(7, Math.floor(light * 8))]++;
      if (light < 0.035 || light > 0.965) clipped++;
    }

    const brightness = luminanceSum / count;
    const contrast = Math.sqrt(Math.max(0, squareSum / count - brightness * brightness));
    const saturation = saturationSum / count;
    const clipping = clipped / count;

    let gradient = 0;
    let edges = 0;
    for (let y = 1; y < cropH - 1; y++) {
      for (let x = 1; x < cropW - 1; x++) {
        const idx = y * cropW + x;
        // Diferenças locais: indicativo aproximado de foco e riqueza de detalhes.
        gradient += Math.abs(grayscale[idx] - grayscale[idx + 1]) +
          Math.abs(grayscale[idx] - grayscale[idx + cropW]);
        edges++;
      }
    }
    const detail = edges ? gradient / (2 * edges) : 0;

    const resolution = Math.sqrt(originalWidth * originalHeight);
    const ratio = originalWidth / originalHeight;

    // O anúncio mostra uma galeria horizontal; imagens horizontais claras, nítidas
    // e pouco estouradas tendem a funcionar melhor como capa nesta versão.
    const quality =
      0.31 * gaussianLike(brightness, 0.57, 0.5) +
      0.22 * gaussianLike(contrast, 0.22, 0.25) +
      0.17 * between(detail / 0.075, 0, 1) +
      0.11 * gaussianLike(saturation, 0.25, 0.45) +
      0.10 * between(resolution / 1400, 0, 1) +
      0.09 * (ratio >= 1.18 && ratio <= 2.3 ? 1 : ratio >= 0.9 ? 0.6 : 0.15) -
      0.18 * between(clipping / 0.22, 0, 1);

    // Uma impressão digital muito reduzida para identificar fotos semelhantes.
    const grayHash: number[] = [];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const sx = Math.min(cropW - 1, Math.floor((x + 0.5) / 8 * cropW));
        const sy = Math.min(cropH - 1, Math.floor((y + 0.5) / 8 * cropH));
        grayHash.push(grayscale[sy * cropW + sx] > brightness ? 1 : 0);
      }
    }

    return {
      id: item.id,
      quality,
      grayHash,
      avgR: rSum / count,
      avgG: gSum / count,
      avgB: bSum / count,
      histogram: histogram.map(n => n / count),
    };
  } finally {
    bitmap.close();
  }
}

function resemblance(a: VisualFeatures, b: VisualFeatures): number {
  let matchingBits = 0;
  for (let i = 0; i < a.grayHash.length; i++) {
    if (a.grayHash[i] === b.grayHash[i]) matchingBits++;
  }
  const hashSimilarity = matchingBits / a.grayHash.length;
  const colorDifference = (
    Math.abs(a.avgR - b.avgR) +
    Math.abs(a.avgG - b.avgG) +
    Math.abs(a.avgB - b.avgB)
  ) / 3;
  let histogramDifference = 0;
  for (let i = 0; i < a.histogram.length; i++) {
    histogramDifference += Math.abs(a.histogram[i] - b.histogram[i]);
  }
  return between(
    0.68 * hashSimilarity +
    0.16 * (1 - colorDifference) +
    0.16 * (1 - histogramDifference / 2),
    0,
    1
  );
}

export type FreeRankResult = {
  order: string[];
  analyzed: number;
  skipped: number;
  groups: number;
};

/**
 * Organiza a galeria em BLOCOS DE AMBIENTE, nunca alternando imagens
 * parecidas com imagens diferentes. Labels informados pelo operador
 * prevalecem sempre. Fotos sem label são agrupadas apenas por semelhança
 * visual; isso não é reconhecimento de cômodos e pode falhar com ângulos
 * muito diferentes. Não usa API externa.
 */
export async function rankPhotosFree(items: PhotoSource[]): Promise<FreeRankResult> {
  const results: VisualFeatures[] = [];
  for (const item of items) {
    try {
      results.push(await analyze(item));
    } catch (error) {
      console.warn('[photo-rank-free] Falha ao analisar', item.id, error);
    }
  }
  if (!results.length) {
    return { order: items.map(item => item.id), analyzed: 0,
      skipped: items.length, groups: 0 };
  }

  const orderById = new Map(items.map((item, index) => [item.id, index]));
  const groupsById = new Map(items.map(item => [item.id, item.roomGroup?.trim() || null]));
  const analyzed = new Map(results.map(photo => [photo.id, photo]));
  const groups: Array<{ tag: string | null; photos: VisualFeatures[] }> = [];

  // Labels humanos agruparam todas as imagens do mesmo ambiente sem exceção.
  const tagged = new Map<string, VisualFeatures[]>();
  for (const photo of results) {
    const group = groupsById.get(photo.id);
    if (group) {
      const list = tagged.get(group) || [];
      list.push(photo);
      tagged.set(group, list);
    }
  }
  for (const [tag, photos] of tagged) groups.push({ tag, photos });

  // Os demais são agrupados em comunidades de similaridade; o algoritmo
  // ANTERIOR tinha penalidade por semelhança e, por isso, intercalava cômodos.
  // Esta versão aproxima fotos parecidas, e mantém cada grupo contíguo.
  const unknown = results.filter(photo => !groupsById.get(photo.id));
  const parent = unknown.map((_, i) => i);
  function find(i: number): number {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
    return i;
  }
  function join(a: number, b: number) {
    const aa = find(a), bb = find(b);
    if (aa !== bb) parent[bb] = aa;
  }
  for (let i = 0; i < unknown.length; i++) {
    for (let j = i + 1; j < unknown.length; j++) {
      const similarity = resemblance(unknown[i], unknown[j]);
      // Threshold conservador, não tenta "adivinhar" que dois ambientes
      // diferentes são o mesmo apenas porque têm a mesma cor de paredes.
      if (similarity >= 0.835) join(i, j);
    }
  }
  const automatic = new Map<number, VisualFeatures[]>();
  for (let i = 0; i < unknown.length; i++) {
    const root = find(i);
    const list = automatic.get(root) || [];
    list.push(unknown[i]);
    automatic.set(root, list);
  }
  for (const photos of automatic.values()) groups.push({ tag: null, photos });

  function bestQuality(group: { tag: string | null; photos: VisualFeatures[] }) {
    return Math.max(...group.photos.map(p => p.quality));
  }
  function groupPriority(group: { tag: string | null; photos: VisualFeatures[] }) {
    const tag = (group.tag || '').toLowerCase();
    // Banheiros e áreas técnicas não devem abrir o anúncio quando houver
    // uma foto de quarto/sala adequada e corretamente etiquetada.
    if (/banheiro|wc|lavabo|toilet|bathroom/.test(tag)) return -100;
    if (/quarto|suite|suíte|studio|sala|living/.test(tag)) return 20;
    if (/cozinha|kitchen|varanda|balcony/.test(tag)) return 5;
    return 0;
  }
  groups.sort((a, b) =>
    groupPriority(b) - groupPriority(a) ||
    // Grupo maior antes ajuda a apresentar um cômodo por completo;
    // qualidade define a melhor foto DENTRO de cada bloco.
    Math.min(b.photos.length, 6) * 0.08 - Math.min(a.photos.length, 6) * 0.08 ||
    bestQuality(b) - bestQuality(a)
  );
  const sortedIds: string[] = [];
  for (const group of groups) {
    group.photos.sort((a, b) => b.quality - a.quality ||
      (orderById.get(a.id) ?? 0) - (orderById.get(b.id) ?? 0));
    sortedIds.push(...group.photos.map(photo => photo.id));
  }
  const found = new Set(analyzed.keys());
  // Imagens que não puderam ser lidas não são apagadas; ficam no final.
  sortedIds.push(...items.filter(item => !found.has(item.id)).map(item => item.id));
  return {
    order: sortedIds,
    analyzed: results.length,
    skipped: items.length - results.length,
    groups: groups.length,
  };
}
