// Sayfa sayfa okunan listelerin ortak sınırı (.claude/rules/veritabani.md: bir sayfadaki kayıt sayısının
// üst sınırı olsun). Liste motoru gelince sütun ve filtre tanımları da buraya bağlanır.
export const listeSayfasi = {
  varsayilanBoyut: 24,
  enCokBoyut: 100,
} as const;
