"use client";
// Ürün ekranı (kart 0263, karar 0162; taslak: planlar/tasarim-yonu/panel.html, urunEkrani): tek sayfa, bölümler alt
// alta (karar 0157). Solda (masaüstünde) bölümlerin kartları, sağda "Bu sayfada" bağlantıları, yayın ve "Ürünü
// kaldır". Bütün bölümler tek formdur, "Kaydet" birlikte kaydeder; hata ve odak ortak form yapısındadır (karar 0159).
// Seçenekler bölümü kart 0264'ten (secenekler-bolumu.tsx, karar 0163); fiyat, stok ve galeri sonraki kartlarda
// (0265, 0266) bu sayfaya eklenir.
//
// - Yeni ürün yalnız adla kaydedilebilir, taslak olarak başlar; kaydedilince ürünün kendi ekranı açılır.
// - Ağırlık ve sayı türündeki özellik sitenin sayı biçimiyle yazılır, sunucu okur (panel-girdisi.ts).
// - Kategori, marka, etiket ve ilgili ürünler kayıt arayarak seçilir. Açıklama biçimli metindir; bağlantı kuralı
//   vitrindeki temizlikle aynıdır.
// - Değiştirme izni olmayan yönetici alanları okur, düğmeleri görmez; silme ayrıca urun.sil ister.
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { BicimliMetinAlani } from "../../../bilesenler/parcalar/bicimli-metin-alani";
import { bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
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
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
import { ilgiliUrunSiniri } from "../../kayitlar/urun";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { fiyatHataMetinleri } from "../../moduller/fiyat/semalar";
import { stokHataMetinleri } from "../../moduller/stok/semalar";
import { aciklamaBaglantisiGecerliMi } from "../../moduller/urun/aciklama-baglantisi";
import { urunHataMetinleri } from "../../moduller/urun/semalar";
import { urunEkraniAdresi, urunlerAdresi } from "../adresler";
import { CokluKayitSecimi } from "../coklu-kayit-secimi";
import { AlanKabi, KaydetCubugu, PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { KayitArama } from "../kayit-arama";
import { kodluAlanHatalari, kodluHataMetni } from "../kodlu-form";
import { usePanelIslemi } from "../panel-islemi";
import { panelIstegi } from "../panel-istegi";
import { useSunucuFormu } from "../sunucu-formu";
import { FiyatBolumu, FiyatGecmisi, StokBolumu, StokGecmisi } from "./fiyat-stok-bolumleri";
import { fiyatStokGirdisi, urunFormunuUzlastir } from "./fiyat-stok-formu";
import { SeceneklerBolumu } from "./secenekler-bolumu";
import type { UrunEkraniVerisi, UrunFormu } from "./urun-verisi";
import { type BirlesimSatiri, birlesimSatirlari, varyantGirdisi } from "./varyant-formu";

const vergisiz = "vergisiz";
const secilmedi = "secilmedi";

// Ekranda seçilebilen yayın durumları; arşiv "Ürünü kaldır"dan yapılır, arşivdeki üründe ayrıca görünür.
const yayinSecenekleri = ["yayinda", "zamanlanmis", "taslak", "gizli"] as const;

const bolumler = [
  { kimlik: "urun-genel", ad: "yonetim.urunEkrani.bolum.genel" },
  { kimlik: "urun-siniflandirma", ad: "yonetim.urunEkrani.bolum.siniflandirma" },
  { kimlik: "urun-secenekler", ad: "yonetim.urunEkrani.bolum.secenekler" },
  { kimlik: "urun-fiyat", ad: "yonetim.urunEkrani.bolum.fiyat" },
  { kimlik: "urun-stok", ad: "yonetim.urunEkrani.bolum.stok" },
  { kimlik: "urun-satis", ad: "yonetim.urunEkrani.bolum.satis" },
  { kimlik: "urun-ozellikler", ad: "yonetim.urunEkrani.bolum.ozellikler" },
  { kimlik: "urun-ilgili", ad: "yonetim.urunEkrani.bolum.ilgili" },
] as const satisfies readonly { kimlik: string; ad: MetinAnahtari }[];

// Ürünün, fiyatın ve stoğun kodları (kart 0265): fiyat ve stok bölümlerinin hatası kendi modülünün koduyla gelir.
const hataMetinleri = { ...stokHataMetinleri, ...fiyatHataMetinleri, ...urunHataMetinleri };
const hataMetni = kodluHataMetni(hataMetinleri);

// Formun alanları (hata ve odak); özelliklerin alanı "ozellik.<kimlik>".
const sabitAlanlar = [
  "ad",
  "adresAdi",
  "kisaAciklama",
  "uzunAciklama",
  "kategoriler",
  "marka",
  "etiketler",
  "vergiSinifi",
  "kargoGerekmez",
  "stokKodu",
  "barkod",
  "agirlik",
  "enAzAdet",
  "enCokAdet",
  "durum",
  "yayinZamani",
  "ilgiliUrunler",
  // Seçenekler bölümü: hata girdideki yerin yoluyla gelir ("secenekler.0.degerler.2", "birlesimler.3.stokKodu").
  "secenekler",
  "birlesimler",
  // Fiyat ve stok bölümleri (kart 0265): "fiyat.satisFiyati", ortak sebep ve not; "fiyat" ve "stok" yetki hatası.
  "fiyat",
  "stok",
  "stokTakibi",
  "dusukStokEsigi",
  "baslangicStogu",
  "stokSebebi",
  "stokNotu",
] as const;

// Alım adedi tam sayı olarak gider; sayı olmayan yazı olduğu gibi gider, sunucu alanın hatasıyla reddeder.
const adet = (yazi: string): number | string =>
  /^\d{1,9}$/.test(yazi.trim()) ? Number(yazi) : yazi;

// Formun alanlarının girdisi. Yeni üründe boş isteğe bağlı alan gönderilmez, değişiklikte boşaltılır (null).
// Özelliklerin gönderilme sırası hatanın yolunu alana eşlemek için döner.
const alanGirdisi = (form: UrunFormu, veri: UrunEkraniVerisi) => {
  const yeni = veri.kimlik === undefined;
  const istege = (deger: string) => (deger.trim() === "" ? (yeni ? undefined : null) : deger);
  const ozellikSirasi: string[] = [];
  const ozellikler = veri.ozellikler.flatMap((ozellik) => {
    const deger = form.ozellikler[ozellik.kimlik] ?? "";
    if (deger.trim() === "") return [];
    ozellikSirasi.push(ozellik.kimlik);
    return [
      {
        ozellik: ozellik.kimlik,
        deger: ozellik.tur === "evet-hayir" ? deger === "evet" : deger,
      },
    ];
  });
  const alanlar: Record<string, unknown> = {
    ad: form.ad,
    ...(yeni ? {} : { adresAdi: form.adresAdi }),
    kisaAciklama: istege(form.kisaAciklama),
    uzunAciklama: istege(form.uzunAciklama),
    kategoriler: form.kategoriler.map((kayit) => kayit.kimlik),
    marka: form.marka?.kimlik ?? null,
    etiketler: form.etiketler.map((kayit) => kayit.kimlik),
    vergiSinifi: form.vergiSinifi === "" ? null : form.vergiSinifi,
    kargoGerekmez: form.kargoGerekmez,
    enAzAdet: adet(form.enAzAdet),
    enCokAdet: form.enCokAdet.trim() === "" ? (yeni ? undefined : null) : adet(form.enCokAdet),
    // Stok bölümünün ürün alanları (kart 0265): takip ve ürünün düşük stok eşiği (boşsa mağazanınki).
    stokTakibi: form.stokTakibi,
    dusukStokEsigi:
      form.dusukStokEsigi.trim() === "" ? (yeni ? undefined : null) : adet(form.dusukStokEsigi),
    durum: form.durum,
    // Zamanlanmış durumda boş zaman gönderilmez (değişiklikte null): sunucu "yayın zamanı gerekli" der.
    yayinZamani:
      form.durum === "zamanlanmis" && form.yayinZamani !== ""
        ? form.yayinZamani
        : yeni
          ? undefined
          : null,
    ilgiliUrunler: form.ilgiliUrunler.map((kayit) => kayit.kimlik),
    ozellikler,
    // Seçenekli üründe birimin alanları her birleşimdedir (kart 0264): formda seçenek varsa gönderilmez (basit birimin
    // alanları ilk birleşime geçer, tabloda görünür). Son seçeneği kaldırılan ürünün alanları gider: uç seçenekleri önce
    // yazar, ürün basit olur.
    ...(form.varyant.secenekler.length === 0
      ? {
          stokKodu: istege(form.stokKodu),
          barkod: istege(form.barkod),
          agirlik: istege(form.agirlik),
        }
      : {}),
  };
  return {
    girdi: Object.fromEntries(Object.entries(alanlar).filter(([, deger]) => deger !== undefined)),
    ozellikSirasi,
  };
};

// Basit ürünün birim alanları: seçenek eklenince ilk birleşime dönen birimin tablodaki başlangıcı (karar 0163). Formdaki
// hâli: seçenek eklemeden önce satış bölümüne yazılan değer kaybolmaz (bağımsız kontrolün bulgusu); ilk satır kayıtlı
// sayıldığı için alanlarıyla gider.
export const basitBirimAlanlari = (form: UrunFormu, veri: UrunEkraniVerisi) =>
  veri.tur === "basit"
    ? {
        stokKodu: form.stokKodu,
        barkod: form.barkod,
        agirlik: form.agirlik,
        gorsel: null,
        // Fiyat ve stok (kart 0265): fiyat formdaki hâli, stok sunucudaki miktar (stok pencereyle değişir).
        satisFiyati: form.fiyat.satisFiyati,
        indirimliFiyat: form.fiyat.indirimliFiyat,
        stok: String(veri.fiyatStok.birimler[""]?.stok ?? 0),
      }
    : undefined;

// Sunucuya giden girdi: yeni üründe bütün dolu alanlar, değişiklikte yalnız sunucudan gelen hâline göre değişen alanlar
// (bağımsız kontrolün bulgusu). Dokunulmayan alan yeniden yazılmaz: yaz saatinin iki kez yaşanan saatinde yayın zamanı
// kaymaz, düzenleyicinin yeniden yazdığı açıklama ya da yuvarlanan ağırlık değişmeden kayda girmez. Seçenekler bölümü
// (kart 0264) yalnız değişince ve bütünüyle gider (varyant); yeni üründe seçeneği varsa.
export const girdiyiKur = (
  form: UrunFormu,
  bilinen: UrunFormu,
  veri: UrunEkraniVerisi,
  satirlar: readonly BirlesimSatiri[] = [],
) => {
  const yeniHali = alanGirdisi(form, veri);
  const varyantDegisti =
    veri.kimlik === undefined
      ? form.varyant.secenekler.length > 0
      : JSON.stringify(form.varyant) !== JSON.stringify(bilinen.varyant);
  const varyant = varyantDegisti
    ? varyantGirdisi(satirlar, form.varyant, bilinen.varyant)
    : undefined;
  const fiyatStok = fiyatStokGirdisi(form, bilinen, veri, satirlar);
  if (veri.kimlik === undefined) return { ...yeniHali, varyant, fiyatStok };
  const eskiHali = alanGirdisi(bilinen, veri).girdi;
  return {
    girdi: Object.fromEntries(
      Object.entries(yeniHali.girdi).filter(
        ([alan, deger]) => JSON.stringify(deger) !== JSON.stringify(eskiHali[alan]),
      ),
    ),
    ozellikSirasi: yeniHali.ozellikSirasi,
    varyant,
    fiyatStok,
  };
};

export function UrunEkrani({ veri }: { veri: UrunEkraniVerisi }) {
  const metin = usePanelMetni();
  const router = useRouter();
  const islem = usePanelIslemi(hataMetni);
  const izinli = veri.izinler.degistir;
  const yeni = veri.kimlik === undefined;
  const { form, setForm, bilinen, degisti, kaydedildi, vazgec } = useSunucuFormu<UrunFormu>(
    veri.form,
    urunFormunuUzlastir,
  );
  // Yeni ürün kaydedilince ürünün ekranına geçilir; geçiş bitene kadar ikinci kayıt yapılmaz (bağımsız kontrolün
  // bulgusu: ikinci basış ikinci ürünü açabilirdi).
  const acilan = useRef(false);
  const pf = usePanelFormu({ degisti: izinli && degisti, kaydet: () => kaydet() });
  const [silOnayi, setSilOnayi] = useState(false);
  const [arsivleniyor, setArsivleniyor] = useState(false);

  const degistir = <Alan extends keyof UrunFormu>(alan: Alan, deger: UrunFormu[Alan]) =>
    setForm((onceki) => ({ ...onceki, [alan]: deger }));
  const ozellikDegistir = (kimlik: string, deger: string) =>
    setForm((onceki) => ({ ...onceki, ozellikler: { ...onceki.ozellikler, [kimlik]: deger } }));

  const satirlar = birlesimSatirlari(form.varyant, bilinen.varyant, basitBirimAlanlari(form, veri));

  const kaydet = async (): Promise<boolean> => {
    if (acilan.current) return false;
    const gonderilen = form;
    const { girdi, ozellikSirasi, varyant, fiyatStok } = girdiyiKur(
      gonderilen,
      bilinen,
      veri,
      satirlar,
    );
    const ek = {
      ...(varyant === undefined ? {} : { varyant }),
      ...(fiyatStok === undefined ? {} : { fiyatStok }),
    };
    const sonuc = await pf.isle(() =>
      yeni
        ? islem<{ kimlik: string }>(
            "urun-ekle",
            { urun: girdi, ...ek },
            "yonetim.urunEkrani.eklendi",
            { formda: true },
          )
        : islem(
            "urun-degistir",
            { kimlik: veri.kimlik, urun: girdi, ...ek },
            "yonetim.urunEkrani.kaydedildi",
            { formda: true },
          ),
    );
    if (sonuc === undefined) return false;
    if (sonuc.tamam) {
      kaydedildi(gonderilen);
      pf.temizle();
      if (yeni) {
        acilan.current = true;
        router.replace(urunEkraniAdresi((sonuc.veri as { kimlik: string }).kimlik));
      }
      return true;
    }
    const alanlar = [
      ...sabitAlanlar,
      ...veri.ozellikler.map((ozellik) => `ozellik.${ozellik.kimlik}`),
    ];
    const alanHatalari = kodluAlanHatalari(hataMetinleri, sonuc, alanlar, (alan) => {
      // Yeni basit ürünün başlangıç stoğu ("stok" yeri).
      if (alan === "stok.stok") return "baslangicStogu";
      // Ağırlığın okunması ve sınırı çeviride denetlenir ("agirlik"); servisin "agirlikGram" hatası ikinci katmandır.
      if (alan === "agirlikGram") return "agirlik";
      // Birleşimin ağırlığı da (birlesimler.2.agirlikGram); seçenek ve değer adı alanın kendisidir.
      if (alan.startsWith("birlesimler.")) return alan.replace(/\.agirlikGram$/, ".agirlik");
      const deger = /^secenekler\.\d+\.degerler\.\d+/.exec(alan);
      if (deger !== null) return deger[0];
      const ozellik = /^ozellikler\.(\d+)/.exec(alan);
      if (ozellik !== null) return `ozellik.${ozellikSirasi[Number(ozellik[1])] ?? ""}`;
      return alan.replace(/^(kategoriler|etiketler|ilgiliUrunler)\.\d+$/, "$1");
    });
    pf.hatalariGoster(
      Object.fromEntries(
        Object.entries(alanHatalari).map(([alan, anahtar]) => [alan, metin(anahtar)]),
      ),
      Object.keys(alanHatalari).length > 0 ? [] : [metin(hataMetni(sonuc))],
    );
    return false;
  };

  const arsiveAl = async () => {
    if (veri.kimlik === undefined) return;
    setArsivleniyor(true);
    const sonuc = await islem(
      "urun-degistir",
      { kimlik: veri.kimlik, urun: { durum: "arsiv" } },
      "yonetim.urunEkrani.arsivlendi",
    );
    setArsivleniyor(false);
    if (sonuc.tamam) {
      const arsiv = (f: UrunFormu): UrunFormu => ({ ...f, durum: "arsiv", yayinZamani: "" });
      kaydedildi(arsiv);
      setForm(arsiv);
    }
  };

  const sil = async () => {
    if (veri.kimlik === undefined) return;
    // Sayfa yenilenmez (silinen ürünün ekranı bulunamadı verirdi), listeye gidilir.
    const sonuc = await panelIstegi("urun-sil", { kimlik: veri.kimlik });
    if (sonuc.tamam) {
      bildirimGoster("basari", metin("yonetim.urunEkrani.silindi"));
      router.push(urunlerAdresi);
    } else {
      bildirimGoster("tehlike", metin(hataMetni(sonuc)));
    }
  };

  const metinAlani = (
    alan: "ad" | "adresAdi" | "stokKodu" | "barkod",
    etiket: MetinAnahtari,
    { aciklama, zorunlu }: { aciklama?: MetinAnahtari; zorunlu: boolean },
  ) => (
    <PanelAlani
      ad={alan}
      etiket={metin(etiket)}
      aciklama={aciklama === undefined ? undefined : metin(aciklama)}
      zorunlu={zorunlu}
    >
      {(baglanti) => (
        <GirisAlani
          {...baglanti}
          name={alan}
          autoComplete="off"
          value={form[alan]}
          disabled={!izinli}
          onChange={(olay) => degistir(alan, olay.target.value)}
        />
      )}
    </PanelAlani>
  );

  const genel = (
    <Bolum kimlik="urun-genel" baslik={metin("yonetim.urunEkrani.bolum.genel")}>
      {metinAlani("ad", "yonetim.urunEkrani.ad", { zorunlu: true })}
      {yeni
        ? null
        : metinAlani("adresAdi", "yonetim.urunEkrani.adresAdi", {
            aciklama: "yonetim.urunEkrani.adresAdiAciklamasi",
            zorunlu: true,
          })}
      <PanelAlani
        ad="kisaAciklama"
        etiket={metin("yonetim.urunEkrani.kisaAciklama")}
        aciklama={metin("yonetim.urunEkrani.kisaAciklamaAciklamasi")}
        zorunlu={false}
      >
        {(baglanti) => (
          <UzunMetinAlani
            {...baglanti}
            name="kisaAciklama"
            rows={2}
            value={form.kisaAciklama}
            disabled={!izinli}
            onChange={(olay) => degistir("kisaAciklama", olay.target.value)}
          />
        )}
      </PanelAlani>
      <PanelAlani
        ad="uzunAciklama"
        etiket={metin("yonetim.urunEkrani.aciklama")}
        aciklama={metin("yonetim.urunEkrani.aciklamaAciklamasi")}
        zorunlu={false}
      >
        {(baglanti) => (
          <BicimliMetinAlani
            {...baglanti}
            etiket={metin("yonetim.urunEkrani.aciklama")}
            deger={form.uzunAciklama}
            onDegerDegisti={(html) => degistir("uzunAciklama", html)}
            baglantiGecerliMi={aciklamaBaglantisiGecerliMi}
            disabled={!izinli}
            metinler={{
              aracCubugu: doldur(metin("yonetim.bicimliMetin.aracCubugu"), {
                alan: metin("yonetim.urunEkrani.aciklama"),
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

  const secim = (
    alan: "vergiSinifi" | "kargoGerekmez",
    etiket: MetinAnahtari,
    aciklama: MetinAnahtari | undefined,
    deger: string,
    secenekler: readonly { deger: string; ad: string }[],
    sec: (deger: string) => void,
  ) => (
    <PanelAlani
      ad={alan}
      etiket={metin(etiket)}
      aciklama={aciklama === undefined ? undefined : metin(aciklama)}
      zorunlu
    >
      {(baglanti) => (
        <SecimKutusu value={deger} onValueChange={sec} disabled={!izinli}>
          <SecimTetikleyici {...baglanti}>
            <SecimDegeri />
          </SecimTetikleyici>
          <SecimListesi>
            {secenekler.map((secenek) => (
              <SecimOgesi key={secenek.deger} value={secenek.deger}>
                {secenek.ad}
              </SecimOgesi>
            ))}
          </SecimListesi>
        </SecimKutusu>
      )}
    </PanelAlani>
  );

  const siniflandirma = (
    <Bolum kimlik="urun-siniflandirma" baslik={metin("yonetim.urunEkrani.bolum.siniflandirma")}>
      <CokluKayitSecimi
        ad="kategoriler"
        tur="kategori"
        etiket={metin("yonetim.urunEkrani.kategoriler")}
        aciklama={metin("yonetim.urunEkrani.kategorilerAciklamasi")}
        secilenler={form.kategoriler}
        degisti={(yeniListe) => degistir("kategoriler", yeniListe)}
        disabled={!izinli}
      />
      <div className="grid gap-5 tablet:grid-cols-2">
        <AlanKabi ad="marka" etiket={metin("yonetim.urunEkrani.marka")}>
          <KayitArama
            tur="marka"
            etiket={metin("yonetim.urunEkrani.marka")}
            aciklama={metin("yonetim.urunEkrani.markaAciklamasi")}
            secili={form.marka ?? undefined}
            disabled={!izinli}
            sec={(kayit) =>
              degistir("marka", kayit === undefined ? null : { kimlik: kayit.kimlik, ad: kayit.ad })
            }
            {...(pf.hata("marka") === undefined ? {} : { hata: pf.hata("marka") ?? "" })}
          />
        </AlanKabi>
        <CokluKayitSecimi
          ad="etiketler"
          tur="etiket"
          etiket={metin("yonetim.urunEkrani.etiketler")}
          secilenler={form.etiketler}
          degisti={(yeniListe) => degistir("etiketler", yeniListe)}
          disabled={!izinli}
        />
        {secim(
          "vergiSinifi",
          "yonetim.urunEkrani.vergiSinifi",
          undefined,
          form.vergiSinifi === "" ? vergisiz : form.vergiSinifi,
          [
            ...veri.vergiSiniflari.map((sinifi) => ({
              deger: sinifi.kimlik,
              ad:
                sinifi.silindi === true
                  ? doldur(metin("yonetim.urunEkrani.vergiSinifiSilinmis"), { ad: sinifi.ad })
                  : sinifi.ad,
            })),
            { deger: vergisiz, ad: metin("yonetim.urunEkrani.vergisiz") },
          ],
          (deger) => degistir("vergiSinifi", deger === vergisiz ? "" : deger),
        )}
        {secim(
          "kargoGerekmez",
          "yonetim.urunEkrani.kargo",
          "yonetim.urunEkrani.kargoAciklamasi",
          form.kargoGerekmez ? "gerekmez" : "gerekir",
          [
            { deger: "gerekir", ad: metin("yonetim.urunEkrani.kargoGerekir") },
            { deger: "gerekmez", ad: metin("yonetim.urunEkrani.kargoGerekmez") },
          ],
          (deger) => degistir("kargoGerekmez", deger === "gerekmez"),
        )}
      </div>
    </Bolum>
  );

  const sayiAlani = (
    alan: "agirlik" | "enAzAdet" | "enCokAdet",
    etiket: string,
    aciklama: string | undefined,
    zorunlu: boolean,
    ek?: string,
  ) => (
    <PanelAlani ad={alan} etiket={etiket} aciklama={aciklama} zorunlu={zorunlu}>
      {(baglanti) => (
        <span className="relative flex items-center">
          <GirisAlani
            {...baglanti}
            name={alan}
            inputMode={alan === "agirlik" ? "decimal" : "numeric"}
            autoComplete="off"
            value={form[alan]}
            disabled={!izinli}
            onChange={(olay) => degistir(alan, olay.target.value)}
            className={ek === undefined ? undefined : "pr-12"}
          />
          {ek === undefined ? null : (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-4 text-soluk-yazi"
            >
              {ek}
            </span>
          )}
        </span>
      )}
    </PanelAlani>
  );

  const secenekler = (
    <Bolum kimlik="urun-secenekler" baslik={metin("yonetim.urunEkrani.bolum.secenekler")}>
      <SeceneklerBolumu
        varyant={form.varyant}
        bilinen={bilinen.varyant}
        satirlar={satirlar}
        degistir={(varyant) => degistir("varyant", varyant)}
        izinli={izinli}
        silebilir={veri.izinler.sil}
        agirlikBirimi={veri.agirlikBirimi}
        galeri={veri.galeriGorselleri}
        fiyatStok={{
          fiyatGor: veri.izinler.fiyatGor,
          fiyatDegistir: izinli && veri.izinler.fiyatDegistir,
          stokGor: veri.izinler.stokGor,
          stokDuzelt: izinli && veri.izinler.stokDuzelt,
          simge: veri.fiyatStok.simge,
          sebepSor: !yeni,
          sebep: form.stokSebebi,
          not: form.stokNotu,
          sebepDegistir: (yeni) => setForm((onceki) => ({ ...onceki, ...yeni })),
        }}
      />
    </Bolum>
  );

  const secenekli = form.varyant.secenekler.length > 0;
  const fiyatBolumleri = veri.izinler.fiyatGor ? (
    <>
      <Bolum kimlik="urun-fiyat" baslik={metin("yonetim.urunEkrani.bolum.fiyat")}>
        <FiyatBolumu
          fiyat={form.fiyat}
          degistir={(fiyat) => degistir("fiyat", fiyat)}
          veri={veri.fiyatStok}
          izinli={izinli && veri.izinler.fiyatDegistir}
          secenekli={secenekli}
        />
      </Bolum>
      {veri.kimlik === undefined || veri.fiyatStok.fiyatGecmisi === undefined ? null : (
        <Bolum kimlik="urun-fiyat-gecmisi" baslik={metin("yonetim.urunEkrani.bolum.fiyatGecmisi")}>
          <FiyatGecmisi
            ilk={veri.fiyatStok.fiyatGecmisi}
            urun={veri.kimlik}
            secenekli={veri.tur === "varyantli"}
          />
        </Bolum>
      )}
    </>
  ) : null;
  const stokBolumleri = veri.izinler.stokGor ? (
    <>
      <Bolum kimlik="urun-stok" baslik={metin("yonetim.urunEkrani.bolum.stok")}>
        <StokBolumu
          form={form}
          degistir={(yeni) => setForm((onceki) => ({ ...onceki, ...yeni }))}
          veri={veri.fiyatStok}
          izinler={{ degistir: izinli, duzelt: izinli && veri.izinler.stokDuzelt }}
          secenekli={secenekli}
          yeni={yeni}
        />
      </Bolum>
      {veri.kimlik === undefined || veri.fiyatStok.stokGecmisi === undefined ? null : (
        <Bolum kimlik="urun-stok-gecmisi" baslik={metin("yonetim.urunEkrani.bolum.stokGecmisi")}>
          <StokGecmisi
            ilk={veri.fiyatStok.stokGecmisi}
            urun={veri.kimlik}
            secenekli={veri.tur === "varyantli"}
          />
        </Bolum>
      )}
    </>
  ) : null;

  const satis = (
    <Bolum kimlik="urun-satis" baslik={metin("yonetim.urunEkrani.bolum.satis")}>
      {form.varyant.secenekler.length > 0 ? (
        <p className="text-kucuk text-soluk-yazi">{metin("yonetim.urunEkrani.varyantliBirim")}</p>
      ) : (
        <div className="grid gap-5 tablet:grid-cols-2">
          {metinAlani("stokKodu", "yonetim.urunEkrani.stokKodu", { zorunlu: false })}
          {metinAlani("barkod", "yonetim.urunEkrani.barkod", {
            aciklama: "yonetim.urunEkrani.barkodAciklamasi",
            zorunlu: false,
          })}
          {sayiAlani(
            "agirlik",
            doldur(metin("yonetim.urunEkrani.agirlik"), { birim: veri.agirlikBirimi }),
            metin("yonetim.urunEkrani.agirlikAciklamasi"),
            false,
            veri.agirlikBirimi,
          )}
        </div>
      )}
      <div className="grid gap-5 tablet:grid-cols-2">
        {sayiAlani(
          "enAzAdet",
          metin("yonetim.urunEkrani.enAzAdet"),
          metin("yonetim.urunEkrani.enAzAdetAciklamasi"),
          true,
        )}
        {sayiAlani(
          "enCokAdet",
          metin("yonetim.urunEkrani.enCokAdet"),
          metin("yonetim.urunEkrani.enCokAdetAciklamasi"),
          false,
        )}
      </div>
    </Bolum>
  );

  const ozellikler = (
    <Bolum kimlik="urun-ozellikler" baslik={metin("yonetim.urunEkrani.bolum.ozellikler")}>
      {veri.ozellikler.length === 0 ? (
        <p className="text-kucuk text-soluk-yazi">{metin("yonetim.urunEkrani.ozellikYok")}</p>
      ) : (
        <div className="grid gap-5 tablet:grid-cols-2">
          {veri.ozellikler.map((ozellik) => {
            const ad = `ozellik.${ozellik.kimlik}`;
            const deger = form.ozellikler[ozellik.kimlik] ?? "";
            const turAdi = metin(`yonetim.ozellik.tur.${ozellik.tur}` as MetinAnahtari);
            const aciklama = ozellik.birim === undefined ? turAdi : `${turAdi} · ${ozellik.birim}`;
            return (
              <PanelAlani key={ozellik.kimlik} ad={ad} etiket={ozellik.ad} aciklama={aciklama}>
                {(baglanti) =>
                  ozellik.tur === "liste" || ozellik.tur === "evet-hayir" ? (
                    <SecimKutusu
                      value={deger === "" ? secilmedi : deger}
                      onValueChange={(secilen) =>
                        ozellikDegistir(ozellik.kimlik, secilen === secilmedi ? "" : secilen)
                      }
                      disabled={!izinli}
                    >
                      <SecimTetikleyici {...baglanti}>
                        <SecimDegeri />
                      </SecimTetikleyici>
                      <SecimListesi>
                        <SecimOgesi value={secilmedi}>
                          {metin("yonetim.urunEkrani.secilmedi")}
                        </SecimOgesi>
                        {(ozellik.tur === "liste"
                          ? ozellik.secenekler.map((s) => ({ deger: s.kimlik, ad: s.ad }))
                          : [
                              { deger: "evet", ad: metin("yonetim.urunEkrani.evet") },
                              { deger: "hayir", ad: metin("yonetim.urunEkrani.hayir") },
                            ]
                        ).map((secenek) => (
                          <SecimOgesi key={secenek.deger} value={secenek.deger}>
                            {secenek.ad}
                          </SecimOgesi>
                        ))}
                      </SecimListesi>
                    </SecimKutusu>
                  ) : (
                    <GirisAlani
                      {...baglanti}
                      name={ad}
                      autoComplete="off"
                      {...(ozellik.tur === "sayi" ? { inputMode: "decimal" as const } : {})}
                      value={deger}
                      disabled={!izinli}
                      onChange={(olay) => ozellikDegistir(ozellik.kimlik, olay.target.value)}
                    />
                  )
                }
              </PanelAlani>
            );
          })}
        </div>
      )}
    </Bolum>
  );

  const ilgili = (
    <Bolum kimlik="urun-ilgili" baslik={metin("yonetim.urunEkrani.bolum.ilgili")}>
      <CokluKayitSecimi
        ad="ilgiliUrunler"
        tur="urun"
        etiket={metin("yonetim.urunEkrani.ilgiliUrunler")}
        aciklama={doldur(metin("yonetim.urunEkrani.ilgiliAciklamasi"), {
          sayi: String(ilgiliUrunSiniri),
        })}
        secilenler={form.ilgiliUrunler}
        degisti={(yeniListe) => degistir("ilgiliUrunler", yeniListe)}
        sinir={ilgiliUrunSiniri}
        sinirYazisi={doldur(metin("yonetim.urunEkrani.ilgiliSinir"), {
          sayi: String(ilgiliUrunSiniri),
        })}
        {...(veri.kimlik === undefined ? {} : { haric: veri.kimlik })}
        disabled={!izinli}
      />
    </Bolum>
  );

  const yayinOgeleri = [
    ...yayinSecenekleri,
    ...(form.durum === "arsiv" ? (["arsiv"] as const) : []),
  ].map((durum) => ({
    deger: durum,
    ad: metin(`yonetim.urunEkrani.yayin.${durum}` as MetinAnahtari),
    ...(izinli ? {} : { secilemez: true }),
  }));

  const yayin = (
    <Kart className="flex flex-col gap-4 p-4 tablet:p-6">
      <h2 className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {metin("yonetim.urunEkrani.yayinBasligi")}
      </h2>
      <AlanKabi ad="durum" etiket={metin("yonetim.urunEkrani.yayinBasligi")}>
        <SecenekGrubu
          baslik={<span className="sr-only">{metin("yonetim.urunEkrani.yayinBasligi")}</span>}
          etiket={metin("yonetim.urunEkrani.yayinBasligi")}
          ogeler={yayinOgeleri}
          deger={form.durum}
          onDegerDegisti={(deger) => {
            if (izinli) degistir("durum", deger as UrunFormu["durum"]);
          }}
          secilemezEki=""
          aciklama={metin("yonetim.urunEkrani.yayinAciklamasi")}
          {...(pf.hata("durum") === undefined ? {} : { hata: pf.hata("durum") ?? "" })}
        />
      </AlanKabi>
      {form.durum === "zamanlanmis" ? (
        <PanelAlani
          ad="yayinZamani"
          etiket={metin("yonetim.urunEkrani.yayinZamani")}
          aciklama={metin("yonetim.urunEkrani.yayinZamaniAciklamasi")}
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
    </Kart>
  );

  const kaldir =
    yeni || !(izinli || veri.izinler.sil) ? null : (
      <Kart className="flex flex-col gap-3 p-4 tablet:p-6">
        <h2 className="font-baslik text-baslik-4 font-baslik-kalinligi">
          {metin("yonetim.urunEkrani.kaldirBasligi")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {izinli && form.durum !== "arsiv" ? (
            <Dugme tur="cerceveli" disabled={arsivleniyor || degisti} onClick={arsiveAl}>
              {metin("yonetim.urunEkrani.arsiveAl")}
            </Dugme>
          ) : null}
          {veri.izinler.sil ? (
            <Dugme tur="cerceveli" onClick={() => setSilOnayi(true)}>
              <Ikon ad="sil" />
              {metin("yonetim.urunEkrani.sil")}
            </Dugme>
          ) : null}
        </div>
        <p className="text-kucuk text-soluk-yazi">
          {metin(
            degisti && izinli && form.durum !== "arsiv"
              ? "yonetim.urunEkrani.kaldirKaydedilmemis"
              : "yonetim.urunEkrani.kaldirAciklamasi",
          )}
        </p>
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
            {genel}
            {siniflandirma}
            {secenekler}
            {fiyatBolumleri}
            {stokBolumleri}
            {satis}
            {ozellikler}
            {ilgili}
            {izinli ? (
              <KaydetCubugu
                sayfada
                durumYazisi
                degisiklikGerekli={!yeni}
                kaydetEtiketi={metin(
                  yeni ? "yonetim.urunEkrani.ekle" : "yonetim.urunEkrani.kaydet",
                )}
                vazgec={() => {
                  if (yeni) {
                    router.push(urunlerAdresi);
                    return;
                  }
                  vazgec();
                  pf.temizle();
                }}
              />
            ) : null}
          </div>
          <div className="flex flex-col gap-6 masaustu:sticky masaustu:top-4 masaustu:self-start">
            <BuSayfada />
            {yayin}
            {kaldir}
          </div>
        </div>
      </PanelFormu>
      <OnayPenceresi
        acik={silOnayi}
        acikDegisince={setSilOnayi}
        baslik={doldur(metin("yonetim.urunEkrani.silOnay.baslik"), { ad: veri.form.ad })}
        aciklama={metin("yonetim.urunEkrani.silOnay.aciklama")}
        onayEtiketi={metin("yonetim.urunEkrani.sil")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={sil}
        tur="tehlike"
      />
    </>
  );
}

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
      className="flex min-w-0 scroll-mt-4 flex-col gap-5 p-4 tablet:p-6"
      id={kimlik}
      aria-labelledby={`${kimlik}-baslik`}
    >
      <h2 id={`${kimlik}-baslik`} className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {baslik}
      </h2>
      {children}
    </Kart>
  );
}

// "Bu sayfada": bölümlerin bağlantıları; kaydırdıkça görünen bölüm işaretlenir (aria-current). Telefonda yoktur:
// bölümler alt alta okunur.
function BuSayfada() {
  const metin = usePanelMetni();
  const [gorunen, setGorunen] = useState<string>(bolumler[0].kimlik);
  useEffect(() => {
    const gozlemci = new IntersectionObserver(
      (kayitlar) => {
        const ust = kayitlar
          .filter((kayit) => kayit.isIntersecting)
          .toSorted((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (ust !== undefined) setGorunen(ust.target.id);
      },
      { rootMargin: "0px 0px -60% 0px" },
    );
    for (const { kimlik } of bolumler) {
      const oge = document.getElementById(kimlik);
      if (oge !== null) gozlemci.observe(oge);
    }
    return () => gozlemci.disconnect();
  }, []);
  return (
    <Kart className="hidden p-2 masaustu:block">
      <nav aria-label={metin("yonetim.urunEkrani.buSayfada")}>
        <ul className="flex flex-col">
          {bolumler.map(({ kimlik, ad }) => (
            <li key={kimlik}>
              <a
                href={`#${kimlik}`}
                aria-current={gorunen === kimlik ? "location" : undefined}
                className={sinif(
                  "flex min-h-11 items-center rounded-kucuk px-3 text-kucuk text-soluk-yazi no-underline hover:bg-yuzey hover:text-yazi",
                  gorunen === kimlik && "border-l-2 border-birincil bg-yuzey font-kalin text-yazi",
                )}
              >
                {metin(ad)}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </Kart>
  );
}
