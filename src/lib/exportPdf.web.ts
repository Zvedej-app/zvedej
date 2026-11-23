import type { Lang } from './i18n';
import type { TrainingData } from './types';
import type { Unit } from './units';
import { pdfFileName, trainingDoc } from './exportDoc';

/**
 * Webová verze (aplikace na ploše iPhonu): PDF se vytvoří přímo v prohlížeči
 * (html2canvas + jsPDF, takže fungují i česká písmena) a nabídne se ke sdílení / uložení.
 */
export async function exportTrainingPdf(data: TrainingData, lang: Lang, unit: Unit, owner: string) {
  const { css, body } = trainingDoc(data, lang, unit, owner);
  const [{ jsPDF }, html2canvasMod] = await Promise.all([import('jspdf'), import('html2canvas')]);
  const html2canvas = (html2canvasMod as unknown as { default: typeof import('html2canvas').default }).default;

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:#fff;';
  host.innerHTML = `<style>${css}</style><div class="zv">${body}</div>`;
  document.body.appendChild(host);
  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(host, { scale: 2, backgroundColor: '#ffffff', logging: false });
  } finally {
    host.remove();
  }

  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const sliceH = Math.floor((canvas.width * pageH) / pageW); // výška jedné stránky v pixelech plátna
  for (let y = 0, page = 0; y < canvas.height; y += sliceH, page++) {
    const part = document.createElement('canvas');
    part.width = canvas.width;
    part.height = Math.min(sliceH, canvas.height - y);
    part.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, part.height, 0, 0, canvas.width, part.height);
    if (page > 0) pdf.addPage();
    pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, (part.height * pageW) / canvas.width);
  }

  const name = pdfFileName();
  const blob = pdf.output('blob');
  const file = new File([blob], name, { type: 'application/pdf' });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Zvedej – tréninky' });
      return;
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return; // uživatel sdílení zavřel
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
