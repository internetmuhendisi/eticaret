// Değişiklik kaydı gerçek veritabanıyla (kart 0029, karar 0045): rol ve hesap işlemleri doğru kişi, zaman
// ve değerle düşer; var olan kayıt veritabanında değiştirilemez; iş geri alınırsa kayıt da geri alınır.
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type DegisikligiYapan, sistemIslemi } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { baslangicRolleri } from "../../ekip/baslangic-rolleri.ts";
import {
  yoneticiGirisAdimlari,
  yoneticiler,
  yoneticiOturumlari,
  yoneticiRolleri,
} from "../../ekip/model.ts";
import {
  rolAl,
  rolVer,
  tamYetkiliYoneticiAc,
  yoneticiHesabiKapat,
  yoneticininIzniVarMi,
} from "../../ekip/servis.ts";
import { yoneticiSifreAsamasi } from "../../oturum/iki-asamali-giris.ts";
import { girisYap, hesapAc, oturumAcikMi } from "../../oturum/servis.ts";
import { degisiklikKayitlari } from "../model.ts";
import { degisikligiKaydet } from "../servis.ts";

const rolKodlari = Object.keys(baslangicRolleri) as (keyof typeof baslangicRolleri)[];
const [tamYetkili] = rolKodlari.filter((kod) => baslangicRolleri[kod].tamYetki);
const [sinirli] = rolKodlari.filter((kod) => !baslangicRolleri[kod].tamYetki);
if (tamYetkili === undefined || sinirli === undefined) throw new Error("Roller eksik.");

const sifre = "uzun-bir-deneme-sifresi";
let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

const yeniEposta = () => {
  sayac += 1;
  return `kayit${sayac}@ornek.test`;
};

const yeniYonetici = async () => {
  const eposta = yeniEposta();
  const { hesapKimligi } = await hesapAc(vt, "yonetici", { eposta, sifre });
  return { kimlik: hesapKimligi, eposta };
};

const yapan = async (): Promise<DegisikligiYapan> => ({
  tur: "yonetici",
  kimlik: (await yeniYonetici()).kimlik,
});

const kayitlari = (kimlik: string) =>
  vt.select().from(degisiklikKayitlari).where(eq(degisiklikKayitlari.kayit_kimligi, kimlik));

// Bu dosyanın sahibi olmadığı başka yöneticilerin rolleri son sahip kuralını etkilemesin diye
// her son sahip testi önce bütün tam yetkili rolleri temizler.
const sahipleriTemizle = () => vt.delete(yoneticiRolleri);

beforeAll(async () => {
  ({ vt, sil } = await denemeSitesiAc("kayit"));
});
afterAll(() => sil());

describe("rol verme ve alma", () => {
  it("rol verilince kayıt doğru kişi, zaman ve değerle düşer", async () => {
    const kim = await yapan();
    const hedef = await yeniYonetici();
    const once = Date.now();
    await rolVer(vt, { yoneticiKimligi: hedef.kimlik, rolKodu: sinirli }, kim);
    const sonra = Date.now();
    const [kayit, fazla] = await kayitlari(hedef.kimlik);
    expect(fazla).toBeUndefined();
    expect(kayit).toMatchObject({
      kim_turu: "yonetici",
      kim_kimligi: kim.tur === "sistem" ? null : kim.kimlik,
      kim_adi: null,
      islem: "rol.verildi",
      kayit_turu: "yonetici",
      kayit_kimligi: hedef.kimlik,
      eski_deger: null,
      yeni_deger: { rol: sinirli },
    });
    // Veritabanı saati uygulamanınkinden biraz farklı olabilir.
    const zaman = kayit?.zaman.getTime() ?? 0;
    expect(zaman).toBeGreaterThanOrEqual(once - 2000);
    expect(zaman).toBeLessThanOrEqual(sonra + 2000);
  });

  it("zaten verilmiş rol için kayıt düşmez, bilinmeyen rolde de düşmez", async () => {
    const kim = await yapan();
    const hedef = await yeniYonetici();
    await rolVer(vt, { yoneticiKimligi: hedef.kimlik, rolKodu: sinirli }, kim);
    await rolVer(vt, { yoneticiKimligi: hedef.kimlik, rolKodu: sinirli }, kim);
    await expect(
      rolVer(vt, { yoneticiKimligi: hedef.kimlik, rolKodu: "yok" }, kim),
    ).rejects.toMatchObject({ kod: "bulunamadi" });
    expect(await kayitlari(hedef.kimlik)).toHaveLength(1);
  });

  it("kayıt doğru kişiyle yazılır: rol alma ve hesap kapatma da", async () => {
    const kim = await yapan();
    const kimlik = kim.tur === "sistem" ? "" : kim.kimlik;
    const hedef = await yeniYonetici();
    await rolVer(vt, { yoneticiKimligi: hedef.kimlik, rolKodu: sinirli }, kim);
    await rolAl(vt, { yoneticiKimligi: hedef.kimlik, rolKodu: sinirli }, kim);
    await yoneticiHesabiKapat(vt, { yoneticiKimligi: hedef.kimlik }, kim);
    const satirlar = await kayitlari(hedef.kimlik);
    expect(satirlar.map((k) => k.islem).sort()).toEqual([
      "rol.alindi",
      "rol.verildi",
      "yonetici.kapatildi",
    ]);
    for (const satir of satirlar) {
      expect(satir).toMatchObject({ kim_turu: "yonetici", kim_kimligi: kimlik, kim_adi: null });
    }
  });

  it("rol alınınca kayıt eski değerle düşer, taşınmayan rolde düşmez", async () => {
    const kim = await yapan();
    const hedef = await yeniYonetici();
    await rolVer(vt, { yoneticiKimligi: hedef.kimlik, rolKodu: sinirli }, kim);
    await rolAl(vt, { yoneticiKimligi: hedef.kimlik, rolKodu: sinirli }, kim);
    await expect(
      rolAl(vt, { yoneticiKimligi: hedef.kimlik, rolKodu: sinirli }, kim),
    ).rejects.toMatchObject({ kod: "bulunamadi" });
    const alinan = (await kayitlari(hedef.kimlik)).filter((k) => k.islem === "rol.alindi");
    expect(alinan).toHaveLength(1);
    expect(alinan[0]).toMatchObject({ eski_deger: { rol: sinirli }, yeni_deger: null });
  });

  it("son sahibin rolü alınamayınca iş de kayıt da geri alınır", async () => {
    await sahipleriTemizle();
    const kim = await yapan();
    const hedef = await yeniYonetici();
    await rolVer(vt, { yoneticiKimligi: hedef.kimlik, rolKodu: tamYetkili }, kim);
    await expect(
      rolAl(vt, { yoneticiKimligi: hedef.kimlik, rolKodu: tamYetkili }, kim),
    ).rejects.toMatchObject({ kod: "is-kurali" });
    expect((await kayitlari(hedef.kimlik)).map((k) => k.islem)).toEqual(["rol.verildi"]);
  });

  it("kayıt yazılamazsa rol de verilmez: ikisi tek işlemdedir", async () => {
    const hedef = await yeniYonetici();
    // Veritabanı kuralı "kim" alanını boş bırakan kaydı reddeder.
    const bozuk = { tur: "yonetici", kimlik: "kimlik-degil" } as DegisikligiYapan;
    await expect(
      rolVer(vt, { yoneticiKimligi: hedef.kimlik, rolKodu: sinirli }, bozuk),
    ).rejects.toThrow();
    const roller = await vt
      .select()
      .from(yoneticiRolleri)
      .where(eq(yoneticiRolleri.yonetici_kimligi, hedef.kimlik));
    expect(roller).toEqual([]);
  });

  it("kayıt yazılamazsa rol alınmaz, hesap kapatılmaz: ikisi de tek işlemdedir", async () => {
    const kim = await yapan();
    const bozuk = { tur: "yonetici", kimlik: "kimlik-degil" } as DegisikligiYapan;
    const hedef = await yeniYonetici();
    await rolVer(vt, { yoneticiKimligi: hedef.kimlik, rolKodu: sinirli }, kim);
    await expect(
      rolAl(vt, { yoneticiKimligi: hedef.kimlik, rolKodu: sinirli }, bozuk),
    ).rejects.toThrow();
    const roller = await vt
      .select()
      .from(yoneticiRolleri)
      .where(eq(yoneticiRolleri.yonetici_kimligi, hedef.kimlik));
    expect(roller).toHaveLength(1);
    await expect(
      yoneticiHesabiKapat(vt, { yoneticiKimligi: hedef.kimlik }, bozuk),
    ).rejects.toThrow();
    const [satir] = await vt
      .select({ silinme: yoneticiler.silinme_zamani })
      .from(yoneticiler)
      .where(eq(yoneticiler.kimlik, hedef.kimlik));
    expect(satir?.silinme).toBeNull();
  });

  it("komutla açılan yönetici kayıtta komutun adıyla görünür", async () => {
    const { hesapKimligi } = await tamYetkiliYoneticiAc(
      vt,
      { eposta: yeniEposta(), sifre },
      sistemIslemi("yonetici-ac"),
    );
    const [kayit] = await kayitlari(hesapKimligi);
    expect(kayit).toMatchObject({
      kim_turu: "sistem",
      kim_adi: "yonetici-ac",
      kim_kimligi: null,
      islem: "rol.verildi",
    });
  });
});

describe("hesap kapatma", () => {
  it("kayıt düşer, giriş ve açık oturum kapanır, ara adım silinir, kayıt hesapla birlikte kalır", async () => {
    const kim = await yapan();
    const hedef = await yeniYonetici();
    const giris = await girisYap(vt, "yonetici", { eposta: hedef.eposta, sifre }, 3600);
    if (giris === null) throw new Error("Giriş yapılamadı.");
    await yoneticiSifreAsamasi(vt, { eposta: hedef.eposta, sifre }, `b-${hedef.kimlik}`);

    await yoneticiHesabiKapat(vt, { yoneticiKimligi: hedef.kimlik }, kim);

    expect(await kayitlari(hedef.kimlik)).toMatchObject([
      {
        islem: "yonetici.kapatildi",
        eski_deger: { hesap: "acik" },
        yeni_deger: { hesap: "kapali" },
      },
    ]);
    expect(await oturumAcikMi(vt, "yonetici", giris.anahtarlar)).toBe(false);
    const [oturum] = await vt
      .select()
      .from(yoneticiOturumlari)
      .where(eq(yoneticiOturumlari.hesap_kimligi, hedef.kimlik));
    expect(oturum?.kapanma_zamani).toBeInstanceOf(Date);
    expect(
      await vt
        .select()
        .from(yoneticiGirisAdimlari)
        .where(eq(yoneticiGirisAdimlari.yonetici_kimligi, hedef.kimlik)),
    ).toEqual([]);
    expect(await girisYap(vt, "yonetici", { eposta: hedef.eposta, sifre }, 3600)).toBeNull();

    // İkinci kez kapatılamaz, ikinci kayıt düşmez.
    await expect(
      yoneticiHesabiKapat(vt, { yoneticiKimligi: hedef.kimlik }, kim),
    ).rejects.toMatchObject({ kod: "bulunamadi" });
    expect(await kayitlari(hedef.kimlik)).toHaveLength(1);

    // Hesap satırı veritabanından silinse de kayıt kalır: kayıt hesaba bağlı değildir.
    await vt.delete(yoneticiler).where(eq(yoneticiler.kimlik, hedef.kimlik));
    expect(await kayitlari(hedef.kimlik)).toHaveLength(1);
  });

  it("tam yetkili son yöneticinin hesabı kapatılmaz, kayıt düşmez; başka sahip varsa kapatılır", async () => {
    await sahipleriTemizle();
    const kim = await yapan();
    const birinci = await yeniYonetici();
    await rolVer(vt, { yoneticiKimligi: birinci.kimlik, rolKodu: tamYetkili }, kim);
    await expect(
      yoneticiHesabiKapat(vt, { yoneticiKimligi: birinci.kimlik }, kim),
    ).rejects.toMatchObject({ kod: "is-kurali" });
    const [satir] = await vt
      .select({ silinme: yoneticiler.silinme_zamani })
      .from(yoneticiler)
      .where(eq(yoneticiler.kimlik, birinci.kimlik));
    expect(satir?.silinme).toBeNull();
    expect((await kayitlari(birinci.kimlik)).map((k) => k.islem)).toEqual(["rol.verildi"]);

    const ikinci = await yeniYonetici();
    await rolVer(vt, { yoneticiKimligi: ikinci.kimlik, rolKodu: tamYetkili }, kim);
    await yoneticiHesabiKapat(vt, { yoneticiKimligi: birinci.kimlik }, kim);
  });

  it("sahipsiz sitede rolsüz hesap kapatılır, kapalı hesaba rol verilmez, kapalı sahibin izni yok", async () => {
    await sahipleriTemizle();
    const kim = await yapan();
    const rolsuz = await yeniYonetici();
    await yoneticiHesabiKapat(vt, { yoneticiKimligi: rolsuz.kimlik }, kim);
    await expect(
      rolVer(vt, { yoneticiKimligi: rolsuz.kimlik, rolKodu: sinirli }, kim),
    ).rejects.toMatchObject({ kod: "bulunamadi" });

    const a = await yeniYonetici();
    const b = await yeniYonetici();
    await rolVer(vt, { yoneticiKimligi: a.kimlik, rolKodu: tamYetkili }, kim);
    await rolVer(vt, { yoneticiKimligi: b.kimlik, rolKodu: tamYetkili }, kim);
    await yoneticiHesabiKapat(vt, { yoneticiKimligi: a.kimlik }, kim);
    expect(await yoneticininIzniVarMi(vt, a.kimlik, "ekip.kendi-hesabi.gor")).toBe(false);
    expect(await yoneticininIzniVarMi(vt, b.kimlik, "ekip.kendi-hesabi.gor")).toBe(true);
  });

  it("sınırlı rolü olan ya da rolsüz yöneticinin hesabı kapatılır, son sahibe dokunmaz", async () => {
    await sahipleriTemizle();
    const kim = await yapan();
    const sahip = await yeniYonetici();
    await rolVer(vt, { yoneticiKimligi: sahip.kimlik, rolKodu: tamYetkili }, kim);
    const rolsuz = await yeniYonetici();
    await yoneticiHesabiKapat(vt, { yoneticiKimligi: rolsuz.kimlik }, kim);
    expect(await kayitlari(rolsuz.kimlik)).toHaveLength(1);
  });

  it.each([
    ["iki hesap kapatma", "kapat", "kapat"],
    ["hesap kapatma ve rol alma", "kapat", "rol"],
  ])("aynı anda %s: sahip kalır", async (_ad, ilk, ikinci) => {
    for (let tur = 0; tur < 5; tur += 1) {
      await sahipleriTemizle();
      const kim = await yapan();
      const a = await yeniYonetici();
      const b = await yeniYonetici();
      await rolVer(vt, { yoneticiKimligi: a.kimlik, rolKodu: tamYetkili }, kim);
      await rolVer(vt, { yoneticiKimligi: b.kimlik, rolKodu: tamYetkili }, kim);
      const yap = (hangi: string, kimlik: string) =>
        hangi === "kapat"
          ? yoneticiHesabiKapat(vt, { yoneticiKimligi: kimlik }, kim)
          : rolAl(vt, { yoneticiKimligi: kimlik, rolKodu: tamYetkili }, kim);
      const sonuclar = await Promise.allSettled([yap(ilk, a.kimlik), yap(ikinci, b.kimlik)]);
      expect(sonuclar.map((s) => s.status).sort()).toEqual(["fulfilled", "rejected"]);
      const kalan = await vt.execute(sql`
        select count(*)::int as sayi from yonetici_rolleri r
        join yoneticiler y on y.kimlik = r.yonetici_kimligi
        where y.silinme_zamani is null`);
      expect(kalan.rows[0]).toEqual({ sayi: 1 });
    }
  });
});

describe("kayıt değiştirilemez", () => {
  // Uygulamanın kendi veritabanı kullanıcısıyla denenir. Sıradan sorgu geçemez; tetikleyiciyi kapatmak
  // ayrı bir iştir (karar 0045, korumanın sınırı).
  const birKayit = async () => {
    const kim = await yapan();
    const hedef = await yeniYonetici();
    await rolVer(vt, { yoneticiKimligi: hedef.kimlik, rolKodu: sinirli }, kim);
    return hedef.kimlik;
  };

  it("güncelleme reddedilir, değer değişmez", async () => {
    const kimlik = await birKayit();
    await expect(
      vt
        .update(degisiklikKayitlari)
        .set({ kim_turu: "sistem", kim_adi: "sahte", kim_kimligi: null })
        .where(eq(degisiklikKayitlari.kayit_kimligi, kimlik)),
    ).rejects.toMatchObject({ cause: { code: "23001" } });
    const [kayit] = await kayitlari(kimlik);
    expect(kayit?.kim_turu).toBe("yonetici");
  });

  it("silme reddedilir, kayıt yerinde kalır", async () => {
    const kimlik = await birKayit();
    await expect(
      vt.delete(degisiklikKayitlari).where(eq(degisiklikKayitlari.kayit_kimligi, kimlik)),
    ).rejects.toMatchObject({ cause: { code: "23001" } });
    expect(await kayitlari(kimlik)).toHaveLength(1);
  });

  it("toplu silme reddedilir", async () => {
    const kimlik = await birKayit();
    await expect(vt.execute(sql`truncate degisiklik_kayitlari`)).rejects.toMatchObject({
      cause: { code: "23001" },
    });
    expect(await kayitlari(kimlik)).toHaveLength(1);
  });

  it("hiçbir satıra denk gelmeyen güncelleme de reddedilir", async () => {
    await expect(
      vt
        .update(degisiklikKayitlari)
        .set({ islem: "sahte" })
        .where(eq(degisiklikKayitlari.kim_adi, "olmayan-bir-ad")),
    ).rejects.toMatchObject({ cause: { code: "23001" } });
  });
});

describe("kayıt içeriği", () => {
  const kaydet = (eski: Record<string, unknown> | null, yeni: Record<string, unknown> | null) =>
    vt.transaction((islem) =>
      degisikligiKaydet(islem, {
        kim: sistemIslemi("test"),
        islem: "rol.verildi",
        kayit: { tur: "yonetici", kimlik: randomUUID() },
        eski,
        yeni,
      }),
    );

  it.each([
    ["şifre alanı", { sifre: "x" }],
    ["alt alanda anahtar", { hesap: { yenileme_anahtari: "x" } }],
    ["camelCase anahtar", { kisaAnahtar: "x" }],
    ["yedek kodlar", { yedek_kodlari: ["x"] }],
    ["e-posta alanı", { eposta: "x" }],
    ["e-posta değeri", { kisi: "a@ornek.test" }],
    ["dizideki e-posta", { kisiler: ["a@ornek.test"] }],
    ["oturum anahtarı değeri", { baslik: "Bearer abc" }],
    ["jwt değeri", { deger: "eyJhbGciOiJ9.eyJhIjoxfQ.imza" }],
    ["basic giriş başlığı", { baslik: "Basic YWRtaW46Z2l6bGk=" }],
    ["küçük harfle basic başlığı", { baslik: "basic dTpw" }],
    ["Türkçe harfli şifreyle basic başlığı", { baslik: "Basic YWRtaW46xZ9pZnJl" }],
    ["sonda boşluklu basic başlığı", { baslik: "Basic YWRtaW46Z2l6bGk= " }],
    ["dolgusuz basic başlığı", { baslik: "Basic YWRtaW46Z2l6bGk" }],
    ["sonda satır sonlu e-posta", { kisi: "a@ornek.test\n" }],
    ["tarih nesnesi", { zaman: new Date() }],
  ])("%s kayda girmez, iş durur", async (_ad, deger) => {
    await expect(kaydet(null, deger)).rejects.toThrow(/Değişiklik kaydına/);
    await expect(kaydet(deger, null)).rejects.toThrow(/Değişiklik kaydına/);
  });

  // Kart 0076: ürün adı "Basic" ile başlayabilir; yalnız "kullanıcı:şifre" taşıyan başlık yakalanır.
  it.each([
    ["Basic Kazak"],
    ["Basic Sweatshirt"],
    ["basic tee"],
    ["Basic Tees"],
    ["Basic Hoodie"],
    ["İletişim: destek@ornek.test adresine yazın."],
  ])("%s düz metin olarak kayda girer", async (metin) => {
    const kayit = randomUUID();
    await vt.transaction((islem) =>
      degisikligiKaydet(islem, {
        kim: sistemIslemi("test"),
        islem: "rol.verildi",
        kayit: { tur: "yonetici", kimlik: kayit },
        eski: null,
        yeni: { ad: metin },
      }),
    );
    const [satir] = await kayitlari(kayit);
    expect(satir?.yeni_deger).toEqual({ ad: metin });
  });

  it("kimlik, sayı ve iş değerleri bozulmadan yazılır", async () => {
    const kimlik = randomUUID();
    const deger = {
      kimlik,
      fiyat: "12345678.90",
      tam: 1234567890,
      barkod: "8690123456789",
      siparis_no: "2026-000123",
      gizli_urun: true,
      kart_komisyonu: 3,
      etiket: null,
    };
    const kayit = randomUUID();
    await vt.transaction((islem) =>
      degisikligiKaydet(islem, {
        kim: sistemIslemi("test"),
        islem: "rol.verildi",
        kayit: { tur: "yonetici", kimlik: kayit },
        eski: null,
        yeni: deger,
      }),
    );
    const [satir] = await kayitlari(kayit);
    expect(satir?.yeni_deger).toEqual(deger);
  });

  it("veritabanı kuralı kimsiz, adı boş ya da uydurma türlü kaydı reddeder", async () => {
    const kayit = randomUUID();
    await expect(
      vt.execute(sql`insert into degisiklik_kayitlari (kim_turu, islem, kayit_turu, kayit_kimligi)
        values ('yonetici', 'rol.verildi', 'yonetici', ${kayit})`),
    ).rejects.toThrow();
    await expect(
      vt.execute(sql`insert into degisiklik_kayitlari (kim_turu, kim_adi, islem, kayit_turu, kayit_kimligi)
        values ('sistem', '', 'rol.verildi', 'yonetici', ${kayit})`),
    ).rejects.toThrow();
    await expect(
      vt.execute(sql`insert into degisiklik_kayitlari (kim_turu, kim_adi, islem, kayit_turu, kayit_kimligi)
        values ('uydurma', 'x', 'rol.verildi', 'yonetici', ${kayit})`),
    ).rejects.toThrow();
  });

  it("rol işlemleri kayda e-posta ve şifre yazmaz", async () => {
    const hedefEposta = yeniEposta();
    const { hesapKimligi } = await tamYetkiliYoneticiAc(
      vt,
      { eposta: hedefEposta, sifre },
      sistemIslemi("yonetici-ac"),
    );
    const metin = JSON.stringify(await kayitlari(hesapKimligi));
    expect(metin).not.toContain(hedefEposta);
    expect(metin).not.toContain(sifre);
  });
});
