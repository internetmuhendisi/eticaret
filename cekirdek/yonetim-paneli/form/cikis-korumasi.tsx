"use client";
// Kaydedilmemiş değişiklikle sayfadan çıkarken sormak (kart 0259, .claude/rules/formlar.md; taslak: "Ortak form",
// çıkarken soru). Panelin çerçevesi korumayı bir kez kurar; her form değişip değişmediğini ve (varsa) kaydetme işini
// kaydeder (usePanelFormu).
// - Paneldeki bir bağlantıyla başka bir sayfaya gidilirken (menü dahil) değişmiş form varsa gezinme durur, pencere
//   sorar: "Sayfada kal", "Kaydetmeden çık", "Kaydet ve çık" (yalnız her değişmiş formun kaydetme işi varsa). Kayıt
//   olmazsa sayfada kalınır, hata formda görünür. Pencere kapanınca odak basılan bağlantıya döner.
// - Sayfa yenilenir ya da kapatılırsa tarayıcının kendi sorusu çıkar (beforeunload).
// - Tarayıcının geri tuşu uygulamanın içinde durdurulamaz (karar 0159): orada soru çıkmaz.
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import {
  Pencere,
  PencereAciklamasi,
  PencereAlti,
  PencereBasligi,
  PencereIcerigi,
  PencereUstu,
} from "../../../bilesenler/parcalar/pencere";
import { usePanelMetni } from "../../metinler/panel-metni";

type KorunanForm = {
  degisti: () => boolean;
  // Formu gönderir; kayıt olduysa true.
  kaydet?: () => Promise<boolean>;
  // Kayıt olmadıysa odağı formun hatasına yeniden verir (pencere kapandıktan sonra).
  hatayaOdaklan?: () => void;
};

type Koruma = {
  kaydol: (kimlik: string, form: KorunanForm) => () => void;
  // Sayfada kaydedilmemiş değişikliği olan form var mı (kart 0320: kopyalama penceresi söyler).
  degisenVar: () => boolean;
};

const KorumaBaglami = createContext<Koruma | null>(null);

export function CikisKorumasi({ children }: { children: ReactNode }) {
  const metin = usePanelMetni();
  const router = useRouter();
  const formlar = useRef(new Map<string, KorunanForm>());
  const [bekleyen, setBekleyen] = useState<{ adres: string } | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  // Basılan bağlantı: pencere kapanınca odak ona döner (pencere kapanırken bekleyen silinmiş olur).
  const basilanBag = useRef<HTMLElement | null>(null);
  // "Kaydet ve çık"ta kaydedemeyen ilk form: pencere kapanınca odak onun hatasına gider, bağlantıya değil.
  const hatali = useRef<KorunanForm | null>(null);

  const degisenler = () => [...formlar.current.values()].filter((form) => form.degisti());

  useEffect(() => {
    const tiklaninca = (olay: MouseEvent) => {
      if (olay.defaultPrevented || olay.button !== 0) return;
      if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey) return;
      const bag = (olay.target as Element | null)?.closest?.("a[href]");
      if (!(bag instanceof HTMLAnchorElement) || bag.target === "_blank" || bag.download !== "")
        return;
      const hedef = new URL(bag.href, window.location.href);
      if (hedef.origin !== window.location.origin) return;
      // Aynı sayfada kalan bağlantı (sayfa içi, liste süzgeci) formu götürmez.
      if (hedef.pathname === window.location.pathname) return;
      if (degisenler().length === 0) return;
      olay.preventDefault();
      olay.stopPropagation();
      basilanBag.current = bag;
      setBekleyen({ adres: `${hedef.pathname}${hedef.search}${hedef.hash}` });
    };
    const ayrilirken = (olay: BeforeUnloadEvent) => {
      if (degisenler().length > 0) olay.preventDefault();
    };
    // Yakalama evresi: Next'in bağlantısı kendi gezinmesini başlatmadan önce.
    document.addEventListener("click", tiklaninca, true);
    window.addEventListener("beforeunload", ayrilirken);
    return () => {
      document.removeEventListener("click", tiklaninca, true);
      window.removeEventListener("beforeunload", ayrilirken);
    };
  });

  const kaydol = useCallback((kimlik: string, form: KorunanForm) => {
    formlar.current.set(kimlik, form);
    return () => {
      formlar.current.delete(kimlik);
    };
  }, []);
  const deger = useMemo(
    () => ({
      kaydol,
      degisenVar: () => [...formlar.current.values()].some((form) => form.degisti()),
    }),
    [kaydol],
  );

  const git = (adres: string) => {
    // Gidilen sayfada eski formların kaydı kalmaz (çizimden çıkınca silinir); gezinme beklemeden başlar.
    formlar.current.clear();
    setBekleyen(null);
    router.push(adres);
  };

  const kaydedilebilir =
    bekleyen !== null && degisenler().every((form) => form.kaydet !== undefined);

  const kaydetVeCik = async () => {
    if (bekleyen === null || kaydediliyor) return;
    setKaydediliyor(true);
    let hepsi = true;
    for (const form of degisenler()) {
      if (!(await form.kaydet?.())) {
        hepsi = false;
        hatali.current ??= form;
      }
    }
    setKaydediliyor(false);
    if (hepsi) git(bekleyen.adres);
    else setBekleyen(null);
  };

  return (
    <KorumaBaglami.Provider value={deger}>
      {children}
      <Pencere
        open={bekleyen !== null}
        onOpenChange={(acik) => {
          if (!acik && !kaydediliyor) setBekleyen(null);
        }}
      >
        <PencereIcerigi
          role="alertdialog"
          kapatEtiketi={metin("ortak.parca.kapat")}
          onCloseAutoFocus={(olay) => {
            // Odak basılan bağlantıya döner (pencere tetikleyicisiz açıldı); gidildiyse bağlantı sayfada değildir.
            const bag = basilanBag.current;
            basilanBag.current = null;
            const form = hatali.current;
            hatali.current = null;
            if (form?.hatayaOdaklan !== undefined) {
              olay.preventDefault();
              form.hatayaOdaklan();
              return;
            }
            if (bag?.isConnected === true) {
              olay.preventDefault();
              bag.focus();
            }
          }}
        >
          <PencereUstu>
            <PencereBasligi>{metin("yonetim.form.cikis.baslik")}</PencereBasligi>
            <PencereAciklamasi>{metin("yonetim.form.cikis.aciklama")}</PencereAciklamasi>
          </PencereUstu>
          <PencereAlti>
            <Dugme tur="sade" autoFocus disabled={kaydediliyor} onClick={() => setBekleyen(null)}>
              {metin("yonetim.form.cikis.kal")}
            </Dugme>
            <Dugme
              tur="sade"
              disabled={kaydediliyor}
              onClick={() => {
                if (bekleyen !== null) git(bekleyen.adres);
              }}
            >
              {metin("yonetim.form.cikis.kaydetmeden")}
            </Dugme>
            {kaydedilebilir ? (
              <Dugme tur="birincil" disabled={kaydediliyor} onClick={() => void kaydetVeCik()}>
                {metin("yonetim.form.cikis.kaydet")}
              </Dugme>
            ) : null}
          </PencereAlti>
        </PencereIcerigi>
      </Pencere>
    </KorumaBaglami.Provider>
  );
}

// Formu korumaya kaydeder. Koruma yoksa (katalog, çerçevesiz sayfa) yalnız tarayıcının sorusu kalır.
export const useCikisKorumasi = (form: KorunanForm) => {
  const koruma = useContext(KorumaBaglami);
  const kimlik = useId();
  const son = useRef(form);
  son.current = form;
  useEffect(() => {
    const kayitli: KorunanForm = {
      degisti: () => son.current.degisti(),
      hatayaOdaklan: () => son.current.hatayaOdaklan?.(),
      ...(son.current.kaydet === undefined
        ? {}
        : { kaydet: () => son.current.kaydet?.() ?? Promise.resolve(false) }),
    };
    if (koruma !== null) return koruma.kaydol(kimlik, kayitli);
    const ayrilirken = (olay: BeforeUnloadEvent) => {
      if (son.current.degisti()) olay.preventDefault();
    };
    window.addEventListener("beforeunload", ayrilirken);
    return () => window.removeEventListener("beforeunload", ayrilirken);
  }, [koruma, kimlik]);
};

// Sayfada kaydedilmemiş değişiklik var mı: çağrıldığı anda sorar. Koruma yoksa yoktur.
export const useDegisenFormVar = (): (() => boolean) => {
  const koruma = useContext(KorumaBaglami);
  return () => koruma?.degisenVar() ?? false;
};
