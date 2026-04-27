import type { ComputedRef, Ref } from 'vue';

type QrPreviewSource = ComputedRef<string> | Ref<string>;

export function useQrPreviewDataUrl(source: QrPreviewSource) {
  const dataUrl = ref('');
  const error = ref('');
  let generationId = 0;

  watch(
    source,
    async (value) => {
      const cleanValue = value.trim();
      const currentGenerationId = ++generationId;
      dataUrl.value = '';
      error.value = '';

      if (!cleanValue || !import.meta.client) {
        return;
      }

      try {
        const QRCode = await import('qrcode');
        const nextDataUrl = await QRCode.toDataURL(cleanValue, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 420,
          color: {
            dark: '#071426',
            light: '#ffffff'
          }
        });

        if (currentGenerationId === generationId) {
          dataUrl.value = nextDataUrl;
        }
      } catch {
        if (currentGenerationId === generationId) {
          error.value = 'QR onizlemesi uretilemedi.';
        }
      }
    },
    { immediate: true }
  );

  return {
    dataUrl,
    error
  };
}
