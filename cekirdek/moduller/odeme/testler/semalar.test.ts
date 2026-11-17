// Ödeme formunun ortak şeması (kart 0213, karar 0140):
// - Telefon ülke içindeki yazılışla girilir, ülkenin koduyla uluslararası biçime çevrilir; kodu bilinmeyen ülkede
//   değer olduğu gibi kalır. Boş telefon yoktur (zorunluluğu servis ayarla denetler).
// - İl ve ilçe listeden gelir, tutarsız il ve ilçe reddedilir; posta kodu ülkenin biçimiyle.
// - Fatura bireysel ya da kurumsal; "aynı" işaretli değilse fatura adresi zorunlu, işaretliyse saklanmaz. Kurumsalda
//   vergi numarası ülkenin kuralıyla: şirketin vergi kimlik numarası ya da şahsın kimlik numarası geçer, kontrol hanesi
//   tutmayan ve biçimsiz numara kendi koduyla reddedilir. Kural faturanın ülkesinden gelir.
// - Ön bilgilendirme ve mesafeli satış onayı zorunlu; pazarlama izni boolean.
// - Not düz metindir, sınırı ve denetim karakteri; boş not yoktur.
// - Uç girdisi tutar taşımaz: bilinmeyen alan reddedilir.
import { describe, expect, it } from "vitest";
import { telefonuDuzelt } from "../../../bolgeler/adres.ts";
import { odemeSinirlari } from "../../../kayitlar/odeme.ts";
import { misafirOdemeGirdisi, odemeBilgileriSemasi } from "../semalar.ts";

const ankara = {
  ulke: "TR",
  il: "TR-06",
  ilce: "TR-06-007",
  adres: "Atatürk Bulvarı No: 10",
  postaKodu: "06420",
};
const gecerli = {
  odemeYontemi: { yontem: "havale" },
  teslimat: { ad: "Deniz", soyad: "Yılmaz", telefon: "0555 000 00 00", adres: ankara },
  fatura: { tur: "bireysel", adresAyni: true },
  onBilgilendirmeOnayi: true,
  mesafeliSatisOnayi: true,
  pazarlamaIzni: false,
};
const kurumsal = (vergiNumarasi: string, ek: Record<string, unknown> = {}) => ({
  ...gecerli,
  fatura: {
    tur: "kurumsal",
    firma: "Deneme Ltd.",
    vergiDairesi: "Kavaklıdere",
    vergiNumarasi,
    adresAyni: true,
    ...ek,
  },
});

const sorunlar = (girdi: unknown) => {
  const sonuc = odemeBilgileriSemasi.safeParse(girdi);
  return sonuc.success
    ? []
    : sonuc.error.issues.map(({ path, message, code }) => ({
        alan: path.join("."),
        kod: code === "custom" ? message : code,
      }));
};

describe("telefon", () => {
  it("ülke içindeki yazılış ülkenin koduyla çevrilir, uluslararası yazılış kalır", () => {
    expect(telefonuDuzelt("TR", "0555 000 00 00")).toBe("+90 555 000 00 00");
    expect(telefonuDuzelt("TR", " 0 555 000 00 00 ")).toBe("+90 555 000 00 00");
    expect(telefonuDuzelt("TR", "0090 555 000 00 00")).toBe("+90 555 000 00 00");
    expect(telefonuDuzelt("TR", "+90 555 000 00 00")).toBe("+90 555 000 00 00");
    // Ülke kodundan sonra yazılan ülke içi sıfır atılır (bağımsız kontrolün bulgusu).
    expect(telefonuDuzelt("TR", "+90 0555 000 00 00")).toBe("+90 555 000 00 00");
    expect(telefonuDuzelt("TR", "0090 0555 000 00 00")).toBe("+90 555 000 00 00");
    // Telefon kodu veri dosyasında olmayan ülkede değer olduğu gibi kalır.
    expect(telefonuDuzelt("DE", "030 1234567")).toBe("030 1234567");
  });

  it("şema çevrilmiş telefonu verir; geçersiz telefon kendi koduyla, boş telefon yoktur", () => {
    expect(odemeBilgileriSemasi.parse(gecerli).teslimat.telefon).toBe("+90 555 000 00 00");
    expect(sorunlar({ ...gecerli, teslimat: { ...gecerli.teslimat, telefon: "12" } })).toEqual([
      { alan: "teslimat.telefon", kod: "telefon-bicimi" },
    ]);
    expect(
      odemeBilgileriSemasi.parse({ ...gecerli, teslimat: { ...gecerli.teslimat, telefon: "  " } })
        .teslimat.telefon,
    ).toBeUndefined();
  });
});

describe("adres", () => {
  it("tutarsız il ve ilçe, eksik ilçe ve biçimsiz posta kodu reddedilir", () => {
    const adresli = (adres: Record<string, unknown>) => ({
      ...gecerli,
      teslimat: { ...gecerli.teslimat, adres: { ...ankara, ...adres } },
    });
    expect(sorunlar(adresli({ ilce: "TR-34-001" }))).toEqual([
      { alan: "teslimat.adres.ilce", kod: "ilce-baska-ilin" },
    ]);
    expect(sorunlar(adresli({ ilce: undefined }))).toEqual([
      { alan: "teslimat.adres.ilce", kod: "ilce-gerekli" },
    ]);
    expect(sorunlar(adresli({ postaKodu: "6420" }))).toEqual([
      { alan: "teslimat.adres.postaKodu", kod: "posta-kodu-bicimi" },
    ]);
  });
});

describe("fatura", () => {
  it("aynı işaretli değilse fatura adresi zorunlu, işaretliyse adres saklanmaz", () => {
    expect(sorunlar({ ...gecerli, fatura: { tur: "bireysel", adresAyni: false } })).toEqual([
      { alan: "fatura.adres", kod: "fatura-adresi-gerekli" },
    ]);
    expect(
      odemeBilgileriSemasi.parse({
        ...gecerli,
        fatura: { tur: "bireysel", adresAyni: true, adres: ankara },
      }).fatura.adres,
    ).toBeUndefined();
    expect(
      odemeBilgileriSemasi.parse({
        ...gecerli,
        fatura: { tur: "bireysel", adresAyni: false, adres: ankara },
      }).fatura.adres,
    ).toEqual(ankara);
  });

  it("kurumsalda şirketin ve şahsın numarası geçer; kontrol hanesi ve biçim kendi koduyla reddedilir", () => {
    // Bağımsız kaynağın örneği (python-stdnum) ve kimlik numarasının örneği (kart 0091'in testiyle aynı).
    expect(sorunlar(kurumsal("4540536920"))).toEqual([]);
    expect(sorunlar(kurumsal("10000000146"))).toEqual([]);
    expect(sorunlar(kurumsal("4540536921"))).toEqual([
      { alan: "fatura.vergiNumarasi", kod: "vergi-numarasi-kontrol" },
    ]);
    expect(sorunlar(kurumsal("10000000147"))).toEqual([
      { alan: "fatura.vergiNumarasi", kod: "vergi-numarasi-kontrol" },
    ]);
    expect(sorunlar(kurumsal("12345"))).toEqual([
      { alan: "fatura.vergiNumarasi", kod: "vergi-numarasi-bicimi" },
    ]);
  });

  it("vergi numarasının kuralı faturanın ülkesinden gelir", () => {
    // Kuralı olmayan ülkenin faturasında genel biçim geçer, Türkiye'nin biçimi aranmaz.
    const almanya = { ulke: "DE", adres: "Musterstraße 1", postaKodu: "10115" };
    expect(sorunlar(kurumsal("DE123456789", { adresAyni: false, adres: almanya }))).toEqual([]);
    expect(sorunlar(kurumsal("DE123456789"))).toEqual([
      { alan: "fatura.vergiNumarasi", kod: "vergi-numarasi-bicimi" },
    ]);
  });

  it("kurumsalda firma adı, vergi dairesi ve vergi numarası zorunlu", () => {
    const alanlar = sorunlar({ ...gecerli, fatura: { tur: "kurumsal", adresAyni: true } }).map(
      ({ alan }) => alan,
    );
    expect(alanlar.toSorted()).toEqual(
      ["fatura.firma", "fatura.vergiDairesi", "fatura.vergiNumarasi"].toSorted(),
    );
  });
});

describe("onaylar ve not", () => {
  it("ön bilgilendirme ve mesafeli satış onayı zorunlu", () => {
    expect(
      sorunlar({ ...gecerli, onBilgilendirmeOnayi: false, mesafeliSatisOnayi: false }).map(
        ({ alan }) => alan,
      ),
    ).toEqual(["onBilgilendirmeOnayi", "mesafeliSatisOnayi"]);
    expect(sorunlar({ ...gecerli, pazarlamaIzni: undefined }).map(({ alan }) => alan)).toEqual([
      "pazarlamaIzni",
    ]);
  });

  it("not düz metin: boş not yok, sınır ve denetim karakteri", () => {
    expect(odemeBilgileriSemasi.parse({ ...gecerli, not: "   " }).not).toBeUndefined();
    expect(odemeBilgileriSemasi.parse({ ...gecerli, not: "Kapıya\nbırakın" }).not).toBe(
      "Kapıya\nbırakın",
    );
    expect(sorunlar({ ...gecerli, not: "x".repeat(odemeSinirlari.notEnCok + 1) })).toEqual([
      { alan: "not", kod: "too_big" },
    ]);
    expect(sorunlar({ ...gecerli, not: "a\u0000b" })).toEqual([
      { alan: "not", kod: "metin-gecersiz" },
    ]);
  });
});

describe("uç girdisi", () => {
  it("tutar taşıyan ya da bilinmeyen alan reddedilir", () => {
    const girdi = {
      eposta: "a@ornek.test",
      hesap: { ac: false },
      bilgiler: gecerli,
      kalemler: [{ birim: "00000000-0000-4000-8000-000000000000", adet: 1 }],
      robotCevabi: "x",
    };
    expect(misafirOdemeGirdisi.safeParse(girdi).success).toBe(true);
    expect(misafirOdemeGirdisi.safeParse({ ...girdi, toplam: 1 }).success).toBe(false);
    expect(
      misafirOdemeGirdisi.safeParse({ ...girdi, bilgiler: { ...gecerli, toplam: 1 } }).success,
    ).toBe(false);
    expect(misafirOdemeGirdisi.safeParse({ ...girdi, kalemler: [] }).success).toBe(false);
  });

  it("hesap açan müşteri şifre, üyelik ve aydınlatma onayı verir", () => {
    const girdi = {
      eposta: "a@ornek.test",
      bilgiler: gecerli,
      kalemler: [{ birim: "00000000-0000-4000-8000-000000000000", adet: 1 }],
      robotCevabi: "x",
    };
    expect(misafirOdemeGirdisi.safeParse({ ...girdi, hesap: { ac: true } }).success).toBe(false);
    expect(
      misafirOdemeGirdisi.safeParse({
        ...girdi,
        hesap: { ac: true, sifre: "uzun-bir-sifre-123", uyelikOnayi: true, kvkkOnayi: true },
      }).success,
    ).toBe(true);
  });
});

// Ödeme yöntemi (kart 0214): havale ya da kapıda ödemenin seçeneği zorunludur; yöntemin sitede açık olup olmadığını
// servis denetler.
describe("ödeme yöntemi", () => {
  it("havale ve kapıda ödemenin iki seçeneği geçer", () => {
    for (const odemeYontemi of [
      { yontem: "havale" },
      { yontem: "kapida-odeme", secenek: "nakit" },
      { yontem: "kapida-odeme", secenek: "kart" },
    ]) {
      expect(odemeBilgileriSemasi.safeParse({ ...gecerli, odemeYontemi }).success).toBe(true);
    }
  });

  it("yöntemsiz, seçeneksiz kapıda ödeme, bilinmeyen yöntem ve seçenek geçmez", () => {
    const { odemeYontemi: _yok, ...yontemsiz } = gecerli;
    expect(odemeBilgileriSemasi.safeParse(yontemsiz).success).toBe(false);
    for (const odemeYontemi of [
      { yontem: "kapida-odeme" },
      { yontem: "kapida-odeme", secenek: "cek" },
      { yontem: "kart" },
      { yontem: "havale", secenek: "nakit" },
    ]) {
      expect(odemeBilgileriSemasi.safeParse({ ...gecerli, odemeYontemi }).success).toBe(false);
    }
  });
});
