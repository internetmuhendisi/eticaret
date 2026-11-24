"use client";
// Yorumlar ekranının listesi (kart 0277, karar 0174; taslak: "Yorum onayı"). Tanımı liste-tanimi.ts: durum sekmesi
// (Onay bekleyen ile açılır), puan süzgeci, arama, sıralama, sayfa ve iki toplu işlem (yayınla, reddet). Yorum metni
// uzun olabildiği için liste her genişlikte karttır (gorunum="kartlar").
//
// Kartta ürün (izni olana ürün ekranına bağlantı; sayfası açık üründe vitrine bağlantı), puan, kısaltılmış ad,
// doğrulanmış alıcı ve ana sayfa rozetleri, tarih, başlık ve düz metin. Eylemler yalnız karar izni (yorum.onayla)
// olana görünür: onay bekleyende Yayınla ve Reddet, yayındakinde Ana sayfada göster (kaldır) ve Yayından kaldır,
// reddedilende Yayınla. Yorum metni değiştirilmez, reddedilen yorum müşteriye bildirilmez.
//
// Karar ekranın gördüğü durumu gönderir: yorum arada başka bir karar almışsa çakışır, liste yenilenir. Toplu işlemler
// sekmeye göredir (yorumun zaten o durumda olduğu sekmede o işlem yoktur). İstek sürerken o kartın düğmeleri
// aria-disabled'dır ve basış yok sayılır; öteki kartlar çalışır.
//
// Odak: eylemden sonra kart listede kalıyorsa odak onun ilk düğmesine, sekmeden çıktıysa sonraki (yoksa önceki)
// kartın ilk düğmesine, sonraki yoksa yenilenen listede aynı sıradaki karta (sonraki sayfadan kayan kart), o da yoksa
// önceki karta, liste boşaldıysa seçili sekmeye gider (kaybolmaz). Liste gelmeden kullanıcı sekmeyi, süzgeci ya da sayfayı değiştirirse
// odak taşınmaz.
import { useEffect, useRef, useState } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import {
  type YorumDurumu,
  type YorumPanelSiralamasi,
  type YorumTopluIslemi,
  yorumSinirlari,
  yorumTopluIslemKodlari,
  yorumTopluIslemleri,
} from "../../kayitlar/yorum";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { kayitAdresleri } from "../../vitrin/adresler";
import { Yildizlar } from "../../vitrin/yildizlar";
import { urunEkraniAdresi } from "../adresler";
import { Liste, type TopluIslemTanimi } from "../liste/liste";
import { type ListeDurumu, type ListeVerisi, listeSorgusu } from "../liste/tanim";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";
import { yorumListesiTanimi } from "./liste-tanimi";
import type { YorumSatiri } from "./veri";

const durumAdi = (durum: YorumDurumu): MetinAnahtari => `yonetim.yorumlar.durum.${durum}`;

const siralamalar: Record<YorumPanelSiralamasi, MetinAnahtari> = {
  "en-yeni": "yonetim.yorumlar.siralama.en-yeni",
  "en-eski": "yonetim.yorumlar.siralama.en-eski",
  "puan-artan": "yonetim.yorumlar.siralama.puan-artan",
  "puan-azalan": "yonetim.yorumlar.siralama.puan-azalan",
};

const islemAdlari: Record<YorumTopluIslemi, MetinAnahtari> = {
  yayinla: "yonetim.yorumlar.eylem.yayinla",
  reddet: "yonetim.yorumlar.eylem.reddet",
};

// Toplu işlemin ve tekil eylemin nedenleri: servisin bilinen kodları, gerisi genel metin.
const nedenler: Record<string, MetinAnahtari> = {
  "yorum-yok": "yonetim.yorumlar.hata.yorum-yok",
  "yorum-degisti": "yonetim.yorumlar.hata.yorum-degisti",
};

const hataMetni = (hata: PanelHatasi): MetinAnahtari =>
  hata.kod === "yetki"
    ? "yonetim.yorumlar.hata.yetki"
    : hata.kod === "bulunamadi"
      ? "yonetim.yorumlar.hata.yorum-yok"
      : hata.kod === "cakisma"
        ? "yonetim.yorumlar.hata.yorum-degisti"
        : "yonetim.yorumlar.hata.genel";

// Kartın üst satırı: ürün, puan, ad, rozetler ve tarih.
function UstSatir({ satir, urunGorur }: { satir: YorumSatiri; urunGorur: boolean }) {
  const metin = usePanelMetni();
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-kucuk text-soluk-yazi">
      {urunGorur ? (
        <Baglanti
          href={urunEkraniAdresi(satir.urun.kimlik)}
          className="min-h-11 font-en-kalin text-yazi"
        >
          {satir.urun.ad}
        </Baglanti>
      ) : (
        <span className="font-en-kalin text-yazi">{satir.urun.ad}</span>
      )}
      <span className="text-yazi">
        <Yildizlar
          dolu={satir.puan}
          yazi={doldur(metin("yonetim.yorumlar.puan"), {
            puan: satir.puanYazisi,
            enCok: String(yorumSinirlari.enYuksekPuan),
          })}
        />
      </span>
      <span>{satir.ad}</span>
      {satir.dogrulanmisAlici ? (
        <Rozet tur="basari">{metin("yonetim.yorumlar.dogrulanmisAlici")}</Rozet>
      ) : null}
      <span>{satir.zaman}</span>
      {satir.durum === "yayinda" && satir.anaSayfada ? (
        <Rozet tur="birincil">{metin("yonetim.yorumlar.anaSayfada")}</Rozet>
      ) : null}
    </span>
  );
}

// Kartın eylemleri. Bu kartta istek sürerken düğmeler aria-disabled'dır, basış yok sayılır.
function Eylemler({
  satir,
  suruyor,
  islemYap,
}: {
  satir: YorumSatiri;
  suruyor: boolean;
  islemYap: (satir: YorumSatiri, yol: string, govde: unknown, basari: MetinAnahtari) => void;
}) {
  const metin = usePanelMetni();
  const kimin = { ad: satir.ad, urun: satir.urun.ad };
  const dugme = (
    yazi: MetinAnahtari,
    tur: "birincil" | "cerceveli",
    yol: string,
    govde: unknown,
    basari: MetinAnahtari,
  ) => (
    <Dugme
      key={yazi}
      tur={tur}
      className="px-3"
      // Aynı yazılı düğmeler kartlarda tekrar eder: ad görünen yazıyla başlar, kimin yorumu olduğunu söyler.
      aria-label={doldur(metin("yonetim.yorumlar.eylemAdi"), { eylem: metin(yazi), ...kimin })}
      aria-disabled={suruyor ? true : undefined}
      onClick={() => {
        if (!suruyor) islemYap(satir, yol, govde, basari);
      }}
    >
      {tur === "birincil" ? <Ikon ad="onay" /> : null}
      {metin(yazi)}
    </Dugme>
  );
  const karar = (durum: "yayinda" | "reddedildi") => ({
    yorum: satir.kimlik,
    durum,
    gorulen: satir.durum,
  });
  const isaret = (anaSayfada: boolean) => ({ yorum: satir.kimlik, anaSayfada });
  const dugmeler =
    satir.durum === "onay-bekliyor"
      ? [
          dugme(
            "yonetim.yorumlar.eylem.yayinla",
            "birincil",
            "yorum-karari",
            karar("yayinda"),
            "yonetim.yorumlar.basari.yayinlandi",
          ),
          dugme(
            "yonetim.yorumlar.eylem.reddet",
            "cerceveli",
            "yorum-karari",
            karar("reddedildi"),
            "yonetim.yorumlar.basari.reddedildi",
          ),
        ]
      : satir.durum === "yayinda"
        ? [
            satir.anaSayfada
              ? dugme(
                  "yonetim.yorumlar.eylem.anaSayfadanKaldir",
                  "cerceveli",
                  "yorum-ana-sayfa",
                  isaret(false),
                  "yonetim.yorumlar.basari.anaSayfadanKaldirildi",
                )
              : dugme(
                  "yonetim.yorumlar.eylem.anaSayfadaGoster",
                  "cerceveli",
                  "yorum-ana-sayfa",
                  isaret(true),
                  "yonetim.yorumlar.basari.anaSayfada",
                ),
            dugme(
              "yonetim.yorumlar.eylem.yayindanKaldir",
              "cerceveli",
              "yorum-karari",
              karar("reddedildi"),
              "yonetim.yorumlar.basari.yayindanKaldirildi",
            ),
          ]
        : [
            dugme(
              "yonetim.yorumlar.eylem.yayinla",
              "birincil",
              "yorum-karari",
              karar("yayinda"),
              "yonetim.yorumlar.basari.yayinlandi",
            ),
          ];
  return (
    <span
      data-yorum-eylemleri
      className="flex flex-wrap gap-2 tablet:flex-col tablet:items-stretch"
    >
      {dugmeler}
    </span>
  );
}

function YorumKarti({
  satir,
  urunGorur,
  kararVerir,
  suruyor,
  islemYap,
}: {
  satir: YorumSatiri;
  urunGorur: boolean;
  kararVerir: boolean;
  suruyor: boolean;
  islemYap: (satir: YorumSatiri, yol: string, govde: unknown, basari: MetinAnahtari) => void;
}) {
  const metin = usePanelMetni();
  return (
    <span
      data-yorum={satir.kimlik}
      className="flex min-w-0 flex-col gap-3 tablet:flex-row tablet:items-start"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <UstSatir satir={satir} urunGorur={urunGorur} />
        {satir.baslik === null ? null : <span className="font-kalin">{satir.baslik}</span>}
        {/* Düz metin: satır sonları korunur, HTML ve bağlantı yazı olarak görünür. */}
        <span className="break-words whitespace-pre-line">{satir.metin}</span>
        {satir.urun.vitrinde ? (
          <Baglanti
            href={kayitAdresleri.urun(satir.urun.adresAdi)}
            target="_blank"
            gorunum="sade"
            aria-label={doldur(metin("yonetim.yorumlar.vitrindeGorAdi"), { urun: satir.urun.ad })}
            className="self-start px-2 text-kucuk"
          >
            <Ikon ad="yeni-sekme" />
            {metin("yonetim.yorumlar.vitrindeGor")}
          </Baglanti>
        ) : null}
      </span>
      {kararVerir ? <Eylemler satir={satir} suruyor={suruyor} islemYap={islemYap} /> : null}
    </span>
  );
}

export function YorumListesi({
  durum,
  veri,
  topluIslemler,
  kararVerir,
  urunGorur,
}: {
  durum: ListeDurumu;
  veri: ListeVerisi<YorumSatiri> | null;
  // Yöneticinin izni olan toplu işlemlerin kodları (sunucu süzer).
  topluIslemler: readonly string[];
  // Yorumu yayınlayabilir, reddedebilir ve ana sayfada gösterebilir mi (yorum.onayla).
  kararVerir: boolean;
  // Ürün ekranına bağlantı (urun.gor).
  urunGorur: boolean;
}) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(hataMetni);
  // İsteği süren kartlar: ref basışı hemen keser, durum düğmeyi aria-disabled çizer.
  const surenler = useRef(new Set<string>());
  const [surenKartlar, setSurenKartlar] = useState<ReadonlySet<string>>(new Set());
  const kok = useRef<HTMLDivElement>(null);
  const durumSorgusu = listeSorgusu(yorumListesiTanimi, durum).toString();
  // Eylemden sonra odaklanacak kartlar, öncelik sırasıyla (kendisi, sonraki, önceki), ve eylem anındaki veri: odak
  // yalnız yenilenen veri gelince yerleşir (eski listede yerleşip kart kalkınca kayboluyordu).
  const [odak, setOdak] = useState<{
    // Kartın kendisi, eylem anındaki sonraki ve önceki kart.
    kendisi: string;
    sonraki: string | undefined;
    onceki: string | undefined;
    sira: number;
    eskiVeri: ListeVerisi<YorumSatiri> | null;
    sorgu: string;
  } | null>(null);

  useEffect(() => {
    if (odak === null || odak.eskiVeri === veri || kok.current === null) return;
    const kap = kok.current;
    setOdak(null);
    // Kullanıcı arada başka bir listeye geçtiyse odak taşınmaz.
    if (odak.sorgu !== durumSorgusu) return;
    const ilkDugme = (kimlik: string | undefined) =>
      kimlik === undefined
        ? null
        : kap.querySelector<HTMLElement>(`[data-yorum="${kimlik}"] [data-yorum-eylemleri] button`);
    const satirlar = veri?.satirlar ?? [];
    const hedef =
      ilkDugme(odak.kendisi) ??
      ilkDugme(odak.sonraki) ??
      ilkDugme(satirlar[odak.sira]?.kimlik) ??
      ilkDugme(odak.onceki);
    if (hedef !== null && hedef !== undefined) hedef.focus();
    else kap.querySelector<HTMLElement>('nav [aria-current="page"]')?.focus();
  }, [veri, odak, durumSorgusu]);

  const islemYap = (satir: YorumSatiri, yol: string, govde: unknown, basari: MetinAnahtari) => {
    if (surenler.current.has(satir.kimlik)) return;
    surenler.current.add(satir.kimlik);
    setSurenKartlar(new Set(surenler.current));
    const eskiVeri = veri;
    const sorgu = durumSorgusu;
    const satirlar = veri?.satirlar ?? [];
    const sira = satirlar.findIndex((oge) => oge.kimlik === satir.kimlik);
    const sonraki = satirlar[sira + 1]?.kimlik;
    const onceki = satirlar[sira - 1]?.kimlik;
    void islem(yol, govde, basari).then((sonuc) => {
      surenler.current.delete(satir.kimlik);
      setSurenKartlar(new Set(surenler.current));
      // Yenilenen liste gelince odak yerleşir (useEffect). Yorum bulunamadıysa liste de yenilenir (usePanelIslemi);
      // öteki hatada sayfa yenilenmez, odak düğmede kalır.
      if (sonuc.tamam || sonuc.kod === "bulunamadi" || sonuc.kod === "cakisma") {
        setOdak({
          kendisi: satir.kimlik,
          sonraki,
          onceki,
          sira: Math.max(sira, 0),
          eskiVeri,
          sorgu,
        });
      }
    });
  };

  const sekme = (durum.suzgecler["durum"]?.[0] ?? "onay-bekliyor") as YorumDurumu;
  const islemler: TopluIslemTanimi<YorumSatiri>[] = yorumTopluIslemKodlari
    .filter(
      (kod) =>
        topluIslemler.includes(kod) &&
        (yorumTopluIslemleri[kod].sekmeler as readonly YorumDurumu[]).includes(sekme),
    )
    .map((kod) => ({
      kod,
      ad: metin(islemAdlari[kod]),
      onay: (sayi) => ({
        baslik: doldur(metin(`yonetim.yorumlar.toplu.${kod}.baslik`), { sayi: String(sayi) }),
        aciklama: metin(`yonetim.yorumlar.toplu.${kod}.aciklama`),
        onayEtiketi: metin(islemAdlari[kod]),
      }),
      uc: "yorumlar-toplu",
      govde: (satirlar) => ({
        islem: kod,
        yorumlar: satirlar.map((satir) => ({ yorum: satir.kimlik, gorulen: satir.durum })),
      }),
      basari: (sayi) =>
        doldur(metin(`yonetim.yorumlar.toplu.${kod}.basari`), { sayi: String(sayi) }),
      neden: (neden) => metin(nedenler[neden] ?? "yonetim.yorumlar.hata.genel"),
    }));

  return (
    <div ref={kok}>
      <Liste
        tanim={yorumListesiTanimi}
        durum={durum}
        veri={veri}
        ad={metin("yonetim.yorumlar.liste")}
        sutunlar={[]}
        gorunum="kartlar"
        telefon={(satir) => (
          <YorumKarti
            satir={satir}
            urunGorur={urunGorur}
            kararVerir={kararVerir}
            suruyor={surenKartlar.has(satir.kimlik)}
            islemYap={islemYap}
          />
        )}
        anahtar={(satir) => satir.kimlik}
        satirAdi={(satir) =>
          doldur(metin("yonetim.yorumlar.satirAdi"), { ad: satir.ad, urun: satir.urun.ad })
        }
        suzgecAdlari={{
          durum: {
            ad: metin("yonetim.yorumlar.suzgec.durum"),
            secenek: (deger) => metin(durumAdi(deger as YorumDurumu)),
          },
          puan: {
            ad: metin("yonetim.yorumlar.suzgec.puan"),
            secenek: (deger) => doldur(metin("yonetim.yorumlar.puanSecenegi"), { puan: deger }),
          },
        }}
        siralamaAdi={(kod) => metin(siralamalar[kod as YorumPanelSiralamasi])}
        arama={{
          etiket: metin("yonetim.yorumlar.ara"),
          yerTutucu: metin("yonetim.yorumlar.araYer"),
        }}
        bos={{
          ikon: "yorumlar",
          baslik: metin("yonetim.yorumlar.bos.baslik"),
          aciklama: metin("yonetim.yorumlar.bos.metin"),
        }}
        topluIslemler={islemler}
      />
    </div>
  );
}
