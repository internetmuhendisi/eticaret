// Blog yazısı ekranının girdisi (kart 0272): yeni yazıda yalnız dolu alanlar gider; değişiklikte yalnız sunucudan gelen
// hâline göre değişen alanlar gider, boşaltılan isteğe bağlı alan null olur; zamanlanmış durumdan çıkınca yayın zamanı
// null, zamanlanmış durumda boş zaman gönderilmez (sunucu "gerekli" der).
import { describe, expect, it } from "vitest";
import { type BlogYazisiFormu, bosBlogYazisiFormu } from "../blog/veri.ts";
import { blogYazisiGirdisi } from "../blog/yazi-ekrani.tsx";

const kayitli: BlogYazisiFormu = {
  baslik: "Kış",
  adresAdi: "kis",
  ozet: "Özet",
  icerik: "<p>İçerik</p>",
  kapak: { dosya: "d", metin: "Kapak" },
  kategori: "k",
  yazar: "Ayşe",
  durum: "zamanlanmis",
  yayinZamani: "2030-01-01T09:00",
};

describe("blog yazısı girdisi", () => {
  it("yeni yazıda yalnız dolu alanlar gider, adres adı gitmez", () => {
    expect(
      blogYazisiGirdisi({ ...bosBlogYazisiFormu, baslik: "Yeni" }, bosBlogYazisiFormu, true),
    ).toEqual({
      baslik: "Yeni",
      icerik: "",
      durum: "taslak",
    });
  });

  it("değişiklikte yalnız değişen alanlar; boşaltılan alan null", () => {
    expect(blogYazisiGirdisi(kayitli, kayitli, false)).toEqual({});
    expect(
      blogYazisiGirdisi(
        { ...kayitli, ozet: "", kapak: null, kategori: "", baslik: "Yaz" },
        kayitli,
        false,
      ),
    ).toEqual({ baslik: "Yaz", ozet: null, kapak: null, kategori: null });
  });

  it("zamanlanmıştan çıkınca yayın zamanı null; zamanlanmışta boş zaman gönderilmez", () => {
    expect(blogYazisiGirdisi({ ...kayitli, durum: "yayinda" }, kayitli, false)).toEqual({
      durum: "yayinda",
      yayinZamani: null,
    });
    expect(
      blogYazisiGirdisi(
        { ...bosBlogYazisiFormu, baslik: "Z", durum: "zamanlanmis" },
        bosBlogYazisiFormu,
        true,
      ),
    ).toEqual({ baslik: "Z", icerik: "", durum: "zamanlanmis" });
  });
});
