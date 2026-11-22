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

// Bir anın bir saat dilimindeki takvim günü, "YYYY-AA-GG" (kart 0215: ödeme kuruluşunun günlük raporu).
export const takvimGunu = (an: Date, saatDilimi: string): string => {
  const [yil = 0, ay = 1, gun = 1] = duvarSaati(an, saatDilimi);
  return `${String(yil).padStart(4, "0")}-${ikiHaneli(ay)}-${ikiHaneli(gun)}`;
};

// Bir anın sitenin saat dilimindeki yerel zamanı, "YYYY-AA-GGTSS:DD" (kart 0263): panelin tarih ve saat alanının
// değeri. yerelZamandan'ın tersidir.
export const yerelZamana = (an: Date, saatDilimi: string): string => {
  const [yil = 0, ay = 1, gun = 1, saat = 0, dakika = 0] = duvarSaati(an, saatDilimi);
  return `${String(yil).padStart(4, "0")}-${ikiHaneli(ay)}-${ikiHaneli(gun)}T${ikiHaneli(saat % 24)}:${ikiHaneli(dakika)}`;
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

// Görünen ad (kart 0139, kullanıcı kararı): ad korunur, soyadı verilen dilde büyük baş harfine kısaltılır.
// "Ayşe Yılmaz" → "Ayşe Y.", "Ali Can demir" → "Ali Can D.". Tek sözcük olduğu gibi kalır, fazla boşluk düşer.
// Harf kod noktasıyla alınır: birleşik harf ve emoji bölünmez. Yorum servisi bunu doğrudan kullanır (arka plan
// süreci sitenin biçimleyicisini yüklemez).
// Harf taşımayan sözcük ("1", ".") atılır; soyadın baş harfi onun ilk harfidir.
export const kisaAd = (adSoyad: string, dil: string): string => {
  const sozcukler = adSoyad
    .normalize("NFC")
    .trim()
    .split(/\s+/u)
    .filter((s) => /\p{L}/u.test(s));
  const soyad = sozcukler.at(-1);
  if (sozcukler.length < 2 || soyad === undefined) return sozcukler.join(" ");
  const harf = Array.from(soyad).find((h) => /\p{L}/u.test(h)) ?? "";
  return `${sozcukler.slice(0, -1).join(" ")} ${harf.toLocaleUpperCase(dil)}.`;
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
  // Simgeyle tutarın arası bölünmez boşluktur (kart 0190): dar ekranda simge tutardan ayrılıp tek başına alt
  // satıra düşmez; satır kırılacaksa simge yanındaki tutarla birlikte iner.
  const simgeyleTutarArasi = "\u00a0";
  const simge = ayarlar.para.simge ?? paraSimgesi(ayarlar.dil, ayarlar.para.paraBirimi);
  const tarihBicimi = new Intl.DateTimeFormat(ayarlar.dil, {
    dateStyle: "short",
    timeZone: ayarlar.saatDilimi,
  });
  // Ayın adıyla tarih (kart 0238): müşterinin siparişleri ("20 Kasım 2026").
  const uzunTarihBicimi = new Intl.DateTimeFormat(ayarlar.dil, {
    dateStyle: "long",
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
  // Dosya boyutu (kart 0094): megabayt ya da kilobayt, en çok bir ondalık, birimin adı dilden ("10 MB").
  const boyutBicimi = (birim: "megabyte" | "kilobyte") =>
    new Intl.NumberFormat(ayarlar.dil, {
      style: "unit",
      unit: birim,
      unitDisplay: "short",
      maximumFractionDigits: 1,
    });
  const megabaytBicimi = boyutBicimi("megabyte");
  const kilobaytBicimi = boyutBicimi("kilobyte");
  const yonelmeEki = yonelmeEkleri[ayarlar.dil.split("-")[0] ?? ""] ?? (() => "");
  const ulkeAdlari = new Intl.DisplayNames(ayarlar.dil, { type: "region", fallback: "none" });
  // Adların sitenin dilindeki alfabe sırası (kart 0136): filtrede markalar ve değerler.
  const adSiralayici = new Intl.Collator(ayarlar.dil, { sensitivity: "base", numeric: true });
  const tarihSaatBicimi = new Intl.DateTimeFormat(ayarlar.dil, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: ayarlar.saatDilimi,
  });

  // Sitenin ayırıcılarıyla yazılmış negatif olmayan sayıyı en küçük birime (10^ondalikSayisi katı) çevirir.
  const ondalikliOku = (yazi: string, ondalikSayisi: number): number | undefined => {
    const { binlikAyirici, ondalikAyirici } = ayarlar.sayi;
    const kac = (deger: string) => deger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Boşluk türü binlik ayırıcı (bölünmez boşluk) müşterinin yazdığı düz boşlukla da okunur. Binlik
    // ayırıcı boşsa ya da ondalık ayırıcıyla aynıysa binlikli yazılış yoktur: belirsiz olurdu.
    const binlik = /^\s$/u.test(binlikAyirici) ? "[\\s\\u00a0\\u202f]" : kac(binlikAyirici);
    const binlikli = binlikAyirici !== "" && binlikAyirici !== ondalikAyirici;
    const kesir = ondalikSayisi > 0 ? `(?:${kac(ondalikAyirici)}(\\d{1,${ondalikSayisi}}))?` : "";
    const temiz = yazi.trim();
    const eslesme =
      (binlikli ? new RegExp(`^(\\d{1,3}(?:${binlik}\\d{3})+)${kesir}$`, "u").exec(temiz) : null) ??
      new RegExp(`^(\\d+)${kesir}$`).exec(temiz);
    if (eslesme === null) return undefined;
    const tam = (eslesme[1] ?? "").replace(/\D/g, "");
    const ondalik = (eslesme[2] ?? "").padEnd(ondalikSayisi, "0");
    const deger = Number(tam) * 10 ** ondalikSayisi + Number(ondalik === "" ? 0 : ondalik);
    return Number.isSafeInteger(deger) ? deger : undefined;
  };

  return {
    // Tutar alanı (kart 0212, panelin kargo ekranı): simgesiz tutar, paraOku'nun okuduğu biçimde; simge ve yeri
    // alanın yanında ayrıca gösterilir.
    paraSimgesi: (): { simge: string; yer: "basta" | "sonda" } => ({
      simge,
      yer: ayarlar.para.simgeYeri,
    }),
    paraYazisi: (enKucukBirimde: number): string => {
      if (!Number.isSafeInteger(enKucukBirimde)) {
        throw new Error(`Para tutarı en küçük birimde tam sayı olmalı: ${enKucukBirimde}`);
      }
      return ayiricilariUygula(paraSayisi, enKucukBirimde / 10 ** ayarlar.para.ondalikSayisi);
    },
    // Tutar, para biriminin en küçük biriminde (kuruş, sent) tam sayıdır.
    para: (enKucukBirimde: number): string => {
      if (!Number.isSafeInteger(enKucukBirimde)) {
        throw new Error(`Para tutarı en küçük birimde tam sayı olmalı: ${enKucukBirimde}`);
      }
      const { simgeYeri, simgeBoslugu, ondalikSayisi } = ayarlar.para;
      const tutar = ayiricilariUygula(paraSayisi, enKucukBirimde / 10 ** ondalikSayisi);
      const bosluk = simgeBoslugu ? simgeyleTutarArasi : "";
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
      const bosluk = simgeBoslugu ? simgeyleTutarArasi : "";
      return simgeYeri === "basta" ? `${simge}${bosluk}${aralik}` : `${aralik}${bosluk}${simge}`;
    },
    // Müşterinin yazdığı tutarı en küçük birime çevirir (kart 0136): fiyat filtresi. Sitenin ayırıcılarıyla
    // binlikli ("1.000", "1.000,50") ya da binliksiz ("1000", "1000,5") yazılış aynı tutardır. Binlik
    // grupları üçer hanedir, ondalık en çok para biriminin ondalık sayısı kadardır; simge, eksi işareti ve
    // başka yazılış (örneğin binlik ayırıcıyla "1.5") kabul edilmez: tutar yoktur, ekran hatayı gösterir.
    paraOku: (yazi: string): number | undefined => ondalikliOku(yazi, ayarlar.para.ondalikSayisi),
    // Panelde yazılan sayı (kart 0263): ağırlık, sayı türündeki özellik. paraOku'nun kuralıyla, en çok
    // ondalikSayisi kadar ondalık; eksi verilirse başında "-" olabilir. Tutar değil, sayının kendisi döner.
    sayiOku: (yazi: string, ondalikSayisi: number, eksi = false): number | undefined => {
      const temiz = yazi.trim();
      const eksiMi = eksi && temiz.startsWith("-");
      const deger = ondalikliOku(eksiMi ? temiz.slice(1) : temiz, ondalikSayisi);
      if (deger === undefined) return undefined;
      const sayi = deger / 10 ** ondalikSayisi;
      return eksiMi ? -sayi : sayi;
    },
    kisaAd: (adSoyad: string): string => kisaAd(adSoyad, ayarlar.dil),
    sayi: (deger: number, ondalikSayisi = 0): string =>
      ayiricilariUygula(sayiBicimi(ondalikSayisi), deger),
    // Oran yüz üzerinden verilir (23 → "%23").
    yuzde: (oran: number): string => yuzdeBicimi.format(oran / 100),
    dosyaBoyutu: (bayt: number): string =>
      bayt >= 1024 * 1024
        ? ayiricilariUygula(megabaytBicimi, bayt / (1024 * 1024))
        : ayiricilariUygula(kilobaytBicimi, Math.max(bayt / 1024, 0.1)),
    yonelmeEki,
    adKarsilastir: (a: string, b: string): number => adSiralayici.compare(a, b),
    tarih: (an: Date): string => tarihBicimi.format(an),
    uzunTarih: (an: Date): string => uzunTarihBicimi.format(an),
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
