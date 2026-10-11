import { BRAND_NAME } from '@/lib/brand';
import { themeFromPreset } from '@/lib/theme/presets';
import { themeToCssVars } from '@/lib/theme/css';
import { ThemedShell } from '@/components/gallery/ThemedShell';
import { GalleryMessage } from '@/components/gallery/GalleryMessage';

export default function GalleryNotFound() {
  return (
    <ThemedShell vars={themeToCssVars(themeFromPreset('marfim'))}>
      <GalleryMessage logoUrl={null} brand={BRAND_NAME} title={null} message="Não encontrámos esta galeria. Confirma o link que recebeste." />
    </ThemedShell>
  );
}
