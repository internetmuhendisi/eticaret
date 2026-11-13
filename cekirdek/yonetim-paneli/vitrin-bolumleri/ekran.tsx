"use client";
// Vitrin bölümleri ekranı (kart 0142, karar 0080, 0101 ve 0115; Canlı Çarşı taslağı): üst kısım, ana sayfa ve alt
// kısmın bölümleri sekme sekme, sıralanabilir listede. Her satırda bölümün adı, görünümü, gizliyse ya da vitrinde
// görünmüyorsa nedeni; görünürlük, düzenle ve "Diğer işlemler" menüsünde sil. Komut çubuğunda "Önceki hâline dön"
// ve "Bölüm ekle". Bölüm ekle yalnız seçili alana konabilen türleri listeler; seçilen türün formu açılır,
// kaydedilince bölüm alanın sonuna eklenir.
//
// Her değişiklik düzenin yeni sürümüdür, hemen yayınlanır; sonuç bildirimle verilir, sayfanın verisi sunucudan
// yeniden okunur (router.refresh). Geri dönüş her zaman ekranın gördüğü sürüme göredir (karar 0115): "Önceki hâline
// dön" bugünkü sürümün sırasını, silmenin "Geri al"ı silmenin yazdığı sürümün sırasını gönderir; arada başka bir
// değişiklik yazıldıysa sunucu hiçbir şey yazmaz. Sıralama listede hemen görünür, kaydedilemezse eski sıraya döner.
// Silinen satırın yerine odak sonraki satıra geçer.
//
// Komut çubuğu sayfa iskeletinindir (PanelSayfasi, sunucuda): eylemler ile liste aynı durumu bu sağlayıcıdan
// paylaşır. Yetkisi olmayan yönetici değiştiren düğmeleri hiç görmez.
import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import {
  AcilirMenu,
  AcilirMenuIcerigi,
  AcilirMenuOgesi,
  AcilirMenuTetikleyici,
} from "../../../bilesenler/parcalar/acilir-menu";
import { bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { Dugme, IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { Sekme, SekmeIcerigi, SekmeListesi, Sekmeler } from "../../../bilesenler/parcalar/sekmeler";
import { SiralanabilirListe } from "../../../bilesenler/parcalar/siralanabilir-liste";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import {
  YanPencere,
  YanPencereAciklamasi,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereUstu,
} from "../../../bilesenler/parcalar/yan-pencere";
import { type DuzenAlani, duzenAlanlari } from "../../kayitlar/tema";
import { useMetin } from "../../metinler/istemci-metni";
import type { MetinAnahtari } from "../../metinler/metin";
import { siralamaMetinleri } from "../../metinler/siralama-metinleri";
import { doldur } from "../../moduller/eposta/sablon";
import { bolumKutuphanesi } from "../../vitrin/bolum-kutuphanesi/kutuphane";
import type { BolumTarifi } from "../../vitrin/bolum-kutuphanesi/tarif";
import { EylemDugmesi } from "../eylem-dugmesi";
import { type PanelSonucu, panelIstegi } from "../panel-istegi";
import { BolumDuzenleyici, yeniDegerler } from "./bolum-duzenleyici";
import { islemHatasiMetni } from "./hatalar";
import { bolumOzeti, bolumunAdi, turAciklamalari } from "./ozet";
import type { BolumlerEkraniVerisi, EkranBolumu } from "./veri";

type HazirVeri = Extract<BolumlerEkraniVerisi, { durum: "hazir" }>;

type Pencere =
  | { tur: "ekle" }
  | { tur: "yeni"; bolumTuru: string }
  | { tur: "duzenle"; kimlik: string }
  | null;

type IslemSecenekleri = {
  // Başarı bildiriminde "Geri al": yanıttaki sürüm hâlâ sonsa önceki hâline döner.
  geriAlinir?: boolean;
  // Formun kaydı: hatayı form kendisi gösterir, bildirim verilmez (aynı hata iki kez duyulmasın).
  formda?: boolean;
};

type Baglam = {
  veri: HazirVeri;
  degistirebilir: boolean;
  alan: DuzenAlani;
  setAlan: (alan: DuzenAlani) => void;
  pencere: Pencere;
  setPencere: (pencere: Pencere) => void;
  // Uca gönderir; başarıda veriyi yeniler ve bildirir, hatada (formda değilse) hata bildirimi verir.
  islem: (
    yol: string,
    govde: unknown,
    basari: MetinAnahtari,
    secenekler?: IslemSecenekleri,
  ) => Promise<PanelSonucu<unknown>>;
  geriDon: (son: number) => void;
};

const BolumlerBaglami = createContext<Baglam | null>(null);
const useBolumler = (): Baglam => {
  const baglam = useContext(BolumlerBaglami);
  if (baglam === null) throw new Error("BolumlerSaglayici dışında kullanılamaz.");
  return baglam;
};

// "Bölüm ekle" düğmesinin işareti: alan boşalınca odak oraya geçer.
const ekleIsareti = "data-bolum-ekle";

export function BolumlerSaglayici({
  veri,
  degistirebilir,
  children,
}: {
  veri: HazirVeri;
  degistirebilir: boolean;
  children: ReactNode;
}) {
  const metin = useMetin();
  const router = useRouter();
  const [alan, setAlan] = useState<DuzenAlani>("ana-sayfa");
  const [pencere, setPencere] = useState<Pencere>(null);
  // Süren geri dönüş: aynı düğmeye ikinci basış dikkate alınmaz.
  const donuluyor = useRef(false);
  const islem: Baglam["islem"] = async (yol, govde, basari, secenekler = {}) => {
    const sonuc = await panelIstegi<{ sira?: number }>(yol, govde);
    if (sonuc.tamam) {
      router.refresh();
      const silmeSirasi = sonuc.veri.sira;
      bildirimGoster(
        "basari",
        metin(basari),
        secenekler.geriAlinir === true && silmeSirasi !== undefined
          ? { etiket: metin("yonetim.bolumler.geriAl"), tikla: () => geriDon(silmeSirasi) }
          : undefined,
      );
      return sonuc;
    }
    // Liste ekrandakinden farklıysa (bölüm yok, düzen arada değişti) güncel hâli gösterilir.
    if (sonuc.kod === "bulunamadi" || sonuc.kod === "cakisma") router.refresh();
    if (secenekler.formda !== true) bildirimGoster("tehlike", metin(islemHatasiMetni(sonuc)));
    return sonuc;
  };
  const geriDon = (son: number) => {
    if (donuluyor.current) return;
    donuluyor.current = true;
    void islem("duzen-geri-don", { son }, "yonetim.bolumler.geriDonuldu").finally(() => {
      donuluyor.current = false;
    });
  };
  return (
    <BolumlerBaglami.Provider
      value={{ veri, degistirebilir, alan, setAlan, pencere, setPencere, islem, geriDon }}
    >
      {children}
    </BolumlerBaglami.Provider>
  );
}

// Komut çubuğunun eylemleri.
export function BolumlerEylemleri() {
  const metin = useMetin();
  const { veri, setPencere, geriDon } = useBolumler();
  return (
    <>
      {veri.sira > 1 ? (
        <EylemDugmesi eylem="onceki-hale-don" onClick={() => geriDon(veri.sira)} />
      ) : null}
      <EylemDugmesi
        eylem="ekle"
        ne={metin("yonetim.bolumler.bolum")}
        asil
        onClick={() => setPencere({ tur: "ekle" })}
        {...{ [ekleIsareti]: "" }}
      />
    </>
  );
}

function SatirIcerigi({ bolum, adi, sil }: { bolum: EkranBolumu; adi: string; sil: () => void }) {
  const metin = useMetin();
  const { degistirebilir, setPencere, islem } = useBolumler();
  const tarif = Object.hasOwn(bolumKutuphanesi, bolum.tur)
    ? bolumKutuphanesi[bolum.tur]
    : undefined;
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 break-words">
        <span className="flex flex-wrap items-center gap-2 font-kalin">
          {adi}
          {bolum.gizli ? <Rozet tur="ikincil">{metin("yonetim.bolumler.gizliRozet")}</Rozet> : null}
          {!bolum.gizli && !bolum.cizilir ? (
            <Rozet tur="uyari">{metin("yonetim.bolumler.gorunmuyorRozet")}</Rozet>
          ) : null}
        </span>
        <span className="text-kucuk text-soluk-yazi">{bolumOzeti(metin, bolum, tarif)}</span>
        {bolum.neden === undefined || bolum.gizli ? null : (
          <span className="text-kucuk text-soluk-yazi">{metin(bolum.neden)}</span>
        )}
      </div>
      {degistirebilir ? (
        <div className="flex shrink-0 items-center">
          {/* İkon bölümün bugünkü durumunu gösterir (taslak); düğmenin adı yapacağı işi söyler. */}
          <IkonDugmesi
            ikon={bolum.gizli ? "gizle" : "goster"}
            etiket={doldur(
              metin(bolum.gizli ? "yonetim.bolumler.goster" : "yonetim.bolumler.gizle"),
              { ad: adi },
            )}
            onClick={() =>
              void islem(
                "duzen-bolum-gorunurlugu",
                { kimlik: bolum.kimlik, gizli: !bolum.gizli },
                bolum.gizli ? "yonetim.bolumler.gosterildi" : "yonetim.bolumler.gizlendi",
              )
            }
          />
          {tarif === undefined ? null : (
            <IkonDugmesi
              ikon="duzenle"
              etiket={doldur(metin("yonetim.bolumler.duzenle"), { ad: adi })}
              onClick={() => setPencere({ tur: "duzenle", kimlik: bolum.kimlik })}
            />
          )}
          <AcilirMenu>
            <AcilirMenuTetikleyici asChild>
              <IkonDugmesi
                ikon="diger"
                etiket={doldur(metin("yonetim.bolumler.diger"), { ad: adi })}
              />
            </AcilirMenuTetikleyici>
            <AcilirMenuIcerigi align="end">
              <AcilirMenuOgesi tur="tehlike" onSelect={sil}>
                {metin("yonetim.bolumler.sil")}
              </AcilirMenuOgesi>
            </AcilirMenuIcerigi>
          </AcilirMenu>
        </div>
      ) : null}
    </div>
  );
}

function AlanListesi({ alan }: { alan: DuzenAlani }) {
  const metin = useMetin();
  const { veri, degistirebilir, islem } = useBolumler();
  const sunucudaki = veri.alanlar[alan];
  // Sıralama listede hemen görünür; sunucunun verisi gelince (ya da kayıt olmazsa) ona dönülür. Art arda iki
  // sıralamada yalnız sonuncusunun sonucu yerel sırayı bırakır.
  const [yerel, setYerel] = useState<EkranBolumu[] | null>(null);
  const sonSiralama = useRef(0);
  // Silinen satırdan sonra odaklanacak satır (yoksa "Bölüm ekle"): satır yenilemeyle kalkınca odak kaybolmasın.
  const odaklanacak = useRef<string | null>(null);
  const listeRef = useRef<HTMLDivElement>(null);
  // Sunucunun yeni verisi gelince yerel sıra bırakılır, bekleyen odak yerine konur.
  useEffect(() => {
    setYerel(null);
    const hedef = odaklanacak.current;
    if (hedef === null) return;
    if (hedef === "") {
      odaklanacak.current = null;
      document.querySelector<HTMLElement>(`[${ekleIsareti}]`)?.focus();
      return;
    }
    if (!sunucudaki.some((bolum) => bolum.kimlik === hedef)) return;
    odaklanacak.current = null;
    listeRef.current?.querySelector<HTMLElement>(`[data-anahtar="${hedef}"] button`)?.focus();
  }, [sunucudaki]);
  const bolumler = yerel ?? sunucudaki;
  // Aynı türden birden çok bölüm varsa adları sırayla ayrılır: düğmelerin ekran okuyucudaki adı karışmasın.
  const adi = (bolum: EkranBolumu) => {
    const ad = bolumunAdi(metin, bolum.tur);
    if (bolumler.filter((oteki) => oteki.tur === bolum.tur).length < 2) return ad;
    return doldur(metin("yonetim.bolumler.ayniTurAdi"), {
      ad,
      sira: String(bolumler.indexOf(bolum) + 1),
    });
  };
  const sil = (bolum: EkranBolumu) => () => {
    const sira = bolumler.indexOf(bolum);
    odaklanacak.current = (bolumler[sira + 1] ?? bolumler[sira - 1])?.kimlik ?? "";
    void islem("duzen-bolum-sil", { kimlik: bolum.kimlik }, "yonetim.bolumler.silindi", {
      geriAlinir: true,
    }).then((sonuc) => {
      if (!sonuc.tamam) odaklanacak.current = null;
    });
  };
  const etiket = doldur(metin("yonetim.bolumler.listeEtiketi"), {
    alan: metin(`yonetim.bolumler.alanlar.${alan}`),
  });
  if (bolumler.length === 0) {
    return (
      <BosHal
        ikon="bolumler"
        baslik={metin("yonetim.bolumler.bos.baslik")}
        aciklama={metin("yonetim.bolumler.bos.metin")}
      />
    );
  }
  if (!degistirebilir) {
    return (
      <ol
        aria-label={etiket}
        className="m-0 flex list-none flex-col rounded-orta border border-kenar bg-zemin p-0"
      >
        {bolumler.map((bolum) => (
          <li key={bolum.kimlik} className="flex border-b border-kenar p-3 last:border-b-0">
            <SatirIcerigi bolum={bolum} adi={adi(bolum)} sil={() => undefined} />
          </li>
        ))}
      </ol>
    );
  }
  return (
    <div ref={listeRef} className="flex flex-col gap-3">
      <Uyari tur="bilgi">{metin("yonetim.bolumler.siralamaBilgisi")}</Uyari>
      <SiralanabilirListe
        ogeler={bolumler}
        anahtar={(bolum) => bolum.kimlik}
        ad={adi}
        etiket={etiket}
        metinler={siralamaMetinleri(metin)}
        siralaninca={(yeni) => {
          setYerel(yeni);
          sonSiralama.current += 1;
          const bu = sonSiralama.current;
          void islem(
            "duzen-sirala",
            { alan, kimlikler: yeni.map((bolum) => bolum.kimlik) },
            "yonetim.bolumler.siralandi",
          ).then((sonuc) => {
            if (!sonuc.tamam && bu === sonSiralama.current) setYerel(null);
          });
        }}
        satir={(bolum) => <SatirIcerigi bolum={bolum} adi={adi(bolum)} sil={sil(bolum)} />}
      />
    </div>
  );
}

function TurSecimi({ alan }: { alan: DuzenAlani }) {
  const metin = useMetin();
  const { setPencere } = useBolumler();
  const turler = Object.entries(bolumKutuphanesi).filter(([, tarif]) =>
    tarif.duzenAlanlari.includes(alan),
  );
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 tablet:grid-cols-2">
      {turler.map(([tur, tarif]) => (
        <li key={tur}>
          <Dugme
            tur="cerceveli"
            className="h-full w-full flex-col items-start gap-1 rounded-orta py-3 text-left"
            onClick={() => setPencere({ tur: "yeni", bolumTuru: tur })}
          >
            <span>{metin(tarif.ad)}</span>
            {turAciklamalari[tur] === undefined ? null : (
              <span className="font-normal text-kucuk text-soluk-yazi">
                {metin(turAciklamalari[tur])}
              </span>
            )}
          </Dugme>
        </li>
      ))}
    </ul>
  );
}

function BolumPenceresi() {
  const metin = useMetin();
  const { veri, alan, pencere, setPencere, islem } = useBolumler();
  // Formda kaydedilmemiş değişiklik varken pencere kapatılmak istenirse önce sorulur.
  const [kirli, setKirli] = useState(false);
  const [soruluyor, setSoruluyor] = useState(false);
  const kapat = () => {
    setPencere(null);
    setKirli(false);
    setSoruluyor(false);
  };
  const kapatmayiIste = () => (kirli ? setSoruluyor(true) : kapat());
  const alanAdi = metin(`yonetim.bolumler.alanlar.${alan}`);
  const duzenleyici = (
    tarif: BolumTarifi,
    ilk: { gorunum: string; degerler: Record<string, unknown> },
    kaydet: (kayit: {
      gorunum: string;
      degerler: Record<string, unknown>;
    }) => Promise<PanelSonucu<unknown>>,
    anahtar: string,
  ) => (
    <BolumDuzenleyici
      key={anahtar}
      tarif={tarif}
      ilk={ilk}
      secenekler={veri.secenekler}
      kaydet={kaydet}
      kaydedince={kapat}
      vazgec={kapatmayiIste}
      degisince={setKirli}
    />
  );
  let icerik: { baslik: string; aciklama: string; govde: ReactNode } | null = null;
  if (pencere?.tur === "ekle") {
    icerik = {
      baslik: metin("yonetim.bolumler.ekle.baslik"),
      aciklama: doldur(metin("yonetim.bolumler.ekle.aciklama"), { alan: alanAdi }),
      govde: <TurSecimi alan={alan} />,
    };
  } else if (pencere?.tur === "yeni") {
    const tarif: BolumTarifi | undefined = bolumKutuphanesi[pencere.bolumTuru];
    if (tarif !== undefined) {
      icerik = {
        baslik: metin(tarif.ad),
        aciklama: doldur(metin("yonetim.bolumler.form.yeniKonum"), { alan: alanAdi }),
        govde: duzenleyici(
          tarif,
          { gorunum: tarif.gorunumler[0].kod, degerler: yeniDegerler(tarif) },
          ({ gorunum, degerler }) =>
            islem(
              "duzen-bolum-ekle",
              { alan, tur: tarif.tur, gorunum, degerler },
              "yonetim.bolumler.eklendi",
              { formda: true },
            ),
          `yeni-${tarif.tur}`,
        ),
      };
    }
  } else if (pencere?.tur === "duzenle") {
    const sira = veri.alanlar[alan].findIndex((bolum) => bolum.kimlik === pencere.kimlik);
    const bolum = veri.alanlar[alan][sira];
    const tarif =
      bolum === undefined || !Object.hasOwn(bolumKutuphanesi, bolum.tur)
        ? undefined
        : bolumKutuphanesi[bolum.tur];
    if (bolum !== undefined && tarif !== undefined) {
      icerik = {
        baslik: metin(tarif.ad),
        aciklama: doldur(metin("yonetim.bolumler.form.konum"), {
          alan: alanAdi,
          sira: String(sira + 1),
          durum: metin(
            bolum.gizli ? "yonetim.bolumler.form.gizli" : "yonetim.bolumler.form.gorunur",
          ),
        }),
        govde: duzenleyici(
          tarif,
          { gorunum: bolum.gorunum, degerler: bolum.degerler },
          ({ gorunum, degerler }) =>
            islem(
              "duzen-bolum-degistir",
              { kimlik: bolum.kimlik, gorunum, degerler },
              "yonetim.bolumler.kaydedildi",
              { formda: true },
            ),
          bolum.kimlik,
        ),
      };
    }
  }
  return (
    <YanPencere
      open={icerik !== null}
      onOpenChange={(acik) => (acik ? undefined : kapatmayiIste())}
    >
      {icerik === null ? null : (
        <YanPencereIcerigi kapatEtiketi={metin("ortak.parca.kapat")} className="tablet:max-w-metin">
          <YanPencereUstu>
            <YanPencereBasligi>{icerik.baslik}</YanPencereBasligi>
            <YanPencereAciklamasi>{icerik.aciklama}</YanPencereAciklamasi>
          </YanPencereUstu>
          {soruluyor ? (
            <Uyari tur="uyari">
              <span className="flex flex-col items-start gap-2">
                {metin("yonetim.bolumler.form.kaydedilmedi")}
                <span className="flex flex-wrap gap-2">
                  <Dugme tur="cerceveli" onClick={kapat}>
                    {metin("yonetim.bolumler.form.birak")}
                  </Dugme>
                  <Dugme tur="sade" autoFocus onClick={() => setSoruluyor(false)}>
                    {metin("yonetim.bolumler.form.don")}
                  </Dugme>
                </span>
              </span>
            </Uyari>
          ) : null}
          {icerik.govde}
        </YanPencereIcerigi>
      )}
    </YanPencere>
  );
}

export function BolumlerListesi() {
  const metin = useMetin();
  const { veri, alan, setAlan } = useBolumler();
  return (
    <>
      <Sekmeler value={alan} onValueChange={(yeni) => setAlan(yeni as DuzenAlani)}>
        <SekmeListesi aria-label={metin("yonetim.bolumler.alanSecimi")}>
          {duzenAlanlari.map((kod) => (
            <Sekme key={kod} value={kod}>
              {metin(`yonetim.bolumler.alanlar.${kod}`)}
              <span className="text-kucuk">{veri.alanlar[kod].length}</span>
            </Sekme>
          ))}
        </SekmeListesi>
        {duzenAlanlari.map((kod) => (
          <SekmeIcerigi key={kod} value={kod}>
            <AlanListesi alan={kod} />
          </SekmeIcerigi>
        ))}
      </Sekmeler>
      <BolumPenceresi />
    </>
  );
}
