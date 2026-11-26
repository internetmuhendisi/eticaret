// Kupon servisi gerçek veritabanıyla (kart 0312, karar 0187).
// - Toplam ve kişi başı sınır ayırmayla sayılır; süresi dolmuş ve serbest bırakılmış kullanım sayılmaz; oturumun kendi
//   ayırması sayılmaz; kişi aynı hesap ya da aynı e-posta (harf ayrımsız).
// - Açık duran ayırmanın arkasındaki ödeme kuponun kilidinde bekler ve son hakkı alamaz (sıra kurularak).
// - Siparişe bağlama: geçerli ayırma bağlanır; süresi dolmuşsa sınır yeniden sayılır.
// - Kullanılmış kuponun kodu, türü, değeri ve kapsamı veritabanında da değişmez; kullanılmamış kupon değişir.
// - Kod tekilliği harf ayrımsız; veritabanının tür ve kapsam denetimi kayıtla aynı; iki site ayrı.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { kuponKapsamlari, kuponTurleri } from "../../../kayitlar/kampanya.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { odemeOturumlari } from "../../odeme/model.ts";
import { hesapAc } from "../../oturum/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { kuponKapsami, kuponKullanimlari, kuponlar } from "../model.ts";
import { type KuponKisisi, kuponAyirmasiniBirak, kuponServisi } from "../servis.ts";

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });
const site: Site = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const servis = kuponServisi(site);

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const hatasi = async (is: Promise<unknown>) => {
  try {
    await is;
  } catch (hata) {
    if (hata instanceof BilinenHata) return { kod: hata.kod, ayrinti: hata.ayrinti };
    throw hata;
  }
  throw new Error("Hata beklenirdi.");
};

const hazirla = async (ad = "kupon") => {
  const deneme = await denemeSitesiAc(ad);
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const oturumAc = async (
    islem: Veritabani | Parameters<Parameters<Veritabani["transaction"]>[0]>[0] = vt,
  ) => {
    const [oturum] = await islem
      .insert(odemeOturumlari)
      .values({
        eposta: "kisi@ornek.test",
        teslimat: {} as never,
        fatura: {} as never,
        kalemler: [],
        toplam: 0,
        para_birimi: "XTS",
        onaylar: [],
        bitis_zamani: new Date(Date.now() + 15 * 60_000),
      })
      .returning({ kimlik: odemeOturumlari.kimlik });
    return oturum?.kimlik ?? "";
  };
  const kuponAc = (girdi: Partial<Parameters<typeof servis.ekle>[2]> = {}) =>
    vt.transaction((islem) =>
      servis.ekle(islem, yonetici(), {
        kod: `K${randomUUID().slice(0, 8)}`,
        tur: "yuzde",
        deger: 10,
        kapsam: "hepsi",
        ...girdi,
      }),
    );
  const bitis = () => new Date(Date.now() + 15 * 60_000);
  const ayir = async (kupon: string, kisi: KuponKisisi, oturum?: string) => {
    const kimlik = oturum ?? (await oturumAc());
    await vt.transaction((islem) =>
      servis.ayir(islem, { kupon, oturum: kimlik, kisi, bitis: bitis() }),
    );
    return kimlik;
  };
  // Siparişe bağlama gerçek sipariş satırı ister; burada bağlı sayılmak için satırın sipariş alanı doğrudan yazılır
  // (bağlamanın kendisi ödeme testlerinde, gerçek siparişle).
  const kullanimlar = () => vt.select().from(kuponKullanimlari);
  return { vt, oturumAc, kuponAc, ayir, bitis, kullanimlar };
};

const kisi = (eposta = "kisi@ornek.test", musteri: string | null = null): KuponKisisi => ({
  musteri,
  eposta,
});

describe("kullanım sınırları", () => {
  it("toplam sınır ayırmayla dolar; süresi dolmuş ayırma sayılmaz; oturumun kendi ayırması sayılmaz", async () => {
    const h = await hazirla();
    const kupon = await h.kuponAc({ toplamSinir: 1 });
    const ilk = await h.ayir(kupon, kisi("a@ornek.test"));
    expect(await hatasi(h.ayir(kupon, kisi("b@ornek.test")))).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "kupon", kod: "kupon-sinir-doldu" }],
    });
    expect(await servis.kullanimlar(h.vt, kupon)).toEqual({ toplam: 1 });
    expect(await servis.kullanimlar(h.vt, kupon, { oturum: ilk })).toEqual({ toplam: 0 });
    await h.vt.execute(
      sql`update kupon_kullanimlari set bitis_zamani = now() - interval '1 millisecond'`,
    );
    expect(await servis.kullanimlar(h.vt, kupon)).toEqual({ toplam: 0 });
    await h.ayir(kupon, kisi("b@ornek.test"));
  });

  it("kişi başı sınır aynı hesabın ya da aynı e-postanın (harf ayrımsız) kullanımıdır", async () => {
    const h = await hazirla();
    const kupon = await h.kuponAc({ kisiBasiSinir: 1 });
    const { hesapKimligi: musteri } = await hesapAc(h.vt, "musteri", {
      eposta: "uye@ornek.test",
      sifre: "uzun-bir-sifre-123",
    });
    await h.ayir(kupon, kisi("Uye@Ornek.Test", musteri));
    const kullanildi = { kod: "cakisma", ayrinti: [{ alan: "kupon", kod: "kupon-kullanildi" }] };
    // Aynı hesap başka e-postayla; aynı e-posta üye olmadan (büyük harfle).
    expect(await hatasi(h.ayir(kupon, kisi("baska@ornek.test", musteri)))).toEqual(kullanildi);
    expect(await hatasi(h.ayir(kupon, kisi("UYE@ornek.test")))).toEqual(kullanildi);
    await h.ayir(kupon, kisi("baska@ornek.test"));
    expect(await servis.kullanimlar(h.vt, kupon, { kisi: kisi("uye@ornek.test") })).toEqual({
      toplam: 2,
      kisi: 1,
    });
  });

  it("serbest bırakılan kullanım sayılmaz; ayırmayı bırakmak yalnız siparişe bağlanmamış satırı siler", async () => {
    const h = await hazirla();
    const kupon = await h.kuponAc({ toplamSinir: 1 });
    const oturum = await h.ayir(kupon, kisi());
    await h.vt.transaction((islem) => kuponAyirmasiniBirak(islem, oturum));
    expect(await h.kullanimlar()).toEqual([]);
    await h.ayir(kupon, kisi());
    // Serbest bırakma siparişe göredir: bağlı satır doğrudan işaretlenerek denenir.
    await h.vt.execute(sql`update kupon_kullanimlari set serbest_zamani = now()`);
    expect(await servis.kullanimlar(h.vt, kupon)).toEqual({ toplam: 0 });
  });

  it("kapalı ve silinmiş kupon ayrılmaz", async () => {
    const h = await hazirla();
    const kapali = await h.kuponAc({ acik: false });
    const gecersiz = { kod: "cakisma", ayrinti: [{ alan: "kupon", kod: "kupon-gecersiz" }] };
    expect(await hatasi(h.ayir(kapali, kisi()))).toEqual(gecersiz);
    const silinen = await h.kuponAc();
    await h.vt
      .update(kuponlar)
      .set({ silinme_zamani: new Date() })
      .where(eq(kuponlar.kimlik, silinen));
    expect(await hatasi(h.ayir(silinen, kisi()))).toEqual(gecersiz);
  });

  it("açık duran ayırmanın arkasındaki ödeme kuponun kilidinde bekler, son hakkı alamaz", async () => {
    const h = await hazirla();
    const kupon = await h.kuponAc({ toplamSinir: 1 });
    const ikinciOturum = await h.oturumAc();
    let ikinci: Promise<unknown> | undefined;
    await h.vt.transaction(async (islem) => {
      const oturum = await h.oturumAc(islem);
      await servis.ayir(islem, { kupon, oturum, kisi: kisi("a@ornek.test"), bitis: h.bitis() });
      ikinci = hatasi(h.ayir(kupon, kisi("b@ornek.test"), ikinciOturum));
      await kilitBekleyeniGor(h.vt);
    });
    expect(await ikinci).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "kupon", kod: "kupon-sinir-doldu" }],
    });
    expect(await h.kullanimlar()).toHaveLength(1);
  });

  it("siparişe bağlarken ayırmanın süresi dolmuşsa sınır yeniden sayılır, doluysa hiçbir şey yazılmaz", async () => {
    const h = await hazirla();
    const kupon = await h.kuponAc({ toplamSinir: 1 });
    const kendi = await h.ayir(kupon, kisi("a@ornek.test"));
    await h.vt.execute(
      sql`update kupon_kullanimlari set bitis_zamani = now() - interval '1 millisecond'`,
    );
    await h.ayir(kupon, kisi("b@ornek.test"));
    expect(
      await hatasi(
        h.vt.transaction((islem) =>
          servis.siparisiBagla(islem, {
            kupon,
            oturum: kendi,
            siparis: randomUUID(),
            kisi: kisi("a@ornek.test"),
          }),
        ),
      ),
    ).toEqual({ kod: "cakisma", ayrinti: [{ alan: "kupon", kod: "kupon-sinir-doldu" }] });
    expect((await h.kullanimlar()).every((satir) => satir.siparis_kimligi === null)).toBe(true);
  });

  it("aynı anda altı ödemede toplam sınır (2) aşılmaz", async () => {
    const h = await hazirla();
    const kupon = await h.kuponAc({ toplamSinir: 2 });
    const oturumlar = await Promise.all(Array.from({ length: 6 }, () => h.oturumAc()));
    const sonuclar = await Promise.allSettled(
      oturumlar.map((oturum, sira) => h.ayir(kupon, kisi(`k${sira}@ornek.test`), oturum)),
    );
    expect(sonuclar.filter((sonuc) => sonuc.status === "fulfilled")).toHaveLength(2);
    expect(await h.kullanimlar()).toHaveLength(2);
  });
});

describe("kuponun kaydı", () => {
  it("kod harf ayrımsız tekildir; kupon değişiklik kaydına girer", async () => {
    const h = await hazirla();
    const kimlik = await h.kuponAc({ kod: "Kasım50" });
    expect(await hatasi(h.kuponAc({ kod: "KASIM50" }))).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "kod", kod: "kod-var" }],
    });
    // Servisi atlayan yazıda da veritabanının tekil indeksi durdurur.
    await expect(
      h.vt.insert(kuponlar).values({ kod: "kasim50", tur: "yuzde", deger: 5, kapsam: "hepsi" }),
    ).rejects.toThrow();
    const [kayit] = await h.vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kayit_kimligi, kimlik));
    expect(kayit).toMatchObject({ islem: "kupon.eklendi", kayit_turu: "kupon" });
  });

  it("biçimi tutmayan kod ve kapsamla tutarsız kayıt listesi reddedilir", async () => {
    const h = await hazirla();
    for (const kod of ["AB", "A".repeat(31), "BOŞ LUK", "YÜZDE%"]) {
      expect((await hatasi(h.kuponAc({ kod }))).kod).toBe("dogrulama");
    }
    expect((await hatasi(h.kuponAc({ kapsam: "urunler" }))).kod).toBe("dogrulama");
    expect((await hatasi(h.kuponAc({ kapsamKayitlari: [randomUUID()] }))).kod).toBe("dogrulama");
  });

  it("kullanılmış kuponun kodu, türü, değeri ve kapsamı veritabanında değişmez; süresi ve sınırı değişir", async () => {
    const h = await hazirla();
    const urun = await urunServisi(() => site.ayarlar.saatDilimi).urunEkle(h.vt, yonetici(), {
      ad: "Kapsam ürünü",
      vergiSinifi: null,
    });
    const kupon = await h.kuponAc({ kapsam: "urunler", kapsamKayitlari: [urun] });
    const bos = await h.kuponAc();
    // Kullanılmamış kupon değişir.
    await h.vt.update(kuponlar).set({ deger: 20 }).where(eq(kuponlar.kimlik, bos));
    await h.ayir(kupon, kisi());
    for (const deger of [
      { kod: "YENIKOD" },
      { tur: "tutar" },
      { deger: 20 },
      { kapsam: "hepsi" },
      { indirimde_gecmez: true },
    ]) {
      await expect(
        h.vt.update(kuponlar).set(deger).where(eq(kuponlar.kimlik, kupon)),
      ).rejects.toThrow();
    }
    await expect(
      h.vt.delete(kuponKapsami).where(eq(kuponKapsami.kupon_kimligi, kupon)),
    ).rejects.toThrow();
    await h.vt
      .update(kuponlar)
      .set({
        toplam_sinir: 9,
        kisi_basi_sinir: 2,
        en_az_tutar: 100,
        acik: false,
        bitis_zamani: new Date(),
      })
      .where(eq(kuponlar.kimlik, kupon));
    // Ayırmanın süresi dolunca ve siparişe bağlı değilse kupon yeniden değişebilir.
    await h.vt.execute(
      sql`update kupon_kullanimlari set bitis_zamani = now() - interval '1 millisecond'`,
    );
    await h.vt.update(kuponlar).set({ deger: 30 }).where(eq(kuponlar.kimlik, kupon));
  });

  it("veritabanının tür ve kapsam denetimi kayıtla aynıdır", async () => {
    const h = await hazirla();
    const { rows } = await h.vt.execute<{ ad: string; tanim: string }>(
      sql`select conname as ad, pg_get_constraintdef(oid) as tanim from pg_constraint
          where conname in ('kuponlar_tur', 'kuponlar_kapsam', 'siparisler_kupon')`,
    );
    const degerler = (ad: string) =>
      [...(rows.find((satir) => satir.ad === ad)?.tanim ?? "").matchAll(/'([^']+)'::text/g)].map(
        (eslesme) => eslesme[1],
      );
    expect(degerler("kuponlar_tur")).toEqual([...kuponTurleri]);
    expect(degerler("kuponlar_kapsam")).toEqual([...kuponKapsamlari]);
    expect(
      degerler("siparisler_kupon").filter((d) =>
        (kuponTurleri as readonly string[]).includes(d ?? ""),
      ),
    ).toEqual(expect.arrayContaining([...kuponTurleri]));
  });

  it("iki site birbirinin kuponunu bulmaz", async () => {
    const a = await hazirla("kupona");
    const b = await hazirla("kuponb");
    await a.kuponAc({ kod: "YALNIZA" });
    expect(await servis.bul(a.vt, "YALNIZA")).toMatchObject({ kod: "YALNIZA" });
    expect(await servis.bul(b.vt, "YALNIZA")).toBeUndefined();
  });
});
