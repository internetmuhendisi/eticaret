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
    // ISO 4217 kodu. Simge verilmezse bu kodun sitenin dilindeki simgesi kullanılır.
    paraBirimi: string;
    simge?: string | undefined;
    simgeYeri: "basta" | "sonda";
    simgeBoslugu: boolean;
    ondalikSayisi: number;
  };
};

export type Bicimleyici = ReturnType<typeof bicimleyiciOlustur>;

// Sayının yönelme eki (kart 0109): "%30'a varan indirim". Ek, sayının okunuşundaki son sözcüğe göre
// seçilir; yalnız eki olan diller burada yazılıdır, ötekilerde ek boştur (metin eki kullanmaz).
// Türkçe: birler basamağı, o sıfırsa onlar; o da sıfırsa son sözcük yüz ya da bin ("'e"), milyon ya da
// milyar ("'a"). Trilyon ve üstü yazılmaz.
const yonelmeEkleri: Readonly<Record<string, (sayi: number) => string>> = {
  tr: (sayi) => {
    const birler = ["", "'e", "'ye", "'e", "'e", "'e", "'ya", "'ye", "'e", "'a"];
    const onlar = ["", "'a", "'ye", "'a", "'a", "'ye", "'a", "'e", "'e", "'a"];
    const tam = Math.abs(Math.trunc(sayi));
    if (tam === 0) return "'a";
    if (tam % 10 !== 0) return birler[tam % 10] ?? "";
    if (tam % 100 !== 0) return onlar[(tam % 100) / 10] ?? "";
    return tam % 1_000_000 !== 0 ? "'e" : "'a";
  },
};

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

// Para biriminin bir dildeki simgesi, dil verisinden (CLDR): kodda bir para simgesi yazmaz (kart 0081).
// Dil verisinde simgesi olmayan kod kendisi olarak döner.
export const paraSimgesi = (dil: string, paraBirimi: string): string =>
  new Intl.NumberFormat(dil, {
    style: "currency",
    currency: paraBirimi,
    currencyDisplay: "narrowSymbol",
  })
    .formatToParts(0)
    .find((parca) => parca.type === "currency")?.value ?? paraBirimi;

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
  const simge = ayarlar.para.simge ?? paraSimgesi(ayarlar.dil, ayarlar.para.paraBirimi);
  const tarihBicimi = new Intl.DateTimeFormat(ayarlar.dil, {
    dateStyle: "short",
    timeZone: ayarlar.saatDilimi,
  });
  // Yıl (kart 0108): telif satırı. Saat dilimine göredir, yılbaşı gecesi sunucunun saatine göre kaymaz.
  const yilBicimi = new Intl.DateTimeFormat(ayarlar.dil, {
    year: "numeric",
    timeZone: ayarlar.saatDilimi,
  });
  // Yüzde (kart 0109): tam sayı, işaretin yeri dilden ("%23", "23%").
  const yuzdeBicimi = new Intl.NumberFormat(ayarlar.dil, {
    style: "percent",
    maximumFractionDigits: 0,
  });
  const yonelmeEki = yonelmeEkleri[ayarlar.dil.split("-")[0] ?? ""] ?? (() => "");
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
      const { simgeYeri, simgeBoslugu, ondalikSayisi } = ayarlar.para;
      const tutar = ayiricilariUygula(paraSayisi, enKucukBirimde / 10 ** ondalikSayisi);
      const bosluk = simgeBoslugu ? " " : "";
      return simgeYeri === "basta" ? `${simge}${bosluk}${tutar}` : `${tutar}${bosluk}${simge}`;
    },
    // Fiyat aralığı (kart 0109, Canlı Çarşı taslağı): simge bir kez, aralığın simgenin yerindeki ucunda
    // ("299,90 – 329,90 ¤", "¤299,90 – 329,90"). Ayırıcı metin dosyasındandır.
    paraAraligi: (enDusuk: number, enYuksek: number, ayirici: string): string => {
      for (const tutar of [enDusuk, enYuksek]) {
        if (!Number.isSafeInteger(tutar)) {
          throw new Error(`Para tutarı en küçük birimde tam sayı olmalı: ${tutar}`);
        }
      }
      const { simgeYeri, simgeBoslugu, ondalikSayisi } = ayarlar.para;
      const [a, b] = [enDusuk, enYuksek].map((tutar) =>
        ayiricilariUygula(paraSayisi, tutar / 10 ** ondalikSayisi),
      );
      const aralik = `${a}${ayirici}${b}`;
      const bosluk = simgeBoslugu ? " " : "";
      return simgeYeri === "basta" ? `${simge}${bosluk}${aralik}` : `${aralik}${bosluk}${simge}`;
    },
    sayi: (deger: number, ondalikSayisi = 0): string =>
      ayiricilariUygula(sayiBicimi(ondalikSayisi), deger),
    // Oran yüz üzerinden verilir (23 → "%23").
    yuzde: (oran: number): string => yuzdeBicimi.format(oran / 100),
    yonelmeEki,
    tarih: (an: Date): string => tarihBicimi.format(an),
    tarihSaat: (an: Date): string => tarihSaatBicimi.format(an),
    yil: (an: Date): string => yilBicimi.format(an),
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

// Sayacın kutusundaki gibi iki haneli tam sayı: "05" (kart 0111, Canlı Çarşı taslağı). Dilden bağımsızdır,
// tarayıcıda da çalışır.
export const ikiHaneli = (sayi: number): string => String(Math.trunc(sayi)).padStart(2, "0");
