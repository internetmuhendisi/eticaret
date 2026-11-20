"use client";
// Müşterinin kendi iptali (kart 0239, karar 0151; Canlı Çarşı taslağı siparis-ve-hesap.html): "Siparişi iptal et" onay
// penceresiyle sorulur. Düğme yalnız ayarın izin verdiği durumda ve parası kuruluştan dönebilen (ya da hiç ödenmemiş)
// siparişte görünür (musteri.ts); servis yine denetler. Üye kendi ucuna, üye olmayan takip anahtarıyla, robot
// korumalı uca gider (ertelenmiş: sayfa açılınca soru istenmez). İstek ekranın gördüğü durumu gönderir; arada durum
// değiştiyse sayfa yenilenir. Sonuç bildirimle söylenir, sayfa sunucudan yenilenir.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { kapiyaIstek } from "../../kapi/istemci";
import { hataKodlari } from "../../kayitlar/kapi";
import type { SiparisDurumu } from "../../kayitlar/siparis";
import { siparisTakipCerezi } from "../../kayitlar/siparis";
import { doldur } from "../../metinler/doldur";
import type { VitrinMetinAnahtari } from "../../metinler/istemci-metni";
import { useMetin } from "../../metinler/istemci-metni";
import { useRobotluGonderim } from "../../moduller/robot-korumasi/istemci";

const uyeUcu = "/kapi/musteri/siparis-iptali";
const takipUcu = `${siparisTakipCerezi.kapiYolu}/iptal`;

export function SiparisIptali({
  numara,
  durum,
  odendi,
  yol,
}: {
  numara: string;
  durum: SiparisDurumu;
  // Ödendiyse para karta döner: pencere bunu söyler.
  odendi: boolean;
  yol: "hesap" | "takip";
}) {
  const metin = useMetin();
  const router = useRouter();
  const robotluGonder = useRobotluGonderim({ ertele: true });
  const [acik, setAcik] = useState(false);

  const iptalEt = async () => {
    const girdi = { numara, gorulenDurum: durum };
    let anahtar: VitrinMetinAnahtari = "vitrin.siparis.iptalHata.genel";
    try {
      const yanit =
        yol === "hesap"
          ? await kapiyaIstek(uyeUcu, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(girdi),
            })
          : await robotluGonder(takipUcu, girdi);
      const zarf = (await yanit.json().catch(() => undefined)) as
        | { veri?: { iade: "tamamlandi" | "bekliyor" | "basarisiz" } }
        | undefined;
      if (yanit.ok && zarf?.veri !== undefined && zarf.veri.iade === "basarisiz") {
        // Kuruluş iadeyi reddetti: sipariş iptal olmadı (bağımsız kontrolün bulgusu).
        anahtar = "vitrin.siparis.iptalHata.basarisiz";
        router.refresh();
      } else if (yanit.ok && zarf?.veri !== undefined) {
        setAcik(false);
        router.refresh();
        bildirimGoster(
          zarf.veri.iade === "tamamlandi" ? "basari" : "uyari",
          metin(
            zarf.veri.iade === "tamamlandi"
              ? "vitrin.siparis.iptalBasari"
              : "vitrin.siparis.iptalBekliyor",
          ),
        );
        return;
      } else if (
        yanit.status === hataKodlari.cakisma ||
        yanit.status === hataKodlari["is-kurali"]
      ) {
        anahtar = "vitrin.siparis.iptalHata.degisti";
        router.refresh();
      } else if (yanit.status === hataKodlari.bulunamadi) {
        anahtar = "vitrin.siparis.iptalHata.bulunamadi";
        router.refresh();
      } else if (yanit.status === hataKodlari["istek-siniri"]) {
        anahtar = "vitrin.siparis.iptalHata.sinir";
      }
    } catch {
      // Ağ hatası: genel metin.
    }
    setAcik(false);
    bildirimGoster("tehlike", metin(anahtar));
  };

  return (
    <>
      <Dugme tur="sade" onClick={() => setAcik(true)}>
        {metin("vitrin.siparis.iptalEt")}
      </Dugme>
      <OnayPenceresi
        acik={acik}
        acikDegisince={setAcik}
        baslik={metin("vitrin.siparis.iptalSorusu")}
        aciklama={[
          doldur(metin("vitrin.siparis.iptalAciklamasi"), { numara }),
          ...(odendi ? [metin("vitrin.siparis.iptalParaKarta")] : []),
        ].join(" ")}
        onayEtiketi={metin("vitrin.siparis.iptalEt")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={iptalEt}
      />
    </>
  );
}
