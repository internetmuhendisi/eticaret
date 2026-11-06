// Geri yükleme akışının hata yolları (kart 0024, karar 0037). Sunucu sahte ssh ile canlandırılır,
// veritabanlarının ve kutunun durumu izlenir. Her adım iki biçimde bozulur: hiç olmadan düşer ya da
// işini bitirip bağlantı kopar. Akış nerede durursa dursun gerçek veri bir yerde kalmalı, site yanlış
// veriyle açılmamalı ve söylenen şey doğru olmalı.
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Durum = {
  canli: string | null;
  eski: string | null;
  yan: string | null;
  basarisiz: string | null;
  kutu: "acik" | "kapali";
  cagrilar: string[];
  bozuk: Set<string>;
  koptu: Set<string>;
  kalici: Set<string>;
  sonraBozuk: { ad: string; kacinci: number } | null;
  sifreEsit: boolean;
  yanlisVeriyleAcildi: boolean;
  yedeksiz: boolean;
};

const durum = {} as Durum;

const etiket = (metin: string): string => {
  const kural: [RegExp, string][] = [
    [/# adim:(\w+)/, "$1"],
    [/gece\.sh deneme/, "yedek"],
    [/mkdir \/srv\/altyapi\/yayin\/\.kilit/, "kilit-al"],
    [/rm -rf \/srv\/altyapi\/yayin\/\.kilit/, "kilit-birak"],
    [/for d in/, "yayindakiler"],
    [/openssl rand/, "uret"],
    [/docker ps -aq/, "kutu-durumu"],
    [/-v ad=/, "esitle"],
    [/Config\.Image/, "goruntu"],
    [/guncelle\.mjs/, "guncelle"],
    [/docker restart/, "yeniden"],
    [/\bkayit deneme\b/, "kayit"],
    [/sudo cat \/srv\/altyapi\/yedek\/kayit\.jsonl/, "kayit-oku"],
  ];
  for (const [kalip, ad] of kural) {
    const eslesme = metin.match(kalip);
    if (eslesme) return ad === "$1" ? (eslesme[1] as string) : ad;
  }
  throw new Error(`Tanınmayan betik: ${metin.slice(0, 120)}`);
};

const cevap = (status: number, stdout = "", stderr = "") => ({ status, stdout, stderr });

// Adımın sunucudaki etkisi.
const uygula = (ad: string): ReturnType<typeof cevap> => {
  const d = durum;
  switch (ad) {
    case "durum":
      return cevap(
        0,
        [
          d.canli && "site_ornek_magaza",
          d.eski && "site_ornek_magaza__eski",
          d.yan && "site_ornek_magaza__geri",
          d.basarisiz && "site_ornek_magaza__basarisiz",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    case "yayindakiler":
      return cevap(0, "ornek-magaza 6\n");
    case "yana":
      d.yan = "yedek";
      return cevap(0, "tablo=2\n");
    case "yanisil":
      d.yan = null;
      return cevap(0);
    case "durdur":
      d.kutu = "kapali";
      return cevap(0);
    case "yedek":
      return cevap(0, "yedeklendi\n");
    case "degistir":
      d.eski = d.canli;
      d.canli = d.yan;
      d.yan = null;
      return cevap(0, "degisti\n");
    case "gerial":
      if (!d.eski) return cevap(1, "", "eski yok");
      d.canli = d.eski;
      d.eski = null;
      return cevap(0, "geri-alindi\n");
    case "eskisil":
      d.eski = null;
      d.basarisiz = null;
      d.yan = null;
      return cevap(0);
    case "artiksil":
      d.basarisiz = null;
      d.yan = null;
      return cevap(0);
    case "uret":
      d.sifreEsit = false;
      return cevap(0, "yenilendi\n");
    case "kutu-durumu":
      return cevap(0, "true\n");
    case "esitle":
      d.sifreEsit = true;
      return cevap(0, "açıldı\n");
    case "goruntu":
      return cevap(0, "altyapi-yayin:6\n");
    case "guncelle":
      return cevap(0, "guncellendi\n");
    case "calisiyor":
      return cevap(0, d.kutu === "acik" ? "true\n" : "false\n");
    case "saglik":
      return d.kutu === "acik" ? cevap(0, "saglikli\n") : cevap(1, "", "kutu kapalı");
    case "yeniden":
      d.kutu = "acik";
      // Site, gerçek veri yerindeyken ya da yeni hâl bilerek tamamlanırken açılmalı.
      if (d.canli !== "gercek" && !d.cagrilar.includes("uret")) d.yanlisVeriyleAcildi = true;
      return cevap(0);
    default:
      return cevap(0);
  }
};

const sahteSsh = (_ip: string, komut: string, secenek?: { girdi?: string }) => {
  const ad = etiket(secenek?.girdi ?? komut);
  durum.cagrilar.push(ad);
  const sonra = durum.sonraBozuk;
  if (sonra?.ad === ad && durum.cagrilar.filter((c) => c === ad).length >= sonra.kacinci) {
    return cevap(1, "", `SAHTE-HATA ${ad}`);
  }
  if (durum.kalici.has(ad)) return cevap(1, "", `SAHTE-HATA ${ad}`);
  if (durum.bozuk.has(ad)) {
    durum.bozuk.delete(ad);
    return cevap(1, "", `SAHTE-HATA ${ad}`);
  }
  const sonuc = uygula(ad);
  if (ad === "kayit" && /son-yedeksiz/.test(secenek?.girdi ?? "")) durum.yedeksiz = true;
  if (ad === "kayit-oku" && durum.yedeksiz) {
    return cevap(
      0,
      `${JSON.stringify({ ortam: "deneme", site: "ornek-magaza", tur: "geri-yukleme", sebep: "son-yedeksiz" })}\n`,
    );
  }
  if (durum.koptu.has(ad)) {
    durum.koptu.delete(ad);
    return cevap(255, "", `SAHTE-KOPMA ${ad}`);
  }
  return sonuc;
};

vi.mock("../sunucu.mts", async (asil) => ({
  ...(await asil<typeof import("../sunucu.mts")>()),
  sshKomutu: (ip: string, komut: string, secenek?: { girdi?: string }) =>
    sahteSsh(ip, komut, secenek),
}));

const { eskiyeDon, eskiyiSil, geriYuklemeSecimi, geriYukle } = await import("../yedek.mts");

const anahtar = `AGE-SECRET-KEY-1${"Q".repeat(58)}`;
const dosya = "20261106T000000Z.dump.age";
const site = { kodAdi: "ornek-magaza", numara: 1 };
const calistir = () => geriYukle("0.0.0.0", "deneme", site, dosya, anahtar);

beforeEach(() => {
  Object.assign(durum, {
    canli: "gercek",
    eski: null,
    yan: null,
    basarisiz: null,
    kutu: "acik",
    cagrilar: [],
    bozuk: new Set(),
    koptu: new Set(),
    kalici: new Set(),
    sonraBozuk: null,
    sifreEsit: true,
    yanlisVeriyleAcildi: false,
    yedeksiz: false,
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

describe("yer değiştirmeden önce hata: veri değişmez, site açık kalır, yan veritabanı kalmaz", () => {
  it.each(["yana", "durdur", "yedek", "degistir"])("%s düşerse", async (ad) => {
    durum.bozuk.add(ad);
    await expect(calistir()).rejects.toThrow(/SAHTE-HATA/);
    expect(durum).toMatchObject({ canli: "gercek", eski: null, yan: null, kutu: "acik" });
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

describe("yer değiştirme bitip bağlantı koparsa", () => {
  it("'veri değişmedi' denmez, eski veri yerine döner", async () => {
    durum.koptu.add("degistir");
    await expect(calistir()).rejects.toThrow(/eski veritabanı yerinde, site açık/);
    expect(durum).toMatchObject({ canli: "gercek", eski: null, kutu: "acik", sifreEsit: true });
    expect(durum.yanlisVeriyleAcildi).toBe(false);
  });

  it("durum okunamazsa site kapalı kalır, açılmaz", async () => {
    durum.koptu.add("degistir");
    // İlk okuma (artık denetimi) geçer, yer değiştirmeden sonraki okuma düşer.
    durum.sonraBozuk = { ad: "durum", kacinci: 2 };
    await expect(calistir()).rejects.toThrow(/durumu okunamadı[\s\S]*Site kapalı bırakıldı/);
    expect(durum.kutu).toBe("kapali");
    expect(durum.yanlisVeriyleAcildi).toBe(false);
    expect(durum.cagrilar).not.toContain("yeniden");
  });
});

describe("yer değiştirmeden sonra hata: eski veri yerine döner", () => {
  it.each(["uret", "esitle", "goruntu", "guncelle", "yeniden", "saglik"])(
    "%s düşerse",
    async (ad) => {
      durum.bozuk.add(ad);
      await expect(calistir()).rejects.toThrow(/eski veritabanı yerinde, site açık/);
      expect(durum).toMatchObject({ canli: "gercek", eski: null, kutu: "acik", sifreEsit: true });
      const geri = durum.cagrilar.slice(durum.cagrilar.indexOf("gerial"));
      expect(geri).toEqual(expect.arrayContaining(["esitle", "yeniden", "saglik"]));
      expect(durum.cagrilar).not.toContain("eskisil");
    },
  );

  it("sağlık kalıcı bozuksa dönüş tamamlanmadı denir, veri yine yerindedir", async () => {
    durum.kalici.add("saglik");
    await expect(calistir()).rejects.toThrow(/dönüş tamamlanmadı[\s\S]*site açılamadı/);
    expect(durum.canli).toBe("gercek");
    expect(durum.eski).toBeNull();
  });

  it("geri alma da tutmazsa site açılmaz, gerçek verinin yeri söylenir, silinmez", async () => {
    durum.bozuk.add("uret");
    durum.kalici.add("gerial");
    await expect(calistir()).rejects.toThrow(
      /site_ornek_magaza__eski[\s\S]*silmeyin[\s\S]*site kapalı bırakıldı/,
    );
    expect(durum).toMatchObject({ eski: "gercek", kutu: "kapali" });
    expect(durum.cagrilar).not.toContain("eskisil");
    expect(durum.cagrilar.filter((ad) => ad === "yeniden")).toEqual([]);
  });

  it("kutu durdurulamadıysa 'kapalı' denmez", async () => {
    durum.bozuk.add("uret");
    durum.kalici.add("gerial");
    // İlk durdurma geçer, geri dönüşteki durdurma düşer.
    durum.sonraBozuk = { ad: "durdur", kacinci: 2 };
    await expect(calistir()).rejects.toThrow(/sitenin durumu bilinmiyor/);
  });

  it("geri alma bitip bağlantı koparsa dönüş başarılı sayılır, site açılır", async () => {
    durum.bozuk.add("uret");
    durum.koptu.add("gerial");
    await expect(calistir()).rejects.toThrow(/eski veritabanı yerinde, site açık/);
    expect(durum).toMatchObject({ canli: "gercek", eski: null, kutu: "acik", sifreEsit: true });
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
    durum.bozuk.add("kayit");
    await calistir();
    expect(durum).toMatchObject({ canli: "yedek", eski: null, kutu: "acik" });
    expect(durum.cagrilar).not.toContain("gerial");
  });
});

describe("yarım kalmış işten sonra", () => {
  it("__eski varsa hiçbir şeye dokunmadan durur, iki yolu da söyler", async () => {
    Object.assign(durum, { canli: "yedek", eski: "gercek" });
    await expect(calistir()).rejects.toThrow(/yarım kalmış[\s\S]*--eskiye-don[\s\S]*--eskiyi-sil/);
    expect(durum).toMatchObject({ canli: "yedek", eski: "gercek" });
    expect(durum.cagrilar).not.toContain("yana");
    expect(durum.cagrilar).not.toContain("yedek");
  });

  it("yalnız __basarisiz varsa --eskiye-don önerilmez", async () => {
    durum.basarisiz = "yedek";
    const hata = await calistir().catch((h: Error) => h.message);
    expect(hata).toContain("--eskiyi-sil");
    expect(hata).not.toContain("--eskiye-don");
  });

  it("--eskiye-don kutuyu durdurur, şu anki hâlin yedeğini alır, gerçek veriyi koyar", async () => {
    Object.assign(durum, { canli: "yedek", eski: "gercek", kutu: "acik", sifreEsit: false });
    await eskiyeDon("0.0.0.0", "deneme", "ornek-magaza");
    expect(durum).toMatchObject({ canli: "gercek", eski: null, kutu: "acik", sifreEsit: true });
    const { cagrilar } = durum;
    expect(cagrilar.indexOf("durdur")).toBeLessThan(cagrilar.indexOf("yedek"));
    expect(cagrilar.indexOf("yedek")).toBeLessThan(cagrilar.indexOf("gerial"));
  });

  it("--eskiye-don: yedek alınamazsa dönmez, açık kutu önceki durumuna döner", async () => {
    Object.assign(durum, { canli: "yedek", eski: "gercek" });
    durum.bozuk.add("yedek");
    await expect(eskiyeDon("0.0.0.0", "deneme", "ornek-magaza")).rejects.toThrow(/dönülmedi/);
    expect(durum).toMatchObject({ canli: "yedek", eski: "gercek", kutu: "acik" });
  });

  it("--eskiye-don: yedek alınamazsa kapalı site yanlış veriyle açılmaz", async () => {
    Object.assign(durum, { canli: "yedek", eski: "gercek", kutu: "kapali" });
    durum.bozuk.add("yedek");
    await expect(eskiyeDon("0.0.0.0", "deneme", "ornek-magaza")).rejects.toThrow(
      /dönülmedi[\s\S]*Site kapalı kaldı/,
    );
    expect(durum).toMatchObject({ canli: "yedek", eski: "gercek", kutu: "kapali" });
    expect(durum.cagrilar).not.toContain("yeniden");
  });

  it("--eskiye-don: yedek alınamaz ve site açılamazsa iki hata da söylenir", async () => {
    Object.assign(durum, { canli: "yedek", eski: "gercek" });
    durum.bozuk.add("yedek");
    durum.bozuk.add("yeniden");
    await expect(eskiyeDon("0.0.0.0", "deneme", "ornek-magaza")).rejects.toThrow(
      /dönülmedi[\s\S]*yeniden açılamadı/,
    );
  });

  it("--eskiye-don: canlı yoksa yedek atlanır, önceki veri yerine gelir", async () => {
    Object.assign(durum, { canli: null, eski: "gercek", kutu: "kapali" });
    await eskiyeDon("0.0.0.0", "deneme", "ornek-magaza");
    expect(durum).toMatchObject({ canli: "gercek", eski: null, kutu: "acik" });
    expect(durum.cagrilar).not.toContain("yedek");
  });

  it("--eskiye-don: __eski yoksa veriye dokunmaz, açık kutuya da", async () => {
    await eskiyeDon("0.0.0.0", "deneme", "ornek-magaza");
    expect(durum.canli).toBe("gercek");
    expect(durum.cagrilar).not.toContain("durdur");
    expect(durum.cagrilar).not.toContain("yeniden");
    expect(durum.cagrilar).not.toContain("gerial");
  });

  it("--eskiye-don: __eski yok ama site kapalı kaldıysa açar", async () => {
    Object.assign(durum, { kutu: "kapali", sifreEsit: false });
    await eskiyeDon("0.0.0.0", "deneme", "ornek-magaza");
    expect(durum).toMatchObject({ canli: "gercek", kutu: "acik", sifreEsit: true });
  });

  it("--eskiyi-sil: __eski yok ama site kapalı kaldıysa açar", async () => {
    durum.kutu = "kapali";
    await eskiyiSil("0.0.0.0", "deneme", site);
    expect(durum).toMatchObject({ canli: "gercek", kutu: "acik" });
  });

  it("--eskiyi-sil yeni hâli tamamlar, sağlıklıysa önceki veriyi siler", async () => {
    Object.assign(durum, { canli: "yedek", eski: "gercek", kutu: "kapali", sifreEsit: false });
    await eskiyiSil("0.0.0.0", "deneme", site);
    expect(durum).toMatchObject({ canli: "yedek", eski: null, kutu: "acik", sifreEsit: true });
    expect(durum.cagrilar.indexOf("saglik")).toBeLessThan(durum.cagrilar.indexOf("eskisil"));
  });

  it("--eskiyi-sil: yeni hâl sağlıksızsa önceki veri silinmez", async () => {
    Object.assign(durum, { canli: "yedek", eski: "gercek", kutu: "kapali" });
    durum.kalici.add("saglik");
    await expect(eskiyiSil("0.0.0.0", "deneme", site)).rejects.toThrow(/SAHTE-HATA/);
    expect(durum.eski).toBe("gercek");
  });

  it("--eskiyi-sil: önceki veri yoksa yalnız artıkları siler, canlıya ve kutuya dokunmaz", async () => {
    Object.assign(durum, { basarisiz: "yedek", yan: "yedek" });
    await eskiyiSil("0.0.0.0", "deneme", site);
    expect(durum).toMatchObject({ canli: "gercek", basarisiz: null, yan: null });
    expect(durum.cagrilar).toContain("artiksil");
    expect(durum.cagrilar).not.toContain("eskisil");
    expect(durum.cagrilar).not.toContain("uret");
  });
});

describe("veritabanı bozuksa", () => {
  it("son yedek alınamazsa komut durur, site açık kalır", async () => {
    durum.bozuk.add("yedek");
    await expect(calistir()).rejects.toThrow(/veri değişmedi, site açık/);
    expect(durum.canli).toBe("gercek");
  });

  it("--son-yedeksiz yedeği atlar, geri yükler, önceki veriyi silmez", async () => {
    await geriYukle("0.0.0.0", "deneme", site, dosya, anahtar, undefined, { sonYedeksiz: true });
    expect(durum).toMatchObject({ canli: "yedek", eski: "gercek", kutu: "acik" });
    expect(durum.cagrilar).not.toContain("yedek");
    expect(durum.cagrilar).not.toContain("eskisil");
  });

  it("sonraki geri yükleme önceki verinin yedeği olmadığını söyler", async () => {
    await geriYukle("0.0.0.0", "deneme", site, dosya, anahtar, undefined, { sonYedeksiz: true });
    await expect(calistir()).rejects.toThrow(/YEDEĞİ YOK[\s\S]*--yedeksiz-onay/);
    expect(durum.eski).toBe("gercek");
  });

  it("--eskiyi-sil yedeği olmayan veriyi ayrı onay olmadan silmez", async () => {
    await geriYukle("0.0.0.0", "deneme", site, dosya, anahtar, undefined, { sonYedeksiz: true });
    await expect(eskiyiSil("0.0.0.0", "deneme", site)).rejects.toThrow(/yedeği yok/);
    expect(durum.eski).toBe("gercek");
    await eskiyiSil("0.0.0.0", "deneme", site, undefined, { yedeksizOnay: true });
    expect(durum.eski).toBeNull();
  });
});

describe("ortam", () => {
  it("canlı ortamda geri yükleme hiçbir şeye dokunmadan reddedilir", async () => {
    await expect(geriYukle("0.0.0.0", "canli", site, dosya, anahtar)).rejects.toThrow(
      /yalnız deneme/,
    );
    expect(durum.cagrilar).not.toContain("yana");
  });
});

describe("komut satırı", () => {
  it("seçenekler ayrılır, tanınmayan reddedilir", () => {
    expect(geriYuklemeSecimi(["a", "deneme"])).toBe("geri-yukle");
    expect(geriYuklemeSecimi(["a", "deneme", "--dosya=x", "--onay=y"])).toBe("geri-yukle");
    expect(geriYuklemeSecimi(["a", "deneme", "--eskiye-don"])).toBe("eskiye-don");
    expect(geriYuklemeSecimi(["a", "deneme", "--eskiyi-sil"])).toBe("eskiyi-sil");
    expect(geriYuklemeSecimi(["a", "deneme", "--son-yedeksiz"])).toBe("geri-yukle");
    expect(() => geriYuklemeSecimi(["--eskiye-don", "--son-yedeksiz"])).toThrow(/birlikte/);
    expect(geriYuklemeSecimi(["--eskiyi-sil", "--yedeksiz-onay"])).toBe("eskiyi-sil");
    expect(() => geriYuklemeSecimi(["--yedeksiz-onay"])).toThrow(/yalnız/);
    expect(() => geriYuklemeSecimi(["--eskiye-dön"])).toThrow(/Bilinmeyen/);
    expect(() => geriYuklemeSecimi(["--eskiye-don", "--eskiyi-sil"])).toThrow(/birlikte/);
    expect(() => geriYuklemeSecimi(["--eskiye-don", "--dosya=x"])).toThrow(/birlikte/);
  });

  // Gerçek komut sahte ssh programıyla çalışır: seçeneğin işleve bağlı olduğunu ölçer.
  const { PATH: yol } = process.env;
  const komutuCalistir = (secenekler: string[]) => {
    const kok = mkdtempSync(join(tmpdir(), "yedek-komut-"));
    const gunluk = join(kok, "gunluk");
    writeFileSync(
      join(kok, "ssh"),
      `#!/bin/bash
g="$(cat)"
printf '%s\\n%s\\n' "$*" "$g" >> "${gunluk}"
case "$* $g" in
  *"select datname"*) echo site_ornek_magaza; echo site_ornek_magaza__eski ;;
  *"for d in"*) echo "ornek-magaza 6" ;;
  *"gece.sh deneme"*) echo yedeklendi ;;
  *"docker ps -aq"*) echo true ;;
esac
exit 0
`,
    );
    chmodSync(join(kok, "ssh"), 0o755);
    const sonuc = spawnSync(
      process.execPath,
      [
        "komutlar/yedek-geri-yukle.mts",
        "siteler/ornek-magaza",
        "deneme",
        "--onay=ornek-magaza",
        ...secenekler,
      ],
      {
        encoding: "utf8",
        cwd: join(import.meta.dirname, "..", ".."),
        env: { ...process.env, PATH: `${kok}:${yol}` },
      },
    );
    return { ...sonuc, gunluk: readFileSync(gunluk, "utf8") };
  };

  it("--eskiye-don geri alma adımını çalıştırır, yedeği açmaz", () => {
    const sonuc = komutuCalistir(["--eskiye-don"]);
    expect(sonuc.stderr).toBe("");
    expect(sonuc.status).toBe(0);
    expect(sonuc.gunluk).toContain("# adim:gerial");
    expect(sonuc.gunluk).not.toContain("# adim:yana");
  });

  it("--dosya verilmezse hiçbir şeye dokunmaz, yedekleri listeler", () => {
    const sonuc = komutuCalistir([]);
    expect(sonuc.status).toBe(1);
    expect(sonuc.gunluk).toContain("--format tsp");
    expect(sonuc.gunluk).not.toContain("# adim:yana");
    expect(sonuc.gunluk).not.toContain("# adim:durdur");
  });

  it("--eskiyi-sil önceki veriyi siler, yedeği açmaz", () => {
    const sonuc = komutuCalistir(["--eskiyi-sil"]);
    expect(sonuc.stderr).toBe("");
    expect(sonuc.status).toBe(0);
    expect(sonuc.gunluk).toContain("# adim:eskisil");
    expect(sonuc.gunluk).not.toContain("# adim:yana");
    expect(sonuc.gunluk).not.toContain("# adim:gerial");
  });
});
