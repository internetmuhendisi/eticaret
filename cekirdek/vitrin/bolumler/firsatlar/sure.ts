// Geri sayımın süre hesabı (kart 0111). Zamanlar milisaniyedir.
const saniye = 1000;
const dakika = 60 * saniye;

// Kalan sürenin parçaları; dakika yukarı yuvarlanır: "0 dakika" kalmışken sayaç bitmemiş görünmez.
export const kalanSure = (bitis: number, simdi: number) => {
  const dakikalar = Math.ceil(Math.max(0, bitis - simdi) / dakika);
  return {
    gun: Math.floor(dakikalar / (24 * 60)),
    saat: Math.floor((dakikalar % (24 * 60)) / 60),
    dakika: dakikalar % 60,
  };
};

// Ekranda bir şeyin değişeceği ilk ana kalan süre: bir kartın dakikası azalır ya da indirimi biter. Saat yalnız o
// anda yeniden kurulur, saniyede bir çizilmez. Bitişi geçmiş kart hesaba girmez; hiçbiri kalmadıysa yoktur.
export const sonrakiDegisim = (bitisler: readonly number[], simdi: number): number | undefined => {
  const kalanlar = bitisler.filter((bitis) => bitis > simdi).map((bitis) => bitis - simdi);
  if (kalanlar.length === 0) return undefined;
  return Math.min(...kalanlar.map((kalan) => kalan % dakika || dakika));
};
