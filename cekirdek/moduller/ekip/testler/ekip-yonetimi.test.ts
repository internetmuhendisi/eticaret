// Panelin ekip işleri gerçek veritabanıyla (kartlar 0274 ve 0053, karar 0178):
// - Rolleri ayarlama: eksik rol verilir, fazlası alınır, her değişiklik kayda girer, aynı liste bir şey yazmaz; boş
//   liste ve kayıtta olmayan rol reddedilir; tam yetkili son yöneticinin tam yetkili rolü alınamaz (son-sahip) ve
//   hiçbir şey değişmez; yönetici kendi rollerini değiştiremez, kendi hesabını kapatamaz, kendi iki aşamalı girişini
//   sıfırlayamaz (kendi-hesabi); rol alınınca izin hemen gider.
// - İki aşamalı girişi sıfırlama: eski zamanlı kod ve yedek kodlar geçmez, açık oturum ve ara adım düşer, yönetici
//   yalnız yeniden kurulumla girer; kurulumu olmayan yöneticide kurulu-degil; kayda girer.
// - Yedek kodları yenileme: telefondaki kodla; eski yedek kodlar geçmez, yenisi geçer; yanlış kod giris-hatasi ve
//   hiçbir şey değişmez; aynı zamanlı kod ikinci kez geçmez; kayda kodlar girmez.
// - Ekip listesi: roller, kurulum ve son giriş; kapatılan hesap listede yok. İki site birbirinin yöneticisine dokunmaz.
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { kodAdimi, zamanliKod } from "../../oturum/iki-asama.ts";
import {
  girisAdiminiOku,
  kodlaGirisiBitir,
  kurulumuHazirla,
  kurulumuOnayla,
  yedekKodlariniYenile,
  yoneticiSifreAsamasi,
} from "../../oturum/iki-asamali-giris.ts";
import { hesapAc, hesapSifresiniDogrula } from "../../oturum/servis.ts";
import { sifreOzetle } from "../../oturum/sifre.ts";
import {
  yoneticiGirisAdimlari,
  yoneticiler,
  yoneticiOturumlari,
  yoneticiSifreSifirlamalari,
  yoneticiYedekKodlari,
} from "../model.ts";
import {
  ekibiOku,
  ikiAsamaliGirisiSifirla,
  rolleriAyarla,
  rolleriOku,
  rolVer,
  yoneticiHesabiKapat,
  yoneticininIzniVarMi,
} from "../servis.ts";

const sistem: DegisikligiYapan = { tur: "sistem", ad: "deneme" };
const sifre = "uzun-bir-deneme-sifresi";

const temizlenecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const acilan = await denemeSitesiAc("ekip-yonetimi");
  temizlenecekler.push(acilan.sil);
  return acilan.vt;
};
afterEach(async () => {
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

let sayac = 0;
const baglanti = () => {
  sayac += 1;
  return `2001:db8::${sayac.toString(16)}`;
};

const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti };
};

const yonetici = async (vt: Veritabani, roller: string[] = []) => {
  const eposta = `y${randomUUID().slice(0, 8)}@ornek.test`;
  const { hesapKimligi } = await hesapAc(vt, "yonetici", { eposta, sifre });
  for (const rolKodu of roller)
    await rolVer(vt, { yoneticiKimligi: hesapKimligi, rolKodu }, sistem);
  return { kimlik: hesapKimligi, eposta, kim: { tur: "yonetici" as const, kimlik: hesapKimligi } };
};

// Şifre ve kurulumla iki aşamalı girişi kurar; gizliyi ve yedek kodları döner.
const kur = async (vt: Veritabani, eposta: string) => {
  const { anahtar } = await yoneticiSifreAsamasi(vt, { eposta, sifre }, baglanti());
  const girisAdimi = await girisAdiminiOku(vt, anahtar);
  if (girisAdimi === null) throw new Error("Ara adım yok.");
  const kurulum = await kurulumuHazirla(vt, anahtar, girisAdimi, "Deneme");
  if (kurulum === null) throw new Error("Kurulum hazırlanamadı.");
  const adim = kodAdimi();
  const { yedekKodlari } = await kurulumuOnayla(
    vt,
    anahtar,
    zamanliKod(kurulum.gizli, adim),
    baglanti(),
    3600,
  );
  return { gizli: kurulum.gizli, yedekKodlari, adim };
};

// Şifreden sonra kodla giriş denemesi: başarıda "giris", hata kodunda kodun kendisi.
const kodlaGir = async (vt: Veritabani, eposta: string, kod: string) => {
  const { anahtar, durum } = await yoneticiSifreAsamasi(vt, { eposta, sifre }, baglanti());
  if (durum !== "kod") return durum;
  try {
    await kodlaGirisiBitir(vt, anahtar, kod, baglanti(), 3600);
    return "giris";
  } catch (hata) {
    if (hata instanceof BilinenHata) return hata.kod;
    throw hata;
  }
};

const kayitlar = async (vt: Veritabani, kimlik: string) =>
  (
    await vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kayit_kimligi, kimlik))
      .orderBy(degisiklikKayitlari.zaman)
  ).map((satir) => [satir.islem, satir.eski_deger, satir.yeni_deger]);

describe("rolleri ayarlama", () => {
  it("eksik rol verilir, fazlası alınır, kayda girer; aynı liste bir şey yazmaz; izin hemen değişir", async () => {
    const vt = await siteAc();
    const sahip = await yonetici(vt, ["magaza-sahibi"]);
    const ece = await yonetici(vt, ["gorevli"]);
    expect(await yoneticininIzniVarMi(vt, ece.kimlik, "urun.gor")).toBe(true);
    expect(await yoneticininIzniVarMi(vt, ece.kimlik, "icerik.gor")).toBe(false);
    await rolleriAyarla(
      vt,
      { yoneticiKimligi: ece.kimlik, roller: ["icerik-editoru", "siparis-gorevlisi"] },
      sahip.kim,
    );
    expect((await ekibiOku(vt, { kimlik: ece.kimlik }))[0]?.roller).toEqual([
      "icerik-editoru",
      "siparis-gorevlisi",
    ]);
    // Görevlinin ürün değiştirme izni gitti, içerik ve sipariş izinleri geldi: bir sonraki istekte geçerli.
    expect(await yoneticininIzniVarMi(vt, ece.kimlik, "urun.degistir")).toBe(false);
    expect(await yoneticininIzniVarMi(vt, ece.kimlik, "icerik.degistir")).toBe(true);
    expect(await yoneticininIzniVarMi(vt, ece.kimlik, "siparis.havale-onayla")).toBe(true);
    expect(await yoneticininIzniVarMi(vt, ece.kimlik, "siparis.iade")).toBe(false);
    const once = await kayitlar(vt, ece.kimlik);
    await rolleriAyarla(
      vt,
      { yoneticiKimligi: ece.kimlik, roller: ["siparis-gorevlisi", "icerik-editoru"] },
      sahip.kim,
    );
    expect(await kayitlar(vt, ece.kimlik)).toEqual(once);
    expect(once.slice(-3)).toEqual([
      ["rol.verildi", null, { rol: "icerik-editoru" }],
      ["rol.verildi", null, { rol: "siparis-gorevlisi" }],
      ["rol.alindi", { rol: "gorevli" }, null],
    ]);
    expect(
      await hatasi(rolleriAyarla(vt, { yoneticiKimligi: ece.kimlik, roller: [] }, sahip.kim)),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "roller", kod: "rol-gerekli" }] });
    expect(
      await hatasi(
        rolleriAyarla(vt, { yoneticiKimligi: ece.kimlik, roller: ["olmayan"] }, sahip.kim),
      ),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "roller", kod: "rol-yok" }] });
    expect(
      (
        await hatasi(
          rolleriAyarla(vt, { yoneticiKimligi: randomUUID(), roller: ["gorevli"] }, sahip.kim),
        )
      ).kod,
    ).toBe("bulunamadi");
  });

  it("son mağaza sahibinin tam yetkisi alınamaz, hiçbir şey değişmez; kendi rolleri, hesabı ve girişi değişmez", async () => {
    const vt = await siteAc();
    const sahip = await yonetici(vt, ["magaza-sahibi"]);
    const ikinci = await yonetici(vt, ["magaza-sahibi", "gorevli"]);
    // İkinci sahip, ilk sahibin tam yetkisini alabilir (sahip kalıyor); son sahibinkini alamaz.
    await rolleriAyarla(vt, { yoneticiKimligi: sahip.kimlik, roller: ["gorevli"] }, ikinci.kim);
    const once = await kayitlar(vt, ikinci.kimlik);
    expect(
      await hatasi(
        rolleriAyarla(
          vt,
          { yoneticiKimligi: ikinci.kimlik, roller: ["siparis-gorevlisi"] },
          sistem,
        ),
      ),
    ).toEqual({ kod: "is-kurali", ayrinti: [{ alan: "yonetici", kod: "son-sahip" }] });
    expect((await ekibiOku(vt, { kimlik: ikinci.kimlik }))[0]?.roller).toEqual([
      "gorevli",
      "magaza-sahibi",
    ]);
    expect(await kayitlar(vt, ikinci.kimlik)).toEqual(once);
    expect(
      await hatasi(yoneticiHesabiKapat(vt, { yoneticiKimligi: ikinci.kimlik }, sistem)),
    ).toEqual({ kod: "is-kurali", ayrinti: [{ alan: "yonetici", kod: "son-sahip" }] });
    const kendi = { kod: "is-kurali", ayrinti: [{ alan: "yonetici", kod: "kendi-hesabi" }] };
    expect(
      await hatasi(
        rolleriAyarla(vt, { yoneticiKimligi: ikinci.kimlik, roller: ["gorevli"] }, ikinci.kim),
      ),
    ).toEqual(kendi);
    expect(
      await hatasi(yoneticiHesabiKapat(vt, { yoneticiKimligi: ikinci.kimlik }, ikinci.kim)),
    ).toEqual(kendi);
    expect(
      await hatasi(ikiAsamaliGirisiSifirla(vt, { yoneticiKimligi: ikinci.kimlik }, ikinci.kim)),
    ).toEqual(kendi);
    // Kapatılan hesap listede yok; kapatılan hesaba rol verilemez.
    await yoneticiHesabiKapat(vt, { yoneticiKimligi: sahip.kimlik }, ikinci.kim);
    expect((await ekibiOku(vt)).map((uye) => uye.kimlik)).toEqual([ikinci.kimlik]);
    expect(
      (
        await hatasi(
          rolleriAyarla(vt, { yoneticiKimligi: sahip.kimlik, roller: ["gorevli"] }, ikinci.kim),
        )
      ).kod,
    ).toBe("bulunamadi");
  });

  it("roller tanım sırasıyla: mağaza sahibi tam yetkili, öteki üç rol sınırlı", async () => {
    const vt = await siteAc();
    expect((await rolleriOku(vt)).map((rol) => [rol.kod, rol.tamYetki])).toEqual([
      ["magaza-sahibi", true],
      ["gorevli", false],
      ["siparis-gorevlisi", false],
      ["icerik-editoru", false],
    ]);
  });
});

describe("iki aşamalı girişi sıfırlama (kart 0053)", () => {
  it("eski şifre, kod ve yedek kodlar geçmez, oturum ve açık şifre bağlantısı düşer; yönetici yeni şifre ve yeniden kurulumla girer; kayda girer", async () => {
    const vt = await siteAc();
    const sahip = await yonetici(vt, ["magaza-sahibi"]);
    const ece = await yonetici(vt, ["gorevli"]);
    const { gizli, yedekKodlari, adim } = await kur(vt, ece.eposta);
    expect((await ekibiOku(vt, { kimlik: ece.kimlik }))[0]).toMatchObject({
      ikiAsamaKurulu: true,
      sonGiris: expect.any(Date),
    });
    // Sıfırlanmadan önce yedek kod geçer.
    expect(await kodlaGir(vt, ece.eposta, yedekKodlari[0] ?? "")).toBe("giris");
    // Açık kalan bir ara adım da düşer.
    const { anahtar: acikAdim } = await yoneticiSifreAsamasi(
      vt,
      { eposta: ece.eposta, sifre },
      baglanti(),
    );
    // Açık bir şifre bağlantısı (ör. telefonu alan kişinin istediği) da düşer.
    await vt.insert(yoneticiSifreSifirlamalari).values({
      hesap_kimligi: ece.kimlik,
      anahtar_ozeti: `acik-${randomUUID()}`,
      bitis: new Date(Date.now() + 3_600_000),
    });
    await ikiAsamaliGirisiSifirla(vt, { yoneticiKimligi: ece.kimlik }, sahip.kim);
    // Eski şifre geçmez (telefonla birlikte çalınmış olabilir), açık şifre bağlantısı silindi.
    expect(await hesapSifresiniDogrula(vt, "yonetici", { eposta: ece.eposta, sifre })).toBeNull();
    expect(
      await vt
        .select()
        .from(yoneticiSifreSifirlamalari)
        .where(eq(yoneticiSifreSifirlamalari.hesap_kimligi, ece.kimlik)),
    ).toEqual([]);
    // Yönetici bağlantıyla yeni şifre koyar (bağlantının kendisi şifre sıfırlama testlerinde).
    await vt
      .update(yoneticiler)
      .set({ sifre_ozeti: await sifreOzetle(sifre) })
      .where(eq(yoneticiler.kimlik, ece.kimlik));
    const acikOturumlar = await vt
      .select()
      .from(yoneticiOturumlari)
      .where(eq(yoneticiOturumlari.hesap_kimligi, ece.kimlik));
    expect(acikOturumlar.every((oturum) => oturum.kapanma_zamani !== null)).toBe(true);
    expect(
      (await hatasi(kodlaGirisiBitir(vt, acikAdim, zamanliKod(gizli, adim + 1), baglanti(), 3600)))
        .kod,
    ).toBe("oturum-yok");
    expect(
      await vt
        .select()
        .from(yoneticiYedekKodlari)
        .where(eq(yoneticiYedekKodlari.yonetici_kimligi, ece.kimlik)),
    ).toEqual([]);
    // Şifreden sonra kurulum ekranına düşer: eski kod ve yedek kod sorulmaz bile.
    expect(await kodlaGir(vt, ece.eposta, zamanliKod(gizli, adim + 2))).toBe("kurulum");
    expect(await kodlaGir(vt, ece.eposta, yedekKodlari[1] ?? "")).toBe("kurulum");
    expect((await ekibiOku(vt, { kimlik: ece.kimlik }))[0]?.ikiAsamaKurulu).toBe(false);
    // Yeniden kurulumla girer; eski gizli artık geçmez.
    const yeni = await kur(vt, ece.eposta);
    expect(yeni.gizli).not.toBe(gizli);
    expect(await kodlaGir(vt, ece.eposta, zamanliKod(gizli, yeni.adim + 1))).toBe("giris-hatasi");
    expect(await kodlaGir(vt, ece.eposta, yeni.yedekKodlari[0] ?? "")).toBe("giris");
    expect(
      (await kayitlar(vt, ece.kimlik)).filter(
        ([islem]) => islem === "yonetici.iki-asama-sifirlandi",
      ),
    ).toEqual([
      [
        "yonetici.iki-asama-sifirlandi",
        { ikiAsama: "kurulu", giris: "acik" },
        { ikiAsama: "kurulu-degil", giris: "yeni-baglanti-gerekli" },
      ],
    ]);
    // Kurulumu olmayan yöneticide bir şey yapılmaz.
    const kurulmamis = await yonetici(vt, ["gorevli"]);
    expect(
      await hatasi(ikiAsamaliGirisiSifirla(vt, { yoneticiKimligi: kurulmamis.kimlik }, sahip.kim)),
    ).toEqual({ kod: "is-kurali", ayrinti: [{ alan: "yonetici", kod: "kurulu-degil" }] });
  });
});

describe("yarışlar ve işlemin içindeki izin (bağımsız kontrolün bulguları)", () => {
  it("sıfırlama, açık duran giriş adımının yönetici satırına bağlanan yazmasıyla kilitlenmez (sıra kurularak)", async () => {
    const vt = await siteAc();
    const sahip = await yonetici(vt, ["magaza-sahibi"]);
    const ece = await yonetici(vt, ["gorevli"]);
    await kur(vt, ece.eposta);
    await yoneticiSifreAsamasi(vt, { eposta: ece.eposta, sifre }, baglanti());
    // Kod girişi gibi: ara adımı kilitler, sıfırlama onu bekleyince yönetici satırına bağlı bir satır yazar.
    let kilitAlindi: () => void = () => undefined;
    const kilitAlindiSozu = new Promise<void>((coz) => {
      kilitAlindi = coz;
    });
    let devam: () => void = () => undefined;
    const devamSozu = new Promise<void>((coz) => {
      devam = coz;
    });
    const giris = vt.transaction(async (islem) => {
      await islem
        .select()
        .from(yoneticiGirisAdimlari)
        .where(eq(yoneticiGirisAdimlari.yonetici_kimligi, ece.kimlik))
        .for("update");
      kilitAlindi();
      await devamSozu;
      await islem
        .insert(yoneticiYedekKodlari)
        .values({ yonetici_kimligi: ece.kimlik, kod_ozeti: `yaris-${randomUUID()}` });
    });
    await Promise.race([kilitAlindiSozu, giris]);
    const sifirlama = ikiAsamaliGirisiSifirla(vt, { yoneticiKimligi: ece.kimlik }, sahip.kim);
    await kilitBekleyeniGor(vt);
    devam();
    await giris;
    await sifirlama;
    // Sıfırlama, bekleyen girişin yazdığını da sildi.
    expect(
      await vt
        .select()
        .from(yoneticiYedekKodlari)
        .where(eq(yoneticiYedekKodlari.yonetici_kimligi, ece.kimlik)),
    ).toEqual([]);
  });

  it("izni alınmış yöneticinin işi yetki alır, hiçbir şey değişmez", async () => {
    const vt = await siteAc();
    const sahip = await yonetici(vt, ["magaza-sahibi"]);
    const eski = await yonetici(vt, ["magaza-sahibi"]);
    const ece = await yonetici(vt, ["gorevli"]);
    await kur(vt, ece.eposta);
    await rolleriAyarla(vt, { yoneticiKimligi: eski.kimlik, roller: ["gorevli"] }, sahip.kim);
    expect(
      (
        await hatasi(
          rolleriAyarla(vt, { yoneticiKimligi: ece.kimlik, roller: ["magaza-sahibi"] }, eski.kim),
        )
      ).kod,
    ).toBe("yetki");
    expect(
      (await hatasi(yoneticiHesabiKapat(vt, { yoneticiKimligi: ece.kimlik }, eski.kim))).kod,
    ).toBe("yetki");
    expect(
      (await hatasi(ikiAsamaliGirisiSifirla(vt, { yoneticiKimligi: ece.kimlik }, eski.kim))).kod,
    ).toBe("yetki");
    expect((await ekibiOku(vt, { kimlik: ece.kimlik }))[0]).toMatchObject({
      roller: ["gorevli"],
      ikiAsamaKurulu: true,
    });
  });

  it("iki sahip aynı anda birbirinin sahipliğini alırsa biri geçer, öteki yetki alır; sahip tek kalır", async () => {
    const vt = await siteAc();
    const a = await yonetici(vt, ["magaza-sahibi"]);
    const b = await yonetici(vt, ["magaza-sahibi"]);
    const sonuclar = await Promise.allSettled([
      rolleriAyarla(vt, { yoneticiKimligi: b.kimlik, roller: ["gorevli"] }, a.kim),
      rolleriAyarla(vt, { yoneticiKimligi: a.kimlik, roller: ["gorevli"] }, b.kim),
    ]);
    expect(sonuclar.filter((sonuc) => sonuc.status === "fulfilled")).toHaveLength(1);
    const reddedilen = sonuclar.find((sonuc) => sonuc.status === "rejected");
    const neden = reddedilen?.status === "rejected" ? reddedilen.reason : undefined;
    // Önce geçen, ötekinin sahipliğini aldı: ikinci işin yapanı artık sahip değildir.
    expect(neden instanceof BilinenHata ? neden.kod : neden).toBe("yetki");
    const sahipler = (await ekibiOku(vt)).filter((uye) => uye.roller.includes("magaza-sahibi"));
    expect(sahipler).toHaveLength(1);
  });
});

describe("yedek kodları yenileme (kart 0053)", () => {
  it("telefondaki kodla yenilenir; eskiler geçmez, yenisi geçer; yanlış ve tekrar kod hiçbir şey değiştirmez", async () => {
    const vt = await siteAc();
    const ece = await yonetici(vt, ["gorevli"]);
    const { gizli, yedekKodlari, adim } = await kur(vt, ece.eposta);
    const girdi = (kod: string) => ({
      hesapKimligi: ece.kimlik,
      eposta: ece.eposta,
      kod,
      baglanti: baglanti(),
    });
    // Yanlış kod: hiçbir şey değişmez, eski yedek kod hâlâ geçer.
    expect((await hatasi(yedekKodlariniYenile(vt, girdi("000000")))).kod).toBe("giris-hatasi");
    expect((await hatasi(yedekKodlariniYenile(vt, girdi(yedekKodlari[0] ?? "")))).kod).toBe(
      "giris-hatasi",
    );
    const kod = zamanliKod(gizli, adim + 1);
    const yeniler = await yedekKodlariniYenile(vt, girdi(kod));
    expect(yeniler).toHaveLength(yedekKodlari.length);
    expect(yeniler.some((yedek) => yedekKodlari.includes(yedek))).toBe(false);
    // Aynı zamanlı kod ikinci kez geçmez.
    expect((await hatasi(yedekKodlariniYenile(vt, girdi(kod)))).kod).toBe("giris-hatasi");
    expect(await kodlaGir(vt, ece.eposta, yedekKodlari[1] ?? "")).toBe("giris-hatasi");
    expect(await kodlaGir(vt, ece.eposta, yeniler[0] ?? "")).toBe("giris");
    const kayit = (await kayitlar(vt, ece.kimlik)).filter(
      ([islem]) => islem === "yonetici.yedek-kodlari-yenilendi",
    );
    expect(kayit).toEqual([["yonetici.yedek-kodlari-yenilendi", null, { adet: yeniler.length }]]);
    expect(JSON.stringify(kayit)).not.toContain(yeniler[0] ?? "-");
    // Kurulumu olmayan yöneticide yenilenmez.
    const kurulmamis = await yonetici(vt, ["gorevli"]);
    expect(
      (
        await hatasi(
          yedekKodlariniYenile(vt, {
            hesapKimligi: kurulmamis.kimlik,
            eposta: kurulmamis.eposta,
            kod: "123456",
            baglanti: baglanti(),
          }),
        )
      ).kod,
    ).toBe("is-kurali");
  });
});

describe("iki site", () => {
  it("bir sitenin ekibi ötekinde görünmez, ötekinin yöneticisine dokunulamaz", async () => {
    const birinci = await siteAc();
    const ikinci = await siteAc();
    const sahip = await yonetici(birinci, ["magaza-sahibi"]);
    const oteki = await yonetici(ikinci, ["gorevli"]);
    expect((await ekibiOku(birinci)).map((uye) => uye.kimlik)).toEqual([sahip.kimlik]);
    for (const is of [
      () =>
        rolleriAyarla(birinci, { yoneticiKimligi: oteki.kimlik, roller: ["gorevli"] }, sahip.kim),
      () => yoneticiHesabiKapat(birinci, { yoneticiKimligi: oteki.kimlik }, sahip.kim),
      () => ikiAsamaliGirisiSifirla(birinci, { yoneticiKimligi: oteki.kimlik }, sahip.kim),
    ]) {
      expect((await hatasi(is())).kod).toBe("bulunamadi");
    }
    expect((await ekibiOku(ikinci))[0]?.roller).toEqual(["gorevli"]);
    expect(
      (
        await ikinci
          .select()
          .from(yoneticiOturumlari)
          .where(and(eq(yoneticiOturumlari.hesap_kimligi, oteki.kimlik)))
      ).length,
    ).toBe(0);
  });
});
