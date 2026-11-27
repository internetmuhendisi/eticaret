"use client";
// Panelin araması (kart 0321, karar 0191): masaüstünde her sayfanın üstündeki şeritte, telefon ve tablette üst
// çubuktaki büyüteçle tam genişlikte açılır; Ctrl K (Mac'te Cmd K) kutuya götürür. Yazdıkça yöneticinin izni olan
// türler kendi uçlarından aranır, sonuçlar türlerine göre gruplu gelir (sipariş, ürün, müşteri). İzni olmayan türün
// isteği hiç gitmez, grubu yoktur. WAI-ARIA'nın liste önerili açılır kutusudur: ok tuşları sonuçlarda gezer, Enter
// sonucu açar, Escape listeyi kapatır; sonuç sayısı canlı bölgede duyurulur. Eski isteğin cevabı yenisini ezmez.
import { useRouter } from "next/navigation";
import { type Ref, useEffect, useId, useRef, useState } from "react";
import type { PanelIkonAdi } from "../../../bilesenler/ikonlar/panel-sozlugu";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import {
  type PanelAramaTuru,
  panelAramaSinirlari,
  panelAramaTurKodlari,
  panelAramaTurleri,
} from "../../kayitlar/panel-arama";
import { doldur } from "../../metinler/doldur";
import { usePanelMetni } from "../../metinler/panel-metni";
import { urunlerAdresi } from "../adresler";
import { PanelIkon } from "../panel-ikon";
import { panelIstegi } from "../panel-istegi";
import type { PanelAramaSatiri, PanelAramaSonucu } from "./veri";

const turIkonlari: Record<PanelAramaTuru, PanelIkonAdi> = {
  siparis: "paket",
  urun: "urunler",
  musteri: "hesap",
};

type Grup = { tur: PanelAramaTuru; sonuc: PanelAramaSonucu | null; hata?: string };
type Secenek = { adres: string; satir?: PanelAramaSatiri; tur: PanelAramaTuru; tumu?: true };

// Kutunun kısayolu: Ctrl K, Mac'te Cmd K.
export const aramaKisayoluMu = (
  olay: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">,
) => (olay.ctrlKey || olay.metaKey) && !olay.altKey && olay.key.toLowerCase() === "k";

// Gruplardan klavyeyle gezilen seçenekler: her grubun satırları, ürünlerde daha fazlası varsa "Bütün ürünlerde ara".
const secenekleriKur = (gruplar: readonly Grup[], aranan: string): Secenek[] =>
  gruplar.flatMap(({ tur, sonuc }) => [
    ...(sonuc?.satirlar ?? []).map((satir) => ({ adres: satir.adres, satir, tur })),
    ...(tur === "urun" && sonuc?.dahaFazla === true
      ? [
          {
            adres: `${urunlerAdresi}?${new URLSearchParams({ ara: aranan })}`,
            tur,
            tumu: true as const,
          },
        ]
      : []),
  ]);

export function PanelAramaKutusu({
  turler,
  kutuRef,
  otomatikOdak = false,
  sonra,
}: {
  // Yöneticinin izni olan türler, kayıttaki sırayla (sunucu süzer).
  turler: readonly PanelAramaTuru[];
  kutuRef?: Ref<HTMLInputElement>;
  otomatikOdak?: boolean;
  // Bir sonuç açılınca (false) ya da liste kapalıyken Escape'le (true, odak geri döner): telefonun arama kipi kapanır.
  sonra?: (geriDon: boolean) => void;
}) {
  const metin = usePanelMetni();
  const router = useRouter();
  const kimlik = useId();
  const [yazi, setYazi] = useState("");
  const [acik, setAcik] = useState(false);
  const [gruplar, setGruplar] = useState<Grup[]>([]);
  const [durum, setDurum] = useState<"bos" | "kisa" | "yukleniyor" | "hazir">("bos");
  const [etkin, setEtkin] = useState(-1);
  const istekSirasi = useRef(0);
  const aranan = yazi.trim();
  const sirali = panelAramaTurKodlari.filter((tur) => turler.includes(tur));

  const ara = async (metni: string) => {
    istekSirasi.current += 1;
    const bu = istekSirasi.current;
    if (metni.length < panelAramaSinirlari.enAz) {
      setGruplar([]);
      setDurum(metni === "" ? "bos" : "kisa");
      return;
    }
    setDurum("yukleniyor");
    const sonuclar = await Promise.all(
      sirali.map(async (tur): Promise<Grup> => {
        const sonuc = await panelIstegi<PanelAramaSonucu>(
          `${panelAramaTurleri[tur].uc}?${new URLSearchParams({ ara: metni })}`,
        );
        if (sonuc.tamam) return { tur, sonuc: sonuc.veri };
        return {
          tur,
          sonuc: null,
          hata:
            sonuc.kod === "istek-siniri"
              ? metin("yonetim.arama.sinir")
              : metin("yonetim.arama.hata"),
        };
      }),
    );
    if (bu !== istekSirasi.current) return;
    setGruplar(sonuclar);
    setEtkin(-1);
    setDurum("hazir");
  };

  // Yazma durunca aranır.
  // biome-ignore lint/correctness/useExhaustiveDependencies: ara her çizimde yenidir, yalnız aranan metin tetikler.
  useEffect(() => {
    const zamanlayici = setTimeout(() => void ara(aranan), panelAramaSinirlari.bekleme);
    return () => clearTimeout(zamanlayici);
  }, [aranan]);

  const secenekler = durum === "hazir" ? secenekleriKur(gruplar, aranan) : [];
  const listeKimligi = `${kimlik}-liste`;
  const ipucuKimligi = `${kimlik}-ipucu`;
  const secenekKimligi = (sira: number) => `${kimlik}-secenek-${sira}`;
  const hatalar = gruplar.filter((grup) => grup.hata !== undefined);
  const panelAcik = acik && durum !== "bos";
  const listeAcik = panelAcik && secenekler.length > 0;

  const ac = (secenek: Secenek | undefined) => {
    if (secenek === undefined) return;
    setAcik(false);
    setYazi("");
    sonra?.(false);
    router.push(secenek.adres);
  };

  const sonucSayisi = secenekler.filter((secenek) => secenek.tumu !== true).length;
  const durumMetni =
    durum === "kisa"
      ? doldur(metin("yonetim.arama.kisa"), { sayi: String(panelAramaSinirlari.enAz) })
      : durum === "yukleniyor"
        ? metin("yonetim.arama.yukleniyor")
        : durum === "hazir" && sonucSayisi === 0 && hatalar.length === 0
          ? doldur(metin("yonetim.arama.sonucYok"), { aranan })
          : durum === "hazir"
            ? [
                sonucSayisi === 0
                  ? ""
                  : doldur(metin("yonetim.arama.sonucSayisi"), { sayi: String(sonucSayisi) }),
                ...hatalar.map((grup) => grup.hata ?? ""),
              ]
                .filter((parca) => parca !== "")
                .join(" ")
            : "";

  let sira = -1;
  return (
    <div className="relative w-full">
      <GirisAlani
        {...(kutuRef === undefined ? {} : { ref: kutuRef })}
        type="search"
        role="combobox"
        aria-label={metin("yonetim.arama.etiket")}
        aria-autocomplete="list"
        aria-expanded={listeAcik}
        aria-controls={listeKimligi}
        aria-describedby={ipucuKimligi}
        {...(listeAcik && etkin >= 0 ? { "aria-activedescendant": secenekKimligi(etkin) } : {})}
        // Telefonda büyüteçle açılan kutu hemen yazılır.
        autoFocus={otomatikOdak}
        autoComplete="off"
        enterKeyHint="search"
        placeholder={metin("yonetim.arama.yerTutucu")}
        // Sağda büyüteç ve boşken kısayolun işareti (taslak); ikisi de süstür, adı ve açıklaması alandadır.
        className="pr-20"
        value={yazi}
        onChange={(olay) => {
          setYazi(olay.target.value);
          setAcik(true);
          setEtkin(-1);
        }}
        onFocus={() => setAcik(true)}
        onBlur={() => setAcik(false)}
        onKeyDown={(olay) => {
          if (olay.key === "ArrowDown") {
            olay.preventDefault();
            setAcik(true);
            setEtkin((onceki) => Math.min(onceki + 1, secenekler.length - 1));
          } else if (olay.key === "ArrowUp") {
            olay.preventDefault();
            setEtkin((onceki) => Math.max(onceki - 1, 0));
          } else if (olay.key === "Enter") {
            olay.preventDefault();
            // Seçim yoksa Enter ilk sonucu açar.
            if (listeAcik) ac(secenekler[Math.max(etkin, 0)]);
          } else if (olay.key === "Escape") {
            if (panelAcik) {
              olay.preventDefault();
              setAcik(false);
              setEtkin(-1);
            } else {
              sonra?.(true);
            }
          }
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-2 text-soluk-yazi"
      >
        {yazi === "" ? (
          <kbd className="rounded-kucuk border border-kenar px-1.5 font-govde text-kucuk">
            {metin("yonetim.arama.kisayol")}
          </kbd>
        ) : null}
        <PanelIkon ad="arama" />
      </span>
      <span id={ipucuKimligi} className="sr-only">
        {metin("yonetim.arama.aciklama")}
      </span>
      <span role="status" className="sr-only">
        {acik ? durumMetni : ""}
      </span>
      <div
        hidden={!panelAcik}
        className="absolute inset-x-0 top-full z-ust-kisim mt-1 flex flex-col rounded-orta border border-kenar bg-zemin py-2 shadow-acilir"
      >
        <div id={listeKimligi} role="listbox" aria-label={metin("yonetim.arama.sonuclar")}>
          {gruplar.map(({ tur }) => {
            const grupSecenekleri = secenekler.filter((secenek) => secenek.tur === tur);
            if (grupSecenekleri.length === 0) return null;
            const baslikKimligi = `${kimlik}-grup-${tur}`;
            return (
              // Seçenek listesinin içindeki grup ARIA'nın listbox grubudur; fieldset form içindir.
              // biome-ignore lint/a11y/useSemanticElements: listbox içinde grup rolü gerekir.
              <div key={tur} role="group" aria-labelledby={baslikKimligi}>
                <div
                  id={baslikKimligi}
                  role="presentation"
                  className="px-4 pt-2 pb-1 text-kucuk font-kalin text-soluk-yazi"
                >
                  {metin(`yonetim.arama.grup.${tur}`)}
                </div>
                {grupSecenekleri.map((secenek) => {
                  sira += 1;
                  const buSira = sira;
                  return (
                    // Seçenek fareyle de açılır; klavye odağı yazı alanında kalır (aria-activedescendant).
                    // biome-ignore lint/a11y/useKeyWithClickEvents: klavyeyle yazı alanından açılır.
                    <div
                      key={secenek.adres}
                      id={secenekKimligi(buSira)}
                      role="option"
                      tabIndex={-1}
                      aria-selected={buSira === etkin}
                      className={sinif(
                        "flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2 hover:bg-yuzey",
                        // Klavyeyle gelinen sonuç yazının renginde zemindir: odak yazı alanındadır.
                        buSira === etkin && "bg-yazi text-zemin hover:bg-yazi",
                      )}
                      onMouseDown={(olay) => olay.preventDefault()}
                      onClick={() => ac(secenek)}
                    >
                      {secenek.satir === undefined ? (
                        <span className="font-kalin">{metin("yonetim.arama.butunUrunler")}</span>
                      ) : (
                        <>
                          <span
                            aria-hidden="true"
                            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-yuzey text-yazi"
                          >
                            <PanelIkon ad={turIkonlari[tur]} />
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate">{secenek.satir.baslik}</span>
                            <span className="truncate text-kucuk opacity-80">
                              {secenek.satir.alt}
                            </span>
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        {/* Aynı metin canlı bölgede duyurulur: görünen kopya ekran okuyucuya iki kez okunmaz. */}
        {durum === "hazir" && sonucSayisi === 0 && hatalar.length === 0 ? (
          <div aria-hidden="true" className="flex flex-col gap-1 px-4 py-2 text-kucuk">
            <span>{durumMetni}</span>
            <span className="text-soluk-yazi">{metin("yonetim.arama.aranabilenler")}</span>
            <ul className="list-disc pl-5 text-soluk-yazi">
              {sirali.map((tur) => (
                <li key={tur}>{metin(`yonetim.arama.aranan.${tur}`)}</li>
              ))}
            </ul>
          </div>
        ) : durumMetni !== "" && (durum !== "hazir" || hatalar.length > 0) ? (
          <span aria-hidden="true" className="px-4 py-2 text-kucuk text-soluk-yazi">
            {durum === "hazir" ? hatalar.map((grup) => grup.hata).join(" ") : durumMetni}
          </span>
        ) : null}
        {listeAcik ? (
          <span
            aria-hidden="true"
            className="border-t border-kenar px-4 pt-2 text-kucuk text-soluk-yazi"
          >
            {metin("yonetim.arama.klavye")}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// Çerçevenin araması: masaüstünde üst şerit, telefon ve tablette büyüteçle açılan tam genişlikte kutu. Ctrl K
// görünen kutuya gider; telefonda kutuyu açar. İzni olan tür yoksa hiçbir şey çizilmez.
export function usePanelAramasi(turler: readonly PanelAramaTuru[]) {
  const seritKutusu = useRef<HTMLInputElement>(null);
  const [telefondaAcik, setTelefondaAcik] = useState(false);
  useEffect(() => {
    if (turler.length === 0) return;
    const dinle = (olay: KeyboardEvent) => {
      if (!aramaKisayoluMu(olay)) return;
      olay.preventDefault();
      const kutu = seritKutusu.current;
      // Şerit yalnız masaüstünde görünür (offsetParent gizli öğede null'dır).
      if (kutu !== null && kutu.offsetParent !== null) kutu.focus();
      else setTelefondaAcik(true);
    };
    document.addEventListener("keydown", dinle);
    return () => document.removeEventListener("keydown", dinle);
  }, [turler.length]);
  return { seritKutusu, telefondaAcik, setTelefondaAcik };
}

export function TelefonAramaKapat({ kapat }: { kapat: () => void }) {
  const metin = usePanelMetni();
  return (
    <Dugme tur="cerceveli" onClick={kapat}>
      {metin("yonetim.arama.kapat")}
    </Dugme>
  );
}
