// Yerelde tam ortam (kart 0016, karar 0028): önde Caddy, arkada PostgreSQL ve her sitenin kendi
// kutusu. Sunucudaki düzenin aynısıdır; sunucuya gitmeden önce her şey burada denenir.
// Açma, kapatma ve deneme komutları (yerel-ortam-ac/-kapat/-testi.mts) bu dosyayı kullanır.
//
// - Her site, kimlik dosyasındaki çekirdek sürümünün görüntüsüyle açılır (karar 0011).
// - Gizli bilgiler yalnız .env'den okunur. Üretilen ayar dosyalarına şifre yazılmaz, yalnız
//   değişkenin adı yazılır; değer kutuya ortam değişkeniyle gider ve ekrana basılmaz.
// - Üretilen dosyalar ve geçici deneme siteleri sunucu/olusan/ altındadır, kayda girmez.

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { request } from "node:http";
import { join, resolve } from "node:path";
import { parseEnv } from "node:util";
import { sql } from "drizzle-orm";
import { type Site, siteKlasorunuDogrula } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { dosyaKlasoruDegiskeni, kutudakiDosyaKlasoru } from "../cekirdek/kayitlar/dosya.ts";
import { cekirdekSurumu } from "../cekirdek/surum.ts";
import { baglan, siteVeritabaniAdi } from "../cekirdek/veritabani/baglanti.ts";
import { siteVeritabaniniGuncelle } from "../cekirdek/veritabani/guncelle.ts";
import { goruntuAdi } from "./cekirdek-goruntusu-denetle.mts";
import { arkaPlanServisi, kaliciKutu, siteSaglikYoklamasi } from "./kutu-kurali.mts";
import { veritabaniVeKullaniciAc } from "./site-veritabani.mts";

export const kok = join(import.meta.dirname, "..");
const sunucu = join(kok, "sunucu");
const olusan = join(sunucu, "olusan");
const caddyKlasoru = join(olusan, "caddy");
const sitelerDosyasi = join(olusan, "siteler.compose.json");
export const denemeSiteleri = join(olusan, "deneme-siteleri");
const envYolu = join(kok, ".env");

type Degerler = Record<string, string | undefined>;
const degerler = (): Degerler => parseEnv(readFileSync(envYolu, "utf8")) as Degerler;
const gerekli = (ad: string): string => {
  const deger = degerler()[ad];
  if (!deger) throw new Error(`.env dosyasında ${ad} yok. Biçimi .env.example dosyasında yazar.`);
  return deger;
};

export const yerelPort = (): number => Number(gerekli("YEREL_ORTAM_PORTU"));
export const postaKutusuAdresi = (): string => `http://127.0.0.1:${gerekli("POSTA_KUTUSU_PORTU")}`;
export const siteAdresi = (kodAdi: string): string => `http://${kodAdi}.localhost:${yerelPort()}`;
const servisAdi = (kodAdi: string): string => `site-${kodAdi}`;
export const kutuAdi = (kodAdi: string): string => `altyapi-yerel-site-${kodAdi}`;
const adresAnahtari = (kodAdi: string): string =>
  `VERITABANI_ADRESI_${kodAdi.toUpperCase().replaceAll("-", "_")}`;
const kutuAdresAnahtari = (kodAdi: string): string => `KUTU_${adresAnahtari(kodAdi)}`;

// docker compose: veritabanı, Caddy ve (varsa) üretilen site kutuları tek projededir.
const compose = (argumanlar: string[], { siteler = false, ek = {} as Degerler } = {}) =>
  spawnSync(
    "docker",
    [
      "compose",
      ...["-f", join(sunucu, "compose.yaml"), "-f", join(sunucu, "yerel-ortam.yaml")],
      ...(siteler ? ["-f", sitelerDosyasi] : []),
      ...["--env-file", envYolu],
      ...argumanlar,
    ],
    { stdio: "inherit", env: { ...process.env, ...ek } },
  );

export type OrtamSitesi = Site & { klasor: string };

// Klasörleri şemadan geçirir; hataların hepsini birlikte söyler.
const siteleriOku = (klasorler: string[]): OrtamSitesi[] => {
  const hatalar: string[] = [];
  const siteler: OrtamSitesi[] = [];
  for (const klasor of klasorler.map((yol) => resolve(yol))) {
    const sonuc = siteKlasorunuDogrula(klasor);
    if (sonuc.gecerli) siteler.push({ ...sonuc.site, klasor });
    else hatalar.push(`${klasor}:`, ...sonuc.hatalar.map((hata) => `  ${hata}`));
  }
  if (hatalar.length > 0) throw new Error(`Site klasörü geçersiz:\n${hatalar.join("\n")}`);
  return siteler;
};

const altKlasorler = (klasor: string): string[] =>
  existsSync(klasor)
    ? readdirSync(klasor, { withFileTypes: true })
        .filter((girdi) => girdi.isDirectory())
        .map((girdi) => join(klasor, girdi.name))
    : [];

// Klasör verilmezse siteler/ altındaki bütün siteler ve açık deneme siteleri.
export const varsayilanKlasorler = (): string[] => [
  ...altKlasorler(join(kok, "siteler")),
  ...altKlasorler(denemeSiteleri),
];

// Sitenin veritabanı adresi (bu bilgisayardan bakınca). VERITABANI_ADRESI hangi sitenin
// kullanıcısını taşıyorsa o site onu kullanır; öteki siteler VERITABANI_ADRESI_<KOD_ADI>
// satırını. Satır yoksa şifre üretilir ve .env'ye eklenir.
const veritabaniAdresi = (kodAdi: string): URL => {
  const ad = siteVeritabaniAdi(kodAdi);
  const { VERITABANI_ADRESI: gelistirme, [adresAnahtari(kodAdi)]: kayitli } = degerler();
  if (gelistirme && URL.canParse(gelistirme)) {
    const adres = new URL(gelistirme);
    if (decodeURIComponent(adres.username) === ad) return adres;
  }
  if (kayitli) return new URL(kayitli);
  const adres = new URL(`postgres://localhost:${gerekli("VERITABANI_PORTU")}/${ad}`);
  adres.username = ad;
  adres.password = randomBytes(24).toString("hex");
  const icerik = readFileSync(envYolu, "utf8");
  appendFileSync(
    envYolu,
    `${icerik.endsWith("\n") ? "" : "\n"}${adresAnahtari(kodAdi)}=${adres.href}\n`,
  );
  return adres;
};

// Kutunun içinden bakınca veritabanı, yerel ortamın ağındaki kendi adıyla bulunur.
const kutudanAdres = (adres: URL): string => {
  const sonuc = new URL(adres.href);
  sonuc.hostname = "veritabani";
  sonuc.port = "5432";
  return sonuc.href;
};

const goruntuyuHazirla = (surum: string, yenile: boolean): string => {
  const etiket = `${goruntuAdi}:${surum}`;
  const var_ = spawnSync("docker", ["image", "inspect", etiket], { stdio: "ignore" }).status === 0;
  if (var_ && !yenile) {
    // Aynı etiketli görüntü koddaki son değişikliklerden önce üretilmiş olabilir.
    console.log(`kullanılıyor ${etiket} (var olan görüntü; şu anki kodla: --goruntuyu-yenile)`);
    return etiket;
  }
  if (surum !== cekirdekSurumu) {
    throw new Error(
      `${etiket} görüntüsü yok. Bu sürüm şu anki çekirdeğin sürümü (${cekirdekSurumu}) değil, burada üretilemez.`,
    );
  }
  const uretim = spawnSync("node", [join(kok, "komutlar", "cekirdek-goruntusu.mts")], {
    stdio: "inherit",
  });
  if (uretim.status !== 0) throw new Error(`${etiket} görüntüsü üretilemedi.`);
  return etiket;
};

const uretilenleriSil = (): void => {
  for (const dosya of existsSync(caddyKlasoru) ? readdirSync(caddyKlasoru) : []) {
    if (dosya.endsWith(".caddy")) unlinkSync(join(caddyKlasoru, dosya));
  }
  if (existsSync(sitelerDosyasi)) unlinkSync(sitelerDosyasi);
};

// --- Dosya deposu (kart 0072, karar 0058) ---
// Sunucudaki gibi her site kendi kullanıcısıyla çalışır ve dosyaları yalnız o kullanıcıya açık
// (0700) bir klasördedir. Yerelde klasör Docker'ın adlandırılmış birimidir: bilgisayardaki bir
// klasörün sahibi başka kullanıcı olunca onu çalıştıran kişi silemezdi. Kullanıcı numarası sitenin
// açılıştaki sırasından gelir; birim her açılışta o kullanıcıya verilir.
export const yerelKutuKullanicisi = (sira: number): number => 40_000 + sira;
export const dosyaBirimi = (kodAdi: string): string => `altyapi-yerel-dosyalar-${kodAdi}`;

const dosyaBiriminiHazirla = (kodAdi: string, kullanici: number, etiket: string): void => {
  const birim = dosyaBirimi(kodAdi);
  const olustur = spawnSync("docker", ["volume", "create", birim], { stdio: "ignore" });
  // Sahibi ve izni kök kullanıcıyla, ağsız ve hemen silinen bir kutuda verilir.
  const izin = spawnSync(
    "docker",
    [
      ...["run", "--rm", "--network", "none", "--user", "0:0", "--entrypoint", "sh"],
      ...["-v", `${birim}:/birim`, etiket],
      ...["-c", `chown ${kullanici}:${kullanici} /birim && chmod 0700 /birim`],
    ],
    { stdio: "inherit" },
  );
  if (olustur.status !== 0 || izin.status !== 0) {
    throw new Error(`${kodAdi} için dosya birimi hazırlanamadı.`);
  }
};

const dosyaBiriminiSil = (kodAdi: string): void => {
  spawnSync("docker", ["volume", "rm", "--force", dosyaBirimi(kodAdi)], { stdio: "ignore" });
};

// Bir sitenin kutu tanımı. Yeniden başlama kuralı tek yerden gelir (kutu-kurali.mts).
export const siteKutusu = (kodAdi: string, klasor: string, etiket: string, kullanici: number) => ({
  image: etiket,
  container_name: kutuAdi(kodAdi),
  ...kaliciKutu,
  user: `${kullanici}:${kullanici}`,
  environment: {
    [dosyaKlasoruDegiskeni]: kutudakiDosyaKlasoru,
    // Kod adı klasör adıyla aynı olmalıdır (kimlik şeması), klasör aynı adla bağlanır.
    SITE_KLASORU: `/siteler/${kodAdi}`,
    VERITABANI_ADRESI: `\${${kutuAdresAnahtari(kodAdi)}:?veritabanı adresi verilmedi}`,
    IKI_ASAMA_ANAHTARI: `\${IKI_ASAMA_ANAHTARI:?iki aşamalı giriş anahtarı verilmedi}`,
    EPOSTA_SUNUCUSU: "smtp://posta-kutusu:1025",
    SITE_ADRESI: `http://${kodAdi}.localhost:${yerelPort()}`,
  },
  volumes: [`${klasor}:/siteler/${kodAdi}:ro`, `${dosyaBirimi(kodAdi)}:${kutudakiDosyaKlasoru}`],
  depends_on: {
    veritabani: { condition: "service_healthy" },
    "posta-kutusu": { condition: "service_healthy" },
  },
  healthcheck: siteSaglikYoklamasi,
});

// Her site için Caddy satırı ve kutu tanımı. Kutu tanımı JSON'dur (compose JSON da okur).
const ayarlariUret = (siteler: (OrtamSitesi & { etiket: string; kullanici: number })[]): void => {
  uretilenleriSil();
  mkdirSync(caddyKlasoru, { recursive: true });
  const servisler: Record<string, unknown> = {
    caddy: {
      depends_on: Object.fromEntries(
        siteler.map(({ kimlik }) => [servisAdi(kimlik.kodAdi), { condition: "service_healthy" }]),
      ),
    },
  };
  for (const { kimlik, klasor, etiket, kullanici } of siteler) {
    const { kodAdi } = kimlik;
    writeFileSync(
      join(caddyKlasoru, `${kodAdi}.caddy`),
      `http://${kodAdi}.localhost {\n\treverse_proxy ${servisAdi(kodAdi)}:3000\n}\n`,
    );
    servisler[servisAdi(kodAdi)] = siteKutusu(kodAdi, klasor, etiket, kullanici);
    servisler[`${servisAdi(kodAdi)}-arka-plan`] = arkaPlanServisi(
      siteKutusu(kodAdi, klasor, etiket, kullanici),
    );
  }
  // Dosya birimleri açılıştan önce hazırlanır (dosyaBiriminiHazirla), tanım onları dışarıdan alır.
  const birimler = Object.fromEntries(
    siteler.map(({ kimlik }) => [dosyaBirimi(kimlik.kodAdi), { external: true }]),
  );
  writeFileSync(
    sitelerDosyasi,
    `${JSON.stringify({ services: servisler, volumes: birimler }, null, 2)}\n`,
  );
};

// Caddy üzerinden istek. Host başlığı sitenin adresidir; ad çözümlemesine bağlı kalmaz.
export const iste = (
  kodAdi: string,
  yol: string,
  basliklar: Record<string, string> = {},
): Promise<{ durum: number; govde: string; konum: string | undefined }> =>
  new Promise((coz, reddet) => {
    const istek = request(
      {
        host: "127.0.0.1",
        port: yerelPort(),
        path: yol,
        headers: { host: `${kodAdi}.localhost:${yerelPort()}`, ...basliklar },
      },
      (yanit) => {
        let govde = "";
        yanit.setEncoding("utf8");
        yanit.on("data", (parca) => {
          govde += parca;
        });
        yanit.on("end", () =>
          coz({ durum: yanit.statusCode ?? 0, govde, konum: yanit.headers.location }),
        );
      },
    );
    istek.on("error", reddet);
    istek.setTimeout(10_000, () => istek.destroy(new Error("zaman aşımı")));
    istek.end();
  });

// JSON gövdeli POST isteği. Ön kapının üzerinden gider, yolu olduğu gibi gönderir.
export const gonder = (
  kodAdi: string,
  yol: string,
  govde: unknown,
): Promise<{ durum: number; govde: string }> =>
  new Promise((coz, reddet) => {
    const metin = JSON.stringify(govde);
    const istek = request(
      {
        host: "127.0.0.1",
        port: yerelPort(),
        path: yol,
        method: "POST",
        headers: {
          host: `${kodAdi}.localhost:${yerelPort()}`,
          "content-type": "application/json",
          "content-length": Buffer.byteLength(metin),
        },
      },
      (yanit) => {
        let okunan = "";
        yanit.setEncoding("utf8");
        yanit.on("data", (parca) => {
          okunan += parca;
        });
        yanit.on("end", () => coz({ durum: yanit.statusCode ?? 0, govde: okunan }));
      },
    );
    istek.on("error", reddet);
    istek.setTimeout(10_000, () => istek.destroy(new Error("zaman aşımı")));
    istek.end(metin);
  });

// Yalnız veritabanı açılır; açık site kutuları "artık" sayılıp uyarı verilmesin diye susturulur.
const veritabaniniBaslat = (): void => {
  const acilis = compose(["up", "-d", "--wait", "veritabani"], {
    ek: { COMPOSE_IGNORE_ORPHANS: "true" },
  });
  if (acilis.status !== 0) {
    throw new Error("Veritabanı kutusu açılamadı.");
  }
};

export const ortamiAc = async (
  klasorler: string[],
  { goruntuyuYenile = false } = {},
): Promise<OrtamSitesi[]> => {
  const siteler = siteleriOku(klasorler);
  if (siteler.length === 0) throw new Error("Açılacak site yok.");
  yerelPort();
  veritabaniniBaslat();

  const kutuAdresleri: Degerler = {};
  const hazirlar: (OrtamSitesi & { etiket: string; kullanici: number })[] = [];
  const uretilen = new Map<string, string>();
  for (const site of siteler) {
    const { kodAdi, cekirdekSurumu: surum } = site.kimlik;
    const adres = veritabaniAdresi(kodAdi);
    const ad = siteVeritabaniAdi(kodAdi);
    if (!veritabaniVeKullaniciAc(ad, decodeURIComponent(adres.password))) {
      throw new Error(`${ad} veritabanı açılamadı.`);
    }
    const veritabani = baglan(adres.href);
    try {
      await siteVeritabaniniGuncelle(veritabani, kodAdi);
    } finally {
      await veritabani.$client.end();
    }
    kutuAdresleri[kutuAdresAnahtari(kodAdi)] = kutudanAdres(adres);
    // Aynı sürümü kullanan siteler için görüntü bir kez hazırlanır.
    const etiket = uretilen.get(surum) ?? goruntuyuHazirla(surum, goruntuyuYenile);
    uretilen.set(surum, etiket);
    const kullanici = yerelKutuKullanicisi(hazirlar.length + 1);
    dosyaBiriminiHazirla(kodAdi, kullanici, etiket);
    hazirlar.push({ ...site, etiket, kullanici });
  }

  ayarlariUret(hazirlar);
  const acilis = compose(["up", "-d", "--wait", "--remove-orphans"], {
    siteler: true,
    ek: kutuAdresleri,
  });
  if (acilis.status !== 0) throw new Error("Ortam açılamadı. Kutuların günlüğüne bakın.");
  // Caddy site satırlarını açılışta okur; site listesi değişmiş olabilir.
  compose(["restart", "caddy"], { siteler: true, ek: kutuAdresleri });

  for (const { kimlik } of siteler) {
    let durum = 0;
    for (let deneme = 0; deneme < 30 && durum !== 200; deneme++) {
      durum = await iste(kimlik.kodAdi, "/kapi/herkese-acik/saglik").then(
        (yanit) => yanit.durum,
        () => 0,
      );
      if (durum !== 200) await new Promise((bekle) => setTimeout(bekle, 500));
    }
    if (durum !== 200) throw new Error(`${kimlik.kodAdi} Caddy üzerinden açılmadı (${durum}).`);
  }
  return siteler;
};

// Aynı anda tek ortam komutu çalışır: ikisi birden çalışırsa biri ötekinin deneme sitesini
// silebilir ya da .env'yi aynı anda yazabilir. Kilit dosyası komutun süreç numarasını taşır;
// o süreç artık yoksa kilit bayattır ve yeniden alınır.
const kilitDosyasi = join(olusan, "kilit");

const surecCalisiyor = (numara: number): boolean => {
  try {
    process.kill(numara, 0);
    return true;
  } catch {
    return false;
  }
};

export const kilitle = async <T,>(is: () => Promise<T>): Promise<T> => {
  mkdirSync(olusan, { recursive: true });
  try {
    writeFileSync(kilitDosyasi, String(process.pid), { flag: "wx" });
  } catch {
    const sahibi = Number(readFileSync(kilitDosyasi, "utf8"));
    if (surecCalisiyor(sahibi)) {
      throw new Error(
        `Başka bir yerel ortam komutu çalışıyor (süreç ${sahibi}). Bitmesini bekleyin.`,
      );
    }
    writeFileSync(kilitDosyasi, String(process.pid));
  }
  try {
    return await is();
  } finally {
    unlinkSync(kilitDosyasi);
  }
};

// Geçici deneme sitelerini, veritabanlarını ve .env satırlarını siler. Veritabanı açık olmalı.
const denemeSiteleriniTemizle = async (): Promise<string[]> => {
  const klasorler = altKlasorler(denemeSiteleri);
  if (klasorler.length === 0) return [];
  veritabaniniBaslat();
  const yoneticiAdresi = new URL(`postgres://localhost:${gerekli("VERITABANI_PORTU")}/postgres`);
  yoneticiAdresi.username = "postgres";
  yoneticiAdresi.password = gerekli("VERITABANI_YONETICI_SIFRESI");
  const yonetici = baglan(yoneticiAdresi.href);
  const silinenler: string[] = [];
  try {
    for (const klasor of klasorler) {
      const kodAdi = klasor.split("/").at(-1) ?? "";
      // Yalnız denemeSitesiAc'ın açtığı klasör silinir: adı deneme-<6 harf>, kimliği geçerli ve
      // demo, siteler/ altında aynı adlı site yok. Öteki her şey yerinde bırakılır ve söylenir.
      const sonuc = siteKlasorunuDogrula(klasor);
      const denemeMi =
        denemeAdi.test(kodAdi) &&
        sonuc.gecerli &&
        sonuc.site.kimlik.tur === "demo" &&
        !existsSync(join(kok, "siteler", kodAdi));
      if (!denemeMi) {
        console.error(`dokunulmadı ${klasor}: deneme sitesine benzemiyor, elle bakın.`);
        continue;
      }
      const ad = siteVeritabaniAdi(kodAdi);
      await yonetici.execute(sql`drop database if exists ${sql.identifier(ad)} with (force)`);
      await yonetici.execute(sql`drop role if exists ${sql.identifier(ad)}`);
      const anahtar = `${adresAnahtari(kodAdi)}=`;
      const satirlar = readFileSync(envYolu, "utf8").split("\n");
      writeFileSync(envYolu, satirlar.filter((satir) => !satir.startsWith(anahtar)).join("\n"));
      // Deneme sitesinin tek alt klasörü başlangıç değerleridir (denemeSitesiAc).
      const baslangicKlasoru = join(klasor, "baslangic");
      if (existsSync(baslangicKlasoru)) {
        for (const dosya of readdirSync(baslangicKlasoru))
          unlinkSync(join(baslangicKlasoru, dosya));
        rmdirSync(baslangicKlasoru);
      }
      for (const dosya of readdirSync(klasor)) unlinkSync(join(klasor, dosya));
      rmdirSync(klasor);
      silinenler.push(kodAdi);
    }
  } finally {
    await yonetici.$client.end();
  }
  return silinenler;
};

export const ortamiKapat = async (): Promise<string[]> => {
  const silinenler = await denemeSiteleriniTemizle();
  // Üretilen site dosyası olmadan kapatılır: site kutuları projenin artık kutuları sayılır ve
  // --remove-orphans ile kapanır. Veritabanının verisi silinmez.
  if (compose(["down", "--remove-orphans"]).status !== 0) {
    throw new Error("Ortam kapatılamadı.");
  }
  // Deneme sitesinin dosya birimi kutusu kapandıktan sonra silinebilir. Kalıcı sitelerin birimi
  // veritabanı gibi kalır.
  for (const kodAdi of silinenler) dosyaBiriminiSil(kodAdi);
  uretilenleriSil();
  return silinenler;
};

// Geçici deneme sitesi: sunucu/olusan/deneme-siteleri/deneme-<ek>. Ayarların hepsi varsayılandır;
// yalnız mağaza adı kimlikteki addan farklıdır: vitrin adı ayardan okumazsa denemede yakalanır (kart 0071).
const denemeAdi = /^deneme-[0-9a-f]{6}$/;

export const denemeSitesiAc = (): string => {
  const kodAdi = `deneme-${randomBytes(3).toString("hex")}`;
  const klasor = join(denemeSiteleri, kodAdi);
  mkdirSync(klasor, { recursive: true });
  const kimlik = {
    kodAdi,
    gorunenAd: `Deneme Sitesi ${kodAdi.slice("deneme-".length)}`,
    tur: "demo",
    adresler: {},
    cekirdekSurumu,
    teslimDurumu: { magazaSahibiHesabi: "gerekmez", yurtDisiAktarimBelgeleri: "gerekmez" },
  };
  writeFileSync(join(klasor, "kimlik.json"), `${JSON.stringify(kimlik, null, 2)}\n`);
  writeFileSync(join(klasor, "ayarlar.json"), "{}\n");
  mkdirSync(join(klasor, "baslangic"));
  writeFileSync(
    join(klasor, "baslangic", "ayarlar.json"),
    `${JSON.stringify({ magazaAdi: `Deneme Mağazası ${kodAdi.slice("deneme-".length)}` }, null, 2)}\n`,
  );
  return klasor;
};
