"use client";
// Panelin ortak form yapısı (kart 0259, karar 0159; .claude/rules/formlar.md; taslak: "Ortak form"). Panelin bütün
// formları buradan çıkar:
// - Hatalar: alanın hatası alanın altında yazar ve alana bağlıdır (PanelAlani, AlanKabi). Formda alanı olmayan hata
//   (yetki, bağlantı, iş kuralı) formun başındaki özette yazar. Gönderilince tek hata varsa odak o alana, birden çok
//   hata ya da alanı olmayan hata varsa özete gider. Özetin sırası alanların ekrandaki sırasıdır, satırı alana
//   götürür. Alanın yeri ve adı sayfadan okunur (data-alan, data-alan-etiketi): form ayrıca bir alan sırası tutmaz.
// - Kayıt sürerken ikinci gönderim yok sayılır, kaydet çubuğunun düğmeleri kapalıdır.
// - Kaydedilmemiş değişiklikle sayfadan çıkarken sorulur (cikis-korumasi.tsx).
// - Sunucunun verisinden kurulan form ayrıca useSunucuFormu kullanır: kayıttan sonra geç gelen yenileme yazılanı
//   ezmez (kart 0223).
// - Zorunlu alanın etiketinde yıldız, isteğe bağlı alanınkinde "(isteğe bağlı)" yazar.
import {
  createContext,
  type FormEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { type AlanBaglantisi, FormAlani } from "../../../bilesenler/form/form-alani";
import { HataOzeti, type OzetHatasi } from "../../../bilesenler/form/hata-ozeti";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { YanPencereAltCubugu } from "../../../bilesenler/parcalar/yan-pencere";
import { doldur } from "../../metinler/doldur";
import { usePanelMetni } from "../../metinler/panel-metni";
import { useCikisKorumasi } from "./cikis-korumasi";

// Alanın adından hatasının metnine (çevrilmiş).
export type AlanHatalari = Readonly<Record<string, string>>;

// Özetin satırı alanınsa alanın yolu ve adıyla tutulur: alan düzeltilince satırı da düşer.
type OzetSatiri = OzetHatasi & { alan?: { yol: string; ad: string } };
type Ozet = { baslik: string; satirlar: OzetSatiri[] };

const alanOgesi = (form: HTMLElement | null, ad: string): HTMLElement | null =>
  form?.querySelector<HTMLElement>(`[data-alan="${CSS.escape(ad)}"]`) ?? null;

// Hatanın yolundaki en yakın alan: "slaytlar.0.baslik" yoksa "slaytlar.0", sonra "slaytlar" (iç içe alanlar ve
// sunucunun alt yolu, "hedef" ile "hedef.kimlik" gibi). Bulunan alanın adı da döner.
const enYakinAlan = (
  form: HTMLElement | null,
  yol: string,
): { ad: string; oge: HTMLElement } | null => {
  const parcalar = yol.split(".");
  for (let boy = parcalar.length; boy > 0; boy -= 1) {
    const ad = parcalar.slice(0, boy).join(".");
    const oge = alanOgesi(form, ad);
    if (oge !== null) return { ad, oge };
  }
  return null;
};

// Alanın odaklanacak öğesi: alanın hatada odaklanacak öğesi (liste ya da tablo gibi tek girişi olmayan alan, data-hata-odagi), hatalı
// işaretli öğe, seçili radyo, sonra ilk odaklanabilir öğe, sonra kabın kendisi.
const odaklanacak = (kap: HTMLElement): HTMLElement =>
  kap.querySelector<HTMLElement>("[data-hata-odagi]") ??
  kap.querySelector<HTMLElement>('[aria-invalid="true"]') ??
  kap.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]') ??
  kap.querySelector<HTMLElement>(
    'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), button:not([disabled]), [role="radio"], [role="combobox"], [tabindex="0"]',
  ) ??
  kap;

export type PanelFormuDurumu = ReturnType<typeof usePanelFormu>;

export const usePanelFormu = ({
  degisti = false,
  kaydet,
}: {
  // Kaydedilmemiş değişiklik var mı (çıkarken sorulur, kaydet çubuğu söyler).
  degisti?: boolean;
  // Formu gönderir, kayıt olduysa true: çıkarken "Kaydet ve çık" bunu çağırır.
  kaydet?: () => Promise<boolean>;
} = {}) => {
  const metin = usePanelMetni();
  const formRef = useRef<HTMLFormElement>(null);
  const ozetRef = useRef<HTMLDivElement>(null);
  const [hatalar, setHatalar] = useState<AlanHatalari>({});
  const [ozet, setOzet] = useState<Ozet | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const suruyor = useRef(false);
  // Odak çizimden sonra verilir (özet ve alanın hata yazısı çizilmiş olsun).
  const [odakIstegi, setOdakIstegi] = useState<{ hedef: "ozet" | string; sira: number } | null>(
    null,
  );

  useCikisKorumasi({ degisti: () => degisti, ...(kaydet === undefined ? {} : { kaydet }) });

  const alanaGit = useCallback((ad: string) => {
    const kap = alanOgesi(formRef.current, ad);
    if (kap !== null) odaklanacak(kap).focus();
  }, []);

  useEffect(() => {
    if (odakIstegi === null) return;
    if (odakIstegi.hedef === "ozet") ozetRef.current?.focus();
    else alanaGit(odakIstegi.hedef);
  }, [odakIstegi, alanaGit]);

  // Hataları gösterir ve odağı taşır. Formda olmayan alanın hatası alanı olmayan hata sayılır.
  const hatalariGoster = useCallback(
    (alanlar: AlanHatalari, genel: readonly string[] = []) => {
      const form = formRef.current;
      const bulunan: { yol: string; ad: string; oge: HTMLElement; hata: string }[] = [];
      const disarida: string[] = [...genel];
      for (const [yol, hata] of Object.entries(alanlar)) {
        const yer = enYakinAlan(form, yol);
        if (yer === null) disarida.push(hata);
        // Aynı alana düşen ikinci hata yazılmaz (alanın altında tek hata).
        else if (!bulunan.some((oge) => oge.ad === yer.ad)) bulunan.push({ yol, ...yer, hata });
      }
      // Ekrandaki sıra.
      bulunan.sort((a, b) =>
        a.oge.compareDocumentPosition(b.oge) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
      );
      // Hata kendi yoluyla saklanır: alan onu kendi yoluyla okur (iç içe alan alt yolunu, PanelAlani adını).
      setHatalar(Object.fromEntries(bulunan.map(({ yol, hata }) => [yol, hata])));
      const sayi = bulunan.length + disarida.length;
      if (sayi === 0) {
        setOzet(null);
        return;
      }
      if (bulunan.length === 1 && disarida.length === 0) {
        setOzet(null);
        setOdakIstegi((onceki) => ({ hedef: bulunan[0]?.ad ?? "", sira: (onceki?.sira ?? 0) + 1 }));
        return;
      }
      setOzet({
        baslik:
          disarida.length === 0
            ? doldur(metin("yonetim.form.ozet.alanlar"), { sayi: String(sayi) })
            : metin("yonetim.form.ozet.kaydedilemedi"),
        satirlar: [
          ...disarida.map((hata) => ({ metin: hata })),
          ...bulunan.map(({ yol, ad, oge, hata }) => ({
            metin: doldur(metin("yonetim.form.ozet.satir"), {
              etiket: oge.dataset["alanEtiketi"] ?? "",
              hata,
            }),
            git: () => alanaGit(ad),
            alan: { yol, ad },
          })),
        ],
      });
      setOdakIstegi((onceki) => ({ hedef: "ozet", sira: (onceki?.sira ?? 0) + 1 }));
    },
    [metin, alanaGit],
  );

  const temizle = useCallback(() => {
    setHatalar({});
    setOzet(null);
  }, []);

  // Düzeltilen alanın hatası kalkar, özetteki satırı da (öteki alanlar bir sonraki gönderimde denetlenir); satırı
  // kalmayan özet kalkar.
  const alaniTemizle = useCallback((ad: string) => {
    setHatalar((onceki) => {
      if (onceki[ad] === undefined) return onceki;
      const { [ad]: _kalkan, ...kalan } = onceki;
      return kalan;
    });
    setOzet((onceki) => {
      if (onceki === null) return onceki;
      const satirlar = onceki.satirlar.filter(
        (satir) => satir.alan === undefined || (satir.alan.yol !== ad && satir.alan.ad !== ad),
      );
      if (satirlar.length === onceki.satirlar.length) return onceki;
      return satirlar.length === 0 ? null : { ...onceki, satirlar };
    });
  }, []);

  // Gönderim: sürerken ikinci çağrı yok sayılır (undefined döner), düğmeler kapalıdır.
  const isle = useCallback(async <T,>(is: () => Promise<T>): Promise<T | undefined> => {
    if (suruyor.current) return undefined;
    suruyor.current = true;
    setGonderiliyor(true);
    try {
      return await is();
    } finally {
      suruyor.current = false;
      setGonderiliyor(false);
    }
  }, []);

  return {
    formRef,
    ozetRef,
    hatalar,
    hata: (ad: string): string | undefined => hatalar[ad],
    ozet,
    gonderiliyor,
    degisti,
    hatalariGoster,
    temizle,
    alaniTemizle,
    alanaGit,
    isle,
  };
};

const FormBaglami = createContext<PanelFormuDurumu | null>(null);

export const usePanelFormuBaglami = (): PanelFormuDurumu => {
  const durum = useContext(FormBaglami);
  if (durum === null) throw new Error("Alan PanelFormu içinde kullanılır.");
  return durum;
};

// Formun kabı: ortak Form (kod yüklenmeden gönderilmez, POST), başta hata özeti, içinde alanlar.
export function PanelFormu({
  durum,
  gonder,
  className,
  ozetIcerde = false,
  children,
}: {
  durum: PanelFormuDurumu;
  gonder: (olay: FormEvent<HTMLFormElement>) => void | Promise<void>;
  className?: string;
  // Özeti form kendisi yerleştirir (FormunHataOzeti): iki sütunlu formda özet ilk sütunun başındadır.
  ozetIcerde?: boolean;
  children: ReactNode;
}) {
  const metin = usePanelMetni();
  return (
    <FormBaglami.Provider value={durum}>
      <Form
        ref={durum.formRef}
        kodGerekliMetni={metin("ortak.form.kodGerekli")}
        yukleniyorMetni={metin("ortak.form.yukleniyor")}
        onSubmit={(olay) => {
          olay.preventDefault();
          void gonder(olay);
        }}
        className={sinif("flex flex-col gap-5", className)}
      >
        {ozetIcerde ? null : <FormunHataOzeti />}
        {children}
      </Form>
    </FormBaglami.Provider>
  );
}

// Formun hata özeti: PanelFormu başta çizer; ozetIcerde verilmişse form kendisi yerleştirir.
export function FormunHataOzeti() {
  const { ozet, ozetRef } = usePanelFormuBaglami();
  return ozet === null ? null : (
    <HataOzeti ref={ozetRef} baslik={ozet.baslik} hatalar={ozet.satirlar} />
  );
}

// Etiketin eki: zorunlu alanın yıldızı (ekran okuyucu "gerekli" bilgisini alanın kendisinden alır) ya da
// "(isteğe bağlı)".
export function ZorunlulukEki({ zorunlu }: { zorunlu: boolean }) {
  const metin = usePanelMetni();
  return zorunlu ? (
    <span aria-hidden="true" className="text-tehlike-yazi">
      {metin("yonetim.form.zorunluIsareti")}
    </span>
  ) : (
    <span className="text-kucuk text-soluk-yazi">{metin("yonetim.form.istegeBagli")}</span>
  );
}

// Formun alanı: etiket, açıklama ve hata ortak sarmalayıcıdan; hata formun durumundan adıyla gelir.
export function PanelAlani({
  ad,
  etiket,
  aciklama,
  zorunlu,
  children,
}: {
  ad: string;
  etiket: string;
  aciklama?: string | undefined;
  // Verilmezse ek yazılmaz (yalnız okunan ya da seçimi zorunlu olmayan alan).
  zorunlu?: boolean;
  children: (alan: AlanBaglantisi & { "aria-required"?: true }) => ReactNode;
}) {
  const { hata } = usePanelFormuBaglami();
  const metni = hata(ad);
  return (
    <FormAlani
      ad={ad}
      etiket={etiket}
      {...(aciklama === undefined ? {} : { aciklama })}
      {...(metni === undefined ? {} : { hata: metni })}
      {...(zorunlu === undefined ? {} : { etiketEki: <ZorunlulukEki zorunlu={zorunlu} /> })}
    >
      {(baglanti) => children(zorunlu === true ? { ...baglanti, "aria-required": true } : baglanti)}
    </FormAlani>
  );
}

// FormAlani'yla yazılamayan alanın (radyo grubu, kayıt arama, tablo) yeri: özet ve odak bunu bulur. Hatayı alanın
// kendi parçası gösterir (hata(ad) ile).
export function AlanKabi({
  ad,
  etiket,
  className,
  children,
}: {
  ad: string;
  etiket: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-alan={ad} data-alan-etiketi={etiket} className={className}>
      {children}
    </div>
  );
}

// Formun kaydet çubuğu: uzun formda altta sabit durur (pencerede pencerenin, sayfada sayfanın altında). Sayfadaki
// ayar formunda durum yazısı ("Kaydedilmemiş değişiklik var") ve değişiklik yokken kapalı düğmeler (taslak).
// Kayıt sürerken iki düğme de kapalıdır.
export function KaydetCubugu({
  kaydetEtiketi,
  vazgec,
  vazgecEtiketi,
  sayfada = false,
  durumYazisi = false,
  degisiklikGerekli = false,
  vazgecKapali = false,
}: {
  kaydetEtiketi: string;
  vazgec?: () => void;
  vazgecEtiketi?: string;
  // Pencerede değil sayfada: çubuk kenara uzanmaz, sayfanın altına yapışır.
  sayfada?: boolean;
  durumYazisi?: boolean;
  // Değişiklik yokken Kaydet ve Vazgeç kapalı (ayar formu).
  degisiklikGerekli?: boolean;
  // Vazgeç'in ayrıca kapalı olduğu durum (ödeme yöntemleri: sıralama isteği sürerken).
  vazgecKapali?: boolean;
}) {
  const metin = usePanelMetni();
  const { gonderiliyor, degisti } = usePanelFormuBaglami();
  const kapali = gonderiliyor || (degisiklikGerekli && !degisti);
  return (
    <YanPencereAltCubugu className={sinif("items-center", sayfada && "bottom-0 mx-0 px-0")}>
      {durumYazisi ? (
        // Taslak: değişiklik varken yazı kalın ve önünde ana renkte nokta; yokken soluk.
        <span
          role="status"
          className={sinif(
            "mr-auto inline-flex basis-full items-center gap-2 text-kucuk tablet:basis-auto",
            degisti ? "font-en-kalin text-yazi" : "text-soluk-yazi",
          )}
        >
          {degisti ? (
            <span aria-hidden="true" className="size-2 rounded-dugme bg-birincil" />
          ) : null}
          {degisti ? metin("yonetim.form.degisiklikVar") : metin("yonetim.form.degisiklikYok")}
        </span>
      ) : null}
      {vazgec === undefined ? null : (
        <Dugme tur="sade" disabled={kapali || vazgecKapali} onClick={vazgec}>
          {vazgecEtiketi ?? metin("ortak.islem.vazgec")}
        </Dugme>
      )}
      <GonderDugmesi disabled={kapali}>{kaydetEtiketi}</GonderDugmesi>
    </YanPencereAltCubugu>
  );
}
