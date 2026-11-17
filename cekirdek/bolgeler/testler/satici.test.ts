// Satıcı bilgilerinin şeması (kart 0091, karar 0138): ülkenin veri dosyasındaki biçim ve kontrol hanesi; şirkette on
// haneli vergi kimlik numarası, şahısta on bir haneli kimlik numarası; MERSİS numarası; KEP adresinin alan adı;
// kuralı olmayan ülkede genel biçim; ayar mağaza sahibinin, boş başlar, değeri değişiklik kaydına yazılmaz; sitelerin
// deneme değerleri geçer.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ayarBilgileri, magazaAyarSemasi } from "../../ayar-semasi/ayarlar.ts";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { ayarSahibi } from "../../kayitlar/site.ts";
import { ilListesiVarMi, ulkeKodlari } from "../bolgeler.ts";
import { saticiBilgileriSemasi } from "../satici.ts";
import trVerisi from "../tr.json" with { type: "json" };

const ulke = trVerisi.ulke;
const kuralsiz = ulkeKodlari().find((kod) => !ilListesiVarMi(kod)) ?? "";

// Kontrol haneleri elle hesaplandı: 1111111114 ve 0123456789 geçerli vergi kimlik numarası, 10000000146 ve 11111111110
// geçerli kimlik numarası (son haneler hesabın sonucudur).
const sirket = {
  ulke,
  isletmeTuru: "sirket",
  unvan: "Deneme Ticaret A.Ş.",
  vergiDairesi: "Deneme",
  vergiNumarasi: "1111111114",
  mersisNumarasi: "0111111111400015",
  ticaretSicilNumarasi: "000000",
  kepAdresi: "deneme@deneme.kep.tr",
};
const sahis = { ulke, isletmeTuru: "sahis", unvan: "Deneme Kişi", vergiNumarasi: "10000000146" };

const hatalar = (deger: unknown) => {
  const sonuc = saticiBilgileriSemasi.safeParse(deger);
  return sonuc.success
    ? []
    : sonuc.error.issues.map((sorun) => `${sorun.path.join(".")}:${sorun.message}`);
};

describe("satıcı bilgileri", () => {
  it("geçerli şirket ve şahıs bilgileri geçer; yalnız unvan ve işletme türü zorunludur", () => {
    expect(hatalar(sirket)).toEqual([]);
    expect(hatalar({ ...sirket, vergiNumarasi: "0123456789" })).toEqual([]);
    expect(hatalar(sahis)).toEqual([]);
    expect(hatalar({ ...sahis, vergiNumarasi: "11111111110" })).toEqual([]);
    expect(hatalar({ ulke, isletmeTuru: "sirket", unvan: "Deneme" })).toEqual([]);
    expect(hatalar({ ulke, isletmeTuru: "sirket" })).not.toEqual([]);
    expect(hatalar({ ulke, unvan: "Deneme" })).not.toEqual([]);
    expect(hatalar({ ...sirket, unvan: "  " })).not.toEqual([]);
    expect(hatalar({ ...sirket, bilinmeyen: "x" })).not.toEqual([]);
  });

  it("vergi kimlik numarasının kontrol hanesi ve biçimi denetlenir", () => {
    // Bağımsız kaynağın örneği (python-stdnum, stdnum.tr.vkn belgesi): hesabın kendi örneklerimize uydurulmadığını gösterir.
    expect(hatalar({ ...sirket, vergiNumarasi: "4540536920" })).toEqual([]);
    expect(hatalar({ ...sirket, vergiNumarasi: "4540536921" })).toEqual([
      "vergiNumarasi:vergi-numarasi-kontrol",
    ]);
    for (let son = 0; son < 10; son += 1) {
      const numara = `111111111${son}`;
      expect(hatalar({ ...sirket, vergiNumarasi: numara })).toEqual(
        son === 4 ? [] : ["vergiNumarasi:vergi-numarasi-kontrol"],
      );
    }
    for (const numara of ["111111111", "11111111140", "11111111a4", "1111 111114"]) {
      expect(hatalar({ ...sirket, vergiNumarasi: numara })).toEqual([
        "vergiNumarasi:vergi-numarasi-bicimi",
      ]);
    }
  });

  it("şahıs işletmesinde kimlik numarası istenir: iki kontrol hanesi, sıfırla başlamaz, on bir hane", () => {
    // Yalnız onuncu hane yanlış (on birinci hane ilk onun toplamıyla tutarlı), sonra yalnız on birinci hane yanlış.
    expect(hatalar({ ...sahis, vergiNumarasi: "10000000157" })).toEqual([
      "vergiNumarasi:vergi-numarasi-kontrol",
    ]);
    expect(hatalar({ ...sahis, vergiNumarasi: "10000000147" })).toEqual([
      "vergiNumarasi:vergi-numarasi-kontrol",
    ]);
    for (const numara of ["01000000146", "1000000014", "1111111114"]) {
      expect(hatalar({ ...sahis, vergiNumarasi: numara })).toEqual([
        "vergiNumarasi:vergi-numarasi-bicimi",
      ]);
    }
    // Şirketin on haneli numarası şahısta, şahsın on bir haneli numarası şirkette geçmez.
    expect(hatalar({ ...sirket, vergiNumarasi: "10000000146" })).toEqual([
      "vergiNumarasi:vergi-numarasi-bicimi",
    ]);
  });

  it("MERSİS numarası on altı hane, KEP adresi ülkenin alan adında", () => {
    for (const numara of ["011111111140001", "01111111114000150", "011111111140001x"]) {
      expect(hatalar({ ...sirket, mersisNumarasi: numara })).toEqual([
        "mersisNumarasi:mersis-numarasi-bicimi",
      ]);
    }
    expect(hatalar({ ...sirket, kepAdresi: "deneme@deneme.test" })).toEqual([
      "kepAdresi:kep-adresi-bicimi",
    ]);
    expect(hatalar({ ...sirket, kepAdresi: "deneme.kep.tr" })).not.toEqual([]);
  });

  it("kuralı olmayan ülkede numaralar genel biçimle, KEP adresi yalnız e-posta biçimiyle denetlenir", () => {
    const yabanci = {
      ulke: kuralsiz,
      isletmeTuru: "sirket",
      unvan: "Deneme Ltd",
      vergiNumarasi: "GB 123-456",
      mersisNumarasi: "AB12",
      kepAdresi: "deneme@deneme.test",
    };
    expect(hatalar(yabanci)).toEqual([]);
    expect(hatalar({ ...yabanci, vergiNumarasi: "-12" })).toEqual([
      "vergiNumarasi:vergi-numarasi-bicimi",
    ]);
    expect(hatalar({ ...yabanci, mersisNumarasi: "x".repeat(31) })).not.toEqual([]);
    expect(hatalar({ ...yabanci, ulke: "XX" })).toEqual(["ulke:ulke-gecersiz"]);
  });

  it("ayar mağaza sahibinindir, boş başlar ve değeri değişiklik kaydına yazılmaz", () => {
    const bilgi = ayarBilgileri.get(magazaAyarSemasi.shape.saticiBilgileri);
    expect(bilgi?.kimDegistirir).toBe(ayarSahibi.magaza);
    expect(bilgi?.kayittaGizli).toBe(true);
    expect(magazaAyarSemasi.parse({}).saticiBilgileri).toBeUndefined();
  });

  // Çekirdekte site adı geçmez (cekirdek/testler/site-adi-yok.test.ts): siteler klasörden okunur.
  it("sitelerin başlangıç değerleri geçer, en az bir sitede vergi numarası dolu", () => {
    const sitelerKlasoru = join(import.meta.dirname, "../../../siteler");
    const saticilar = readdirSync(sitelerKlasoru, { withFileTypes: true })
      .filter((girdi) => girdi.isDirectory())
      .flatMap((girdi) => {
        const bilgi = siteKlasorunuOku(join(sitelerKlasoru, girdi.name)).baslangic.saticiBilgileri;
        return bilgi === undefined ? [] : [bilgi];
      });
    expect(saticilar.some((bilgi) => bilgi.vergiNumarasi !== undefined)).toBe(true);
    for (const bilgi of saticilar) expect(hatalar(bilgi)).toEqual([]);
  });
});
