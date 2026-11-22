"use client";
// Slider kısayolu (kart 0142, karar 0101): ana sayfadaki kayan afişin formunu doğrudan açar.
// - Ana sayfada slider yoksa yeni slider formu açılır; kaydedilince slider ana sayfanın en üstüne eklenir.
// - Birden çok slider varsa sıradaki ilki açılır; formun üstünde kaç slider olduğu ve ötekilerin Vitrin bölümleri
//   ekranından düzenlendiği yazar.
// - Açılan slider gizliyse formun üstünde bu yazar ve "Görünür yap" düğmesi durur.
// Kayıt ve hata Vitrin bölümleri ekranıyla aynı formdan geçer (BolumDuzenleyici).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { kayanAfis } from "../../vitrin/bolumler/kayan-afis/tarif";
import { panelIstegi } from "../panel-istegi";
import { BolumDuzenleyici, yeniDegerler } from "./bolum-duzenleyici";
import { islemHatasiMetni } from "./hatalar";
import type { BolumlerEkraniVerisi } from "./veri";

export function SliderEkrani({
  veri,
  bolumlerAdresi,
}: {
  veri: Extract<BolumlerEkraniVerisi, { durum: "hazir" }>;
  bolumlerAdresi: string;
}) {
  const metin = usePanelMetni();
  const router = useRouter();
  const [gorunurYapiliyor, setGorunurYapiliyor] = useState(false);
  const sliderlar = veri.alanlar["ana-sayfa"].filter((bolum) => bolum.tur === kayanAfis.tur);
  const [slider] = sliderlar;
  // Yeni slider'ın kimliği eklenince hemen saklanır: yenileme gelmeden basılan ikinci Kaydet aynı slider'ı değiştirir,
  // ikinci bir slider eklemez (hattaki 0264 çalışması, iz: iki ekleme isteği). Sayfanın verisi gelince o geçerlidir.
  const [eklenen, setEklenen] = useState<string>();
  const kimlik = slider?.kimlik ?? eklenen;
  const bildir = (anahtar: MetinAnahtari) => bildirimGoster("basari", metin(anahtar));
  // Formun anahtarı (kart 0227): yeni slider kaydedilince yenileme kimliğini getirir; anahtar değişseydi form baştan
  // kurulur, kayıt ile yenileme arasında yazılan silinirdi (ölçüldü). Yeni slider'ın kaydı aynı formla sürer; başka
  // bir slider açılınca (silindi, sırası değişti) form baştan kurulur.
  const [formAnahtari, setFormAnahtari] = useState(slider?.kimlik ?? "yeni");
  const [gorulenKimlik, setGorulenKimlik] = useState(slider?.kimlik);
  if (slider?.kimlik !== gorulenKimlik) {
    setGorulenKimlik(slider?.kimlik);
    if (gorulenKimlik !== undefined || slider === undefined) {
      setFormAnahtari(slider?.kimlik ?? "yeni");
      // Slider başka yerde silindi: form yeni slider formudur.
      if (slider === undefined) setEklenen(undefined);
    }
  }

  const gorunurYap = async () => {
    if (slider === undefined || gorunurYapiliyor) return;
    setGorunurYapiliyor(true);
    const sonuc = await panelIstegi("duzen-bolum-gorunurlugu", {
      kimlik: slider.kimlik,
      gizli: false,
    });
    setGorunurYapiliyor(false);
    if (!sonuc.tamam) {
      bildirimGoster("tehlike", metin(islemHatasiMetni(sonuc)));
      return;
    }
    router.refresh();
    bildir("yonetim.bolumler.gosterildi");
  };

  return (
    <div className="flex max-w-metin flex-col gap-4">
      {slider === undefined ? (
        <Uyari tur="bilgi">{metin("yonetim.bolumler.slider.yok")}</Uyari>
      ) : null}
      {sliderlar.length > 1 ? (
        <Uyari tur="bilgi">
          <span className="flex flex-col items-start gap-2">
            {doldur(metin("yonetim.bolumler.slider.birdenCok"), { sayi: String(sliderlar.length) })}
            <Baglanti href={bolumlerAdresi}>
              {metin("yonetim.bolumler.slider.vitrinBolumleri")}
            </Baglanti>
          </span>
        </Uyari>
      ) : null}
      {slider?.gizli === true ? (
        <Uyari tur="uyari">
          <span className="flex flex-col items-start gap-2">
            {metin("yonetim.bolumler.slider.gizli")}
            <Dugme tur="cerceveli" disabled={gorunurYapiliyor} onClick={() => void gorunurYap()}>
              {metin("yonetim.bolumler.slider.gorunurYap")}
            </Dugme>
          </span>
        </Uyari>
      ) : null}
      <Kart className="p-4 tablet:p-6">
        <BolumDuzenleyici
          key={formAnahtari}
          sayfada
          tarif={kayanAfis}
          ilk={
            slider === undefined
              ? { gorunum: kayanAfis.gorunumler[0].kod, degerler: yeniDegerler(kayanAfis) }
              : { gorunum: slider.gorunum, degerler: slider.degerler }
          }
          secenekler={veri.secenekler}
          kaydet={async ({ gorunum, degerler }) => {
            if (kimlik !== undefined) {
              return panelIstegi("duzen-bolum-degistir", { kimlik, gorunum, degerler });
            }
            const sonuc = await panelIstegi<{ kimlik: string }>("duzen-bolum-ekle", {
              alan: "ana-sayfa",
              tur: kayanAfis.tur,
              gorunum,
              degerler,
              sira: 0,
            });
            if (sonuc.tamam) setEklenen(sonuc.veri.kimlik);
            return sonuc;
          }}
          kaydedince={() => {
            router.refresh();
            bildir(
              kimlik === undefined ? "yonetim.bolumler.eklendi" : "yonetim.bolumler.kaydedildi",
            );
          }}
        />
      </Kart>
    </div>
  );
}
