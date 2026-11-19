"use client";
// Hesap bilgileri (kart 0237; Canlı Çarşı taslağı, kullanıcı kararı: bu kartta yalnız şifre ve kampanya izni). E-posta
// yalnız görünür, değiştirilmez. Şifre formu Kaydet düğmesiyle gider; kampanya izni tek alanlı düzenlemedir, kutu
// değişince kaydedilir (.claude/rules/formlar.md). Sonuç bildirimle söylenir; izin kaydedilemezse kutu eski hâline döner.
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { OnayKutusu } from "../../../bilesenler/parcalar/onay-kutusu";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { kapiyaIstek } from "../../kapi/istemci";
import { hataKodlari } from "../../kayitlar/kapi";
import { useMetin } from "../../metinler/istemci-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { sifreDegistirSemasi } from "../../moduller/musteri/semalar";
import { girisAdresiDonuslu, vitrinAdresleri } from "../adresler";
import { type AlanKimlikleri, type HataHaritasi, MetinAlani } from "../odeme/alanlar";

const uclar = {
  izin: "/kapi/musteri/pazarlama-izni",
  sifre: "/kapi/musteri/sifre-degistir",
} as const;

const girise = () => window.location.assign(girisAdresiDonuslu(vitrinAdresleri.hesapBilgileri));

function SifreFormu({ sifreEnKisa }: { sifreEnKisa: number }) {
  const metin = useMetin();
  const [hatalar, setHatalar] = useState<HataHaritasi>({});
  const [genelHata, setGenelHata] = useState<string | null>(null);
  // Başarıdan sonra alanlar boşalır (form yeniden kurulur).
  const [surum, setSurum] = useState(0);
  const gonderiliyor = useRef(false);
  const formYeri = useRef<HTMLDivElement>(null);
  const kimlikler = useRef<AlanKimlikleri>({}).current;

  useEffect(() => {
    if (Object.keys(hatalar).length === 0) return;
    formYeri.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [hatalar]);

  const yeniSifreHatasi = doldur(metin("vitrin.kayit.hataSifre"), { enKisa: String(sifreEnKisa) });

  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor.current) return;
    const form = new FormData(olay.currentTarget);
    const girdi = sifreDegistirSemasi.safeParse({
      mevcutSifre: String(form.get("mevcutSifre") ?? ""),
      yeniSifre: String(form.get("yeniSifre") ?? ""),
    });
    setGenelHata(null);
    if (!girdi.success) {
      const alanlar = new Set(girdi.error.issues.map(({ path }) => String(path[0])));
      setHatalar({
        ...(alanlar.has("mevcutSifre")
          ? { mevcutSifre: metin("vitrin.hesap.bilgiler.sifreGerekli") }
          : {}),
        ...(alanlar.has("yeniSifre") ? { yeniSifre: yeniSifreHatasi } : {}),
      });
      return;
    }
    setHatalar({});
    gonderiliyor.current = true;
    try {
      const yanit = await kapiyaIstek(uclar.sifre, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(girdi.data),
      });
      if (yanit.ok) {
        bildirimGoster("basari", metin("vitrin.hesap.bilgiler.sifreDegisti"));
        setSurum((sayi) => sayi + 1);
        return;
      }
      const zarf = (await yanit.json().catch(() => undefined)) as
        | { hata?: { ayrinti?: { alan: string; kod: string }[] } }
        | undefined;
      const ayrinti = zarf?.hata?.ayrinti ?? [];
      if (yanit.status === hataKodlari["oturum-yok"]) girise();
      else if (ayrinti.some(({ kod }) => kod === "sifre-yanlis")) {
        setHatalar({ mevcutSifre: metin("vitrin.hesap.bilgiler.sifreYanlis") });
      } else if (yanit.status === hataKodlari.dogrulama) {
        setHatalar({ yeniSifre: yeniSifreHatasi });
      } else if (yanit.status === hataKodlari["istek-siniri"]) {
        setGenelHata(metin("vitrin.giris.hataSinir"));
      } else {
        setGenelHata(metin("vitrin.hesap.bilgiler.hataGenel"));
      }
    } catch {
      setGenelHata(metin("vitrin.hesap.bilgiler.hataGenel"));
    } finally {
      gonderiliyor.current = false;
    }
  };

  return (
    <div ref={formYeri}>
      <Form
        key={surum}
        className="flex flex-col gap-4"
        onSubmit={gonder}
        kodGerekliMetni={metin("ortak.form.kodGerekli")}
        yukleniyorMetni={metin("ortak.form.yukleniyor")}
      >
        {genelHata === null ? null : <Uyari tur="tehlike">{genelHata}</Uyari>}
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          <MetinAlani
            ad="mevcutSifre"
            etiket={metin("vitrin.hesap.bilgiler.mevcutSifre")}
            type="password"
            autoComplete="current-password"
            hatalar={hatalar}
            kimlikler={kimlikler}
          />
          <MetinAlani
            ad="yeniSifre"
            etiket={metin("vitrin.hesap.bilgiler.yeniSifre")}
            aciklama={doldur(metin("vitrin.kayit.sifreAciklama"), {
              enKisa: String(sifreEnKisa),
            })}
            type="password"
            autoComplete="new-password"
            hatalar={hatalar}
            kimlikler={kimlikler}
          />
        </div>
        <GonderDugmesi tur="sade" className="self-start border border-kenar">
          {metin("vitrin.hesap.bilgiler.sifreDegistir")}
        </GonderDugmesi>
      </Form>
    </div>
  );
}

function KampanyaIzni({ ilk }: { ilk: boolean }) {
  const metin = useMetin();
  const [verildi, setVerildi] = useState(ilk);
  // İstek sürerken gelen basış yok sayılır. Kutu kapatılmaz: kapatılan kutu klavye odağını kaybederdi (tarayıcı
  // testinin bulgusu).
  const bekliyor = useRef(false);

  const degistir = async (yeni: boolean) => {
    if (bekliyor.current) return;
    const eski = verildi;
    setVerildi(yeni);
    bekliyor.current = true;
    try {
      const yanit = await kapiyaIstek(uclar.izin, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ verildi: yeni }),
      });
      if (yanit.ok) {
        bildirimGoster(
          "basari",
          metin(
            yeni ? "vitrin.hesap.bilgiler.izinVerildi" : "vitrin.hesap.bilgiler.izinGeriAlindi",
          ),
        );
        return;
      }
      if (yanit.status === hataKodlari["oturum-yok"]) girise();
      setVerildi(eski);
      bildirimGoster("tehlike", metin("vitrin.hesap.bilgiler.izinHata"));
    } catch {
      setVerildi(eski);
      bildirimGoster("tehlike", metin("vitrin.hesap.bilgiler.izinHata"));
    } finally {
      bekliyor.current = false;
    }
  };

  return (
    <OnayKutusu
      etiket={metin("vitrin.onay.pazarlama")}
      checked={verildi}
      onCheckedChange={(deger) => void degistir(deger === true)}
    />
  );
}

export function HesapBilgileri({
  eposta,
  pazarlamaIzni,
  sifreEnKisa,
}: {
  eposta: string;
  pazarlamaIzni: boolean;
  sifreEnKisa: number;
}) {
  const metin = useMetin();
  return (
    <div className="flex flex-col gap-4">
      <Kart className="flex flex-col gap-3 p-4 tablet:p-5">
        <h2 className="font-govde text-buyuk font-en-kalin">
          {metin("vitrin.hesap.bilgiler.kisiselBaslik")}
        </h2>
        <p className="flex flex-col gap-1">
          <span className="font-kalin">{metin("vitrin.hesap.bilgiler.eposta")}</span>
          <span className="wrap-anywhere">{eposta}</span>
          <span className="text-kucuk text-soluk-yazi">
            {metin("vitrin.hesap.bilgiler.epostaAciklama")}
          </span>
        </p>
      </Kart>
      <Kart className="flex flex-col gap-3 p-4 tablet:p-5">
        <h2 className="font-govde text-buyuk font-en-kalin">
          {metin("vitrin.hesap.bilgiler.sifreBaslik")}
        </h2>
        <SifreFormu sifreEnKisa={sifreEnKisa} />
      </Kart>
      <Kart className="flex flex-col gap-3 p-4 tablet:p-5">
        <h2 className="font-govde text-buyuk font-en-kalin">
          {metin("vitrin.hesap.bilgiler.izinBaslik")}
        </h2>
        <KampanyaIzni ilk={pazarlamaIzni} />
        <p className="text-kucuk text-soluk-yazi">{metin("vitrin.hesap.bilgiler.izinAciklama")}</p>
      </Kart>
    </div>
  );
}
