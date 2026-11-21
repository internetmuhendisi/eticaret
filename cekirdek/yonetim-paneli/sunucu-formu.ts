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

const duzNesneMi = (deger: unknown): deger is Record<string, unknown> =>
  typeof deger === "object" && deger !== null && !Array.isArray(deger);

// Üç yönlü birleşim (kart 0265, bağımsız kontrolün bulgusu): kullanıcının dokunmadığı değer (formda eski bilinen hâliyle
// aynı) sunucunun yeni değerini alır, dokunduğu kalır. Nesneler alan alan, diziler ve düz değerler bütün olarak
// karşılaştırılır. Yalnız değişen alanı gönderen formda (ürün ekranı) dokunulmamış alanın eski değeri sunucunun yeni
// değerini ezmesin diye.
export const ucYonluBirlestir = <T>(form: T, eski: T, yeni: T): T => {
  if (ayni(form, eski)) return yeni;
  if (!duzNesneMi(form) || !duzNesneMi(eski) || !duzNesneMi(yeni)) return form;
  const sonuc: Record<string, unknown> = {};
  for (const anahtar of new Set([...Object.keys(form), ...Object.keys(yeni)])) {
    if (!(anahtar in form)) sonuc[anahtar] = yeni[anahtar];
    else if (!(anahtar in yeni) && anahtar in eski) continue;
    else sonuc[anahtar] = ucYonluBirlestir(form[anahtar], eski[anahtar], yeni[anahtar]);
  }
  return sonuc as T;
};

// uzlastir verilirse kaydedilmemiş değişiklik varken gelen yeni veri formla onunla birleşir (dokunulmayan alan yeni
// değeri alır); verilmezse kullanıcının yazdığı olduğu gibi kalır.
export const useSunucuFormu = <Form>(
  sunucu: Form,
  uzlastir?: (form: Form, eskiBilinen: Form, yeni: Form) => Form,
) => {
  const [form, setForm] = useState<Form>(sunucu);
  const [bilinen, setBilinen] = useState<Form>(sunucu);
  const [gorulen, setGorulen] = useState<Form>(sunucu);
  // Sunucunun yeni verisi çizim sırasında karşılanır (React'ın önceki çizimden bilgi saklama kalıbı): ekran bir kare
  // bile eski formla çizilmez.
  if (!Object.is(sunucu, gorulen)) {
    setGorulen(sunucu);
    if (!ayni(sunucu, bilinen)) {
      if (ayni(form, bilinen)) setForm(sunucu);
      else if (uzlastir !== undefined) setForm(uzlastir(form, bilinen, sunucu));
      setBilinen(sunucu);
    }
  }
  return {
    form,
    setForm,
    // Sunucuda olduğu bilinen hâl: bir işlem düşünce ekran ona döner (kart 0224).
    bilinen,
    degisti: !ayni(form, bilinen),
    // Uç kaydı kabul etti: gönderilen hâl artık sunucudadır. Formun bir kısmını kaydeden işlem (ödeme yöntemlerinin
    // sırası, kart 0224) yeni hâli bilinen hâlden kurar.
    kaydedildi: (gonderilen: Form | ((bilinen: Form) => Form)) => setBilinen(gonderilen),
    vazgec: () => setForm(bilinen),
  };
};
