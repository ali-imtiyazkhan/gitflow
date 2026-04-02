'use client';

import { useCallback } from 'react';

export function useExportGraph() {
  const getFlowElement = (): HTMLElement | null =>
    document.querySelector('.react-flow') as HTMLElement | null;

  const exportPNG = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(el, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        filter: (node: HTMLElement) => 
          !node.classList?.contains('react-flow__controls') && 
          !node.classList?.contains('react-flow__minimap'),
      });
      const link = document.createElement('a');
      link.download = `branch-graph-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('PNG export failed:', err);
    }
  }, []);

  const exportSVG = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    try {
      const { toSvg } = await import('html-to-image');
      const dataUrl = await toSvg(el, { backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `branch-graph-${Date.now()}.svg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('SVG export failed:', err);
    }
  }, []);

  const copyToClipboard = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    try {
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(el, { backgroundColor: '#ffffff', pixelRatio: 2 });
      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  }, []);

  return { exportPNG, exportSVG, copyToClipboard };
}
