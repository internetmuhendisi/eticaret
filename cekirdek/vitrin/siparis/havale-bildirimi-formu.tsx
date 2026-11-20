"use client";
// Havale bildirimi formu (kart 0214, karar 0141; kart 0211'in taslağı). Müşteri havaleyle ödediğini bildirir: sipariş
// numarası, siparişteki e-posta (üye değilse), gönderenin adı, gönderdiği hesap, tutar, ödeme günü ve not. Şema uçla
// ortaktır (cekirdek/moduller/siparis/havale-bildirimi-semalari.ts). Üye olmayan müşterinin isteği robot korumalıdır ve ertelenmiştir
// (sayfa açılınca soru istenmez); giriş yapmış müşterininki kendi ucuna gider, e-posta sorulmaz. Numara ile e-posta
// eşleşmezse siparişin var olup olmadığı söylenmez. Başarıda teşekkür görünür ve odağı alır.
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import {
  SecimDegeri,
  SecimKutusu,
  SecimListesi,
  SecimOgesi,
  SecimTetikleyici,
} from "../../../bilesenler/parcalar/secim-kutusu";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
import { kapiyaIstek } from "../../kapi/istemci";
import { hataKodlari } from "../../kayitlar/kapi";
import { doldur } from "../../metinler/doldur";
import type { VitrinMetinAnahtari } from "../../metinler/istemci-metni";
import { useMetin } from "../../metinler/istemci-metni";
import { useRobotluGonderim } from "../../moduller/robot-korumasi/istemci";
import {
  havaleBildirimiFormuSemasi,
  misafirHavaleBildirimiFormuSemasi,
} from "../../moduller/siparis/havale-bildirimi-semalari";
import { vitrinAdresleri } from "../adresler";
import { useHesapDurumu } from "../hesap-durumu";

const misafirUcu = "/kapi/herkese-acik/havale-bildirimi";
const uyeUcu = "/kapi/musteri/havale-bildirimi";

export type HavaleBildirimiVerisi = {
  // Mağazanın banka hesapları: kimlik ve görünen ad (banka ve numaranın sonu).
  hesaplar: readonly { kimlik: string; ad: string }[];
  // Sipariş alındı sayfasından gelen numara (adreste).
  numara: string;
  sinirlar: { not: number };
  // Tutarın yazılış örneği, sitenin biçimiyle ("1.399,60").
  tutarOrnegi: string;
};

type Alan = "numara" | "eposta" | "gonderen" | "hesap" | "tutar" | "odemeTarihi" | "not";
const alanSirasi: Alan[] = ["numara", "eposta", "gonderen", "hesap", "tutar", "odemeTarihi", "not"];

const kodMetinleri: Record<string, VitrinMetinAnahtari> = {
  "numara-bicimi": "vitrin.havaleBildirimi.hata.numara",
  "tutar-okunamadi": "vitrin.havaleBildirimi.hata.tutar",
  "tarih-bicimi": "vitrin.havaleBildirimi.hata.tarih",
  "tarih-gecersiz": "vitrin.havaleBildirimi.hata.tarih",
  "hesap-yok": "vitrin.havaleBildirimi.hata.hesap",
};
const alanMetni = (alan: Alan, kod: string): VitrinMetinAnahtari =>
  kodMetinleri[kod] ??
  (alan === "eposta"
    ? "vitrin.havaleBildirimi.hata.eposta"
    : alan === "hesap"
      ? "vitrin.havaleBildirimi.hata.hesap"
      : kod === "too_big"
        ? "vitrin.odeme.hata.uzun"
        : "vitrin.odeme.hata.gerekli");

type Genel =
  | "bulunamadi"
  | "bulunamadiUye"
  | "beklemiyor"
  | "bildirimSiniri"
  | "sinir"
  | "hesapBilinmiyor"
  | "genel";
const genelMetinler: Record<Genel, VitrinMetinAnahtari> = {
  bulunamadi: "vitrin.havaleBildirimi.hata.bulunamadi",
  bulunamadiUye: "vitrin.havaleBildirimi.hata.bulunamadiUye",
  beklemiyor: "vitrin.havaleBildirimi.hata.beklemiyor",
  bildirimSiniri: "vitrin.havaleBildirimi.hata.bildirimSiniri",
  hesapBilinmiyor: "vitrin.havaleBildirimi.hata.hesapBilinmiyor",
  sinir: "vitrin.havaleBildirimi.hata.sinir",
  genel: "vitrin.havaleBildirimi.hata.genel",
};

export function HavaleBildirimiFormu({ veri }: { veri: HavaleBildirimiVerisi }) {
  const metin = useMetin();
  const hesap = useHesapDurumu();
  const robotluGonder = useRobotluGonderim({ ertele: true });
  const [secilenHesap, setSecilenHesap] = useState(
    veri.hesaplar.length === 1 ? (veri.hesaplar[0]?.kimlik ?? "") : "",
  );
  const [hatalar, setHatalar] = useState<Partial<Record<Alan, string>>>({});
  const [genel, setGenel] = useState<Genel | null>(null);
  const [alinan, setAlinan] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const gonderiliyor = useRef(false);
  const kimlikler = useRef<Partial<Record<Alan, string>>>({}).current;
  const tesekkur = useRef<HTMLDivElement>(null);
  const uyari = useRef<HTMLDivElement>(null);
  const uye = hesap.tur === "girisli";

  useEffect(() => {
    if (alinan !== null) tesekkur.current?.focus();
  }, [alinan]);
  useEffect(() => {
    if (genel !== null) uyari.current?.focus();
  }, [genel]);

  const alanaOdaklan = (yeni: Partial<Record<Alan, string>>) => {
    const ilk = alanSirasi.find((alan) => yeni[alan] !== undefined);
    const kimlik = ilk === undefined ? undefined : kimlikler[ilk];
    if (kimlik !== undefined) document.getElementById(kimlik)?.focus();
  };

  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor.current) return;
    // Hesap durumu öğrenilemediyse (ağ ya da sunucu hatası) gönderim sessizce durmaz: müşteriye söylenir (kart 0214
    // kontrolü).
    if (hesap.tur === "bilinmiyor") {
      setGenel("hesapBilinmiyor");
      return;
    }
    const form = new FormData(olay.currentTarget);
    const deger = (ad: string) => String(form.get(ad) ?? "");
    const ortak = {
      numara: deger("numara"),
      gonderen: deger("gonderen"),
      hesap: secilenHesap,
      tutar: deger("tutar"),
      odemeTarihi: deger("odemeTarihi"),
      not: deger("not"),
    };
    const girdi = uye
      ? havaleBildirimiFormuSemasi.safeParse(ortak)
      : misafirHavaleBildirimiFormuSemasi.safeParse({ ...ortak, eposta: deger("eposta") });
    setGenel(null);
    if (!girdi.success) {
      const yeni: Partial<Record<Alan, string>> = {};
      for (const sorun of girdi.error.issues) {
        const alan = sorun.path[0] as Alan;
        if (yeni[alan] !== undefined) continue;
        yeni[alan] = metin(alanMetni(alan, sorun.code === "custom" ? sorun.message : sorun.code));
      }
      setHatalar(yeni);
      alanaOdaklan(yeni);
      return;
    }
    setHatalar({});
    gonderiliyor.current = true;
    setBekliyor(true);
    try {
      const yanit = uye
        ? await kapiyaIstek(uyeUcu, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(girdi.data),
          })
        : await robotluGonder(misafirUcu, girdi.data);
      const zarf = (await yanit.json().catch(() => undefined)) as
        | { veri?: { numara: string }; hata?: { ayrinti?: { alan: string; kod: string }[] } }
        | undefined;
      if (yanit.ok && zarf?.veri !== undefined) {
        setAlinan(zarf.veri.numara);
        return;
      }
      const ayrinti = zarf?.hata?.ayrinti ?? [];
      if (yanit.status === hataKodlari.dogrulama && ayrinti.length > 0) {
        const yeni: Partial<Record<Alan, string>> = {};
        for (const { alan, kod } of ayrinti) {
          if ((alanSirasi as string[]).includes(alan))
            yeni[alan as Alan] = metin(alanMetni(alan as Alan, kod));
        }
        setHatalar(yeni);
        alanaOdaklan(yeni);
        if (Object.keys(yeni).length === 0) setGenel("genel");
      } else if (yanit.status === hataKodlari.bulunamadi) {
        setGenel(uye ? "bulunamadiUye" : "bulunamadi");
      } else if (yanit.status === hataKodlari["is-kurali"]) {
        setGenel(
          ayrinti.some(({ kod }) => kod === "bildirim-siniri") ? "bildirimSiniri" : "beklemiyor",
        );
      } else if (yanit.status === hataKodlari["istek-siniri"]) {
        setGenel("sinir");
      } else {
        setGenel("genel");
      }
    } catch {
      setGenel("genel");
    } finally {
      gonderiliyor.current = false;
      setBekliyor(false);
    }
  };

  if (alinan !== null) {
    return (
      <div
        ref={tesekkur}
        tabIndex={-1}
        role="status"
        className="flex flex-col items-center gap-3 py-6 text-center"
      >
        <span className="flex size-12 items-center justify-center rounded-dugme bg-basari-zemin text-basari-yazi">
          <Ikon ad="basari" className="size-6" />
        </span>
        <h2 className="font-baslik text-baslik-3 font-baslik-kalinligi">
          {metin("vitrin.havaleBildirimi.alindi")}
        </h2>
        <p className="text-soluk-yazi">
          {doldur(metin("vitrin.havaleBildirimi.alindiAciklamasi"), { numara: alinan })}
        </p>
        <Baglanti href={vitrinAdresleri.anasayfa} gorunum="sade">
          {metin("vitrin.siparisAlindi.alisveriseDevam")}
        </Baglanti>
      </div>
    );
  }

  const metinAlani = (
    ad: Exclude<Alan, "hesap" | "not">,
    etiket: VitrinMetinAnahtari,
    ek: {
      aciklama?: string;
      type?: "text" | "email" | "date";
      autoComplete?: string;
      inputMode?: "text" | "decimal";
      defaultValue?: string;
    } = {},
  ) => {
    const { aciklama, ...giris } = ek;
    return (
      <FormAlani
        etiket={metin(etiket)}
        {...(aciklama === undefined ? {} : { aciklama })}
        {...(hatalar[ad] === undefined ? {} : { hata: hatalar[ad] })}
      >
        {(alan) => {
          kimlikler[ad] = alan.id;
          return <GirisAlani {...alan} name={ad} {...giris} />;
        }}
      </FormAlani>
    );
  };

  return (
    <Kart className="p-5 tablet:p-6">
      <Form
        onSubmit={gonder}
        kodGerekliMetni={metin("ortak.form.kodGerekli")}
        yukleniyorMetni={metin("ortak.form.yukleniyor")}
        className="flex flex-col gap-4"
      >
        <div ref={uyari} tabIndex={-1} className="empty:hidden">
          {genel === null ? null : <Uyari tur="tehlike">{metin(genelMetinler[genel])}</Uyari>}
        </div>
        {veri.hesaplar.length === 0 ? (
          <Uyari tur="bilgi">{metin("vitrin.havaleBildirimi.hesapYok")}</Uyari>
        ) : null}
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          {metinAlani("numara", "vitrin.havaleBildirimi.numara", {
            aciklama: metin("vitrin.havaleBildirimi.numaraAciklamasi"),
            autoComplete: "off",
            ...(veri.numara === "" ? {} : { defaultValue: veri.numara }),
          })}
          {/* E-posta alanı hesap durumu bilinmezken de görünür: üye olmayan müşteride sayfa kaymaz (kart 0214). */}
          {uye
            ? null
            : metinAlani("eposta", "vitrin.havaleBildirimi.eposta", {
                type: "email",
                autoComplete: "email",
              })}
          {metinAlani("gonderen", "vitrin.havaleBildirimi.gonderen", { autoComplete: "name" })}
          <FormAlani
            etiket={metin("vitrin.havaleBildirimi.hesap")}
            {...(hatalar.hesap === undefined ? {} : { hata: hatalar.hesap })}
          >
            {(alan) => {
              kimlikler.hesap = alan.id;
              return (
                <SecimKutusu value={secilenHesap} onValueChange={setSecilenHesap}>
                  <SecimTetikleyici {...alan}>
                    <SecimDegeri placeholder={metin("vitrin.odeme.secin")} />
                  </SecimTetikleyici>
                  <SecimListesi>
                    {veri.hesaplar.map((secenek) => (
                      <SecimOgesi key={secenek.kimlik} value={secenek.kimlik}>
                        {secenek.ad}
                      </SecimOgesi>
                    ))}
                  </SecimListesi>
                </SecimKutusu>
              );
            }}
          </FormAlani>
          {metinAlani("tutar", "vitrin.havaleBildirimi.tutar", {
            aciklama: doldur(metin("vitrin.havaleBildirimi.tutarAciklamasi"), {
              ornek: veri.tutarOrnegi,
            }),
            inputMode: "decimal",
            autoComplete: "off",
          })}
          {metinAlani("odemeTarihi", "vitrin.havaleBildirimi.tarih", { type: "date" })}
          <div className="tablet:col-span-2">
            <FormAlani
              etiket={metin("vitrin.havaleBildirimi.not")}
              aciklama={doldur(metin("vitrin.odeme.notAciklama"), {
                sinir: String(veri.sinirlar.not),
              })}
              {...(hatalar.not === undefined ? {} : { hata: hatalar.not })}
            >
              {(alan) => {
                kimlikler.not = alan.id;
                return (
                  <UzunMetinAlani {...alan} name="not" rows={3} maxLength={veri.sinirlar.not} />
                );
              }}
            </FormAlani>
          </div>
        </div>
        {bekliyor ? <p role="status">{metin("vitrin.havaleBildirimi.gonderiliyor")}</p> : null}
        <GonderDugmesi className="self-start" disabled={bekliyor}>
          {metin("vitrin.havaleBildirimi.gonder")}
        </GonderDugmesi>
      </Form>
    </Kart>
  );
}
