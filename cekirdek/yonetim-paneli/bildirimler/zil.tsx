"use client";
// Panelin bildirim zili (kart 0280, karar 0198): masaüstünde üst şeritte, telefon ve tablette üst çubukta. Düğmenin
// adı okunmamış sayısını söyler, sayı rozette de görünür (ekran okuyucudan gizli). Basınca açılır panel (adlı
// dialog) en yeni bildirimleri bildirim ucundan ister; satıra basınca bildirim okundu olur ve ilgili ekran açılır.
// "Hepsini okundu yap" görülebilen bütün okunmamışları okundu yapar. Sayı sayfa değişince sayı ucundan yeniden
// sorulur; anlık itme yoktur. Metinler ve satırların yazısı sunucudan gelir.
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  AcilirPanel,
  AcilirPanelIcerigi,
  AcilirPanelTetikleyici,
} from "../../../bilesenler/parcalar/acilir-panel";
import { bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { useCizimdenSonraOdak } from "../../../bilesenler/parcalar/cizimden-sonra-odak";
import { Dugme, IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { YukleniyorGostergesi } from "../../../bilesenler/parcalar/yukleniyor";
import { panelBildirimSinirlari } from "../../kayitlar/yonetici-bildirimi";
import { doldur } from "../../metinler/doldur";
import { usePanelMetni } from "../../metinler/panel-metni";
import { PanelIkon, panelIkonu } from "../panel-ikon";
import { panelIstegi } from "../panel-istegi";
import type { PanelBildirimi, PanelBildirimListesi } from "./veri";

type OkunduCevabi = { okundu: number; okunmamis: number };

// Okunmamış sayısı çerçevede tek yerde tutulur: masaüstü ve telefon zili aynı sayıyı gösterir, sayfa değişince tek
// istek gider. Sayfa yenilenince (panelin işlemleri, router.refresh) düzenin yeni sayısı alınır; adres (yol ya da
// sorgu) değişince sayı ucu sorulur. Eski cevap yenisini ezmez. etkin değilse (zil yok) istek gitmez.
export type BildirimSayisi = { sayi: number; yaz: (sayi: number) => void };
export const useBildirimSayisi = (ilkSayi: number, etkin: boolean): BildirimSayisi => {
  const yol = usePathname();
  const sorgu = useSearchParams().toString();
  const adres = `${yol}?${sorgu}`;
  const [sayi, setSayi] = useState(ilkSayi);
  const [gorulenIlk, setGorulenIlk] = useState(ilkSayi);
  if (ilkSayi !== gorulenIlk) {
    setGorulenIlk(ilkSayi);
    setSayi(ilkSayi);
  }
  const gorulenAdres = useRef(adres);
  useEffect(() => {
    if (!etkin || adres === gorulenAdres.current) return;
    gorulenAdres.current = adres;
    let gecerli = true;
    void panelIstegi<{ okunmamis: number }>("panel-bildirim-sayisi").then((sonuc) => {
      if (gecerli && sonuc.tamam) setSayi(sonuc.veri.okunmamis);
    });
    return () => {
      gecerli = false;
    };
  }, [adres, etkin]);
  return { sayi, yaz: setSayi };
};

export function BildirimZili({
  okunmamis,
  saklamaGun,
  ayarlarAdresi,
  className,
}: {
  // Çerçevenin tuttuğu okunmamış sayısı (useBildirimSayisi).
  okunmamis: BildirimSayisi;
  saklamaGun: string;
  // Sipariş ayarlarının bildirim bölümü; izni olmayana yoktur.
  ayarlarAdresi: string | null;
  className?: string;
}) {
  const metin = usePanelMetni();
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const { sayi, yaz: setSayi } = okunmamis;
  const [liste, setListe] = useState<PanelBildirimi[] | null>(null);
  const [hata, setHata] = useState(false);
  const baslikKimligi = useId();
  const odakla = useCizimdenSonraOdak();

  // Panel açılınca liste istenir; kapanınca eski liste bir sonraki açılışta gösterilmez.
  useEffect(() => {
    if (!acik) return;
    let gecerli = true;
    setListe(null);
    setHata(false);
    void panelIstegi<PanelBildirimListesi>("panel-bildirimleri").then((sonuc) => {
      if (!gecerli) return;
      if (!sonuc.tamam) {
        setHata(true);
        return;
      }
      setListe(sonuc.veri.bildirimler);
      setSayi(sonuc.veri.okunmamis);
    });
    return () => {
      gecerli = false;
    };
  }, [acik, setSayi]);

  // Satıra basınca okunmamışsa önce okundu yapılır (olmazsa yine gidilir), sonra ekran açılır.
  const ac = async (bildirim: PanelBildirimi) => {
    if (!bildirim.okundu) {
      const sonuc = await panelIstegi<OkunduCevabi>("panel-bildirimi-okundu", {
        kimlik: bildirim.kimlik,
      });
      if (sonuc.tamam) setSayi(sonuc.veri.okunmamis);
    }
    setAcik(false);
    router.push(bildirim.adres);
  };

  const hepsiniOku = async () => {
    const sonuc = await panelIstegi<OkunduCevabi>("panel-bildirimi-okundu", { hepsi: true });
    if (!sonuc.tamam) {
      bildirimGoster("tehlike", metin("yonetim.bildirimler.okunduHatasi"));
      return;
    }
    setSayi(sonuc.veri.okunmamis);
    setListe((onceki) => onceki?.map((b) => ({ ...b, okundu: true })) ?? null);
    // Düğme kalkar: odak panelin başlığına geçer.
    odakla(() => document.getElementById(baslikKimligi));
  };

  // Rozet en çok iki hanedir: daha büyük sayı "99+" yazılır, ad "99'dan fazla" der (okunmamış silinmez, sayı büyüyebilir).
  const enCok = panelBildirimSinirlari.rozetEnCok;
  const etiket =
    sayi === 0
      ? metin("yonetim.bildirimler.zil")
      : doldur(
          metin(
            sayi > enCok
              ? "yonetim.bildirimler.zilCokOkunmamis"
              : "yonetim.bildirimler.zilOkunmamis",
          ),
          { sayi: String(Math.min(sayi, enCok)) },
        );

  return (
    <AcilirPanel open={acik} onOpenChange={setAcik}>
      <span className={sinif("relative inline-flex shrink-0", className)}>
        <AcilirPanelTetikleyici asChild>
          <IkonDugmesi ikon={panelIkonu("bildirim")} etiket={etiket} />
        </AcilirPanelTetikleyici>
        {sayi === 0 ? null : (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0 right-0 inline-flex h-5 min-w-5 items-center justify-center rounded-dugme bg-rozet px-1.5 text-kucuk font-kalin text-rozet-ustu"
          >
            {sayi > enCok
              ? doldur(metin("yonetim.bildirimler.rozetFazla"), { sayi: String(enCok) })
              : sayi}
          </span>
        )}
      </span>
      <AcilirPanelIcerigi
        align="end"
        aria-label={metin("yonetim.bildirimler.panelBasligi")}
        className="w-acilir gap-2 p-0 py-3 tablet:w-telefon"
      >
        <div className="flex items-center justify-between gap-2 border-b border-kenar px-4 pb-2">
          <h2 id={baslikKimligi} tabIndex={-1} className="text-orta font-kalin outline-none">
            {metin("yonetim.bildirimler.panelBasligi")}
          </h2>
          {sayi === 0 || liste === null ? null : (
            <Dugme tur="cerceveli" onClick={() => void hepsiniOku()}>
              {metin("yonetim.bildirimler.hepsiniOku")}
            </Dugme>
          )}
        </div>
        {hata ? (
          <Uyari tur="tehlike" className="mx-4">
            {metin("yonetim.bildirimler.hata")}
          </Uyari>
        ) : liste === null ? (
          <div className="flex justify-center px-4 py-6">
            <YukleniyorGostergesi etiket={metin("yonetim.bildirimler.yukleniyor")} />
          </div>
        ) : liste.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-dugme bg-yuzey text-soluk-yazi">
              <PanelIkon ad="bildirim" className="size-6" />
            </span>
            <p className="text-soluk-yazi">{metin("yonetim.bildirimler.bos")}</p>
          </div>
        ) : (
          <ul className="flex max-h-acilir-liste flex-col overflow-y-auto">
            {liste.map((bildirim) => (
              <li key={bildirim.kimlik}>
                <Link
                  href={bildirim.adres}
                  onClick={(olay) => {
                    // Yeni sekmede açma (Ctrl, orta tuş) tarayıcınındır: okundu yapılmaz.
                    if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.button !== 0) return;
                    olay.preventDefault();
                    void ac(bildirim);
                  }}
                  className="flex min-h-11 items-start gap-3 px-4 py-2 text-yazi no-underline -outline-offset-2 hover:bg-yuzey"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-yuzey text-yazi">
                    <PanelIkon ad={bildirim.ikon} className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    {/* Başlık kesilmez (sipariş numarası okunur), en çok iki satır. Okunmamış bildirim başlığın
                        yanındaki noktayla, ekran okuyucuda yazıyla söylenir (taslak). */}
                    <span className="line-clamp-2 break-words">
                      {bildirim.baslik}
                      {bildirim.okundu ? null : (
                        <>
                          <span
                            aria-hidden="true"
                            className="ml-2 inline-block size-2 rounded-full bg-birincil align-middle"
                          />
                          <span className="sr-only">{metin("yonetim.bildirimler.okunmamis")}</span>
                        </>
                      )}
                    </span>
                    {bildirim.alt === "" ? null : (
                      <span className="truncate text-kucuk text-soluk-yazi">{bildirim.alt}</span>
                    )}
                    {/* Telefonda zaman alt yazının altındadır: başlık dar panelde bölünmesin. */}
                    <time
                      dateTime={bildirim.an}
                      className="text-kucuk text-soluk-yazi tablet:hidden"
                    >
                      {bildirim.zaman}
                    </time>
                  </span>
                  <time
                    dateTime={bildirim.an}
                    className="hidden shrink-0 text-kucuk text-soluk-yazi tablet:block"
                  >
                    {bildirim.zaman}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-kenar px-4 pt-2">
          <span className="text-kucuk text-soluk-yazi">
            {doldur(metin("yonetim.bildirimler.saklama"), { gun: saklamaGun })}
          </span>
          {ayarlarAdresi === null ? null : (
            <Link
              href={ayarlarAdresi}
              onClick={() => setAcik(false)}
              className="inline-flex min-h-11 items-center font-kalin underline underline-offset-2"
            >
              {metin("yonetim.bildirimler.ayarlar")}
            </Link>
          )}
        </div>
      </AcilirPanelIcerigi>
    </AcilirPanel>
  );
}
