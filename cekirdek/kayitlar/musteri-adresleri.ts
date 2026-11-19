// Müşterinin adres defterinin sınırları (kart 0237, karar 0149). Kurallar adres servisindedir
// (cekirdek/moduller/musteri/adres.ts).
export const musteriAdresiSinirlari = {
  // Bir müşterinin en çok kayıtlı adresi (taslak, kart 0233).
  enCok: 20,
  // Adresin adı ("Ev", "İş").
  baslikEnCok: 40,
} as const;

// Varsayılan adresin türleri: teslimat ve fatura. Bir müşterinin her türde en çok bir varsayılan adresi olur.
export const varsayilanAdresTurleri = ["teslimat", "fatura"] as const;
export type VarsayilanAdresTuru = (typeof varsayilanAdresTurleri)[number];
