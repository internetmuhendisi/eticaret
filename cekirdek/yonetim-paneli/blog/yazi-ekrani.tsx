"use client";
// Blog yazısının ekranı (kart 0272, karar 0176; taslak: planlar/tasarim-yonu/panel.html, blogPanel "Yazı formu"): yeni
// yazı ve var olan yazı. Solda yazı (başlık, adres adı, özet, içerik) ve kapak görseli; sağda yayın, sınıflandırma
// (kategori, yazar adı) ve "Yazıyı kaldır". Tek form, "Kaydet" birlikte kaydeder; hata ve odak ortak form yapısındadır
// (karar 0159).
//
// - Yeni yazı yalnız başlıkla kaydedilebilir, taslak olarak başlar; kaydedilince yazının kendi ekranı açılır.
// - Değişiklikte yalnız değişen alanlar gider, ekranın gördüğü değişme anıyla (arada değişen yazı çakışır).
// - Kapak görseli seçilince blog-kapagi-yukle ucuyla hemen yüklenir, yazıya kayıtla bağlanır; alternatif metni zorunludur.
// - İçerik biçimli metindir; bağlantı kuralı vitrindeki temizlikle aynıdır (ürün açıklaması).
// - Değiştirme izni olmayan yönetici alanları okur, düğmeleri görmez; silme ayrıca icerik.sil ister.
import { useRouter } from "next/navigation";
import { type ReactNode, useRef, useState } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { BicimliMetinAlani } from "../../../bilesenler/parcalar/bicimli-metin-alani";
import { bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { DosyaYukleme } from "../../../bilesenler/parcalar/dosya-yukleme";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import {
  SecimDegeri,
  SecimKutusu,
  SecimListesi,
  SecimOgesi,
  SecimTetikleyici,
} from "../../../bilesenler/parcalar/secim-kutusu";
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
import { type BlogYaziDurumu, blogSinirlari } from "../../kayitlar/blog";
import { yuklenebilenTurler } from "../../kayitlar/dosya";
import { doldur } from "../../metinler/doldur";
import { usePanelMetni } from "../../metinler/panel-metni";
import { icerikHataMetinleri } from "../../moduller/icerik/semalar";
import { aciklamaBaglantisiGecerliMi } from "../../moduller/urun/aciklama-baglantisi";
import { blogAdresi, blogYazisiEkraniAdresi } from "../adresler";
import { dosyaHatasiMetni, useDosyaYuklemesi } from "../dosya-yuklemesi";
import { AlanKabi, KaydetCubugu, PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { panelGorseliAdresi } from "../gorsel-secimi";
import { kodluAlanHatalari, kodluHataMetni } from "../kodlu-form";
import { panelIkonu } from "../panel-ikon";
import { usePanelIslemi } from "../panel-islemi";
import { panelIstegi } from "../panel-istegi";
import { useSunucuFormu } from "../sunucu-formu";
import type { BlogYazisiFormu } from "./veri";

const hataMetni = kodluHataMetni(icerikHataMetinleri);
const kategorisiz = "kategorisiz";
const yayinSecenekleri = [
  "yayinda",
  "zamanlanmis",
  "taslak",
] as const satisfies readonly BlogYaziDurumu[];

// Formun alanları (hata ve odak). Kapağın dosyası "kapak", alternatif metni "kapakMetni" alanındadır.
const alanlar = [
  "baslik",
  "adresAdi",
  "ozet",
  "icerik",
  "kapak",
  "kapakMetni",
  "durum",
  "yayinZamani",
  "kategori",
  "yazar",
] as const;
const alaniEsle = (alan: string): string =>
  alan === "kapak.metin" ? "kapakMetni" : alan === "kapak.dosya" ? "kapak" : alan;

// Formun girdisi: yeni yazıda dolu alanlar, değişiklikte boş isteğe bağlı alan null.
const alanGirdisi = (form: BlogYazisiFormu, yeni: boolean): Record<string, unknown> => {
  const istege = (deger: string) => (deger.trim() === "" ? (yeni ? undefined : null) : deger);
  const alanlarin: Record<string, unknown> = {
    baslik: form.baslik,
    ...(yeni ? {} : { adresAdi: form.adresAdi }),
    ozet: istege(form.ozet),
    icerik: form.icerik,
    kapak: form.kapak === null ? (yeni ? undefined : null) : form.kapak,
    kategori: form.kategori === "" ? (yeni ? undefined : null) : form.kategori,
    yazar: istege(form.yazar),
    durum: form.durum,
    // Zamanlanmış durumda boş zaman gönderilmez (değişiklikte null): sunucu "yayın zamanı gerekli" der.
    yayinZamani:
      form.durum === "zamanlanmis" && form.yayinZamani !== ""
        ? form.yayinZamani
        : yeni
          ? undefined
          : null,
  };
  return Object.fromEntries(Object.entries(alanlarin).filter(([, deger]) => deger !== undefined));
};

// Değişiklikte yalnız sunucudan gelen hâline göre değişen alanlar gider: dokunulmayan yayın zamanı yaz saatinde kaymaz,
// düzenleyicinin yeniden yazdığı içerik değişmeden kayda girmez.
export const blogYazisiGirdisi = (
  form: BlogYazisiFormu,
  bilinen: BlogYazisiFormu,
  yeni: boolean,
): Record<string, unknown> => {
  const yeniHali = alanGirdisi(form, yeni);
  if (yeni) return yeniHali;
  const eskiHali = alanGirdisi(bilinen, false);
  return Object.fromEntries(
    Object.entries(yeniHali).filter(
      ([alan, deger]) => JSON.stringify(deger) !== JSON.stringify(eskiHali[alan]),
    ),
  );
};

export type BlogYazisiEkraniVerisi = {
  // Yeni yazıda yok.
  kimlik?: string;
  gorulen?: string;
  form: BlogYazisiFormu;
  yayinYazisi: string | null;
  kapakOlcusu: { genislik: number; yukseklik: number } | null;
  kategoriler: readonly { kimlik: string; ad: string }[];
  izinler: { degistir: boolean; sil: boolean; gorselGor: boolean };
  enCokDosyaBoyutu: string;
  dosyaTurleri: string;
};

function Bolum({
  kimlik,
  baslik,
  children,
}: {
  kimlik: string;
  baslik: string;
  children: ReactNode;
}) {
  return (
    <Kart
      role="region"
      className="flex min-w-0 flex-col gap-5 p-4 tablet:p-6"
      aria-labelledby={`${kimlik}-baslik`}
    >
      <h2 id={`${kimlik}-baslik`} className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {baslik}
      </h2>
      {children}
    </Kart>
  );
}

export function BlogYazisiEkrani({ veri }: { veri: BlogYazisiEkraniVerisi }) {
  const metin = usePanelMetni();
  const router = useRouter();
  const islem = usePanelIslemi(hataMetni);
  const izinli = veri.izinler.degistir;
  const yeni = veri.kimlik === undefined;
  const { form, setForm, bilinen, degisti, kaydedildi, vazgec } = useSunucuFormu<BlogYazisiFormu>(
    veri.form,
  );
  const { yukleme, yukle, iptalEt } = useDosyaYuklemesi();
  // Yeni yazı kaydedilince yazının ekranına geçilir; geçiş bitene kadar ikinci kayıt yapılmaz.
  const acilan = useRef(false);
  const pf = usePanelFormu({
    degisti: izinli && (degisti || yukleme !== null),
    kaydet: () => kaydet(),
  });
  const [silOnayi, setSilOnayi] = useState(false);
  // Yüklenen kapağın ölçüsü (önizlemenin yer tutucusu); kayıtlı kapakta sunucudan gelir.
  const [yeniOlcu, setYeniOlcu] = useState<{ genislik: number; yukseklik: number } | null>(null);

  const degistir = <Alan extends keyof BlogYazisiFormu>(alan: Alan, deger: BlogYazisiFormu[Alan]) =>
    setForm((onceki) => ({ ...onceki, [alan]: deger }));

  const kaydet = async (): Promise<boolean> => {
    if (acilan.current) return false;
    const gonderilen = form;
    const yazi = blogYazisiGirdisi(gonderilen, bilinen, yeni);
    const sonuc = await pf.isle(() =>
      yeni
        ? islem<{ kimlik: string }>("blog-yazisi-ekle", { yazi }, "yonetim.blog.eklendi", {
            formda: true,
          })
        : islem(
            "blog-yazisi-degistir",
            { kimlik: veri.kimlik, gorulen: veri.gorulen, yazi },
            "yonetim.blog.kaydedildi",
            { formda: true },
          ),
    );
    if (sonuc === undefined) return false;
    if (sonuc.tamam) {
      kaydedildi(gonderilen);
      pf.temizle();
      if (yeni) {
        acilan.current = true;
        router.replace(blogYazisiEkraniAdresi((sonuc.veri as { kimlik: string }).kimlik));
      }
      return true;
    }
    const alanHatalari = kodluAlanHatalari(icerikHataMetinleri, sonuc, alanlar, alaniEsle);
    pf.hatalariGoster(
      Object.fromEntries(
        Object.entries(alanHatalari).map(([alan, anahtar]) => [alan, metin(anahtar)]),
      ),
      Object.keys(alanHatalari).length > 0 ? [] : [metin(hataMetni(sonuc))],
    );
    return false;
  };

  const sil = async () => {
    if (veri.kimlik === undefined) return;
    // Sayfa yenilenmez (silinen yazının ekranı bulunamadı verirdi), listeye gidilir.
    const sonuc = await panelIstegi("blog-yazisi-sil", { kimlik: veri.kimlik });
    if (sonuc.tamam) {
      bildirimGoster("basari", metin("yonetim.blog.silindi"));
      router.push(blogAdresi);
    } else {
      bildirimGoster("tehlike", metin(hataMetni(sonuc)));
    }
  };

  const kapakSecildi = async (dosya: File) => {
    pf.temizle();
    const sonuc = await yukle<{ dosya: string; genislik: number; yukseklik: number }>(
      "blog-kapagi-yukle",
      dosya,
    );
    if (sonuc === undefined) return;
    if (sonuc.tamam) {
      setYeniOlcu({ genislik: sonuc.veri.genislik, yukseklik: sonuc.veri.yukseklik });
      setForm((onceki) => ({
        ...onceki,
        kapak: { dosya: sonuc.veri.dosya, metin: onceki.kapak?.metin ?? "" },
      }));
      return;
    }
    if (sonuc.kod === "iptal") {
      bildirimGoster("bilgi", metin("yonetim.dosya.iptalEdildi"));
      return;
    }
    pf.hatalariGoster(
      {
        kapak: doldur(metin(dosyaHatasiMetni(sonuc)), {
          boyut: veri.enCokDosyaBoyutu,
          turler: veri.dosyaTurleri,
        }),
      },
      [],
    );
  };

  const metinAlani = (
    alan: "baslik" | "adresAdi" | "yazar",
    etiket: string,
    { aciklama, zorunlu, onEk }: { aciklama?: string; zorunlu: boolean; onEk?: string },
  ) => (
    <PanelAlani ad={alan} etiket={etiket} aciklama={aciklama} zorunlu={zorunlu}>
      {(baglanti) => (
        <span className="flex min-w-0 items-stretch">
          {onEk === undefined ? null : (
            <span
              aria-hidden="true"
              className="flex items-center rounded-l-kucuk border border-r-0 border-alan-kenari bg-yuzey px-3 text-soluk-yazi"
            >
              {onEk}
            </span>
          )}
          <GirisAlani
            {...baglanti}
            name={alan}
            autoComplete="off"
            value={form[alan]}
            disabled={!izinli}
            onChange={(olay) => degistir(alan, olay.target.value)}
            className={onEk === undefined ? undefined : "rounded-l-none"}
          />
        </span>
      )}
    </PanelAlani>
  );

  const kapakHatasi = pf.hata("kapak");
  const kapakOlcusu = form.kapak?.dosya === veri.form.kapak?.dosya ? veri.kapakOlcusu : yeniOlcu;
  const kapak = (
    <Bolum kimlik="blog-kapak" baslik={metin("yonetim.blog.bolum.kapak")}>
      <AlanKabi ad="kapak" etiket={metin("yonetim.blog.kapak")}>
        <div className="flex flex-wrap items-center gap-3 rounded-kucuk border border-alan-kenari p-2">
          {form.kapak === null || !veri.izinler.gorselGor ? null : (
            // biome-ignore lint/performance/noImgElement: önizleme panelin görsel ucundan, boyutlarıyla gelir.
            <img
              src={panelGorseliAdresi(form.kapak.dosya)}
              alt=""
              width={kapakOlcusu?.genislik}
              height={kapakOlcusu?.yukseklik}
              className="aspect-16/10 h-16 w-auto rounded-kucuk bg-yuzey object-cover"
            />
          )}
          <p className="m-0 min-w-0 flex-1 text-kucuk">
            {metin(form.kapak === null ? "yonetim.blog.kapakYok" : "yonetim.blog.kapakVar")}
          </p>
          {izinli ? (
            <DosyaYukleme
              id="blog-kapak-yukle"
              secEtiketi={metin(
                form.kapak === null ? "yonetim.blog.kapakYukle" : "yonetim.blog.kapakDegistir",
              )}
              ikon={panelIkonu("yukle")}
              tur="sade"
              kabul={yuklenebilenTurler}
              onSecildi={([dosya]) => {
                if (dosya !== undefined) void kapakSecildi(dosya);
              }}
              yukleme={yukleme}
              ilerlemeEtiketi={doldur(metin("yonetim.dosya.ilerleme"), {
                ad: metin("yonetim.blog.kapak"),
              })}
              iptalEtiketi={metin("yonetim.dosya.iptal")}
              onIptal={iptalEt}
              {...(kapakHatasi === undefined
                ? {}
                : { "aria-invalid": true, "aria-describedby": "blog-kapak-hata" })}
            >
              {form.kapak !== null && yukleme === null ? (
                <Dugme tur="sade" onClick={() => degistir("kapak", null)}>
                  {metin("yonetim.blog.kapakKaldir")}
                </Dugme>
              ) : null}
            </DosyaYukleme>
          ) : null}
        </div>
        {kapakHatasi === undefined ? null : (
          <p id="blog-kapak-hata" className="m-0 mt-2 font-kalin text-tehlike-yazi">
            {kapakHatasi}
          </p>
        )}
      </AlanKabi>
      <p className="m-0 text-kucuk text-soluk-yazi">
        {doldur(metin("yonetim.blog.kapakAciklamasi"), {
          boyut: veri.enCokDosyaBoyutu,
          turler: veri.dosyaTurleri,
        })}
      </p>
      {form.kapak === null ? null : (
        <PanelAlani
          ad="kapakMetni"
          etiket={metin("yonetim.blog.kapakMetni")}
          aciklama={metin("yonetim.blog.kapakMetniAciklamasi")}
          zorunlu
        >
          {(baglanti) => (
            <GirisAlani
              {...baglanti}
              name="kapakMetni"
              autoComplete="off"
              maxLength={blogSinirlari.kapakMetni}
              value={form.kapak?.metin ?? ""}
              disabled={!izinli}
              onChange={(olay) => {
                const deger = olay.target.value;
                setForm((onceki) =>
                  onceki.kapak === null
                    ? onceki
                    : { ...onceki, kapak: { ...onceki.kapak, metin: deger } },
                );
              }}
            />
          )}
        </PanelAlani>
      )}
    </Bolum>
  );

  const yazi = (
    <Bolum kimlik="blog-yazi" baslik={metin("yonetim.blog.bolum.yazi")}>
      {metinAlani("baslik", metin("yonetim.blog.baslik"), { zorunlu: true })}
      {yeni
        ? null
        : metinAlani("adresAdi", metin("yonetim.blog.adresAdi"), {
            aciklama: metin("yonetim.blog.adresAdiAciklamasi"),
            zorunlu: true,
            onEk: "/blog/",
          })}
      <PanelAlani
        ad="ozet"
        etiket={metin("yonetim.blog.ozet")}
        aciklama={doldur(metin("yonetim.blog.ozetAciklamasi"), {
          sayi: String(blogSinirlari.ozet),
        })}
        zorunlu={false}
      >
        {(baglanti) => (
          <UzunMetinAlani
            {...baglanti}
            name="ozet"
            rows={2}
            maxLength={blogSinirlari.ozet}
            value={form.ozet}
            disabled={!izinli}
            onChange={(olay) => degistir("ozet", olay.target.value)}
          />
        )}
      </PanelAlani>
      <PanelAlani ad="icerik" etiket={metin("yonetim.blog.icerik")} zorunlu={false}>
        {(baglanti) => (
          <BicimliMetinAlani
            {...baglanti}
            etiket={metin("yonetim.blog.icerik")}
            deger={form.icerik}
            onDegerDegisti={(html) => degistir("icerik", html)}
            baglantiGecerliMi={aciklamaBaglantisiGecerliMi}
            disabled={!izinli}
            metinler={{
              aracCubugu: doldur(metin("yonetim.bicimliMetin.aracCubugu"), {
                alan: metin("yonetim.blog.icerik"),
              }),
              kalin: metin("yonetim.bicimliMetin.kalin"),
              egik: metin("yonetim.bicimliMetin.egik"),
              araBaslik: metin("yonetim.bicimliMetin.araBaslik"),
              maddeListesi: metin("yonetim.bicimliMetin.maddeListesi"),
              siraliListe: metin("yonetim.bicimliMetin.siraliListe"),
              baglanti: metin("yonetim.bicimliMetin.baglanti"),
              baglantiAdresi: metin("yonetim.bicimliMetin.baglantiAdresi"),
              baglantiUygula: metin("yonetim.bicimliMetin.baglantiUygula"),
              baglantiKaldir: metin("yonetim.bicimliMetin.baglantiKaldir"),
              baglantiGecersiz: metin("yonetim.bicimliMetin.baglantiGecersiz"),
            }}
          />
        )}
      </PanelAlani>
    </Bolum>
  );

  const yayin = (
    <Kart className="flex flex-col gap-4 p-4 tablet:p-6">
      <h2 className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {metin("yonetim.blog.bolum.yayin")}
      </h2>
      <AlanKabi ad="durum" etiket={metin("yonetim.blog.yayinDurumu")}>
        <SecenekGrubu
          baslik={<span className="sr-only">{metin("yonetim.blog.yayinDurumu")}</span>}
          etiket={metin("yonetim.blog.yayinDurumu")}
          ogeler={yayinSecenekleri.map((durum) => ({
            deger: durum,
            ad: metin(`yonetim.blog.durum.${durum}`),
            ...(izinli ? {} : { secilemez: true }),
          }))}
          deger={form.durum}
          onDegerDegisti={(deger) => {
            if (izinli) degistir("durum", deger as BlogYaziDurumu);
          }}
          secilemezEki=""
          {...(pf.hata("durum") === undefined ? {} : { hata: pf.hata("durum") ?? "" })}
        />
      </AlanKabi>
      {form.durum === "zamanlanmis" ? (
        <PanelAlani
          ad="yayinZamani"
          etiket={metin("yonetim.blog.yayinZamani")}
          aciklama={metin("yonetim.blog.yayinZamaniAciklamasi")}
          zorunlu
        >
          {(baglanti) => (
            <GirisAlani
              {...baglanti}
              name="yayinZamani"
              type="datetime-local"
              value={form.yayinZamani}
              disabled={!izinli}
              onChange={(olay) => degistir("yayinZamani", olay.target.value)}
            />
          )}
        </PanelAlani>
      ) : null}
      {veri.yayinYazisi === null || form.durum !== "yayinda" ? null : (
        <p className="m-0 text-kucuk text-soluk-yazi">
          {doldur(metin("yonetim.blog.yayinTarihi"), { zaman: veri.yayinYazisi })}
        </p>
      )}
    </Kart>
  );

  const siniflandirma = (
    <Kart className="flex flex-col gap-4 p-4 tablet:p-6">
      <h2 className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {metin("yonetim.blog.bolum.siniflandirma")}
      </h2>
      <PanelAlani
        ad="kategori"
        etiket={metin("yonetim.blog.kategori")}
        aciklama={metin("yonetim.blog.kategoriAciklamasi")}
        zorunlu={false}
      >
        {(baglanti) => (
          <SecimKutusu
            value={form.kategori === "" ? kategorisiz : form.kategori}
            onValueChange={(deger) => degistir("kategori", deger === kategorisiz ? "" : deger)}
            disabled={!izinli}
          >
            <SecimTetikleyici {...baglanti}>
              <SecimDegeri />
            </SecimTetikleyici>
            <SecimListesi>
              <SecimOgesi value={kategorisiz}>{metin("yonetim.blog.kategorisiz")}</SecimOgesi>
              {veri.kategoriler.map((kategori) => (
                <SecimOgesi key={kategori.kimlik} value={kategori.kimlik}>
                  {kategori.ad}
                </SecimOgesi>
              ))}
            </SecimListesi>
          </SecimKutusu>
        )}
      </PanelAlani>
      {metinAlani("yazar", metin("yonetim.blog.yazar"), {
        aciklama: metin("yonetim.blog.yazarAciklamasi"),
        zorunlu: false,
      })}
    </Kart>
  );

  const kaldir =
    yeni || !veri.izinler.sil ? null : (
      <Kart className="flex flex-col gap-3 p-4 tablet:p-6">
        <h2 className="font-baslik text-baslik-4 font-baslik-kalinligi">
          {metin("yonetim.blog.kaldirBasligi")}
        </h2>
        <Dugme tur="cerceveli" className="self-start" onClick={() => setSilOnayi(true)}>
          <Ikon ad="sil" />
          {metin("yonetim.blog.sil")}
        </Dugme>
        <p className="m-0 text-kucuk text-soluk-yazi">{metin("yonetim.blog.kaldirAciklamasi")}</p>
      </Kart>
    );

  return (
    <>
      <PanelFormu
        durum={pf}
        gonder={async () => {
          await kaydet();
        }}
      >
        <div className="grid gap-6 masaustu:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-6 masaustu:col-span-2">
            {yazi}
            {kapak}
            {izinli ? (
              <KaydetCubugu
                sayfada
                durumYazisi
                degisiklikGerekli={!yeni}
                kaydetEtiketi={metin(yeni ? "yonetim.blog.ekle" : "yonetim.blog.kaydet")}
                vazgec={() => {
                  if (yeni) {
                    router.push(blogAdresi);
                    return;
                  }
                  vazgec();
                  pf.temizle();
                }}
              />
            ) : null}
          </div>
          <div className="flex flex-col gap-6 masaustu:sticky masaustu:top-4 masaustu:self-start">
            {yayin}
            {siniflandirma}
            {kaldir}
          </div>
        </div>
      </PanelFormu>
      <OnayPenceresi
        acik={silOnayi}
        acikDegisince={setSilOnayi}
        baslik={doldur(metin("yonetim.blog.silOnay.baslik"), { baslik: veri.form.baslik })}
        aciklama={metin("yonetim.blog.silOnay.aciklama")}
        onayEtiketi={metin("yonetim.blog.sil")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={sil}
        tur="tehlike"
      />
    </>
  );
}
