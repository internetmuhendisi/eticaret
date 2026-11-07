// Robot korumasının değerleri (kart 0033, karar 0051). Değerler bütün sitelerde aynıdır. Tarayıcının
// soruyu çözme süresi bu değerlerden çıkar: maliyet ve deneme sayısı arttıkça eski telefonlarda form
// geç gönderilir, azaldıkça bot için ucuzlar.
export const robotKorumasiAyari = {
  algoritma: "PBKDF2/SHA-256",
  // Her denemenin tekrar sayısı.
  maliyet: 1_000,
  // Doğru cevap bu aralıkta rastgele bir denemededir.
  enAzDeneme: 200,
  enCokDeneme: 500,
  // Sorunun geçerlilik süresi. Sayfası uzun süre açık kalan form sessizce yeni soru alır.
  sureSaniye: 10 * 60,
  // Tarayıcının çözmeye ayırdığı en uzun süre.
  cozumSuresiMs: 60_000,
  cevapUzunlugu: 4_000,
} as const;
