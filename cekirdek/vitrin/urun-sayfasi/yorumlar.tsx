// Ürün sayfasının yorum bölümü (kart 0139, karar 0109; Canlı Çarşı taslağı). Yalnız yayındaki yorumlar görünür:
// puan özeti (ortalama, yıldızlar, yorum sayısı ve 5'ten 1'e dağılım) ve yorumlar en yeni önce. Daha fazlası
// "Daha fazla yorum" bağlantısıyla gelir; sayfa adreste durur (?yorum-sayfasi=2), kod yüklenmeden de çalışır.
//
// Yorum metni yazı olarak çizilir (React kaçırır): HTML ve bağlantı çalışmaz, satır sonları korunur. Doğrulanmış
// alıcı etiketi mağaza sahibinin ayarıdır (dogrulanmisAliciEtiketi).

import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { DahaFazla } from "../../../bilesenler/parcalar/sayfalama";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import type { PuanOzeti, VitrinYorumu } from "../../moduller/yorum/servis";
import { Yildizlar, yildizSayisi } from "../yildizlar";
import { YorumYaz } from "./yorum-yaz";

export const yorumSayfasiParametresi = "yorum-sayfasi";
export const yorumBolumuKimligi = "yorumlar";

const bicim = () => siteninBicimleyicisi(calisanSite().ayarlar);

// Başlığın altındaki puan satırı: yıldızlar ve yorumlara giden bağlantı.
export function PuanSatiri({ puan }: { puan: PuanOzeti | undefined }) {
  return (
    <span className="flex flex-wrap items-center gap-2 text-kucuk">
      <span className="text-yazi">
        <Yildizlar
          dolu={puan === undefined ? 0 : Math.round(puan.ortalama)}
          yazi={
            // Yorumsuz üründe bağlantı "henüz yorum yok" der: yıldızlar ikinci kez okutmaz.
            puan === undefined
              ? ""
              : doldur(metin("vitrin.yorum.ortalama"), { ortalama: bicim().sayi(puan.ortalama, 1) })
          }
        />
      </span>
      <a
        href={`#${yorumBolumuKimligi}`}
        className="dokunma-alani text-yazi underline underline-offset-2"
      >
        {puan === undefined
          ? metin("vitrin.yorum.henuzYorumYok")
          : doldur(metin("vitrin.yorum.yorumSayisi"), { sayi: bicim().sayi(puan.sayi) })}
      </a>
    </span>
  );
}

function PuanOzetiKutusu({ puan }: { puan: PuanOzeti }) {
  return (
    <div className="flex flex-col gap-3 rounded-orta bg-yuzey p-5 tablet:w-panel tablet:shrink-0">
      <span className="font-baslik font-baslik-kalinligi text-baslik-1">
        {bicim().sayi(puan.ortalama, 1)}
      </span>
      <Yildizlar
        dolu={Math.round(puan.ortalama)}
        boyut="orta"
        yazi={doldur(metin("vitrin.yorum.ortalama"), { ortalama: bicim().sayi(puan.ortalama, 1) })}
      />
      <span className="text-soluk-yazi">
        {doldur(metin("vitrin.yorum.yorumSayisi"), { sayi: bicim().sayi(puan.sayi) })}
      </span>
      <ul aria-label={metin("vitrin.yorum.dagilim")} className="flex flex-col gap-1.5 text-kucuk">
        {puan.dagilim.map((sayi, sira) => {
          const yildiz = bicim().sayi(yildizSayisi - sira);
          return (
            <li key={yildiz} className="flex items-center gap-2">
              <span aria-hidden="true" className="shrink-0">
                {doldur(metin("vitrin.yorum.yildizSatiri"), { yildiz })}
              </span>
              <span
                aria-hidden="true"
                className="h-2 min-w-0 flex-1 overflow-hidden rounded-dugme bg-kenar"
              >
                {/* Çubuğun doluluğu ölçek değildir, yorum sayısının oranıdır: büyütmeyle çizilir. */}
                <span
                  className="block h-full w-full origin-left bg-birincil"
                  style={{ transform: `scaleX(${sayi / puan.sayi})` }}
                />
              </span>
              <span aria-hidden="true" className="w-6 shrink-0 text-right text-soluk-yazi">
                {bicim().sayi(sayi)}
              </span>
              <span className="sr-only">
                {doldur(metin("vitrin.yorum.yildizSatiriOkunan"), {
                  yildiz,
                  sayi: bicim().sayi(sayi),
                })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function YorumOgesi({ yorum, etiket }: { yorum: VitrinYorumu; etiket: boolean }) {
  return (
    <li className="flex flex-col gap-2 border-b border-kenar py-5 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-kucuk">
        <span className="text-yazi">
          <Yildizlar
            dolu={yorum.puan}
            yazi={doldur(metin("vitrin.yorum.puan"), { puan: bicim().sayi(yorum.puan) })}
          />
        </span>
        <strong className="font-en-kalin">{yorum.ad}</strong>
        <time dateTime={yorum.zaman.toISOString()} className="text-soluk-yazi">
          {bicim().tarih(yorum.zaman)}
        </time>
        {etiket && yorum.dogrulanmisAlici ? (
          <Rozet tur="basari">{metin("vitrin.yorum.dogrulanmisAlici")}</Rozet>
        ) : null}
      </div>
      {yorum.baslik === undefined ? null : (
        <h3 className="font-en-kalin text-govde wrap-anywhere">{yorum.baslik}</h3>
      )}
      <p className="whitespace-pre-line wrap-anywhere">{yorum.metin}</p>
    </li>
  );
}

export function UrunYorumlari({
  urun,
  urunAdi,
  puan,
  liste,
  dogrulanmisAliciEtiketi,
  sonrakiAdres,
}: {
  urun: string;
  urunAdi: string;
  puan: PuanOzeti | undefined;
  liste: { yorumlar: VitrinYorumu[]; toplam: number };
  dogrulanmisAliciEtiketi: boolean;
  // Bir sonraki sayfanın adresi; son sayfadaysa yok.
  sonrakiAdres: string | undefined;
}) {
  return (
    <section
      id={yorumBolumuKimligi}
      aria-labelledby="yorumlar-basligi"
      className="flex min-w-0 scroll-mt-4 flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="yorumlar-basligi"
          className="min-w-0 font-baslik text-baslik-3 font-baslik-kalinligi wrap-anywhere tablet:text-baslik-2"
        >
          {metin("vitrin.yorum.baslik")}
        </h2>
        <YorumYaz urun={urun} urunAdi={urunAdi} />
      </div>
      {puan === undefined || liste.yorumlar.length === 0 ? (
        <p className="text-soluk-yazi">{metin("vitrin.yorum.ilkYorum")}</p>
      ) : (
        <div className="flex min-w-0 flex-col gap-6 tablet:flex-row tablet:items-start tablet:gap-8">
          <PuanOzetiKutusu puan={puan} />
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <ul className="flex flex-col">
              {liste.yorumlar.map((yorum) => (
                <YorumOgesi key={yorum.kimlik} yorum={yorum} etiket={dogrulanmisAliciEtiketi} />
              ))}
            </ul>
            {liste.toplam > liste.yorumlar.length ? (
              <DahaFazla
                className="items-start"
                durum={doldur(metin("vitrin.yorum.dahaFazlaDurum"), {
                  toplam: bicim().sayi(liste.toplam),
                  gorulen: bicim().sayi(liste.yorumlar.length),
                })}
                adres={sonrakiAdres}
                dugmeYazisi={metin("vitrin.yorum.dahaFazla")}
              />
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
