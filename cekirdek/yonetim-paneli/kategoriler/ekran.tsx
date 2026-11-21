"use client";
// Kategoriler ekranı (kart 0261, karar 0160; Canlı Çarşı taslağı): kategori ağacı. Aynı üstün altındaki kategoriler
// sıralanabilir listede sürüklenerek ya da klavyeyle sıralanır. Bir kategoriyi başka bir kategorinin altına almak ya
// da en üst düzeye çıkarmak satırın "Diğer işlemler" menüsünden ya da formdaki "Üst kategori" seçimiyle yapılır
// (menüler ekranıyla aynı yol, kullanıcı kararı): kendisi ve alt ağacı sunulmaz, servis döngüyü yine denetler.
// Silme onay penceresiyle sorulur; pencere kaç ürünün bağlantısının kalkacağını ve kaç alt kategorinin üste
// çıkacağını söyler.
//
// Her değişiklik hemen yayınlanır; sonuç bildirimle verilir, verisi sunucudan yeniden okunur (usePanelIslemi).
// Komut çubuğu sayfa iskeletinindir (PanelSayfasi): eylemler ile içerik aynı durumu bu sağlayıcıdan paylaşır.
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import {
  AcilirMenu,
  AcilirMenuIcerigi,
  AcilirMenuOgesi,
  AcilirMenuTetikleyici,
  AltMenu,
  AltMenuIcerigi,
  AltMenuTetikleyici,
} from "../../../bilesenler/parcalar/acilir-menu";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import {
  SecimDegeri,
  SecimKutusu,
  SecimListesi,
  SecimOgesi,
  SecimTetikleyici,
} from "../../../bilesenler/parcalar/secim-kutusu";
import { SiralanabilirListe } from "../../../bilesenler/parcalar/siralanabilir-liste";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
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
import { kategoriHataMetinleri } from "../../moduller/kategori/semalar";
import { kategoriYollari } from "../../moduller/kategori/yol";
import { kayitAdresleri } from "../../vitrin/adresler";
import { EylemDugmesi } from "../eylem-dugmesi";
import { AlanKabi, KaydetCubugu, PanelAlani, PanelFormu } from "../form/panel-formu";
import { GorselSecimi } from "../gorsel-secimi";
import { useKapatmaSorusu } from "../kapatma-sorusu";
import { KatalogGorseli } from "../katalog-gorseli";
import { kodluHataMetni, useKodluForm } from "../kodlu-form";
import { useMenudenPencere } from "../menuden-pencere";
import { usePanelIslemi } from "../panel-islemi";
import { kategoriUclari } from "./uclar";
import type { KategoriDali, KategorilerEkraniVerisi } from "./veri";

type Pencere = { tur: "ekle" } | { tur: "duzenle"; kategori: KategoriDali } | null;

type Baglam = {
  veri: KategorilerEkraniVerisi;
  degistirebilir: boolean;
  silebilir: boolean;
  pencere: Pencere;
  setPencere: (pencere: Pencere) => void;
  onay: KategoriDali | null;
  setOnay: (kategori: KategoriDali | null) => void;
  islem: ReturnType<typeof usePanelIslemi>;
  // Sayfa yenilenince odaklanacak satır (kimliği; "" ise "Kategori ekle"): silinen ya da taşınan satır yeniden
  // kurulur, odak sayfanın başına düşmesin (menüler ekranıyla aynı).
  odaklanacak: { current: string | null };
};

const ekleIsareti = "data-kategori-ekle";
const hataMetni = kodluHataMetni(kategoriHataMetinleri);

const KategorilerBaglami = createContext<Baglam | null>(null);
const useKategoriler = (): Baglam => {
  const baglam = useContext(KategorilerBaglami);
  if (baglam === null) throw new Error("KategorilerSaglayici dışında kullanılamaz.");
  return baglam;
};

// Ağaçtaki bütün kategoriler, ağaç sırasıyla.
const hepsi = (dallar: readonly KategoriDali[]): KategoriDali[] =>
  dallar.flatMap((dal) => [dal, ...hepsi(dal.altlar)]);

// Kategorinin kendisi ve alt ağacı: taşınabileceği yerler bunların dışındadır.
const altAgac = (dal: KategoriDali): Set<string> =>
  new Set(hepsi([dal]).map((kategori) => kategori.kimlik));

export function KategorilerSaglayici({
  veri,
  degistirebilir,
  silebilir,
  children,
}: {
  veri: KategorilerEkraniVerisi;
  degistirebilir: boolean;
  silebilir: boolean;
  children: ReactNode;
}) {
  const [pencere, setPencere] = useState<Pencere>(null);
  const [onay, setOnay] = useState<KategoriDali | null>(null);
  const islem = usePanelIslemi(hataMetni);
  const odaklanacak = useRef<string | null>(null);
  // Yeni veri gelince bekleyen odak yerine konur: satırın ilk düğmesi (tutamak ya da düzenle).
  useEffect(() => {
    const hedef = odaklanacak.current;
    if (hedef === null || veri === undefined) return;
    const oge =
      hedef === ""
        ? document.querySelector<HTMLElement>(`[${ekleIsareti}]`)
        : document.querySelector<HTMLElement>(`[data-anahtar="${hedef}"] button`);
    if (oge === null) return;
    odaklanacak.current = null;
    oge.focus();
  }, [veri]);
  return (
    <KategorilerBaglami.Provider
      value={{
        veri,
        degistirebilir,
        silebilir,
        pencere,
        setPencere,
        onay,
        setOnay,
        islem,
        odaklanacak,
      }}
    >
      {children}
    </KategorilerBaglami.Provider>
  );
}

// Komut çubuğunun asıl eylemi: kategori ekle.
export function KategorilerEylemleri() {
  const metin = usePanelMetni();
  const { setPencere } = useKategoriler();
  return (
    <EylemDugmesi
      eylem="ekle"
      ne={metin("yonetim.kategori.kategori")}
      asil
      onClick={() => setPencere({ tur: "ekle" })}
      {...{ [ekleIsareti]: "" }}
    />
  );
}

function KategoriSatiri({
  kategori,
  kardesler,
}: {
  kategori: KategoriDali;
  // Kategorinin bulunduğu liste: silinince odak komşusuna geçer.
  kardesler: readonly KategoriDali[];
}) {
  const metin = usePanelMetni();
  const { veri, degistirebilir, silebilir, setPencere, setOnay, islem, odaklanacak } =
    useKategoriler();
  const menudenPencere = useMenudenPencere();
  // Taşınabileceği yerler: kendisi, alt ağacı ve bugünkü üstü dışındaki kategoriler, yollarıyla.
  const disarida = altAgac(kategori);
  const hedefler = kategoriYollari(hepsi(veri.agac)).filter(
    (aday) => !disarida.has(aday.kimlik) && aday.kimlik !== kategori.ust,
  );
  const tasi = (ust: string | null) => {
    // Taşınan satır yeni yerinde yeniden kurulur: odak onunla gider.
    odaklanacak.current = kategori.kimlik;
    void islem(
      kategoriUclari.degistir,
      { kimlik: kategori.kimlik, kategori: { ust } },
      "yonetim.kategori.tasindi",
    ).then((sonuc) => {
      if (!sonuc.tamam) odaklanacak.current = null;
    });
  };
  const altBilgi = [
    doldur(metin("yonetim.kategori.urunSayisi"), { sayi: String(kategori.urun) }),
    kayitAdresleri.kategori(kategori.adresAdi),
  ].join(metin("yonetim.kategori.ayrac"));
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <KatalogGorseli gorsel={kategori.gorsel} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 break-words">
          <span className="font-kalin">{kategori.ad}</span>
          <span className="text-kucuk text-soluk-yazi">{altBilgi}</span>
        </div>
        {degistirebilir || silebilir ? (
          <div className="flex shrink-0 items-center">
            {degistirebilir ? (
              <IkonDugmesi
                ikon="duzenle"
                etiket={doldur(metin("yonetim.kategori.duzenle"), { ad: kategori.ad })}
                onClick={() => setPencere({ tur: "duzenle", kategori })}
              />
            ) : null}
            <AcilirMenu>
              <AcilirMenuTetikleyici asChild>
                <IkonDugmesi
                  ikon="diger"
                  etiket={doldur(metin("yonetim.kategori.diger"), { ad: kategori.ad })}
                />
              </AcilirMenuTetikleyici>
              <AcilirMenuIcerigi align="end" onCloseAutoFocus={menudenPencere.kapaninca}>
                {degistirebilir && hedefler.length > 0 ? (
                  <AltMenu>
                    <AltMenuTetikleyici>{metin("yonetim.kategori.altinaTasi")}</AltMenuTetikleyici>
                    <AltMenuIcerigi>
                      {hedefler.map((hedef) => (
                        <AcilirMenuOgesi key={hedef.kimlik} onSelect={() => tasi(hedef.kimlik)}>
                          {hedef.ad}
                        </AcilirMenuOgesi>
                      ))}
                    </AltMenuIcerigi>
                  </AltMenu>
                ) : null}
                {degistirebilir && kategori.ust !== null ? (
                  <AcilirMenuOgesi onSelect={() => tasi(null)}>
                    {metin("yonetim.kategori.enUsteCikar")}
                  </AcilirMenuOgesi>
                ) : null}
                {silebilir ? (
                  <AcilirMenuOgesi
                    tur="tehlike"
                    onSelect={menudenPencere.sec(() => {
                      // Silinince odak sonraki kardeşe, yoksa öncekine, yoksa üstüne, o da yoksa "Kategori ekle"ye.
                      const sira = kardesler.indexOf(kategori);
                      odaklanacak.current =
                        (kardesler[sira + 1] ?? kardesler[sira - 1])?.kimlik ?? kategori.ust ?? "";
                      setOnay(kategori);
                    })}
                  >
                    {metin("yonetim.kategori.sil")}
                  </AcilirMenuOgesi>
                ) : null}
              </AcilirMenuIcerigi>
            </AcilirMenu>
          </div>
        ) : null}
      </div>
      {kategori.altlar.length > 0 ? (
        <KategoriListesi
          kategoriler={kategori.altlar}
          ust={kategori.kimlik}
          etiket={doldur(metin("yonetim.kategori.altListeEtiketi"), { ad: kategori.ad })}
        />
      ) : null}
    </div>
  );
}

function KategoriListesi({
  kategoriler,
  ust,
  etiket,
}: {
  kategoriler: KategoriDali[];
  ust: string | null;
  etiket: string;
}) {
  const metin = usePanelMetni();
  const { degistirebilir, islem } = useKategoriler();
  // Sıralama listede hemen görünür; sunucunun verisi gelince (ya da kayıt olmazsa) ona dönülür.
  const [yerel, setYerel] = useState<KategoriDali[] | null>(null);
  const sonSiralama = useRef(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: sunucunun yeni verisi gelince yerel sıra bırakılır.
  useEffect(() => setYerel(null), [kategoriler]);
  const gosterilen = yerel ?? kategoriler;
  if (!degistirebilir) {
    return (
      <ol
        aria-label={etiket}
        className="m-0 flex list-none flex-col rounded-orta border border-kenar bg-zemin p-0"
      >
        {gosterilen.map((kategori) => (
          <li
            key={kategori.kimlik}
            data-anahtar={kategori.kimlik}
            className="flex border-b border-kenar p-3 last:border-b-0"
          >
            <KategoriSatiri kategori={kategori} kardesler={gosterilen} />
          </li>
        ))}
      </ol>
    );
  }
  return (
    <SiralanabilirListe
      ogeler={gosterilen}
      anahtar={(kategori) => kategori.kimlik}
      ad={(kategori) => kategori.ad}
      etiket={etiket}
      metinler={siralamaMetinleri(metin)}
      siralaninca={(yeni) => {
        setYerel(yeni);
        sonSiralama.current += 1;
        const bu = sonSiralama.current;
        void islem(
          kategoriUclari.sirala,
          { ust, kimlikler: yeni.map((kategori) => kategori.kimlik) },
          "yonetim.kategori.siralandi",
        ).then((sonuc) => {
          if (!sonuc.tamam && bu === sonSiralama.current) setYerel(null);
        });
      }}
      satir={(kategori) => <KategoriSatiri kategori={kategori} kardesler={gosterilen} />}
      hizalama="ust"
    />
  );
}

export function KategorilerIcerigi() {
  const metin = usePanelMetni();
  const { veri, degistirebilir } = useKategoriler();
  return (
    <div className="flex flex-col gap-3">
      {veri.agac.length === 0 ? (
        <BosHal
          ikon="kategoriler"
          baslik={metin("yonetim.kategori.bos.baslik")}
          aciklama={metin(
            degistirebilir ? "yonetim.kategori.bos.metin" : "yonetim.kategori.bos.metinIzinsiz",
          )}
        />
      ) : (
        <>
          {degistirebilir ? (
            <Uyari tur="bilgi">{metin("yonetim.kategori.siralamaBilgisi")}</Uyari>
          ) : null}
          <KategoriListesi
            kategoriler={veri.agac}
            ust={null}
            etiket={metin("yonetim.kategori.listeEtiketi")}
          />
        </>
      )}
      <Pencereler />
    </div>
  );
}

const enUst = "__en-ust";
const formAlanlari = ["ad", "ust", "adresAdi", "aciklama", "gorsel"] as const;

function KategoriFormu({
  kategori,
  kapat,
  vazgec,
  degisince,
}: {
  // Düzenlenen kategori; yoksa yeni kategori.
  kategori?: KategoriDali;
  kapat: () => void;
  vazgec: () => void;
  degisince: (degisti: boolean) => void;
}) {
  const metin = usePanelMetni();
  const { veri, islem, odaklanacak } = useKategoriler();
  const [ad, setAd] = useState(kategori?.ad ?? "");
  const [ust, setUst] = useState<string | null>(kategori?.ust ?? null);
  const [adresAdi, setAdresAdi] = useState(kategori?.adresAdi ?? "");
  const [aciklama, setAciklama] = useState(kategori?.aciklama ?? "");
  const [gorsel, setGorsel] = useState<string | undefined>(kategori?.gorsel);
  const [degisti, setDegisti] = useState(false);
  const { pf, kaydet } = useKodluForm(kategoriHataMetinleri, formAlanlari, degisti);
  const degistir =
    <T,>(ayarla: (deger: T) => void) =>
    (deger: T) => {
      ayarla(deger);
      setDegisti(true);
      degisince(true);
    };
  // Üst olabilecekler: kendisi ve alt ağacı dışındaki kategoriler, yollarıyla.
  const disarida = kategori === undefined ? new Set<string>() : altAgac(kategori);
  const ustAdaylari = kategoriYollari(hepsi(veri.agac)).filter(
    (aday) => !disarida.has(aday.kimlik),
  );
  // Boş adres adı addan üretilir (yeni kategoride); örnek olarak gösterilir.
  const ornekAdresAdi = adresAdi.trim() === "" ? adresAdiUret(ad) : adresAdi.trim();
  const gonder = () => {
    const ortak = {
      ad,
      ust,
      aciklama: aciklama.trim() === "" ? null : aciklama,
      gorsel: gorsel ?? null,
    };
    void kaydet(
      () =>
        kategori === undefined
          ? islem(
              kategoriUclari.ekle,
              {
                kategori: {
                  ...ortak,
                  aciklama: ortak.aciklama ?? undefined,
                  ...(adresAdi.trim() === "" ? {} : { adresAdi }),
                },
              },
              "yonetim.kategori.eklendi",
              { formda: true },
            )
          : islem(
              kategoriUclari.degistir,
              {
                kimlik: kategori.kimlik,
                kategori: { ...ortak, ...(adresAdi.trim() === "" ? {} : { adresAdi }) },
              },
              "yonetim.kategori.kaydedildi",
              { formda: true },
            ),
      () => {
        if (kategori !== undefined) odaklanacak.current = kategori.kimlik;
        kapat();
      },
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
        ad="ust"
        etiket={metin("yonetim.kategori.form.ust")}
        aciklama={metin("yonetim.kategori.form.ustAciklamasi")}
        zorunlu={false}
      >
        {(alan) => (
          <SecimKutusu
            value={ust ?? enUst}
            onValueChange={(yeni) => degistir(setUst)(yeni === enUst ? null : yeni)}
          >
            <SecimTetikleyici {...alan}>
              <SecimDegeri />
            </SecimTetikleyici>
            <SecimListesi>
              <SecimOgesi value={enUst}>{metin("yonetim.kategori.form.enUstDuzey")}</SecimOgesi>
              {ustAdaylari.map((aday) => (
                <SecimOgesi key={aday.kimlik} value={aday.kimlik}>
                  {aday.ad}
                </SecimOgesi>
              ))}
            </SecimListesi>
          </SecimKutusu>
        )}
      </PanelAlani>
      <PanelAlani
        ad="adresAdi"
        etiket={metin("yonetim.kategori.form.adresAdi")}
        aciklama={doldur(
          metin(
            kategori === undefined
              ? "yonetim.kategori.form.adresAdiAciklamasiYeni"
              : "yonetim.kategori.form.adresAdiAciklamasi",
          ),
          { adres: kayitAdresleri.kategori(ornekAdresAdi) },
        )}
        zorunlu={false}
      >
        {(alan) => (
          <GirisAlani
            {...alan}
            value={adresAdi}
            {...(kategori === undefined && ad.trim() !== ""
              ? { placeholder: adresAdiUret(ad) }
              : {})}
            onChange={(olay) => degistir(setAdresAdi)(olay.target.value)}
          />
        )}
      </PanelAlani>
      <PanelAlani
        ad="aciklama"
        etiket={metin("yonetim.kategori.form.aciklama")}
        aciklama={metin("yonetim.kategori.form.aciklamaAciklamasi")}
        zorunlu={false}
      >
        {(alan) => (
          <UzunMetinAlani
            {...alan}
            value={aciklama}
            onChange={(olay) => degistir(setAciklama)(olay.target.value)}
          />
        )}
      </PanelAlani>
      <AlanKabi ad="gorsel" etiket={metin("yonetim.kategori.form.gorsel")}>
        <GorselSecimi
          etiket={metin("yonetim.kategori.form.gorsel")}
          aciklama={metin("yonetim.kategori.form.gorselAciklamasi")}
          hata={pf.hata("gorsel")}
          gorseller={veri.gorseller}
          deger={gorsel}
          degistir={(yeni) => degistir(setGorsel)(typeof yeni === "string" ? yeni : undefined)}
          zorunlu={false}
        />
      </AlanKabi>
      <KaydetCubugu vazgec={vazgec} kaydetEtiketi={metin("ortak.islem.kaydet")} />
    </PanelFormu>
  );
}

function Pencereler() {
  const metin = usePanelMetni();
  const { pencere, setPencere, onay, setOnay, islem, odaklanacak } = useKategoriler();
  // Formda kaydedilmemiş değişiklik varken pencere kapatılmak istenirse önce sorulur.
  const { kapat, kapatmayiIste, degisince, soru } = useKapatmaSorusu(() => setPencere(null));
  // Onay penceresinde silme yapıldı mı: kapanırken bekleyen odak yalnız vazgeçilince bırakılır.
  const silindi = useRef(false);
  const duzenlenen = pencere?.tur === "duzenle" ? pencere.kategori : undefined;
  const onayAciklamasi =
    onay === null
      ? ""
      : [
          onay.urun > 0
            ? doldur(metin("yonetim.kategori.silOnay.urunler"), { sayi: String(onay.urun) })
            : metin("yonetim.kategori.silOnay.urunsuz"),
          ...(onay.altlar.length > 0
            ? [
                doldur(metin("yonetim.kategori.silOnay.altlar"), {
                  sayi: String(onay.altlar.length),
                }),
              ]
            : []),
        ].join(" ");
  return (
    <>
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
                    ? "yonetim.kategori.form.yeni"
                    : "yonetim.kategori.form.duzenle",
                )}
              </YanPencereBasligi>
              <YanPencereAciklamasi>
                {duzenlenen === undefined
                  ? metin("yonetim.kategori.form.yeniAciklamasi")
                  : duzenlenen.ad}
              </YanPencereAciklamasi>
            </YanPencereUstu>
            {soru}
            <KategoriFormu
              key={duzenlenen?.kimlik ?? "yeni"}
              {...(duzenlenen === undefined ? {} : { kategori: duzenlenen })}
              kapat={kapat}
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
          // Vazgeçilirse odak açan düğmeye döner (onay penceresi): bekleyen odak bırakılır.
          if (!silindi.current) odaklanacak.current = null;
          silindi.current = false;
          setOnay(null);
        }}
        baslik={doldur(metin("yonetim.kategori.silOnay.baslik"), { ad: onay?.ad ?? "" })}
        aciklama={onayAciklamasi}
        onayEtiketi={metin("yonetim.kategori.sil")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={async () => {
          if (onay === null) return;
          const sonuc = await islem(
            kategoriUclari.sil,
            { kimlik: onay.kimlik },
            "yonetim.kategori.silindi",
          );
          if (!sonuc.tamam) odaklanacak.current = null;
          silindi.current = sonuc.tamam;
        }}
      />
    </>
  );
}
