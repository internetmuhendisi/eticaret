// Basılan alanın ölçüsü (kart 0191): öğenin ortasına ve ortasından dört yöne 22 px uzağa (44 × 44 px karenin kenar
// ortaları) basılınca o öğeye mi basılıyor? Görünmez genişletilmiş alan (dokunma-alani) da sayılır; komşu bir öğe
// alanın üstüne biniyorsa o noktada komşu çıkar ve ölçüm düşer. Köşelere basılmaz: tarayıcı yuvarlak düğmenin
// köşesini basılan alana saymaz, 44 px'lik yuvarlak düğme de geçmeliydi. Dönen dizi, öğeye gitmeyen noktalardır.
import type { Locator } from "@playwright/test";

export const DOKUNMA_ALANI = 44;

export const basilmayanNoktalar = async (oge: Locator): Promise<string[]> => {
  await oge.scrollIntoViewIfNeeded();
  return oge.evaluate((hedef, kenar) => {
    const kutu = hedef.getBoundingClientRect();
    const ortaX = kutu.left + kutu.width / 2;
    const ortaY = kutu.top + kutu.height / 2;
    // Kenardan 1 px içeride: tarayıcı yuvarlak düğmenin kenarındaki yarım pikseli komşu düğmeye verebiliyor (yan yana
    // iki 44 px'lik yuvarlak noktada ölçüldü).
    const yari = kenar / 2 - 1;
    const disarida: string[] = [];
    const noktalar = [
      [0, 0],
      [-yari, 0],
      [yari, 0],
      [0, -yari],
      [0, yari],
    ] as const;
    for (const [dx, dy] of noktalar) {
      const nokta = document.elementFromPoint(ortaX + dx, ortaY + dy);
      if (nokta === null || !(nokta === hedef || hedef.contains(nokta))) {
        disarida.push(`(${Math.round(dx)}, ${Math.round(dy)}): ${nokta?.tagName ?? "yok"}`);
      }
    }
    return disarida;
  }, DOKUNMA_ALANI);
};
