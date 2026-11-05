// Hata izleme aracının sunucudaki kurulumu (kart 0022, karar 0036): kutu tanımı, betikler,
// ön kapı satırı, yayın tanımı ve deneme komutunun kayıt denetimi. Sunucuda ölçümü:
// pnpm sunucu-denetle ve pnpm hata-izleme-denemesi.
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { hataIzlemeDegiskenleri } from "../../cekirdek/izleme/hata-izleme-araci.ts";
import { denemeDegerleri } from "../../cekirdek/izleme/hata-izleme-denemesi-degerleri.ts";
import { hataIzlemeGizliBilgisi } from "../gizli-bilgi.mts";
import {
  bugsinkGoruntusu,
  bugsinkKomutu,
  hataIzlemeAgHatalari,
  hataIzlemeTanimi,
  kurmaBetigi,
  olaySorunlari,
  yonetimBetigi,
} from "../hata-izleme.mts";
import { hataIzlemeAgi, hataIzlemeSatiri, onKapiTanimi } from "../on-kapi.mts";
import { yayinKutusuTanimi } from "../yayin.mts";

const servis = hataIzlemeTanimi("deneme").services.bugsink;
const bashSozdizimi = (betik: string) =>
  spawnSync("bash", ["-n"], { input: betik, encoding: "utf8" });

describe("hata izleme kutusunun tanımı", () => {
  it("görüntü sürümü ve özetiyle sabit", () => {
    expect(bugsinkGoruntusu).toMatch(/^bugsink\/bugsink:\d+\.\d+\.\d+@sha256:[0-9a-f]{64}$/);
  });

  it("kök olmayan kullanıcı, salt okunur, yetkisiz, portsuz", () => {
    expect(servis.user).toBe("14237:14237");
    expect(servis.read_only).toBe(true);
    expect(servis.cap_drop).toEqual(["ALL"]);
    expect(servis.cap_add).toEqual([]);
    expect(servis.security_opt).toEqual(["no-new-privileges:true"]);
    expect(servis).not.toHaveProperty("ports");
    expect(servis.networks).toEqual([hataIzlemeAgi]);
  });

  it("gizli bilgiler ortam değişkeninde değil dosyada", () => {
    const ortam = JSON.stringify(servis.environment);
    expect(ortam).not.toMatch(/SECRET_KEY|CREATE_SUPERUSER|PASSWORD/);
    expect(servis.secrets.map((g) => g.target).sort()).toEqual([
      "gizli_anahtar",
      "yonetici_sifresi",
    ]);
    // Yönetim anahtarı kutuya bağlanmaz.
    expect(JSON.stringify(hataIzlemeTanimi("deneme"))).not.toContain("yonetim_anahtari");
  });

  it("kayıt açmak kapalı, kurulum bilgisi gönderilmez", () => {
    expect(servis.environment).toMatchObject({
      SINGLE_USER: "true",
      USER_REGISTRATION: "CB_NOBODY",
      PHONEHOME: "false",
    });
  });

  it("açılış komutu görüntünün komutunu aynen çalıştırır, $ işaretleri Compose'dan kaçar", () => {
    const [kabuk, bayrak, baslatma, ad, ...komut] = servis.command;
    expect([kabuk, bayrak, ad]).toEqual(["sh", "-c", "bugsink-baslat"]);
    expect(komut).toEqual(bugsinkKomutu.map((parca) => parca.replaceAll("$", () => "$$")));
    // Compose $$'ı $'a çevirir; kutuya giden betikte tek $ kalır.
    const kutudaki = (baslatma ?? "").replaceAll("$$", "$");
    expect(kutudaki).toContain('export SECRET_KEY="$a"');
    expect(kutudaki).toContain('exec "$@"');
    expect((baslatma ?? "").replaceAll("$$", "")).not.toContain("$");
    expect(bashSozdizimi(kutudaki).status).toBe(0);
  });

  // Kaçışsız $ Compose'da uyarı verir ve değeri boşaltır (ölçüldü: imza anahtarı boş gitti).
  // config çıktısı kaçışlı biçimi geri yazar; kutuya giden değerin yerel denemesi karar 0036'da.
  it("Compose tanımı değişken sanmadan okur", () => {
    const sonuc = spawnSync("docker", ["compose", "-f", "-", "config", "--format", "json"], {
      input: JSON.stringify({
        ...hataIzlemeTanimi("deneme"),
        secrets: { gizli_anahtar: { file: "/dev/null" }, yonetici_sifresi: { file: "/dev/null" } },
      }),
      encoding: "utf8",
    });
    expect(sonuc.stderr).not.toContain("variable is not set");
    expect(sonuc.status).toBe(0);
    const okunan = JSON.parse(sonuc.stdout) as {
      services: { bugsink: { command: string[] } };
    };
    expect(okunan.services.bugsink.command.slice(4)).toEqual(
      bugsinkKomutu.map((parca) => parca.replaceAll("$", () => "$$")),
    );
  });
});

describe("sunucudaki betikler", () => {
  it("kurma betiğinin sözdizimi doğru, değer taşımıyor", () => {
    const betik = kurmaBetigi("deneme");
    expect(bashSozdizimi(betik).status).toBe(0);
    // Görüntünün sürüm özeti dışında uzun onaltılık değer yok.
    expect(betik.replaceAll(bugsinkGoruntusu, "")).not.toMatch(/[0-9a-f]{40,}/);
    for (const dosya of Object.keys(hataIzlemeGizliBilgisi.dosyalar))
      expect(betik).toContain(dosya);
  });

  it("yönetim betiğinin sözdizimi doğru, anahtar girdiden gider", () => {
    const betik = yonetimBetigi("deneme", ["proje", "ornek-site"]);
    expect(bashSozdizimi(betik).status).toBe(0);
    expect(betik).toContain("docker exec -i");
    expect(betik).toMatch(/sudo cat \S+\/yonetim_anahtari \|/);
  });

  it.each([
    ["boşluk", "a b"],
    ["noktalı virgül", "a;rm"],
    ["tırnak", "a'b"],
    ["büyük harf", "A"],
  ])("yönetim betiği kabukta anlamı olan argümanı kabul etmez: %s", (_ad, arguman) => {
    expect(() => yonetimBetigi("deneme", ["proje", arguman])).toThrow(/Geçersiz argüman/);
  });
});

describe("ön kapı", () => {
  it("dışarıya yalnız gönderim yolları açık, geri kalanı 404", () => {
    const satir = hataIzlemeSatiri();
    expect(satir).toContain("path_regexp ^/api/[0-9]+/(store|envelope)/$");
    expect(satir).toContain("method POST OPTIONS");
    expect(satir).toMatch(/handle \{\s*respond 404\s*\}/);
    expect(satir).toContain("max_size");
  });

  it("hata izleme ağı ön kapıda dışarıya kapalı kurulur", () => {
    const tanim = onKapiTanimi();
    expect(tanim.networks[hataIzlemeAgi]).toEqual({ name: hataIzlemeAgi, internal: true });
    expect(tanim.services.caddy.networks).toHaveProperty(hataIzlemeAgi);
    expect(tanim.services.yoklama.networks).not.toContain(hataIzlemeAgi);
  });

  it("kutu yalnız kendi ağında olmalı", () => {
    expect(hataIzlemeAgHatalari([hataIzlemeAgi])).toEqual([]);
    expect(hataIzlemeAgHatalari([hataIzlemeAgi, "altyapi"])).toEqual(["beklenmeyen ağ altyapi"]);
    expect(hataIzlemeAgHatalari(["site-deneme-a"])).toHaveLength(2);
  });
});

describe("yayındaki site kutusu", () => {
  it("gönderim adresi ve ortam verilirse kutuya geçer", () => {
    const adres = "https://0123456789abcdef0123456789abcdef@izleme.ornek.com/1";
    const ortam = yayinKutusuTanimi("deneme", "ornek-site", 1, 1, adres).services.uygulama
      .environment as Record<string, string>;
    expect(ortam[hataIzlemeDegiskenleri.adres]).toBe(adres);
    expect(ortam[hataIzlemeDegiskenleri.ortam]).toBe("deneme");
  });

  it("verilmezse kutuda hata izleme değişkeni yok", () => {
    const ortam = yayinKutusuTanimi("deneme", "ornek-site", 1, 1).services.uygulama.environment;
    expect(ortam).not.toHaveProperty(hataIzlemeDegiskenleri.adres);
  });
});

describe("deneme komutunun kayıt denetimi", () => {
  const beklenen = { site: "ornek-site", surum: "0.1.0", ortam: "deneme", kaynak: "sunucu" };
  const saglam = {
    release: "0.1.0",
    environment: "deneme",
    tags: { site: "ornek-site", cekirdek_surumu: "0.1.0", kaynak: "sunucu" },
    exception: { values: [{ type: "Error", value: "d***@example.com *********43" }] },
  };

  it("sağlam kayıt geçer", () => {
    expect(olaySorunlari(saglam, beklenen)).toEqual([]);
  });

  it.each([
    ["açık e-posta", { extra: { e: denemeDegerleri.eposta } }, "açık"],
    ["açık şifre", { extra: { e: denemeDegerleri.sifre } }, "açık"],
    ["açık kart", { extra: { e: "4111111111111111" } }, "açık"],
    ["sorgu kısmı", { extra: { yol: `/?anahtar=${denemeDegerleri.sorgu}` } }, "açık"],
    ["ziyaretçi bilgisi", { user: { ip_address: "{{auto}}" } }, "yasak alan: user"],
    ["istek başlıkları", { request: { headers: {} } }, "yasak alan: request"],
    ["IP adresi", { extra: { ip: "203.0.113.7" } }, "IP adresi"],
    ["başka site", { tags: { ...saglam.tags, site: "baska" } }, "site etiketi"],
    ["eski sürüm", { release: "0.0.9" }, "sürüm etiketi"],
    ["başka ortam", { environment: "canli" }, "ortam"],
  ])("bozuk kayıt yakalanır: %s", (_ad, bozma, sorun) => {
    expect(olaySorunlari({ ...saglam, ...bozma }, beklenen).join("\n")).toContain(sorun);
  });

  it("maske çalışmamış (e-posta tümüyle silinmiş) kayıt da yakalanır", () => {
    const silinmis = { ...saglam, exception: { values: [{ type: "Error", value: "x" }] } };
    expect(olaySorunlari(silinmis, beklenen)).toContain("kısaltılmış e-posta yok");
  });
});
