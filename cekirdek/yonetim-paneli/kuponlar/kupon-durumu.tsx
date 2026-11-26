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
  // Çift basışta ikinci istek gitmez: aynı değişme anıyla bir kez gönderilir (başarıdan sonra sayfanın yeni anı
  // gelene kadar ikinci basış eski anla çakışırdı); hatada yeniden denenebilir.
  const gonderilen = useRef<string | null>(null);
  return (
    <EylemDugmesi
      eylem={acik ? "kupon-kapat" : "kupon-ac"}
      onClick={async () => {
        if (gonderilen.current === gorulen) return;
        gonderilen.current = gorulen;
        const sonuc = await islem(
          "kupon-degistir",
          { kimlik, gorulen, kupon: { acik: !acik } },
          acik ? "yonetim.kupon.kapatildi" : "yonetim.kupon.acildi",
        );
        if (!sonuc.tamam) gonderilen.current = null;
      }}
    />
  );
}
