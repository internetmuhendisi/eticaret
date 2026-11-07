// Kuyruğun davranışı gerçek veritabanıyla (kart 0031, karar 0049).
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { hataIzlemeAraciniBagla, type IzlenenHata } from "../../izleme/hata-katmani.ts";
import { isDurumu, kuyrukAyari } from "../../kayitlar/arka-plan.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { calistiriciKur, zamanliIs, zamanliIsleriGir } from "../calistirici.ts";
import { kayitliIsler, kuyrukTemizligiIsi, zamanliIsler } from "../isler.ts";
import {
  bitenIsleriSil,
  hataOzeti,
  isAl,
  isEkle,
  isiBasarisizYap,
  isiBitir,
  isTanimla,
  yenidenDenemeGecikmesi,
} from "../kuyruk.ts";
import { arkaPlanIsleri } from "../model.ts";

type Site = Awaited<ReturnType<typeof denemeSitesiAc>>;
let site: Site;
let vt: Veritabani;
let izlenenler: IzlenenHata[];

const satir = async (kimlik: string | null) => {
  const [bulunan] = await vt
    .select()
    .from(arkaPlanIsleri)
    .where(eq(arkaPlanIsleri.kimlik, kimlik as string));
  if (!bulunan) throw new Error("satır yok");
  return bulunan;
};

beforeAll(async () => {
  site = await denemeSitesiAc("kuyruk");
  vt = site.vt;
}, 60_000);
afterAll(async () => {
  await site?.sil();
}, 60_000);
beforeEach(async () => {
  izlenenler = [];
  hataIzlemeAraciniBagla((kayit) => izlenenler.push(kayit));
  await vt.delete(arkaPlanIsleri);
});
afterEach(() => {
  hataIzlemeAraciniBagla(undefined);
  vi.restoreAllMocks();
});

const girdiSemasi = z.object({ deger: z.number() });
const basarili = (calistir = vi.fn(async () => {})) => ({
  calistir,
  tanim: isTanimla({ tur: "basarili", sema: girdiSemasi, calistir }),
});

describe("iş ekleme ve çalıştırma", () => {
  it("kuyruğa giren iş çalışır, bitti olur, aynı iş kimliğini ve girdiyi alır", async () => {
    const { calistir, tanim } = basarili();
    const kimlik = await isEkle(vt, tanim, { deger: 7 });
    const calistirici = calistiriciKur({ vt, isler: [tanim] });
    expect(await calistirici.birIsCalistir()).toBe(true);
    expect(calistir).toHaveBeenCalledOnce();
    expect(calistir.mock.calls[0]).toMatchObject([{ deger: 7 }, { isKimligi: kimlik, deneme: 1 }]);
    const biten = await satir(kimlik);
    expect(biten.durum).toBe(isDurumu.bitti);
    expect(biten.bitis_zamani).not.toBeNull();
    expect(biten.kilit_sahibi).toBeNull();
    expect(await calistirici.birIsCalistir()).toBe(false);
  });

  it("şemaya uymayan girdi kuyruğa girmez", async () => {
    const { tanim } = basarili();
    await expect(
      isEkle(vt, tanim, { deger: "yazi" } as unknown as { deger: number }),
    ).rejects.toThrow();
    expect(await vt.select().from(arkaPlanIsleri)).toEqual([]);
  });

  it("işlem geri alınırsa iş de kuyruğa girmez", async () => {
    const { tanim } = basarili();
    await expect(
      vt.transaction(async (islem) => {
        await isEkle(islem, tanim, { deger: 1 });
        throw new Error("geri al");
      }),
    ).rejects.toThrow("geri al");
    expect(await vt.select().from(arkaPlanIsleri)).toEqual([]);
  });

  it("aynı tekillik anahtarıyla ikinci iş girmez", async () => {
    const { tanim } = basarili();
    const ilk = await isEkle(vt, tanim, { deger: 1 }, { tekillikAnahtari: "aynisi" });
    const ikinci = await isEkle(vt, tanim, { deger: 2 }, { tekillikAnahtari: "aynisi" });
    expect(ilk).not.toBeNull();
    expect(ikinci).toBeNull();
  });

  it("zamanı gelmemiş iş alınmaz", async () => {
    const { tanim } = basarili();
    await isEkle(vt, tanim, { deger: 1 }, { gecikmeSaniye: 60 });
    expect(await isAl(vt, [tanim.tur], "s")).toBeUndefined();
  });

  it("bu sürümün tanımadığı tür alınmaz, satırı yerinde kalır", async () => {
    const yeniSurumun = isTanimla({
      tur: "yeni-surumun",
      sema: z.object({}),
      calistir: async () => {},
    });
    const kimlik = await isEkle(vt, yeniSurumun, {});
    const { tanim } = basarili();
    expect(await calistiriciKur({ vt, isler: [tanim] }).birIsCalistir()).toBe(false);
    expect((await satir(kimlik)).durum).toBe(isDurumu.bekliyor);
  });

  it("tablo yalnız kayıttaki durumları kabul eder", async () => {
    const { tanim } = basarili();
    const kimlik = await isEkle(vt, tanim, { deger: 1 });
    for (const durum of Object.values(isDurumu)) {
      await vt
        .update(arkaPlanIsleri)
        .set({ durum })
        .where(eq(arkaPlanIsleri.kimlik, kimlik as string));
    }
    await expect(
      vt
        .update(arkaPlanIsleri)
        .set({ durum: "uydurma" })
        .where(eq(arkaPlanIsleri.kimlik, kimlik as string)),
    ).rejects.toThrow();
  });
});

describe("yeniden deneme", () => {
  const hataliTanim = (calistir: () => Promise<void>) =>
    isTanimla({
      tur: "hatali",
      sema: z.object({}),
      enCokDeneme: 3,
      ilkGecikmeSaniye: 0,
      calistir,
    });

  it("başarısız iş belirli sayıda denenir, sonra hata kalır ve araca bir kez gider", async () => {
    const calistir = vi.fn(async () => {
      throw new Error("bozuk ali@ornek.test şifre=gizlideger");
    });
    const tanim = hataliTanim(calistir);
    const kimlik = await isEkle(vt, tanim, {});
    const calistirici = calistiriciKur({ vt, isler: [tanim] });

    await calistirici.birIsCalistir();
    let durum = await satir(kimlik);
    expect(durum.durum).toBe(isDurumu.bekliyor);
    expect(durum.deneme_sayisi).toBe(1);
    expect(izlenenler).toEqual([]);

    await calistirici.birIsCalistir();
    expect(izlenenler).toEqual([]);
    await calistirici.birIsCalistir();
    durum = await satir(kimlik);
    expect(durum.durum).toBe(isDurumu.hata);
    expect(durum.deneme_sayisi).toBe(3);
    expect(calistir).toHaveBeenCalledTimes(3);
    expect(durum.son_hata).not.toContain("ali@ornek.test");
    expect(durum.son_hata).not.toContain("gizlideger");

    expect(izlenenler.length).toBe(1);
    const metin = JSON.stringify(izlenenler[0]);
    expect(metin).toContain(tanim.tur);
    expect(metin).toContain(kimlik);
    expect(metin).not.toContain("gizlideger");
    expect(await calistirici.birIsCalistir()).toBe(false);
    expect(calistir).toHaveBeenCalledTimes(3);
  });

  it("sonraki deneme bekleme süresi dolmadan alınmaz", async () => {
    const tanim = isTanimla({
      tur: "gecikmeli",
      sema: z.object({}),
      ilkGecikmeSaniye: 60,
      calistir: async () => {
        throw new Error("olmadı");
      },
    });
    await isEkle(vt, tanim, {});
    const calistirici = calistiriciKur({ vt, isler: [tanim] });
    await calistirici.birIsCalistir();
    expect(await calistirici.birIsCalistir()).toBe(false);
  });

  it("bekleme her denemede iki katına çıkar, üst sınırda durur", () => {
    expect([1, 2, 3, 4].map((deneme) => yenidenDenemeGecikmesi(60, deneme))).toEqual([
      60, 120, 240, 480,
    ]);
    expect(yenidenDenemeGecikmesi(60, 30)).toBe(kuyrukAyari.enUzunGecikmeSaniye);
  });

  it("süresini aşan iş başarısız sayılır, kendisine durması söylenir", async () => {
    let durduruldu = false;
    const tanim = isTanimla({
      tur: "uzun",
      sema: z.object({}),
      enCokDeneme: 1,
      calistir: (_, { sinyal }) =>
        new Promise<void>(() => {
          sinyal.addEventListener("abort", () => {
            durduruldu = true;
          });
        }),
    });
    const kimlik = await isEkle(vt, tanim, {});
    await calistiriciKur({
      vt,
      isler: [tanim],
      ayar: { ...kuyrukAyari, isSuresiSaniye: 0.05 },
    }).birIsCalistir();
    expect(durduruldu).toBe(true);
    expect((await satir(kimlik)).durum).toBe(isDurumu.hata);
  });
});

describe("süreç iş sırasında ölürse", () => {
  const tanim = isTanimla({
    tur: "olen",
    sema: z.object({}),
    enCokDeneme: 2,
    calistir: async () => {},
  });

  it("kilit süresi dolmadan iş başka sürece verilmez, dolunca verilir", async () => {
    const kimlik = await isEkle(vt, tanim, {});
    expect((await isAl(vt, [tanim.tur], "birinci"))?.kimlik).toBe(kimlik);
    expect(await isAl(vt, [tanim.tur], "ikinci")).toBeUndefined();
    await vt
      .update(arkaPlanIsleri)
      .set({ kilit_bitis: new Date(Date.now() - 1000) })
      .where(eq(arkaPlanIsleri.kimlik, kimlik as string));
    const ikinci = await isAl(vt, [tanim.tur], "ikinci");
    expect(ikinci?.kimlik).toBe(kimlik);
    expect(ikinci?.deneme_sayisi).toBe(2);
  });

  it("kilidi kaybeden sürecin sonucu yazılmaz", async () => {
    const kimlik = await isEkle(vt, tanim, {});
    const ilk = await isAl(vt, [tanim.tur], "birinci");
    await vt
      .update(arkaPlanIsleri)
      .set({ kilit_bitis: new Date(Date.now() - 1000) })
      .where(eq(arkaPlanIsleri.kimlik, kimlik as string));
    await isAl(vt, [tanim.tur], "ikinci");
    if (!ilk) throw new Error("iş alınamadı");
    await isiBitir(vt, ilk, "birinci");
    expect((await satir(kimlik)).durum).toBe(isDurumu.calisiyor);
    expect(await isiBasarisizYap(vt, ilk, "birinci", new Error("geç kaldı"), 0)).toBe("kayip");
    expect((await satir(kimlik)).kilit_sahibi).toBe("ikinci");
  });

  it("deneme hakkı ölen süreçlerle bittiyse iş çalıştırılmaz, hata kalır ve araca gider", async () => {
    const calistir = vi.fn(async () => {});
    const olenTanim = isTanimla({ tur: "olen", sema: z.object({}), enCokDeneme: 2, calistir });
    const kimlik = await isEkle(vt, olenTanim, {});
    await vt
      .update(arkaPlanIsleri)
      .set({
        durum: isDurumu.calisiyor,
        deneme_sayisi: 2,
        kilit_sahibi: "olen",
        kilit_bitis: new Date(Date.now() - 1000),
      })
      .where(eq(arkaPlanIsleri.kimlik, kimlik as string));
    await calistiriciKur({ vt, isler: [olenTanim] }).birIsCalistir();
    expect(calistir).not.toHaveBeenCalled();
    expect((await satir(kimlik)).durum).toBe(isDurumu.hata);
    expect(izlenenler.length).toBe(1);
  });
});

describe("zamanlı işler", () => {
  const tanim = isTanimla({ tur: "zamanli", sema: z.object({}), calistir: async () => {} });
  const tanimli = zamanliIs(tanim, {}, { herDakika: 10 });
  const sayi = async () => (await vt.select().from(arkaPlanIsleri)).length;
  const dilimBasi = 1_800_000_000_000 - (1_800_000_000_000 % 600_000);

  it("aynı dilimde bir kez girer, sonraki dilimde yeniden girer", async () => {
    await zamanliIsleriGir(vt, [tanimli], dilimBasi);
    await zamanliIsleriGir(vt, [tanimli], dilimBasi + 599_000);
    expect(await sayi()).toBe(1);
    await zamanliIsleriGir(vt, [tanimli], dilimBasi + 600_000);
    expect(await sayi()).toBe(2);
  });

  it("aynı anda giren süreçler de tek kayıt açar", async () => {
    await Promise.all(Array.from({ length: 10 }, () => zamanliIsleriGir(vt, [tanimli], dilimBasi)));
    expect(await sayi()).toBe(1);
  });

  it("döngü zamanlı işi kuyruğa koyar ve çalıştırır", async () => {
    const calistir = vi.fn(async () => {});
    const is = isTanimla({ tur: "zamanli", sema: z.object({}), calistir });
    const durdur = new AbortController();
    const dongu = calistiriciKur({
      vt,
      isler: [is],
      zamanliIsler: [zamanliIs(is, {}, { herDakika: 10 })],
      ayar: { ...kuyrukAyari, bosBeklemeMs: 10 },
    }).dongu(durdur.signal);
    await vi.waitFor(() => expect(calistir).toHaveBeenCalledOnce(), { timeout: 5_000 });
    durdur.abort();
    await dongu;
  });

  it("kayıttaki zamanlı işler kayıtlı işlerdendir", () => {
    const turler = kayitliIsler.map((is) => is.tur);
    for (const { is } of zamanliIsler) expect(turler).toContain(is.tur);
    expect(new Set(turler).size).toBe(turler.length);
  });
});

describe("temizlik", () => {
  it("süresi dolan biten işi siler; yeni biteni, bekleyeni ve hatalıyı silmez", async () => {
    const eski = new Date(Date.now() - (kuyrukAyari.bitenSaklamaGun + 1) * 86_400_000);
    const ekle = (durum: string, bitis: Date | null) =>
      vt
        .insert(arkaPlanIsleri)
        .values({ tur: "t", girdi: {}, durum, en_cok_deneme: 1, bitis_zamani: bitis })
        .returning({ kimlik: arkaPlanIsleri.kimlik });
    await ekle(isDurumu.bitti, eski);
    await ekle(isDurumu.bitti, new Date());
    await ekle(isDurumu.hata, eski);
    await ekle(isDurumu.bekliyor, null);
    expect(await bitenIsleriSil(vt)).toBe(1);
    const kalan = await vt.select({ durum: arkaPlanIsleri.durum }).from(arkaPlanIsleri);
    expect(kalan.map((is) => is.durum).sort()).toEqual(
      [isDurumu.bekliyor, isDurumu.bitti, isDurumu.hata].sort(),
    );
    expect(kuyrukTemizligiIsi.tur).toBeTruthy();
  });
});

describe("kesinti", () => {
  it("veritabanına ulaşılamazken araca kesinti başına tek hata gider, döngü ayakta kalır", async () => {
    const adresli = { execute: vi.fn(async () => Promise.reject(new Error("bağlantı yok"))) };
    const durdur = new AbortController();
    const dongu = calistiriciKur({
      vt: adresli as unknown as Veritabani,
      isler: [isTanimla({ tur: "t", sema: z.object({}), calistir: async () => {} })],
      ayar: { ...kuyrukAyari, bosBeklemeMs: 1, enUzunKesintiBeklemeMs: 2 },
    }).dongu(durdur.signal);
    await vi.waitFor(() => expect(adresli.execute.mock.calls.length).toBeGreaterThan(5), {
      timeout: 5_000,
    });
    durdur.abort();
    await dongu;
    expect(izlenenler.length).toBe(1);
  });
});

describe("hata özeti", () => {
  it("maskeli ve sınırlıdır", () => {
    expect(hataOzeti(new Error("x".repeat(9_000))).length).toBe(kuyrukAyari.hataOzetiUzunlugu);
    expect(hataOzeti(new Error("token=abc123"))).not.toContain("abc123");
  });
});
