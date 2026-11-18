"use client";
// Panelde sunucunun verisinden kurulan formun durumu (kart 0223). Ekran, sunucuda olduğunu bildiği hâli tutar: son
// gördüğü veri ya da başarıyla kaydettiği form. Kayıttan sonra sayfa yenilenir (usePanelIslemi, router.refresh) ve
// yenileme geç gelebilir:
// - Yenileme bilinen hâli getirirse (kendi kaydının yankısı) forma dokunulmaz. Eski hâlde form yenilemeyle baştan
//   kuruluyor, kayıt ile yenileme arasında yazılan değer siliniyordu (hatta "3 beklendi, 4 kaldı", ölçüldü).
// - Yenileme farklı bir veri getirirse (sunucu değeri düzeltti, ör. "60" yerine "60,00"; ya da başka yerde değişti)
//   form yalnız kaydedilmemiş değişiklik yoksa yeni veriyle kurulur; varsa kullanıcının yazdığı kalır.
// "Değişti" ve "Vazgeç" bilinen hâle göredir.
//
// Sunucunun yeni verisi nesnenin kendisiyle tanınır, değeriyle değil: yenileme her seferinde yeni nesne getirir,
// ekranın kendi durumuyla yeniden çizilmesi aynı nesneyi verir. Böylece kayıttan sonra eski veriyle yapılan çizim formu
// geri almaz, kayıttan önceki değeri geri getiren yenileme ise (ör. "59,9" kaydedilip sunucunun "59,90" yazması) forma
// geçer (bağımsız kontrolün bulgusu). Yazı gibi düz değerde nesne yoktur, değerle tanınır.
import { useState } from "react";

const ayni = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export const useSunucuFormu = <Form>(sunucu: Form) => {
  const [form, setForm] = useState<Form>(sunucu);
  const [bilinen, setBilinen] = useState<Form>(sunucu);
  const [gorulen, setGorulen] = useState<Form>(sunucu);
  // Sunucunun yeni verisi çizim sırasında karşılanır (React'ın önceki çizimden bilgi saklama kalıbı): ekran bir kare
  // bile eski formla çizilmez.
  if (!Object.is(sunucu, gorulen)) {
    setGorulen(sunucu);
    if (!ayni(sunucu, bilinen)) {
      if (ayni(form, bilinen)) setForm(sunucu);
      setBilinen(sunucu);
    }
  }
  return {
    form,
    setForm,
    degisti: !ayni(form, bilinen),
    // Uç kaydı kabul etti: gönderilen hâl artık sunucudadır.
    kaydedildi: (gonderilen: Form) => setBilinen(gonderilen),
    vazgec: () => setForm(bilinen),
  };
};
