// Yayın komutunun denemesi (kart 0021, karar 0035). Çalıştırma: pnpm yayin-denemesi
//
// İki geçici deneme sitesi (yayin-deneme-a, yayin-deneme-b) sunucuya yayın komutunun kendi
// işlevleriyle yayınlanır. Kilitler gerçek yayındakiyle aynıdır: kontrol hattı bu kayıt için
// yeşil olmalı. Ölçülenler:
// - Yayın: deneme adresi şifreli açılıyor, sağlık ucu kimlikteki sürümü söylüyor, vitrin sitenin adını.
// - İki sitenin kutusu birbirine ulaşamıyor (adla da, adresle de).
// - Bilerek bozulmuş bir görüntüyle yayın başarısız oluyor; site eski yayınıyla açık kalıyor.
// - İkinci bir yayından (başka bir adla) sonra geri dönüş siteyi önceki yayına döndürüyor.
// - Yayın kaydında bütün çalıştırmalar sırasıyla görünüyor.
// - Gizli bilgi yenilenince yayındaki kutu yeni değerle yeniden başlıyor; kesinti ölçülür.
// Sonunda deneme sitelerinin kutuları, yayınları, ön kapı satırları, veritabanları, gizli
// bilgileri ve ağları silinir.

import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Site, siteKlasorunuDogrula } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { cekirdekSurumu } from "../cekirdek/surum.ts";
import { siteVeritabaniAdi } from "../cekirdek/veritabani/baglanti.ts";
import {
  denemeSiteNumarasi,
  ikinciDenemeSiteNumarasi,
  type Ortam,
  silmeBetigi,
  uretmeBetigi,
} from "./gizli-bilgi.mts";
import {
  onKapiyiKur,
  siteAgiAdi,
  siteKutusuAdi,
  yayindakiSiteleriOku,
  yayinOrtami,
} from "./on-kapi.mts";
import { onKapiyiOlc } from "./on-kapi-olcumleri.mts";
import { kok, sshKomutu, kayitlariOku as sunuculariOku } from "./sunucu.mts";
import { sifreyiEsitle, veritabaniKutusu, veritabaniKutusunuKur } from "./sunucu-veritabani.mts";
import {
  disaridanIste,
  etkinKutuyuYenidenBaslat,
  geriDon,
  kayitlariOku,
  saglikCoz,
  saglikHatasi,
  yayinKlasoru,
  yayinla,
} from "./yayin.mts";
import { yayinGoruntusunuHazirla, yayinKilitleri } from "./yayin-hazirligi.mts";

const ortam: Ortam = yayinOrtami;
const a = { kodAdi: "yayin-deneme-a", numara: denemeSiteNumarasi };
const b = { kodAdi: "yayin-deneme-b", numara: ikinciDenemeSiteNumarasi };
const klasorKoku = join(kok, "sunucu", "olusan", "yayin-denemesi");
const bozukEtiket = `altyapi-cekirdek-bozuk:${cekirdekSurumu}`;

// Ctrl-C: o anki ssh adımı yarıda kalır; deneme sonraki adıma geçmez, temizlik yine çalışır.
let kesildi = false;
for (const sinyal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.on(sinyal, () => {
    kesildi = true;
  });
}
const sunucuda = (ipv4: string, betik: string) => {
  const sonuc = sshKomutu(ipv4, "bash -s", { girdi: betik, sure: 300_000 });
  if (sonuc.signal || sonuc.status === 255) kesildi = true;
  return { durum: sonuc.status ?? 1, cikti: sonuc.stdout, hata: sonuc.stderr };
};

const sonuclar: { ad: string; gecti: boolean }[] = [];
const olc = (ad: string, gecti: boolean, ayrinti = "") => {
  if (kesildi) throw new Error("Deneme kesildi.");
  sonuclar.push({ ad, gecti });
  console.log(`${gecti ? "tamam " : "HATA  "} ${ad}${ayrinti ? `  (${ayrinti})` : ""}`);
};

// Deneme sitesinin klasörü bilgisayarda üretilir ve şemadan geçer.
const siteKlasoru = (kodAdi: string, gorunenAd: string): { klasor: string; site: Site } => {
  const klasor = join(klasorKoku, kodAdi);
  rmSync(klasor, { recursive: true, force: true });
  mkdirSync(klasor, { recursive: true });
  const kimlik = {
    kodAdi,
    gorunenAd,
    tur: "demo",
    adresler: {},
    cekirdekSurumu,
    teslimDurumu: { magazaSahibiHesabi: "gerekmez", yurtDisiAktarimBelgeleri: "gerekmez" },
  };
  writeFileSync(join(klasor, "kimlik.json"), `${JSON.stringify(kimlik, null, 2)}\n`);
  writeFileSync(join(klasor, "ayarlar.json"), "{}\n");
  const sonuc = siteKlasorunuDogrula(klasor);
  if (!sonuc.gecerli) throw new Error(`Deneme sitesi geçersiz: ${sonuc.hatalar.join("; ")}`);
  return { klasor, site: sonuc.site };
};

const baslik = (govde: string): string => govde.match(/<h1>([^<]*)<\/h1>/)?.[1] ?? "";

const vitrin = async (ipv4: string, kodAdi: string) => {
  const yanit = await disaridanIste(ipv4, kodAdi, "/");
  return { durum: yanit.durum, ad: baslik(yanit.govde) };
};

const saglik = async (ipv4: string, kodAdi: string) => {
  const yanit = await disaridanIste(ipv4, kodAdi, "/kapi/herkese-acik/saglik");
  return yanit.durum === 200
    ? saglikHatasi(saglikCoz(yanit.govde), cekirdekSurumu)
    : `${yanit.durum}`;
};

// A'nın kutusundan B'nin kutusuna adla ve adresle istek; ikisi de ulaşamamalı.
const ulasabilirMi = (ipv4: string, kaynak: string, hedef: string) => {
  const istek = (adres: string) =>
    `docker exec ${kaynak} node -e "fetch('http://${adres}:3000/kapi/herkese-acik/saglik',{signal:AbortSignal.timeout(5000)}).then((y)=>process.stdout.write('ulasti '+y.status),(h)=>process.stdout.write('ulasamadi '+(h.cause?.code||h.name)))"`;
  const { cikti } = sunucuda(
    ipv4,
    `set -u
ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' ${hedef} | cut -d" " -f1)
printf 'cozum=%s\\n' "$(docker exec ${kaynak} node -e "require('node:dns').lookup('${hedef}',(h,a)=>process.stdout.write(h?'cozulmedi '+h.code:'cozuldu '+a))")"
printf 'ad=%s\\n' "$(${istek(hedef)})"
printf 'adres=%s %s\\n' "$ip" "$(${istek("$ip")})"
`,
  );
  return {
    cozum: cikti.match(/^cozum=(.*)$/m)?.[1] ?? "",
    ad: cikti.match(/^ad=(.*)$/m)?.[1] ?? "",
    adres: cikti.match(/^adres=(.*)$/m)?.[1] ?? "",
  };
};

const bozukGoruntuUret = (iyi: string): void => {
  const sonuc = spawnSync("docker", ["build", "-q", "-t", bozukEtiket, "-"], {
    input: `FROM ${iyi}\nCMD ["node", "-e", "process.exit(1)"]\n`,
    encoding: "utf8",
  });
  if (sonuc.status !== 0) throw new Error(`Bozuk görüntü üretilemedi: ${sonuc.stderr.trim()}`);
};

const temizle = async (ipv4: string): Promise<void> => {
  const denemeler = [a, b].map((site) => site.kodAdi);
  try {
    const siteler = yayindakiSiteleriOku(ipv4);
    for (const kodAdi of denemeler) delete siteler[kodAdi];
    onKapiyiKur(ipv4, siteler);
  } catch (hata) {
    console.error(`temizlik: ön kapı: ${(hata as Error).message}`);
  }
  for (const kodAdi of denemeler) {
    const ad = siteVeritabaniAdi(kodAdi);
    const sonuc = sunucudaTemizle(ipv4, kodAdi, ad);
    if (sonuc.status !== 0) console.error(`temizlik: ${kodAdi}: ${sonuc.stderr.trim()}`);
  }
  try {
    veritabaniKutusunuKur(ipv4, ortam);
  } catch (hata) {
    console.error(`temizlik: veritabanı kutusu: ${(hata as Error).message}`);
  }
  sunucudaAglariSil(ipv4, denemeler);
  spawnSync("docker", ["image", "rm", bozukEtiket], { stdio: "ignore" });
  rmSync(klasorKoku, { recursive: true, force: true });
  console.log(`silindi     deneme siteleri ${denemeler.join(", ")}`);
};

const sunucudaTemizle = (ipv4: string, kodAdi: string, ad: string) =>
  sshKomutu(ipv4, "bash -s", {
    sure: 300_000,
    girdi: `set +e
for c in $(docker ps -aq --filter 'name=^${siteAgiAdi(ortam, kodAdi)}-[0-9]+$'); do docker rm -f "$c" >/dev/null; done
for g in $(docker images -q 'altyapi-yayin:${ortam}-${kodAdi}-*' | sort -u); do docker image rm -f "$g" >/dev/null 2>&1; done
sudo rm -rf ${yayinKlasoru(ortam, kodAdi)}
printf '%s\\n' 'DROP DATABASE IF EXISTS "${ad}" WITH (FORCE);' 'DROP ROLE IF EXISTS "${ad}";' | docker exec -i ${veritabaniKutusu(ortam)} psql -U postgres -d postgres -q >/dev/null
${silmeBetigi(ortam, kodAdi).replace("set -eu", "true")}
`,
  });

// sunucu-gizli --yenile ile aynı adımlar: değeri yenile, veritabanı şifresini eşitle, kutuyu başlat.
// Kesinti kutunun yeniden başlatılmasıyla başlar; dönen değer o anın zamanıdır (başarısızsa -1).
const gizliBilgiyiYenile = (ip: string): number => {
  const { durum } = sunucuda(ip, uretmeBetigi(ortam, a.kodAdi, a.numara, { yenile: true }));
  if (durum !== 0 || !sifreyiEsitle(ip, ortam, a.kodAdi)) return -1;
  const baslangic = Date.now();
  return etkinKutuyuYenidenBaslat(ip, ortam, a.kodAdi) ? baslangic : -1;
};

const sunucudaAglariSil = (ipv4: string, kodAdlari: string[]) =>
  sshKomutu(
    ipv4,
    kodAdlari.map((k) => `docker network rm ${siteAgiAdi(ortam, k)} >/dev/null 2>&1`).join("; ") +
      "; true",
  );

const [sunucu] = sunuculariOku();
if (!sunucu) {
  console.error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");
  process.exit(1);
}
const { ipv4 } = sunucu;
let temizlikGerekli = false;
try {
  const kayit = yayinKilitleri();
  console.log(`kilitler    geçti (kayıt ${kayit.slice(0, 12)})`);
  const etiket = yayinGoruntusunuHazirla(cekirdekSurumu, kayit);
  bozukGoruntuUret(etiket);
  temizlikGerekli = true;
  const yayinGirdisi = (site: typeof a, gorunenAd: string, kullanilacak = etiket) => {
    const { klasor, site: okunan } = siteKlasoru(site.kodAdi, gorunenAd);
    return {
      ipv4,
      ortam,
      kimlik: okunan.kimlik,
      siteNumarasi: site.numara,
      klasor,
      etiket: kullanilacak,
      kayit,
    };
  };

  const ilk = await yayinla(yayinGirdisi(a, "Yayın Denemesi A1"));
  const ilkVitrin = await vitrin(ipv4, a.kodAdi);
  const ilkSaglik = await saglik(ipv4, a.kodAdi);
  olc(
    "yayın: deneme adresi şifreli açılıyor, sağlık ucu sürümü söylüyor",
    ilk.sonuc === "basarili" && !ilkSaglik && ilkVitrin.ad === "Yayın Denemesi A1",
    ilk.neden ?? ilkSaglik ?? `vitrin "${ilkVitrin.ad}"`,
  );
  const ikinciSite = await yayinla(yayinGirdisi(b, "Yayın Denemesi B1"));
  olc("ikinci deneme sitesi yayınlandı", ikinciSite.sonuc === "basarili", ikinciSite.neden ?? "");

  // Ön kapı iki sitenin ağına bağlıyken ön kapının bütün ölçümleri (sunucu denetimindekiyle aynı):
  // ziyaretçinin gerçek adresi IPv4 ve IPv6'da, sertifika, yönlendirme, kısıtlı kutu.
  const onKapiHatalari: string[] = [];
  await onKapiyiOlc(sunucu, (tamam, metin, ayrinti = "") => {
    if (!tamam) onKapiHatalari.push(`${metin}${ayrinti ? `: ${ayrinti}` : ""}`);
  });
  olc(
    "site ağlarına bağlı ön kapının ölçümleri geçiyor (ziyaretçinin gerçek adresi dahil)",
    onKapiHatalari.length === 0,
    onKapiHatalari.slice(0, 3).join("; "),
  );

  const kutuA = siteKutusuAdi(ortam, a.kodAdi, ilk.etkin);
  const kutuB = siteKutusuAdi(ortam, b.kodAdi, ikinciSite.etkin);
  for (const [kaynak, hedef] of [
    [kutuA, kutuB],
    [kutuB, kutuA],
  ] as const) {
    const sonuc = ulasabilirMi(ipv4, kaynak, hedef);
    olc(
      `${kaynak} ${hedef} kutusunun adını çözemiyor, adına da adresine de ulaşamıyor`,
      sonuc.cozum.startsWith("cozulmedi") &&
        sonuc.ad.startsWith("ulasamadi") &&
        /^\S+ ulasamadi/.test(sonuc.adres),
      `çözüm: ${sonuc.cozum}; ad: ${sonuc.ad}; adres: ${sonuc.adres}`,
    );
  }

  const bozuk = await yayinla(yayinGirdisi(a, "Yayın Denemesi A-bozuk", bozukEtiket));
  const bozuktanSonra = await vitrin(ipv4, a.kodAdi);
  olc(
    "bozuk sürüm yayınlanınca yayın başarısız, site eski yayınıyla açık",
    bozuk.sonuc === "basarisiz" &&
      bozuktanSonra.durum === 200 &&
      bozuktanSonra.ad === "Yayın Denemesi A1" &&
      !(await saglik(ipv4, a.kodAdi)),
    `${bozuk.neden ?? "başarılı oldu"}; vitrin "${bozuktanSonra.ad}"`,
  );

  const ikinci = await yayinla(yayinGirdisi(a, "Yayın Denemesi A2"));
  const ikinciVitrin = await vitrin(ipv4, a.kodAdi);
  olc(
    "ikinci yayın: vitrin yeni adı gösteriyor",
    ikinci.sonuc === "basarili" && ikinciVitrin.ad === "Yayın Denemesi A2",
    ikinci.neden ?? `vitrin "${ikinciVitrin.ad}"`,
  );

  const donus = await geriDon({ ipv4, ortam, kodAdi: a.kodAdi });
  const donusVitrin = await vitrin(ipv4, a.kodAdi);
  const donusSaglik = await saglik(ipv4, a.kodAdi);
  olc(
    "geri dönüş: site önceki yayına döndü",
    donus.sonuc === "basarili" &&
      donus.etkin === ilk.etkin &&
      donusVitrin.ad === "Yayın Denemesi A1" &&
      !donusSaglik,
    donus.neden ?? donusSaglik ?? `vitrin "${donusVitrin.ad}", etkin ${donus.etkin}`,
  );

  const kayitlar = kayitlariOku(ipv4, ortam, a.kodAdi);
  const ozet = kayitlar.map((k) => `${k.tur}:${k.sonuc}`).join(" ");
  olc(
    "yayın kaydında bütün çalıştırmalar sırasıyla görünüyor",
    ozet === "yayin:basarili yayin:basarisiz yayin:basarili geri-donus:basarili",
    ozet,
  );

  // Gizli bilgi yenileme: sunucu-gizli --yenile ile aynı adımlar; kesinti dışarıdan ölçülür.
  const baslangic = gizliBilgiyiYenile(ipv4);
  const yenileme = baslangic > 0;
  let kesinti = -1;
  if (yenileme) {
    for (let deneme = 0; deneme < 90; deneme++) {
      if (!(await saglik(ipv4, a.kodAdi))) {
        kesinti = Math.round((Date.now() - baslangic) / 1000);
        break;
      }
      await new Promise((bekle) => setTimeout(bekle, 1000));
    }
  }
  olc(
    "gizli bilgi yenilenince yayındaki kutu yeni şifreyle veritabanına bağlanıyor",
    yenileme && kesinti >= 0,
    yenileme
      ? `yeniden başlatmanın başından ${kesinti} sn sonra sağlık ucu dışarıdan yeniden ayakta`
      : "yenileme yapılamadı",
  );
} catch (hata) {
  sonuclar.push({ ad: "deneme çalıştı", gecti: false });
  console.log(`HATA   deneme çalıştı  (${(hata as Error).message})`);
} finally {
  if (temizlikGerekli) await temizle(ipv4);
}

const kalanlar = sonuclar.filter((sonuc) => !sonuc.gecti);
console.log(
  kalanlar.length === 0
    ? `Deneme yeşil: ${sonuclar.length} ölçüm geçti.`
    : `Deneme kırmızı: ${kalanlar.length} ölçüm kaldı.`,
);
process.exitCode = kalanlar.length === 0 ? 0 : 1;
