"use client";
// Siparişe not ekleme formu (kart 0234): iç not yalnız panelde, müşteriye not müşterinin sipariş ayrıntısında görünür.
// Not değiştirilemez; eklenince sayfa yenilenir ve geçmişin en üstünde görünür. Boş not sunucuya gitmeden söylenir.
// Müşteriye not onay penceresiyle sorulur (geri alınamaz, müşteri görür); yazılmış ama eklenmemiş notla sayfadan
// çıkarken sorulur (bağımsız kontrolün bulguları).
import { useState } from "react";
import { GonderDugmesi } from "../../../bilesenler/form/form";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
import { type SiparisNotTuru, siparisNotTurleri, siparisSinirlari } from "../../kayitlar/siparis";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";

const turAdlari: Record<SiparisNotTuru, MetinAnahtari> = {
  ic: "yonetim.siparis.notlar.ic",
  musteri: "yonetim.siparis.notlar.musteri",
};

const hataMetni = (hata: PanelHatasi): MetinAnahtari =>
  hata.kod === "yetki" ? "yonetim.siparis.notlar.yetki" : "yonetim.siparis.notlar.genel";

export function NotFormu({ numara }: { numara: string }) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(hataMetni);
  const [tur, setTur] = useState<SiparisNotTuru>("ic");
  const [yazi, setYazi] = useState("");
  const [onay, setOnay] = useState(false);
  const yazildi = yazi.trim() !== "";
  // Ortak form yapısı (kart 0259): hata, özet, odak; yazılmış ama eklenmemiş notla çıkarken sorulur. Müşteriye not
  // onay istediği için "Kaydet ve çık" yoktur.
  const pf = usePanelFormu({ degisti: yazildi });
  const ekle = async () => {
    if (!yazildi) {
      pf.hatalariGoster({ "siparis-notu": metin("yonetim.siparis.notlar.gerekli") });
      return;
    }
    if (tur === "musteri") {
      setOnay(true);
      return;
    }
    await gonder();
  };
  const gonder = async () => {
    const sonuc = await pf.isle(() =>
      islem("siparis-notu", { numara, tur, metin: yazi }, "yonetim.siparis.notlar.eklendi", {
        formda: true,
      }),
    );
    if (sonuc === undefined) return;
    if (sonuc.tamam) {
      setYazi("");
      pf.temizle();
      return;
    }
    if (sonuc.kod === "dogrulama") {
      pf.hatalariGoster({
        "siparis-notu": metin(
          sonuc.ayrinti.some((sorun) => sorun.kod === "too_big")
            ? "yonetim.siparis.notlar.uzun"
            : "yonetim.siparis.notlar.gecersiz",
        ),
      });
      return;
    }
    pf.hatalariGoster({}, [metin(hataMetni(sonuc))]);
  };
  return (
    <PanelFormu durum={pf} gonder={ekle} className="gap-3">
      <PanelAlani ad="siparis-notu" etiket={metin("yonetim.siparis.notlar.etiket")}>
        {(alan) => (
          <UzunMetinAlani
            {...alan}
            name="siparis-notu"
            maxLength={siparisSinirlari.notEnCok}
            value={yazi}
            onChange={(olay) => {
              setYazi(olay.target.value);
              pf.alaniTemizle("siparis-notu");
            }}
          />
        )}
      </PanelAlani>
      <SecenekGrubu
        baslik={metin("yonetim.siparis.notlar.tur")}
        etiket={metin("yonetim.siparis.notlar.tur")}
        ogeler={siparisNotTurleri.map((deger) => ({ deger, ad: metin(turAdlari[deger]) }))}
        deger={tur}
        onDegerDegisti={(deger) => setTur(deger as SiparisNotTuru)}
        secilemezEki=""
      />
      <GonderDugmesi tur="sade" className="w-fit" disabled={pf.gonderiliyor}>
        {metin("yonetim.siparis.notlar.kaydet")}
      </GonderDugmesi>
      <OnayPenceresi
        acik={onay}
        acikDegisince={setOnay}
        tur="birincil"
        baslik={metin("yonetim.siparis.notlar.onay.baslik")}
        aciklama={metin("yonetim.siparis.notlar.onay.metin")}
        onayEtiketi={metin("yonetim.siparis.notlar.onay.dugme")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={gonder}
      />
    </PanelFormu>
  );
}
