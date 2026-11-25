// Ekibe davet gerçek veritabanıyla (kart 0275, karar 0179):
// - Gönderme: bağlantı sitenin adresinde, anahtar # sonrasında, veritabanında yalnız özeti; süre 3 gün; roller; e-posta
//   kuyruğa girer (bağlantı ve rollerle); değişiklik kaydında roller var, e-posta yok.
// - Kurallar: geçersiz e-posta, boş, kayıtta olmayan ve tam yetkili rol, ekipteki e-posta, aynı e-postanın bekleyen
//   daveti, bekleyen davet sınırı; izni olmayan yönetici; hiçbiri hiçbir şey yazmaz.
// - Kabul: hesap e-posta, ad, şifre ve davetin rolleriyle açılır; iki aşamalı kurulumun ara adımı açılır, oturum
//   açılmaz; rolleri daveti gönderen vermiş olarak kayda girer; kabul kaydı yeni yöneticinindir.
// - Aynı cevap: kullanılmış, süresi dolmuş, geri alınmış, göndereni kapatılmış ve uydurma bağlantı is-kurali.
// - Aynı anda iki kabulden biri geçer; tek hesap açılır. Gönderenin hesabı kapanınca bekleyen davetleri düşer.
// - Davetten sonra aynı e-postayla hesap açılmışsa hesap-var, davet harcanmaz.
// - Kapatılmış hesabın e-postası yeniden davet edilir (kullanıcı kararı): yeni hesap açılır, eski kapalı kalır.
// - Temizlik saklama süresi geçen daveti siler, yenisini silmez. İki site birbirinin davetini görmez.
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { davetAyari } from "../../../kayitlar/oturum.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { epostaKayitlari } from "../../eposta/model.ts";
import { girisAdiminiOku } from "../../oturum/iki-asamali-giris.ts";
import { anahtarOzeti, hesapAc, hesapSifresiniDogrula } from "../../oturum/servis.ts";
import {
  bekleyenDavetler,
  davetGonder,
  davetiGeriAl,
  davetiKabulEt,
  davetiOku,
  davetTemizligi,
} from "../davet.ts";
import { yoneticiDavetleri, yoneticiler, yoneticiOturumlari } from "../model.ts";
import { ekibiOku, rolVer, yoneticiHesabiKapat } from "../servis.ts";

const ornekler = resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler");
const site = siteKlasorunuOku(join(ornekler, "gecerli"));
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const ortak = globalThis as Record<symbol, unknown>;
let onceki: unknown;
beforeAll(() => {
  onceki = ortak[siteAnahtari];
  ortak[siteAnahtari] = site;
});
afterAll(() => {
  ortak[siteAnahtari] = onceki;
});

const sistem: DegisikligiYapan = { tur: "sistem", ad: "deneme" };
const sifre = "uzun-bir-deneme-sifresi";
const yol = "/yonetim/giris/davet";

const temizlenecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const acilan = await denemeSitesiAc("ekip-davet");
  temizlenecekler.push(acilan.sil);
  return acilan.vt;
};
afterEach(async () => {
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti ?? [] };
};

const eposta = () => `d${randomUUID().slice(0, 8)}@ornek.test`;

const yonetici = async (vt: Veritabani, roller: string[]) => {
  const adres = eposta();
  const { hesapKimligi } = await hesapAc(vt, "yonetici", { eposta: adres, sifre });
  for (const rolKodu of roller) {
    await rolVer(vt, { yoneticiKimligi: hesapKimligi, rolKodu }, sistem);
  }
  return {
    kimlik: hesapKimligi,
    eposta: adres,
    kim: { tur: "yonetici" as const, kimlik: hesapKimligi },
  };
};

const anahtari = (baglanti: string) => {
  const anahtar = new URLSearchParams(new URL(baglanti).hash.slice(1)).get("anahtar");
  if (anahtar === null) throw new Error(`Bağlantıda anahtar yok: ${baglanti}`);
  return anahtar;
};

const kayitlar = async (vt: Veritabani, kimlik: string) =>
  (
    await vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kayit_kimligi, kimlik))
      .orderBy(degisiklikKayitlari.zaman)
  )
    // Aynı işlemdeki kayıtların zamanı aynıdır: sıra içeriğe göre sabitlenir.
    .map((satir) => ({
      zaman: satir.zaman.getTime(),
      satir: [satir.islem, satir.kim_kimligi, satir.eski_deger, satir.yeni_deger] as const,
    }))
    .toSorted(
      (a, b) => a.zaman - b.zaman || JSON.stringify(a.satir).localeCompare(JSON.stringify(b.satir)),
    )
    .map(({ satir }) => [...satir]);

const davetSayisi = async (vt: Veritabani) => (await vt.select().from(yoneticiDavetleri)).length;

describe("davet gönderme", () => {
  it("bağlantı sitenin adresinde ve # sonrasında; yalnız özeti durur; 3 gün; e-posta ve kayıt", async () => {
    const vt = await siteAc();
    const sahip = await yonetici(vt, ["magaza-sahibi"]);
    const adres = eposta();
    const once = Date.now();
    const { kimlik, baglanti } = await davetGonder(
      vt,
      {
        eposta: `  ${adres.toUpperCase()} `,
        roller: ["siparis-gorevlisi", "gorevli", "gorevli"],
        yenilemeYolu: yol,
      },
      sahip.kim,
    );
    expect(baglanti.startsWith(`https://deneme.example${yol}#anahtar=`)).toBe(true);
    const anahtar = anahtari(baglanti);
    expect(anahtar.length).toBeGreaterThanOrEqual(43);
    const [satir] = await vt
      .select()
      .from(yoneticiDavetleri)
      .where(eq(yoneticiDavetleri.kimlik, kimlik));
    expect(satir?.eposta).toBe(adres);
    expect(satir?.anahtar_ozeti).toBe(anahtarOzeti(anahtar));
    expect(JSON.stringify(satir)).not.toContain(anahtar);
    expect(satir?.davet_eden).toBe(sahip.kimlik);
    const sure = (satir?.bitis.getTime() ?? 0) - once;
    const gun = davetAyari.gecerlilikGun * 24 * 60 * 60 * 1000;
    expect(sure).toBeGreaterThan(gun - 60_000);
    expect(sure).toBeLessThanOrEqual(gun + 60_000);
    expect(await davetiOku(vt, anahtar)).toEqual({
      eposta: adres,
      roller: ["gorevli", "siparis-gorevlisi"],
    });
    expect(await bekleyenDavetler(vt)).toEqual([
      expect.objectContaining({ kimlik, eposta: adres, roller: ["gorevli", "siparis-gorevlisi"] }),
    ]);

    const [posta] = await vt.select().from(epostaKayitlari).where(eq(epostaKayitlari.alici, adres));
    expect(posta?.sablon).toBe("yonetici-daveti");
    expect(posta?.degiskenler).toEqual({
      baglanti,
      gun: String(davetAyari.gecerlilikGun),
      roller: "Görevli, Sipariş görevlisi",
    });

    const kayit = await kayitlar(vt, kimlik);
    expect(kayit).toEqual([
      [
        "yonetici-daveti.gonderildi",
        sahip.kimlik,
        null,
        { roller: ["gorevli", "siparis-gorevlisi"] },
      ],
    ]);
    expect(JSON.stringify(kayit)).not.toContain(adres);
  });

  it("kurallar: hiçbiri bir şey yazmaz", async () => {
    const vt = await siteAc();
    const sahip = await yonetici(vt, ["magaza-sahibi"]);
    const gorevli = await yonetici(vt, ["gorevli"]);
    const gonder = (girdi: { eposta: string; roller: string[] }, kim = sahip.kim) =>
      hatasi(davetGonder(vt, { ...girdi, yenilemeYolu: yol }, kim));

    expect(await gonder({ eposta: "eposta-degil", roller: ["gorevli"] })).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "eposta", kod: "eposta-gecersiz" }],
    });
    expect(await gonder({ eposta: eposta(), roller: [] })).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "roller", kod: "rol-gerekli" }],
    });
    expect(await gonder({ eposta: eposta(), roller: ["olmayan-rol"] })).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "roller", kod: "rol-yok" }],
    });
    expect(await gonder({ eposta: eposta(), roller: ["gorevli", "magaza-sahibi"] })).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "roller", kod: "tam-yetki" }],
    });
    expect(await gonder({ eposta: gorevli.eposta.toUpperCase(), roller: ["gorevli"] })).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "eposta", kod: "ekipte" }],
    });
    // Görevlinin ekip.davet-et izni yok.
    expect(await gonder({ eposta: eposta(), roller: ["gorevli"] }, gorevli.kim)).toEqual({
      kod: "yetki",
      ayrinti: [],
    });
    expect(await davetSayisi(vt)).toBe(0);

    const ayni = eposta();
    await davetGonder(vt, { eposta: ayni, roller: ["gorevli"], yenilemeYolu: yol }, sahip.kim);
    expect(await gonder({ eposta: ayni, roller: ["icerik-editoru"] })).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "eposta", kod: "davet-var" }],
    });
    for (let i = 1; i < davetAyari.bekleyenSiniri; i += 1) {
      await davetGonder(
        vt,
        { eposta: eposta(), roller: ["gorevli"], yenilemeYolu: yol },
        sahip.kim,
      );
    }
    expect(await gonder({ eposta: eposta(), roller: ["gorevli"] })).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "davet", kod: "davet-siniri" }],
    });
    expect(await davetSayisi(vt)).toBe(davetAyari.bekleyenSiniri);
    // Süresi dolan davet sınıra sayılmaz, aynı e-postaya yeniden davet gider.
    await vt
      .update(yoneticiDavetleri)
      .set({ bitis: new Date(Date.now() - 1000) })
      .where(eq(yoneticiDavetleri.eposta, ayni));
    await davetGonder(vt, { eposta: ayni, roller: ["gorevli"], yenilemeYolu: yol }, sahip.kim);
  });
});

describe("davetin kabulü", () => {
  it("hesap ad, şifre ve rollerle açılır; kurulumun ara adımı açılır, oturum açılmaz; kayıtlar", async () => {
    const vt = await siteAc();
    const sahip = await yonetici(vt, ["magaza-sahibi"]);
    const adres = eposta();
    const { kimlik, baglanti } = await davetGonder(
      vt,
      { eposta: adres, roller: ["gorevli", "siparis-gorevlisi"], yenilemeYolu: yol },
      sahip.kim,
    );
    const anahtar = anahtari(baglanti);
    const { hesapKimligi, adimAnahtari } = await davetiKabulEt(vt, {
      anahtar,
      ad: "Bora Kaya",
      sifre,
    });
    const [uye] = await ekibiOku(vt, { kimlik: hesapKimligi });
    expect(uye).toMatchObject({
      eposta: adres,
      ad: "Bora Kaya",
      roller: ["gorevli", "siparis-gorevlisi"],
      ikiAsamaKurulu: false,
    });
    expect(
      (await hesapSifresiniDogrula(vt, "yonetici", { eposta: adres, sifre }))?.hesapKimligi,
    ).toBe(hesapKimligi);
    expect(await girisAdiminiOku(vt, adimAnahtari)).toEqual({
      hesapKimligi,
      eposta: adres,
      durum: "kurulum",
    });
    expect(
      await vt
        .select()
        .from(yoneticiOturumlari)
        .where(eq(yoneticiOturumlari.hesap_kimligi, hesapKimligi)),
    ).toEqual([]);
    const [davet] = await vt
      .select()
      .from(yoneticiDavetleri)
      .where(eq(yoneticiDavetleri.kimlik, kimlik));
    expect(davet?.yonetici_kimligi).toBe(hesapKimligi);
    expect(davet?.kullanilma_zamani).not.toBeNull();
    expect(await bekleyenDavetler(vt)).toEqual([]);

    // Rolleri daveti gönderen verdi; kabul yeni yöneticinindir.
    expect(await kayitlar(vt, hesapKimligi)).toEqual([
      ["rol.verildi", sahip.kimlik, null, { rol: "gorevli" }],
      ["rol.verildi", sahip.kimlik, null, { rol: "siparis-gorevlisi" }],
    ]);
    expect((await kayitlar(vt, kimlik)).at(-1)).toEqual([
      "yonetici-daveti.kabul-edildi",
      hesapKimligi,
      { davet: "bekliyor" },
      { davet: "kabul-edildi", yonetici: hesapKimligi },
    ]);

    // Bağlantı ikinci kez geçmez.
    expect(await hatasi(davetiOku(vt, anahtar))).toEqual({ kod: "is-kurali", ayrinti: [] });
    expect(await hatasi(davetiKabulEt(vt, { anahtar, ad: "Başka", sifre }))).toEqual({
      kod: "is-kurali",
      ayrinti: [],
    });
  });

  it("süresi dolmuş, geri alınmış, göndereni kapatılmış ve uydurma bağlantı aynı cevabı alır", async () => {
    const vt = await siteAc();
    const sahip = await yonetici(vt, ["magaza-sahibi"]);
    const ikinciSahip = await yonetici(vt, ["magaza-sahibi"]);
    const gonder = async (kim = sahip.kim) => {
      const { kimlik, baglanti } = await davetGonder(
        vt,
        { eposta: eposta(), roller: ["gorevli"], yenilemeYolu: yol },
        kim,
      );
      return { kimlik, anahtar: anahtari(baglanti) };
    };
    const ayniCevap = async (anahtar: string) => {
      expect(await hatasi(davetiOku(vt, anahtar))).toEqual({ kod: "is-kurali", ayrinti: [] });
      expect(await hatasi(davetiKabulEt(vt, { anahtar, ad: "Ad", sifre }))).toEqual({
        kod: "is-kurali",
        ayrinti: [],
      });
    };

    const suresiDolan = await gonder();
    await vt
      .update(yoneticiDavetleri)
      .set({ bitis: new Date(Date.now() - 1) })
      .where(eq(yoneticiDavetleri.kimlik, suresiDolan.kimlik));
    await ayniCevap(suresiDolan.anahtar);

    const geriAlinan = await gonder();
    await davetiGeriAl(vt, { kimlik: geriAlinan.kimlik }, sahip.kim);
    await ayniCevap(geriAlinan.anahtar);
    expect(await hatasi(davetiGeriAl(vt, { kimlik: geriAlinan.kimlik }, sahip.kim))).toEqual({
      kod: "bulunamadi",
      ayrinti: [],
    });
    expect((await kayitlar(vt, geriAlinan.kimlik)).at(-1)).toEqual([
      "yonetici-daveti.geri-alindi",
      sahip.kimlik,
      { davet: "bekliyor" },
      { davet: "geri-alindi" },
    ]);

    // Gönderenin hesabı kapanınca bekleyen daveti düşer ve kayda girer; başkasının daveti kalır.
    const kapananin = await gonder(ikinciSahip.kim);
    const kalan = await gonder();
    await yoneticiHesabiKapat(vt, { yoneticiKimligi: ikinciSahip.kimlik }, sahip.kim);
    await ayniCevap(kapananin.anahtar);
    expect((await kayitlar(vt, kapananin.kimlik)).at(-1)?.[0]).toBe("yonetici-daveti.geri-alindi");
    expect((await bekleyenDavetler(vt)).map((davet) => davet.kimlik)).toEqual([kalan.kimlik]);

    await ayniCevap("uydurma-anahtar");
    expect(
      await vt.select().from(yoneticiler).where(isNull(yoneticiler.silinme_zamani)),
    ).toHaveLength(1);
  });

  it("aynı anda iki kabulden biri geçer, tek hesap açılır", async () => {
    const vt = await siteAc();
    const sahip = await yonetici(vt, ["magaza-sahibi"]);
    const adres = eposta();
    const { baglanti } = await davetGonder(
      vt,
      { eposta: adres, roller: ["gorevli"], yenilemeYolu: yol },
      sahip.kim,
    );
    const anahtar = anahtari(baglanti);
    const sonuclar = await Promise.allSettled([
      davetiKabulEt(vt, { anahtar, ad: "Bir", sifre }),
      davetiKabulEt(vt, { anahtar, ad: "İki", sifre }),
    ]);
    expect(sonuclar.filter((sonuc) => sonuc.status === "fulfilled")).toHaveLength(1);
    const reddedilen = sonuclar.find((sonuc) => sonuc.status === "rejected");
    expect(reddedilen?.status === "rejected" && reddedilen.reason).toMatchObject({
      kod: "is-kurali",
    });
    expect(await vt.select().from(yoneticiler).where(eq(yoneticiler.eposta, adres))).toHaveLength(
      1,
    );
  });

  it("davetten sonra aynı e-postayla hesap açılmışsa hesap-var; davet harcanmaz", async () => {
    const vt = await siteAc();
    const sahip = await yonetici(vt, ["magaza-sahibi"]);
    const adres = eposta();
    const { baglanti } = await davetGonder(
      vt,
      { eposta: adres, roller: ["gorevli"], yenilemeYolu: yol },
      sahip.kim,
    );
    await hesapAc(vt, "yonetici", { eposta: adres, sifre });
    const anahtar = anahtari(baglanti);
    expect(await hatasi(davetiKabulEt(vt, { anahtar, ad: "Ad", sifre }))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "eposta", kod: "hesap-var" }],
    });
    expect(await davetiOku(vt, anahtar)).toMatchObject({ eposta: adres });
  });

  it("kapatılmış hesabın e-postası yeniden davet edilir: yeni hesap açılır, eski kapalı kalır", async () => {
    const vt = await siteAc();
    const sahip = await yonetici(vt, ["magaza-sahibi"]);
    const eski = await yonetici(vt, ["gorevli"]);
    await yoneticiHesabiKapat(vt, { yoneticiKimligi: eski.kimlik }, sahip.kim);
    const { baglanti } = await davetGonder(
      vt,
      { eposta: eski.eposta, roller: ["icerik-editoru"], yenilemeYolu: yol },
      sahip.kim,
    );
    const { hesapKimligi } = await davetiKabulEt(vt, {
      anahtar: anahtari(baglanti),
      ad: "Dönen Çalışan",
      sifre,
    });
    expect(hesapKimligi).not.toBe(eski.kimlik);
    const satirlar = await vt
      .select({ kimlik: yoneticiler.kimlik, silinme: yoneticiler.silinme_zamani })
      .from(yoneticiler)
      .where(eq(yoneticiler.eposta, eski.eposta));
    expect(satirlar).toHaveLength(2);
    expect(satirlar.find((satir) => satir.kimlik === eski.kimlik)?.silinme).not.toBeNull();
    expect((await ekibiOku(vt, { kimlik: hesapKimligi }))[0]?.roller).toEqual(["icerik-editoru"]);
  });
});

describe("davet temizliği ve site ayrımı", () => {
  it("saklama süresi geçen davet silinir, yenisi kalır", async () => {
    const vt = await siteAc();
    const sahip = await yonetici(vt, ["magaza-sahibi"]);
    const gonder = async () =>
      (
        await davetGonder(
          vt,
          { eposta: eposta(), roller: ["gorevli"], yenilemeYolu: yol },
          sahip.kim,
        )
      ).kimlik;
    const eski = await gonder();
    const sinirda = await gonder();
    const gun = 24 * 60 * 60 * 1000;
    const saklama = davetAyari.saklamaGun * gun;
    await vt
      .update(yoneticiDavetleri)
      .set({ bitis: new Date(Date.now() - saklama - 60_000) })
      .where(eq(yoneticiDavetleri.kimlik, eski));
    await vt
      .update(yoneticiDavetleri)
      .set({ bitis: new Date(Date.now() - saklama + 60_000) })
      .where(eq(yoneticiDavetleri.kimlik, sinirda));
    expect(await davetTemizligi(vt)).toBe(1);
    expect((await vt.select().from(yoneticiDavetleri)).map((satir) => satir.kimlik)).toEqual([
      sinirda,
    ]);
  });

  it("iki site birbirinin davetini görmez", async () => {
    const a = await siteAc();
    const b = await siteAc();
    const sahip = await yonetici(a, ["magaza-sahibi"]);
    const { baglanti } = await davetGonder(
      a,
      { eposta: eposta(), roller: ["gorevli"], yenilemeYolu: yol },
      sahip.kim,
    );
    const anahtar = anahtari(baglanti);
    expect(await hatasi(davetiOku(b, anahtar))).toEqual({ kod: "is-kurali", ayrinti: [] });
    expect(await hatasi(davetiKabulEt(b, { anahtar, ad: "Ad", sifre }))).toEqual({
      kod: "is-kurali",
      ayrinti: [],
    });
    expect(await bekleyenDavetler(b)).toEqual([]);
    expect(
      await a
        .select()
        .from(yoneticiDavetleri)
        .where(and(isNull(yoneticiDavetleri.kullanilma_zamani))),
    ).toHaveLength(1);
  });
});
