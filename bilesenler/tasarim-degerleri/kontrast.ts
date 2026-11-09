// İki rengin kontrast oranı, WCAG 2.2'nin göreli parlaklık formülüyle. Renk #RRGGBB biçimindedir.
// Tema değerlerinin testi ve mağaza sahibinin seçtiği rengin ölçüsü (kart 0105, cekirdek/temalar/)
// bunu kullanır.

const renkKalibi = /^#[0-9A-Fa-f]{6}$/;

const kanal = (onaltilik: string) => {
  const deger = Number.parseInt(onaltilik, 16) / 255;
  return deger <= 0.04045 ? deger / 12.92 : ((deger + 0.055) / 1.055) ** 2.4;
};

export function goreliParlaklik(renk: string): number {
  if (!renkKalibi.test(renk)) throw new Error(`Renk #RRGGBB biçiminde değil: ${renk}`);
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

// Rengin tonu, doygunluğu ve açıklığı (0-360, 0-1, 0-1).
type Hsl = { ton: number; doygunluk: number; aciklik: number };

const hsl = (renk: string): Hsl => {
  const [r, g, b] = [1, 3, 5].map((bas) => Number.parseInt(renk.slice(bas, bas + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
  const enCok = Math.max(r, g, b);
  const enAz = Math.min(r, g, b);
  const aciklik = (enCok + enAz) / 2;
  const fark = enCok - enAz;
  if (fark === 0) return { ton: 0, doygunluk: 0, aciklik };
  const doygunluk = fark / (1 - Math.abs(2 * aciklik - 1));
  const ton =
    enCok === r ? ((g - b) / fark) % 6 : enCok === g ? (b - r) / fark + 2 : (r - g) / fark + 4;
  return { ton: (ton * 60 + 360) % 360, doygunluk, aciklik };
};

const onaltilik = ({ ton, doygunluk, aciklik }: Hsl): string => {
  const c = (1 - Math.abs(2 * aciklik - 1)) * doygunluk;
  const x = c * (1 - Math.abs(((ton / 60) % 2) - 1));
  const m = aciklik - c / 2;
  const [r, g, b] =
    ton < 60
      ? [c, x, 0]
      : ton < 120
        ? [x, c, 0]
        : ton < 180
          ? [0, c, x]
          : ton < 240
            ? [0, x, c]
            : ton < 300
              ? [x, 0, c]
              : [c, 0, x];
  return `#${[r, g, b]
    .map((deger) =>
      Math.round((deger + m) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase()}`;
};

// Rengin aynı ton ve doygunlukta, açıklığı en az değişmiş ve verilen ölçüden geçen hâli. Renk zaten
// geçiyorsa kendisi döner (büyük harfle). Hiçbir açıklıkta geçmiyorsa undefined döner. Açıklık binde bir
// adımlarla iki yöne de aranır; eşit uzaklıkta iki aday varsa koyusu seçilir.
export function okunurTon(renk: string, gecerMi: (aday: string) => boolean): string | undefined {
  if (!renkKalibi.test(renk)) throw new Error(`Renk #RRGGBB biçiminde değil: ${renk}`);
  const asil = renk.toUpperCase();
  if (gecerMi(asil)) return asil;
  const { ton, doygunluk, aciklik } = hsl(asil);
  const adimlar = 1000;
  const baslangic = Math.round(aciklik * adimlar);
  for (let uzaklik = 1; uzaklik <= adimlar; uzaklik += 1) {
    for (const adim of [baslangic - uzaklik, baslangic + uzaklik]) {
      if (adim < 0 || adim > adimlar) continue;
      const aday = onaltilik({ ton, doygunluk, aciklik: adim / adimlar });
      if (aday !== asil && gecerMi(aday)) return aday;
    }
  }
  return undefined;
}
