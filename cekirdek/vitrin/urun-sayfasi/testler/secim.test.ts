// Ürün sayfasında renk ve beden seçiminin kuralları (kart 0138, karar 0108): değerin durumu önceki seçimlerle,
// seçim değişince sonrakilerin satılabilir değere geçmesi, ilk seçim (adres ve ayar), adresin yazılması ve tekil
// anahtarlar.
import { describe, expect, it } from "vitest";
import {
  degerDurumu,
  degisenSecimler,
  ilkSecim,
  type SecimBirimi,
  type SecimSecenegi,
  seciliBirim,
  secimdenSorgu,
  secimiDegistir,
  tekilAnahtarlar,
} from "../secim";

const secenekler: SecimSecenegi[] = [
  {
    kimlik: "renk",
    anahtar: "renk",
    ad: "Renk",
    degerler: [
      { kimlik: "beyaz", anahtar: "beyaz", ad: "Beyaz" },
      { kimlik: "siyah", anahtar: "siyah", ad: "Siyah" },
    ],
  },
  {
    kimlik: "beden",
    anahtar: "beden",
    ad: "Beden",
    degerler: [
      { kimlik: "s", anahtar: "s", ad: "S" },
      { kimlik: "m", anahtar: "m", ad: "M" },
      { kimlik: "l", anahtar: "l", ad: "L" },
    ],
  },
];
// Beyaz: S var, M tükenmiş, L yok. Siyah: S tükenmiş, M var, L var.
const birimler: SecimBirimi[] = [
  { kimlik: "beyaz-s", degerler: ["beyaz", "s"], satilabilir: true },
  { kimlik: "beyaz-m", degerler: ["beyaz", "m"], satilabilir: false },
  { kimlik: "siyah-s", degerler: ["siyah", "s"], satilabilir: false },
  { kimlik: "siyah-m", degerler: ["siyah", "m"], satilabilir: true },
  { kimlik: "siyah-l", degerler: ["siyah", "l"], satilabilir: true },
];

describe("değerin durumu", () => {
  it("ilk seçenekte bütün birleşimlere, sonrakilerde önceki seçime bakılır", () => {
    expect(degerDurumu(birimler, [], 0, "beyaz")).toBe("satilabilir");
    expect(degerDurumu(birimler, ["beyaz"], 1, "s")).toBe("satilabilir");
    expect(degerDurumu(birimler, ["beyaz"], 1, "m")).toBe("tukendi");
    expect(degerDurumu(birimler, ["beyaz"], 1, "l")).toBe("yok");
    expect(degerDurumu(birimler, ["siyah"], 1, "s")).toBe("tukendi");
    // Önceki seçim yoksa her birleşime bakılır: S Beyaz'da satılabilir.
    expect(degerDurumu(birimler, [undefined], 1, "s")).toBe("satilabilir");
    // Sonraki seçeneğin seçimi öncekinin durumunu değiştirmez.
    expect(degerDurumu(birimler, ["siyah", "l"], 0, "beyaz")).toBe("satilabilir");
  });

  it("hiçbir birleşimi satılamayan değer tükenmiştir", () => {
    const hepsiBitti = birimler.map((b) => ({ ...b, satilabilir: false }));
    expect(degerDurumu(hepsiBitti, [], 0, "beyaz")).toBe("tukendi");
  });
});

describe("tükenmiş değer seçilebilirken (stoğa gelince haber ver, kart 0144)", () => {
  const sec = (secim: (string | undefined)[], sira: number, deger: string, tercih = secim) =>
    secimiDegistir(secenekler, birimler, secim, sira, deger, tercih, true);

  it("tükenmiş değer seçilir; seçilemez kuralı yalnız seçenek kapalıyken geçerlidir", () => {
    expect(sec(["beyaz", "s"], 1, "m")).toEqual(["beyaz", "m"]);
    expect(secimiDegistir(secenekler, birimler, ["beyaz", "s"], 1, "m")).toEqual(["beyaz", "s"]);
    expect(seciliBirim(birimler, sec(["beyaz", "s"], 1, "m"), 2)?.kimlik).toBe("beyaz-m");
  });

  it("birleşimi olmayan değer yine seçilemez", () => {
    const secim = ["beyaz", "s"];
    expect(sec(secim, 1, "l")).toBe(secim);
  });

  it("müşterinin seçtiği değer tükenmiş olsa da korunur, sessizce başkasına geçilmez (kart 0167)", () => {
    // Siyah-M seçiliyken Beyaz'a geçilince Beyaz-M tükenmiş: M kalır, sayfa "Tükendi" der. Eski kural satılabilir
    // S'ye geçiyordu; müşteri M istediğini sanırken S'yi seçmiş oluyordu.
    expect(sec(["siyah", "m"], 0, "beyaz")).toEqual(["beyaz", "m"]);
    expect(seciliBirim(birimler, sec(["siyah", "m"], 0, "beyaz"), 2)?.kimlik).toBe("beyaz-m");
    // Müşterinin elle seçtiği değer (tercih M) o an seçili değerden (L) önce gelir.
    expect(sec(["siyah", "l"], 0, "beyaz", ["siyah", "m"])).toEqual(["beyaz", "m"]);
  });

  it("seçtiği değerin birleşimi yoksa önce satılabilir değere geçilir", () => {
    // Siyah-L seçiliyken Beyaz'a geçilince Beyaz'da L yok: satılabilir S'ye geçer.
    expect(sec(["siyah", "l"], 0, "beyaz")).toEqual(["beyaz", "s"]);
  });

  it("hiçbiri satılamıyorsa birleşimi olan tükenmiş değer seçilir", () => {
    const hepsiBitti = birimler.map((b) => ({ ...b, satilabilir: false }));
    // Hiçbiri satılamıyorsa seçili (tükenmiş) değer kalır, birleşimi yoksa ilk birleşimi olan değere geçer.
    expect(
      secimiDegistir(secenekler, hepsiBitti, ["siyah", "m"], 0, "beyaz", ["siyah", "m"], true),
    ).toEqual(["beyaz", "m"]);
    expect(
      secimiDegistir(secenekler, hepsiBitti, ["siyah", "l"], 0, "beyaz", ["siyah", "l"], true),
    ).toEqual(["beyaz", "s"]);
  });
});

describe("değişen seçimin söylenmesi (kart 0167)", () => {
  const degisen = (onceki: (string | undefined)[], sira: number, deger: string, acik = false) => {
    const tercih = secenekler.map((_, i) => (i === sira ? deger : onceki[i]));
    const yeni = secimiDegistir(secenekler, birimler, onceki, sira, deger, tercih, acik);
    return degisenSecimler(secenekler, birimler, onceki, yeni, tercih, sira);
  };

  it("tükenmiş değer seçilemezken başka değere geçilince neden ve iki değer söylenir", () => {
    expect(degisen(["siyah", "m"], 0, "beyaz")).toEqual([
      { secenek: "Beden", eski: "M", yeni: "S", neden: "tukendi" },
    ]);
    expect(degisen(["siyah", "l"], 0, "beyaz")).toEqual([
      { secenek: "Beden", eski: "L", yeni: "S", neden: "yok" },
    ]);
  });

  it("tükenmiş değer seçilebilirken değer korunur, yalnız birleşimi olmayan değer söylenir", () => {
    expect(degisen(["siyah", "m"], 0, "beyaz", true)).toEqual([]);
    expect(degisen(["siyah", "l"], 0, "beyaz", true)).toEqual([
      { secenek: "Beden", eski: "L", yeni: "S", neden: "yok" },
    ]);
  });

  it("değer değişmediyse, seçilen seçenekte ve önceki seçimde zaten başka değerdeyse söylenmez", () => {
    expect(degisen(["beyaz", "s"], 0, "siyah", true)).toEqual([]);
    expect(degisen(["siyah", "m"], 0, "beyaz", false).length).toBe(1);
    // Tercih L, seçim zaten S'de (önceki değişiklikte söylendi): aynı renge yeniden basınca tekrar söylenmez.
    const yeni = secimiDegistir(secenekler, birimler, ["beyaz", "s"], 0, "beyaz", ["beyaz", "l"]);
    expect(degisenSecimler(secenekler, birimler, ["beyaz", "s"], yeni, ["beyaz", "l"], 0)).toEqual(
      [],
    );
    // Seçilmemiş sonraki seçenek söylenmez.
    expect(degisen([undefined, undefined], 0, "siyah")).toEqual([]);
  });
});

describe("seçimi değiştirmek", () => {
  it("sonraki seçimde satılamayan değer ilk satılabilir değere geçer", () => {
    // Siyah-L seçiliyken Beyaz'a geçilince Beyaz'da L yok: S'ye geçer.
    expect(secimiDegistir(secenekler, birimler, ["siyah", "l"], 0, "beyaz")).toEqual([
      "beyaz",
      "s",
    ]);
    // Beyaz-S seçiliyken Siyah'a geçilince Siyah-S tükenmiş: M'ye geçer.
    expect(secimiDegistir(secenekler, birimler, ["beyaz", "s"], 0, "siyah")).toEqual([
      "siyah",
      "m",
    ]);
    // Satılabilir kalan sonraki seçim korunur.
    expect(secimiDegistir(secenekler, birimler, ["beyaz", "m"], 0, "siyah")).toEqual([
      "siyah",
      "m",
    ]);
    // Seçilmemiş sonraki seçenek seçilmemiş kalır.
    expect(secimiDegistir(secenekler, birimler, [undefined, undefined], 0, "siyah")).toEqual([
      "siyah",
      undefined,
    ]);
  });

  it("müşterinin elle seçtiği değer, satılabilir olduğu renge dönünce geri gelir", () => {
    // Siyah-L seçili; Beyaz'da L yok, S'ye geçer. Siyah'a dönünce tercih (L) geri gelir.
    const tercih = ["siyah", "l"];
    const beyaz = secimiDegistir(secenekler, birimler, ["siyah", "l"], 0, "beyaz", tercih);
    expect(beyaz).toEqual(["beyaz", "s"]);
    expect(secimiDegistir(secenekler, birimler, beyaz, 0, "siyah", tercih)).toEqual(["siyah", "l"]);
  });

  it("tükenmiş ya da olmayan değer seçilemez, seçim aynen kalır", () => {
    const secim = ["beyaz", "s"];
    expect(secimiDegistir(secenekler, birimler, secim, 1, "m")).toBe(secim);
    expect(secimiDegistir(secenekler, birimler, secim, 1, "l")).toBe(secim);
  });

  it("bütün seçeneklerde değer seçiliyse seçili birim o birleşimdir", () => {
    expect(seciliBirim(birimler, ["siyah", "m"], 2)?.kimlik).toBe("siyah-m");
    expect(seciliBirim(birimler, ["siyah", undefined], 2)).toBeUndefined();
    // Seçeneksiz (basit) ürünün tek birimi her zaman seçilidir.
    expect(seciliBirim([{ kimlik: "tek", degerler: [], satilabilir: true }], [], 0)?.kimlik).toBe(
      "tek",
    );
  });
});

describe("ilk seçim", () => {
  it("ayar ilk-satilabilir: birimlerin sırasında ilk satılabilir birleşim", () => {
    expect(ilkSecim(secenekler, birimler, {}, "ilk-satilabilir")).toEqual(["beyaz", "s"]);
    const ilkiBitti = [birimler[1], birimler[0], ...birimler.slice(2)] as SecimBirimi[];
    expect(ilkSecim(secenekler, ilkiBitti, {}, "ilk-satilabilir")).toEqual(["beyaz", "s"]);
  });

  it("ayar secimsiz: hiçbir değer seçili değil", () => {
    expect(ilkSecim(secenekler, birimler, {}, "secimsiz")).toEqual([undefined, undefined]);
  });

  it("adresteki tam ve var olan birleşim önce gelir, tükenmiş olsa da", () => {
    const sorgu = { "secenek-renk": "siyah", "secenek-beden": "s" };
    expect(ilkSecim(secenekler, birimler, sorgu, "ilk-satilabilir")).toEqual(["siyah", "s"]);
    expect(ilkSecim(secenekler, birimler, sorgu, "secimsiz")).toEqual(["siyah", "s"]);
  });

  it("adresteki eksik seçime uyan ilk satılabilir birleşim; secimsiz ayarda adresteki değerler", () => {
    const sorgu = { "secenek-renk": "siyah" };
    expect(ilkSecim(secenekler, birimler, sorgu, "ilk-satilabilir")).toEqual(["siyah", "m"]);
    expect(ilkSecim(secenekler, birimler, sorgu, "secimsiz")).toEqual(["siyah", "m"]);
  });

  it("adresteki tanınmayan değer ve olmayan birleşim yok sayılır", () => {
    expect(ilkSecim(secenekler, birimler, { "secenek-renk": "mor" }, "secimsiz")).toEqual([
      undefined,
      undefined,
    ]);
    expect(
      ilkSecim(secenekler, birimler, { "secenek-renk": "beyaz", "secenek-beden": "l" }, "secimsiz"),
      // Beyaz-L yok: L düşer, Beyaz'a uyan ilk satılabilir birleşim seçilir (eksik adresteki gibi).
    ).toEqual(["beyaz", "s"]);
    expect(
      ilkSecim(
        secenekler,
        birimler,
        { "secenek-renk": "beyaz", "secenek-beden": "l" },
        "ilk-satilabilir",
      ),
    ).toEqual(["beyaz", "s"]);
    // Uyumsuz sonraki değer düşer, önceki korunur: Beyaz-L yok, Beyaz kalır.
    expect(
      ilkSecim(
        secenekler,
        birimler,
        { "secenek-renk": "siyah", "secenek-beden": "x" },
        "ilk-satilabilir",
      ),
    ).toEqual(["siyah", "m"]);
    // Satılabilir birleşim yoksa (secimsiz): adresin uyumlu değerleri kalır, uyumsuzu düşer.
    const hepsiBitti = birimler.map((b) => ({ ...b, satilabilir: false }));
    expect(
      ilkSecim(
        secenekler,
        hepsiBitti,
        { "secenek-renk": "beyaz", "secenek-beden": "l" },
        "secimsiz",
      ),
    ).toEqual(["beyaz", undefined]);
    // Birden çok değer: ilki okunur.
    expect(
      ilkSecim(secenekler, birimler, { "secenek-renk": ["siyah", "beyaz"] }, "ilk-satilabilir"),
    ).toEqual(["siyah", "m"]);
  });

  it("seçeneksiz ürün: seçim boş", () => {
    expect(
      ilkSecim([], [{ kimlik: "tek", degerler: [], satilabilir: true }], {}, "secimsiz"),
    ).toEqual([]);
  });
});

describe("adres", () => {
  it("seçim okunur anahtarlarla yazılır, seçilmeyen seçenek yazılmaz", () => {
    expect(secimdenSorgu(secenekler, ["siyah", "m"])).toBe("?secenek-renk=siyah&secenek-beden=m");
    expect(secimdenSorgu(secenekler, [undefined, "m"])).toBe("?secenek-beden=m");
    expect(secimdenSorgu(secenekler, [undefined, undefined])).toBe("");
  });

  it("adresin öteki parametreleri korunur, eski seçenek parametreleri yeniden yazılır", () => {
    expect(
      secimdenSorgu(
        secenekler,
        ["beyaz", undefined],
        "?utm_source=x&secenek-beden=l&secenek-renk=siyah",
      ),
    ).toBe("?utm_source=x&secenek-renk=beyaz");
  });

  it("yazılan adres yeniden okununca aynı seçim gelir", () => {
    const sorgu = Object.fromEntries(
      new URLSearchParams(secimdenSorgu(secenekler, ["siyah", "l"]).slice(1)),
    );
    expect(ilkSecim(secenekler, birimler, sorgu, "secimsiz")).toEqual(["siyah", "l"]);
  });

  it("çakışan anahtarlar sıra numarasıyla tekilleşir", () => {
    expect(tekilAnahtarlar(["sal", "sal", "sal-2", "kirmizi"])).toEqual([
      "sal",
      "sal-2",
      "sal-2-2",
      "kirmizi",
    ]);
  });
});
