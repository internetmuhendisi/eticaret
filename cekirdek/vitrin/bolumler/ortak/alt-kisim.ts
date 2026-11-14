// Alt kısım bölümlerinin ortak sınıfları (kart 0108; Canlı Çarşı taslağı). Alt kısmın zemini, yazısı ve
// yerleşimi çerçevededir (cekirdek/vitrin/ust-alt-kisim.tsx): her sütun bölümü ızgarada bir hücredir. Başlık açık
// yazı rengindedir, bilgi ve bağlantılar soluk rengidir. Bağlantılar listede durur, alt çizgileri üzerine gelince
// görünür (menü satırındaki gibi); dokunma alanı 44 px kalır, kısa adlı bağlantıda genişlik de (dokunma-alani,
// kart 0146).
export const altKisimSiniflari = {
  sutun: "flex min-w-0 flex-col gap-1",
  baslik: "mb-1 font-govde text-govde font-en-kalin text-alt-kisim-ustu",
  baglanti:
    "dokunma-alani min-h-11 justify-start text-left font-normal text-alt-kisim-soluk no-underline hover:underline",
  soluk: "text-alt-kisim-soluk",
} as const;
