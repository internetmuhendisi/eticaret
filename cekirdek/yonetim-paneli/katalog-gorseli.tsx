// Kategori ve marka satırının küçük görseli (kart 0261, taslak): seçili görselin panel önizlemesi, yoksa görsel
// ikonu. Görsel süstür: adı satırın yazısındadır, ekran okuyucu atlar.
import { Ikon } from "../../bilesenler/ikonlar/ikon";
import { panelGorseliAdresi } from "./gorsel-secimi";

export function KatalogGorseli({ gorsel }: { gorsel: string | undefined }) {
  if (gorsel === undefined) {
    return (
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-kucuk border border-kenar bg-yuzey text-soluk-yazi"
      >
        <Ikon ad="gorsel" />
      </span>
    );
  }
  return (
    // biome-ignore lint/performance/noImgElement: panelin küçük önizlemesi, boyutu uçtan gelir.
    <img
      src={panelGorseliAdresi(gorsel)}
      alt=""
      loading="lazy"
      className="size-12 shrink-0 rounded-kucuk border border-kenar bg-yuzey object-cover"
    />
  );
}
