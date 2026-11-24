"use client";
// Blog kategorileri ekranı (kart 0272, karar 0176; taslağın notu: "Blog kategorileri listenin üstündeki Kategoriler
// bağlantısından yönetilir, yalnız ad ve sıra"). Kısa liste: elle sıralanır (taşınır taşınmaz kaydedilir), her satırda
// düzenle ve sil. Form yan penceredir: ad ve adres adı. Silme onay penceresiyle sorulur ve kaç yazının kategorisiz
// kalacağını söyler; yazılar silinmez.
//
// Her değişiklik hemen yayınlanır; sonuç bildirimle verilir, verisi sunucudan yeniden okunur (usePanelIslemi).
import { useEffect, useRef, useState } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { Dugme, IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart, KartBasligi, KartUstu } from "../../../bilesenler/parcalar/kart";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { SiralanabilirListe } from "../../../bilesenler/parcalar/siralanabilir-liste";
import {
  YanPencere,
  YanPencereAciklamasi,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereUstu,
} from "../../../bilesenler/parcalar/yan-pencere";
import { adresAdiUret } from "../../metinler/adres-adi";
import { doldur } from "../../metinler/doldur";
import { usePanelMetni } from "../../metinler/panel-metni";
import { siralamaMetinleri } from "../../metinler/siralama-metinleri";
import { icerikHataMetinleri } from "../../moduller/icerik/semalar";
import { blogListesiAdresi } from "../../vitrin/adresler";
import { panelEylemleri } from "../eylemler";
import { KaydetCubugu, PanelAlani, PanelFormu } from "../form/panel-formu";
import { useKapatmaSorusu } from "../kapatma-sorusu";
import { kodluHataMetni, useKodluForm } from "../kodlu-form";
import { usePanelIslemi } from "../panel-islemi";
import type { BlogKategoriSatiri } from "./veri";

const hataMetni = kodluHataMetni(icerikHataMetinleri);

type Pencere = { tur: "ekle" } | { tur: "duzenle"; kategori: BlogKategoriSatiri } | null;

export function BlogKategorileri({
  kategoriler,
  izinler,
}: {
  kategoriler: BlogKategoriSatiri[];
  izinler: { degistir: boolean; sil: boolean };
}) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(hataMetni);
  const [pencere, setPencere] = useState<Pencere>(null);
  const [onay, setOnay] = useState<BlogKategoriSatiri | null>(null);
  const { kapat, kapatmayiIste, degisince, soru } = useKapatmaSorusu(() => setPencere(null));
  // Sıralama hemen gösterilir, kayıt arkadan; kaydedilemezse sunucunun sırasına dönülür.
  const [yerel, setYerel] = useState<BlogKategoriSatiri[] | null>(null);
  const sonSiralama = useRef(0);
  const anahtar = kategoriler.map((k) => `${k.kimlik}:${k.ad}`).join();
  // biome-ignore lint/correctness/useExhaustiveDependencies: sunucunun listesi değişince yerel sıra bırakılır.
  useEffect(() => setYerel(null), [anahtar]);
  const liste = yerel ?? kategoriler;
  // Sayfa yenilenince odaklanacak satır (kimliği; "" ise "ekle" düğmesi): silinen satır kalkar, odak kaybolmasın.
  const odaklanacak = useRef<string | null>(null);
  const silindi = useRef(false);
  useEffect(() => {
    const hedef = odaklanacak.current;
    // Sayfanın yeni verisi gelince (kategoriler) odak yerleşir.
    if (hedef === null || kategoriler === undefined) return;
    const oge =
      hedef === ""
        ? document.querySelector<HTMLElement>("[data-blog-kategorisi-ekle]")
        : document.querySelector<HTMLElement>(
            `[data-blog-kategorisi="${hedef}"] button[data-duzenle]`,
          );
    if (oge === null) return;
    odaklanacak.current = null;
    oge.focus();
  }, [kategoriler]);

  const duzenlenen = pencere?.tur === "duzenle" ? pencere.kategori : undefined;
  const ekleAdi = doldur(metin(panelEylemleri.ekle.ad), { ne: metin("yonetim.blog.kategoriTek") });
  const satir = (kategori: BlogKategoriSatiri) => {
    const sira = liste.findIndex((k) => k.kimlik === kategori.kimlik);
    return (
      <div
        className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2"
        data-blog-kategorisi={kategori.kimlik}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 break-words">
          <span className="font-kalin">{kategori.ad}</span>
          <span className="text-kucuk text-soluk-yazi">
            {[
              doldur(metin("yonetim.blog.yaziSayisi"), { sayi: String(kategori.yaziSayisi) }),
              blogListesiAdresi({ kategori: kategori.adresAdi }),
            ].join(metin("yonetim.kategori.ayrac"))}
          </span>
        </div>
        <div className="flex shrink-0 items-center">
          {izinler.degistir ? (
            <IkonDugmesi
              ikon="duzenle"
              data-duzenle=""
              etiket={doldur(metin("yonetim.kategori.duzenle"), { ad: kategori.ad })}
              onClick={() => setPencere({ tur: "duzenle", kategori })}
            />
          ) : null}
          {izinler.sil ? (
            <IkonDugmesi
              ikon="sil"
              etiket={doldur(metin("yonetim.kategori.silAdli"), { ad: kategori.ad })}
              onClick={() => {
                // Silinince odak sonraki satıra, yoksa öncekine, yoksa "ekle" düğmesine geçer.
                odaklanacak.current = (liste[sira + 1] ?? liste[sira - 1])?.kimlik ?? "";
                setOnay(kategori);
              }}
            />
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <section aria-labelledby="blog-kategorileri" className="max-w-metin">
      <Kart>
        <KartUstu className="items-center">
          <KartBasligi duzey={2} id="blog-kategorileri">
            {metin("yonetim.sayfa.blogKategorileri.ad")}
          </KartBasligi>
          {izinler.degistir && liste.length > 0 ? (
            <Dugme
              tur="cerceveli"
              data-blog-kategorisi-ekle=""
              onClick={() => setPencere({ tur: "ekle" })}
            >
              <Ikon ad={panelEylemleri.ekle.ikon} />
              {ekleAdi}
            </Dugme>
          ) : null}
        </KartUstu>
        {liste.length === 0 ? (
          <BosHal
            ikon="yazi"
            duzey={3}
            baslik={metin("yonetim.blog.kategoriBos.baslik")}
            aciklama={metin("yonetim.blog.kategoriBos.aciklama")}
          >
            {izinler.degistir ? (
              <Dugme
                tur="birincil"
                data-blog-kategorisi-ekle=""
                onClick={() => setPencere({ tur: "ekle" })}
              >
                {ekleAdi}
              </Dugme>
            ) : null}
          </BosHal>
        ) : izinler.degistir ? (
          <SiralanabilirListe
            ogeler={liste}
            anahtar={(kategori) => kategori.kimlik}
            ad={(kategori) => kategori.ad}
            etiket={metin("yonetim.sayfa.blogKategorileri.ad")}
            metinler={siralamaMetinleri(metin)}
            siralaninca={(yeni) => {
              setYerel(yeni);
              sonSiralama.current += 1;
              const bu = sonSiralama.current;
              void islem(
                "blog-kategorileri-sirala",
                { kimlikler: yeni.map((kategori) => kategori.kimlik) },
                "yonetim.blog.kategoriSiralandi",
              ).then((sonuc) => {
                if (!sonuc.tamam && bu === sonSiralama.current) setYerel(null);
              });
            }}
            satir={satir}
          />
        ) : (
          <ol
            aria-label={metin("yonetim.sayfa.blogKategorileri.ad")}
            className="m-0 flex list-none flex-col gap-2 p-0"
          >
            {liste.map((kategori) => (
              <li
                key={kategori.kimlik}
                className="flex rounded-orta border border-kenar bg-zemin px-4 py-3"
              >
                {satir(kategori)}
              </li>
            ))}
          </ol>
        )}
        <YanPencere
          open={pencere !== null}
          onOpenChange={(acik) => (acik ? undefined : kapatmayiIste())}
        >
          {pencere === null ? null : (
            <YanPencereIcerigi
              kapatEtiketi={metin("ortak.parca.kapat")}
              className="tablet:max-w-metin"
            >
              <YanPencereUstu>
                <YanPencereBasligi>
                  {metin(
                    duzenlenen === undefined
                      ? "yonetim.blog.kategoriForm.yeni"
                      : "yonetim.blog.kategoriForm.duzenle",
                  )}
                </YanPencereBasligi>
                <YanPencereAciklamasi>
                  {duzenlenen === undefined
                    ? metin("yonetim.blog.kategoriForm.aciklama")
                    : duzenlenen.ad}
                </YanPencereAciklamasi>
              </YanPencereUstu>
              {soru}
              <KategoriFormu
                key={duzenlenen?.kimlik ?? "yeni"}
                {...(duzenlenen === undefined ? {} : { kategori: duzenlenen })}
                islem={islem}
                kapat={() => {
                  if (duzenlenen !== undefined) odaklanacak.current = duzenlenen.kimlik;
                  kapat();
                }}
                vazgec={kapatmayiIste}
                degisince={degisince}
              />
            </YanPencereIcerigi>
          )}
        </YanPencere>
        <OnayPenceresi
          acik={onay !== null}
          acikDegisince={(acik) => {
            if (acik) return;
            if (!silindi.current) odaklanacak.current = null;
            silindi.current = false;
            setOnay(null);
          }}
          baslik={doldur(metin("yonetim.blog.kategoriSilOnay.baslik"), { ad: onay?.ad ?? "" })}
          aciklama={
            onay === null || onay.yaziSayisi === 0
              ? metin("yonetim.blog.kategoriSilOnay.yazisiz")
              : doldur(metin("yonetim.blog.kategoriSilOnay.yazilar"), {
                  sayi: String(onay.yaziSayisi),
                })
          }
          onayEtiketi={metin("yonetim.kategori.sil")}
          vazgecEtiketi={metin("ortak.islem.vazgec")}
          onayla={async () => {
            if (onay === null) return;
            const sonuc = await islem(
              "blog-kategorisi-sil",
              { kimlik: onay.kimlik },
              "yonetim.blog.kategoriSilindi",
            );
            if (!sonuc.tamam) odaklanacak.current = null;
            silindi.current = sonuc.tamam;
          }}
        />
      </Kart>
    </section>
  );
}

function KategoriFormu({
  kategori,
  islem,
  kapat,
  vazgec,
  degisince,
}: {
  kategori?: BlogKategoriSatiri;
  islem: ReturnType<typeof usePanelIslemi>;
  kapat: () => void;
  vazgec: () => void;
  degisince: (degisti: boolean) => void;
}) {
  const metin = usePanelMetni();
  const [ad, setAd] = useState(kategori?.ad ?? "");
  const [adresAdi, setAdresAdi] = useState(kategori?.adresAdi ?? "");
  const [degisti, setDegisti] = useState(false);
  const { pf, kaydet } = useKodluForm(icerikHataMetinleri, ["ad", "adresAdi"], degisti);
  const degistir = (ayarla: (deger: string) => void) => (deger: string) => {
    ayarla(deger);
    setDegisti(true);
    degisince(true);
  };
  // Boş alan: yeni kayıtta adres addan üretilir, düzenlemede şimdiki adres kalır.
  const ornekAdresAdi =
    adresAdi.trim() === "" ? (kategori?.adresAdi ?? adresAdiUret(ad)) : adresAdi.trim();
  const gonder = () => {
    const adres = adresAdi.trim() === "" ? {} : { adresAdi: adresAdi.trim() };
    void kaydet(
      () =>
        kategori === undefined
          ? islem(
              "blog-kategorisi-ekle",
              { kategori: { ad, ...adres } },
              "yonetim.blog.kategoriEklendi",
              { formda: true },
            )
          : islem(
              "blog-kategorisi-degistir",
              { kimlik: kategori.kimlik, kategori: { ad, ...adres } },
              "yonetim.blog.kategoriKaydedildi",
              { formda: true },
            ),
      kapat,
    );
  };
  return (
    <PanelFormu durum={pf} gonder={gonder}>
      <PanelAlani ad="ad" etiket={metin("yonetim.kategori.form.ad")} zorunlu>
        {(alan) => (
          <GirisAlani
            {...alan}
            required
            value={ad}
            onChange={(olay) => degistir(setAd)(olay.target.value)}
          />
        )}
      </PanelAlani>
      <PanelAlani
        ad="adresAdi"
        etiket={metin("yonetim.kategori.form.adresAdi")}
        aciklama={
          ornekAdresAdi === ""
            ? metin("yonetim.kategori.form.adresAdiAciklamasiBos")
            : doldur(
                metin(
                  kategori === undefined
                    ? "yonetim.kategori.form.adresAdiAciklamasiYeni"
                    : "yonetim.kategori.form.adresAdiAciklamasi",
                ),
                { adres: blogListesiAdresi({ kategori: ornekAdresAdi }) },
              )
        }
        zorunlu={false}
      >
        {(alan) => (
          <GirisAlani
            {...alan}
            value={adresAdi}
            {...(ornekAdresAdi === "" ? {} : { placeholder: ornekAdresAdi })}
            onChange={(olay) => degistir(setAdresAdi)(olay.target.value)}
          />
        )}
      </PanelAlani>
      <KaydetCubugu vazgec={vazgec} kaydetEtiketi={metin("ortak.islem.kaydet")} />
    </PanelFormu>
  );
}
