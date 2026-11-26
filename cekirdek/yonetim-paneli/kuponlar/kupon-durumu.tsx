"use client";
// Kuponun sayfasındaki "Kapat" ve "Aç" (kart 0313, karar 0188): kupon-degistir ucuna yalnız açıklığı, sayfanın
// gördüğü değişme anıyla gönderir. Kapalı kupon sepette "bulunamadı" alır; verilen siparişler değişmez. Geri
// alınabilir olduğu için onay sorulmaz; sonuç bildirimle söylenir, sayfa yenilenir.
import { useRef } from "react";
import { kuponHataMetinleri } from "../../moduller/kampanya/semalar";
import { EylemDugmesi } from "../eylem-dugmesi";
import { kodluHataMetni } from "../kodlu-form";
import { usePanelIslemi } from "../panel-islemi";

const hataMetni = kodluHataMetni(kuponHataMetinleri);

export function KuponDurumDugmesi({
  kimlik,
  gorulen,
  acik,
}: {
  kimlik: string;
  gorulen: string;
  acik: boolean;
}) {
  const islem = usePanelIslemi(hataMetni);
  // Çift basışta ikinci istek gitmez (ikincisi zaten çakışırdı).
  const suruyor = useRef(false);
  return (
    <EylemDugmesi
      eylem={acik ? "kupon-kapat" : "kupon-ac"}
      onClick={async () => {
        if (suruyor.current) return;
        suruyor.current = true;
        await islem(
          "kupon-degistir",
          { kimlik, gorulen, kupon: { acik: !acik } },
          acik ? "yonetim.kupon.kapatildi" : "yonetim.kupon.acildi",
        );
        suruyor.current = false;
      }}
    />
  );
}
