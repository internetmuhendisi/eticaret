// Ödeme adımı gerçek veritabanıyla (kart 0213, karar 0140):
// - Üye olmayan ve üye müşteri oturum açar; e-posta, teslimat, fatura, not, sunucunun hesapladığı toplam ve onaylar
//   metin sürümüyle yazılır. Tarayıcıdan gelen tutar (görülen fiyat) toplamı değiştirmez.
// - Üye olmadan alışveriş kapalıyken üye olmayan oturum-yok alır, üye geçer. Telefonun zorunluluğu ayardır. Teslimat
//   adresi sitenin teslimat ülkelerindedir.
// - Vergi teslimat ya da fatura adresinin bölgesiyle hesaplanır (vergiAdresi), bölge tabloda yoksa mağaza adresi.
// - Pazarlama izni yalnız işaretlenince verilir: üye müşteride hesabın onaylarına yeni satır, işaretsizde satır yok.
// - Ödemede hesap açma: hesap, onaylar ve oturum birlikte; kayıtlı e-posta çakışma, oturum ve ayırma yazılmaz.
// - Sepet ödemeye geçilemezse ya da müşterinin görmediği değişiklik varsa oturum açılmaz.
// - Stok ayırma: takibi açık birim ayrılır, kapalı ayrılmaz; son ürün iki kez ayrılmaz (sırayla, aynı anda ve açık
//   duran ayırmanın arkasında kilitte bekleyerek); süresi dolan ayırma sayılmaz; müşterinin bir önceki oturumu
//   serbest kalır, başkasınınki kalmaz; ayırma yazılamazsa oturum da yazılmaz.
// - Temizlik süresi dolup saklama süresini geçen oturumu ayırmasıyla siler, yeniyi silmez.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { musteriOnayTurleri, siparisOnayTurleri } from "../../../kayitlar/musteri-onaylari.ts";
import { odemeOturumuSaklamaSaat } from "../../../kayitlar/odeme.ts";
import { baglantiyiKapat } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { musteriler, musteriOnaylari } from "../../musteri/model.ts";
import { hesapAc } from "../../oturum/servis.ts";
import { birimStoklari, stokAyirmalari } from "../../stok/model.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { odemeOturumlari } from "../model.ts";
import { odemeBilgileriSemasi } from "../semalar.ts";
import { eskiOdemeOturumlariniSil, type OdemeGirdisi, odemeServisi } from "../servis.ts";

vi.setConfig({ testTimeout: 60_000 });

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

// Vergi tablosu dolu deneme sitesi: Genel %18, İstanbul'un 34000 posta kodunda ek %0,5. Mağaza Ankara'da.
const klasor = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const site: Site = {
  ...klasor,
  baslangic: {
    ...klasor.baslangic,
    vergiAdi: "Deneme vergisi",
    magazaAdresi: {
      ulke: "TR",
      il: "TR-06",
      ilce: "TR-06-007",
      adres: "Deneme Sokak No: 1",
      postaKodu: "06000",
    },
  },
};
const servis = odemeServisi(site);
const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
const fiyat = siteninFiyatServisi(site);
const stok = stokServisi();
const oturumSuresi = 3600;

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const hazirla = async () => {
  const deneme = await denemeSitesiAc("odeme");
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const tablo = await siteninVergiServisi(site).tabloyuOku(vt);
  const genel = tablo.find((sinif) => sinif.ad === "Genel")?.kimlik;
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  const urunAc = async ({ miktar = 50, takip = true, satis = 11_800 } = {}) => {
    const urun = await urunSrv.urunEkle(vt, yonetici(), {
      ad: `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: genel,
      durum: "yayinda",
      stokTakibi: takip,
    });
    const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await fiyat.fiyatYaz(vt, yonetici(), birim, { satisFiyati: satis });
    if (miktar > 0 && takip) {
      await stok.stokDuzelt(vt, yonetici(), birim, {
        yeniMiktar: miktar,
        gorulenMiktar: 0,
        sebep: "sayim",
      });
    }
    return birim;
  };
  const ayarla = (ayarlar: Parameters<ReturnType<typeof siteninServisi>["degistir"]>[2]) =>
    siteninServisi(site).degistir(vt, yonetici(), ayarlar);
  const musteriAc = async () =>
    (
      await hesapAc(vt, "musteri", {
        eposta: `uye-${randomUUID().slice(0, 8)}@ornek.test`,
        sifre: "uzun-bir-sifre-123",
      })
    ).hesapKimligi;
  const oturumlar = () => vt.select().from(odemeOturumlari);
  const ayirmalar = () => vt.select().from(stokAyirmalari);
  return { vt, urunAc, ayarla, musteriAc, oturumlar, ayirmalar };
};

const teslimat = {
  ad: "Deniz",
  soyad: "Yılmaz",
  telefon: "0555 000 00 00",
  adres: {
    ulke: "TR",
    il: "TR-06",
    ilce: "TR-06-007",
    adres: "Atatürk Bulvarı No: 10",
    postaKodu: "06420",
  },
};

const bilgiler = (ek: Record<string, unknown> = {}) =>
  odemeBilgileriSemasi.parse({
    teslimat,
    fatura: { tur: "bireysel", adresAyni: true },
    onBilgilendirmeOnayi: true,
    mesafeliSatisOnayi: true,
    pazarlamaIzni: false,
    ...ek,
  });

const misafir = (eposta = "misafir@ornek.test"): OdemeGirdisi["kim"] => ({
  tur: "misafir",
  eposta,
  hesap: { ac: false },
});

const hatasi = async (is: Promise<unknown>) => {
  try {
    await is;
  } catch (hata) {
    if (hata instanceof BilinenHata) return { kod: hata.kod, ayrinti: hata.ayrinti };
    throw hata;
  }
  throw new Error("Hata bekleniyordu.");
};

describe("ödeme oturumu", () => {
  it("üye olmayan müşterinin oturumu bilgileri, sunucunun toplamını ve onayları sürümüyle yazar", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const b = await h.urunAc({ satis: 5_900 });
    const sonuc = await servis.oturumAc(
      h.vt,
      {
        kim: misafir(),
        bilgiler: bilgiler({ not: "  Akşam teslim edin.  " }),
        // Görülen fiyat bugünkü fiyatla aynı; tutar tarayıcıdan gelmez.
        kalemler: [
          { birim: a, adet: 2, gorulenTutar: 11_800 },
          { birim: b, adet: 1 },
        ],
      },
      oturumSuresi,
    );
    const [oturum] = await h.oturumlar();
    expect(oturum).toMatchObject({
      kimlik: sonuc.oturum,
      musteri_kimligi: null,
      eposta: "misafir@ornek.test",
      not: "Akşam teslim edin.",
      kalemler: [
        { birim: a, adet: 2 },
        { birim: b, adet: 1 },
      ],
      toplam: 29_500,
      para_birimi: "XTS",
      teslimat: { ...teslimat, telefon: "+90 555 000 00 00" },
      fatura: { tur: "bireysel", adresAyni: true },
    });
    expect(oturum?.onaylar).toEqual([
      {
        tur: "on-bilgilendirme",
        verildi: true,
        metinSurumu: siparisOnayTurleri["on-bilgilendirme"].metinSurumu,
      },
      {
        tur: "mesafeli-satis",
        verildi: true,
        metinSurumu: siparisOnayTurleri["mesafeli-satis"].metinSurumu,
      },
      { tur: "pazarlama", verildi: false, metinSurumu: musteriOnayTurleri.pazarlama.metinSurumu },
    ]);
    expect(sonuc.anahtarlar).toBeUndefined();
    // Ayırma oturumun bitişine kadar, varsayılan 15 dakika (veritabanının saatiyle).
    const ayirmalar = await h.ayirmalar();
    expect(ayirmalar.map((s) => [s.birim_kimligi, s.adet]).toSorted()).toEqual(
      [
        [a, 2],
        [b, 1],
      ].toSorted(),
    );
    const fark = await h.vt.execute<{ dakika: number }>(
      sql`select round(extract(epoch from (bitis_zamani - olusturma_zamani)) / 60)::int as dakika from odeme_oturumlari`,
    );
    expect(fark.rows[0]?.dakika).toBe(15);
    expect(ayirmalar.every((s) => s.bitis_zamani.getTime() === sonuc.bitis.getTime())).toBe(true);
  });

  it("ayırma süresi ayardır", async () => {
    const h = await hazirla();
    await h.ayarla({ stokAyirmaSuresi: 7 });
    const a = await h.urunAc();
    await servis.oturumAc(
      h.vt,
      { kim: misafir(), bilgiler: bilgiler(), kalemler: [{ birim: a, adet: 1 }] },
      oturumSuresi,
    );
    const fark = await h.vt.execute<{ dakika: number }>(
      sql`select round(extract(epoch from (bitis_zamani - olusturma_zamani)) / 60)::int as dakika from odeme_oturumlari`,
    );
    expect(fark.rows[0]?.dakika).toBe(7);
  });

  it("görülen fiyat değiştiyse ya da adet stoğa indiyse oturum açılmaz", async () => {
    const h = await hazirla();
    const a = await h.urunAc({ miktar: 2 });
    for (const kalem of [
      { birim: a, adet: 1, gorulenTutar: 1 },
      { birim: a, adet: 3 },
    ]) {
      expect(
        await hatasi(
          servis.oturumAc(
            h.vt,
            { kim: misafir(), bilgiler: bilgiler(), kalemler: [kalem] },
            oturumSuresi,
          ),
        ),
      ).toEqual({ kod: "is-kurali", ayrinti: [{ alan: "kalemler", kod: "sepet-degisti" }] });
    }
    expect(await h.oturumlar()).toEqual([]);
    expect(await h.ayirmalar()).toEqual([]);
  });

  it("satılamayan ürün ve boş sepet oturum açmaz", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const tukenmis = await h.urunAc({ miktar: 0 });
    expect(
      await hatasi(
        servis.oturumAc(
          h.vt,
          {
            kim: misafir(),
            bilgiler: bilgiler(),
            kalemler: [
              { birim: a, adet: 1 },
              { birim: tukenmis, adet: 1 },
            ],
          },
          oturumSuresi,
        ),
      ),
    ).toEqual({ kod: "is-kurali", ayrinti: [{ alan: "kalemler", kod: "sepet-degisti" }] });
    expect(
      await hatasi(
        servis.oturumAc(
          h.vt,
          { kim: misafir(), bilgiler: bilgiler(), kalemler: [{ birim: tukenmis, adet: 1 }] },
          oturumSuresi,
        ),
      ),
    ).toEqual({ kod: "is-kurali", ayrinti: [{ alan: "kalemler", kod: "sepet-bos" }] });
    expect(await h.oturumlar()).toEqual([]);
  });

  it("üye olmadan alışveriş kapalıyken üye olmayan reddedilir, üye geçer", async () => {
    const h = await hazirla();
    await h.ayarla({ uyeOlmadanAlisveris: false });
    const a = await h.urunAc();
    expect(
      await hatasi(
        servis.oturumAc(
          h.vt,
          { kim: misafir(), bilgiler: bilgiler(), kalemler: [{ birim: a, adet: 1 }] },
          oturumSuresi,
        ),
      ),
    ).toEqual({ kod: "oturum-yok", ayrinti: undefined });
    const musteri = await h.musteriAc();
    await servis.oturumAc(
      h.vt,
      { kim: { tur: "uye", musteri }, bilgiler: bilgiler(), kalemler: [{ birim: a, adet: 1 }] },
      oturumSuresi,
    );
    const [oturum] = await h.oturumlar();
    expect(oturum?.musteri_kimligi).toBe(musteri);
    const [hesap] = await h.vt
      .select({ eposta: musteriler.eposta })
      .from(musteriler)
      .where(eq(musteriler.kimlik, musteri));
    expect(oturum?.eposta).toBe(hesap?.eposta);
  });

  it("telefon ayar açıkken zorunlu, kapalıyken değil; teslimat ülkesi sitenin teslimat ülkelerinde", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const telefonsuz = bilgiler({ teslimat: { ...teslimat, telefon: "" } });
    const ac = (b: ReturnType<typeof bilgiler>) =>
      servis.oturumAc(
        h.vt,
        { kim: misafir(), bilgiler: b, kalemler: [{ birim: a, adet: 1 }] },
        oturumSuresi,
      );
    expect(await hatasi(ac(telefonsuz))).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "bilgiler.teslimat.telefon", kod: "telefon-gerekli" }],
    });
    const yabanci = bilgiler({
      teslimat: {
        ...teslimat,
        telefon: "+49 30 1234567",
        adres: { ulke: "DE", adres: "Musterstraße 1", postaKodu: "10115" },
      },
    });
    expect(await hatasi(ac(yabanci))).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "bilgiler.teslimat.adres.ulke", kod: "ulke-teslimat-disi" }],
    });
    await h.ayarla({ telefonZorunlu: false });
    await ac(telefonsuz);
    const [oturum] = await h.oturumlar();
    expect(oturum?.teslimat.telefon).toBeUndefined();
  });

  it("kurumsal fatura ayrı adresiyle yazılır; vergi vergiAdresi ayarındaki adresin bölgesiyle hesaplanır", async () => {
    const h = await hazirla();
    // Vergi hariç giriş: 10.000'lik ürünün vergisi bölgeye göre değişir, toplam da değişir (Ankara 11.800, İstanbul
    // 34000 10.050).
    await h.ayarla({ fiyatGirisi: "vergi-haric" });
    const a = await h.urunAc({ satis: 10_000 });
    const istanbul = {
      ulke: "TR",
      il: "TR-34",
      ilce: "TR-34-001",
      adres: "Deneme Caddesi No: 5",
      postaKodu: "34000",
    };
    const kurumsal = {
      tur: "kurumsal",
      firma: "Deneme Tasarım Ltd. Şti.",
      vergiDairesi: "Kavaklıdere",
      vergiNumarasi: "4540536920",
      adresAyni: false,
      adres: istanbul,
    };
    const toplam = async (ek: Record<string, unknown>) => {
      const { oturum } = await servis.oturumAc(
        h.vt,
        { kim: misafir(), bilgiler: bilgiler(ek), kalemler: [{ birim: a, adet: 1 }] },
        oturumSuresi,
      );
      const [satir] = await h.vt
        .select()
        .from(odemeOturumlari)
        .where(eq(odemeOturumlari.kimlik, oturum));
      return satir;
    };
    // Teslimat Ankara (%18), fatura İstanbul 34000: orada en özel oran, ek %0,5 geçerlidir (karar 0061).
    const teslimataGore = await toplam({ fatura: kurumsal });
    expect(teslimataGore?.fatura).toEqual(kurumsal);
    expect(teslimataGore?.toplam).toBe(11_800);
    expect((await toplam({ teslimat: { ...teslimat, adres: istanbul } }))?.toplam).toBe(10_050);
    await h.ayarla({ vergiAdresi: "fatura" });
    expect((await toplam({ fatura: kurumsal }))?.toplam).toBe(10_050);
    expect((await toplam({}))?.toplam).toBe(11_800);
    await h.ayarla({ vergiAdresi: "magaza" });
    expect((await toplam({ fatura: kurumsal }))?.toplam).toBe(11_800);
  });

  it("pazarlama izni işaretlenince üye müşterinin onaylarına yazılır, işaretsizde yazılmaz", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const musteri = await h.musteriAc();
    const ac = (pazarlamaIzni: boolean) =>
      servis.oturumAc(
        h.vt,
        {
          kim: { tur: "uye", musteri },
          bilgiler: bilgiler({ pazarlamaIzni }),
          kalemler: [{ birim: a, adet: 1 }],
        },
        oturumSuresi,
      );
    const onaylar = () =>
      h.vt
        .select({ tur: musteriOnaylari.tur, verildi: musteriOnaylari.verildi })
        .from(musteriOnaylari)
        .where(eq(musteriOnaylari.musteri_kimligi, musteri));
    await ac(false);
    expect(await onaylar()).toEqual([]);
    await ac(true);
    expect(await onaylar()).toEqual([{ tur: "pazarlama", verildi: true }]);
  });

  it("ödemede hesap açılır: onaylar, oturum ve ödeme oturumu birlikte; kayıtlı e-posta hiçbir şey yazmaz", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const eposta = `yeni-${randomUUID().slice(0, 8)}@ornek.test`;
    const ac = () =>
      servis.oturumAc(
        h.vt,
        {
          kim: {
            tur: "misafir",
            eposta,
            hesap: { ac: true, sifre: "uzun-bir-sifre-123", uyelikOnayi: true, kvkkOnayi: true },
          },
          bilgiler: bilgiler({ pazarlamaIzni: true }),
          kalemler: [{ birim: a, adet: 1 }],
        },
        oturumSuresi,
      );
    const sonuc = await ac();
    expect(sonuc.anahtarlar).toBeDefined();
    const [hesap] = await h.vt
      .select({ kimlik: musteriler.kimlik })
      .from(musteriler)
      .where(eq(musteriler.eposta, eposta));
    const [oturum] = await h.oturumlar();
    expect(oturum?.musteri_kimligi).toBe(hesap?.kimlik);
    const onaylar = await h.vt
      .select({ tur: musteriOnaylari.tur, verildi: musteriOnaylari.verildi })
      .from(musteriOnaylari)
      .where(eq(musteriOnaylari.musteri_kimligi, hesap?.kimlik ?? ""));
    expect(onaylar.toSorted((x, y) => x.tur.localeCompare(y.tur))).toEqual([
      { tur: "kvkk-aydinlatma", verildi: true },
      { tur: "pazarlama", verildi: true },
      { tur: "uyelik-sozlesmesi", verildi: true },
    ]);
    // Aynı e-postayla ikinci kez hesap açılmaz; ne oturum ne ayırma kalır.
    expect((await hatasi(ac())).kod).toBe("cakisma");
    expect(await h.oturumlar()).toHaveLength(1);
    expect(await h.ayirmalar()).toHaveLength(1);
  });
});

describe("stok ayırma", () => {
  const ac = (h: Awaited<ReturnType<typeof hazirla>>, birim: string, onceki?: string) =>
    servis.oturumAc(
      h.vt,
      { kim: misafir(), bilgiler: bilgiler(), kalemler: [{ birim, adet: 1 }], onceki },
      oturumSuresi,
    );

  it("son ürün ikinci ödemede ayrılmış olarak reddedilir; stok değişmez; takibi kapalı ürün ayrılmaz", async () => {
    const h = await hazirla();
    const son = await h.urunAc({ miktar: 1 });
    const takipsiz = await h.urunAc({ takip: false });
    await ac(h, son);
    expect(await hatasi(ac(h, son))).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "kalemler", kod: "stok-ayrildi", birim: son }],
    });
    expect(await h.oturumlar()).toHaveLength(1);
    const [stokSatiri] = await h.vt
      .select({ miktar: birimStoklari.miktar })
      .from(birimStoklari)
      .where(eq(birimStoklari.birim_kimligi, son));
    expect(stokSatiri?.miktar).toBe(1);
    await ac(h, takipsiz);
    await ac(h, takipsiz);
    expect((await h.ayirmalar()).filter((s) => s.birim_kimligi === takipsiz)).toEqual([]);
  });

  it("aynı anda altı ödemede son ürün bir kez ayrılır", async () => {
    const h = await hazirla();
    const son = await h.urunAc({ miktar: 1 });
    const sonuclar = await Promise.allSettled(Array.from({ length: 6 }, () => ac(h, son)));
    expect(sonuclar.filter((s) => s.status === "fulfilled")).toHaveLength(1);
    expect(await h.ayirmalar()).toHaveLength(1);
  });

  it("açık duran ayırmanın arkasındaki ödeme stok satırının kilidinde bekler ve onun ayırmasını görür", async () => {
    const h = await hazirla();
    const son = await h.urunAc({ miktar: 1 });
    let ikinci: Promise<unknown> | undefined;
    await h.vt.transaction(async (islem) => {
      // Birinci ayırma kaydedilmeden durur: ikincinin sayımı onu kilitten sonra görmelidir.
      const [oturum] = await islem
        .insert(odemeOturumlari)
        .values({
          eposta: "bir@ornek.test",
          teslimat: bilgiler().teslimat,
          fatura: bilgiler().fatura,
          kalemler: [{ birim: son, adet: 1 }],
          toplam: 11_800,
          para_birimi: "XTS",
          onaylar: [],
          bitis_zamani: new Date(Date.now() + 15 * 60_000),
        })
        .returning({ kimlik: odemeOturumlari.kimlik });
      await stok.stokAyir(
        islem,
        oturum?.kimlik ?? "",
        [{ birim: son, adet: 1 }],
        new Date(Date.now() + 15 * 60_000),
      );
      ikinci = hatasi(ac(h, son));
      await kilitBekleyeniGor(h.vt);
    });
    expect(await ikinci).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "kalemler", kod: "stok-ayrildi", birim: son }],
    });
  });

  it("süresi dolan ayırma sayılmaz", async () => {
    const h = await hazirla();
    const son = await h.urunAc({ miktar: 1 });
    await ac(h, son);
    await h.vt.execute(
      sql`update stok_ayirmalari set bitis_zamani = now() - interval '1 millisecond'`,
    );
    await ac(h, son);
    expect(await h.oturumlar()).toHaveLength(2);
  });

  it("müşterinin bir önceki oturumu serbest kalır; başkasının oturumu kalmaz", async () => {
    const h = await hazirla();
    const son = await h.urunAc({ miktar: 1 });
    const ilk = await ac(h, son);
    const ikinci = await ac(h, son, ilk.oturum);
    expect((await h.oturumlar()).map((o) => o.kimlik)).toEqual([ikinci.oturum]);
    // Üye müşteri üye olmayanın oturumunu, başka üye onunkini silemez.
    const musteri = await h.musteriAc();
    const baska = await h.musteriAc();
    const uyeAc = (kim: string, onceki: string) =>
      servis.oturumAc(
        h.vt,
        {
          kim: { tur: "uye", musteri: kim },
          bilgiler: bilgiler(),
          kalemler: [{ birim: son, adet: 1 }],
          onceki,
        },
        oturumSuresi,
      );
    expect((await hatasi(uyeAc(musteri, ikinci.oturum))).kod).toBe("cakisma");
    await h.vt.delete(odemeOturumlari);
    const uyeninki = await uyeAc(musteri, randomUUID());
    expect((await hatasi(uyeAc(baska, uyeninki.oturum))).kod).toBe("cakisma");
    expect((await hatasi(ac(h, son, uyeninki.oturum))).kod).toBe("cakisma");
    await uyeAc(musteri, uyeninki.oturum);
    expect(await h.oturumlar()).toHaveLength(1);
  });

  it("temizlik süresi dolup saklama süresini geçen oturumu ayırmasıyla siler; süresi yeni dolanı silmez", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const eski = await ac(h, a);
    const yeniDolan = await ac(h, a);
    const suren = await ac(h, a);
    await h.vt.execute(
      sql`update odeme_oturumlari set olusturma_zamani = now() - make_interval(hours => ${odemeOturumuSaklamaSaat + 2}), bitis_zamani = now() - make_interval(hours => ${odemeOturumuSaklamaSaat}, secs => 1) where kimlik = ${eski.oturum}`,
    );
    // Süresi bir saat önce doldu: saklama süresi içindedir, silinmez.
    await h.vt.execute(
      sql`update odeme_oturumlari set olusturma_zamani = now() - interval '2 hours', bitis_zamani = now() - interval '1 hour' where kimlik = ${yeniDolan.oturum}`,
    );
    expect(await eskiOdemeOturumlariniSil(h.vt)).toBe(1);
    expect((await h.oturumlar()).map((o) => o.kimlik).toSorted()).toEqual(
      [yeniDolan.oturum, suren.oturum].toSorted(),
    );
    expect((await h.ayirmalar()).map((s) => s.oturum_kimligi).toSorted()).toEqual(
      [yeniDolan.oturum, suren.oturum].toSorted(),
    );
  });
});
