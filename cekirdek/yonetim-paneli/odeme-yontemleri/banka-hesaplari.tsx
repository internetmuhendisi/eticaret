"use client";
// Banka hesapları ekranı (kart 0214, karar 0141; kart 0211'in taslağı): havalede müşteriye gösterilen hesaplar,
// müşterinin gördüğü sırayla. Hesap komut çubuğundaki "Hesap ekle" ile ya da satırdaki düzenle düğmesiyle yan
// pencerede açılan formda yazılır (banka, hesap sahibi, IBAN); IBAN sunucuda doğrulanır, hatası alanın altında yazar.
// Silme onay penceresiyle sorulur. Sıralama hemen kaydedilir. Hesap yoksa boş hâl bir sonraki adımı söyler: hesap
// eklenene kadar havale ödeme adımında görünmez. Değiştirme izni olmayan yönetici (görevli) yalnız listeyi görür.
// Komut çubuğu sayfa iskeletinindir: eylem ile içerik aynı durumu sağlayıcıdan paylaşır.
import {
  createContext,
  type FormEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { Dugme, IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
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
import { ibanYazisi } from "../../bolgeler/iban-yazisi";
import { useMetin } from "../../metinler/istemci-metni";
import type { MetinAnahtari } from "../../metinler/metin";
import { siralamaMetinleri } from "../../metinler/siralama-metinleri";
import { doldur } from "../../moduller/eposta/sablon";
import type { BankaHesabi } from "../../moduller/odeme/yontemler";
import { EylemDugmesi } from "../eylem-dugmesi";
import { useKapatmaSorusu } from "../kapatma-sorusu";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";

const genelHataMetni = (hata: PanelHatasi): MetinAnahtari =>
  hata.kod === "yetki"
    ? "yonetim.bankaHesaplari.hata.yetki"
    : hata.kod === "is-kurali"
      ? hata.ayrinti.some((sorun) => sorun.kod === "son-yontem")
        ? "yonetim.bankaHesaplari.hata.sonYontem"
        : "yonetim.bankaHesaplari.hata.sinir"
      : hata.kod === "cakisma" || hata.kod === "bulunamadi"
        ? "yonetim.bankaHesaplari.hata.degisti"
        : "yonetim.bankaHesaplari.hata.genel";

const ibanHataMetinleri: Record<string, MetinAnahtari> = {
  "iban-bicimi": "yonetim.bankaHesaplari.hata.ibanBicimi",
  "iban-ulke": "yonetim.bankaHesaplari.hata.ibanUlke",
  "iban-uzunluk": "yonetim.bankaHesaplari.hata.ibanUzunluk",
  "iban-kontrol": "yonetim.bankaHesaplari.hata.ibanKontrol",
  "iban-ayni": "yonetim.bankaHesaplari.hata.ibanAyni",
};

type Pencere = { tur: "ekle" } | { tur: "duzenle"; hesap: BankaHesabi } | null;

type Baglam = {
  hesaplar: BankaHesabi[];
  degistirebilir: boolean;
  pencere: Pencere;
  setPencere: (pencere: Pencere) => void;
  silinecek: BankaHesabi | null;
  setSilinecek: (hesap: BankaHesabi | null) => void;
  islem: ReturnType<typeof usePanelIslemi>;
};
const HesaplarBaglami = createContext<Baglam | null>(null);
const useHesaplar = (): Baglam => {
  const baglam = useContext(HesaplarBaglami);
  if (baglam === null) throw new Error("Banka hesapları sağlayıcısı yok.");
  return baglam;
};

export function BankaHesaplariSaglayici({
  hesaplar,
  degistirebilir,
  children,
}: {
  hesaplar: BankaHesabi[];
  degistirebilir: boolean;
  children: ReactNode;
}) {
  const [pencere, setPencere] = useState<Pencere>(null);
  const [silinecek, setSilinecek] = useState<BankaHesabi | null>(null);
  const islem = usePanelIslemi(genelHataMetni);
  return (
    <HesaplarBaglami.Provider
      value={{ hesaplar, degistirebilir, pencere, setPencere, silinecek, setSilinecek, islem }}
    >
      {children}
    </HesaplarBaglami.Provider>
  );
}

export function BankaHesaplariEylemleri() {
  const metin = useMetin();
  const { setPencere } = useHesaplar();
  return (
    <EylemDugmesi
      eylem="ekle"
      ne={metin("yonetim.bankaHesaplari.hesap")}
      asil
      onClick={() => setPencere({ tur: "ekle" })}
    />
  );
}

export function BankaHesaplariIcerigi() {
  const metin = useMetin();
  const { hesaplar, degistirebilir, setPencere, setSilinecek, islem } = useHesaplar();
  // Sıralama hemen gösterilir, kayıt arkadan; kaydedilemezse sunucunun sırasına dönülür.
  const [yerel, setYerel] = useState<BankaHesabi[] | null>(null);
  const sonSiralama = useRef(0);
  const anahtar = hesaplar.map((hesap) => hesap.kimlik).join();
  // biome-ignore lint/correctness/useExhaustiveDependencies: sunucunun listesi değişince yerel sıra bırakılır.
  useEffect(() => setYerel(null), [anahtar]);
  const liste = yerel ?? hesaplar;

  if (liste.length === 0) {
    return (
      <div className="flex max-w-metin flex-col gap-4">
        <BosHal
          ikon="havale"
          baslik={metin("yonetim.bankaHesaplari.bosBaslik")}
          aciklama={metin("yonetim.bankaHesaplari.bosAciklama")}
        >
          {degistirebilir ? (
            <Dugme tur="birincil" onClick={() => setPencere({ tur: "ekle" })}>
              {doldur(metin("yonetim.eylem.ekle"), { ne: metin("yonetim.bankaHesaplari.hesap") })}
            </Dugme>
          ) : null}
        </BosHal>
        <Pencereler />
      </div>
    );
  }

  const adi = (hesap: BankaHesabi) => hesap.banka;
  const satir = (hesap: BankaHesabi) => (
    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-kalin break-words">{hesap.banka}</span>
        <span className="text-kucuk text-soluk-yazi break-words">{hesap.sahip}</span>
        <span className="text-kucuk break-all">{ibanYazisi(hesap.iban)}</span>
      </div>
      {degistirebilir ? (
        <div className="flex shrink-0 items-center">
          <IkonDugmesi
            ikon="duzenle"
            etiket={doldur(metin("yonetim.bankaHesaplari.duzenle"), { ad: hesap.banka })}
            onClick={() => setPencere({ tur: "duzenle", hesap })}
          />
          <IkonDugmesi
            ikon="sil"
            etiket={doldur(metin("yonetim.bankaHesaplari.sil"), { ad: hesap.banka })}
            onClick={() => setSilinecek(hesap)}
          />
        </div>
      ) : null}
    </div>
  );
  return (
    <div className="flex max-w-metin flex-col gap-4">
      {degistirebilir ? (
        <SiralanabilirListe
          ogeler={liste}
          anahtar={(hesap) => hesap.kimlik}
          ad={adi}
          etiket={metin("yonetim.sayfa.bankaHesaplari.ad")}
          metinler={siralamaMetinleri(metin)}
          siralaninca={(yeni) => {
            setYerel(yeni);
            sonSiralama.current += 1;
            const bu = sonSiralama.current;
            void islem(
              "banka-hesaplari-sirala",
              { sira: yeni.map((hesap) => hesap.kimlik) },
              "yonetim.bankaHesaplari.siralandi",
            ).then((sonuc) => {
              if (!sonuc.tamam && bu === sonSiralama.current) setYerel(null);
            });
          }}
          satir={satir}
        />
      ) : (
        <ol aria-label={metin("yonetim.sayfa.bankaHesaplari.ad")} className="flex flex-col gap-2">
          {liste.map((hesap) => (
            <li
              key={hesap.kimlik}
              className="flex rounded-orta border border-kenar bg-zemin px-4 py-3"
            >
              {satir(hesap)}
            </li>
          ))}
        </ol>
      )}
      <Pencereler />
    </div>
  );
}

function HesapFormu({
  hesap,
  kapat,
  vazgec,
  degisince,
}: {
  hesap?: BankaHesabi;
  kapat: () => void;
  vazgec: () => void;
  degisince: (degisti: boolean) => void;
}) {
  const metin = useMetin();
  const { islem } = useHesaplar();
  const ilk = { banka: hesap?.banka ?? "", sahip: hesap?.sahip ?? "", iban: hesap?.iban ?? "" };
  const [form, setForm] = useState(ilk);
  const [hatalar, setHatalar] = useState<Partial<Record<keyof typeof ilk, string>>>({});
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const gonderiliyor = useRef(false);
  const degistir = (alan: keyof typeof ilk, deger: string) => {
    const yeni = { ...form, [alan]: deger };
    setForm(yeni);
    degisince(JSON.stringify(yeni) !== JSON.stringify(ilk));
  };
  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor.current) return;
    // Boş alan sunucuya gitmeden söylenir.
    const bos = (Object.keys(form) as (keyof typeof ilk)[]).filter(
      (alan) => form[alan].trim() === "",
    );
    if (bos.length > 0) {
      setHatalar(
        Object.fromEntries(bos.map((alan) => [alan, metin("yonetim.bankaHesaplari.hata.gerekli")])),
      );
      document.querySelector<HTMLInputElement>(`[name="hesap-${bos[0]}"]`)?.focus();
      return;
    }
    gonderiliyor.current = true;
    const sonuc = await islem(
      hesap === undefined ? "banka-hesabi-ekle" : "banka-hesabi-degistir",
      hesap === undefined ? form : { kimlik: hesap.kimlik, ...form },
      hesap === undefined ? "yonetim.bankaHesaplari.eklendi" : "yonetim.bankaHesaplari.degisti",
      { formda: true },
    );
    gonderiliyor.current = false;
    if (sonuc.tamam) {
      kapat();
      return;
    }
    const iban = sonuc.ayrinti.find(
      (sorun) => sorun.alan === "iban" && sorun.kod in ibanHataMetinleri,
    );
    if (iban !== undefined) {
      setHatalar({
        iban: metin(ibanHataMetinleri[iban.kod] ?? "yonetim.bankaHesaplari.hata.genel"),
      });
      setGenelHata(null);
      document.querySelector<HTMLInputElement>('[name="hesap-iban"]')?.focus();
      return;
    }
    setHatalar({});
    setGenelHata(metin(genelHataMetni(sonuc)));
  };
  const alan = (ad: keyof typeof ilk, etiket: MetinAnahtari, aciklama?: MetinAnahtari) => (
    <FormAlani
      etiket={metin(etiket)}
      {...(aciklama === undefined ? {} : { aciklama: metin(aciklama) })}
      {...(hatalar[ad] === undefined ? {} : { hata: hatalar[ad] })}
    >
      {(baglanti) => (
        <GirisAlani
          {...baglanti}
          name={`hesap-${ad}`}
          autoComplete="off"
          {...(ad === "iban" ? { spellCheck: false } : {})}
          value={form[ad]}
          onChange={(olay) => degistir(ad, olay.target.value)}
        />
      )}
    </FormAlani>
  );
  return (
    <Form
      kodGerekliMetni={metin("ortak.form.kodGerekli")}
      yukleniyorMetni={metin("ortak.form.yukleniyor")}
      onSubmit={gonder}
      className="flex flex-col gap-4"
    >
      {genelHata === null ? null : <Uyari tur="tehlike">{genelHata}</Uyari>}
      {alan("banka", "yonetim.bankaHesaplari.banka")}
      {alan("sahip", "yonetim.bankaHesaplari.sahip", "yonetim.bankaHesaplari.sahipAciklamasi")}
      {alan("iban", "yonetim.bankaHesaplari.iban", "yonetim.bankaHesaplari.ibanAciklamasi")}
      <YanPencereAltCubugu>
        <Dugme tur="sade" onClick={vazgec}>
          {metin("ortak.islem.vazgec")}
        </Dugme>
        <GonderDugmesi>{metin("yonetim.bankaHesaplari.kaydet")}</GonderDugmesi>
      </YanPencereAltCubugu>
    </Form>
  );
}

function Pencereler() {
  const metin = useMetin();
  const { pencere, setPencere, silinecek, setSilinecek, islem } = useHesaplar();
  const { kapat, kapatmayiIste, degisince, soru } = useKapatmaSorusu(() => setPencere(null));
  const duzenlenen = pencere?.tur === "duzenle" ? pencere.hesap : undefined;
  return (
    <>
      <YanPencere
        open={pencere !== null}
        onOpenChange={(acik) => (acik ? undefined : kapatmayiIste())}
      >
        {pencere === null ? null : (
          <YanPencereIcerigi
            kapatEtiketi={metin("ortak.parca.kapat")}
            className="tablet:max-w-form"
          >
            <YanPencereUstu>
              <YanPencereBasligi>
                {metin(
                  duzenlenen === undefined
                    ? "yonetim.bankaHesaplari.yeniHesap"
                    : "yonetim.bankaHesaplari.hesabiDuzenle",
                )}
              </YanPencereBasligi>
              <YanPencereAciklamasi>
                {metin("yonetim.bankaHesaplari.formAciklamasi")}
              </YanPencereAciklamasi>
            </YanPencereUstu>
            {soru}
            <HesapFormu
              key={duzenlenen?.kimlik ?? "yeni"}
              {...(duzenlenen === undefined ? {} : { hesap: duzenlenen })}
              kapat={kapat}
              vazgec={kapatmayiIste}
              degisince={degisince}
            />
          </YanPencereIcerigi>
        )}
      </YanPencere>
      <OnayPenceresi
        acik={silinecek !== null}
        acikDegisince={(acik) => (acik ? undefined : setSilinecek(null))}
        baslik={doldur(metin("yonetim.bankaHesaplari.silOnay.baslik"), {
          ad: silinecek?.banka ?? "",
        })}
        aciklama={metin("yonetim.bankaHesaplari.silOnay.metin")}
        onayEtiketi={metin("yonetim.bankaHesaplari.silOnay.sil")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={async () => {
          if (silinecek === null) return;
          await islem(
            "banka-hesabi-sil",
            { kimlik: silinecek.kimlik },
            "yonetim.bankaHesaplari.silindi",
          );
        }}
      />
    </>
  );
}
