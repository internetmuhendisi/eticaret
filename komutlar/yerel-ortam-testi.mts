// Yerel ortamın denemesi (kart 0016, karar 0028). Örnek Mağaza'nın yanına geçici bir deneme
// sitesi açar ve Caddy üzerinden ölçer:
//   - her site yalnız kendi adını gösterir, sağlık ucu açılır ve sitenin çekirdek sürümünü söyler;
//   - tanınmayan adres 404 döner;
//   - her kutu yalnız kendi veritabanına bağlanır, ötekinin veritabanına giremez;
//   - site kutularının portu dışarıya açık değildir;
//   - istemcinin yazdığı sahte X-Forwarded-For başlığı istek sınırını aşamaz (karar 0024);
//   - sınır doluyken aynı ucun kodlanmış ve başka yazılışları geçmez (karar 0041);
//   - ortamın her kutusu Docker yeniden başlayınca kendiliğinden açılır (kart 0038);
//   - kayıt olan müşteriye hoş geldin e-postası gerçek arka plan kutusundan ulaşır (kart 0033);
//   - şifre sıfırlama e-postası ulaşır, bağlantısı sitenin adresindedir ve yeni şifreyi kurar (kart 0034);
//   - görüntüdeki parça yalnız kendi sitesine yönetici açar, şifre girişte geçer (kart 0048);
//   - bileşen kataloğu deneme ortamında açılır, canlı ve ortamı bilinmeyen kutuda açılmaz (kart 0104).
// Sonunda ortamı kapatır ve deneme sitesini siler. Bir ölçüm kalırsa kırmızı biter.
// Çalıştırma: pnpm yerel-ortam-testi [--acik-birak]
//   --acik-birak: ortamı ve deneme sitesini açık bırakır; kapatmak: pnpm yerel-ortam-kapat

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { siteKlasorunuOku } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { katalogAdresi } from "../cekirdek/katalog/kayit.ts";
import {
  arkaPlanDosyalari,
  kuyrukBasladiIlkSurum,
  kuyrukBasladiMesaji,
} from "../cekirdek/kayitlar/arka-plan.ts";
import {
  dosyaKlasoruDegiskeni,
  dosyaSinirlari,
  dosyaTurleri,
  kutudakiDosyaKlasoru,
} from "../cekirdek/kayitlar/dosya.ts";
import { istekSinirlari } from "../cekirdek/kayitlar/kapi.ts";
import { siteOrtamiDegiskeni } from "../cekirdek/kayitlar/site.ts";
import { metinOkuyucu } from "../cekirdek/metinler/metin.ts";
import { kodAdimi, zamanliKod } from "../cekirdek/moduller/oturum/iki-asama.ts";
import { soruyuCoz } from "../cekirdek/moduller/robot-korumasi/testler/soru-coz.ts";
import { siteVeritabaniAdi } from "../cekirdek/veritabani/baglanti.ts";
import {
  arkaPlanKutuAdi,
  bellekBaytlari,
  kutuKuraliDogru,
  siteKutusuBellegi,
  surumEnAz,
  yenidenBaslama,
} from "./kutu-kurali.mts";
import { postaKutusunuBekle, postaKutusunuSor } from "./posta-kutusu.mts";
import {
  denemeSitesiAc,
  dosyaBirimi,
  gonder,
  iste,
  isteHam,
  kilitle,
  kok,
  kutuAdi,
  type OrtamSitesi,
  ortamiAc,
  ortamiKapat,
  postaKutusuAdresi,
  siteAdresi,
  vitrinBasligi,
} from "./yerel-ortam.mts";

const acikBirak = process.argv.includes("--acik-birak");
// Açılış kurulumu için bekleme sınırı (kart 0309): temiz veritabanında Örnek Mağaza'nın kurulumu
// geliştirme bilgisayarında 30 saniye sürdü; hattın makinesi daha yavaştır.
const kuyrukBaslamaSiniriMs = 300_000;
// Kuyruk ölçümü kalınca arka plan kutusunun günlüğünden yazılan satır sayısı ve satırın en çok uzunluğu.
const kuyrukGunluguSatiri = 40;
const kuyrukGunluguGenisligi = 400;
const sonuclar: { ad: string; gecti: boolean; ayrinti: string }[] = [];
const olc = (ad: string, gecti: boolean, ayrinti = "") => {
  sonuclar.push({ ad, gecti, ayrinti });
  console.log(`${gecti ? "geçti " : "KALDI "}  ${ad}${ayrinti ? `  (${ayrinti})` : ""}`);
};

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
  const { kodAdi, cekirdekSurumu } = site.kimlik;
  // Ad mağaza sahibinin ayarıdır (kart 0071); deneme sitesinde kimlikteki addan farklıdır.
  const magazaAdi = site.baslangic.magazaAdi;
  const vitrin = await iste(kodAdi, "/");
  olc(
    `${kodAdi}: vitrin kendi adını gösteriyor`,
    vitrin.durum === 200 && vitrinBasligi(vitrin.govde) === magazaAdi,
    `${vitrin.durum}, "${vitrinBasligi(vitrin.govde)}"`,
  );
  // Bileşen kataloğu (kart 0104, karar 0078) deneme ortamında açılır; yerel ortamın kutuları deneme
  // ortamındadır. 0.34.0'dan önceki görüntüde katalog yoktur (0.33.0'daki deneme sahnesi canlı derlemeye
  // girmezdi), orada 404 beklenir. Canlı ve ortamı bilinmeyen kutuda kapalı olması aşağıda, aynı
  // görüntüde ayrıca ölçülür (katalogKapaliOlc).
  const katalogVar = surumEnAz(cekirdekSurumu, [0, 34, 0]);
  for (const yol of [katalogAdresi, `${katalogAdresi}/dugme`]) {
    const katalog = await iste(kodAdi, yol);
    olc(
      `${kodAdi}: ${yol} ${katalogVar ? "deneme ortamında açılıyor" : "eski görüntüde yok"}`,
      katalogVar
        ? katalog.durum === 200 && katalog.govde.includes("noindex")
        : katalog.durum === 404,
      `${katalog.durum}`,
    );
  }
  // Logo ucu (kart 0073), gerçek Next.js ve Caddy üzerinden. Uç 0.16.0'da geldi: daha eski sürümle
  // açılan sitede ölçülmez. İlk logosu olan sitede: dosya bayt bayt aynı, doğru tür, nosniff,
  // önbellek; HEAD gövdesiz; aynı etiketle gelen istek gövdesiz 304. Logosu olmayan site 404 alır
  // (bugün deneme sitesinin hep logosu olduğu için bu dal birim testinde ölçülür).
  const markaLogosu = site.markaLogosu;
  if (surumEnAz(cekirdekSurumu, [0, 16, 0])) {
    const logoYolu = "/kapi/herkese-acik/logo";
    const logo = await isteHam(kodAdi, logoYolu);
    if (markaLogosu === undefined) {
      olc(`${kodAdi}: logo ucu logo yokken 404 dönüyor`, logo.durum === 404, `${logo.durum}`);
    } else {
      const { etag: etiket = "" } = logo.basliklar;
      const bas = await isteHam(kodAdi, logoYolu, { yontem: "HEAD" });
      const ayni = await isteHam(kodAdi, logoYolu, {
        basliklar: { "if-none-match": String(etiket) },
      });
      olc(
        `${kodAdi}: logo ucu ilk logoyu veriyor; HEAD gövdesiz, aynı etiket 304`,
        logo.durum === 200 &&
          logo.basliklar["content-type"] === dosyaTurleri[markaLogosu.tur].mime &&
          logo.basliklar["x-content-type-options"] === "nosniff" &&
          /^public, max-age=\d+$/.test(String(logo.basliklar["cache-control"])) &&
          logo.govde.equals(readFileSync(markaLogosu.yol)) &&
          bas.durum === 200 &&
          bas.govde.length === 0 &&
          ayni.durum === 304 &&
          ayni.govde.length === 0,
        `GET ${logo.durum} ${logo.basliklar["content-type"]} ${logo.basliklar["x-content-type-options"]} ${logo.govde.length} bayt; HEAD ${bas.durum} ${bas.govde.length} bayt; tekrar ${ayni.durum} ${ayni.govde.length} bayt`,
      );
    }
  }
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

  // Dosya deposu (kart 0072, karar 0058): kutu kendi kullanıcısıyla çalışır, kendi klasörüne
  // yazabilir; klasör yalnız ona açıktır. Ötekinin klasörü yanlışlıkla bağlansa bile okuyamaz ve
  // yazamaz: bu, ötekinin birimi bu sitenin kullanıcısıyla açılan geçici bir kutuda ölçülür.
  for (const kutu of [kutuAdi(kodAdi), arkaPlanKutuAdi(kutuAdi(kodAdi))]) {
    const kendiKlasoru = spawnSync(
      "docker",
      [
        ...["exec", kutu, "sh", "-c"],
        `id -u; printenv ${dosyaKlasoruDegiskeni}; stat -c '%a %u' "$${dosyaKlasoruDegiskeni}"; f="$${dosyaKlasoruDegiskeni}/.yoklama-$$$$"; echo x > "$f" && rm "$f" && echo yazildi`,
      ],
      { encoding: "utf8" },
    )
      .stdout.trim()
      .split("\n");
    const [kullanici, klasor, izin, yazildi] = kendiKlasoru;
    olc(
      `${kutu}: kendi dosya klasörüne yazıyor, klasör yalnız kendi kullanıcısına açık`,
      klasor === kutudakiDosyaKlasoru &&
        kullanici !== "0" &&
        kullanici !== "1000" &&
        izin === `700 ${kullanici}` &&
        yazildi === "yazildi",
      kendiKlasoru.join(", "),
    );
  }
  const kullanici = spawnSync("docker", ["exec", kutuAdi(kodAdi), "id", "-u"], {
    encoding: "utf8",
  }).stdout.trim();
  const goruntu = spawnSync(
    "docker",
    ["inspect", "--format", "{{.Config.Image}}", kutuAdi(kodAdi)],
    { encoding: "utf8" },
  ).stdout.trim();
  const otekininKlasoru = spawnSync(
    "docker",
    [
      ...["run", "--rm", "--network", "none", "--user", `${kullanici}:${kullanici}`],
      ...["--entrypoint", "sh", "-v", `${dosyaBirimi(oteki.kimlik.kodAdi)}:/oteki`, goruntu],
      ...["-c", 'ls /oteki 2>&1; echo "okuma=$?"; echo x > /oteki/sizinti 2>&1; echo "yazma=$?"'],
    ],
    { encoding: "utf8" },
  ).stdout.trim();
  olc(
    `${kodAdi}: ötekinin dosya klasörü bağlansa bile okuyamıyor ve yazamıyor`,
    /okuma=[1-9]/.test(otekininKlasoru) &&
      /yazma=[1-9]/.test(otekininKlasoru) &&
      /Permission denied/.test(otekininKlasoru),
    otekininKlasoru.replaceAll("\n", " | "),
  );

  // Kuyruk, süreç açılış kurulumunu bitirmeden iş almaz (kart 0309). Örnek Mağaza'nın kurulumu (katalog,
  // görseller, blog, sayfalar) hattın makinesinde aşağıdaki denemenin 60 saniyelik penceresini dolduruyordu:
  // önce sürecin kuyruğu başlattığını söyleyen günlük satırı beklenir. Satırı taşımayan eski görüntüde beklenmez.
  if (surumEnAz(cekirdekSurumu, kuyrukBasladiIlkSurum)) {
    const baslangic = Date.now();
    let basladi = false;
    while (Date.now() - baslangic < kuyrukBaslamaSiniriMs) {
      const gunlukler = spawnSync("docker", ["logs", arkaPlanKutuAdi(kutuAdi(kodAdi))], {
        encoding: "utf8",
      });
      if (`${gunlukler.stdout}${gunlukler.stderr}`.includes(`"mesaj":"${kuyrukBasladiMesaji}"`)) {
        basladi = true;
        break;
      }
      await new Promise((coz) => setTimeout(coz, 1000));
    }
    olc(
      `${kodAdi}: arka plan süreci açılış kurulumunu bitirip kuyruğu başlattı`,
      basladi,
      `${Math.round((Date.now() - baslangic) / 1000)} sn`,
    );
  }

  // Arka plan kutusu kendi sitesinin kuyruğunu işliyor (kart 0031, karar 0049). E-posta yerel posta
  // kutusuna düşüyor (kart 0032, karar 0050); gönderen adresi olmayan site göndermiyor.
  const alici = `${kodAdi}-${Date.now()}@ornek.test`;
  const deneme = spawnSync(
    "docker",
    [
      "exec",
      arkaPlanKutuAdi(kutuAdi(kodAdi)),
      "node",
      arkaPlanDosyalari.deneme,
      "yerelortamdenemesi",
      alici,
    ],
    { encoding: "utf8" },
  ).stdout;
  // Ayrıntıda denemenin önündeki iş sayısı ve, işler sonuçlanmadıysa, kuyruğun o anki hâli de vardır;
  // ölçüm kalırsa kutunun günlüğünün sonu da yazılır: düşüşün sebebi hattın sonucundan okunur (kart 0328).
  const kuyrukGecti = deneme.includes("basarili=bitti 1") && deneme.includes("hatali=hata 2");
  olc(
    `${kodAdi}: arka plan kutusu örnek işi çalıştırıyor, hatalı işi yeniden deneyip bırakıyor`,
    kuyrukGecti,
    deneme.trim().replaceAll("\n", ", "),
  );
  if (!kuyrukGecti) {
    const gunlukler = spawnSync(
      "docker",
      ["logs", "--tail", String(kuyrukGunluguSatiri), arkaPlanKutuAdi(kutuAdi(kodAdi))],
      { encoding: "utf8" },
    );
    console.log(`        ${arkaPlanKutuAdi(kutuAdi(kodAdi))} günlüğünün sonu:`);
    for (const satir of `${gunlukler.stdout}${gunlukler.stderr}`.trim().split("\n")) {
      console.log(`        ${satir.slice(0, kuyrukGunluguGenisligi)}`);
    }
  }
  // Bulunması beklenen e-posta beklenir; yokluğu ölçen yol tek arama yapar. Kutunun hata cevabı ikisinde de
  // "e-posta yok" sayılmaz, ayrıntıya yazılır (kart 0323).
  const gonderenAdresi = siteKlasorunuOku(site.klasor).ayarlar.epostaGonderenAdresi;
  if (gonderenAdresi) {
    const { iletiler, sonHata } = await postaKutusunuBekle(postaKutusuAdresi(), alici);
    olc(
      `${kodAdi}: e-posta yerel posta kutusuna düştü, gönderen sitenin adresi`,
      deneme.includes("eposta=gonderildi") &&
        iletiler.length === 1 &&
        iletiler[0]?.From?.Address === gonderenAdresi,
      `${iletiler.length} e-posta${sonHata === undefined ? "" : `; posta kutusu: ${sonHata}`}`,
    );
  } else {
    const cevap = await postaKutusunuSor(postaKutusuAdresi(), alici);
    olc(
      `${kodAdi}: gönderen adresi olmayan site e-posta göndermiyor`,
      deneme.includes("eposta=gonderilmedi") && "iletiler" in cevap && cevap.iletiler.length === 0,
      "iletiler" in cevap ? `${cevap.iletiler.length} e-posta` : `posta kutusu: ${cevap.hata}`,
    );
  }
};

// Görüntüdeki yönetici parçası (kart 0048, karar 0054): sunucudaki gibi kutunun kendi ortamında çalışır.
const yoneticiOlc = async (kodAdi: string, otekiKodAdi: string): Promise<void> => {
  const eposta = `yerel-${Date.now()}@ornek.test`;
  const parca = (kod: string) =>
    spawnSync(
      "docker",
      ["exec", kutuAdi(kodAdi), "node", "yonetici/yonetici.mjs", kod, "ac", eposta],
      { encoding: "utf8" },
    );
  const baska = parca(otekiKodAdi);
  olc(
    `${kodAdi}: görüntüdeki parça başka sitenin adıyla yönetici açmıyor`,
    baska.status === 1 && baska.stderr.includes("hiçbir şey yapılmadı"),
  );
  const sifre = /^sifre (\S+)$/m.exec(parca(kodAdi).stdout)?.[1] ?? "";
  const giris = await gonder(kodAdi, "/kapi/herkese-acik/yonetici-giris", { eposta, sifre });
  olc(
    `${kodAdi}: görüntüdeki parçanın açtığı yönetici şifreyle geçiyor`,
    giris.durum === 200,
    `${giris.durum}`,
  );
};

// Çerez başlıklarından "ad=değer" çiftleri.
const cerezler = (basliklar: Record<string, string | string[] | undefined>): string[] =>
  [basliklar["set-cookie"] ?? []].flat().map((satir) => satir.split(";")[0] ?? "");

// Logo yükleme (kart 0094, karar 0165): görüntüdeki sharp kutunun içinde 40 milyon piksellik görseli yeniden
// kodlar, kutunun bellek zirvesi sınırın altında kalır; logo ucu yeni logoyu verir, kaldırınca ilk logoya döner;
// dosya sınırını aşan gövde reddedilir. Site ve arka plan kutusunun gerçek bellek sınırı tanımla
// aynıdır. Yönetici iki aşamalı girişi kurulum sayfasındaki anahtarla, kapıdan bitirir.
const logoOlc = async (kodAdi: string): Promise<void> => {
  const kutu = kutuAdi(kodAdi);
  for (const ad of [kutu, arkaPlanKutuAdi(kutu)]) {
    const sinir = spawnSync("docker", ["inspect", "--format", "{{.HostConfig.Memory}}", ad], {
      encoding: "utf8",
    }).stdout.trim();
    olc(
      `${ad}: bellek sınırı ${siteKutusuBellegi}`,
      sinir === String(bellekBaytlari(siteKutusuBellegi)),
      sinir,
    );
  }

  const eposta = `logo-${Date.now()}@ornek.test`;
  const acilis = spawnSync(
    "docker",
    ["exec", kutu, "node", "yonetici/yonetici.mjs", kodAdi, "ac", eposta],
    { encoding: "utf8" },
  );
  const sifre = /^sifre (\S+)$/m.exec(acilis.stdout)?.[1] ?? "";
  const json = (govde: unknown) => ({
    govde: Buffer.from(JSON.stringify(govde)),
    basliklar: { "content-type": "application/json" },
  });
  const giris = await isteHam(kodAdi, "/kapi/herkese-acik/yonetici-giris", {
    yontem: "POST",
    ...json({ eposta, sifre }),
  });
  const araAdim = cerezler(giris.basliklar).join("; ");
  const kurulum = await isteHam(kodAdi, "/yonetim/giris/kurulum", {
    basliklar: { cookie: araAdim },
  });
  const anahtarMetni = metinOkuyucu("tr")("yonetim.kurulum.metinAnahtar");
  const gizli =
    new RegExp(`${anahtarMetni}[\\s\\S]*?<p[^>]*>([A-Z2-7 ]{16,})</p>`)
      .exec(kurulum.govde.toString("utf8"))?.[1]
      ?.trim() ?? "";
  const onay = await isteHam(kodAdi, "/kapi/herkese-acik/yonetici-kurulum-onay", {
    yontem: "POST",
    govde: Buffer.from(JSON.stringify({ kod: zamanliKod(gizli, kodAdimi()) })),
    basliklar: { "content-type": "application/json", cookie: araAdim },
  });
  const oturum = cerezler(onay.basliklar).join("; ");
  olc(
    `${kodAdi}: yönetici iki aşamalı girişi kapıdan bitiriyor`,
    giris.durum === 200 && gizli !== "" && onay.durum === 200,
    `giriş ${giris.durum}, anahtar ${gizli === "" ? "yok" : "var"}, onay ${onay.durum}`,
  );

  const logoYolu = "/kapi/herkese-acik/logo";
  const ilk = await isteHam(kodAdi, logoYolu);
  // 8000 x 5000: dosya sınırının piksel sınırına eşit görsel; çözülmesi tam bellek ister.
  const buyuk = await sharp({
    create: { width: 8000, height: 5000, channels: 3, background: { r: 200, g: 30, b: 60 } },
  })
    .png()
    .toBuffer();
  const yukleme = await isteHam(kodAdi, "/kapi/yonetici/logo-yukle", {
    yontem: "POST",
    govde: buyuk,
    basliklar: { "content-type": "application/octet-stream", cookie: oturum },
    sure: 60_000,
  });
  const zirve = spawnSync("docker", ["exec", kutu, "cat", "/sys/fs/cgroup/memory.peak"], {
    encoding: "utf8",
  }).stdout.trim();
  const yeni = await isteHam(kodAdi, logoYolu);
  olc(
    `${kodAdi}: kutudaki sharp 40 milyon piksellik logoyu yeniden kodluyor, logo ucu yenisini veriyor`,
    yukleme.durum === 200 &&
      yeni.durum === 200 &&
      yeni.basliklar["etag"] !== ilk.basliklar["etag"] &&
      (await sharp(yeni.govde).metadata()).width === 8000,
    `yükleme ${yukleme.durum} ${yukleme.govde.toString("utf8").slice(0, 200)}; logo ${yeni.durum}`,
  );
  // Sınır aşılsa süreç dururdu (yükleme 200 almazdı); bu ölçüm payı ölçer: iki büyük yükleme aynı anda sığar
  // (karar 0165). Zirve kutunun açılışından beri en yüksek değerdir.
  olc(
    `${kodAdi}: kutunun bellek zirvesi sınırın yarısının altında`,
    Number(zirve) > 0 && Number(zirve) < bellekBaytlari(siteKutusuBellegi) / 2,
    `zirve ${Math.round(Number(zirve) / 1024 / 1024)} MB`,
  );
  const fazla = await isteHam(kodAdi, "/kapi/yonetici/logo-yukle", {
    yontem: "POST",
    govde: Buffer.alloc(dosyaSinirlari.enCokBayt + 1),
    basliklar: { "content-type": "application/octet-stream", cookie: oturum },
    sure: 60_000,
  }).catch((hata: unknown) => ({ durum: 0, govde: Buffer.from(String(hata)) }));
  olc(
    `${kodAdi}: dosya sınırını aşan gövde reddediliyor`,
    fazla.durum === 400 && fazla.govde.toString("utf8").includes("cok-buyuk"),
    `${fazla.durum} ${fazla.govde.toString("utf8").slice(0, 120)}`,
  );
  const kaldir = await isteHam(kodAdi, "/kapi/yonetici/logo-kaldir", {
    yontem: "POST",
    govde: Buffer.from("{}"),
    basliklar: { "content-type": "application/json", cookie: oturum },
  });
  const sonra = await isteHam(kodAdi, logoYolu);
  olc(
    `${kodAdi}: logo kaldırılınca ilk logo dönüyor`,
    kaldir.durum === 200 && sonra.basliklar["etag"] === ilk.basliklar["etag"],
    `${kaldir.durum}`,
  );
};

// Kapıdan gerçek kayıt: robot sorusu, hesap, kuyruk, arka plan kutusu, posta kutusu (kart 0033, karar 0051).
const kayitOlc = async (kodAdi: string): Promise<void> => {
  const soru = JSON.parse((await iste(kodAdi, "/kapi/herkese-acik/robot-sorusu")).govde).veri;
  const eposta = `kayit-${Date.now()}@ornek.test`;
  const kayit = await gonder(kodAdi, "/kapi/herkese-acik/musteri-kayit", {
    eposta,
    sifre: "yerel-ortam-kayit-sifresi",
    uyelikOnayi: true,
    kvkkOnayi: true,
    pazarlamaIzni: false,
    robotCevabi: await soruyuCoz(soru),
  });
  olc(
    `${kodAdi}: robot sorusunu çözen müşteri kayıt oluyor`,
    kayit.durum === 200,
    `${kayit.durum}`,
  );
  const uydurma = await gonder(kodAdi, "/kapi/herkese-acik/musteri-kayit", {
    eposta: `uydurma-${eposta}`,
    sifre: "yerel-ortam-kayit-sifresi",
    uyelikOnayi: true,
    kvkkOnayi: true,
    pazarlamaIzni: false,
    robotCevabi: "uydurma",
  });
  olc(
    `${kodAdi}: robot cevabı uydurulan kayıt açılmıyor`,
    uydurma.durum === 403,
    `${uydurma.durum}`,
  );
  const { iletiler, sonHata } = await postaKutusunuBekle(postaKutusuAdresi(), eposta);
  const konular = iletiler.map(({ Subject }) => Subject ?? "");
  // Konudaki ad mağaza sahibinin ayarıdır (kart 0071).
  const { baslangic } = siteKlasorunuOku(join(kok, "siteler", kodAdi));
  olc(
    `${kodAdi}: hoş geldin e-postası yerel posta kutusuna ulaşıyor`,
    konular.length === 1 && konular[0]?.includes(baslangic.magazaAdi ?? "") === true,
    konular.join(", ") || `e-posta yok${sonHata === undefined ? "" : `; posta kutusu: ${sonHata}`}`,
  );
  await sifirlamaOlc(kodAdi, eposta);
};

// Kapıdan gerçek şifre sıfırlama (kart 0034, karar 0052): e-posta arka plan kutusundan gelir, bağlantı sitenin
// adresindedir, anahtar yeni şifreyi kurar.
const sifirlamaOlc = async (kodAdi: string, eposta: string): Promise<void> => {
  const soru = JSON.parse((await iste(kodAdi, "/kapi/herkese-acik/robot-sorusu")).govde).veri;
  const istek = await gonder(kodAdi, "/kapi/herkese-acik/musteri-sifre-sifirlama", {
    eposta,
    robotCevabi: await soruyuCoz(soru),
  });
  olc(`${kodAdi}: şifre sıfırlama isteği geçiyor`, istek.durum === 200, `${istek.durum}`);
  let baglanti: URL | undefined;
  const { sonHata } = await postaKutusunuBekle(postaKutusuAdresi(), eposta, {
    tamam: async (iletiler) => {
      for (const { ID } of iletiler) {
        const { Text } = (await (
          await fetch(`${postaKutusuAdresi()}/api/v1/message/${ID}`)
        ).json()) as { Text: string };
        const bulunan = /https?:\/\/\S+#anahtar=\S+/.exec(Text)?.[0];
        if (bulunan !== undefined) baglanti = new URL(bulunan);
      }
      return baglanti !== undefined;
    },
  });
  olc(
    `${kodAdi}: sıfırlama e-postası ulaşıyor, bağlantı sitenin adresinde`,
    baglanti?.hostname === `${kodAdi}.localhost`,
    baglanti?.host ?? `bağlantı yok${sonHata === undefined ? "" : `; posta kutusu: ${sonHata}`}`,
  );
  const anahtar = new URLSearchParams(baglanti?.hash.slice(1)).get("anahtar") ?? "";
  const sifre = "yerel-ortam-yeni-sifre";
  const yenile = await gonder(kodAdi, "/kapi/herkese-acik/musteri-sifre-yenile", {
    anahtar,
    sifre,
  });
  const giris = await gonder(kodAdi, "/kapi/herkese-acik/musteri-giris", { eposta, sifre });
  olc(
    `${kodAdi}: bağlantıdaki anahtar yeni şifreyi kuruyor, yeni şifreyle giriliyor`,
    yenile.durum === 200 && giris.durum === 200,
    `${yenile.durum} ${giris.durum}`,
  );
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
    kutular.length === siteSayisi * 2 + 3,
    `${kutular.length} kutu, beklenen ${siteSayisi * 2 + 3}`,
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

// Katalog canlı ve ortamı bilinmeyen kutuda kapalıdır (kart 0104, karar 0078). Aynı görüntü, sitenin
// kutusunun içinde ikinci bir süreç olarak başka ortamla ve her ölçümde başka bir portta açılır; kutunun
// kendi ortamı değişmez. Port açılmadan önce boş olmalıdır (yanıt veren süreç ölçülen süreçtir), süreç
// ölçümden sonra kapatılır ve portun kapandığı da ölçülür. Next.js süreç adını değiştirdiği için süreç
// adıyla değil, yalnız ona verilen bir ortam değişkeniyle bulunur (/proc/<no>/environ). 404 yetmez: gövdede katalogun
// içeriği de aranır (Next.js düzende notFound() verilince sayfayı yine çiziyordu). RSC isteği, ön yükleme,
// HEAD ve adresin başka yazılışları da denenir. Vitrin aynı süreçte açılmalıdır: 404'ün nedeni katalogun
// kapalı olmasıdır, sürecin çalışmaması değil.
const katalogKapaliOlc = async (kodAdi: string) => {
  const kutu = kutuAdi(kodAdi);
  const dil = metinOkuyucu("tr");
  const izler = [dil("gelistirme.katalog.baslik"), dil("gelistirme.katalog.kullanildigiYerler")];
  const istekler: { yol: string; yontem?: string; basliklar?: Record<string, string> }[] = [
    { yol: katalogAdresi },
    { yol: `${katalogAdresi}/dugme` },
    { yol: katalogAdresi, basliklar: { RSC: "1" } },
    { yol: `${katalogAdresi}/dugme`, basliklar: { RSC: "1", "Next-Router-Prefetch": "1" } },
    { yol: `${katalogAdresi}/dugme?_rsc=olcum` },
    { yol: katalogAdresi, yontem: "HEAD" },
    { yol: `${katalogAdresi}/` },
    { yol: "/%67elistirme/bilesenler" },
    { yol: "/gelistirme%2Fbilesenler", basliklar: { RSC: "1" } },
    { yol: "/gelistirme/%62ilesenler/dugme" },
    { yol: "/gelistirme//bilesenler" },
  ];
  // Bunlar ara katmanın katalog kapısından geçmelidir: başka bir sonuç (ör. panel yönlendirmesi) kapının
  // atlandığını gösterir. Öteki yazılışlarda Next.js'in kendi yönlendirmesi kabul edilir, içerik gitmemelidir.
  const kesin404 = [
    katalogAdresi,
    `${katalogAdresi}/dugme`,
    "/%67elistirme/bilesenler",
    "/gelistirme%2Fbilesenler",
  ];
  for (const [ad, ortam, onunde, port] of [
    // docker exec değişkeni silemez: değişkensiz süreç kutunun içinde env -u ile açılır.
    ["canlı ortamda", ["-e", `${siteOrtamiDegiskeni}=canli`], [], 3998],
    ["ortamı bilinmeyen kutuda", [], ["env", "-u", siteOrtamiDegiskeni], 3999],
  ] as const) {
    const isaret = `KATALOG_OLCUMU=${port}`;
    const betik = (istenen: string) =>
      spawnSync("docker", ["exec", kutu, "node", "-e", istenen], { encoding: "utf8" }).stdout;
    const portAcik = () =>
      betik(
        `fetch("http://127.0.0.1:${port}/").then(() => process.stdout.write("acik"), () => process.stdout.write("kapali"))`,
      ) === "acik";
    const once = portAcik();
    spawnSync(
      "docker",
      [
        ...["exec", "-d", ...ortam, "-e", isaret, "-e", `PORT=${port}`, "-e", "HOSTNAME=127.0.0.1"],
        ...[kutu, ...onunde, "node", "cekirdek/uygulama/server.js"],
      ],
      { stdio: "ignore" },
    );
    const cikti = betik(`const bekle = (ms) => new Promise((c) => setTimeout(c, ms));
const istekler = ${JSON.stringify(istekler)};
const izler = ${JSON.stringify(izler)};
(async () => {
  for (let i = 0; i < 120; i++) {
    try {
      const vitrin = (await fetch("http://127.0.0.1:${port}/")).status;
      const sonuclar = [];
      for (const { yol, yontem = "GET", basliklar = {} } of istekler) {
        const yanit = await fetch("http://127.0.0.1:${port}" + yol, { method: yontem, headers: basliklar, redirect: "manual" });
        const govde = await yanit.text();
        sonuclar.push({ yol, yontem, basliklar, durum: yanit.status, iz: izler.some((iz) => govde.includes(iz)) });
      }
      process.stdout.write(JSON.stringify({ vitrin, sonuclar }));
      return;
    } catch {
      await bekle(500);
    }
  }
})();`);
    betik(`const { readdirSync, readFileSync } = require("node:fs");
for (const no of readdirSync("/proc").filter((ad) => /^[0-9]+$/.test(ad))) {
  try {
    if (readFileSync("/proc/" + no + "/environ", "utf8").split("\\0").includes(${JSON.stringify(isaret)})) process.kill(Number(no));
  } catch {}
}`);
    let sonra = true;
    for (let i = 0; i < 20 && sonra; i++) {
      sonra = portAcik();
      if (sonra) await new Promise((coz) => setTimeout(coz, 250));
    }
    const sonuc = JSON.parse(cikti || "{}") as {
      vitrin?: number;
      sonuclar?: { yol: string; yontem: string; durum: number; iz: boolean }[];
    };
    const sizanlar = (sonuc.sonuclar ?? []).filter(
      ({ yol, durum, iz }) => iz || durum === 200 || (kesin404.includes(yol) && durum !== 404),
    );
    olc(
      `${kodAdi}: bileşen kataloğu ${ad} hiçbir istekte açılmıyor, içeriği gitmiyor, vitrin açılıyor`,
      !once &&
        !sonra &&
        sonuc.vitrin === 200 &&
        sonuc.sonuclar?.length === istekler.length &&
        sizanlar.length === 0,
      JSON.stringify({ portOnceAcik: once, portSonraAcik: sonra, vitrin: sonuc.vitrin, sizanlar }),
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
    await katalogKapaliOlc(denemeSitesi.kimlik.kodAdi);
    // Giriş ucunun sınırı aşağıda doldurulur, bu ölçüm ondan önce gelir.
    await yoneticiOlc(denemeSitesi.kimlik.kodAdi, ornek.kimlik.kodAdi);
    await logoOlc(denemeSitesi.kimlik.kodAdi);

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

    // Sınır doluyken aynı ucun başka yazılışları da geçmez: aynı sayaca düşer ya da uca ulaşmaz.
    for (const yol of [
      "/kapi/herkese-acik/sa%67lik",
      "/k%61pi/herkese-acik/saglik",
      "/kapi/herkese-acik%2fsaglik",
      "/kapi/herkese-acik/saglik%2f",
      "/kapi/herkese-acik/SAGLIK",
      "/kapi/herkese-acik/./saglik",
    ]) {
      const { durum } = await iste(denemeSitesi.kimlik.kodAdi, yol);
      olc(`${yol} yazılışı istek sınırını aşamıyor`, [308, 404, 429].includes(durum), `${durum}`);
    }

    // Panel kapısı (karar 0042): girişsiz panel görünmez; adresi başka yazmak ya da ara katmanı
    // atlatmaya çalışan başlık sayfayı açmaz.
    const panelSitesi = denemeSitesi.kimlik.kodAdi;
    const panelBasligi = metinOkuyucu("tr")("yonetim.sayfa.karsilama.ad");
    const girissiz = await iste(panelSitesi, "/yonetim");
    olc(
      "girişsiz panel giriş sayfasına yönleniyor, adres ön kapının arkasında da doğru",
      girissiz.durum === 307 && girissiz.konum === "/yonetim/giris",
      `${girissiz.durum} ${girissiz.konum}`,
    );
    const panelYazilislari: [string, Record<string, string>][] = [
      ["/%79onetim", {}],
      ["/yonetim%2f", {}],
      ["/YONETIM", {}],
      ["//yonetim", {}],
      ["/./yonetim", {}],
      ["/yonetim/", {}],
      ["/yonetim/giris/kurulum", {}],
      ["/yonetim/giris/kod", {}],
      [
        "/yonetim",
        { "x-middleware-subrequest": "src/proxy:src/proxy:src/proxy:src/proxy:src/proxy" },
      ],
      ["/yonetim", { "x-nextjs-data": "1" }],
      ["/yonetim?_rsc=1", { rsc: "1" }],
    ];
    for (const [yol, basliklar] of panelYazilislari) {
      const { durum, govde } = await iste(panelSitesi, yol, basliklar);
      const adi = `${yol} ${Object.keys(basliklar).join(",")}`.trim();
      olc(
        `${adi} girişsiz paneli açmıyor`,
        [307, 308, 404].includes(durum) && !govde.includes(panelBasligi),
        `${durum}`,
      );
    }

    // Giriş ucunun istek sınırı POST ile (karar 0041, 0042): bütün yazılışlar aynı sayaca düşer ya
    // da uca ulaşmaz.
    let girisSiniriDoldu = false;
    const girisYolu = "/kapi/herkese-acik/yonetici-giris";
    for (let sira = 0; sira <= istekSinirlari.siki.istek && !girisSiniriDoldu; sira++) {
      const { durum } = await gonder(panelSitesi, girisYolu, {
        eposta: `yok${sira}@ornek.test`,
        sifre: "yanlis-bir-sifre",
      });
      girisSiniriDoldu = durum === 429;
    }
    olc("giriş ucunun istek sınırı POST ile doluyor", girisSiniriDoldu);
    for (const yol of [
      "/kapi/herkese-acik/yonetici-g%69ris",
      "/k%61pi/herkese-acik/yonetici-giris",
      "/kapi/herkese-acik%2fyonetici-giris",
      "/kapi/herkese-acik/YONETICI-GIRIS",
      "/kapi/herkese-acik/./yonetici-giris",
    ]) {
      const { durum } = await gonder(panelSitesi, yol, {
        eposta: "yok@ornek.test",
        sifre: "yanlis-bir-sifre",
      });
      olc(`POST ${yol} giriş sınırını aşamıyor`, [308, 404, 429].includes(durum), `${durum}`);
    }
    await kayitOlc(ornek.kimlik.kodAdi);
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
