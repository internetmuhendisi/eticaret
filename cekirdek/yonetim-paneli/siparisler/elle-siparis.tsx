"use client";
// Elle sipariş ekranı (kart 0236, karar 0148; kart 0233'ün taslağı): solda ürünler, müşteri, teslimat, fatura ve
// ödeme; sağda sunucunun hesabıyla özet ve "Siparişi oluştur". Masaüstünde iki sütun, daha darda tek sütun.
//
// - Ürün aranarak eklenir (vitrinde sayfası açılan ürünlerin birimleri); satılamayan birim seçilemez. Adet sepetin
//   sınırıyla.
// - Özetin tutarları elle sipariş hesabı ucundan (vitrinin sepetiyle aynı hesap), teslimat ve fatura bölgesiyle; tarayıcı
//   tutar hesaplamaz, göndermez. Görülen toplam yalnız karşılaştırılır: sunucuda değiştiyse sipariş kurulmaz, özet
//   yenilenir.
// - Müşteri üye (e-postasıyla aranır, son siparişinin adresi önerilir) ya da üye olmayan (e-posta yazılır).
// - Teslimat, fatura ve not vitrinin ödeme adımının alanları ve şemasıyladır (cekirdek/vitrin/odeme/alanlar.tsx).
// - Ödeme: sitede açık havale ve kapıda ödeme seçenekleri, izni olana "ödeme alındı". Metinlerin müşteriye iletildiği
//   işaretlenmeden sipariş kurulmaz (kullanıcı kararı).
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { AdetSecici } from "../../../bilesenler/parcalar/adet-secici";
import { bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { Dugme, IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";

import { Kart } from "../../../bilesenler/parcalar/kart";
import { OnayKutusu } from "../../../bilesenler/parcalar/onay-kutusu";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import type { Teslimat } from "../../moduller/odeme/semalar";
import type { ElleSiparisBirimi, ElleSiparisMusterisi } from "../../moduller/siparis/elle";
import {
  type ElleSiparisOdemesi,
  elleSiparisMusteriAramaSiniri,
  elleSiparisSemasi,
} from "../../moduller/siparis/semalar";
import {
  type Adres,
  AdresAlanlari,
  type AlanKimlikleri,
  adresGirdisi,
  bosAdres,
  type HataHaritasi,
  hataMetni,
  MetinAlani,
  vergiBolgesi,
} from "../../vitrin/odeme/alanlar";
import { durdurur, SepetOzeti, uyariYazisi } from "../../vitrin/sepet/sepet-gorunumu";
import type { SepetGorunumu } from "../../vitrin/sepet/veri";
import { panelAdresi } from "../adresler";
import { type AramaOnerisi, KayitArama } from "../kayit-arama";
import { panelIstegi } from "../panel-istegi";
import type { ElleSiparisVerisi } from "./elle-veri";
import { odemeYazisi } from "./metinler";

type Kalem = { birim: string; ad: string; adet: number };
type UrunOnerisi = AramaOnerisi;
type MusteriOnerisi = AramaOnerisi & { teslimat: Teslimat | null };

// Sunucunun bilinen hata kodunun ekrandaki metni.
const genelHatalar: Record<string, MetinAnahtari> = {
  "sepet-degisti": "yonetim.elleSiparis.hata.sepetDegisti",
  "sepet-bos": "yonetim.elleSiparis.hata.sepetBos",
  "stok-ayrildi": "yonetim.elleSiparis.hata.stokAyrildi",
  "yontem-kapali": "yonetim.elleSiparis.hata.yontemKapali",
};

const ozelAlanlar: Record<string, MetinAnahtari> = {
  "musteri.kimlik": "yonetim.elleSiparis.hata.musteriSec",
  "musteri.eposta": "vitrin.odeme.hata.eposta",
  "bilgiler.odemeYontemi": "vitrin.odeme.hata.yontem",
  "bilgiler.metinlerIletildi": "yonetim.elleSiparis.hata.metinler",
  kalemler: "yonetim.elleSiparis.hata.sepetBos",
};

// Ekrandaki sıra: odak ilk hatalı alana gider (hata toplanma sırası değil).
const alanSirasi = [
  "kalemler",
  "musteri.kimlik",
  "musteri.eposta",
  "bilgiler.teslimat.ad",
  "bilgiler.teslimat.soyad",
  "bilgiler.teslimat.telefon",
  "bilgiler.teslimat.adres.ulke",
  "bilgiler.teslimat.adres.il",
  "bilgiler.teslimat.adres.ilce",
  "bilgiler.teslimat.adres.adres",
  "bilgiler.teslimat.adres.postaKodu",
  "bilgiler.fatura.firma",
  "bilgiler.fatura.vergiDairesi",
  "bilgiler.fatura.vergiNumarasi",
  "bilgiler.fatura.adres.ulke",
  "bilgiler.fatura.adres.il",
  "bilgiler.fatura.adres.ilce",
  "bilgiler.fatura.adres.adres",
  "bilgiler.fatura.adres.postaKodu",
  "bilgiler.odemeYontemi",
  "bilgiler.not",
  "bilgiler.metinlerIletildi",
];
const ilkHata = (hatalar: HataHaritasi): string | undefined =>
  alanSirasi.find((alan) => hatalar[alan] !== undefined) ?? Object.keys(hatalar)[0];

export function ElleSiparis({ veri }: { veri: ElleSiparisVerisi }) {
  const metin = usePanelMetni();
  const router = useRouter();
  const ilkUlke = veri.ulkeler[0]?.kod ?? "";
  const [kalemler, setKalemler] = useState<Kalem[]>([]);
  const [musteriTuru, setMusteriTuru] = useState<"uye" | "misafir">("uye");
  const [musteri, setMusteri] = useState<MusteriOnerisi | undefined>(undefined);
  const [eposta, setEposta] = useState("");
  const [kisi, setKisi] = useState({ ad: "", soyad: "", telefon: "" });
  const [teslimat, setTeslimat] = useState<Adres>(bosAdres(ilkUlke));
  const [faturaTuru, setFaturaTuru] = useState<"bireysel" | "kurumsal">("bireysel");
  const [kurumsal, setKurumsal] = useState({ firma: "", vergiDairesi: "", vergiNumarasi: "" });
  const [faturaAyni, setFaturaAyni] = useState(true);
  const [faturaAdresi, setFaturaAdresi] = useState<Adres>(bosAdres(ilkUlke));
  const [odeme, setOdeme] = useState<string | undefined>(
    veri.yontemler.length === 1 ? veri.yontemler[0]?.anahtar : undefined,
  );
  const [not, setNot] = useState("");
  const [iletildi, setIletildi] = useState(false);
  const [hatalar, setHatalar] = useState<HataHaritasi>({});
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [gorunum, setGorunum] = useState<SepetGorunumu | null>(null);
  const [yenileme, setYenileme] = useState(0);
  const gonderiliyor = useRef(false);
  const kimlikler = useRef<AlanKimlikleri>({}).current;
  const genelKutu = useRef<HTMLDivElement>(null);

  // Özet: kalemler ya da vergi bölgesi değişince sunucudan (yazma durunca).
  const bolgeler = {
    teslimat: vergiBolgesi(teslimat),
    fatura: vergiBolgesi(faturaAyni ? teslimat : faturaAdresi),
  };
  const anahtar = JSON.stringify([kalemler.map((k) => [k.birim, k.adet]), bolgeler, yenileme]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: istek yalnız kalemler, bölge ve yenileme değişince gider.
  useEffect(() => {
    if (kalemler.length === 0) {
      setGorunum(null);
      return;
    }
    let gecerli = true;
    const zamanlayici = setTimeout(async () => {
      const sonuc = await panelIstegi<SepetGorunumu>("elle-siparis-hesabi", {
        kalemler: kalemler.map(({ birim, adet }) => ({ birim, adet })),
        vergiBolgeleri: bolgeler,
      });
      if (!gecerli) return;
      if (sonuc.tamam) setGorunum(sonuc.veri);
      else setGenelHata(metin("yonetim.elleSiparis.hata.genel"));
    }, 250);
    return () => {
      gecerli = false;
      clearTimeout(zamanlayici);
    };
  }, [anahtar]);

  // Düzeltilen seçimin hatası kalkar (öteki alanlar bir sonraki gönderimde denetlenir).
  const temizle = (alan: string) =>
    setHatalar((onceki) => {
      if (onceki[alan] === undefined) return onceki;
      const { [alan]: _kalkan, ...kalan } = onceki;
      return kalan;
    });

  const satirOf = (birim: string) => gorunum?.satirlar.find((satir) => satir.birim === birim);

  const urunAra = async (aranan: string) => {
    const sonuc = await panelIstegi<{ birimler: ElleSiparisBirimi[] }>(
      `elle-siparis-urunleri?${new URLSearchParams({ ara: aranan })}`,
    );
    if (!sonuc.tamam) return sonuc;
    return {
      tamam: true as const,
      veri: {
        dahaVar: false,
        kayitlar: sonuc.veri.birimler.map(
          (birim): UrunOnerisi => ({
            kimlik: birim.birim,
            ad: birim.secim === "" ? birim.ad : `${birim.ad} · ${birim.secim}`,
            aciklama: birim.satilabilir
              ? (birim.yaziliFiyat ?? "")
              : metin("yonetim.elleSiparis.satilamaz"),
            secilemez: !birim.satilabilir,
          }),
        ),
      },
    };
  };

  const musteriAra = async (aranan: string) => {
    // En az 3 harf (uç da ister): kısa yazıda istek gitmez, öneri yoktur.
    if (aranan.trim().length < elleSiparisMusteriAramaSiniri) {
      return { tamam: true as const, veri: { dahaVar: false, kayitlar: [] as MusteriOnerisi[] } };
    }
    const sonuc = await panelIstegi<{ musteriler: ElleSiparisMusterisi[] }>(
      `elle-siparis-musterileri?${new URLSearchParams({ ara: aranan })}`,
    );
    if (!sonuc.tamam) return sonuc;
    return {
      tamam: true as const,
      veri: {
        dahaVar: false,
        kayitlar: sonuc.veri.musteriler.map(
          (bulunan): MusteriOnerisi => ({
            kimlik: bulunan.kimlik,
            ad: bulunan.eposta,
            teslimat: bulunan.sonTeslimat,
          }),
        ),
      },
    };
  };

  const ekle = (oneri: UrunOnerisi | undefined) => {
    if (oneri === undefined) return;
    setKalemler((onceki) =>
      onceki.some((kalem) => kalem.birim === oneri.kimlik)
        ? onceki.map((kalem) =>
            kalem.birim === oneri.kimlik ? { ...kalem, adet: kalem.adet + 1 } : kalem,
          )
        : [...onceki, { birim: oneri.kimlik, ad: oneri.ad, adet: 1 }],
    );
    temizle("kalemler");
  };

  const sonAdresiKullan = (son: Teslimat) => {
    setKisi({ ad: son.ad, soyad: son.soyad, telefon: son.telefon ?? "" });
    setTeslimat({
      ulke: son.adres.ulke,
      il: son.adres.il ?? "",
      ilce: son.adres.ilce ?? "",
      adres: son.adres.adres,
      postaKodu: son.adres.postaKodu ?? "",
    });
  };

  const secilenOdeme = (): ElleSiparisOdemesi | undefined =>
    veri.yontemler.find((yontem) => yontem.anahtar === odeme)?.secim;

  // Odak alanın kendisine: kutuysa içindeki seçili radyo, arama kutusu ya da onay kutusu.
  const odak = (alan: string) => {
    const kimlik = kimlikler[alan];
    if (kimlik !== undefined) {
      document.getElementById(kimlik)?.focus();
      return;
    }
    const kutu = document.querySelector<HTMLElement>(`[data-elle-alani="${alan}"]`);
    const icindeki =
      kutu?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]') ??
      kutu?.querySelector<HTMLElement>(
        '[role="radio"], [role="combobox"], button[role="checkbox"]',
      );
    (icindeki ?? kutu)?.focus();
  };

  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor.current) return;
    setGenelHata(null);
    const girdi = elleSiparisSemasi.safeParse({
      musteri:
        musteriTuru === "uye"
          ? { tur: "uye", kimlik: musteri?.kimlik ?? "" }
          : { tur: "misafir", eposta },
      kalemler: kalemler.map(({ birim, adet }) => ({ birim, adet })),
      bilgiler: {
        odemeYontemi: secilenOdeme(),
        teslimat: { ...kisi, adres: adresGirdisi(teslimat) },
        fatura:
          faturaTuru === "kurumsal"
            ? {
                tur: "kurumsal",
                ...kurumsal,
                adresAyni: faturaAyni,
                ...(faturaAyni ? {} : { adres: adresGirdisi(faturaAdresi) }),
              }
            : {
                tur: "bireysel",
                adresAyni: faturaAyni,
                ...(faturaAyni ? {} : { adres: adresGirdisi(faturaAdresi) }),
              },
        not,
        metinlerIletildi: iletildi,
      },
      ...(gorunum === null ? {} : { gorulenToplam: gorunum.toplam }),
    });
    const yeni: HataHaritasi = {};
    if (veri.telefonZorunlu && kisi.telefon.trim() === "") {
      yeni["bilgiler.teslimat.telefon"] = metin("vitrin.odeme.hata.gerekli");
    }
    if (!girdi.success) {
      for (const sorun of girdi.error.issues) {
        const alan = sorun.path.join(".");
        const kok = alan.startsWith("kalemler") ? "kalemler" : alan;
        if (yeni[kok] !== undefined) continue;
        const ozel = ozelAlanlar[kok];
        yeni[kok] =
          ozel === undefined
            ? hataMetni(metin, alan, sorun.code === "custom" ? sorun.message : sorun.code, 0)
            : metin(ozel);
      }
    }
    setHatalar(yeni);
    const ilk = ilkHata(yeni);
    if (!girdi.success || ilk !== undefined) {
      if (ilk !== undefined) odak(ilk);
      return;
    }
    // Özet görülmeden (henüz gelmedi ya da okunamadı) sipariş gönderilmez: sunucu görülen toplamı karşılaştırır.
    if (gorunum === null) {
      setGenelHata(metin("yonetim.elleSiparis.hata.ozetYok"));
      requestAnimationFrame(() => genelKutu.current?.focus());
      return;
    }
    gonderiliyor.current = true;
    const sonuc = await panelIstegi<{ numara: string }>("elle-siparis", girdi.data);
    gonderiliyor.current = false;
    if (sonuc.tamam) {
      bildirimGoster(
        "basari",
        doldur(metin("yonetim.elleSiparis.basari"), { numara: sonuc.veri.numara }),
      );
      router.push(
        `${panelAdresi}/siparisler/ayrinti?numara=${encodeURIComponent(sonuc.veri.numara)}`,
      );
      return;
    }
    // Alanın hatası alanda; bilinen iş hatası (sepet değişti, stok) üstte ve özet yenilenir.
    const alanHatalari: HataHaritasi = {};
    for (const sorun of sonuc.ayrinti) {
      const genel = genelHatalar[sorun.kod];
      if (genel !== undefined) continue;
      if (sorun.alan !== "") {
        alanHatalari[sorun.alan] =
          sorun.kod === "musteri-yok"
            ? metin("yonetim.elleSiparis.hata.musteriYok")
            : hataMetni(metin, sorun.alan, sorun.kod, 0);
      }
    }
    const bilinen = sonuc.ayrinti
      .map((sorun) => genelHatalar[sorun.kod])
      .find((k) => k !== undefined);
    if (Object.keys(alanHatalari).length > 0 && bilinen === undefined) {
      setHatalar(alanHatalari);
      const ilkAlan = ilkHata(alanHatalari);
      if (ilkAlan !== undefined) odak(ilkAlan);
      return;
    }
    setGenelHata(
      metin(
        bilinen ??
          (sonuc.kod === "yetki"
            ? "yonetim.siparis.hata.yetki"
            : sonuc.kod === "oturum-yok"
              ? "yonetim.elleSiparis.hata.oturum"
              : "yonetim.elleSiparis.hata.genel"),
      ),
    );
    setYenileme((onceki) => onceki + 1);
    // Kutu bir sonraki çizimde vardır.
    requestAnimationFrame(() => genelKutu.current?.focus());
  };

  const kalemHatasi = hatalar["kalemler"];
  const yontemAdi = (secim: ElleSiparisOdemesi) =>
    odemeYazisi(metin, secim.yontem, secim.yontem === "kapida-odeme" ? secim.secenek : null);
  const yontemAciklamasi = (secim: ElleSiparisOdemesi) =>
    secim.yontem === "havale"
      ? doldur(metin("yonetim.elleSiparis.yontem.havale"), {
          gun: String(veri.havaleIptalSuresi),
        })
      : metin(
          secim.yontem === "elden"
            ? "yonetim.elleSiparis.yontem.elden"
            : "yonetim.elleSiparis.yontem.kapida",
        );

  return (
    <Form
      kodGerekliMetni={metin("ortak.form.kodGerekli")}
      yukleniyorMetni={metin("ortak.form.yukleniyor")}
      onSubmit={gonder}
      className="flex flex-col gap-4 masaustu:flex-row masaustu:items-start"
    >
      <div className="flex min-w-0 flex-col gap-4 masaustu:w-2/3">
        {genelHata === null ? null : (
          <div ref={genelKutu} tabIndex={-1}>
            <Uyari tur="tehlike">{genelHata}</Uyari>
          </div>
        )}
        <Kart className="gap-4 p-4 tablet:p-5">
          <h2 className="font-baslik text-baslik-4 font-baslik-kalinligi">
            {metin("yonetim.elleSiparis.urunler")}
          </h2>
          <KayitArama<UrunOnerisi>
            ara={urunAra}
            etiket={metin("yonetim.elleSiparis.urunEkle")}
            aciklama={metin("yonetim.elleSiparis.urunEkleAciklamasi")}
            secili={undefined}
            sec={ekle}
            secinceBosalt
          />
          {kalemler.length === 0 ? (
            <p
              className="text-kucuk text-soluk-yazi"
              data-elle-alani="kalemler"
              tabIndex={-1}
              {...(kalemHatasi === undefined ? {} : { "aria-describedby": "elle-kalem-hatasi" })}
            >
              {metin("yonetim.elleSiparis.urunYok")}
            </p>
          ) : (
            <table
              className="w-full border-collapse text-left"
              data-elle-alani="kalemler"
              tabIndex={-1}
              {...(kalemHatasi === undefined ? {} : { "aria-describedby": "elle-kalem-hatasi" })}
            >
              <caption className="sr-only">{metin("yonetim.elleSiparis.urunler")}</caption>
              <thead>
                <tr className="border-b border-kenar text-kucuk text-soluk-yazi">
                  <th scope="col" className="pb-2 font-kalin">
                    {metin("yonetim.elleSiparis.sutun.urun")}
                  </th>
                  <th scope="col" className="px-2 pb-2 font-kalin">
                    {metin("yonetim.elleSiparis.sutun.adet")}
                  </th>
                  <th scope="col" className="pb-2 text-right font-kalin">
                    {metin("yonetim.elleSiparis.sutun.tutar")}
                  </th>
                  <th scope="col" className="pb-2">
                    <span className="sr-only">{metin("yonetim.elleSiparis.sutun.islem")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {kalemler.map((kalem) => {
                  const satir = satirOf(kalem.birim);
                  return (
                    <tr key={kalem.birim} className="border-b border-kenar last:border-b-0">
                      <td className="py-3 align-middle">
                        <span className="flex min-w-0 flex-col">
                          <span className="font-kalin wrap-anywhere">{kalem.ad}</span>
                          {satir?.fiyat === undefined ? null : (
                            <span className="text-kucuk text-soluk-yazi">
                              {satir.fiyat.enDusuk.yazili.tutar}
                            </span>
                          )}
                          {satir !== undefined &&
                          !satir.satilabilir &&
                          satir.uyarilar.length === 0 ? (
                            <span className="text-kucuk text-tehlike-yazi">
                              {metin("yonetim.elleSiparis.satilamaz")}
                            </span>
                          ) : null}
                          {/* Sepetin uyarıları (en az, en çok, stok azaldı, tükendi): vitrinin sepetiyle aynı metin. */}
                          {(satir?.uyarilar ?? []).map((uyari) => (
                            <span
                              key={uyari.kod}
                              className={sinif(
                                "text-kucuk",
                                durdurur(uyari.kod) ? "text-tehlike-yazi" : "text-uyari-yazi",
                              )}
                            >
                              {satir === undefined ? "" : uyariYazisi(metin, satir, uyari)}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className="px-2 py-3 align-middle">
                        <AdetSecici
                          deger={kalem.adet}
                          enAz={Math.min(kalem.adet, satir?.enAz ?? 1)}
                          enCok={Math.max(1, satir?.enCok ?? kalem.adet + 1)}
                          onDegerDegisti={(adet) =>
                            setKalemler((onceki) =>
                              onceki.map((k) => (k.birim === kalem.birim ? { ...k, adet } : k)),
                            )
                          }
                          etiketler={{
                            grup: doldur(metin("yonetim.elleSiparis.adetGrubu"), { ad: kalem.ad }),
                            azalt: doldur(metin("yonetim.iade.azalt"), { ad: kalem.ad }),
                            artir: doldur(metin("yonetim.iade.artir"), { ad: kalem.ad }),
                          }}
                        />
                      </td>
                      <td className="py-3 text-right align-middle font-kalin whitespace-nowrap">
                        {satir?.yaziliTutar ?? ""}
                      </td>
                      <td className="py-3 pl-2 text-right align-middle">
                        <IkonDugmesi
                          ikon="kapat"
                          etiket={doldur(metin("yonetim.elleSiparis.cikar"), { ad: kalem.ad })}
                          onClick={() =>
                            setKalemler((onceki) => onceki.filter((k) => k.birim !== kalem.birim))
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {kalemHatasi === undefined ? null : (
            <p id="elle-kalem-hatasi" className="text-kucuk text-tehlike-yazi">
              {kalemHatasi}
            </p>
          )}
        </Kart>

        <Kart className="gap-4 p-4 tablet:p-5">
          <h2 className="font-baslik text-baslik-4 font-baslik-kalinligi">
            {metin("yonetim.elleSiparis.musteri")}
          </h2>
          <SecenekGrubu
            baslik={metin("yonetim.elleSiparis.musteriTuru")}
            etiket={metin("yonetim.elleSiparis.musteriTuru")}
            secilemezEki=""
            ogeler={[
              { deger: "uye", ad: metin("yonetim.elleSiparis.uye") },
              { deger: "misafir", ad: metin("yonetim.elleSiparis.misafir") },
            ]}
            deger={musteriTuru}
            onDegerDegisti={(deger) => setMusteriTuru(deger === "misafir" ? "misafir" : "uye")}
          />
          {musteriTuru === "uye" ? (
            <div className="flex flex-col gap-3" data-elle-alani="musteri.kimlik" tabIndex={-1}>
              <KayitArama<MusteriOnerisi>
                ara={musteriAra}
                etiket={metin("yonetim.elleSiparis.musteriAra")}
                aciklama={metin("yonetim.elleSiparis.musteriAraAciklamasi")}
                secili={musteri}
                sec={(secilen) => {
                  setMusteri(secilen);
                  if (secilen !== undefined) temizle("musteri.kimlik");
                }}
                {...(hatalar["musteri.kimlik"] === undefined
                  ? {}
                  : { hata: hatalar["musteri.kimlik"] })}
              />
              {musteri?.teslimat === null || musteri?.teslimat === undefined ? null : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-orta bg-yuzey px-4 py-3 text-kucuk">
                  <span>
                    {doldur(metin("yonetim.elleSiparis.sonAdres"), {
                      ad: `${musteri.teslimat.ad} ${musteri.teslimat.soyad}`,
                      adres: musteri.teslimat.adres.adres,
                    })}
                  </span>
                  <Dugme
                    tur="cerceveli"
                    onClick={() => {
                      if (musteri.teslimat !== null) sonAdresiKullan(musteri.teslimat);
                    }}
                  >
                    {metin("yonetim.elleSiparis.sonAdresiKullan")}
                  </Dugme>
                </div>
              )}
            </div>
          ) : (
            <FormAlani
              etiket={metin("vitrin.odeme.eposta")}
              {...(hatalar["musteri.eposta"] === undefined
                ? {}
                : { hata: hatalar["musteri.eposta"] })}
            >
              {(alan) => {
                kimlikler["musteri.eposta"] = alan.id;
                return (
                  <GirisAlani
                    {...alan}
                    type="email"
                    autoComplete="off"
                    value={eposta}
                    onChange={(olay) => setEposta(olay.target.value)}
                  />
                );
              }}
            </FormAlani>
          )}
        </Kart>

        <Kart className="gap-4 p-4 tablet:p-5">
          <h2 className="font-baslik text-baslik-4 font-baslik-kalinligi">
            {metin("yonetim.elleSiparis.teslimat")}
          </h2>
          <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
            <MetinAlani
              ad="bilgiler.teslimat.ad"
              etiket={metin("vitrin.odeme.ad")}
              autoComplete="off"
              deger={kisi.ad}
              onDegisti={(ad) => setKisi((onceki) => ({ ...onceki, ad }))}
              hatalar={hatalar}
              kimlikler={kimlikler}
            />
            <MetinAlani
              ad="bilgiler.teslimat.soyad"
              etiket={metin("vitrin.odeme.soyad")}
              autoComplete="off"
              deger={kisi.soyad}
              onDegisti={(soyad) => setKisi((onceki) => ({ ...onceki, soyad }))}
              hatalar={hatalar}
              kimlikler={kimlikler}
            />
            <MetinAlani
              ad="bilgiler.teslimat.telefon"
              etiket={metin(
                veri.telefonZorunlu ? "vitrin.odeme.telefon" : "vitrin.odeme.telefonIstegeBagli",
              )}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              deger={kisi.telefon}
              onDegisti={(telefon) => setKisi((onceki) => ({ ...onceki, telefon }))}
              hatalar={hatalar}
              kimlikler={kimlikler}
            />
          </div>
          <AdresAlanlari
            onEk="bilgiler.teslimat.adres"
            adres={teslimat}
            degistir={setTeslimat}
            ulkeler={veri.ulkeler}
            hatalar={hatalar}
            kimlikler={kimlikler}
          />
        </Kart>

        <Kart className="gap-4 p-4 tablet:p-5">
          <h2 className="font-baslik text-baslik-4 font-baslik-kalinligi">
            {metin("yonetim.elleSiparis.fatura")}
          </h2>
          <SecenekGrubu
            baslik={metin("vitrin.odeme.faturaTuru")}
            etiket={metin("vitrin.odeme.faturaTuru")}
            secilemezEki=""
            ogeler={[
              { deger: "bireysel", ad: metin("vitrin.odeme.bireysel") },
              { deger: "kurumsal", ad: metin("vitrin.odeme.kurumsal") },
            ]}
            deger={faturaTuru}
            onDegerDegisti={(deger) =>
              setFaturaTuru(deger === "kurumsal" ? "kurumsal" : "bireysel")
            }
          />
          {faturaTuru === "kurumsal" ? (
            <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
              <MetinAlani
                ad="bilgiler.fatura.firma"
                etiket={metin("vitrin.odeme.firma")}
                autoComplete="off"
                deger={kurumsal.firma}
                onDegisti={(firma) => setKurumsal((onceki) => ({ ...onceki, firma }))}
                hatalar={hatalar}
                kimlikler={kimlikler}
              />
              <MetinAlani
                ad="bilgiler.fatura.vergiDairesi"
                etiket={metin("vitrin.odeme.vergiDairesi")}
                autoComplete="off"
                deger={kurumsal.vergiDairesi}
                onDegisti={(vergiDairesi) => setKurumsal((onceki) => ({ ...onceki, vergiDairesi }))}
                hatalar={hatalar}
                kimlikler={kimlikler}
              />
              <MetinAlani
                ad="bilgiler.fatura.vergiNumarasi"
                etiket={metin("vitrin.odeme.vergiNumarasi")}
                inputMode="numeric"
                autoComplete="off"
                deger={kurumsal.vergiNumarasi}
                onDegisti={(vergiNumarasi) =>
                  setKurumsal((onceki) => ({ ...onceki, vergiNumarasi }))
                }
                hatalar={hatalar}
                kimlikler={kimlikler}
              />
            </div>
          ) : null}
          <OnayKutusu
            etiket={metin("vitrin.odeme.faturaAdresiAyni")}
            checked={faturaAyni}
            onCheckedChange={(isaretli) => setFaturaAyni(isaretli === true)}
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
        </Kart>

        <Kart className="gap-4 p-4 tablet:p-5">
          <h2 className="font-baslik text-baslik-4 font-baslik-kalinligi">
            {metin("yonetim.elleSiparis.odeme")}
          </h2>
          {veri.yontemler.length === 0 ? (
            <Uyari tur="uyari">{metin("yonetim.elleSiparis.yontemYok")}</Uyari>
          ) : (
            <div data-elle-alani="bilgiler.odemeYontemi" tabIndex={-1}>
              <SecenekGrubu
                gorunum="kart"
                baslik={metin("yonetim.elleSiparis.odemeYontemi")}
                etiket={metin("yonetim.elleSiparis.odemeYontemi")}
                secilemezEki=""
                ogeler={veri.yontemler.map((yontem) => ({
                  deger: yontem.anahtar,
                  ad: yontemAdi(yontem.secim),
                  aciklama: yontemAciklamasi(yontem.secim),
                }))}
                deger={odeme}
                onDegerDegisti={(deger) => {
                  setOdeme(deger);
                  temizle("bilgiler.odemeYontemi");
                }}
                {...(hatalar["bilgiler.odemeYontemi"] === undefined
                  ? {}
                  : { hata: hatalar["bilgiler.odemeYontemi"] })}
              />
            </div>
          )}
          <FormAlani
            etiket={metin("yonetim.elleSiparis.not")}
            {...(hatalar["bilgiler.not"] === undefined ? {} : { hata: hatalar["bilgiler.not"] })}
          >
            {(alan) => {
              kimlikler["bilgiler.not"] = alan.id;
              return (
                <UzunMetinAlani
                  {...alan}
                  maxLength={veri.notEnCok}
                  value={not}
                  onChange={(olay) => setNot(olay.target.value)}
                />
              );
            }}
          </FormAlani>
          <div data-elle-alani="bilgiler.metinlerIletildi">
            <OnayKutusu
              etiket={metin("yonetim.elleSiparis.metinlerIletildi")}
              checked={iletildi}
              hata={hatalar["bilgiler.metinlerIletildi"]}
              onCheckedChange={(isaretli) => {
                setIletildi(isaretli === true);
                temizle("bilgiler.metinlerIletildi");
              }}
            />
          </div>
        </Kart>
      </div>

      <aside
        className="flex flex-col gap-4 masaustu:sticky masaustu:top-4 masaustu:w-1/3"
        aria-labelledby="elle-ozet"
      >
        <Kart className="gap-4 p-4 tablet:p-5">
          <h2 id="elle-ozet" className="font-baslik text-baslik-4 font-baslik-kalinligi">
            {metin("yonetim.elleSiparis.ozet")}
          </h2>
          <span className="sr-only" aria-live="polite">
            {gorunum === null
              ? ""
              : doldur(metin("yonetim.elleSiparis.toplamDuyurusu"), {
                  toplam: gorunum.yazili.toplam,
                })}
          </span>
          <div>
            {gorunum === null ? (
              <p className="text-kucuk text-soluk-yazi">{metin("yonetim.elleSiparis.ozetBos")}</p>
            ) : (
              <SepetOzeti gorunum={gorunum} />
            )}
          </div>
          <GonderDugmesi>{metin("yonetim.elleSiparis.olustur")}</GonderDugmesi>
        </Kart>
      </aside>
    </Form>
  );
}
