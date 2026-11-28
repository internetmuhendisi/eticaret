// Sunucu veritabanı denemesi Örnek Mağaza'nın veritabanına yalnız yayındaki çekirdeğin görüntüsüyle dokunur (kart 0058).
// Her kuralın bozuk bir örneği yakalanır.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { kok } from "../sunucu.mts";
import { yayindakiCekirdekMi } from "../sunucu-veritabani.mts";

const izler: Record<string, string> = { aaaaaaa: "v1:A", bbbbbbb: "v1:A", ccccccc: "v1:C" };
const kayittanIz = (kayit: string): string => {
  const iz = izler[kayit];
  if (!iz) throw new Error("kayıt bilgisayarda yok");
  return iz;
};
const yayin = { surum: "0.81.0", kayit: "aaaaaaa" };

describe("Örnek Mağaza'nın veritabanı kullanılır mı", () => {
  it("hiç yayınlanmamış site kullanılır", () => {
    expect(yayindakiCekirdekMi({ surum: "0.81.0", goruntuKaydi: "ccccccc" }, kayittanIz)).toEqual({
      kullanilir: true,
    });
  });

  it("aynı sürüm ve aynı çekirdek (başka kayıttan üretilmiş olsa da) kullanılır", () => {
    for (const goruntuKaydi of ["aaaaaaa", "bbbbbbb"]) {
      expect(yayindakiCekirdekMi({ surum: "0.81.0", goruntuKaydi, yayin }, kayittanIz)).toEqual({
        kullanilir: true,
      });
    }
  });

  it("yeni sürüm kullanılmaz, nedeni iki sürümü söyler", () => {
    const sonuc = yayindakiCekirdekMi(
      { surum: "0.82.0", goruntuKaydi: "aaaaaaa", yayin },
      kayittanIz,
    );
    expect(sonuc).toEqual({
      kullanilir: false,
      neden: "yayında 0.81.0 (aaaaaaa), denemenin sürümü 0.82.0",
    });
  });

  it("aynı sürüm ama başka çekirdek kullanılmaz (karar 0205)", () => {
    const sonuc = yayindakiCekirdekMi(
      { surum: "0.81.0", goruntuKaydi: "ccccccc", yayin },
      kayittanIz,
    );
    expect(sonuc).toMatchObject({
      kullanilir: false,
      neden: expect.stringMatching(/başka bir çekirdek/),
    });
  });

  it.each([
    ["kaydedilmemiş değişiklikten üretilmiş", "aaaaaaa-kirli"],
    ["kaydı bilinmeyen", ""],
    ["kaydı uydurma", "bilinmiyor"],
  ])("%s görüntü kullanılmaz", (_, goruntuKaydi) => {
    const sonuc = yayindakiCekirdekMi({ surum: "0.81.0", goruntuKaydi, yayin }, kayittanIz);
    expect(sonuc).toMatchObject({
      kullanilir: false,
      neden: expect.stringMatching(/görüntünün kaydı/),
    });
  });

  it("izi hesaplanamayan kayıt kullanılmaz", () => {
    const sonuc = yayindakiCekirdekMi(
      { surum: "0.81.0", goruntuKaydi: "ddddddd", yayin },
      kayittanIz,
    );
    expect(sonuc).toMatchObject({
      kullanilir: false,
      neden: expect.stringMatching(/iz hesaplanamadı/),
    });
  });

  it("yayın kaydındaki bu biçimdeki iz git kaydından önce gelir, eski biçim yeniden hesaplanır", () => {
    const kayitli = { ...yayin, kayit: "eeeeeee", cekirdekIzi: "v1:A" };
    expect(
      yayindakiCekirdekMi({ surum: "0.81.0", goruntuKaydi: "aaaaaaa", yayin: kayitli }, kayittanIz),
    ).toEqual({ kullanilir: true });
    const eski = { ...yayin, cekirdekIzi: "v0:C" };
    expect(
      yayindakiCekirdekMi({ surum: "0.81.0", goruntuKaydi: "aaaaaaa", yayin: eski }, kayittanIz),
    ).toEqual({ kullanilir: true });
  });
});

// Denemenin kararı kullanması yalnız yazıyla denetlenir: deneme sunucuya bağlanır.
describe("sunucu veritabanı denemesi kararı kullanır", () => {
  const metin = readFileSync(join(kok, "komutlar", "sunucu-veritabani-denemesi.mts"), "utf8");

  it("Örnek Mağaza'nın veritabanını hazırlamadan önce yayındaki çekirdeği sorar", () => {
    const karar = metin.indexOf("yayindakiCekirdekMi(");
    expect(karar).toBeGreaterThan(0);
    expect(karar).toBeLessThan(metin.indexOf("siteVeritabaniniHazirla(ipv4, ortam, a)"));
    const dal = metin.slice(metin.indexOf("if (!karar.kullanilir) {"), metin.indexOf("a = yedek;"));
    expect(dal.length).toBeGreaterThan(0);
    expect(dal.length).toBeLessThan(400);
  });

  it("Örnek Mağaza yalnız kararla kullanılır, karar sunucuya gidecek görüntüye bakar", () => {
    // ornekSite yalnız tanımında ve a'nın ilk değerinde geçer; a yalnız karar kullanılamaz derse değişir.
    expect(metin.match(/ornekSite/g)?.length).toBe(2);
    expect(metin).toMatch(/let a = ornekSite;/);
    // İlk değer ve karar dalındaki tek atama.
    expect(metin.match(/\ba = /g)?.length).toBe(2);
    expect(metin).toMatch(/goruntuKaydi: goruntununKaydi\(denemeEtiketi\)/);
    expect(metin.indexOf('"image", "tag", surumunEtiketi, denemeEtiketi')).toBeLessThan(
      metin.indexOf("goruntununKaydi(denemeEtiketi)"),
    );
  });

  it("kayıtsız etkin yayın kullanılabilir sayılmaz", () => {
    expect(metin).toMatch(
      /etkin === undefined \? undefined : \(yayin \?\? \{ surum: "bilinmiyor", kayit: "" \}\)/,
    );
  });

  it("görüntü sunucuya sürümün etiketiyle değil, denemenin kendi etiketiyle gider ve silinir", () => {
    expect(metin).toMatch(/const denemeEtiketi = `\$\{surumunEtiketi\}-vt-deneme`;/);
    expect(metin).toMatch(/goruntuyuGonder\(ipv4, denemeEtiketi\)/);
    expect(metin).not.toMatch(/goruntuyuGonder\(ipv4, surum/);
    expect(metin.match(/etiket: denemeEtiketi,/g)?.length).toBe(3);
    expect(metin).toMatch(/docker image rm \$\{denemeEtiketi\}/);
  });

  it("ikinci geçici site temizlikte silinir", () => {
    expect(metin).toMatch(/geciciler\.unshift\(yedek\.kodAdi\)/);
    expect(metin).toMatch(/temizle\(ipv4, eskiKopya, geciciler\)/);
  });
});
