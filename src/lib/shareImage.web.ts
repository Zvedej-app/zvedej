import type { CardRef } from '../components/share/ShareCard';

/**
 * Web: kartu vykreslí html2canvas do PNG. Na telefonu se otevře systémové sdílení (lze poslat rovnou
 * do Instagramu), na počítači se obrázek stáhne.
 */
export async function shareViewAsImage(view: CardRef | null, opts: { width: number; height: number; title: string; fileName: string }) {
  const node = view as unknown as HTMLElement | null;
  if (!node) return;
  const mod = (await import('html2canvas')) as unknown as { default: typeof import('html2canvas').default };
  const rect = node.getBoundingClientRect();
  const canvas = await mod.default(node, {
    scale: opts.width / rect.width,
    backgroundColor: null,
    logging: false,
    useCORS: true,
  });
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return;
  const file = new File([blob], opts.fileName, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: opts.title });
      return;
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = opts.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
