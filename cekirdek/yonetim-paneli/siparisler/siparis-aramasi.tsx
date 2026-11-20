"use client";
// Siparişler ekranının araması (kart 0234): sipariş numarası, müşterinin adı ya da e-postası. Aranan metin kişisel
// bilgi olabileceği için adrese yazılmaz (.claude/rules/formlar.md: arama formu yalnız gizli olmayan metin içindir);
// arama liste ucuna (GET /kapi/yonetici/siparisler) gider, seçili durum sekmesi korunur. Sonuç listenin üstünde ilk
// sayfa kadar gösterilir; daha fazlası varsa aramayı daraltması söylenir. Sonuç canlı bölgede duyurulur.
import { type FormEvent, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { Etiket } from "../../../bilesenler/parcalar/etiket";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import {
  type SiparisDurumu,
  siparisDurumTanimlari,
  siparisSinirlari,
} from "../../kayitlar/siparis";
import { doldur } from "../../metinler/doldur";
import { usePanelMetni } from "../../metinler/panel-metni";
import type { SiparisListesi } from "../../moduller/siparis/yonetim";
import { panelAdresi } from "../adresler";
import { panelIstegi } from "../panel-istegi";
import { durumMetni } from "./metinler";

type Sonuc = { tur: "bulundu"; aranan: string; liste: SiparisListesi } | { tur: "hata" };

export function SiparisAramasi({ durum }: { durum: SiparisDurumu | null }) {
  const metin = usePanelMetni();
  const [aranan, setAranan] = useState("");
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const gonderiliyor = useRef(false);

  const ara = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    const metni = aranan.trim();
    if (metni === "" || gonderiliyor.current) return;
    gonderiliyor.current = true;
    const sorgu = new URLSearchParams({ ara: metni });
    if (durum !== null) sorgu.set("durum", durum);
    const yanit = await panelIstegi<SiparisListesi>(`siparisler?${sorgu.toString()}`);
    gonderiliyor.current = false;
    setSonuc(yanit.tamam ? { tur: "bulundu", aranan: metni, liste: yanit.veri } : { tur: "hata" });
  };

  const temizle = () => {
    setAranan("");
    setSonuc(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <Form
        kodGerekliMetni={metin("ortak.form.kodGerekli")}
        yukleniyorMetni={metin("ortak.form.yukleniyor")}
        onSubmit={ara}
        role="search"
        className="flex flex-wrap items-end gap-2"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1 tablet:max-w-form">
          <Etiket htmlFor="siparis-ara">{metin("yonetim.siparisler.ara")}</Etiket>
          <GirisAlani
            id="siparis-ara"
            type="search"
            autoComplete="off"
            maxLength={siparisSinirlari.aramaEnCok}
            placeholder={metin("yonetim.siparisler.araYer")}
            value={aranan}
            onChange={(olay) => setAranan(olay.target.value)}
          />
        </span>
        <GonderDugmesi tur="sade">{metin("yonetim.siparisler.araDugme")}</GonderDugmesi>
        {sonuc === null ? null : (
          <Dugme tur="sade" onClick={temizle}>
            {metin("yonetim.siparisler.aramayiTemizle")}
          </Dugme>
        )}
      </Form>
      <div aria-live="polite">
        {sonuc === null ? null : sonuc.tur === "hata" ? (
          <Uyari tur="tehlike">{metin("yonetim.siparisler.aramaHatasi")}</Uyari>
        ) : sonuc.liste.toplam === 0 ? (
          <BosHal
            ikon="arama"
            duzey={3}
            baslik={metin("yonetim.siparisler.aramaYok.baslik")}
            aciklama={doldur(metin("yonetim.siparisler.aramaYok.metin"), { aranan: sonuc.aranan })}
          />
        ) : (
          <section aria-label={metin("yonetim.siparisler.ara")} className="flex flex-col gap-2">
            <p className="text-kucuk">
              {doldur(metin("yonetim.siparisler.aramaSonucu"), {
                aranan: sonuc.aranan,
                sayi: String(sonuc.liste.toplam),
              })}
              {sonuc.liste.toplam > sonuc.liste.satirlar.length
                ? ` ${doldur(metin("yonetim.siparisler.aramaFazla"), {
                    sayi: String(sonuc.liste.satirlar.length),
                  })}`
                : ""}
            </p>
            <ul className="flex flex-col gap-2">
              {sonuc.liste.satirlar.map((satir) => (
                <li key={satir.numara}>
                  <Kart className="flex-row flex-wrap items-center justify-between gap-2 p-3 tablet:p-3">
                    <span className="flex flex-col">
                      <Baglanti
                        href={`${panelAdresi}/siparisler/ayrinti?numara=${encodeURIComponent(satir.numara)}`}
                        aria-label={doldur(metin("yonetim.siparisler.ayrintiAdi"), {
                          numara: satir.numara,
                        })}
                        className="w-fit"
                      >
                        {satir.numara}
                      </Baglanti>
                      <span className="text-kucuk text-soluk-yazi">
                        {`${satir.ad} ${satir.soyad}`.trim() === ""
                          ? metin("yonetim.siparisler.kisiselSilindi")
                          : `${satir.ad} ${satir.soyad}`}
                      </span>
                    </span>
                    <Rozet tur={siparisDurumTanimlari[satir.durum].rozet}>
                      {metin(durumMetni(satir.durum))}
                    </Rozet>
                  </Kart>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
