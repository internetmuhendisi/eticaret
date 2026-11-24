"use client";
// Yöneticinin kendi hesabı (kart 0274 ve 0053, karar 0178): e-postası, rolleri ve iki aşamalı girişin yedek kodları.
// Yedek kodlarını kaybeden yönetici telefonundaki kodla yenilerini üretir; eskilerin hepsi geçersiz olur. Yeni kodlar
// yalnız bu ekranda bir kez gösterilir (sunucuda yalnız özetleri durur).
import { useRef, useState } from "react";
import { GonderDugmesi } from "../../../bilesenler/form/form";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { kodluHataMetni } from "../kodlu-form";
import { usePanelIslemi } from "../panel-islemi";

const hesapHataMetinleri = {
  "giris-hatasi": "yonetim.hesabim.hata.giris-hatasi",
  "istek-siniri": "yonetim.hesabim.hata.istek-siniri",
  "is-kurali": "yonetim.hesabim.hata.is-kurali",
} as const satisfies Record<string, MetinAnahtari>;
const hataMetni = kodluHataMetni(hesapHataMetinleri);

export function HesabimEkrani({
  eposta,
  roller,
  ikiAsamaKurulu,
  yenileyebilir,
}: {
  eposta: string;
  roller: string[];
  ikiAsamaKurulu: boolean;
  yenileyebilir: boolean;
}) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(hataMetni);
  const [kod, setKod] = useState("");
  const [yeniKodlar, setYeniKodlar] = useState<string[] | null>(null);
  const pf = usePanelFormu({ degisti: false });
  const kodlarBasligi = useRef<HTMLHeadingElement>(null);

  const yenile = async () => {
    if (!/^\d{6}$/.test(kod.trim())) {
      pf.hatalariGoster({ "yedek-kod": metin("yonetim.hesabim.hata.giris-hatasi") });
      return;
    }
    const sonuc = await pf.isle(() =>
      islem<{ yedekKodlari: string[] }>(
        "yedek-kodlari-yenile",
        { kod: kod.trim() },
        "yonetim.hesabim.yenilendi",
        { formda: true },
      ),
    );
    if (sonuc === undefined) return;
    setKod("");
    if (sonuc.tamam) {
      pf.temizle();
      setYeniKodlar(sonuc.veri.yedekKodlari);
      // Kodlar çizildikten sonra odak başlıklarına geçer: ekran okuyucu yeni kodları hemen okur.
      requestAnimationFrame(() => kodlarBasligi.current?.focus());
      return;
    }
    pf.hatalariGoster(
      sonuc.kod === "giris-hatasi" ? { "yedek-kod": metin(hataMetni(sonuc)) } : {},
      sonuc.kod === "giris-hatasi" ? [] : [metin(hataMetni(sonuc))],
    );
  };

  return (
    <div className="flex max-w-metin flex-col gap-6">
      <Kart
        role="region"
        aria-labelledby="hesabim-hesap"
        className="flex flex-col gap-3 p-4 tablet:p-6"
      >
        <h2 id="hesabim-hesap" className="font-baslik text-baslik-4 font-baslik-kalinligi">
          {metin("yonetim.sayfa.hesabim.ad")}
        </h2>
        <dl className="m-0 grid grid-cols-1 gap-x-3 gap-y-1 tablet:grid-cols-3">
          <dt className="text-soluk-yazi">{metin("yonetim.hesabim.eposta")}</dt>
          <dd className="m-0 wrap-anywhere tablet:col-span-2">{eposta}</dd>
          <dt className="text-soluk-yazi">{metin("yonetim.hesabim.roller")}</dt>
          <dd className="m-0 tablet:col-span-2">
            {roller.map((rol) => metin(`yonetim.rol.${rol}` as MetinAnahtari)).join(", ")}
          </dd>
        </dl>
      </Kart>
      {ikiAsamaKurulu && yenileyebilir ? (
        <Kart
          role="region"
          aria-labelledby="hesabim-yedek"
          className="flex flex-col gap-3 p-4 tablet:p-6"
        >
          <h2 id="hesabim-yedek" className="font-baslik text-baslik-4 font-baslik-kalinligi">
            {metin("yonetim.hesabim.yedekBaslik")}
          </h2>
          <p className="m-0 text-soluk-yazi">{metin("yonetim.hesabim.yedekAciklamasi")}</p>
          {yeniKodlar === null ? (
            <PanelFormu durum={pf} gonder={yenile} className="gap-3">
              <PanelAlani
                ad="yedek-kod"
                etiket={metin("yonetim.hesabim.kod")}
                aciklama={metin("yonetim.hesabim.kodAciklamasi")}
              >
                {(alanOzellikleri) => (
                  <GirisAlani
                    {...alanOzellikleri}
                    name="yedek-kod"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    className="max-w-karekod"
                    value={kod}
                    onChange={(olay) => {
                      setKod(olay.target.value);
                      pf.alaniTemizle("yedek-kod");
                    }}
                  />
                )}
              </PanelAlani>
              <GonderDugmesi tur="cerceveli" className="w-fit" disabled={pf.gonderiliyor}>
                {metin("yonetim.hesabim.yenile")}
              </GonderDugmesi>
            </PanelFormu>
          ) : (
            <>
              <Uyari tur="basari">{metin("yonetim.hesabim.yenilendi")}</Uyari>
              <h3
                ref={kodlarBasligi}
                tabIndex={-1}
                className="font-baslik text-orta font-baslik-kalinligi"
              >
                {metin("yonetim.hesabim.kodlar")}
              </h3>
              <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 font-kod tablet:grid-cols-4">
                {yeniKodlar.map((yedek) => (
                  <li
                    key={yedek}
                    className="rounded-kucuk border border-kenar bg-yuzey p-2 text-center"
                  >
                    {yedek}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Kart>
      ) : null}
    </div>
  );
}
