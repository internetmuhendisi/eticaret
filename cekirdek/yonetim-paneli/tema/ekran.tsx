"use client";
// Tema ekranı (kart 0148, karar 0080, 0101 ve 0127): sitenin kullanabileceği temalar kart kart; her kartta temanın
// adı, seçiliyse işareti, "Demoyu gez" bağlantısı (yeni sekmede, demonun adresinde ?tema=<kod>) ve "Bu temayı
// kullan". Panelde canlı önizleme yoktur, karşılaştırma demoda yapılır (karar 0080). Siteye özel temanın demosu
// yoktur. Altında masaüstünde ürün listesinin filtresinin yeri (mağaza sahibinin tema ayarı). Komut çubuğunda
// "Önceki hâline dön".
//
// "Bu temayı kullan" bir pencere açar ve vitrin bölümlerinin yolunu sorar (kart 0113): yeni temanın düzenini
// uygulamak ya da bugünkü düzeni korumak. Seçim yapılmadan yayınlanmaz. Her değişiklik temanın yeni sürümüdür, hemen
// yayınlanır; sonuç bildirimle verilir, sayfanın verisi sunucudan yeniden okunur. Geri dönüş ekranın gördüğü
// sürüme göredir (karar 0115'teki kural): arada başka bir değişiklik yazıldıysa sunucu hiçbir şey yazmaz.
//
// "Mağaza sahibi temayı değiştirebilir" kapalıysa ya da yöneticinin tema.degistir izni yoksa değiştiren düğmelerin
// hiçbiri görünmez; ayar kapalıysa nedeni yazar.
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
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import {
  Kart,
  KartAciklamasi,
  KartAlti,
  KartBasligi,
  KartUstu,
} from "../../../bilesenler/parcalar/kart";
import {
  Pencere,
  PencereAciklamasi,
  PencereAlti,
  PencereBasligi,
  PencereIcerigi,
  PencereUstu,
} from "../../../bilesenler/parcalar/pencere";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { type UrunFiltresiGorunumu, urunFiltresiGorunumleri } from "../../kayitlar/tema";
import { useMetin } from "../../metinler/istemci-metni";
import type { MetinAnahtari } from "../../metinler/metin";
import { type DuzenYolu, duzenYollari } from "../../moduller/duzen/gecis";
import { doldur } from "../../moduller/eposta/sablon";
import { EylemDugmesi } from "../eylem-dugmesi";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelSonucu } from "../panel-istegi";
import { useSunucuFormu } from "../sunucu-formu";
import { temaHatasiMetni, temaUclari } from "./hatalar";
import type { EkranTemasi, TemaEkraniVerisi } from "./veri";

type Baglam = {
  veri: TemaEkraniVerisi;
  // Bu yönetici bu sitede temayı değiştirebilir mi: izni var ve site ayarı açık.
  degistirebilir: boolean;
  secilen: EkranTemasi | null;
  setSecilen: (tema: EkranTemasi | null) => void;
  islem: (
    yol: string,
    govde: unknown,
    basari: MetinAnahtari,
    secenekler?: { formda?: boolean },
  ) => Promise<PanelSonucu<unknown>>;
  // Yayından sonra odağın gideceği tema: kartının başlığı (düğmesi kalkar).
  odaklanacak: RefObject<string | null>;
};

const TemaBaglami = createContext<Baglam | null>(null);
const useTema = (): Baglam => {
  const baglam = useContext(TemaBaglami);
  if (baglam === null) throw new Error("TemaSaglayici dışında kullanılamaz.");
  return baglam;
};

export function TemaSaglayici({
  veri,
  izinli,
  children,
}: {
  veri: TemaEkraniVerisi;
  // Yöneticinin tema.degistir izni (sunucudan).
  izinli: boolean;
  children: ReactNode;
}) {
  const [secilen, setSecilen] = useState<EkranTemasi | null>(null);
  const odaklanacak = useRef<string | null>(null);
  const panelIslemi = usePanelIslemi(temaHatasiMetni);
  return (
    <TemaBaglami.Provider
      value={{
        veri,
        degistirebilir: izinli && veri.degistirilebilir,
        secilen,
        setSecilen,
        islem: (yol, govde, basari, secenekler = {}) => panelIslemi(yol, govde, basari, secenekler),
        odaklanacak,
      }}
    >
      {children}
    </TemaBaglami.Provider>
  );
}

// Komut çubuğunun eylemi: "Önceki hâline dön". Tek sürümde dönülecek hâl yoktur.
export function TemaEylemleri() {
  const { veri, degistirebilir, islem } = useTema();
  // Süren geri dönüş: aynı düğmeye ikinci basış dikkate alınmaz.
  const donuluyor = useRef(false);
  if (!degistirebilir || veri.sira < 2) return null;
  return (
    <EylemDugmesi
      eylem="onceki-hale-don"
      onClick={() => {
        if (donuluyor.current) return;
        donuluyor.current = true;
        void islem(temaUclari.geriDon, { son: veri.sira }, "yonetim.tema.geriDonuldu").finally(
          () => {
            donuluyor.current = false;
          },
        );
      }}
    />
  );
}

function TemaKarti({ tema }: { tema: EkranTemasi }) {
  const metin = useMetin();
  const { degistirebilir, setSecilen } = useTema();
  const baslikKimligi = `tema-${tema.kod}`;
  return (
    <Kart className="w-full" aria-labelledby={baslikKimligi} role="group">
      <KartUstu>
        <KartBasligi duzey={3} id={baslikKimligi} tabIndex={-1}>
          {tema.ad}
        </KartBasligi>
        <span className="flex flex-wrap gap-2">
          {tema.secili ? <Rozet tur="basari">{metin("yonetim.tema.kullaniliyor")}</Rozet> : null}
          {tema.kaynak === "site" ? (
            <Rozet tur="ikincil">{metin("yonetim.tema.siteyeOzel")}</Rozet>
          ) : null}
        </span>
      </KartUstu>
      {tema.kaynak === "site" ? (
        <KartAciklamasi>{metin("yonetim.tema.demosuYok")}</KartAciklamasi>
      ) : null}
      {/* Kartın altı her kartta aynı yükseklikte biter: "Bu temayı kullan" önce durur, dar kartta alt satıra inen
          "Demoyu gez" seçili temanın tek bağlantısıyla aynı hizada kalır. */}
      <KartAlti className="mt-auto">
        {degistirebilir && !tema.secili ? (
          <Dugme
            tur="ikincil"
            aria-label={doldur(metin("yonetim.tema.kullanEtiketi"), { ad: tema.ad })}
            onClick={() => setSecilen(tema)}
          >
            {metin("yonetim.tema.kullan")}
          </Dugme>
        ) : null}
        {tema.demo === undefined ? null : (
          <Baglanti
            gorunum="cerceveli"
            href={tema.demo}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={doldur(metin("yonetim.tema.demoyuGezEtiketi"), { ad: tema.ad })}
          >
            {metin("yonetim.tema.demoyuGez")}
            <Ikon ad="yeni-sekme" />
          </Baglanti>
        )}
      </KartAlti>
    </Kart>
  );
}

function TemaPenceresi() {
  const metin = useMetin();
  const { secilen, setSecilen, odaklanacak } = useTema();
  return (
    <Pencere open={secilen !== null} onOpenChange={(acik) => (acik ? undefined : setSecilen(null))}>
      {secilen === null ? null : (
        <PencereIcerigi
          kapatEtiketi={metin("ortak.parca.kapat")}
          genislik="orta"
          onCloseAutoFocus={(olay) => {
            // Yayınlandıysa düğme kalkar: odak, sayfa yenilenince seçilen temanın başlığına konur.
            if (odaklanacak.current !== null) olay.preventDefault();
          }}
        >
          <PencereUstu>
            <PencereBasligi>
              {doldur(metin("yonetim.tema.pencere.baslik"), { ad: secilen.ad })}
            </PencereBasligi>
            <PencereAciklamasi>{metin("yonetim.tema.pencere.aciklama")}</PencereAciklamasi>
          </PencereUstu>
          {/* Pencere kapanınca form kalkar: her açılışta boş başlar, düzenin yolu bilerek seçilir. */}
          <TemaFormu tema={secilen} />
        </PencereIcerigi>
      )}
    </Pencere>
  );
}

const yolAdlari: Record<DuzenYolu, MetinAnahtari> = {
  uygula: "yonetim.tema.pencere.uygula",
  koru: "yonetim.tema.pencere.koru",
};
const yolAciklamalari: Record<DuzenYolu, MetinAnahtari> = {
  uygula: "yonetim.tema.pencere.uygulaAciklamasi",
  koru: "yonetim.tema.pencere.koruAciklamasi",
};

function TemaFormu({ tema }: { tema: EkranTemasi }) {
  const metin = useMetin();
  const { setSecilen, islem, odaklanacak } = useTema();
  const [yol, setYol] = useState<DuzenYolu | undefined>(undefined);
  const [secimHatasi, setSecimHatasi] = useState(false);
  const [genelHata, setGenelHata] = useState<MetinAnahtari | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const yolGrubu = useRef<HTMLDivElement>(null);
  const gonder = (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor) return;
    if (yol === undefined) {
      setSecimHatasi(true);
      yolGrubu.current?.querySelector<HTMLElement>("[role=radio]")?.focus();
      return;
    }
    setGonderiliyor(true);
    setGenelHata(null);
    void islem(
      temaUclari.yayinla,
      { tema: tema.kod, ayarlar: tema.ayarlar, duzen: yol },
      "yonetim.tema.yayinlandi",
      { formda: true },
    )
      .then((sonuc) => {
        if (sonuc.tamam) {
          odaklanacak.current = tema.kod;
          setSecilen(null);
        } else {
          setGenelHata(temaHatasiMetni(sonuc));
        }
      })
      .finally(() => setGonderiliyor(false));
  };
  return (
    <Form
      kodGerekliMetni={metin("ortak.form.kodGerekli")}
      yukleniyorMetni={metin("ortak.form.yukleniyor")}
      onSubmit={gonder}
      className="flex flex-col gap-5"
    >
      {genelHata === null ? null : <Uyari tur="tehlike">{metin(genelHata)}</Uyari>}
      <div ref={yolGrubu}>
        <SecenekGrubu
          baslik={metin("yonetim.tema.pencere.duzen")}
          etiket={metin("yonetim.tema.pencere.duzen")}
          ogeler={duzenYollari.map((deger) => ({ deger, ad: metin(yolAdlari[deger]) }))}
          deger={yol}
          onDegerDegisti={(yeni) => {
            setYol(yeni as DuzenYolu);
            setSecimHatasi(false);
          }}
          secilemezEki=""
          {...(yol === undefined ? {} : { aciklama: metin(yolAciklamalari[yol]) })}
          {...(secimHatasi ? { hata: metin("yonetim.tema.pencere.secimYok") } : {})}
        />
      </div>
      <PencereAlti>
        <Dugme tur="sade" onClick={() => setSecilen(null)}>
          {metin("ortak.islem.vazgec")}
        </Dugme>
        <GonderDugmesi disabled={gonderiliyor}>
          {metin("yonetim.tema.pencere.yayinla")}
        </GonderDugmesi>
      </PencereAlti>
    </Form>
  );
}

function FiltreYeri() {
  const metin = useMetin();
  const { veri, degistirebilir, islem } = useTema();
  // Sunucunun yeni verisi gelince (geri dönüş, başka sekme) seçim ona döner; kayıttan sonra arada yapılan seçim
  // yenilemeyle ezilmez (kart 0223).
  const {
    form: yer,
    setForm: setYer,
    degisti,
    kaydedildi,
  } = useSunucuFormu<UrunFiltresiGorunumu>(veri.filtreYeri);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const adlar: Record<UrunFiltresiGorunumu, MetinAnahtari> = {
    solda: "yonetim.tema.liste.solda",
    ustte: "yonetim.tema.liste.ustte",
  };
  const secili = veri.temalar.find((tema) => tema.secili);
  const gonder = (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (secili === undefined || gonderiliyor) return;
    setGonderiliyor(true);
    const gonderilen = yer;
    void islem(
      temaUclari.yayinla,
      { tema: secili.kod, ayarlar: { ...secili.ayarlar, urunFiltresi: gonderilen } },
      "yonetim.tema.filtreKaydedildi",
    )
      .then((sonuc) => {
        if (sonuc.tamam) kaydedildi(gonderilen);
      })
      .finally(() => setGonderiliyor(false));
  };
  return (
    <section aria-labelledby="tema-urun-listesi" className="flex flex-col gap-3">
      <h2 id="tema-urun-listesi" className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {metin("yonetim.tema.liste.baslik")}
      </h2>
      <Kart>
        <KartAciklamasi>{metin("yonetim.tema.liste.aciklama")}</KartAciklamasi>
        {degistirebilir && secili !== undefined ? (
          <Form
            kodGerekliMetni={metin("ortak.form.kodGerekli")}
            yukleniyorMetni={metin("ortak.form.yukleniyor")}
            onSubmit={gonder}
            className="flex flex-col gap-4"
          >
            <SecenekGrubu
              baslik={metin("yonetim.tema.liste.filtreYeri")}
              etiket={metin("yonetim.tema.liste.filtreYeri")}
              ogeler={urunFiltresiGorunumleri.map((deger) => ({ deger, ad: metin(adlar[deger]) }))}
              deger={yer}
              onDegerDegisti={(yeni) => setYer(yeni as UrunFiltresiGorunumu)}
              secilemezEki=""
              aciklama={metin("yonetim.tema.liste.filtreAciklamasi")}
            />
            <div>
              <GonderDugmesi disabled={gonderiliyor || !degisti}>
                {metin("yonetim.tema.liste.kaydet")}
              </GonderDugmesi>
            </div>
          </Form>
        ) : (
          <dl className="m-0 flex flex-col gap-1">
            <dt className="font-kalin">{metin("yonetim.tema.liste.filtreYeri")}</dt>
            <dd className="m-0">{metin(adlar[veri.filtreYeri])}</dd>
          </dl>
        )}
      </Kart>
    </section>
  );
}

export function TemaIcerigi() {
  const metin = useMetin();
  const { veri, odaklanacak } = useTema();
  // Yayından sonra sayfanın yeni verisi gelince odak seçilen temanın başlığına konur.
  useEffect(() => {
    const kod = odaklanacak.current;
    if (kod === null) return;
    if (!veri.temalar.some((tema) => tema.kod === kod && tema.secili)) return;
    odaklanacak.current = null;
    document.getElementById(`tema-${kod}`)?.focus();
  }, [veri, odaklanacak]);
  return (
    <div className="flex flex-col gap-8">
      {veri.degistirilebilir ? null : <Uyari tur="bilgi">{metin("yonetim.tema.kapali")}</Uyari>}
      <section aria-labelledby="tema-temalar" className="flex flex-col gap-3">
        <h2 id="tema-temalar" className="font-baslik text-baslik-4 font-baslik-kalinligi">
          {metin("yonetim.tema.temalar")}
        </h2>
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 tablet:grid-cols-2 masaustu:grid-cols-3">
          {veri.temalar.map((tema) => (
            <li key={tema.kod} className="flex">
              <TemaKarti tema={tema} />
            </li>
          ))}
        </ul>
      </section>
      <FiltreYeri />
      <TemaPenceresi />
    </div>
  );
}
