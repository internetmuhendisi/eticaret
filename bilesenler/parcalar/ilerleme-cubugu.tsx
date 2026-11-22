// İlerleme çubuğu (kart 0266; .claude/rules/bilesenler.md: ilerleme çubuğu kütüphaneden): dosya yüklemesi gibi süren
// işin oranı. Ekran okuyucu adı ve yüzdeyi okur; görünen yüzde yazısı yoktur (yazıyı kullanan sayfa biçimleyiciyle
// koyabilir). Oran 0–1 dışına çıkmaz.
import { sinif } from "./sinif.ts";

export function IlerlemeCubugu({
  oran,
  etiket,
  className,
}: {
  // 0–1.
  oran: number;
  etiket: string;
  className?: string;
}) {
  const yuzde = Math.round(Math.min(Math.max(oran, 0), 1) * 100);
  return (
    <div
      role="progressbar"
      aria-label={etiket}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={yuzde}
      data-slot="ilerleme-cubugu"
      className={sinif("h-2 w-full overflow-hidden rounded-dugme bg-yuzey", className)}
    >
      <div
        className="h-full w-full origin-left bg-birincil transition-transform duration-kisa"
        // Oran hareket değeridir (ölçek), ölçü değil.
        style={{ transform: `scaleX(${yuzde / 100})` }}
      />
    </div>
  );
}
