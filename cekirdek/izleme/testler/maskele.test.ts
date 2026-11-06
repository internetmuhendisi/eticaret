// Günlüğe giden değerlerin maskelenmesi (kart 0014, .claude/rules/guvenlik.md).
import { DrizzleQueryError } from "drizzle-orm/errors";
import { describe, expect, it } from "vitest";
import { gizliIsareti, kartIsareti, maskele, metniMaskele } from "../maskele.ts";

// Şifreli bağlantı adresi. Kayıtlı dosyalarda şifreli adres geçmez (veri-ayrimi.test.ts), bu
// yüzden adres çalışırken kurulur.
const sifreliAdres = (sunucu: string) =>
  ["postgres://kullanici", `GizliSifre123@${sunucu}`].join(":");

// Luhn denetiminden geçen deneme kart numarası.
const kartNumarasi = "4111 1111 1111 1111";

describe("maskeleme", () => {
  it("adı gizli bilgi olan alanın değerini hiç yazmaz", () => {
    expect(
      maskele({
        sifre: "Gizli-Sifre-123",
        yeniParola: "baska",
        apiAnahtari: "sk_canli_abc",
        erisimToken: "eyJ...",
        kartNumarasi: "5555555555554444",
        cvv: "123",
        authorization: "Bearer abc",
        ad: "Ayşe",
      }),
    ).toEqual({
      sifre: gizliIsareti,
      yeniParola: gizliIsareti,
      apiAnahtari: gizliIsareti,
      erisimToken: gizliIsareti,
      kartNumarasi: gizliIsareti,
      cvv: gizliIsareti,
      authorization: gizliIsareti,
      ad: "Ayşe",
    });
  });

  it("iç içe nesnelerde ve dizilerde de gizler", () => {
    expect(maskele({ istek: { govde: [{ sifre: "x" }] } })).toEqual({
      istek: { govde: [{ sifre: gizliIsareti }] },
    });
  });

  it("e-postanın yalnız ilk harfini ve alan adını bırakır", () => {
    expect(metniMaskele("alici: ayse.yilmaz@ornek.com.tr geldi")).toBe(
      "alici: a***@ornek.com.tr geldi",
    );
  });

  it("telefonun yalnız son iki hanesini bırakır", () => {
    expect(metniMaskele("tel +90 532 123 45 67")).toBe("tel **********67");
    expect(metniMaskele("0532-123-4567")).toBe("*********67");
    expect(maskele({ telefon: 5321234567 })).toEqual({ telefon: "********67" });
  });

  it("serbest metnin içindeki kart numarasını tümüyle gizler", () => {
    expect(metniMaskele(`kart ${kartNumarasi} reddedildi`)).toBe(`kart ${kartIsareti} reddedildi`);
    expect(metniMaskele("4111111111111111")).toBe(kartIsareti);
  });

  it("tarihi, saati, sürümü ve IP adresini olduğu gibi bırakır", () => {
    const metin = "2026-10-29T12:30:00.000Z sürüm 0.1.0 adres 192.168.100.200 sipariş 1234";
    expect(metniMaskele(metin)).toBe(metin);
  });

  it("hata nesnesini açar; mesajı, yığını ve nedeni de maskeler", () => {
    const neden = new Error("bağlantı ayse@ornek.com için kapandı");
    const hata = Object.assign(new Error(`ödeme reddedildi: ${kartNumarasi}`, { cause: neden }), {
      kod: "E1",
    });
    const sonuc = maskele(hata) as {
      ad: unknown;
      mesaj: unknown;
      kod: unknown;
      yigin: unknown;
      neden: { mesaj: unknown };
    };
    expect(sonuc.ad).toBe("Error");
    expect(sonuc.mesaj).toBe(`ödeme reddedildi: ${kartIsareti}`);
    expect(sonuc.kod).toBe("E1");
    expect(String(sonuc.yigin)).not.toContain("4111");
    expect(sonuc.neden.mesaj).toBe("bağlantı a***@ornek.com için kapandı");
  });

  it("metnin içinde adıyla yazılmış gizli değeri gizler", () => {
    expect(metniMaskele("bağlantı sifre=Gizli123 ile denendi")).toBe(
      `bağlantı sifre=${gizliIsareti} ile denendi`,
    );
    expect(metniMaskele('Şifre: "uzun deger" yanlış')).toBe(`Şifre: ${gizliIsareti} yanlış`);
    expect(metniMaskele("Authorization: Bearer abc.def")).toBe(`Authorization: ${gizliIsareti}`);
    expect(metniMaskele("?token=abc&sayfa=2")).toBe(`?token=${gizliIsareti}&sayfa=2`);
  });

  it("sürümlü paket yollarını e-posta sanmaz", () => {
    const yol = "/node_modules/.pnpm/next@16.4.3_@playwright+test@1.64.1/node_modules/next";
    expect(metniMaskele(yol)).toBe(yol);
  });

  it("Next.js'in hata özetini olduğu gibi bırakır", () => {
    expect(maskele({ digest: "2104447497" })).toEqual({ digest: "2104447497" });
  });

  // Bağımsız kontrolün bulduğu sızıntılar (kart 0014). Her girdinin çıktısında gizli parça yoktur.
  describe("bilinen sızıntı denemeleri", () => {
    const denemeler: [string, string, string[]][] = [
      ["metnin içinde JSON şifre", '{"password":"hunter2"}', ["hunter2"]],
      ["boşluklu JSON şifre", '{"sifre": "hunter2", "eposta": "a@b.com"}', ["hunter2", "a@b"]],
      ["adresteki şifre", sifreliAdres("localhost:5432/db"), ["GizliSifre"]],
      ["adresteki şifre, alan adıyla", sifreliAdres("db.ornek.com/db"), ["GizliSifre", ":G***"]],
      ["api_key", "api_key=sk_live_123abc", ["sk_live"]],
      ["x-api-key başlığı", "x-api-key: sk_live_123abc", ["sk_live"]],
      ["başında ad olmayan Bearer", "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc", ["eyJ"]],
      ["Türkçe büyük harf", "ŞİFRE: hunter2", ["hunter2"]],
      ["tek tırnaklı değer", "sifre='cok gizli'", ["cok", "gizli'"]],
      ["birden çok çerez", "Cookie: tercih=x; oturum=GIZLIOTURUM", ["GIZLIOTURUM"]],
      ["pwd", "pwd=hunter2", ["hunter2"]],
      ["kart, son kullanma ve CVV yan yana", "kart 4111 1111 1111 1111 2028 123", ["4111", "1111"]],
      ["kart ve telefon yan yana", "4111111111111111 5321234567", ["4111", "5321"]],
      ["noktalı kart", "4111.1111.1111.1111", ["4111"]],
      ["alt çizgili kart", "4111_1111_1111_1111", ["4111"]],
      ["yan yana iki telefon", "tel 0532 123 45 67 - 0533 987 65 43", ["0532", "987"]],
      ["noktalı telefon", "0532.123.45.67", ["0532"]],
      ["adreste kodlanmış e-posta", "/giris?eposta=ayse%40ornek.com", ["ayse"]],
      ["IBAN", "TR33 0006 1005 1978 6457 8413 26", ["1978 6457"]],
    ];
    for (const [ad, girdi, gizliParcalar] of denemeler) {
      it(ad, () => {
        const cikti = metniMaskele(girdi);
        for (const parca of gizliParcalar) expect(cikti).not.toContain(parca);
      });
    }

    it("nesnede anahtar, oturum ve tek kullanımlık şifre alanları", () => {
      const cikti = JSON.stringify(
        maskele({
          apiKey: "sk_live_1",
          "x-api-key": "sk_live_2",
          privateKey: "sk_live_3",
          pwd: "p1",
          pass: "p2",
          jwt: "p3",
          otp: "p4",
          ŞİFRE: "p5",
        }),
      );
      for (const parca of ["sk_live", "p1", "p2", "p3", "p4", "p5"]) {
        expect(cikti).not.toContain(parca);
      }
    });

    it("alan adındaki e-posta da kısaltılır", () => {
      expect(JSON.stringify(maskele({ "ayse@ornek.com": 3 }))).not.toContain("ayse");
      expect(JSON.stringify(maskele(new Map([["ayse@ornek.com", 3]])))).not.toContain("ayse");
    });

    it("ikili verinin içeriği yazılmaz", () => {
      expect(maskele({ govde: Buffer.from("sifre=hunter2") })).toEqual({
        govde: "[ikili veri: 13 bayt]",
      });
    });

    it("hata özeti adlı alan yalnız gerçek bir özetse olduğu gibi kalır", () => {
      expect(JSON.stringify(maskele({ digest: "ayse@ornek.com" }))).not.toContain("ayse");
    });
  });

  it("veritabanı hatasının sorgu değerlerini yazmaz: metinde de alanda da", () => {
    const ozet = "$argon2id$v=19$m=19456,t=2,p=1$dHV6$ZGVnZXI";
    const hata = new DrizzleQueryError("insert into yoneticiler values ($1, $2)", [
      "a@b.test",
      ozet,
    ]);
    const dokum = JSON.stringify(maskele(hata));
    expect(dokum).not.toContain(ozet);
    expect(dokum).not.toContain("dHV6");
    expect(dokum).not.toContain("a@b.test");
    expect(dokum).toContain("insert into yoneticiler");
  });

  it("döngülü yapıda takılmaz", () => {
    const dongu: { ad: string; kendisi?: unknown } = { ad: "kok" };
    dongu.kendisi = dongu;
    expect(maskele(dongu)).toEqual({ ad: "kok", kendisi: "[döngü]" });
  });
});
