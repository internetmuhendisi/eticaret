// Geri yükleme akışının hata yolları (kart 0024, karar 0037). Sunucu sahte ssh ile canlandırılır ve
// veritabanlarının durumu izlenir. Her adım sırayla bozulur: akış nerede durursa dursun gerçek veri
// bir yerde kalmalı, site açık kalmalı ve söylenen şey doğru olmalı.
import { beforeEach, describe, expect, it, vi } from "vitest";

type Durum = {
  canli: string | null;
  eski: string | null;
  yan: string | null;
  kutu: "acik" | "kapali";
  cagrilar: string[];
  bozuk: Set<string>;
  sifreEsit: boolean;
};

const durum: Durum = {
  canli: null,
  eski: null,
  yan: null,
  kutu: "acik",
  cagrilar: [],
  bozuk: new Set(),
  sifreEsit: true,
};

const etiket = (metin: string): string => {
  const kural: [RegExp, string][] = [
    [/# adim:(\w+)/, "$1"],
    [/gece\.sh deneme/, "yedek"],
    [/mkdir \/srv\/altyapi\/yayin\/\.kilit/, "kilit-al"],
    [/rm -rf \/srv\/altyapi\/yayin\/\.kilit/, "kilit-birak"],
    [/__basarisiz'\)/, "artik"],
    [/for d in/, "yayindakiler"],
    [/openssl rand/, "uret"],
    [/docker ps -aq/, "kutu-durumu"],
    [/-v ad=/, "esitle"],
    [/Config\.Image/, "goruntu"],
    [/guncelle\.mjs/, "guncelle"],
    [/docker restart/, "yeniden"],
    [/\bkayit deneme\b/, "kayit"],
  ];
  for (const [kalip, ad] of kural) {
    const eslesme = metin.match(kalip);
    if (eslesme) return ad === "$1" ? (eslesme[1] as string) : ad;
  }
  throw new Error(`Tanınmayan betik: ${metin.slice(0, 120)}`);
};

const cevap = (status: number, stdout = "", stderr = "") => ({ status, stdout, stderr });

const sahteSsh = (_ip: string, komut: string, secenek?: { girdi?: string }) => {
  const ad = etiket(secenek?.girdi ?? komut);
  durum.cagrilar.push(ad);
  if (durum.bozuk.has(ad)) {
    // Bir kerelik: geri dönüş yolundaki aynı adım çalışabilsin.
    durum.bozuk.delete(ad);
    return cevap(1, "", `SAHTE-HATA ${ad}`);
  }
  switch (ad) {
    case "artik":
      return cevap(0, durum.eski ? "site_ornek_magaza__eski\n" : "");
    case "yayindakiler":
      return cevap(0, "ornek-magaza 6\n");
    case "yana":
      durum.yan = "yedek";
      return cevap(0, "tablo=2\n");
    case "durdur":
      durum.kutu = "kapali";
      return cevap(0);
    case "yedek":
      return cevap(0, "yedeklendi\n");
    case "degistir":
      durum.eski = durum.canli;
      durum.canli = durum.yan;
      durum.yan = null;
      return cevap(0, "degisti\n");
    case "gerial":
      if (!durum.eski) return cevap(1, "", "eski yok");
      durum.canli = durum.eski;
      durum.eski = null;
      return cevap(0, "geri-alindi\n");
    case "eskisil":
      durum.eski = null;
      return cevap(0);
    case "uret":
      durum.sifreEsit = false;
      return cevap(0, "yenilendi\n");
    case "kutu-durumu":
      return cevap(0, "true\n");
    case "esitle":
      durum.sifreEsit = true;
      return cevap(0, "açıldı\n");
    case "goruntu":
      return cevap(0, "altyapi-yayin:6\n");
    case "guncelle":
      return cevap(0, "guncellendi\n");
    case "yeniden":
      durum.kutu = "acik";
      return cevap(0);
    default:
      return cevap(0);
  }
};

vi.mock("../sunucu.mts", async (asil) => ({
  ...(await asil<typeof import("../sunucu.mts")>()),
  sshKomutu: (ip: string, komut: string, secenek?: { girdi?: string }) =>
    sahteSsh(ip, komut, secenek),
}));

const { eskiyeDon, geriYukle } = await import("../yedek.mts");

const anahtar = `AGE-SECRET-KEY-1${"Q".repeat(58)}`;
const dosya = "20261106T000000Z.dump.age";
const calistir = () =>
  geriYukle("0.0.0.0", "deneme", { kodAdi: "ornek-magaza", numara: 1 }, dosya, anahtar);

beforeEach(() => {
  Object.assign(durum, {
    canli: "gercek",
    eski: null,
    yan: null,
    kutu: "acik",
    cagrilar: [],
    bozuk: new Set(),
    sifreEsit: true,
  });
});

describe("başarılı geri yükleme", () => {
  it("sıra doğru: yana aç, kutuyu durdur, son yedek, yer değiştir, şifre, aç, sağlık, sil", async () => {
    await calistir();
    const sira = durum.cagrilar.filter((ad) =>
      ["yana", "durdur", "yedek", "degistir", "uret", "yeniden", "saglik", "eskisil"].includes(ad),
    );
    expect(sira).toEqual([
      "yana",
      "durdur",
      "yedek",
      "degistir",
      "uret",
      "yeniden",
      "saglik",
      "eskisil",
    ]);
    expect(durum).toMatchObject({ canli: "yedek", eski: null, kutu: "acik", sifreEsit: true });
    expect(durum.cagrilar.at(-1)).toBe("kilit-birak");
  });
});

describe("yer değiştirmeden önce hata: veri değişmez, site açık kalır", () => {
  it.each(["yana", "durdur", "yedek", "degistir"])("%s bozulursa", async (ad) => {
    durum.bozuk.add(ad);
    await expect(calistir()).rejects.toThrow(/SAHTE-HATA/);
    expect(durum.canli).toBe("gercek");
    expect(durum.eski).toBeNull();
    expect(durum.kutu).toBe("acik");
    expect(durum.cagrilar).not.toContain("uret");
    expect(durum.cagrilar).not.toContain("gerial");
    expect(durum.cagrilar).not.toContain("eskisil");
  });

  it("kutu açılamazsa asıl hata da söylenir", async () => {
    durum.bozuk.add("degistir");
    durum.bozuk.add("yeniden");
    await expect(calistir()).rejects.toThrow(/site açılamadı.*\n.*Asıl hata.*degistir/);
    expect(durum.canli).toBe("gercek");
  });
});

describe("yer değiştirmeden sonra hata: eski veri yerine döner", () => {
  it.each(["uret", "esitle", "goruntu", "guncelle", "yeniden", "saglik"])(
    "%s bozulursa",
    async (ad) => {
      durum.bozuk.add(ad);
      await expect(calistir()).rejects.toThrow(/eski veritabanı yerinde, site açık/);
      expect(durum).toMatchObject({ canli: "gercek", eski: null, kutu: "acik", sifreEsit: true });
      // Geri dönüşte şifre yeniden eşitlenir ve sağlık ölçülür.
      const geri = durum.cagrilar.slice(durum.cagrilar.indexOf("gerial"));
      expect(geri).toEqual(expect.arrayContaining(["esitle", "yeniden", "saglik"]));
      expect(durum.cagrilar).not.toContain("eskisil");
    },
  );

  it("geri alma da tutmazsa gerçek verinin yeri söylenir, silinmez", async () => {
    durum.bozuk.add("uret");
    durum.bozuk.add("gerial");
    await expect(calistir()).rejects.toThrow(/site_ornek_magaza__eski.*silmeyin/);
    expect(durum.eski).toBe("gercek");
    expect(durum.cagrilar).not.toContain("eskisil");
  });
});

describe("dönüşü olmayan noktadan sonra hata: yeni hâl korunur", () => {
  it("eski silinemezse geri dönülmez, artık kalır", async () => {
    durum.bozuk.add("eskisil");
    await calistir();
    expect(durum).toMatchObject({ canli: "yedek", eski: "gercek", kutu: "acik" });
    expect(durum.cagrilar).not.toContain("gerial");
  });

  it("sonuç kayda yazılamazsa geri dönülmez, eski yine silinir", async () => {
    // Kaydın başarısız olması tek veritabanını da silen eski hatayı tetiklememeli.
    durum.bozuk.add("kayit");
    await calistir();
    expect(durum).toMatchObject({ canli: "yedek", eski: null, kutu: "acik" });
    expect(durum.cagrilar).not.toContain("gerial");
  });
});

describe("yarım kalmış işten sonra", () => {
  it("__eski varsa hiçbir şeye dokunmadan durur", async () => {
    Object.assign(durum, { canli: "yedek", eski: "gercek" });
    await expect(calistir()).rejects.toThrow(/yarım kalmış.*--eskiye-don/s);
    expect(durum).toMatchObject({ canli: "yedek", eski: "gercek" });
    expect(durum.cagrilar).not.toContain("yana");
    expect(durum.cagrilar).not.toContain("yedek");
  });

  it("--eskiye-don gerçek veriyi geri koyar", async () => {
    Object.assign(durum, { canli: "yedek", eski: "gercek", kutu: "kapali", sifreEsit: false });
    await eskiyeDon("0.0.0.0", "deneme", "ornek-magaza");
    expect(durum).toMatchObject({ canli: "gercek", eski: null, kutu: "acik", sifreEsit: true });
  });

  it("__eski yoksa --eskiye-don eldeki veriyi silmez", async () => {
    await expect(eskiyeDon("0.0.0.0", "deneme", "ornek-magaza")).rejects.toThrow();
    expect(durum.canli).toBe("gercek");
  });
});

describe("ortam", () => {
  it("canlı ortamda geri yükleme hiçbir şeye dokunmadan reddedilir", async () => {
    await expect(
      geriYukle("0.0.0.0", "canli", { kodAdi: "ornek-magaza", numara: 1 }, dosya, anahtar),
    ).rejects.toThrow(/yalnız deneme/);
    expect(durum.cagrilar).not.toContain("yana");
  });
});
