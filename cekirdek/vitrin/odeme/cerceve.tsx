// Ödeme adımının sade çerçevesi (kart 0213, karar 0132): üstte logo ve "Güvenli ödeme", altta telif, aydınlatma metni
// bağlantısı ve telefon. Menü ve arama yoktur: müşteri ödemeden çıkarılmaz. Bütün sitelerde aynıdır, düzenden çizilmez.
// Mağaza adı, logo ve telefon vitrin bağlamından gelir (bölümsüz okunur). Okunamazsa sayfa çerçevenin bilgisi olmadan
// açılır, hata kaydedilir: ödeme sayfasının kendisi çerçeve yüzünden düşmez.
import type { ReactNode } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { hatayiKaydet } from "../../izleme/hata-katmani";
import { metin } from "../../metinler/site-metni";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { vitrinAdresleri } from "../adresler";
import { vitrinBaglaminiOku } from "../baglam-oku";
import { bolumKutuphanesi } from "../bolum-kutuphanesi/kutuphane";
import { SepetSaglayici } from "../sepet/durum";

const cerceveyiOku = async () => {
  try {
    const vt = siteninVeritabani();
    const [baglam, ayarlar] = await Promise.all([
      vitrinBaglaminiOku(vt, calisanSite(), [], bolumKutuphanesi),
      siteninMagazaAyarlari(vt, calisanSite()),
    ]);
    return { baglam, sepeteEkleyince: ayarlar.sepeteEkleyince };
  } catch (hata) {
    hatayiKaydet(hata, { kaynak: "odeme-cercevesi" });
    return undefined;
  }
};

export async function OdemeCercevesi({ children }: { children: ReactNode }) {
  const cerceve = await cerceveyiOku();
  const baglam = cerceve?.baglam;
  return (
    <SepetSaglayici
      ayarlar={{ kip: "sorulur", sepeteEkleyince: cerceve?.sepeteEkleyince ?? "yan-pencere" }}
    >
      <div className="flex min-h-dvh flex-col">
        <header className="border-b border-kenar bg-zemin">
          <div className="mx-auto flex w-full max-w-icerik items-center justify-between gap-4 px-4 py-3 tablet:px-6">
            {baglam === undefined ? (
              <span />
            ) : (
              <Baglanti
                href={vitrinAdresleri.anasayfa}
                gorunum="sade"
                className="dokunma-alani min-w-0 shrink px-0 no-underline"
              >
                {baglam.logoAdresi === undefined ? (
                  <span className="min-w-0 truncate font-baslik text-buyuk font-baslik-kalinligi">
                    {baglam.magazaAdi}
                  </span>
                ) : (
                  // biome-ignore lint/performance/noImgElement: logo ucundan gelir, boyutlandırma tarayıcının işidir.
                  <img
                    src={baglam.logoAdresi}
                    alt={baglam.magazaAdi}
                    className="h-auto max-h-10 w-auto max-w-full"
                  />
                )}
              </Baglanti>
            )}
            <span className="flex shrink-0 items-center gap-2 text-kucuk font-kalin">
              <Ikon ad="guvenlik" />
              {metin("vitrin.odeme.guvenliOdeme")}
            </span>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-kenar bg-yuzey">
          <div className="mx-auto flex w-full max-w-icerik flex-wrap items-center gap-x-6 gap-y-1 px-4 py-4 text-kucuk tablet:px-6">
            {baglam === undefined ? null : (
              <span className="text-soluk-yazi">
                {metin("vitrin.bolum.telifSatiri.isaret")} {baglam.yil} {baglam.magazaAdi}
              </span>
            )}
            <Baglanti href={vitrinAdresleri.kvkkAydinlatma} target="_blank">
              {metin("vitrin.yasal.kvkk.baslik")}
            </Baglanti>
            {baglam?.iletisim.telefon === undefined ? null : (
              <Baglanti href={baglam.iletisim.telefon.adres} className="gap-2">
                <Ikon ad="telefon" />
                {baglam.iletisim.telefon.metin}
              </Baglanti>
            )}
          </div>
        </footer>
      </div>
    </SepetSaglayici>
  );
}
