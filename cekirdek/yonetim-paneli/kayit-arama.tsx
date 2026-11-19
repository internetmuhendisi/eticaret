"use client";
// Kaydı arayarak seçmek (kart 0143, karar 0116): kategori, marka ya da ürün yazdıkça panelin arama ucundan
// (GET /kapi/yonetici/kayit-ara) gelir. WAI-ARIA'nın liste önerili açılır kutusudur (combobox): yazı alanı, öneriler
// listesi (listbox), aşağı ve yukarı ok önerilerde gezer, Enter seçer, Escape listeyi kapatır (pencereyi değil),
// sonuç sayısı ekran okuyucuya duyurulur. Daha çok sonuç varsa "Daha fazla göster" sonraki sayfayı ekler.
// Öneriler alanın altında, sayfanın akışındadır (sayfa başına 20). Seçilince alanda kaydın adı yazar. İstek yazma durunca gider (bekleme), eski isteğin cevabı yenisini ezmez.
// Elle sipariş (kart 0236) aynı kutuyu kendi aramasıyla kullanır (ara): öneri açıklama satırı taşıyabilir, seçilemeyen
// öneri (satılamayan birim) aria-disabled'dır ve seçilmez; seçince kutu boşalabilir (eklemeli liste).
import { useEffect, useId, useRef, useState } from "react";
import { FormAlani } from "../../bilesenler/form/form-alani";
import { GirisAlani } from "../../bilesenler/parcalar/giris-alani";
import { sinif } from "../../bilesenler/parcalar/sinif";
import { useMetin } from "../metinler/istemci-metni";
import { doldur } from "../moduller/eposta/sablon";
import type { AranabilirKayit, BulunanKayit, KayitAramaSonucu } from "../moduller/urun/kayit-arama";
import { type PanelSonucu, panelIstegi } from "./panel-istegi";

// Yazma durduktan sonra isteğin gitmesi için beklenen süre.
const beklemeSuresi = 250;

// Liste açıkken Escape'i alan kutu: çevreleyen pencere bu işaretle Escape'i yok sayar.
export const kayitAramaAcikMi = (oge: Element | null): boolean =>
  oge?.getAttribute("role") === "combobox" && oge.getAttribute("aria-expanded") === "true";

export type AramaOnerisi = BulunanKayit & { aciklama?: string; secilemez?: boolean };

export function KayitArama<Kayit extends AramaOnerisi = AramaOnerisi>({
  tur,
  ara: kendiAramasi,
  etiket,
  aciklama,
  secili,
  sec,
  secinceBosalt = false,
  hata,
}: {
  // Kayıt arama ucunun türü; kendi araması verilirse kullanılmaz.
  tur?: AranabilirKayit;
  ara?: (
    aranan: string,
    sayfa: number,
  ) => Promise<PanelSonucu<{ kayitlar: Kayit[]; dahaVar: boolean }>>;
  etiket: string;
  // Alanın açıklaması (seçim yokken); verilmezse kayıt aramanın açıklaması.
  aciklama?: string;
  // Seçili kayıt (kimliği ve adı); yoksa undefined.
  secili: Kayit | undefined;
  // Seçim; yazı seçili kaydın adından başka olunca seçim bırakılır (undefined).
  sec: (kayit: Kayit | undefined) => void;
  // Seçince kutu boşalır (listeye ekleme): seçim alanda kalmaz.
  secinceBosalt?: boolean;
  hata?: string;
}) {
  const metin = useMetin();
  const kimlik = useId();
  const [yazi, setYazi] = useState(secili?.ad ?? "");
  const [acik, setAcik] = useState(false);
  const [kayitlar, setKayitlar] = useState<Kayit[]>([]);
  const [dahaVar, setDahaVar] = useState(false);
  const [sayfa, setSayfa] = useState(0);
  const [durum, setDurum] = useState<"bos" | "yukleniyor" | "hazir" | "hata" | "yetki">("bos");
  const [etkin, setEtkin] = useState(-1);
  const istekSirasi = useRef(0);

  // Tür değişince (başka hedef türü seçildi) arama baştan başlar.
  // biome-ignore lint/correctness/useExhaustiveDependencies: yalnız tür değişince sıfırlanır.
  useEffect(() => {
    setYazi(secili?.ad ?? "");
    setKayitlar([]);
    setDurum("bos");
  }, [tur]);

  const ara = async (aranan: string, istenenSayfa: number) => {
    istekSirasi.current += 1;
    const bu = istekSirasi.current;
    setDurum("yukleniyor");
    const sonuc =
      kendiAramasi === undefined
        ? await panelIstegi<KayitAramaSonucu & { kayitlar: Kayit[] }>(
            `kayit-ara?${new URLSearchParams({ tur: tur ?? "urun", ara: aranan, sayfa: String(istenenSayfa) })}`,
          )
        : await kendiAramasi(aranan, istenenSayfa);
    if (bu !== istekSirasi.current) return;
    if (!sonuc.tamam) {
      setDurum(sonuc.kod === "yetki" ? "yetki" : "hata");
      return;
    }
    setKayitlar((onceki) =>
      istenenSayfa === 0 ? sonuc.veri.kayitlar : [...onceki, ...sonuc.veri.kayitlar],
    );
    setDahaVar(sonuc.veri.dahaVar);
    setSayfa(istenenSayfa);
    setDurum("hazir");
  };

  // Yazı ya da açılış değişince aranır.
  // biome-ignore lint/correctness/useExhaustiveDependencies: ara her çizimde yenidir, yalnız bu ikisi tetikler.
  useEffect(() => {
    if (!acik) return;
    const zamanlayici = setTimeout(() => void ara(yazi, 0), beklemeSuresi);
    return () => clearTimeout(zamanlayici);
  }, [yazi, acik]);

  const listeKimligi = `${kimlik}-liste`;
  const durumKimligi = `${kimlik}-durum`;
  const secenekKimligi = (sira: number) => `${kimlik}-secenek-${sira}`;
  // Seçenekler: kayıtlar, sonra varsa "Daha fazla göster". Kutu yalnız liste görünürken "açık"tır.
  const secenekSayisi = kayitlar.length + (dahaVar ? 1 : 0);
  const listeAcik = acik && secenekSayisi > 0;

  const secimYap = (sira: number) => {
    if (sira === kayitlar.length && dahaVar) {
      void ara(yazi, sayfa + 1);
      return;
    }
    const kayit = kayitlar[sira];
    if (kayit === undefined || kayit.secilemez === true) return;
    sec(kayit);
    setYazi(secinceBosalt ? "" : kayit.ad);
    setAcik(false);
    setEtkin(-1);
  };

  const durumMetni =
    durum === "yukleniyor"
      ? metin("yonetim.kayitArama.yukleniyor")
      : durum === "hata"
        ? metin("yonetim.kayitArama.hata")
        : durum === "yetki"
          ? metin("yonetim.kayitArama.yetki")
          : durum === "hazir" && kayitlar.length === 0
            ? metin("yonetim.kayitArama.sonucYok")
            : durum === "hazir"
              ? doldur(metin("yonetim.kayitArama.sonucSayisi"), {
                  sayi: String(kayitlar.length) + (dahaVar ? "+" : ""),
                })
              : "";

  return (
    <FormAlani
      etiket={etiket}
      aciklama={
        secili === undefined
          ? (aciklama ?? metin("yonetim.kayitArama.aciklama"))
          : doldur(metin("yonetim.kayitArama.secili"), { ad: secili.ad })
      }
      {...(hata === undefined ? {} : { hata })}
    >
      {(alan) => (
        <div className="flex flex-col gap-1">
          <GirisAlani
            {...alan}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={listeAcik}
            aria-controls={listeKimligi}
            {...(listeAcik && etkin >= 0 ? { "aria-activedescendant": secenekKimligi(etkin) } : {})}
            autoComplete="off"
            value={yazi}
            onChange={(olay) => {
              setYazi(olay.target.value);
              setAcik(true);
              setEtkin(-1);
              // Yazı seçili kaydın adından ayrılınca seçim bırakılır: form başka kaydı göndermesin.
              if (secili !== undefined && olay.target.value !== secili.ad) sec(undefined);
            }}
            onFocus={() => setAcik(true)}
            onBlur={() => setAcik(false)}
            onKeyDown={(olay) => {
              if (olay.key === "ArrowDown") {
                olay.preventDefault();
                setAcik(true);
                setEtkin((onceki) => Math.min(onceki + 1, secenekSayisi - 1));
              } else if (olay.key === "ArrowUp") {
                olay.preventDefault();
                setEtkin((onceki) => Math.max(onceki - 1, 0));
              } else if (olay.key === "Enter") {
                // Form gönderilmez: Enter öneriyi seçer.
                if (acik && etkin >= 0) {
                  olay.preventDefault();
                  secimYap(etkin);
                }
              } else if (olay.key === "Escape" && listeAcik) {
                setAcik(false);
                setEtkin(-1);
              }
            }}
          />
          <span id={durumKimligi} role="status" className="sr-only">
            {acik ? durumMetni : ""}
          </span>
          <div
            id={listeKimligi}
            role="listbox"
            aria-label={etiket}
            hidden={!listeAcik}
            className="flex flex-col rounded-orta border border-kenar bg-zemin p-1"
          >
            {kayitlar.map((kayit, sira) => (
              // Seçenek fareyle de seçilir; klavye odağı yazı alanında kalır (aria-activedescendant).
              // biome-ignore lint/a11y/useKeyWithClickEvents: klavyeyle yazı alanından seçilir.
              <div
                key={kayit.kimlik}
                tabIndex={-1}
                id={secenekKimligi(sira)}
                role="option"
                aria-selected={sira === etkin}
                {...(kayit.secilemez === true ? { "aria-disabled": true } : {})}
                className={sinif(
                  "flex min-h-11 cursor-pointer flex-col justify-center rounded-kucuk px-3 hover:bg-yuzey",
                  kayit.secilemez === true && "cursor-not-allowed text-soluk-yazi",
                  // Klavyeyle gelinen öneri yazının renginde zemindir: odak yazı alanındadır, öneri belirgin olmalı.
                  sira === etkin && "bg-yazi text-zemin",
                  kayit.kimlik === secili?.kimlik && "font-kalin",
                )}
                onMouseDown={(olay) => olay.preventDefault()}
                onClick={() => secimYap(sira)}
              >
                {kayit.ad}
                {kayit.adresAdi === undefined ? null : (
                  <span className="text-kucuk opacity-80">{kayit.adresAdi}</span>
                )}
                {kayit.aciklama === undefined ? null : (
                  <span className="text-kucuk opacity-80">{kayit.aciklama}</span>
                )}
              </div>
            ))}
            {dahaVar ? (
              // biome-ignore lint/a11y/useKeyWithClickEvents: klavyeyle yazı alanından seçilir.
              <div
                id={secenekKimligi(kayitlar.length)}
                tabIndex={-1}
                role="option"
                aria-selected={etkin === kayitlar.length}
                className={sinif(
                  "flex min-h-11 cursor-pointer items-center rounded-kucuk px-3 font-kalin",
                  etkin === kayitlar.length && "bg-yazi text-zemin",
                )}
                onMouseDown={(olay) => olay.preventDefault()}
                onClick={() => secimYap(kayitlar.length)}
              >
                {metin("yonetim.kayitArama.dahaFazla")}
              </div>
            ) : null}
          </div>
          {acik && secenekSayisi === 0 && durumMetni !== "" ? (
            // Aynı metin canlı bölgede duyurulur: görünen kopya ekran okuyucuya iki kez okunmaz.
            <span aria-hidden="true" className="text-kucuk text-soluk-yazi">
              {durumMetni}
            </span>
          ) : null}
        </div>
      )}
    </FormAlani>
  );
}
