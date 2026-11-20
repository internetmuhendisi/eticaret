"use client";
// Yan menünün içi (kart 0141): mağazanın logosu ya da adı, ana menü ve alt kısım (giriş yapan yönetici, vitrine
// git, çıkış, altyapı adı). Masaüstünde yan menüde, telefonda yan pencerede aynı içerik çizilir. Altyapı adı
// panelde yalnız giriş sayfasında ve burada, alt köşede küçük görünür (karar 0004).
import { usePanelMetni } from "../metinler/panel-metni";
import { vitrinAdresleri } from "../vitrin/adresler";
import { CikisDugmesi } from "./cikis-dugmesi";
import { EylemBaglantisi } from "./eylem-dugmesi";
import { type CizilenMenuGrubu, PanelMenusu } from "./panel-menusu";

export type MagazaGorunumu = { ad: string; logoAdresi?: string };

export function MagazaIsareti({ magaza }: { magaza: MagazaGorunumu }) {
  // Logo adın yanında süstür (taslak): adı yazı söyler, logo ekran okuyucuya okunmaz. Geniş logo yerin yarısını
  // geçmez, oranını korur; ad kalan yerde üç noktayla biter.
  return (
    <span className="flex min-w-0 items-center gap-2">
      {magaza.logoAdresi === undefined ? null : (
        // biome-ignore lint/performance/noImgElement: logo ucundan gelir, boyutlandırma tarayıcının işidir.
        <img
          src={magaza.logoAdresi}
          alt=""
          className="h-8 w-auto max-w-1/2 object-contain object-left"
        />
      )}
      <span className="min-w-0 truncate font-en-kalin">{magaza.ad}</span>
    </span>
  );
}

export function MenuIcerigi({
  magaza,
  eposta,
  gruplar,
  altyapiAdi,
  tiklayinca,
}: {
  magaza: MagazaGorunumu;
  eposta: string;
  gruplar: readonly CizilenMenuGrubu[];
  altyapiAdi: string;
  tiklayinca?: () => void;
}) {
  const metin = usePanelMetni();
  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex min-h-11 items-center px-3">
        <MagazaIsareti magaza={magaza} />
      </div>
      <nav aria-label={metin("yonetim.cerceve.menu")}>
        <PanelMenusu gruplar={gruplar} {...(tiklayinca === undefined ? {} : { tiklayinca })} />
      </nav>
      <div className="mt-auto flex flex-col items-start gap-1 border-t border-kenar pt-3">
        <span className="max-w-full truncate px-3 text-kucuk text-soluk-yazi" title={eposta}>
          {eposta}
        </span>
        <EylemBaglantisi
          eylem="vitrine-git"
          href={vitrinAdresleri.anasayfa}
          target="_blank"
          rel="noopener"
          aria-label={metin("yonetim.eylem.vitrineGitYeniSekme")}
          className="w-full justify-start px-3 font-orta no-underline"
        />
        <CikisDugmesi className="w-full justify-start px-3 font-orta" />
        <small className="px-3 pt-2 text-kucuk text-soluk-yazi">{altyapiAdi}</small>
      </div>
    </div>
  );
}
