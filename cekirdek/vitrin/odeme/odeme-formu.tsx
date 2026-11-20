"use client";
// Ödeme adımı (kart 0213, karar 0140; kart 0211'in taslağı, karar 0132): tek sayfa. Solda iletişim, teslimat adresi,
// fatura bilgisi ve sipariş notu alt alta; sağda sipariş özeti, onaylar ve "Siparişi onayla". Telefonda özet en üstte
// kapalı durur (toplamı görünür), onaylar ve düğme formun sonundadır. Ödeme yöntemi dördüncü bölümdür (kart 0214):
// sitede kullanılabilen yöntemler mağaza sahibinin sırasıyla, kapıda ödemenin her seçeneği ayrı satır.
//
// - Şema uçla ortaktır (cekirdek/moduller/odeme/semalar.ts): form gönderilmeden önce aynı şemayla denetlenir, hata
//   alanın altında yazılır ve üstte alanlara giden bağlantılarla özetlenir; odak özete geçer.
// - Üye olmayan müşteri e-postasını iletişim bölümünde verir, isterse hesap açar; üye olan "Giriş yapın" bağlantısıyla
//   girer ve döner. Üye olmadan alışveriş kapalıysa girişsiz müşteri girişe yönlenir.
// - Özetin tutarları sunucunun sepet hesabıdır; vergi teslimat ve fatura adresinin bölgesiyle yeniden hesaplanır.
//   Tarayıcı tutar göndermez, yalnız sepetin kalemlerini gönderir.
// - Sunucu sepetin değiştiğini söylerse özet yeniden istenir; stok başka bir ödemede ayrılmışsa söylenir.
// - Müşterinin bir önceki onayının oturumu sekmede saklanır ve yeniden basınca gönderilir: kendi ayırması kendisine
//   engel olmaz.
// - Sipariş oluşunca (kart 0214) siparişe giren kalemler sepetten çıkar, müşteri sipariş alındı sayfasına gider; o
//   sayfayı yalnız bu tarayıcı açar (erişim çerezi).
// - Giriş yapmış müşterinin son siparişinin teslimat bilgisi teslimat bölümünde önerilir; "Bu adresi kullan" alanları
//   doldurur.
import { type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import {
  Akordeon,
  AkordeonBasligi,
  AkordeonIcerigi,
  AkordeonOgesi,
} from "../../../bilesenler/parcalar/akordeon";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { IskeletGorunum } from "../../../bilesenler/parcalar/iskelet";
import { OnayKutusu } from "../../../bilesenler/parcalar/onay-kutusu";
import {
  Pencere,
  PencereBasligi,
  PencereIcerigi,
  PencereTetikleyici,
  PencereUstu,
} from "../../../bilesenler/parcalar/pencere";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
import { adresSatiri } from "../../bolgeler/adres-satiri";
import { kapiyaIstek } from "../../kapi/istemci";
import { hataKodlari } from "../../kayitlar/kapi";
import type { OdemeDonusSonucu } from "../../kayitlar/odeme";
import { doldur } from "../../metinler/doldur";
import type { VitrinMetinAnahtari } from "../../metinler/istemci-metni";
import { useMetin } from "../../metinler/istemci-metni";
import type { AdresListesi, KayitliAdres } from "../../moduller/musteri/adres-semalari";
import {
  misafirOdemeFormuSemasi,
  type OdemeYontemiSecimi,
  type Teslimat,
  uyeOdemeFormuSemasi,
} from "../../moduller/odeme/semalar";
import { useRobotluGonderim } from "../../moduller/robot-korumasi/istemci";
import { girisAdresiDonuslu, vitrinAdresleri } from "../adresler";
import { cikisYap, useHesapDurumu } from "../hesap-durumu";
import { adetDegistir, siparisKalemleriniCikar, useSepet, useSepetGorunumu } from "../sepet/durum";
import { SatirGorseli, SepetOzeti, satirAdi } from "../sepet/sepet-gorunumu";
import type { SepetGorunumu } from "../sepet/veri";
import {
  type Adres,
  AdresAlanlari,
  type AlanKimlikleri,
  adresGirdisi,
  alanAdlari,
  type BolgeUlkesi,
  bosAdres,
  type HataHaritasi,
  hataMetni,
  type Metin,
  MetinAlani,
  ulkeVerisindenAdlar,
  vergiBolgesi,
} from "./alanlar";
import {
  donusSonucunuAl,
  type OdemeTaslagi,
  odemeOturumuAnahtari,
  taslagiAl,
  taslagiSakla,
} from "./kart-donusu";

const misafirUcu = "/kapi/herkese-acik/odeme";
const uyeUcu = "/kapi/musteri/odeme";
const oncekiAnahtari = odemeOturumuAnahtari;

// Ödeme adımındaki bir yöntem satırı: anahtar seçimin adıdır ("havale", "kapida-odeme-nakit").
export type OdemeYontemiSatiri = {
  anahtar: string;
  secim: OdemeYontemiSecimi;
};

export type OdemeSayfasiVerisi = {
  uyeOlmadanAlisveris: boolean;
  // Sitede kullanılabilen ödeme yöntemleri, mağaza sahibinin sırasıyla; havalenin iptal süresi (gün).
  yontemler: readonly OdemeYontemiSatiri[];
  havaleIptalSuresi: number;
  telefonZorunlu: boolean;
  // Sitenin teslimat ülkeleri, il ve ilçe listeleriyle.
  ulkeler: readonly BolgeUlkesi[];
  // Ön bilgilendirme formu ve mesafeli satış sözleşmesinin satıcı satırları ve teslim süresi (yer tutucu metin).
  satici: readonly string[];
  teslimMetni: string;
  sinirlar: { not: number; sifreEnKisa: number };
  // Sunucu ödeme sayfasının çerezinde kalem görmedi (karar 0136): boş hâl sepet bilinmeden çizilir.
  cerezdeBos: boolean;
};

function Bolum({
  no,
  baslik,
  ek,
  children,
}: {
  no: number;
  baslik: string;
  ek?: ReactNode;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4 rounded-orta border border-kenar bg-zemin p-5">
      <legend className="float-left flex w-full flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-baslik text-baslik-4 font-baslik-kalinligi">
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-dugme bg-yazi text-kucuk text-zemin"
          >
            {no}
          </span>
          {baslik}
        </span>
        {ek}
      </legend>
      {children}
    </fieldset>
  );
}

function OzetUrunleri({ gorunum }: { gorunum: SepetGorunumu }) {
  const metin = useMetin();
  return (
    <ul
      aria-label={metin("vitrin.sepet.satirlar")}
      className="flex flex-col gap-3 border-b border-kenar pb-4"
    >
      {gorunum.satirlar
        .filter((satir) => satir.satilabilir)
        .map((satir) => (
          <li key={satir.birim} className="flex items-start gap-3">
            <SatirGorseli satir={satir} buyukluk="size-12" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-kalin">{satirAdi(metin, satir)}</span>
              {satir.secim.length === 0 ? null : (
                <span className="text-kucuk text-soluk-yazi">
                  {satir.secim
                    .map(({ secenek, deger }) =>
                      doldur(metin("vitrin.sepet.secim"), { secenek, deger }),
                    )
                    .join(", ")}
                </span>
              )}
              <span className="text-kucuk text-soluk-yazi">
                {doldur(metin("vitrin.odeme.adet"), { sayi: String(satir.adet) })}
              </span>
            </span>
            <span className="whitespace-nowrap">{satir.yaziliTutar}</span>
          </li>
        ))}
    </ul>
  );
}

function Ozet({ gorunum }: { gorunum: SepetGorunumu }) {
  const metin = useMetin();
  return (
    <div className="flex flex-col gap-4">
      <OzetUrunleri gorunum={gorunum} />
      <SepetOzeti gorunum={gorunum} />
      <Baglanti href={vitrinAdresleri.sepet} className="self-start">
        {metin("vitrin.odeme.sepetiDuzenle")}
      </Baglanti>
    </div>
  );
}

// Ön bilgilendirme formu ve mesafeli satış sözleşmesi: yer tutucu şablon, siparişin bilgileriyle (kart 0063).
function SozlesmePenceresi({
  baslik,
  veri,
  alici,
  gorunum,
  yontem,
}: {
  baslik: string;
  veri: OdemeSayfasiVerisi;
  alici: readonly string[];
  gorunum: SepetGorunumu | undefined;
  // Seçili ödeme yöntemi (kart 0214): ön bilgilendirmenin içeriğidir.
  yontem: string | undefined;
}) {
  const metin = useMetin();
  // Tetikleyiciyle açılır: kapanınca odak açan düğmeye döner.
  return (
    <Pencere>
      <PencereTetikleyici asChild>
        <Dugme tur="baglanti" className="self-start">
          {doldur(metin("vitrin.odeme.metniOku"), { metin: baslik })}
        </Dugme>
      </PencereTetikleyici>
      <PencereIcerigi
        kapatEtiketi={metin("ortak.parca.kapat")}
        genislik="orta"
        aria-describedby={undefined}
      >
        <PencereUstu>
          <PencereBasligi>{baslik}</PencereBasligi>
        </PencereUstu>
        <div className="flex flex-col gap-4">
          <Uyari tur="bilgi">{metin("vitrin.yasal.taslak")}</Uyari>
          <section className="flex flex-col gap-1">
            <h3 className="font-kalin">{metin("vitrin.odeme.sozlesme.satici")}</h3>
            {veri.satici.map((satir) => (
              <p key={satir}>{satir}</p>
            ))}
          </section>
          <section className="flex flex-col gap-1">
            <h3 className="font-kalin">{metin("vitrin.odeme.sozlesme.alici")}</h3>
            {alici.length === 0 ? (
              <p>{metin("vitrin.odeme.sozlesme.bilinmiyor")}</p>
            ) : (
              alici.map((satir) => <p key={satir}>{satir}</p>)
            )}
          </section>
          {gorunum === undefined ? null : (
            <section className="flex flex-col gap-1">
              <h3 className="font-kalin">{metin("vitrin.odeme.sozlesme.urunler")}</h3>
              <ul className="flex flex-col gap-1">
                {gorunum.satirlar
                  .filter((satir) => satir.satilabilir)
                  .map((satir) => (
                    <li key={satir.birim}>
                      {doldur(metin("vitrin.odeme.sozlesme.urunSatiri"), {
                        urun: satirAdi(metin, satir),
                        adet: String(satir.adet),
                        tutar: satir.yaziliTutar ?? "",
                      })}
                    </li>
                  ))}
              </ul>
              <p className="font-kalin">
                {doldur(metin("vitrin.odeme.sozlesme.toplam"), { toplam: gorunum.yazili.toplam })}
              </p>
            </section>
          )}
          {yontem === undefined ? null : (
            <p>{doldur(metin("vitrin.odeme.sozlesme.odemeYontemi"), { yontem })}</p>
          )}
          <p>{veri.teslimMetni}</p>
          <section className="flex flex-col gap-1">
            <h3 className="font-kalin">{metin("vitrin.odeme.sozlesme.iade")}</h3>
            <p>{metin("vitrin.odeme.sozlesme.bilinmiyor")}</p>
          </section>
        </div>
      </PencereIcerigi>
    </Pencere>
  );
}

type GenelHata = "sepet-degisti" | "sepet-bos" | "stok-ayrildi" | "kayitli" | "sinir" | "genel";
const genelHataMetinleri: Record<GenelHata, VitrinMetinAnahtari> = {
  "sepet-degisti": "vitrin.odeme.hata.sepetDegisti",
  "sepet-bos": "vitrin.odeme.hata.sepetBos",
  "stok-ayrildi": "vitrin.odeme.hata.stokAyrildi",
  kayitli: "vitrin.odeme.hata.kayitli",
  sinir: "vitrin.odeme.hata.sinir",
  genel: "vitrin.odeme.hata.genel",
};

// Yöntem satırının adı, açıklaması ve ikonu (taslak, kart 0211). Havalenin açıklaması iptal süresini söyler.
const yontemGorunusu = (
  metin: Metin,
  secim: OdemeYontemiSecimi,
  iptalGunu: number,
): { ad: string; aciklama: string; ikon: "havale" | "kapida-odeme" | "kart" } =>
  secim.yontem === "havale"
    ? {
        ad: metin("ortak.odemeYontemi.havale"),
        aciklama: doldur(metin("vitrin.odeme.yontem.havaleAciklamasi"), { gun: String(iptalGunu) }),
        ikon: "havale",
      }
    : secim.yontem === "kart"
      ? {
          ad: metin("ortak.odemeYontemi.kartla"),
          aciklama: metin("vitrin.odeme.yontem.kartlaAciklamasi"),
          ikon: "kart",
        }
      : {
          ad: doldur(metin("vitrin.odeme.yontem.kapida"), {
            secenek: metin(
              secim.secenek === "nakit" ? "vitrin.odeme.yontem.nakit" : "vitrin.odeme.yontem.kart",
            ),
          }),
          aciklama: metin(
            secim.secenek === "nakit"
              ? "vitrin.odeme.yontem.nakitAciklamasi"
              : "vitrin.odeme.yontem.kartAciklamasi",
          ),
          ikon: secim.secenek === "nakit" ? "kapida-odeme" : "kart",
        };

function Yukleniyor() {
  const metin = useMetin();
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">{metin("vitrin.odeme.yukleniyor")}</span>
      <IskeletGorunum className="h-20 w-full" />
    </div>
  );
}

const depodan = (is: (depo: Storage) => string | null | undefined) => {
  try {
    return is(window.sessionStorage) ?? undefined;
  } catch {
    return undefined;
  }
};

// Kayıtlı adreslerden "Yeni adres" seçeneğinin değeri (kayıt kimliği olamaz).
const yeniAdres = "yeni";

// Teslimatın posta adresi formun adres alanlarına.
const formAdresi = ({ adres }: Teslimat): Adres => ({
  ulke: adres.ulke,
  il: adres.il ?? "",
  ilce: adres.ilce ?? "",
  adres: adres.adres,
  postaKodu: adres.postaKodu ?? "",
});

export function OdemeFormu({ veri }: { veri: OdemeSayfasiVerisi }) {
  const metin = useMetin();
  const hesap = useHesapDurumu();
  const sepet = useSepet();
  const robotluGonder = useRobotluGonderim();
  const ilkUlke = veri.ulkeler[0]?.kod ?? "";
  const [teslimat, setTeslimat] = useState<Adres>(bosAdres(ilkUlke));
  const [faturaAdresi, setFaturaAdresi] = useState<Adres>(bosAdres(ilkUlke));
  const [faturaTuru, setFaturaTuru] = useState<"bireysel" | "kurumsal">("bireysel");
  const [faturaAyni, setFaturaAyni] = useState(true);
  const [hesapAc, setHesapAc] = useState(false);
  const [onaylar, setOnaylar] = useState({
    on: false,
    mesafeli: false,
    pazarlama: false,
    uyelik: false,
    kvkk: false,
  });
  const [alici, setAlici] = useState<string[]>([]);
  const [hatalar, setHatalar] = useState<HataHaritasi>({});
  const [genelHata, setGenelHata] = useState<GenelHata | null>(null);
  // Seçili ödeme yöntemi satırının anahtarı: ilk yöntem seçili başlar.
  const [yontem, setYontem] = useState<string | undefined>(veri.yontemler[0]?.anahtar);
  // Giriş yapmış müşterinin son siparişinin teslimatı (öneri) ve uygulanınca teslimat alanlarının ilk değerleri.
  const [onceki, setOnceki] = useState<Teslimat | null>(null);
  const [kisi, setKisi] = useState({ ad: "", soyad: "", telefon: "", surum: 0 });
  // Sipariş oluştu, sipariş alındı sayfasına gidiliyor; ya da müşteri ödeme kuruluşunun sayfasına gidiyor.
  const [gidiyor, setGidiyor] = useState<"siparis" | "kurulus" | false>(false);
  // Kartla ödemeden dönüş (kart 0215): sonucun kodu ve geri konan form bilgisi. taslakSurum alanları yeniden kurar.
  const [donusSonucu, setDonusSonucu] = useState<OdemeDonusSonucu | null>(null);
  const [taslak, setTaslak] = useState<OdemeTaslagi | null>(null);
  const [oncekiKullanildi, setOncekiKullanildi] = useState(false);
  // Giriş yapmış müşterinin adres defteri (kart 0237, karar 0149): bilinmezken null. Seçili kayıtlı adres ya da "yeni".
  const [kayitli, setKayitli] = useState<KayitliAdres[] | null>(null);
  const [secilenAdres, setSecilenAdres] = useState<string | undefined>(undefined);
  // "Adreslerime kaydet": defteri boş müşteride işaretli, kayıtlı adresi olanda işaretsiz gelir (kullanıcı kararı).
  const [adresiKaydet, setAdresiKaydet] = useState(false);
  // Kartla ödemeden dönüşte form taslaktan doldu: kayıtlı adres onun üstüne yazılmaz.
  const taslaktanDoldu = useRef(false);
  const [bekliyor, setBekliyor] = useState(false);
  const [yenileme, setYenileme] = useState(0);
  // Sepetteki adet sunucunun hesabına göre indirildi: özet yenilenince de söylenir.
  const [adetIndi, setAdetIndi] = useState(false);
  const gonderiliyor = useRef(false);
  const kimlikler = useRef<AlanKimlikleri>({}).current;
  const ozetKutusu = useRef<HTMLDivElement>(null);
  const donusKutusu = useRef<HTMLDivElement>(null);

  const vergiBolgeleri = {
    teslimat: vergiBolgesi(teslimat),
    fatura: vergiBolgesi(faturaAyni ? teslimat : faturaAdresi),
  };
  const durum = useSepetGorunumu(true, undefined, { vergiBolgeleri, yenileme });

  // Üye olmadan alışveriş kapalıysa girişsiz müşteri girişe gider, sonra buraya döner.
  useEffect(() => {
    if (hesap.tur === "girissiz" && !veri.uyeOlmadanAlisveris) {
      window.location.assign(girisAdresiDonuslu(vitrinAdresleri.odeme));
    }
  }, [hesap.tur, veri.uyeOlmadanAlisveris]);

  // Sunucu adedi stoğa ya da alım sınırına indirdiyse sepetteki adet de iner: müşteri özette ne görüyorsa onu
  // onaylar, aynı fark onayı yeniden durdurmaz. Fark özetin üstünde söylenir.
  useEffect(() => {
    if (durum.tur !== "hazir") return;
    for (const satir of durum.gorunum.satirlar) {
      if (satir.satilabilir && satir.adet >= 1 && satir.adet < satir.istenenAdet) {
        adetDegistir(satir.birim, satir.adet);
        setAdetIndi(true);
      }
    }
  }, [durum]);

  // Hata olunca odak özete geçer: klavyeyle dolduran kişi neyi düzelteceğini duyar ve bağlantıyla alana gider.
  useEffect(() => {
    if (Object.keys(hatalar).length > 0 || genelHata !== null) ozetKutusu.current?.focus();
  }, [hatalar, genelHata]);

  // Kartla ödemeden dönülünce odak sonucun kutusuna geçer.
  useEffect(() => {
    if (donusSonucu !== null) donusKutusu.current?.focus();
  }, [donusSonucu]);

  // Kartla ödemeden dönüş: sonuç adresten okunur, form gitmeden önceki bilgilerle doldurulur.
  useEffect(() => {
    const sonuc = donusSonucunuAl();
    if (sonuc === undefined) return;
    setDonusSonucu(sonuc);
    const geri = taslagiAl();
    if (geri === undefined) return;
    setTeslimat(geri.teslimat);
    setFaturaTuru(geri.faturaTuru);
    setFaturaAyni(geri.faturaAyni);
    setFaturaAdresi(geri.faturaAdresi);
    if (
      geri.yontem !== undefined &&
      veri.yontemler.some((satir) => satir.anahtar === geri.yontem)
    ) {
      setYontem(geri.yontem);
    }
    setKisi((eski) => ({
      ad: geri.ad,
      soyad: geri.soyad,
      telefon: geri.telefon,
      surum: eski.surum + 1,
    }));
    taslaktanDoldu.current = true;
    setTaslak(geri);
  }, [veri.yontemler]);

  // Teslimat alanlarını doldurur (kayıtlı adres ya da önceki siparişin adresi). Yalnız durum ayarlayıcılarını kullanır.
  const teslimatiDoldur = useCallback((teslimatBilgisi: Teslimat) => {
    setTeslimat(formAdresi(teslimatBilgisi));
    setKisi((eski) => ({
      ad: teslimatBilgisi.ad,
      soyad: teslimatBilgisi.soyad,
      telefon: teslimatBilgisi.telefon ?? "",
      surum: eski.surum + 1,
    }));
  }, []);

  // Giriş yapmış müşterinin adres defteri sorulur (kart 0237). Kayıtlı adresi varsa varsayılan teslimat adresi seçili
  // gelir, varsayılan fatura adresi başkaysa fatura adresi de dolar. Defteri boşsa son siparişinin teslimatı önerilir
  // (kullanıcı kararı) ve "Adreslerime kaydet" işaretli gelir. Bugün teslimat yapılmayan ülkedeki adres listelenmez.
  useEffect(() => {
    if (hesap.tur !== "girisli") return;
    let gecerli = true;
    const sor = async () => {
      const yanit = await kapiyaIstek("/kapi/musteri/adresler");
      const zarf = yanit.ok ? ((await yanit.json()) as { veri?: AdresListesi }) : undefined;
      const uygun = (zarf?.veri?.adresler ?? []).filter((adres) =>
        veri.ulkeler.some((ulke) => ulke.kod === adres.teslimat.adres.ulke),
      );
      if (!gecerli) return;
      setKayitli(uygun);
      const ilk = uygun.find((adres) => adres.varsayilanTeslimat) ?? uygun[0];
      if (ilk !== undefined) {
        if (taslaktanDoldu.current) return;
        teslimatiDoldur(ilk.teslimat);
        setSecilenAdres(ilk.kimlik);
        const fatura = uygun.find((adres) => adres.varsayilanFatura);
        if (fatura !== undefined && fatura.kimlik !== ilk.kimlik) {
          setFaturaAyni(false);
          setFaturaAdresi(formAdresi(fatura.teslimat));
        }
        return;
      }
      setAdresiKaydet(true);
      const sonYanit = await kapiyaIstek("/kapi/musteri/son-teslimat");
      const son = sonYanit.ok
        ? ((await sonYanit.json()) as { veri?: { teslimat: Teslimat | null } })
        : undefined;
      if (gecerli) setOnceki(son?.veri?.teslimat ?? null);
    };
    void sor().catch(() => undefined);
    return () => {
      gecerli = false;
    };
  }, [hesap.tur, veri.ulkeler, teslimatiDoldur]);

  // Kayıtlı adres seçiliyken alanlar elle değişince seçim "Yeni adres"e geçer, alanlar kalır, "Adreslerime kaydet"
  // görünür: müşteri düzenlediği adresi kayıtlı sanmasın (bağımsız kontrolün bulgusu).
  const duzenlendi = () => {
    if (secilenAdres !== undefined && secilenAdres !== yeniAdres) setSecilenAdres(yeniAdres);
  };

  // Kayıtlı adreslerden seçim: adres alanları doldurur; "yeni" alanları boşaltır (kart 0237).
  const kayitliSec = (deger: string) => {
    setSecilenAdres(deger);
    setAdresiKaydet(false);
    const adres = kayitli?.find((kayit) => kayit.kimlik === deger);
    if (adres !== undefined) {
      teslimatiDoldur(adres.teslimat);
      return;
    }
    setTeslimat(bosAdres(ilkUlke));
    setKisi((eski) => ({ ad: "", soyad: "", telefon: "", surum: eski.surum + 1 }));
  };

  const oncekiniKullan = (teslimatBilgisi: Teslimat) => {
    teslimatiDoldur(teslimatBilgisi);
    setOncekiKullanildi(true);
  };

  const uye = hesap.tur === "girisli";
  // "Adreslerime kaydet" defteri boş müşteride ya da "Yeni adres" seçiliyken görünür.
  const kaydetGorunur =
    uye && kayitli !== null && (kayitli.length === 0 || secilenAdres === yeniAdres);
  const adlar = ulkeVerisindenAdlar(veri.ulkeler);
  const seciliYontem = veri.yontemler.find((satir) => satir.anahtar === yontem)?.secim;
  const seciliYontemAdi =
    seciliYontem === undefined
      ? undefined
      : yontemGorunusu(metin, seciliYontem, veri.havaleIptalSuresi).ad;
  // Önceki siparişin adresi yalnız ülkesine bugün teslimat yapılıyorsa önerilir.
  // Kayıtlı adresi olan müşteriye önerilmez (kullanıcı kararı, kart 0237).
  const oneri =
    uye &&
    kayitli !== null &&
    kayitli.length === 0 &&
    onceki !== null &&
    veri.ulkeler.some((ulke) => ulke.kod === onceki.adres.ulke)
      ? onceki
      : null;
  const bilinmiyor =
    hesap.tur === "bilinmiyor" || (hesap.tur === "girissiz" && !veri.uyeOlmadanAlisveris);

  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor.current || durum.tur !== "hazir" || bilinmiyor) return;
    const form = new FormData(olay.currentTarget);
    const deger = (ad: string) => String(form.get(ad) ?? "");
    const teslimatAdres = teslimat;
    const faturaAdres = faturaAdresi;
    const fatura = {
      tur: faturaTuru,
      adresAyni: faturaAyni,
      ...(faturaAyni ? {} : { adres: adresGirdisi(faturaAdres) }),
      ...(faturaTuru === "kurumsal"
        ? {
            firma: deger("bilgiler.fatura.firma"),
            vergiDairesi: deger("bilgiler.fatura.vergiDairesi"),
            vergiNumarasi: deger("bilgiler.fatura.vergiNumarasi"),
          }
        : {}),
    };
    const bilgiler = {
      odemeYontemi: veri.yontemler.find((satir) => satir.anahtar === yontem)?.secim,
      teslimat: {
        ad: deger("bilgiler.teslimat.ad"),
        soyad: deger("bilgiler.teslimat.soyad"),
        telefon: deger("bilgiler.teslimat.telefon"),
        adres: adresGirdisi(teslimatAdres),
      },
      fatura,
      not: deger("bilgiler.not"),
      onBilgilendirmeOnayi: onaylar.on,
      mesafeliSatisOnayi: onaylar.mesafeli,
      pazarlamaIzni: onaylar.pazarlama,
    };
    const girdi = uye
      ? uyeOdemeFormuSemasi.safeParse({
          bilgiler,
          ...(kaydetGorunur && adresiKaydet
            ? { adresiKaydet: { baslik: deger("adresiKaydet.baslik") } }
            : {}),
        })
      : misafirOdemeFormuSemasi.safeParse({
          eposta: deger("eposta"),
          hesap: hesapAc
            ? {
                ac: true,
                sifre: deger("hesap.sifre"),
                uyelikOnayi: onaylar.uyelik,
                kvkkOnayi: onaylar.kvkk,
              }
            : { ac: false },
          bilgiler,
        });
    setGenelHata(null);
    setDonusSonucu(null);
    const yeniHatalar: HataHaritasi = {};
    // Telefonun zorunluluğu sitenin ayarıdır: şema yalnız biçimi denetler.
    if (veri.telefonZorunlu && bilgiler.teslimat.telefon.trim() === "") {
      yeniHatalar["bilgiler.teslimat.telefon"] = metin("vitrin.odeme.hata.gerekli");
    }
    if (!girdi.success) {
      for (const sorun of girdi.error.issues) {
        const alan = sorun.path.join(".");
        if (yeniHatalar[alan] !== undefined) continue;
        yeniHatalar[alan] = hataMetni(
          metin,
          alan,
          sorun.code === "custom" ? sorun.message : sorun.code,
          veri.sinirlar.sifreEnKisa,
        );
      }
    }
    setHatalar(yeniHatalar);
    if (!girdi.success || Object.keys(yeniHatalar).length > 0) return;

    const onceki = depodan((depo) => depo.getItem(oncekiAnahtari));
    gonderiliyor.current = true;
    setBekliyor(true);
    try {
      const yanit = await robotluGonder(uye ? uyeUcu : misafirUcu, {
        ...girdi.data,
        kalemler: sepet.kalemler,
        // Özette görülen toplam: sunucu kendi hesabından farklıysa onaylamaz (tutar olarak kullanılmaz).
        gorulenToplam: durum.gorunum.toplam,
        ...(onceki === undefined ? {} : { onceki }),
      });
      const zarf = (await yanit.json().catch(() => undefined)) as
        | {
            veri?: { oturum: string; siparis?: string; yonlendir?: string };
            hata?: { kod: string; ayrinti?: { alan: string; kod: string }[] };
          }
        | undefined;
      if (yanit.ok && zarf?.veri?.yonlendir !== undefined) {
        // Kartla ödeme (kart 0215): müşteri ödeme kuruluşunun sayfasına gider. Sepet ödeme olana kadar kalır; dönüşte
        // form bu bilgilerle dolar. Oturum bir sonraki onayda serbest kalsın diye saklanır.
        const oturum = zarf.veri.oturum;
        depodan((depo) => {
          depo.setItem(oncekiAnahtari, oturum);
          return undefined;
        });
        taslagiSakla({
          eposta: deger("eposta"),
          ad: bilgiler.teslimat.ad,
          soyad: bilgiler.teslimat.soyad,
          telefon: bilgiler.teslimat.telefon,
          teslimat: teslimatAdres,
          faturaTuru,
          faturaAyni,
          faturaAdresi: faturaAdres,
          firma: deger("bilgiler.fatura.firma"),
          vergiDairesi: deger("bilgiler.fatura.vergiDairesi"),
          vergiNumarasi: deger("bilgiler.fatura.vergiNumarasi"),
          not: deger("bilgiler.not"),
          yontem,
        });
        setGidiyor("kurulus");
        window.location.assign(zarf.veri.yonlendir);
        return;
      }
      if (yanit.ok && zarf?.veri !== undefined) {
        // Sipariş oluştu: oturum siparişe döndü, sepetin siparişe giren kalemleri çıkar. Sipariş alındı sayfası
        // siparişi çerezdeki erişim anahtarıyla açar.
        depodan((depo) => {
          depo.removeItem(oncekiAnahtari);
          return undefined;
        });
        siparisKalemleriniCikar(sepet.kalemler.map((kalem) => kalem.birim));
        setGidiyor("siparis");
        window.location.assign(vitrinAdresleri.siparisAlindi);
        return;
      }
      const ayrinti = zarf?.hata?.ayrinti ?? [];
      if (yanit.status === hataKodlari["oturum-yok"]) {
        window.location.assign(girisAdresiDonuslu(vitrinAdresleri.odeme));
        return;
      }
      if (
        (yanit.status === hataKodlari.dogrulama ||
          (yanit.status === hataKodlari["is-kurali"] &&
            ayrinti.some(({ kod }) => kod === "yontem-kapali" || kod === "yontem-ulasilamadi"))) &&
        ayrinti.length > 0 &&
        ayrinti.every(({ alan }) => alan in alanAdlari)
      ) {
        setHatalar(
          Object.fromEntries(
            ayrinti.map(({ alan, kod }) => [
              alan,
              hataMetni(metin, alan, kod, veri.sinirlar.sifreEnKisa),
            ]),
          ),
        );
      } else if (
        yanit.status === hataKodlari["is-kurali"] ||
        yanit.status === hataKodlari.dogrulama
      ) {
        // Alanı formda olmayan doğrulama hatası (sepetin kalemleri) sepetin değiştiği sayılır.
        setGenelHata(
          ayrinti.some(({ kod }) => kod === "sepet-bos") ? "sepet-bos" : "sepet-degisti",
        );
        setYenileme((sayi) => sayi + 1);
      } else if (yanit.status === hataKodlari.cakisma) {
        setGenelHata(
          ayrinti.some(({ kod }) => kod === "stok-ayrildi") ? "stok-ayrildi" : "kayitli",
        );
      } else if (yanit.status === hataKodlari["istek-siniri"]) {
        setGenelHata("sinir");
      } else {
        setGenelHata("genel");
      }
    } catch {
      setGenelHata("genel");
    } finally {
      gonderiliyor.current = false;
      setBekliyor(false);
    }
  };

  // Sözleşme penceresinin alıcı satırları formun o anki değerlerinden.
  const aliciyiOku = () => {
    const form = document.getElementById("odeme-formu");
    if (!(form instanceof HTMLFormElement)) return;
    const veriler = new FormData(form);
    const satirlar = [
      `${String(veriler.get("bilgiler.teslimat.ad") ?? "")} ${String(veriler.get("bilgiler.teslimat.soyad") ?? "")}`.trim(),
      teslimat.adres.trim(),
      String(veriler.get("bilgiler.teslimat.telefon") ?? "").trim(),
      uye && hesap.tur === "girisli" ? hesap.eposta : String(veriler.get("eposta") ?? "").trim(),
    ].filter((satir) => satir !== "");
    setAlici(satirlar);
  };

  // Boş sepet: sunucu çerezde kalem görmediyse (karar 0136) boş hâl sepet bilinmeden de çizilir; depoda kalem çıkarsa
  // form çizilir.
  const bosBilinir = veri.cerezdeBos && (!sepet.hazir || sepet.kalemler.length === 0);
  if (gidiyor !== false) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <p>
          {metin(
            gidiyor === "kurulus" ? "vitrin.odeme.yonlendiriliyor" : "vitrin.odeme.siparisAlindi",
          )}
        </p>
        <IskeletGorunum className="h-20 w-full" />
      </div>
    );
  }
  if ((sepet.hazir && sepet.kalemler.length === 0) || bosBilinir) {
    return (
      <BosHal
        ikon="sepet"
        baslik={metin("vitrin.sepet.bosBaslik")}
        aciklama={metin("vitrin.sepet.bosAciklama")}
      >
        <Baglanti href={vitrinAdresleri.anasayfa} gorunum="birincil">
          {metin("vitrin.sepet.alisveriseBasla")}
        </Baglanti>
      </BosHal>
    );
  }
  // Form sunucuda hemen çizilir; özet ve iletişim bölümü bilgileri gelene kadar iskelettir (hız hedefi, karar 0124).
  const gorunum = durum.tur === "hazir" ? durum.gorunum : undefined;
  // Satılamayan satır ya da alım adedi ödemeyi durdurur: müşteri sepette düzeltir (karar 0132).
  if (gorunum !== undefined && !gorunum.odemeyeGecilebilir) {
    return (
      <Uyari tur="tehlike">
        <p>{metin("vitrin.sepet.odemeEngeli")}</p>
        <Baglanti href={vitrinAdresleri.sepet}>{metin("vitrin.sepet.sepeteGit")}</Baglanti>
      </Uyari>
    );
  }
  const degisiklik =
    adetIndi || (gorunum?.satirlar.some((satir) => satir.uyarilar.length > 0) ?? false);
  const ozetIcerigi =
    gorunum !== undefined ? (
      <Ozet gorunum={gorunum} />
    ) : durum.tur === "hata" ? (
      <Uyari tur="tehlike">{metin("vitrin.odeme.sepetHata")}</Uyari>
    ) : (
      <Yukleniyor />
    );

  const hataSayisi = Object.keys(hatalar).length;
  const odak = (ad: string) => () => {
    const kimlik = kimlikler[ad];
    if (kimlik !== undefined) document.getElementById(kimlik)?.focus();
  };

  return (
    <Form
      id="odeme-formu"
      onSubmit={gonder}
      kodGerekliMetni={metin("ortak.form.kodGerekli")}
      yukleniyorMetni={metin("ortak.form.yukleniyor")}
      className="flex flex-col gap-6"
    >
      <div ref={ozetKutusu} tabIndex={-1} className="flex flex-col gap-3 empty:hidden">
        {hataSayisi > 0 ? (
          <Uyari
            tur="tehlike"
            baslik={doldur(metin("vitrin.odeme.hata.ozet"), { sayi: String(hataSayisi) })}
          >
            <ul className="flex flex-col gap-1">
              {Object.keys(hatalar).map((alan) => (
                <li key={alan}>
                  <Dugme tur="baglanti" className="min-h-0 text-tehlike-yazi" onClick={odak(alan)}>
                    {metin(alanAdlari[alan] ?? "vitrin.odeme.baslik")}
                  </Dugme>
                </li>
              ))}
            </ul>
          </Uyari>
        ) : null}
        {degisiklik && genelHata === null ? (
          <Uyari tur="uyari">{metin("vitrin.sepet.degisiklikVar")}</Uyari>
        ) : null}
        {genelHata === null ? null : (
          <Uyari tur="tehlike">
            <p>{metin(genelHataMetinleri[genelHata])}</p>
            {genelHata === "kayitli" ? (
              <Baglanti href={girisAdresiDonuslu(vitrinAdresleri.odeme)}>
                {metin("vitrin.odeme.girisBaglanti")}
              </Baglanti>
            ) : null}
          </Uyari>
        )}
      </div>
      <div className="flex flex-col gap-6 masaustu:flex-row masaustu:items-start masaustu:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Telefonda özet en üstte kapalıdır, toplamı görünür. */}
          <Akordeon
            type="single"
            collapsible
            className="rounded-orta border border-kenar bg-zemin px-5 masaustu:hidden"
          >
            <AkordeonOgesi value="ozet">
              <AkordeonBasligi duzey={2}>
                <span className="flex flex-1 justify-between gap-3">
                  <span>
                    {gorunum === undefined
                      ? metin("vitrin.odeme.ozet")
                      : doldur(metin("vitrin.odeme.ozetAdetli"), { sayi: String(gorunum.adet) })}
                  </span>
                  <span className="whitespace-nowrap">{gorunum?.yazili.toplam}</span>
                </span>
              </AkordeonBasligi>
              <AkordeonIcerigi>{ozetIcerigi}</AkordeonIcerigi>
            </AkordeonOgesi>
          </Akordeon>

          <Bolum
            no={1}
            baslik={metin("vitrin.odeme.bolum.iletisim")}
            ek={
              uye || bilinmiyor ? null : (
                <Baglanti href={girisAdresiDonuslu(vitrinAdresleri.odeme)}>
                  {metin("vitrin.odeme.girisBaglanti")}
                </Baglanti>
              )
            }
          >
            {bilinmiyor ? (
              <Yukleniyor />
            ) : hesap.tur === "girisli" ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="wrap-anywhere">{hesap.eposta}</span>
                <Dugme tur="baglanti" onClick={() => void cikisYap()}>
                  {metin("vitrin.odeme.cikis")}
                </Dugme>
              </div>
            ) : (
              <>
                <MetinAlani
                  key={`eposta-${kisi.surum}`}
                  ad="eposta"
                  {...(taslak === null ? {} : { varsayilan: taslak.eposta })}
                  etiket={metin("vitrin.odeme.eposta")}
                  aciklama={metin("vitrin.odeme.epostaAciklama")}
                  type="email"
                  autoComplete="email"
                  hatalar={hatalar}
                  kimlikler={kimlikler}
                />
                <OnayKutusu
                  etiket={metin("vitrin.odeme.hesapAc")}
                  checked={hesapAc}
                  onCheckedChange={(deger) => setHesapAc(deger === true)}
                />
                {hesapAc ? (
                  <>
                    <MetinAlani
                      ad="hesap.sifre"
                      etiket={metin("vitrin.kayit.sifre")}
                      aciklama={doldur(metin("vitrin.kayit.sifreAciklama"), {
                        enKisa: String(veri.sinirlar.sifreEnKisa),
                      })}
                      type="password"
                      autoComplete="new-password"
                      hatalar={hatalar}
                      kimlikler={kimlikler}
                    />
                    <OnayKutusu
                      etiket={metin("vitrin.kayit.uyelikOnayi")}
                      checked={onaylar.uyelik}
                      onCheckedChange={(deger) =>
                        setOnaylar({ ...onaylar, uyelik: deger === true })
                      }
                      hata={hatalar["hesap.uyelikOnayi"]}
                      ek={
                        <Baglanti href={vitrinAdresleri.uyelikSozlesmesi} target="_blank">
                          {metin("vitrin.kayit.uyelikBaglanti")}
                        </Baglanti>
                      }
                    />
                    <OnayKutusu
                      etiket={metin("vitrin.kayit.kvkkOnayi")}
                      checked={onaylar.kvkk}
                      onCheckedChange={(deger) => setOnaylar({ ...onaylar, kvkk: deger === true })}
                      hata={hatalar["hesap.kvkkOnayi"]}
                      ek={
                        <Baglanti href={vitrinAdresleri.kvkkAydinlatma} target="_blank">
                          {metin("vitrin.kayit.kvkkBaglanti")}
                        </Baglanti>
                      }
                    />
                  </>
                ) : null}
              </>
            )}
          </Bolum>

          <Bolum no={2} baslik={metin("vitrin.odeme.bolum.teslimat")}>
            {uye && kayitli !== null && kayitli.length > 0 ? (
              <SecenekGrubu
                baslik={metin("vitrin.odeme.kayitliAdresler")}
                etiket={metin("vitrin.odeme.kayitliAdresler")}
                gorunum="kart"
                ogeler={[
                  ...kayitli.map((adres) => ({
                    deger: adres.kimlik,
                    ad: adres.baslik,
                    aciklama: `${adres.teslimat.ad} ${adres.teslimat.soyad} · ${adresSatiri(adres.teslimat.adres, adlar)}`,
                    ikon: "konum" as const,
                  })),
                  { deger: yeniAdres, ad: metin("vitrin.odeme.yeniAdres"), ikon: "ekle" as const },
                ]}
                deger={secilenAdres}
                onDegerDegisti={kayitliSec}
                secilemezEki=""
              />
            ) : null}
            {oneri !== null ? (
              <Uyari tur="bilgi" baslik={metin("vitrin.odeme.oncekiAdres")}>
                <span className="flex flex-col items-start gap-2">
                  <span className="wrap-anywhere">
                    {doldur(metin("vitrin.odeme.oncekiAdresSatiri"), {
                      ad: oneri.ad,
                      soyad: oneri.soyad,
                      adres: oneri.adres.adres,
                    })}
                  </span>
                  <Dugme tur="cerceveli" onClick={() => oncekiniKullan(oneri)}>
                    {metin("vitrin.odeme.oncekiAdresiKullan")}
                  </Dugme>
                  {/* Alanlar dolunca ekran okuyucuya söylenir. */}
                  <span role="status" className="text-kucuk">
                    {oncekiKullanildi ? metin("vitrin.odeme.oncekiAdresKullanildi") : null}
                  </span>
                </span>
              </Uyari>
            ) : null}
            <div key={kisi.surum} className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
              <MetinAlani
                ad="bilgiler.teslimat.ad"
                onDegisti={duzenlendi}
                etiket={metin("vitrin.odeme.ad")}
                autoComplete="given-name"
                {...(kisi.surum === 0 ? {} : { varsayilan: kisi.ad })}
                hatalar={hatalar}
                kimlikler={kimlikler}
              />
              <MetinAlani
                ad="bilgiler.teslimat.soyad"
                onDegisti={duzenlendi}
                etiket={metin("vitrin.odeme.soyad")}
                autoComplete="family-name"
                {...(kisi.surum === 0 ? {} : { varsayilan: kisi.soyad })}
                hatalar={hatalar}
                kimlikler={kimlikler}
              />
              <div className="tablet:col-span-2">
                <MetinAlani
                  ad="bilgiler.teslimat.telefon"
                  onDegisti={duzenlendi}
                  etiket={metin(
                    veri.telefonZorunlu
                      ? "vitrin.odeme.telefon"
                      : "vitrin.odeme.telefonIstegeBagli",
                  )}
                  aciklama={metin("vitrin.odeme.telefonAciklama")}
                  type="tel"
                  autoComplete="tel"
                  {...(kisi.surum === 0 ? {} : { varsayilan: kisi.telefon })}
                  hatalar={hatalar}
                  kimlikler={kimlikler}
                />
              </div>
            </div>
            <AdresAlanlari
              onEk="bilgiler.teslimat.adres"
              adres={teslimat}
              degistir={(yeni) => {
                setTeslimat(yeni);
                duzenlendi();
              }}
              ulkeler={veri.ulkeler}
              hatalar={hatalar}
              kimlikler={kimlikler}
            />
            {kaydetGorunur ? (
              <div className="flex flex-col gap-3">
                <OnayKutusu
                  etiket={metin("vitrin.odeme.adresiKaydet")}
                  checked={adresiKaydet}
                  onCheckedChange={(deger) => setAdresiKaydet(deger === true)}
                />
                {adresiKaydet ? (
                  <MetinAlani
                    ad="adresiKaydet.baslik"
                    etiket={metin("vitrin.hesap.adresler.baslikAlani")}
                    aciklama={metin("vitrin.hesap.adresler.baslikAciklama")}
                    varsayilan={metin("vitrin.odeme.adresAdiVarsayilan")}
                    hatalar={hatalar}
                    kimlikler={kimlikler}
                  />
                ) : null}
              </div>
            ) : null}
          </Bolum>

          <Bolum no={3} baslik={metin("vitrin.odeme.bolum.fatura")}>
            <SecenekGrubu
              baslik={metin("vitrin.odeme.faturaTuru")}
              etiket={metin("vitrin.odeme.faturaTuru")}
              ogeler={[
                { deger: "bireysel", ad: metin("vitrin.odeme.bireysel") },
                { deger: "kurumsal", ad: metin("vitrin.odeme.kurumsal") },
              ]}
              deger={faturaTuru}
              onDegerDegisti={(yeni) =>
                setFaturaTuru(yeni === "kurumsal" ? "kurumsal" : "bireysel")
              }
              secilemezEki=""
            />
            {faturaTuru === "kurumsal" ? (
              <div key={kisi.surum} className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                <div className="tablet:col-span-2">
                  <MetinAlani
                    ad="bilgiler.fatura.firma"
                    {...(taslak === null ? {} : { varsayilan: taslak.firma })}
                    etiket={metin("vitrin.odeme.firma")}
                    autoComplete="organization"
                    hatalar={hatalar}
                    kimlikler={kimlikler}
                  />
                </div>
                <MetinAlani
                  ad="bilgiler.fatura.vergiDairesi"
                  {...(taslak === null ? {} : { varsayilan: taslak.vergiDairesi })}
                  etiket={metin("vitrin.odeme.vergiDairesi")}
                  hatalar={hatalar}
                  kimlikler={kimlikler}
                />
                <MetinAlani
                  ad="bilgiler.fatura.vergiNumarasi"
                  {...(taslak === null ? {} : { varsayilan: taslak.vergiNumarasi })}
                  etiket={metin("vitrin.odeme.vergiNumarasi")}
                  aciklama={metin("vitrin.odeme.vergiNumarasiAciklama")}
                  inputMode="numeric"
                  hatalar={hatalar}
                  kimlikler={kimlikler}
                />
              </div>
            ) : null}
            <OnayKutusu
              etiket={metin("vitrin.odeme.faturaAdresiAyni")}
              checked={faturaAyni}
              onCheckedChange={(deger) => setFaturaAyni(deger === true)}
            />
            {faturaAyni ? null : (
              <AdresAlanlari
                onEk="bilgiler.fatura.adres"
                adres={faturaAdresi}
                degistir={setFaturaAdresi}
                ulkeler={veri.ulkeler}
                hatalar={hatalar}
                kimlikler={kimlikler}
              />
            )}
          </Bolum>

          <Bolum no={4} baslik={metin("vitrin.odeme.bolum.yontem")}>
            {/* Kartla ödemeden dönüş (kart 0215): taslaktaki gibi yöntemlerin üstünde; dönüşte odak buradadır. */}
            {donusSonucu === null ? null : (
              <div ref={donusKutusu} tabIndex={-1}>
                <Uyari tur="tehlike" baslik={metin("vitrin.odeme.kartDonusu.baslik")}>
                  <p>{metin(`vitrin.odeme.kartDonusu.${donusSonucu}`)}</p>
                </Uyari>
              </div>
            )}
            {veri.yontemler.length === 0 ? (
              <Uyari tur="tehlike">{metin("vitrin.odeme.yontemYok")}</Uyari>
            ) : (
              <div
                ref={(oge) => {
                  // Hata özetindeki bağlantı seçili yönteme odaklanır.
                  const radyo =
                    oge?.querySelector<HTMLElement>('[role="radio"][data-state="checked"]') ??
                    oge?.querySelector<HTMLElement>('[role="radio"]');
                  if (radyo !== null && radyo !== undefined) {
                    if (radyo.id === "") radyo.id = "odeme-yontemi";
                    kimlikler["bilgiler.odemeYontemi"] = radyo.id;
                  }
                }}
              >
                <SecenekGrubu
                  baslik={<span className="sr-only">{metin("vitrin.odeme.bolum.yontem")}</span>}
                  etiket={metin("vitrin.odeme.bolum.yontem")}
                  gorunum="kart"
                  ogeler={veri.yontemler.map(({ anahtar, secim }) => ({
                    deger: anahtar,
                    ...yontemGorunusu(metin, secim, veri.havaleIptalSuresi),
                  }))}
                  deger={yontem}
                  onDegerDegisti={setYontem}
                  secilemezEki=""
                  {...(hatalar["bilgiler.odemeYontemi"] === undefined
                    ? {}
                    : { hata: hatalar["bilgiler.odemeYontemi"] })}
                />
              </div>
            )}
          </Bolum>

          <Bolum no={5} baslik={metin("vitrin.odeme.bolum.not")}>
            <FormAlani
              etiket={metin("vitrin.odeme.notu")}
              aciklama={doldur(metin("vitrin.odeme.notAciklama"), {
                sinir: String(veri.sinirlar.not),
              })}
              {...(hatalar["bilgiler.not"] === undefined ? {} : { hata: hatalar["bilgiler.not"] })}
            >
              {(alan) => {
                kimlikler["bilgiler.not"] = alan.id;
                return (
                  <UzunMetinAlani
                    key={`not-${kisi.surum}`}
                    {...alan}
                    {...(taslak === null ? {} : { defaultValue: taslak.not })}
                    name="bilgiler.not"
                    rows={3}
                    maxLength={veri.sinirlar.not}
                  />
                );
              }}
            </FormAlani>
          </Bolum>
        </div>

        <div className="flex flex-col gap-4 masaustu:sticky masaustu:top-4 masaustu:w-form masaustu:shrink-0">
          <section
            aria-labelledby="odeme-ozet-basligi"
            className="hidden flex-col gap-4 rounded-orta border border-kenar bg-zemin p-5 masaustu:flex"
          >
            <h2 id="odeme-ozet-basligi" className="font-baslik text-baslik-4 font-baslik-kalinligi">
              {metin("vitrin.odeme.ozet")}
            </h2>
            {ozetIcerigi}
          </section>
          <div className="flex flex-col gap-2 rounded-orta border border-kenar bg-zemin p-5">
            <OnayKutusu
              etiket={metin("vitrin.odeme.onBilgilendirmeOnayi")}
              checked={onaylar.on}
              onCheckedChange={(deger) => setOnaylar({ ...onaylar, on: deger === true })}
              hata={hatalar["bilgiler.onBilgilendirmeOnayi"]}
              ek={
                <span onFocusCapture={aliciyiOku} onPointerDownCapture={aliciyiOku}>
                  <SozlesmePenceresi
                    baslik={metin("vitrin.odeme.sozlesme.onBilgilendirme")}
                    veri={veri}
                    alici={alici}
                    gorunum={gorunum}
                    yontem={seciliYontemAdi}
                  />
                </span>
              }
            />
            <OnayKutusu
              etiket={metin("vitrin.odeme.mesafeliSatisOnayi")}
              checked={onaylar.mesafeli}
              onCheckedChange={(deger) => setOnaylar({ ...onaylar, mesafeli: deger === true })}
              hata={hatalar["bilgiler.mesafeliSatisOnayi"]}
              ek={
                <span onFocusCapture={aliciyiOku} onPointerDownCapture={aliciyiOku}>
                  <SozlesmePenceresi
                    baslik={metin("vitrin.odeme.sozlesme.mesafeliSatis")}
                    veri={veri}
                    alici={alici}
                    gorunum={gorunum}
                    yontem={seciliYontemAdi}
                  />
                </span>
              }
            />
            {/* Pazarlama onayının metni bütün formlarda tektir (vitrin.onay.pazarlama, kart 0112). */}
            <OnayKutusu
              etiket={doldur(metin("vitrin.kayit.pazarlamaIzni"), {
                onay: metin("vitrin.onay.pazarlama"),
              })}
              checked={onaylar.pazarlama}
              onCheckedChange={(deger) => setOnaylar({ ...onaylar, pazarlama: deger === true })}
            />
            <p className="text-kucuk text-soluk-yazi">
              {metin("vitrin.odeme.kvkkNotu")}{" "}
              <Baglanti href={vitrinAdresleri.kvkkAydinlatma} target="_blank" className="inline">
                {metin("vitrin.kayit.kvkkBaglanti")}
              </Baglanti>
            </p>
            {bekliyor ? <p role="status">{metin("vitrin.odeme.gonderiliyor")}</p> : null}
            <GonderDugmesi className="w-full" disabled={bekliyor}>
              {metin("vitrin.odeme.onayla")}
            </GonderDugmesi>
            <p className="text-kucuk text-soluk-yazi">{metin("vitrin.odeme.yukumluluk")}</p>
          </div>
        </div>
      </div>
    </Form>
  );
}
