import { describe, expect, it } from "vitest";
import {
  type BicimAyarlari,
  bicimleyiciOlustur,
  goreliZaman,
  gunEkle,
  gununBasi,
  ikiHaneli,
  takvimGunuMu,
  takvimGunuYazisi,
  yerelZamana,
  yerelZamandan,
} from "../bicimleyici";

// Türkiye'nin biçimi (planlar/site-ayarlari.md): binlikte nokta, ondalıkta virgül, simge sonda,
// Europe/Istanbul. Çekirdekte bir sitenin para simgesi yazmaz (cekirdek/testler/para-simgesi-yok.test.ts):
// simge yerine "¤" kullanılır.
const turkiye: BicimAyarlari = {
  dil: "tr",
  saatDilimi: "Europe/Istanbul",
  sayi: { binlikAyirici: ".", ondalikAyirici: "," },
  para: { paraBirimi: "XTS", simge: "¤", simgeYeri: "sonda", simgeBoslugu: true, ondalikSayisi: 2 },
};

const bicim = bicimleyiciOlustur(turkiye);

describe("para", () => {
  it("tutarı binlikte nokta, ondalıkta virgül ve simge sonda yazar", () => {
    expect(bicim.para(124700)).toBe("1.247,00\u00a0¤");
    expect(bicim.para(123456)).toBe("1.234,56\u00a0¤");
  });

  it("büyük, küçük ve sıfır tutarları doğru yazar", () => {
    expect(bicim.para(123456789)).toBe("1.234.567,89\u00a0¤");
    expect(bicim.para(5)).toBe("0,05\u00a0¤");
    expect(bicim.para(0)).toBe("0,00\u00a0¤");
  });

  it("eksi tutarı eksi işaretiyle yazar", () => {
    expect(bicim.para(-124700)).toBe("-1.247,00\u00a0¤");
  });

  it("simgenin yerini ve ayırıcıları ayardan alır", () => {
    const basta = bicimleyiciOlustur({
      ...turkiye,
      dil: "en",
      sayi: { binlikAyirici: ",", ondalikAyirici: "." },
      para: {
        paraBirimi: "XTS",
        simge: "$",
        simgeYeri: "basta",
        simgeBoslugu: false,
        ondalikSayisi: 2,
      },
    });
    expect(basta.para(124700)).toBe("$1,247.00");
  });

  it("simge yazılmazsa para biriminin sitenin dilindeki simgesi kullanılır", () => {
    const simgesiz = (dil: string, paraBirimi: string) =>
      bicimleyiciOlustur({
        ...turkiye,
        dil,
        para: { ...turkiye.para, paraBirimi, simge: undefined },
      });
    expect(simgesiz("en", "USD").para(100)).toBe("1,00\u00a0$");
    expect(simgesiz("de", "EUR").para(100)).toBe("1,00\u00a0€");
    // Dil verisinde simgesi olmayan kod kendisi olarak yazılır.
    expect(simgesiz("tr", "XTS").para(100)).toBe("1,00\u00a0XTS");
  });

  it("en küçük birimde tam sayı olmayan tutarı reddeder", () => {
    expect(() => bicim.para(12.5)).toThrow();
  });
});

// Kart 0136: fiyat filtresine yazılan tutar sitenin ayırıcılarıyla okunur.
describe("sayı okuma (kart 0263)", () => {
  it("sitenin ayırıcılarıyla, en çok verilen ondalıkla okur; eksi yalnız izinliyse", () => {
    expect(bicim.sayiOku("0,35", 3)).toBe(0.35);
    expect(bicim.sayiOku("1.250,5", 3)).toBe(1250.5);
    expect(bicim.sayiOku("12", 0)).toBe(12);
    expect(bicim.sayiOku("-2,5", 1, true)).toBe(-2.5);
    expect(bicim.sayiOku("0,0001", 4)).toBe(0.0001);
    for (const [yazi, ondalik, eksi] of [
      ["-2,5", 1, false],
      ["1,2,3", 3, false],
      ["1,2345", 3, false],
      ["1.5", 3, false],
      ["", 2, false],
      ["--1", 1, true],
      ["abc", 2, false],
    ] as const) {
      expect(bicim.sayiOku(yazi, ondalik, eksi), yazi).toBeUndefined();
    }
  });
});

describe("yerel zamana çevirme (kart 0263)", () => {
  it("yerelZamandan'ın tersidir, yaz saatinde de", () => {
    for (const yerel of [
      "2026-11-21T09:30",
      "2026-03-29T03:15",
      "2026-10-25T03:45",
      "2099-01-02T00:00",
    ]) {
      const an = yerelZamandan(yerel, "Europe/Istanbul");
      expect(an && yerelZamana(an, "Europe/Istanbul"), yerel).toBe(yerel);
    }
    const yaz = yerelZamandan("2026-07-01T12:00", "America/New_York");
    expect(yaz && yerelZamana(yaz, "America/New_York")).toBe("2026-07-01T12:00");
    expect(yerelZamana(new Date("2026-01-01T00:00:00Z"), "America/New_York")).toBe(
      "2025-12-31T19:00",
    );
  });
});

describe("para okuma", () => {
  it("binlikli ve binliksiz yazılış aynı tutardır, ondalık ayırıcı sitenindir", () => {
    for (const yazi of ["1.000", "1000", " 1000 ", "1.000,00", "1000,0"]) {
      expect(bicim.paraOku(yazi), yazi).toBe(100000);
    }
    expect(bicim.paraOku("1.000,50")).toBe(100050);
    expect(bicim.paraOku("1000,5")).toBe(100050);
    expect(bicim.paraOku("0,05")).toBe(5);
    expect(bicim.paraOku("1.234.567,89")).toBe(123456789);
    expect(bicim.paraOku("0")).toBe(0);
  });

  it("bozuk yazılış tutar vermez", () => {
    for (const yazi of [
      "",
      "abc",
      "1.5",
      "1.00",
      "10.00.000",
      "1.000,505",
      "1,000.50",
      "-5",
      "5 ¤",
      "1e3",
      "1 000",
      ",5",
      "5,",
      "99999999999999999999",
    ]) {
      expect(bicim.paraOku(yazi), yazi).toBeUndefined();
    }
  });

  it("ayırıcıları ve ondalık sayısını ayardan alır", () => {
    const ingiliz = bicimleyiciOlustur({
      ...turkiye,
      sayi: { binlikAyirici: ",", ondalikAyirici: "." },
    });
    expect(ingiliz.paraOku("1,000.50")).toBe(100050);
    expect(ingiliz.paraOku("1.000,50")).toBeUndefined();
    const ondaliksiz = bicimleyiciOlustur({
      ...turkiye,
      para: { ...turkiye.para, ondalikSayisi: 0 },
    });
    expect(ondaliksiz.paraOku("1.000")).toBe(1000);
    expect(ondaliksiz.paraOku("1.000,5")).toBeUndefined();
    // Bölünmez boşluk binlik ayırıcı: düz boşlukla yazılış da okunur.
    const bosluklu = bicimleyiciOlustur({
      ...turkiye,
      sayi: { binlikAyirici: "\u00a0", ondalikAyirici: "," },
    });
    expect(bosluklu.paraOku("1 000,50")).toBe(100050);
    expect(bosluklu.paraOku("1\u00a0000")).toBe(100000);
    expect(bosluklu.paraOku("1 00")).toBeUndefined();
    // Binlik ayırıcı boşsa ya da ondalıkla aynıysa binlikli yazılış yoktur.
    const ayni = bicimleyiciOlustur({
      ...turkiye,
      sayi: { binlikAyirici: ",", ondalikAyirici: "," },
    });
    expect(ayni.paraOku("1,000")).toBeUndefined();
    expect(ayni.paraOku("1,5")).toBe(150);
    const binliksiz = bicimleyiciOlustur({
      ...turkiye,
      sayi: { binlikAyirici: "", ondalikAyirici: "," },
    });
    expect(binliksiz.paraOku("1000,5")).toBe(100050);
  });
});

describe("ad karşılaştırma", () => {
  it("sitenin dilinin alfabe sırası, büyük küçük harf ayrımsız, sayılar sayı olarak", () => {
    expect(
      ["Zeytin", "Çam", "ilk", "Işık", "Cam", "Şal", "Sal", "Beden 10", "Beden 9"].toSorted(
        bicim.adKarsilastir,
      ),
    ).toEqual(["Beden 9", "Beden 10", "Cam", "Çam", "Işık", "ilk", "Sal", "Şal", "Zeytin"]);
  });
});

describe("para aralığı", () => {
  it("simge bir kez, simgenin yerindeki uçta", () => {
    expect(bicim.paraAraligi(29_990, 32_990, " – ")).toBe("299,90 – 329,90\u00a0¤");
    const basta = bicimleyiciOlustur({
      ...turkiye,
      para: { ...turkiye.para, simgeYeri: "basta", simgeBoslugu: false },
    });
    expect(basta.paraAraligi(29_990, 123_456, " – ")).toBe("¤299,90 – 1.234,56");
  });

  // Kart 0190: dar ekranda simge tutardan ayrılıp tek başına alt satıra düşüyordu. Simgeyle tutarın arasında
  // satır kırılabilecek boşluk yoktur; aralığın ayırıcısı kırılabilir kalır.
  it("simgeyle tutarın arası bölünmez boşluk, simge sonda da başta da", () => {
    const basta = bicimleyiciOlustur({
      ...turkiye,
      para: { ...turkiye.para, simgeYeri: "basta" },
    });
    for (const yazi of [
      bicim.para(124700),
      bicim.paraAraligi(29_990, 32_990, " – "),
      basta.para(124700),
      basta.paraAraligi(29_990, 32_990, " – "),
    ]) {
      expect(yazi).toMatch(/(\d ¤|¤ \d)/u);
      expect(yazi).not.toMatch(/(\d ¤|¤ \d)/u);
    }
  });
});

describe("sayı", () => {
  it("binlik ve ondalık ayırıcıyı ayardan alır", () => {
    expect(bicim.sayi(1247)).toBe("1.247");
    expect(bicim.sayi(1234.567, 2)).toBe("1.234,57");
  });
});

// Kart 0109: indirim rozetinin oranı ve "%30'a varan" eki.
describe("veya listesi", () => {
  it("seçenekleri dilin bağlacıyla birleştirir", () => {
    expect(bicim.veyaListesi(["JPEG", "PNG", "WebP"])).toBe("JPEG, PNG veya WebP");
    expect(bicim.veyaListesi(["PNG"])).toBe("PNG");
    expect(bicimleyiciOlustur({ ...turkiye, dil: "en" }).veyaListesi(["A", "B"])).toBe("A or B");
  });
});

describe("dosya boyutu", () => {
  it("megabayt ve kilobayt, en çok bir ondalık, sitenin ondalık ayırıcısıyla, birimin adı dilden", () => {
    expect(bicim.dosyaBoyutu(10 * 1024 * 1024)).toBe("10 MB");
    expect(bicim.dosyaBoyutu(1.5 * 1024 * 1024)).toBe("1,5 MB");
    expect(bicim.dosyaBoyutu(300 * 1024)).toBe("300 kB");
    expect(bicim.dosyaBoyutu(1)).toBe("0,1 kB");
    expect(bicimleyiciOlustur({ ...turkiye, dil: "en" }).dosyaBoyutu(1.5 * 1024 * 1024)).toBe(
      "1,5 MB",
    );
  });
});

describe("yüzde ve yönelme eki", () => {
  it("yüzde işareti dilin yerinde, tam sayı", () => {
    expect(bicim.yuzde(23)).toBe("%23");
    expect(bicimleyiciOlustur({ ...turkiye, dil: "en" }).yuzde(23)).toBe("23%");
  });

  it.each([
    [1, "'e"],
    [2, "'ye"],
    [6, "'ya"],
    [9, "'a"],
    [10, "'a"],
    [20, "'ye"],
    [23, "'e"],
    [25, "'e"],
    [30, "'a"],
    [40, "'a"],
    [46, "'ya"],
    [50, "'ye"],
    [60, "'a"],
    [70, "'e"],
    [80, "'e"],
    [90, "'a"],
    [99, "'a"],
    [100, "'e"],
    [300, "'e"],
    [1000, "'e"],
    [5000, "'e"],
    [1_000_000, "'a"],
    [2_000_000, "'a"],
    [1_001_000, "'e"],
    [1_000_000_000, "'a"],
  ])("Türkçede %i sayısının yönelme eki %s", (sayi, ek) => {
    expect(bicim.yonelmeEki(sayi)).toBe(ek);
  });

  it("eki olmayan dilde ek boştur", () => {
    expect(bicimleyiciOlustur({ ...turkiye, dil: "en" }).yonelmeEki(30)).toBe("");
  });
});

describe("tarih", () => {
  it("tarihi mağazanın saat dilimine göre yazar", () => {
    // UTC'de 28 Ekim 21:30, İstanbul'da 29 Ekim 00:30.
    const an = new Date("2026-10-28T21:30:00Z");
    expect(bicim.tarih(an)).toBe("29.10.2026");
    expect(bicim.uzunTarih(an)).toBe("29 Ekim 2026");
    expect(bicim.tarihSaat(an)).toBe("29.10.2026 00:30");
  });
});

describe("ülke adı", () => {
  it("ülke kodunu sitenin dilinde adlandırır", () => {
    expect(bicim.ulkeAdi("TR")).toBe("Türkiye");
    expect(bicim.ulkeAdi("DE")).toBe("Almanya");
    expect(bicimleyiciOlustur({ ...turkiye, dil: "en" }).ulkeAdi("DE")).toBe("Germany");
  });

  it("tanınmayan ya da biçimi bozuk kodu olduğu gibi döndürür, hata vermez", () => {
    for (const kod of ["QQ", "", "T", "TUR", "X1"]) expect(bicim.ulkeAdi(kod)).toBe(kod);
  });
});

// Kart 0076: zamanlanmış ürünün yayın zamanı sitenin saat diliminde yazılır.
describe("yerel zamandan an", () => {
  it.each([
    ["Europe/Istanbul", "2026-11-08T09:30", "2026-11-08T06:30:00.000Z"],
    ["UTC", "2026-11-08T09:30", "2026-11-08T09:30:00.000Z"],
    ["America/New_York", "2026-07-01T00:00", "2026-07-01T04:00:00.000Z"],
    ["America/New_York", "2026-01-01T00:00", "2026-01-01T05:00:00.000Z"],
    ["Asia/Kolkata", "2026-03-01T12:00", "2026-03-01T06:30:00.000Z"],
    ["Europe/Berlin", "2026-12-31T23:59", "2026-12-31T22:59:00.000Z"],
  ])("%s %s → %s", (saatDilimi, yerel, an) => {
    expect(yerelZamandan(yerel, saatDilimi)?.toISOString()).toBe(an);
  });

  it("yaz saatine geçişte atlanan saat yok sayılır", () => {
    // Berlin 2026-03-29: 02:00'den 03:00'e atlanır.
    expect(yerelZamandan("2026-03-29T02:30", "Europe/Berlin")).toBeUndefined();
    expect(yerelZamandan("2026-03-29T03:00", "Europe/Berlin")?.toISOString()).toBe(
      "2026-03-29T01:00:00.000Z",
    );
  });

  it("saat geri alınırken iki kez yaşanan saatte önceki an seçilir", () => {
    // Berlin 2026-10-25: 03:00'te 02:00'ye dönülür, 02:30 iki kez yaşanır.
    expect(yerelZamandan("2026-10-25T02:30", "Europe/Berlin")?.toISOString()).toBe(
      "2026-10-25T00:30:00.000Z",
    );
  });

  it.each([
    ["takvimde olmayan gün", "2026-02-30T10:00"],
    ["saniyeli", "2026-11-08T09:30:00"],
    ["saat dilimli", "2026-11-08T09:30Z"],
    ["boş", ""],
    ["25. saat", "2026-11-08T25:00"],
  ])("%s reddedilir", (_ad, yerel) => {
    expect(yerelZamandan(yerel, "Europe/Istanbul")).toBeUndefined();
  });
});

describe("iki haneli sayı (kart 0111, sayacın kutusu)", () => {
  it("tek haneli sayı sıfırla başlar, büyük sayı değişmez", () => {
    expect([0, 5, 9, 10, 59, 120].map(ikiHaneli)).toEqual(["00", "05", "09", "10", "59", "120"]);
  });
});

describe("kısa ad (kart 0139, yorumun görünen adı)", () => {
  it("ad korunur, soyadı sitenin dilinde büyük baş harfine kısaltılır", () => {
    expect(bicim.kisaAd("Ayşe Yılmaz")).toBe("Ayşe Y.");
    expect(bicim.kisaAd("  ali   can  demir ")).toBe("ali can D.");
    // Türkçe büyük harf: i → İ, ı → I.
    expect(bicim.kisaAd("Elif irmak")).toBe("Elif İ.");
    expect(bicim.kisaAd("Elif ışık")).toBe("Elif I.");
    expect(bicim.kisaAd("Can Öztürk")).toBe("Can Ö.");
  });

  it("tek sözcük olduğu gibi kalır; birleşik harf ve emoji bölünmez", () => {
    expect(bicim.kisaAd(" Deniz ")).toBe("Deniz");
    expect(bicim.kisaAd("Ali Şahin")).toBe("Ali Ş.");
    // Harf taşımayan sözcük atılır, baş harf soyadın ilk harfidir (bağımsız kontrolün bulgusu).
    expect(bicim.kisaAd("Ali 😀mutlu")).toBe("Ali M.");
    expect(bicim.kisaAd("Ayşe 1")).toBe("Ayşe");
    expect(bicim.kisaAd("Ayşe . Kaya")).toBe("Ayşe K.");
  });
});

describe("takvim günü (kart 0267)", () => {
  it("biçim, takvimde olma ve yıl sınırı (1900–9998)", () => {
    for (const gun of ["2026-11-23", "2024-02-29", "1900-01-01", "9998-12-31"]) {
      expect(takvimGunuMu(gun), gun).toBe(true);
    }
    for (const gun of [
      "2026-02-29",
      "2026-13-01",
      "2026-11-31",
      "2026-11-1",
      "26-11-01",
      "2026-11-01T00:00",
      "1899-12-31",
      "9999-12-31",
      "0099-01-01",
      "",
    ]) {
      expect(takvimGunuMu(gun), gun).toBe(false);
    }
  });

  it("gün ekleme ay, yıl ve artık yıl sınırında; sınırdaki yılın ertesi günü dört hanelidir", () => {
    expect(gunEkle("2026-11-30", 1)).toBe("2026-12-01");
    expect(gunEkle("2026-12-31", 1)).toBe("2027-01-01");
    expect(gunEkle("2024-03-01", -1)).toBe("2024-02-29");
    expect(gunEkle("2026-11-23", -29)).toBe("2026-10-25");
    expect(gunEkle("9998-12-31", 1)).toBe("9999-01-01");
  });

  it("günün başı sitenin saat dilimiyle: gece yarısı, yaz saati ve gece yarısının ya da günün hiç yaşanmadığı dilimler", () => {
    expect(gununBasi("2026-11-21", "Europe/Istanbul").toISOString()).toBe(
      "2026-11-20T21:00:00.000Z",
    );
    expect(gununBasi("2026-03-08", "America/New_York").toISOString()).toBe(
      "2026-03-08T05:00:00.000Z",
    );
    expect(gununBasi("2026-03-09", "America/New_York").toISOString()).toBe(
      "2026-03-09T04:00:00.000Z",
    );
    // Santiago'da saat 6 Eylül 2026 gece yarısında ileri alınır: gün 01.00'de (04.00Z) başlar.
    expect(gununBasi("2026-09-06", "America/Santiago").toISOString()).toBe(
      "2026-09-06T04:00:00.000Z",
    );
    // Kahire'de 25 Nisan 2025 gece yarısı yaşanmaz: gün 01.00'de (22.00Z, önceki takvim günü) başlar.
    expect(gununBasi("2025-04-25", "Africa/Cairo").toISOString()).toBe("2025-04-24T22:00:00.000Z");
    // Apia 30 Aralık 2011'i hiç yaşamadı: gün ertesi günün başında başlar, uzunluğu sıfırdır.
    expect(gununBasi("2011-12-30", "Pacific/Apia").toISOString()).toBe(
      gununBasi("2011-12-31", "Pacific/Apia").toISOString(),
    );
    expect(gununBasi("9998-12-31", "Europe/Istanbul").toISOString()).toBe(
      "9998-12-30T21:00:00.000Z",
    );
  });
});

describe("takvim gününün yazılışı (kart 0317)", () => {
  it("gün saat diliminden bağımsız yazılır: yılın ilk ve son günü kaymaz", () => {
    expect(takvimGunuYazisi("tr-TR", "2026-01-01", "uzun")).toBe("1 Ocak 2026");
    expect(takvimGunuYazisi("tr-TR", "2026-12-31", "uzun")).toBe("31 Aralık 2026");
    expect(takvimGunuYazisi("tr-TR", "2026-10-29", "kisa")).toBe("29 Eki");
    expect(takvimGunuYazisi("en-US", "2026-10-29", "kisa")).toBe("Oct 29");
  });
});

describe("göreli zaman (kart 0280)", () => {
  const istanbul = { dil: "tr", saatDilimi: "Europe/Istanbul" };
  const simdi = new Date("2026-11-20T09:30:00Z"); // İstanbul'da 12.30
  const once = (dakika: number) => new Date(simdi.getTime() - dakika * 60_000);
  it("bir saatten yenide dakika, aynı günde saat, son yedi günde gün, daha eskide tarih", () => {
    expect(goreliZaman(simdi, simdi, istanbul)).toBe("bu dakika");
    expect(goreliZaman(once(5), simdi, istanbul)).toBe("5 dk. önce");
    expect(goreliZaman(once(59), simdi, istanbul)).toBe("59 dk. önce");
    expect(goreliZaman(once(60), simdi, istanbul)).toBe("1 sa. önce");
    // İstanbul'da 00.10: aynı gün.
    expect(goreliZaman(once(12 * 60 + 20), simdi, istanbul)).toBe("12 sa. önce");
    // İstanbul'da dün 23.50: bir saatten eski, takvimde dün.
    expect(goreliZaman(once(12 * 60 + 40), simdi, istanbul)).toBe("dün");
    expect(goreliZaman(once(6 * 24 * 60), simdi, istanbul)).toBe("6 gün önce");
    expect(goreliZaman(once(7 * 24 * 60), simdi, istanbul)).toBe("13.11.2026");
    // Gelecekteki an (saat farkı) şimdi sayılır.
    expect(goreliZaman(new Date(simdi.getTime() + 90_000), simdi, istanbul)).toBe("bu dakika");
  });
  it("günler sitenin saat dilimindedir", () => {
    // New York'ta şimdi 04.30, 5 saat önce dünün 23.30'u.
    const newYork = { dil: "tr", saatDilimi: "America/New_York" };
    expect(goreliZaman(once(5 * 60), simdi, newYork)).toBe("dün");
    expect(goreliZaman(once(5 * 60), simdi, istanbul)).toBe("5 sa. önce");
  });
});
