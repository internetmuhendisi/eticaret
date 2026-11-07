// Para, sayı ve tarihi biçimlendiren tek yer (.claude/rules/metinler.md).
// Dil, saat dilimi ve para biçimi site ayarından gelir; burada ülkeye özgü sabit değer yoktur.
// Bu dosya dışında Intl ve toLocale...String kullanılmaz (denetim/kurallar/elle-bicimlendirme.grit).

export type BicimAyarlari = {
  dil: string;
  saatDilimi: string;
  sayi: {
    binlikAyirici: string;
    ondalikAyirici: string;
  };
  para: {
    simge: string;
    simgeYeri: "basta" | "sonda";
    simgeBoslugu: boolean;
    ondalikSayisi: number;
  };
};

export type Bicimleyici = ReturnType<typeof bicimleyiciOlustur>;

// Saat dilimi adının tanınıp tanınmadığı. Ayar şeması saat dilimi ayarını bununla doğrular.
export const saatDilimiGecerliMi = (ad: string): boolean => {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: ad });
    return true;
  } catch {
    return false;
  }
};

// Bir saat diliminde duvar saatinin parçaları: an → [yıl, ay, gün, saat, dakika].
const duvarSaati = (an: Date, saatDilimi: string): number[] => {
  const parcalar = new Intl.DateTimeFormat("en", {
    timeZone: saatDilimi,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(an);
  const al = (tur: Intl.DateTimeFormatPartTypes) =>
    Number(parcalar.find((parca) => parca.type === tur)?.value);
  return [al("year"), al("month"), al("day"), al("hour"), al("minute")];
};

// Sitenin saat diliminde yazılmış yerel zamanı ("2026-11-08T09:30") ana çevirir (kart 0076). Biçim
// dışı metin, takvimde olmayan gün ve o saat diliminde hiç yaşanmayan saat (yaz saatine geçişteki
// atlanan saat) undefined döner. Saat geri alınırken iki kez yaşanan saatte önceki an seçilir.
export const yerelZamandan = (yerel: string, saatDilimi: string): Date | undefined => {
  const eslesme = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(yerel);
  if (eslesme === null) return undefined;
  const istenen = eslesme.slice(1).map(Number);
  const [yil = 0, ay = 1, gun = 1, saat = 0, dakika = 0] = istenen;
  const duvar = Date.UTC(yil, ay - 1, gun, saat, dakika);
  // Bir anın o saat dilimindeki farkı (milisaniye).
  const fark = (an: number) => {
    const [y = 0, a = 1, g = 1, s = 0, d = 0] = duvarSaati(new Date(an), saatDilimi);
    return Date.UTC(y, a - 1, g, s, d) - Math.floor(an / 60_000) * 60_000;
  };
  // Duvar saatine uyan adaylar: iki farklı farkla bulunan anlardan doğru olanlar, önce gelen seçilir.
  const adaylar = [duvar - fark(duvar - 86_400_000), duvar - fark(duvar + 86_400_000)]
    .filter((an) => duvarSaati(new Date(an), saatDilimi).every((deger, i) => deger === istenen[i]))
    .toSorted((a, b) => a - b);
  const [an] = adaylar;
  return an === undefined ? undefined : new Date(an);
};

export const bicimleyiciOlustur = (ayarlar: BicimAyarlari) => {
  const sayiBicimi = (ondalikSayisi: number) =>
    new Intl.NumberFormat(ayarlar.dil, {
      useGrouping: "always",
      minimumFractionDigits: ondalikSayisi,
      maximumFractionDigits: ondalikSayisi,
    });

  const ayiricilariUygula = (bicim: Intl.NumberFormat, deger: number) =>
    bicim
      .formatToParts(deger)
      .map((parca) => {
        if (parca.type === "group") return ayarlar.sayi.binlikAyirici;
        if (parca.type === "decimal") return ayarlar.sayi.ondalikAyirici;
        return parca.value;
      })
      .join("");

  const paraSayisi = sayiBicimi(ayarlar.para.ondalikSayisi);
  const tarihBicimi = new Intl.DateTimeFormat(ayarlar.dil, {
    dateStyle: "short",
    timeZone: ayarlar.saatDilimi,
  });
  const ulkeAdlari = new Intl.DisplayNames(ayarlar.dil, { type: "region", fallback: "none" });
  const tarihSaatBicimi = new Intl.DateTimeFormat(ayarlar.dil, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: ayarlar.saatDilimi,
  });

  return {
    // Tutar, para biriminin en küçük biriminde (kuruş, sent) tam sayıdır.
    para: (enKucukBirimde: number): string => {
      if (!Number.isSafeInteger(enKucukBirimde)) {
        throw new Error(`Para tutarı en küçük birimde tam sayı olmalı: ${enKucukBirimde}`);
      }
      const { simge, simgeYeri, simgeBoslugu, ondalikSayisi } = ayarlar.para;
      const tutar = ayiricilariUygula(paraSayisi, enKucukBirimde / 10 ** ondalikSayisi);
      const bosluk = simgeBoslugu ? " " : "";
      return simgeYeri === "basta" ? `${simge}${bosluk}${tutar}` : `${tutar}${bosluk}${simge}`;
    },
    sayi: (deger: number, ondalikSayisi = 0): string =>
      ayiricilariUygula(sayiBicimi(ondalikSayisi), deger),
    tarih: (an: Date): string => tarihBicimi.format(an),
    tarihSaat: (an: Date): string => tarihSaatBicimi.format(an),
    // ISO 3166-1 ülke kodunun sitenin dilindeki adı (kart 0070). Ad dil verisinden (CLDR) gelir, kodda
    // ülke adı yazmaz. Tanınmayan ya da biçimi bozuk kod (boş, üç harf) kendisi olarak döner, hata
    // vermez: ekranın bir bölümü bozuk bir kayıt yüzünden düşmesin. Kodu bolgeler.ts doğrular.
    ulkeAdi: (kod: string): string => {
      try {
        return ulkeAdlari.of(kod) ?? kod;
      } catch {
        return kod;
      }
    },
  };
};
