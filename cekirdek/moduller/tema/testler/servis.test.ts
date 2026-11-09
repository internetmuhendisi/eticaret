// Tema servisi gerçek veritabanıyla (kart 0105): başlangıç sürümünün bir kez yazılması, yayın ve değişiklik
// kaydı, bir sitenin özel temasının başka sitede görünmemesi ve seçilememesi, kullanılabilir temalar
// listesinde olmayan temanın seçilememesi, okunmayan rengin kaydedilmeyip öneri dönmesi, önceki sürüme
// dönüş, "temayı değiştirebilir" kapalıyken reddedilme, sürümlerin değiştirilememesi, aynı anda gelen
// yayınlar.
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { asc, eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { ornekRenk } from "../../../../bilesenler/tasarim-degerleri/testler/ornek-renkler.ts";
import type { Site } from "../../../ayar-semasi/site-klasoru.ts";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { hataIzlemeAraciniBagla, type IzlenenHata } from "../../../izleme/hata-katmani.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { temaSurumleri } from "../model.ts";
import { temaBaslangicYazari, temaServisi } from "../servis.ts";

const ornekler = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "ayar-semasi",
  "testler",
  "ornek-siteler",
);
const siteOku = (ad: string) => siteKlasorunuOku(join(ornekler, ad));
// Kendi teması olan site (ozel-tema ve canli-carsi), hazır temalarla açılan site, değiştiremeyen site.
const ozelTemali = siteOku("tema-ozel-ve-hazir");
const hazirTemali = siteOku("gecerli");
const degistiremeyen = siteOku("tema-ozel");

const servisi = (site: Site) => temaServisi(() => site);
const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const izlenenler: IzlenenHata[] = [];
hataIzlemeAraciniBagla((olay) => izlenenler.push(olay));

const silinecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const site = await denemeSitesiAc("tema");
  silinecekler.push(site.sil);
  return site.vt;
};
afterEach(async () => {
  izlenenler.length = 0;
  await Promise.all(silinecekler.splice(0).map((sil) => sil()));
});

const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti };
};

const surumler = (vt: Veritabani) =>
  vt.select().from(temaSurumleri).orderBy(asc(temaSurumleri.sira));
// Tema sürümlerinin kayıtları, sürüm sırasıyla (aynı işlemde yazılan kayıtların zamanı aynıdır).
const kayitlar = async (vt: Veritabani) =>
  (
    await vt
      .select({ kayit: degisiklikKayitlari })
      .from(degisiklikKayitlari)
      .innerJoin(temaSurumleri, eq(temaSurumleri.kimlik, degisiklikKayitlari.kayit_kimligi))
      .where(eq(degisiklikKayitlari.kayit_turu, "tema-surumu"))
      .orderBy(asc(temaSurumleri.sira))
  ).map((satir) => satir.kayit);

describe("başlangıç sürümü", () => {
  it("ilk okumada sitenin başlangıç değeriyle bir kez yazılır, kayda sistem olarak girer", async () => {
    const vt = await siteAc();
    const servis = servisi(degistiremeyen);
    const durum = await servis.temaDurumu(vt);
    expect(durum).toMatchObject({
      sira: 1,
      tema: "ozel-tema",
      ayarlar: { renkler: {}, kose: "keskin", koyuTema: true },
      geriDonulenSira: null,
    });
    await servis.temaDurumu(vt);
    expect(await surumler(vt)).toHaveLength(1);
    const [kayit, ...fazla] = await kayitlar(vt);
    expect(fazla).toEqual([]);
    expect(kayit).toMatchObject({
      islem: "tema.baslangic",
      kim_turu: "sistem",
      kim_adi: temaBaslangicYazari.tur === "sistem" ? temaBaslangicYazari.ad : "",
      eski_deger: null,
      yeni_deger: { tema: "ozel-tema", ayarlar: { renkler: {}, kose: "keskin", koyuTema: true } },
    });
  });

  it("aynı anda sekiz okumada tek sürüm ve tek kayıt", async () => {
    const vt = await siteAc();
    const servis = servisi(hazirTemali);
    const sonuclar = await Promise.all(Array.from({ length: 8 }, () => servis.temaDurumu(vt)));
    expect(new Set(sonuclar.map((durum) => durum.kimlik)).size).toBe(1);
    expect(await surumler(vt)).toHaveLength(1);
    expect(await kayitlar(vt)).toHaveLength(1);
  });
});

describe("yayın", () => {
  it("yeni sürüm olur, kayda eski ve yeni değerle girer; aynısı ikinci kez yazılmaz", async () => {
    const vt = await siteAc();
    const servis = servisi(ozelTemali);
    const kim = yonetici();
    const yeni = await servis.temayiYayinla(vt, kim, {
      tema: "ozel-tema",
      ayarlar: {
        renkler: { birincil: ornekRenk.turuncuKucukHarfle },
        kose: "keskin",
        koyuTema: true,
      },
    });
    expect(yeni).toMatchObject({ sira: 2, tema: "ozel-tema", geriDonulenSira: null });
    expect(yeni.ayarlar).toEqual({
      renkler: { birincil: ornekRenk.turuncu },
      kose: "keskin",
      koyuTema: true,
    });
    const tekrar = await servis.temayiYayinla(vt, yonetici(), {
      tema: "ozel-tema",
      ayarlar: { renkler: { birincil: ornekRenk.turuncu }, kose: "keskin", koyuTema: true },
    });
    expect(tekrar.kimlik).toBe(yeni.kimlik);
    expect(await surumler(vt)).toHaveLength(2);
    const butun = await kayitlar(vt);
    expect(butun.map((kayit) => kayit.islem).sort()).toEqual(["tema.baslangic", "tema.yayinlandi"]);
    const yayin = butun.find((kayit) => kayit.islem === "tema.yayinlandi");
    expect(yayin).toMatchObject({
      islem: "tema.yayinlandi",
      kim_turu: "yonetici",
      kim_kimligi: kim.tur === "yonetici" ? kim.kimlik : "",
      kayit_kimligi: yeni.kimlik,
      eski_deger: { tema: "canli-carsi", ayarlar: { renkler: {}, koyuTema: false } },
      yeni_deger: {
        tema: "ozel-tema",
        ayarlar: { renkler: { birincil: ornekRenk.turuncu }, kose: "keskin", koyuTema: true },
      },
    });
    expect((await servis.gecerliTema(vt)).tema.kod).toBe("ozel-tema");
  });

  it("aynı anda altı yayın sırayla yazılır, kayıttaki eski değerler zincir kurar", async () => {
    const vt = await siteAc();
    const servis = servisi(hazirTemali);
    await servis.temaDurumu(vt);
    const renkler = ornekRenk.turuncular;
    await Promise.all(
      renkler.map((renk) =>
        servis.temayiYayinla(vt, yonetici(), {
          tema: "canli-carsi",
          ayarlar: { renkler: { birincil: renk } },
        }),
      ),
    );
    const yazilan = await surumler(vt);
    expect(yazilan.map((surum) => surum.sira)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const kayit = await kayitlar(vt);
    for (let i = 1; i < kayit.length; i += 1) {
      expect(kayit[i]?.eski_deger).toEqual(kayit[i - 1]?.yeni_deger);
    }
  });
});

describe("kullanılabilir temalar (kart 0105)", () => {
  it("bir sitenin özel teması başka sitede görünmez ve seçilemez", async () => {
    const vtOzel = await siteAc();
    const vtHazir = await siteAc();
    expect(
      servisi(ozelTemali)
        .kullanilabilirTemalar()
        .map((tema) => tema.kod),
    ).toContain("ozel-tema");
    const hazir = servisi(hazirTemali);
    expect(hazir.kullanilabilirTemalar().map((tema) => tema.kod)).not.toContain("ozel-tema");
    // Kendi sitesinde seçilir.
    await servisi(ozelTemali).temayiYayinla(vtOzel, yonetici(), { tema: "ozel-tema", ayarlar: {} });
    // Öteki sitede seçilemez, hiçbir şey yazılmaz.
    expect(
      await hatasi(hazir.temayiYayinla(vtHazir, yonetici(), { tema: "ozel-tema", ayarlar: {} })),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "tema", kod: "tema-kullanilamaz" }] });
    expect(await surumler(vtHazir)).toHaveLength(0);
    expect((await hazir.temaDurumu(vtHazir)).tema).toBe("canli-carsi");
  });

  it("veritabanına başka yoldan yazılmış başka sitenin teması vitrinde çizilmez, hata kaydedilir", async () => {
    const vt = await siteAc();
    const hazir = servisi(hazirTemali);
    await hazir.temaDurumu(vt);
    await vt
      .insert(temaSurumleri)
      .values({ sira: 2, tema: "ozel-tema", ayarlar: { renkler: {}, koyuTema: true } });
    const gecerli = await hazir.gecerliTema(vt);
    expect(gecerli.tema.kod).toBe("canli-carsi");
    expect(gecerli.tema.kaynak).toBe("cekirdek");
    expect(izlenenler.map((olay) => olay.baglam)).toContainEqual(
      expect.objectContaining({ kaynak: "tema" }),
    );
  });

  it("temaya uymayan kayıtlı ayardan yalnız o ayar atılır, hata süreç başına bir kez kaydedilir", async () => {
    const vt = await siteAc();
    const servis = servisi(ozelTemali);
    await servis.temaDurumu(vt);
    // Başka yoldan yazılmış sürüm: köşe seçimi geçerli, zemin rengi temada açık değil.
    await vt.insert(temaSurumleri).values({
      sira: 2,
      tema: "ozel-tema",
      ayarlar: { renkler: { zemin: ornekRenk.siyah }, kose: "keskin", koyuTema: true },
    });
    const ilk = await servis.gecerliTema(vt);
    expect(ilk.ayarlar).toEqual({ renkler: {}, kose: "keskin", koyuTema: true });
    await servis.gecerliTema(vt);
    expect(
      izlenenler.filter((olay) => (olay.baglam as { kaynak?: string }).kaynak === "tema"),
    ).toHaveLength(1);
  });

  it("listede olmayan tema seçilemez", async () => {
    const vt = await siteAc();
    const yalnizOzel: Site = {
      ...ozelTemali,
      temalar: ozelTemali.temalar.filter((tema) => tema.kod !== "canli-carsi"),
      temaBaslangici: { tema: "ozel-tema", ayarlar: { renkler: {}, koyuTema: false } },
    };
    const servis = servisi(yalnizOzel);
    for (const tema of ["canli-carsi", "olmayan"]) {
      expect(await hatasi(servis.temayiYayinla(vt, yonetici(), { tema, ayarlar: {} }))).toEqual({
        kod: "dogrulama",
        ayrinti: [{ alan: "tema", kod: "tema-kullanilamaz" }],
      });
    }
    expect(await surumler(vt)).toHaveLength(0);
  });

  it("temanın açmadığı renk ve tanımsız seçenek kaydedilmez, şemaya uymayan girdi reddedilir", async () => {
    const vt = await siteAc();
    const servis = servisi(ozelTemali);
    expect(
      await hatasi(
        servis.temayiYayinla(vt, yonetici(), {
          tema: "ozel-tema",
          ayarlar: { renkler: { zemin: ornekRenk.siyah }, kose: "yuvarlak" },
        }),
      ),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [
        { alan: "ayarlar.renkler.zemin", kod: "renk-degistirilemez" },
        { alan: "ayarlar.kose", kod: "secenek-tanimsiz" },
      ],
    });
    const bozuk = await hatasi(
      servis.temayiYayinla(vt, yonetici(), {
        tema: "ozel-tema",
        ayarlar: { renkler: { birincil: "red" } },
      }),
    );
    expect(bozuk.kod).toBe("dogrulama");
    expect(await surumler(vt)).toHaveLength(0);
  });
});

describe("okunurluk (kart 0105)", () => {
  it("kontrastı yetersiz renk kaydedilmez, okunur en yakın ton önerilir ve öneri kaydedilir", async () => {
    const vt = await siteAc();
    const servis = servisi(hazirTemali);
    const { kod, ayrinti } = await hatasi(
      servis.temayiYayinla(vt, yonetici(), {
        tema: "canli-carsi",
        ayarlar: { renkler: { birincil: ornekRenk.koyuLacivert } },
      }),
    );
    expect(kod).toBe("dogrulama");
    const [sorun] = ayrinti as { alan: string; kod: string; oneri?: string }[];
    expect(sorun).toMatchObject({ alan: "ayarlar.renkler.birincil", kod: "kontrast-yetersiz" });
    expect(sorun?.oneri).toMatch(/^#[0-9A-F]{6}$/);
    expect(await surumler(vt)).toHaveLength(0);
    const yeni = await servis.temayiYayinla(vt, yonetici(), {
      tema: "canli-carsi",
      ayarlar: { renkler: { birincil: sorun?.oneri ?? "" } },
    });
    expect(yeni.ayarlar.renkler.birincil).toBe(sorun?.oneri);
  });
});

describe("önceki sürüme dönüş", () => {
  it("bir önceki sürüm aynen yeni sürüm olur, kayda dönüş olarak girer", async () => {
    const vt = await siteAc();
    const servis = servisi(ozelTemali);
    const ikinci = await servis.temayiYayinla(vt, yonetici(), {
      tema: "ozel-tema",
      ayarlar: { renkler: { birincil: ornekRenk.turuncu }, kose: "keskin", koyuTema: true },
    });
    await servis.temayiYayinla(vt, yonetici(), {
      tema: "canli-carsi",
      ayarlar: { renkler: { birincil: ornekRenk.acikTuruncu } },
    });
    const donus = await servis.oncekiSurumeDon(vt, yonetici());
    expect(donus).toMatchObject({
      sira: 4,
      tema: ikinci.tema,
      ayarlar: ikinci.ayarlar,
      geriDonulenSira: 2,
    });
    expect((await servis.gecerliTema(vt)).ayarlar).toEqual(ikinci.ayarlar);
    const son = (await kayitlar(vt)).at(-1);
    expect(son).toMatchObject({
      islem: "tema.geri-donuldu",
      kayit_kimligi: donus.kimlik,
      eski_deger: { tema: "canli-carsi" },
      yeni_deger: { tema: "ozel-tema", geriDonulenSira: 2 },
    });
    // Belirli bir sürüme de dönülür: başlangıç sürümü.
    const baslangica = await servis.oncekiSurumeDon(vt, yonetici(), 1);
    expect(baslangica).toMatchObject({ sira: 5, tema: "canli-carsi", geriDonulenSira: 1 });
    expect(baslangica.ayarlar).toEqual({ renkler: {}, koyuTema: false });
    // Geçmiş kaybolmaz.
    expect((await servis.temaSurumleriniOku(vt)).map((surum) => surum.sira)).toEqual([
      5, 4, 3, 2, 1,
    ]);
  });

  it("olmayan, son ya da bozuk sıradaki sürüme dönülmez; tek sürümde önceki yoktur", async () => {
    const vt = await siteAc();
    const servis = servisi(hazirTemali);
    const tekSurum = await hatasi(servis.oncekiSurumeDon(vt, yonetici()));
    expect(tekSurum).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "sira", kod: "surum-gecersiz" }],
    });
    await servis.temayiYayinla(vt, yonetici(), {
      tema: "canli-carsi",
      ayarlar: { koyuTema: true },
    });
    for (const sira of [2, 3, 99, 0, -1, 1.5, Number.NaN]) {
      expect((await hatasi(servis.oncekiSurumeDon(vt, yonetici(), sira))).kod, String(sira)).toBe(
        "dogrulama",
      );
    }
    expect(await surumler(vt)).toHaveLength(2);
  });

  it("bugün okunmayan rengi taşıyan sürüme dönülmez", async () => {
    const vt = await siteAc();
    const servis = servisi(hazirTemali);
    await servis.temaDurumu(vt);
    // Başka yoldan yazılmış (ya da temanın değerleri sonradan değişmiş) okunmayan renkli sürüm.
    await vt.insert(temaSurumleri).values({
      sira: 2,
      tema: "canli-carsi",
      ayarlar: { renkler: { birincil: ornekRenk.koyuLacivert }, koyuTema: false },
    });
    await servis.temayiYayinla(vt, yonetici(), {
      tema: "canli-carsi",
      ayarlar: { koyuTema: true },
    });
    expect(await hatasi(servis.oncekiSurumeDon(vt, yonetici(), 2))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "sira", kod: "surum-kullanilamaz" }],
    });
    expect(await surumler(vt)).toHaveLength(3);
  });

  it("teması artık kullanılamayan sürüme dönülmez", async () => {
    const vt = await siteAc();
    await servisi(ozelTemali).temayiYayinla(vt, yonetici(), { tema: "ozel-tema", ayarlar: {} });
    await servisi(ozelTemali).temayiYayinla(vt, yonetici(), {
      tema: "canli-carsi",
      ayarlar: { koyuTema: true },
    });
    // Altyapı sahibi özel temayı listeden çıkardı.
    const yalnizHazir: Site = {
      ...ozelTemali,
      temalar: ozelTemali.temalar.filter((tema) => tema.kod !== "ozel-tema"),
    };
    expect(await hatasi(servisi(yalnizHazir).oncekiSurumeDon(vt, yonetici()))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "sira", kod: "surum-kullanilamaz" }],
    });
    expect(await surumler(vt)).toHaveLength(3);
  });
});

describe('"Mağaza sahibi temayı değiştirebilir" kapalı (kullanıcı kararı)', () => {
  it("ne tema ne ayar değişir, önceki sürüme de dönülmez", async () => {
    const vt = await siteAc();
    const servis = servisi(degistiremeyen);
    const reddi = { kod: "is-kurali", ayrinti: [{ alan: "tema", kod: "tema-degistirilemez" }] };
    expect(
      await hatasi(
        servis.temayiYayinla(vt, yonetici(), { tema: "ozel-tema", ayarlar: { kose: "keskin" } }),
      ),
    ).toEqual(reddi);
    expect(
      await hatasi(
        servis.temayiYayinla(vt, yonetici(), {
          tema: "ozel-tema",
          ayarlar: { renkler: { birincil: ornekRenk.turuncu }, kose: "keskin", koyuTema: true },
        }),
      ),
    ).toEqual(reddi);
    expect(await hatasi(servis.oncekiSurumeDon(vt, yonetici(), 1))).toEqual(reddi);
    // Vitrin başlangıç değeriyle açılır.
    expect((await servis.gecerliTema(vt)).tema.kod).toBe("ozel-tema");
    expect(await surumler(vt)).toHaveLength(1);
  });
});

describe("sürümler değiştirilemez", () => {
  it("güncelleme, silme ve boşaltma veritabanında reddedilir", async () => {
    const vt = await siteAc();
    await servisi(hazirTemali).temaDurumu(vt);
    await expect(vt.execute(sql`update tema_surumleri set tema = 'ozel-tema'`)).rejects.toThrow();
    await expect(vt.execute(sql`delete from tema_surumleri`)).rejects.toThrow();
    await expect(vt.execute(sql`truncate tema_surumleri`)).rejects.toThrow();
    expect(await surumler(vt)).toHaveLength(1);
  });

  it("veritabanı sırası sıfır ve geri dönülen sırası kendinden büyük satırı reddeder", async () => {
    const vt = await siteAc();
    await expect(
      vt.insert(temaSurumleri).values({ sira: 0, tema: "canli-carsi", ayarlar: {} }),
    ).rejects.toThrow();
    await expect(
      vt
        .insert(temaSurumleri)
        .values({ sira: 2, tema: "canli-carsi", ayarlar: {}, geri_donulen_sira: 2 }),
    ).rejects.toThrow();
  });
});
