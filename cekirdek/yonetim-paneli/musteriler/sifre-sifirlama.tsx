"use client";
// Müşteriye şifre sıfırlama bağlantısı gönderme (kart 0271, karar 0173): bağlantı müşterinin kendi e-postasına gider,
// mağaza şifreyi görmez. Müşteriye e-posta gittiği için önce sorulur. Şifremi unuttum akışının sınırı uygulanır:
// sınır doluysa söylenir. Yalnız musteri.sifre-sifirlama izni olana görünür (uç yine denetler).
import { useState } from "react";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { EylemDugmesi } from "../eylem-dugmesi";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";

const hataMetni = (hata: PanelHatasi): MetinAnahtari =>
  hata.kod === "istek-siniri"
    ? "yonetim.musteri.sifre.sinir"
    : hata.kod === "yetki"
      ? "yonetim.musteri.sifre.yetki"
      : hata.kod === "bulunamadi"
        ? "yonetim.musteri.sifre.bulunamadi"
        : "yonetim.musteri.sifre.genel";

export function SifreSifirlamaGonder({ musteri, eposta }: { musteri: string; eposta: string }) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(hataMetni);
  const [acik, setAcik] = useState(false);
  return (
    <>
      <EylemDugmesi eylem="sifre-sifirlama-gonder" onClick={() => setAcik(true)} />
      <OnayPenceresi
        acik={acik}
        acikDegisince={setAcik}
        tur="birincil"
        baslik={metin("yonetim.musteri.sifre.onay.baslik")}
        aciklama={doldur(metin("yonetim.musteri.sifre.onay.metin"), { eposta })}
        onayEtiketi={metin("yonetim.musteri.sifre.onay.dugme")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={async () => {
          await islem("musteri-sifre-sifirlama", { musteri }, "yonetim.musteri.sifre.gonderildi");
        }}
      />
    </>
  );
}
