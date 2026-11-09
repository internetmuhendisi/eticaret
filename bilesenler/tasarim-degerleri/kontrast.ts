// İki rengin kontrast oranı, WCAG 2.2'nin göreli parlaklık formülüyle. Renk #RRGGBB biçimindedir.
// Tema değerlerinin testi kullanır; mağaza sahibinin seçtiği rengin ölçüsü de bunu kullanacak (kart 0105).

const kanal = (onaltilik: string) => {
  const deger = Number.parseInt(onaltilik, 16) / 255;
  return deger <= 0.04045 ? deger / 12.92 : ((deger + 0.055) / 1.055) ** 2.4;
};

export function goreliParlaklik(renk: string): number {
  if (!/^#[0-9A-Fa-f]{6}$/.test(renk)) throw new Error(`Renk #RRGGBB biçiminde değil: ${renk}`);
  return (
    0.2126 * kanal(renk.slice(1, 3)) +
    0.7152 * kanal(renk.slice(3, 5)) +
    0.0722 * kanal(renk.slice(5, 7))
  );
}

export function kontrastOrani(on: string, arka: string): number {
  const a = goreliParlaklik(on);
  const b = goreliParlaklik(arka);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
