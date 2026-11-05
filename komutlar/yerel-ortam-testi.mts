// Yerel ortamın denemesi (kart 0016, karar 0028). Örnek Mağaza'nın yanına geçici bir deneme
// sitesi açar ve Caddy üzerinden ölçer:
//   - her site yalnız kendi adını gösterir, sağlık ucu açılır ve sitenin çekirdek sürümünü söyler;
//   - tanınmayan adres 404 döner;
//   - her kutu yalnız kendi veritabanına bağlanır, ötekinin veritabanına giremez;
//   - site kutularının portu dışarıya açık değildir;
//   - istemcinin yazdığı sahte X-Forwarded-For başlığı istek sınırını aşamaz (karar 0024);
//   - ortamın her kutusu Docker yeniden başlayınca kendiliğinden açılır (kart 0038).
// Sonunda ortamı kapatır ve deneme sitesini siler. Bir ölçüm kalırsa kırmızı biter.
// Çalıştırma: pnpm yerel-ortam-testi [--acik-birak]
//   --acik-birak: ortamı ve deneme sitesini açık bırakır; kapatmak: pnpm yerel-ortam-kapat

import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { istekSinirlari } from "../cekirdek/kayitlar/kapi.ts";
import { siteVeritabaniAdi } from "../cekirdek/veritabani/baglanti.ts";
import { kutuKuraliDogru, yenidenBaslama } from "./kutu-kurali.mts";
import {
  denemeSitesiAc,
  iste,
  kilitle,
  kok,
  kutuAdi,
  type OrtamSitesi,
  ortamiAc,
  ortamiKapat,
  siteAdresi,
} from "./yerel-ortam.mts";

const acikBirak = process.argv.includes("--acik-birak");
const sonuclar: { ad: string; gecti: boolean; ayrinti: string }[] = [];
const olc = (ad: string, gecti: boolean, ayrinti = "") => {
  sonuclar.push({ ad, gecti, ayrinti });
  console.log(`${gecti ? "geçti " : "KALDI "}  ${ad}${ayrinti ? `  (${ayrinti})` : ""}`);
};

const baslik = (govde: string): string => govde.match(/<h1>([^<]*)<\/h1>/)?.[1] ?? "";

// Kutunun içinde kendi adresiyle çalışan betik: kendi veritabanını ve kimliğini okur, sonra aynı
// kullanıcıyla ötekinin veritabanına girmeyi dener. Adres kutunun ortamından okunur, yazdırılmaz.
const kutuBetigi = `
const pg = require("/uygulama/node_modules/pg");
const dene = async (veritabani) => {
  const adres = new URL(process.env.VERITABANI_ADRESI);
  if (veritabani) adres.pathname = "/" + veritabani;
  const istemci = new pg.Client({ connectionString: adres.href, connectionTimeoutMillis: 5000 });
  try {
    await istemci.connect();
    const { rows } = await istemci.query(
      "select current_database() as veritabani, (select site_kod_adi from veritabani_kimligi limit 1) as kod_adi",
    );
    return { baglandi: true, ...rows[0] };
  } catch (hata) {
    return { baglandi: false, hata: String(hata.message).slice(0, 120) };
  } finally {
    await istemci.end().catch(() => {});
  }
};
(async () => {
  const kendi = await dene();
  const oteki = await dene(process.argv[1]);
  process.stdout.write(JSON.stringify({ kendi, oteki }));
})();
`;

const kutudaCalistir = (kodAdi: string, otekiVeritabani: string) => {
  const sonuc = spawnSync(
    "docker",
    ["exec", kutuAdi(kodAdi), "node", "-e", kutuBetigi, otekiVeritabani],
    { encoding: "utf8" },
  );
  return JSON.parse(sonuc.stdout || "{}") as {
    kendi?: { baglandi: boolean; veritabani?: string; kod_adi?: string };
    oteki?: { baglandi: boolean; hata?: string };
  };
};

const sitesiniOlc = async (site: OrtamSitesi, oteki: OrtamSitesi) => {
  const { kodAdi, gorunenAd, cekirdekSurumu } = site.kimlik;
  const vitrin = await iste(kodAdi, "/");
  olc(
    `${kodAdi}: vitrin kendi adını gösteriyor`,
    vitrin.durum === 200 && baslik(vitrin.govde) === gorunenAd,
    `${vitrin.durum}, "${baslik(vitrin.govde)}"`,
  );
  const saglik = await iste(kodAdi, "/kapi/herkese-acik/saglik");
  const veri = JSON.parse(saglik.govde || "{}").veri ?? {};
  olc(
    `${kodAdi}: sağlık ucu açılıyor ve sitenin sürümünü söylüyor`,
    saglik.durum === 200 && veri.cekirdekSurumu === cekirdekSurumu && veri.veritabani === "ayakta",
    `${saglik.durum}, sürüm ${veri.cekirdekSurumu}, veritabanı ${veri.veritabani}`,
  );
  const kendiVeritabani = siteVeritabaniAdi(kodAdi);
  const { kendi, oteki: otekine } = kutudaCalistir(kodAdi, siteVeritabaniAdi(oteki.kimlik.kodAdi));
  olc(
    `${kodAdi}: kutu yalnız kendi veritabanına bağlanıyor`,
    kendi?.baglandi === true && kendi.veritabani === kendiVeritabani && kendi.kod_adi === kodAdi,
    `${kendi?.veritabani}, kimlik ${kendi?.kod_adi}`,
  );
  olc(
    `${kodAdi}: kutu ötekinin veritabanına giremiyor`,
    otekine?.baglandi === false &&
      /no pg_hba\.conf entry|permission denied/.test(otekine.hata ?? ""),
    otekine?.hata ?? "bağlandı",
  );
  const portlar = spawnSync(
    "docker",
    ["inspect", "--format", "{{json .HostConfig.PortBindings}}", kutuAdi(kodAdi)],
    { encoding: "utf8" },
  ).stdout.trim();
  olc(`${kodAdi}: kutunun portu dışarıya kapalı`, portlar === "{}" || portlar === "null", portlar);
};

// Ortamın bütün kutuları (veritabanı, Caddy, siteler) yeniden başlama kuralıyla çalışmalı.
const kutuKurallariniOlc = (siteSayisi: number) => {
  const kutular = spawnSync(
    "docker",
    ["ps", "--filter", "label=com.docker.compose.project=altyapi-yerel", "--format", "{{.Names}}"],
    { encoding: "utf8" },
  )
    .stdout.split("\n")
    .filter(Boolean)
    .sort();
  olc(
    "ortamın bütün kutuları çalışıyor",
    kutular.length === siteSayisi + 2,
    `${kutular.length} kutu, beklenen ${siteSayisi + 2}`,
  );
  for (const kutu of kutular) {
    const kural = spawnSync(
      "docker",
      ["inspect", "--format", "{{.HostConfig.RestartPolicy.Name}}", kutu],
      { encoding: "utf8" },
    ).stdout.trim();
    olc(
      `${kutu}: Docker yeniden başlayınca açılıyor`,
      kutuKuraliDogru(kural),
      `kural ${kural || "yok"}, beklenen ${yenidenBaslama}`,
    );
  }
};

const calistir = async (): Promise<void> => {
  let siteler: OrtamSitesi[] = [];
  try {
    const deneme = denemeSitesiAc();
    siteler = await ortamiAc([join(kok, "siteler", "ornek-magaza"), deneme]);
    const [ornek, denemeSitesi] = siteler as [OrtamSitesi, OrtamSitesi];
    console.log("");
    await sitesiniOlc(ornek, denemeSitesi);
    await sitesiniOlc(denemeSitesi, ornek);

    const tanimsiz = await iste("tanimsiz-site", "/");
    olc("tanınmayan adres hiçbir siteye gitmiyor", tanimsiz.durum === 404, `${tanimsiz.durum}`);

    // Her istekte başka bir sahte adres yazılır. Caddy başlığı kendisi yazıyorsa sınır yine dolar.
    const { istek } = istekSinirlari.genel;
    let sinirDoldu = false;
    for (let sira = 0; sira <= istek + 5 && !sinirDoldu; sira++) {
      const yanit = await iste(denemeSitesi.kimlik.kodAdi, "/kapi/herkese-acik/saglik", {
        "x-forwarded-for": `203.0.113.${sira % 250}`,
      });
      sinirDoldu = yanit.durum === 429;
    }
    olc("sahte X-Forwarded-For başlığı istek sınırını aşamıyor", sinirDoldu);
    kutuKurallariniOlc(siteler.length);
  } catch (hata) {
    olc("ortam açıldı", false, (hata as Error).message);
  }

  if (acikBirak && siteler.length > 0) {
    console.log("\nOrtam açık bırakıldı:");
    for (const { kimlik } of siteler) {
      console.log(`  ${kimlik.gorunenAd.padEnd(24)} ${siteAdresi(kimlik.kodAdi)}`);
    }
    console.log("Kapatmak (deneme sitesini de siler): pnpm yerel-ortam-kapat");
  } else {
    for (const kodAdi of await ortamiKapat()) console.log(`silindi     deneme sitesi ${kodAdi}`);
  }
};

try {
  await kilitle(calistir);
} catch (hata) {
  olc("ortam komutu çalıştı", false, (hata as Error).message);
}
const kalanlar = sonuclar.filter((sonuc) => !sonuc.gecti);
console.log(
  kalanlar.length === 0
    ? `\nYerel ortam denemesi yeşil: ${sonuclar.length} ölçüm geçti.`
    : `\nYerel ortam denemesi kırmızı: ${kalanlar.length} ölçüm kaldı.`,
);
process.exitCode = kalanlar.length === 0 ? 0 : 1;
