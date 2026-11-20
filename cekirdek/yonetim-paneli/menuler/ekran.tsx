"use client";
// Menüler ekranı (kart 0143, karar 0082 ve 0116; Canlı Çarşı taslağı): solda menüler, sağda seçili menünün öğeleri.
// Aynı düzeydeki öğeler sıralanabilir listede sürüklenerek ya da klavyeyle sıralanır. Bir öğeyi başka bir öğenin
// altına almak ya da en üst düzeye çıkarmak satırın "Diğer işlemler" menüsünden ya da formdaki "Üst öğe" seçimiyle
// yapılır (kullanıcı kararı): yalnız derinlik sınırını aşmayan yerler sunulur. Öğenin hedefi kayıt arayarak seçilir.
// Hedefi silinmiş ya da görünmeyen öğe ve boş başlık işaretli görünür (servisin bildirdiği durum). Kategori menüsü
// ağaçtan gelir, yalnız gösterilir. Silme onay penceresiyle sorulur.
//
// Her değişiklik hemen yayınlanır; sonuç bildirimle verilir, verisi sunucudan yeniden okunur (usePanelIslemi).
// Komut çubuğu sayfa iskeletinindir (PanelSayfasi): eylemler ile içerik aynı durumu bu sağlayıcıdan paylaşır.
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  type FormEvent,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { FormAlani } from "../../../bilesenler/form/form-alani";
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
import { Dugme, IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { OnayKutusu } from "../../../bilesenler/parcalar/onay-kutusu";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import {
  SecimDegeri,
  SecimKutusu,
  SecimListesi,
  SecimOgesi,
  SecimTetikleyici,
} from "../../../bilesenler/parcalar/secim-kutusu";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { SiralanabilirListe } from "../../../bilesenler/parcalar/siralanabilir-liste";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import {
  YanPencere,
  YanPencereAciklamasi,
  YanPencereAltCubugu,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereUstu,
} from "../../../bilesenler/parcalar/yan-pencere";
import {
  type KayitliMenuHedefi,
  kayitliMenuHedefleri,
  kullanilabilirMenuHedefleri,
  type MenuHedefTuru,
  type MenuTuru,
  menuHedefTurleri,
} from "../../kayitlar/menu";
import { adresAdiUret, adresAdiUzunlugu } from "../../metinler/adres-adi";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { siralamaMetinleri } from "../../metinler/siralama-metinleri";
import { metinGerekirMi } from "../../moduller/menu/semalar";
import type { Menu, MenuDali, PanelOgesi } from "../../moduller/menu/servis";
import type { BulunanKayit } from "../../moduller/urun/kayit-arama";
import { kayitAdresleri } from "../../vitrin/adresler";
import { EylemDugmesi } from "../eylem-dugmesi";
import { useKapatmaSorusu } from "../kapatma-sorusu";
import { KayitArama, kayitAramaAcikMi } from "../kayit-arama";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi, PanelSonucu } from "../panel-istegi";
import { menuAlanHatalari, menuHataMetni } from "./hatalar";
import { menuUclari } from "./uclar";
import type { MenulerEkraniVerisi } from "./veri";

type Pencere =
  | { tur: "oge-ekle" }
  | { tur: "oge-duzenle"; oge: PanelOgesi; ust: string | null }
  | { tur: "yeni-menu" }
  | { tur: "ad-degistir"; menu: Menu }
  | null;
type Onay = { tur: "oge"; oge: PanelOgesi } | { tur: "menu"; menu: Menu } | null;

type Baglam = {
  veri: MenulerEkraniVerisi;
  degistirebilir: boolean;
  menuAdresi: (kimlik: string) => string;
  pencere: Pencere;
  setPencere: (pencere: Pencere) => void;
  onay: Onay;
  setOnay: (onay: Onay) => void;
  islem: ReturnType<typeof usePanelIslemi>;
  // Sayfa yenilenince odaklanacak öğe (kimliği; "" ise "Öğe ekle"): silinen ya da taşınan satır yeniden kurulur,
  // odak sayfanın başına düşmesin (bağımsız kontrolün bulgusu).
  odaklanacak: { current: string | null };
};

// "Öğe ekle" düğmesinin işareti: menü boşalınca odak oraya geçer.
const ekleIsareti = "data-oge-ekle";

const MenulerBaglami = createContext<Baglam | null>(null);
const useMenuler = (): Baglam => {
  const baglam = useContext(MenulerBaglami);
  if (baglam === null) throw new Error("MenulerSaglayici dışında kullanılamaz.");
  return baglam;
};

const seciliMenu = (veri: MenulerEkraniVerisi) => veri.secili?.menu;
const seciliOgeler = (veri: MenulerEkraniVerisi): PanelOgesi[] =>
  veri.secili !== undefined && "ogeler" in veri.secili ? veri.secili.ogeler : [];

export function MenulerSaglayici({
  veri,
  degistirebilir,
  adres,
  children,
}: {
  veri: MenulerEkraniVerisi;
  degistirebilir: boolean;
  // Sayfanın adresi: seçili menü adreste durur (?menu=...).
  adres: string;
  children: ReactNode;
}) {
  const [pencere, setPencere] = useState<Pencere>(null);
  const [onay, setOnay] = useState<Onay>(null);
  const islem = usePanelIslemi(menuHataMetni);
  const menuAdresi = (kimlik: string) => `${adres}?${new URLSearchParams({ menu: kimlik })}`;
  const odaklanacak = useRef<string | null>(null);
  // Yeni veri gelince bekleyen odak yerine konur: satırın ilk düğmesi (tutamak).
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
    <MenulerBaglami.Provider
      value={{
        veri,
        degistirebilir,
        menuAdresi,
        pencere,
        setPencere,
        onay,
        setOnay,
        islem,
        odaklanacak,
      }}
    >
      {children}
    </MenulerBaglami.Provider>
  );
}

// Komut çubuğunun eylemleri: öğe ekle (asıl, yalnız elle kurulan menüde) ve menü ekle.
export function MenulerEylemleri() {
  const metin = usePanelMetni();
  const { veri, setPencere } = useMenuler();
  const menu = seciliMenu(veri);
  return (
    <>
      <EylemDugmesi
        eylem="ekle"
        ne={metin("yonetim.menu.menu")}
        onClick={() => setPencere({ tur: "yeni-menu" })}
      />
      {menu?.tur === "elle" ? (
        <EylemDugmesi
          eylem="ekle"
          ne={metin("yonetim.menu.oge")}
          asil
          onClick={() => setPencere({ tur: "oge-ekle" })}
          {...{ [ekleIsareti]: "" }}
        />
      ) : null}
    </>
  );
}

// Açılır menüden pencere açmak: pencere, menü kapanıp odağı kendi düğmesine verdikten sonra açılır. Menü kapanırken
// odağı geri vermesi pencereyle çakışmasın, pencere kapanınca da odak menünün düğmesine dönsün (ölçüldü: aynı anda
// açılınca ikinci açılışta menü takılıyordu).
const useMenudenPencere = () => {
  const bekleyen = useRef<(() => void) | null>(null);
  return {
    sec: (ac: () => void) => () => {
      bekleyen.current = ac;
    },
    kapaninca: () => {
      const ac = bekleyen.current;
      bekleyen.current = null;
      ac?.();
    },
  };
};

const hedefAdi = (metin: (anahtar: MetinAnahtari) => string, tur: MenuHedefTuru) =>
  metin(`yonetim.menu.hedef.${tur}`);

// Öğenin vitrindeki adresi ya da başlık açıklaması.
const ogeninAdresi = (metin: (anahtar: MetinAnahtari) => string, oge: PanelOgesi): string => {
  const { hedef } = oge;
  if (hedef.tur === "adres") return hedef.adres;
  if (hedef.tur === "baslik") return metin("yonetim.menu.baslikAciklamasi");
  return oge.kayit === undefined ? "" : kayitAdresleri[hedef.tur](oge.kayit.adresAdi);
};

const altSayisi = (oge: PanelOgesi): number =>
  oge.altlar.reduce((toplam, alt) => toplam + 1 + altSayisi(alt), 0);

// Aynı listede aynı adlı başka öğe varsa ad sırayla ayrılır: düğmelerin ekran okuyucudaki adı karışmasın.
const ayirtEdilenAd = (
  metin: (anahtar: MetinAnahtari) => string,
  oge: PanelOgesi,
  liste: readonly PanelOgesi[],
): string =>
  liste.filter((oteki) => oteki.gorunenMetin === oge.gorunenMetin).length < 2
    ? oge.gorunenMetin
    : doldur(metin("yonetim.menu.ayniAdli"), {
        ad: oge.gorunenMetin,
        sira: String(liste.indexOf(oge) + 1),
      });

function OgeSatiri({
  oge,
  ust,
  kardesler,
}: {
  oge: PanelOgesi;
  ust: string | null;
  // Öğenin bulunduğu liste: silinince odak komşusuna geçer, aynı adlı kardeşler ayrılır.
  kardesler: readonly PanelOgesi[];
}) {
  const metin = usePanelMetni();
  const { veri, degistirebilir, setPencere, setOnay, islem, odaklanacak } = useMenuler();
  const kokler = seciliOgeler(veri);
  // Taşınabileceği yerler: en üst düzeydeki başka bir öğenin altı. Altı olan öğe başka bir öğenin altına konamaz
  // (derinlik sınırı 2).
  const hedefler =
    oge.altlar.length > 0
      ? []
      : kokler.filter((aday) => aday.kimlik !== oge.kimlik && aday.kimlik !== ust);
  const tasi = (yeniUst: string | null) => {
    // Taşınan satır yeni yerinde yeniden kurulur: odak onunla gider.
    odaklanacak.current = oge.kimlik;
    void islem(
      menuUclari.ogeDegistir,
      { kimlik: oge.kimlik, oge: { ust: yeniUst } },
      "yonetim.menu.tasindi",
    ).then((sonuc) => {
      if (!sonuc.tamam) odaklanacak.current = null;
    });
  };
  const ad = ayirtEdilenAd(metin, oge, kardesler);
  const menudenPencere = useMenudenPencere();
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 break-words">
          <span className="flex flex-wrap items-center gap-2 font-kalin">
            {ad}
            <Rozet tur="ikincil">{hedefAdi(metin, oge.hedef.tur)}</Rozet>
            {oge.durum === "gecerli" ? null : (
              <Rozet tur="uyari">{metin(`yonetim.menu.durum.${oge.durum}`)}</Rozet>
            )}
          </span>
          <span className="text-kucuk text-soluk-yazi">{ogeninAdresi(metin, oge)}</span>
          {oge.durum === "gecerli" ? null : (
            <span className="text-kucuk text-soluk-yazi">
              {metin(`yonetim.menu.durumAciklamasi.${oge.durum}`)}
            </span>
          )}
        </div>
        {degistirebilir ? (
          <div className="flex shrink-0 items-center">
            <IkonDugmesi
              ikon="duzenle"
              etiket={doldur(metin("yonetim.menu.duzenle"), { ad })}
              onClick={() => setPencere({ tur: "oge-duzenle", oge, ust })}
            />
            <AcilirMenu>
              <AcilirMenuTetikleyici asChild>
                <IkonDugmesi ikon="diger" etiket={doldur(metin("yonetim.menu.diger"), { ad })} />
              </AcilirMenuTetikleyici>
              <AcilirMenuIcerigi align="end" onCloseAutoFocus={menudenPencere.kapaninca}>
                {hedefler.length > 0 ? (
                  <AltMenu>
                    <AltMenuTetikleyici>{metin("yonetim.menu.altinaTasi")}</AltMenuTetikleyici>
                    <AltMenuIcerigi>
                      {hedefler.map((hedef) => (
                        <AcilirMenuOgesi key={hedef.kimlik} onSelect={() => tasi(hedef.kimlik)}>
                          {ayirtEdilenAd(metin, hedef, kokler)}
                        </AcilirMenuOgesi>
                      ))}
                    </AltMenuIcerigi>
                  </AltMenu>
                ) : null}
                {ust === null ? null : (
                  <AcilirMenuOgesi onSelect={() => tasi(null)}>
                    {metin("yonetim.menu.enUsteCikar")}
                  </AcilirMenuOgesi>
                )}
                <AcilirMenuOgesi
                  tur="tehlike"
                  onSelect={menudenPencere.sec(() => {
                    // Silinince odak sonraki kardeşe, yoksa öncekine, yoksa üstüne, o da yoksa "Öğe ekle"ye geçer.
                    const sira = kardesler.indexOf(oge);
                    odaklanacak.current =
                      (kardesler[sira + 1] ?? kardesler[sira - 1])?.kimlik ?? ust ?? "";
                    setOnay({ tur: "oge", oge });
                  })}
                >
                  {metin("yonetim.menu.sil")}
                </AcilirMenuOgesi>
              </AcilirMenuIcerigi>
            </AcilirMenu>
          </div>
        ) : null}
      </div>
      {oge.altlar.length > 0 ? (
        <OgeListesi
          ogeler={oge.altlar}
          ust={oge.kimlik}
          etiket={doldur(metin("yonetim.menu.altListeEtiketi"), { oge: ad })}
        />
      ) : null}
    </div>
  );
}

function OgeListesi({
  ogeler,
  ust,
  etiket,
}: {
  ogeler: PanelOgesi[];
  ust: string | null;
  etiket: string;
}) {
  const metin = usePanelMetni();
  const { veri, degistirebilir, islem } = useMenuler();
  // Sıralama listede hemen görünür; sunucunun verisi gelince (ya da kayıt olmazsa) ona dönülür.
  const [yerel, setYerel] = useState<PanelOgesi[] | null>(null);
  const sonSiralama = useRef(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: sunucunun yeni verisi gelince yerel sıra bırakılır.
  useEffect(() => setYerel(null), [ogeler]);
  const gosterilen = yerel ?? ogeler;
  const menu = seciliMenu(veri);
  if (!degistirebilir || menu === undefined) {
    return (
      <ol
        aria-label={etiket}
        className="m-0 flex list-none flex-col rounded-orta border border-kenar bg-zemin p-0"
      >
        {gosterilen.map((oge) => (
          <li key={oge.kimlik} className="flex border-b border-kenar p-3 last:border-b-0">
            <OgeSatiri oge={oge} ust={ust} kardesler={gosterilen} />
          </li>
        ))}
      </ol>
    );
  }
  return (
    <SiralanabilirListe
      ogeler={gosterilen}
      anahtar={(oge) => oge.kimlik}
      ad={(oge) => oge.gorunenMetin}
      etiket={etiket}
      metinler={siralamaMetinleri(metin)}
      siralaninca={(yeni) => {
        setYerel(yeni);
        sonSiralama.current += 1;
        const bu = sonSiralama.current;
        void islem(
          menuUclari.sirala,
          { menu: menu.kimlik, ust, kimlikler: yeni.map((oge) => oge.kimlik) },
          "yonetim.menu.siralandi",
        ).then((sonuc) => {
          if (!sonuc.tamam && bu === sonSiralama.current) setYerel(null);
        });
      }}
      satir={(oge) => <OgeSatiri oge={oge} ust={ust} kardesler={gosterilen} />}
      hizalama="ust"
    />
  );
}

function KategoriAgaci({ dallar }: { dallar: MenuDali[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0 pl-4">
      {dallar.map((dal) => (
        <li key={dal.kimlik} className="flex flex-col gap-1">
          <span>{dal.metin}</span>
          {dal.altlar.length > 0 ? <KategoriAgaci dallar={dal.altlar} /> : null}
        </li>
      ))}
    </ul>
  );
}

function MenuListesi() {
  const metin = usePanelMetni();
  const { veri, menuAdresi } = useMenuler();
  const secili = seciliMenu(veri);
  return (
    <nav
      aria-label={metin("yonetim.menu.liste")}
      className="flex w-full shrink-0 flex-col gap-1 masaustu:max-w-panel"
    >
      {veri.menuler.map((menu) => {
        const seciliMi = menu.kimlik === secili?.kimlik;
        return (
          <Link
            key={menu.kimlik}
            href={menuAdresi(menu.kimlik)}
            {...(seciliMi ? { "aria-current": "page" as const } : {})}
            className={sinif(
              "flex min-h-11 flex-col justify-center rounded-kucuk border-l-2 border-transparent px-3 py-2 text-yazi no-underline hover:bg-zemin",
              seciliMi ? "border-birincil bg-zemin font-en-kalin" : "font-orta",
            )}
          >
            {menu.ad}
            <span className="text-kucuk font-normal text-soluk-yazi">
              {metin(menu.tur === "elle" ? "yonetim.menu.turElle" : "yonetim.menu.turKategori")}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MenulerIcerigi() {
  const metin = usePanelMetni();
  const { veri, degistirebilir, setPencere, setOnay } = useMenuler();
  const menu = seciliMenu(veri);
  const menudenPencere = useMenudenPencere();
  if (menu === undefined || veri.secili === undefined) {
    return (
      <>
        <BosHal
          ikon="menuler"
          baslik={metin("yonetim.menu.menuYok.baslik")}
          aciklama={metin("yonetim.menu.menuYok.metin")}
        />
        <Pencereler />
      </>
    );
  }
  const ogeler = seciliOgeler(veri);
  return (
    <div className="flex flex-col gap-4 masaustu:flex-row masaustu:items-start">
      <MenuListesi />
      <section aria-labelledby="secili-menu" className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="secili-menu" className="font-baslik text-baslik-4 font-baslik-kalinligi">
            {menu.ad}
          </h2>
          {degistirebilir ? (
            <AcilirMenu>
              <AcilirMenuTetikleyici asChild>
                <IkonDugmesi
                  ikon="diger"
                  etiket={doldur(metin("yonetim.menu.menuIslemleri"), { ad: menu.ad })}
                />
              </AcilirMenuTetikleyici>
              <AcilirMenuIcerigi align="end" onCloseAutoFocus={menudenPencere.kapaninca}>
                <AcilirMenuOgesi
                  onSelect={menudenPencere.sec(() => setPencere({ tur: "ad-degistir", menu }))}
                >
                  {metin("yonetim.menu.adDegistir")}
                </AcilirMenuOgesi>
                <AcilirMenuOgesi
                  tur="tehlike"
                  onSelect={menudenPencere.sec(() => setOnay({ tur: "menu", menu }))}
                >
                  {metin("yonetim.menu.menuyuSil")}
                </AcilirMenuOgesi>
              </AcilirMenuIcerigi>
            </AcilirMenu>
          ) : null}
        </div>
        {"kategoriAgaci" in veri.secili ? (
          <>
            <Uyari tur="bilgi">{metin("yonetim.menu.kategoriAciklamasi")}</Uyari>
            <KategoriAgaci dallar={veri.secili.kategoriAgaci} />
          </>
        ) : ogeler.length === 0 ? (
          <BosHal
            ikon="menuler"
            baslik={metin("yonetim.menu.bos.baslik")}
            aciklama={metin("yonetim.menu.bos.metin")}
            duzey={3}
          />
        ) : (
          <>
            {degistirebilir ? (
              <Uyari tur="bilgi">{metin("yonetim.menu.siralamaBilgisi")}</Uyari>
            ) : null}
            <OgeListesi
              ogeler={ogeler}
              ust={null}
              etiket={doldur(metin("yonetim.menu.listeEtiketi"), { menu: menu.ad })}
            />
          </>
        )}
      </section>
      <Pencereler />
    </div>
  );
}

// Formun ortak kaydı: alan hataları alanın altında, öteki hata formun üstünde.
function useFormKaydi(alanlar: readonly string[], esle: Readonly<Record<string, string>> = {}) {
  const [hatalar, setHatalar] = useState<Record<string, MetinAnahtari>>({});
  const [genelHata, setGenelHata] = useState<MetinAnahtari | null>(null);
  const gonderiliyor = useRef(false);
  const uyariRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (genelHata !== null) uyariRef.current?.focus();
  }, [genelHata]);
  const kaydet = async (is: () => Promise<PanelSonucu<unknown>>, bitince: () => void) => {
    if (gonderiliyor.current) return;
    gonderiliyor.current = true;
    const sonuc = await is();
    gonderiliyor.current = false;
    if (sonuc.tamam) {
      bitince();
      return;
    }
    const hata: PanelHatasi = sonuc;
    const alanHatalari = menuAlanHatalari(hata, alanlar, esle);
    setHatalar(alanHatalari);
    // Hata bir alana bağlıysa metni alanın altındadır; üstte yalnız genel uyarı durur (aynı cümle iki kez yazmaz).
    // Alanı olmayan hata (menü dolu, sınır) üstte kendi metniyle görünür.
    setGenelHata(
      Object.keys(alanHatalari).length > 0 ? "yonetim.menu.form.hata" : menuHataMetni(hata),
    );
  };
  return { hatalar, setHatalar, genelHata, setGenelHata, uyariRef, kaydet };
}

function GenelHata({
  anahtar,
  uyariRef,
}: {
  anahtar: MetinAnahtari | null;
  uyariRef: RefObject<HTMLDivElement | null>;
}) {
  const metin = usePanelMetni();
  if (anahtar === null) return null;
  return (
    <div ref={uyariRef} tabIndex={-1}>
      <Uyari tur="tehlike">{metin(anahtar)}</Uyari>
    </div>
  );
}

const enUst = "__en-ust";
// Formdaki seçim: adres hedefi iki seçenektir (taslak): sitenin kendi sayfası ve dış bağlantı. İkisi de "adres"
// hedefine yazılır; yeni sekme yalnız dış bağlantıda sorulur.
type HedefSecimi = Exclude<MenuHedefTuru, "adres"> | "site-adresi" | "dis-adres";
const hedefSecimleri: HedefSecimi[] = menuHedefTurleri
  .filter((tur) => kullanilabilirMenuHedefleri[tur])
  .flatMap((tur): HedefSecimi[] => (tur === "adres" ? ["site-adresi", "dis-adres"] : [tur]));
const secimTuru = (secim: HedefSecimi): MenuHedefTuru =>
  secim === "site-adresi" || secim === "dis-adres" ? "adres" : secim;
const secimAdi = (metin: (anahtar: MetinAnahtari) => string, secim: HedefSecimi) =>
  secim === "site-adresi" || secim === "dis-adres"
    ? metin(`yonetim.menu.form.secim.${secim}`)
    : hedefAdi(metin, secim);
const kayitliMi = (tur: MenuHedefTuru): tur is KayitliMenuHedefi =>
  (kayitliMenuHedefleri as readonly string[]).includes(tur);

function OgeFormu({
  oge,
  ust,
  kapat,
  vazgec,
  degisince,
}: {
  // Düzenlenen öğe; yoksa yeni öğe.
  oge?: PanelOgesi;
  ust: string | null;
  // Kayıttan sonra kapatır.
  kapat: () => void;
  // Vazgeç: kaydedilmemiş değişiklik varsa önce sorar.
  vazgec: () => void;
  degisince: (degisti: boolean) => void;
}) {
  const metin = usePanelMetni();
  const { veri, islem } = useMenuler();
  const menu = seciliMenu(veri);
  const hedef = oge?.hedef;
  const [secim, setSecim] = useState<HedefSecimi>(
    hedef === undefined
      ? "kategori"
      : hedef.tur === "adres"
        ? hedef.adres.startsWith("/")
          ? "site-adresi"
          : "dis-adres"
        : hedef.tur,
  );
  const tur = secimTuru(secim);
  const [kayit, setKayit] = useState<BulunanKayit | undefined>(
    hedef !== undefined && "kimlik" in hedef && oge?.kayit !== undefined
      ? { kimlik: hedef.kimlik, ad: oge.kayit.ad }
      : undefined,
  );
  const [adres, setAdres] = useState(hedef?.tur === "adres" ? hedef.adres : "");
  const [yeniSekme, setYeniSekme] = useState(hedef?.tur === "adres" ? hedef.yeniSekme : false);
  const [yazi, setYazi] = useState(oge?.metin ?? "");
  const [seciliUst, setSeciliUst] = useState<string | null>(ust);
  const form = useFormKaydi(["metin", "hedef", "ust"]);
  const degistir =
    <T,>(ayarla: (deger: T) => void) =>
    (deger: T) => {
      ayarla(deger);
      degisince(true);
    };
  // Üst öğe olabilecekler: en üst düzeydeki öteki öğeler. Altı olan öğe başka bir öğenin altına konamaz.
  const altiVar = (oge?.altlar.length ?? 0) > 0;
  const ustAdaylari = seciliOgeler(veri).filter((aday) => aday.kimlik !== oge?.kimlik);
  const hata = (alan: string) => {
    const anahtar = form.hatalar[alan];
    return anahtar === undefined ? {} : { hata: metin(anahtar) };
  };

  const gonder = (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (menu === undefined) return;
    if (kayitliMi(tur) && kayit === undefined) {
      form.setHatalar({ "hedef.kimlik": "yonetim.menu.form.kayitSecin" });
      form.setGenelHata("yonetim.menu.form.hata");
      return;
    }
    const yeniHedef =
      tur === "adres"
        ? { tur, adres, yeniSekme: secim === "dis-adres" && yeniSekme }
        : tur === "baslik"
          ? { tur }
          : { tur, kimlik: kayit?.kimlik ?? "" };
    const govde = { metin: yazi.trim() === "" ? null : yazi, hedef: yeniHedef, ust: seciliUst };
    void form.kaydet(
      () =>
        oge === undefined
          ? islem(menuUclari.ogeEkle, { menu: menu.kimlik, oge: govde }, "yonetim.menu.eklendi", {
              formda: true,
            })
          : islem(
              menuUclari.ogeDegistir,
              { kimlik: oge.kimlik, oge: govde },
              "yonetim.menu.kaydedildi",
              {
                formda: true,
              },
            ),
      kapat,
    );
  };

  return (
    <Form
      kodGerekliMetni={metin("ortak.form.kodGerekli")}
      yukleniyorMetni={metin("ortak.form.yukleniyor")}
      onSubmit={gonder}
      className="flex flex-col gap-5"
    >
      <GenelHata anahtar={form.genelHata} uyariRef={form.uyariRef} />
      <SecenekGrubu
        baslik={metin("yonetim.menu.form.hedefTuru")}
        etiket={metin("yonetim.menu.form.hedefTuru")}
        ogeler={hedefSecimleri.map((deger) => ({ deger, ad: secimAdi(metin, deger) }))}
        deger={secim}
        onDegerDegisti={(yeni) => {
          degistir(setSecim)(yeni as HedefSecimi);
          setKayit(undefined);
        }}
        secilemezEki=""
        {...hata("hedef.tur")}
      />
      {kayitliMi(tur) ? (
        <KayitArama
          tur={tur}
          etiket={hedefAdi(metin, tur)}
          secili={kayit}
          sec={degistir(setKayit)}
          {...(hata("hedef.kimlik").hata === undefined ? hata("hedef") : hata("hedef.kimlik"))}
        />
      ) : null}
      {tur === "adres" ? (
        <>
          <FormAlani
            etiket={metin("yonetim.menu.form.adres")}
            aciklama={metin(
              secim === "site-adresi"
                ? "yonetim.menu.form.siteAdresiAciklamasi"
                : "yonetim.menu.form.disAdresAciklamasi",
            )}
            {...hata("hedef.adres")}
          >
            {(alan) => (
              <GirisAlani
                {...alan}
                required
                value={adres}
                onChange={(olay) => degistir(setAdres)(olay.target.value)}
              />
            )}
          </FormAlani>
          {secim === "dis-adres" ? (
            <OnayKutusu
              etiket={metin("yonetim.menu.form.yeniSekme")}
              checked={yeniSekme}
              onCheckedChange={(isaretli) => degistir(setYeniSekme)(isaretli === true)}
            />
          ) : null}
        </>
      ) : null}
      <FormAlani
        etiket={metin("yonetim.menu.form.metin")}
        {...(metinGerekirMi(tur) ? {} : { aciklama: metin("yonetim.menu.form.metinAciklamasi") })}
        {...hata("metin")}
      >
        {(alan) => (
          <GirisAlani
            {...alan}
            required={metinGerekirMi(tur)}
            // Boşken seçilen kaydın adı görünür: boş bırakılırsa menüde o yazar.
            {...(kayit === undefined ? {} : { placeholder: kayit.ad })}
            value={yazi}
            onChange={(olay) => degistir(setYazi)(olay.target.value)}
          />
        )}
      </FormAlani>
      <FormAlani
        etiket={metin("yonetim.menu.form.ust")}
        aciklama={metin(
          altiVar ? "yonetim.menu.form.ustKapali" : "yonetim.menu.form.ustAciklamasi",
        )}
        {...hata("ust")}
      >
        {(alan) => (
          <SecimKutusu
            value={seciliUst ?? enUst}
            disabled={altiVar}
            onValueChange={(yeni) => degistir(setSeciliUst)(yeni === enUst ? null : yeni)}
          >
            <SecimTetikleyici {...alan}>
              <SecimDegeri />
            </SecimTetikleyici>
            <SecimListesi>
              <SecimOgesi value={enUst}>{metin("yonetim.menu.form.enUstDuzey")}</SecimOgesi>
              {ustAdaylari.map((aday) => (
                <SecimOgesi key={aday.kimlik} value={aday.kimlik}>
                  {ayirtEdilenAd(metin, aday, seciliOgeler(veri))}
                </SecimOgesi>
              ))}
            </SecimListesi>
          </SecimKutusu>
        )}
      </FormAlani>
      <FormAlti vazgec={vazgec} kaydet={metin("yonetim.menu.form.kaydet")} />
    </Form>
  );
}

function FormAlti({ vazgec, kaydet }: { vazgec: () => void; kaydet: string }) {
  const metin = usePanelMetni();
  return (
    <YanPencereAltCubugu>
      <Dugme tur="sade" onClick={vazgec}>
        {metin("ortak.islem.vazgec")}
      </Dugme>
      <GonderDugmesi>{kaydet}</GonderDugmesi>
    </YanPencereAltCubugu>
  );
}

// Menünün kodu adından üretilir (bölümler menüyü koduyla seçer, mağaza sahibi kodu görmez). Kod kullanılıyorsa
// sonuna sayı eklenip yeniden denenir.
const kodDenemesi = 9;

function MenuFormu({
  menu,
  kapat,
  vazgec,
  degisince,
}: {
  // Adı değişen menü; yoksa yeni menü.
  menu?: Menu;
  // Kayıttan sonra kapatır.
  kapat: () => void;
  // Vazgeç: kaydedilmemiş değişiklik varsa önce sorar.
  vazgec: () => void;
  degisince: (degisti: boolean) => void;
}) {
  const metin = usePanelMetni();
  const { islem, menuAdresi } = useMenuler();
  const router = useRouter();
  const [ad, setAd] = useState(menu?.ad ?? "");
  const [tur, setTur] = useState<MenuTuru>("elle");
  const form = useFormKaydi(["ad", "tur"], { kod: "ad" });
  const hata = (alan: string) => {
    const anahtar = form.hatalar[alan];
    return anahtar === undefined ? {} : { hata: metin(anahtar) };
  };
  const gonder = (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (menu !== undefined) {
      void form.kaydet(
        () =>
          islem(menuUclari.menuDegistir, { kimlik: menu.kimlik, ad }, "yonetim.menu.menuDegisti", {
            formda: true,
          }),
        kapat,
      );
      return;
    }
    // Sonuna "-9" eklenebilsin: kök kod sınırından kısadır.
    const kok =
      adresAdiUret(ad)
        .slice(0, adresAdiUzunlugu - 2)
        .replace(/-+$/, "") || "menu";
    let yeni = "";
    void form.kaydet(
      async () => {
        let sonuc: PanelSonucu<{ kimlik: string }> = {
          tamam: false,
          kod: "dogrulama",
          ayrinti: [],
        };
        for (let deneme = 1; deneme <= kodDenemesi; deneme += 1) {
          const kod = deneme === 1 ? kok : `${kok}-${deneme}`;
          sonuc = await islem<{ kimlik: string }>(
            menuUclari.menuEkle,
            { kod, ad, tur },
            "yonetim.menu.menuEklendi",
            { formda: true },
          );
          if (sonuc.tamam || !sonuc.ayrinti.some((sorun) => sorun.kod === "kod-tekrar")) break;
        }
        if (sonuc.tamam) yeni = sonuc.veri.kimlik;
        return sonuc;
      },
      () => {
        kapat();
        // Yeni menü seçili açılır.
        if (yeni !== "") router.push(menuAdresi(yeni));
      },
    );
  };
  return (
    <Form
      kodGerekliMetni={metin("ortak.form.kodGerekli")}
      yukleniyorMetni={metin("ortak.form.yukleniyor")}
      onSubmit={gonder}
      className="flex flex-col gap-5"
    >
      <GenelHata anahtar={form.genelHata} uyariRef={form.uyariRef} />
      <FormAlani etiket={metin("yonetim.menu.form.menuAdi")} {...hata("ad")}>
        {(alan) => (
          <GirisAlani
            {...alan}
            required
            value={ad}
            onChange={(olay) => {
              setAd(olay.target.value);
              degisince(true);
            }}
          />
        )}
      </FormAlani>
      {menu === undefined ? (
        <SecenekGrubu
          baslik={metin("yonetim.menu.form.menuTuru")}
          etiket={metin("yonetim.menu.form.menuTuru")}
          ogeler={[
            { deger: "elle", ad: metin("yonetim.menu.turElle") },
            { deger: "kategori-agaci", ad: metin("yonetim.menu.turKategori") },
          ]}
          deger={tur}
          onDegerDegisti={(yeni) => {
            setTur(yeni as MenuTuru);
            degisince(true);
          }}
          secilemezEki=""
          aciklama={metin(
            tur === "elle"
              ? "yonetim.menu.form.turElleAciklamasi"
              : "yonetim.menu.form.turKategoriAciklamasi",
          )}
        />
      ) : null}
      <FormAlti vazgec={vazgec} kaydet={metin("yonetim.menu.form.kaydet")} />
    </Form>
  );
}

function Pencereler() {
  const metin = usePanelMetni();
  const { veri, pencere, setPencere, onay, setOnay, islem, odaklanacak } = useMenuler();
  // Formda kaydedilmemiş değişiklik varken pencere kapatılmak istenirse önce sorulur.
  const { kapat, kapatmayiIste, degisince, soru } = useKapatmaSorusu(() => setPencere(null));
  const menu = seciliMenu(veri);
  // Onay penceresinde silme yapıldı mı: kapanırken bekleyen odak yalnız vazgeçilince bırakılır.
  const silindi = useRef(false);
  let icerik: { baslik: string; aciklama?: string; govde: ReactNode } | null = null;
  if (pencere?.tur === "oge-ekle" || pencere?.tur === "oge-duzenle") {
    const duzenlenen = pencere.tur === "oge-duzenle" ? pencere : undefined;
    icerik = {
      baslik: metin(
        duzenlenen === undefined ? "yonetim.menu.form.yeniOge" : "yonetim.menu.form.ogeyiDuzenle",
      ),
      ...(menu === undefined ? {} : { aciklama: menu.ad }),
      govde: (
        <OgeFormu
          key={duzenlenen?.oge.kimlik ?? "yeni"}
          {...(duzenlenen === undefined ? {} : { oge: duzenlenen.oge })}
          ust={duzenlenen?.ust ?? null}
          kapat={kapat}
          vazgec={kapatmayiIste}
          degisince={degisince}
        />
      ),
    };
  } else if (pencere?.tur === "yeni-menu" || pencere?.tur === "ad-degistir") {
    const duzenlenen = pencere.tur === "ad-degistir" ? pencere.menu : undefined;
    icerik = {
      baslik:
        duzenlenen === undefined
          ? metin("yonetim.menu.form.yeniMenu")
          : metin("yonetim.menu.adDegistir"),
      ...(duzenlenen === undefined ? {} : { aciklama: duzenlenen.ad }),
      govde: (
        <MenuFormu
          key={duzenlenen?.kimlik ?? "yeni"}
          {...(duzenlenen === undefined ? {} : { menu: duzenlenen })}
          kapat={kapat}
          vazgec={kapatmayiIste}
          degisince={degisince}
        />
      ),
    };
  }
  const onayAdi =
    onay?.tur === "oge" ? onay.oge.gorunenMetin : onay?.tur === "menu" ? onay.menu.ad : "";
  const onayAltlari = onay?.tur === "oge" ? altSayisi(onay.oge) : 0;
  return (
    <>
      <YanPencere
        open={icerik !== null}
        onOpenChange={(acik) => (acik ? undefined : kapatmayiIste())}
      >
        {icerik === null ? null : (
          <YanPencereIcerigi
            kapatEtiketi={metin("ortak.parca.kapat")}
            className="tablet:max-w-metin"
            onEscapeKeyDown={(olay) => {
              // Öneri listesi açıkken Escape yalnız listeyi kapatır.
              if (kayitAramaAcikMi(document.activeElement)) olay.preventDefault();
            }}
          >
            <YanPencereUstu>
              <YanPencereBasligi>{icerik.baslik}</YanPencereBasligi>
              {icerik.aciklama === undefined ? null : (
                <YanPencereAciklamasi>{icerik.aciklama}</YanPencereAciklamasi>
              )}
            </YanPencereUstu>
            {soru}
            {icerik.govde}
          </YanPencereIcerigi>
        )}
      </YanPencere>
      <OnayPenceresi
        acik={onay !== null}
        acikDegisince={(acik) => {
          if (acik) return;
          // Vazgeçilirse odak açan düğmeye döner (onay penceresi): bekleyen odak bırakılır.
          if (onay?.tur === "oge" && !silindi.current) odaklanacak.current = null;
          silindi.current = false;
          setOnay(null);
        }}
        baslik={doldur(
          metin(
            onay?.tur === "menu"
              ? "yonetim.menu.menuSilOnay.baslik"
              : "yonetim.menu.ogeSilOnay.baslik",
          ),
          { ad: onayAdi },
        )}
        aciklama={
          onay?.tur === "menu"
            ? metin("yonetim.menu.menuSilOnay.metin")
            : onayAltlari > 0
              ? doldur(metin("yonetim.menu.ogeSilOnay.metinAltli"), { sayi: String(onayAltlari) })
              : metin("yonetim.menu.ogeSilOnay.metin")
        }
        onayEtiketi={metin(onay?.tur === "menu" ? "yonetim.menu.menuyuSil" : "yonetim.menu.sil")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={async () => {
          if (onay?.tur === "oge") {
            const sonuc = await islem(
              menuUclari.ogeSil,
              { kimlik: onay.oge.kimlik },
              "yonetim.menu.silindi",
            );
            if (!sonuc.tamam) odaklanacak.current = null;
            silindi.current = sonuc.tamam;
          } else if (onay?.tur === "menu") {
            await islem(
              menuUclari.menuSil,
              { kimlik: onay.menu.kimlik },
              "yonetim.menu.menuSilindi",
            );
          }
        }}
      />
    </>
  );
}
