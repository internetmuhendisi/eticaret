// Raporun dönemi (kart 0317): hazır dönemlerin günleri bugüne göre (ay ve yıl sınırı, artık yıl), adresteki değerin
// okunması ve reddi, önceki dönem.
import { describe, expect, it } from "vitest";
import { raporSinirlari } from "../../../kayitlar/rapor.ts";
import { gunEkle } from "../../../metinler/bicimleyici.ts";
import {
  donemGunleri,
  gunSayisi,
  oncekiDonem,
  raporDonemDegeri,
  raporDonemDegeriniCoz,
} from "../donem.ts";

const hazir = (kod: string, bugun: string) => {
  const deger = raporDonemDegeriniCoz(kod);
  if (deger === undefined) throw new Error(`Okunmadı: ${kod}`);
  return donemGunleri(deger, bugun);
};

describe("raporun dönemi", () => {
  it("hazır dönemler bugüne göre, iki uç dahil", () => {
    expect(hazir("bugun", "2026-11-27")).toEqual({ baslangic: "2026-11-27", bitis: "2026-11-27" });
    expect(hazir("son-7-gun", "2026-11-27")).toEqual({
      baslangic: "2026-11-21",
      bitis: "2026-11-27",
    });
    expect(hazir("son-30-gun", "2026-03-01")).toEqual({
      baslangic: "2026-01-31",
      bitis: "2026-03-01",
    });
    expect(hazir("bu-ay", "2026-11-27")).toEqual({ baslangic: "2026-11-01", bitis: "2026-11-27" });
    expect(hazir("bu-ay", "2026-11-01")).toEqual({ baslangic: "2026-11-01", bitis: "2026-11-01" });
    expect(hazir("gecen-ay", "2026-01-15")).toEqual({
      baslangic: "2025-12-01",
      bitis: "2025-12-31",
    });
    expect(hazir("gecen-ay", "2028-03-31")).toEqual({
      baslangic: "2028-02-01",
      bitis: "2028-02-29",
    });
  });

  it("iki gün okunur ve aynen yazılır; eksik, ters, takvimde olmayan, uzun ve tanınmayan değer okunmaz", () => {
    expect(raporDonemDegeriniCoz("2026-10-01_2026-10-31")).toEqual({
      tur: "aralik",
      baslangic: "2026-10-01",
      bitis: "2026-10-31",
    });
    expect(raporDonemDegeri({ tur: "aralik", baslangic: "2026-10-01", bitis: "2026-10-31" })).toBe(
      "2026-10-01_2026-10-31",
    );
    expect(raporDonemDegeri({ tur: "hazir", kod: "bu-ay" })).toBe("bu-ay");
    for (const deger of [
      "",
      "dun",
      "_2026-10-31",
      "2026-10-01_",
      "2026-10-31_2026-10-01",
      "2026-02-30_2026-03-01",
      "2026-10-01_2026-10-31_2026-11-01",
      "constructor",
    ]) {
      expect(raporDonemDegeriniCoz(deger), deger).toBeUndefined();
    }
    // Sınır: en çok raporSinirlari.enCokGun gün.
    const bas = "2027-01-01";
    const sinirda = gunEkle(bas, raporSinirlari.enCokGun - 1);
    expect(gunSayisi({ baslangic: bas, bitis: sinirda })).toBe(raporSinirlari.enCokGun);
    expect(raporDonemDegeriniCoz(`${bas}_${sinirda}`)).toBeDefined();
    expect(raporDonemDegeriniCoz(`${bas}_${gunEkle(sinirda, 1)}`)).toBeUndefined();
  });

  it("önceki dönem aynı uzunlukta, hemen önce", () => {
    expect(oncekiDonem({ baslangic: "2026-11-27", bitis: "2026-11-27" })).toEqual({
      baslangic: "2026-11-26",
      bitis: "2026-11-26",
    });
    expect(oncekiDonem({ baslangic: "2026-03-01", bitis: "2026-03-31" })).toEqual({
      baslangic: "2026-01-29",
      bitis: "2026-02-28",
    });
  });
});
