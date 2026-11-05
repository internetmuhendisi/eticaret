// Sunucudaki veritabanının denemesi (kart 0039, karar 0034). Çalıştırma: pnpm sunucu-veritabani-denemesi
//
// Örnek Mağaza'nın deneme veritabanı (yoksa açılır, deneme sonunda kalır) ile geçici bir deneme
// sitesinin veritabanı sunucuda yan yana kurulur. Ölçülenler:
// - İki sitenin veritabanı açılıyor, değişiklikleri uygulanıyor; ikinci çalışmada bir şey değişmiyor.
// - Her site kendi veritabanına bağlanıyor, ötekinin veritabanına giremiyor (iki yönde).
// - Deneme sitesinin gizli bilgisi yenilenince yeni şifreyle bağlanıyor, eski şifreyle bağlanamıyor;
//   Örnek Mağaza etkilenmiyor.
// Bağlantıları sitenin kutu kullanıcısıyla, sitenin ağında ve gizli bilgi dosyasıyla açılan geçici
// kutular dener; değerler ekrana basılmaz. Sonunda deneme sitesinin veritabanı, kullanıcısı,
// gizli bilgileri ve ağı silinir.

import { siteKlasorunuOku } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { gizliBilgiler } from "../cekirdek/kayitlar/gizli-bilgiler.ts";
import { siteVeritabaniAdi } from "../cekirdek/veritabani/baglanti.ts";
import {
  denemeSiteNumarasi,
  gizliKlasor,
  gizliKok,
  kutuKullanicisi,
  type Ortam,
  silmeBetigi,
  siteNumaralariniOku,
  uretmeBetigi,
} from "./gizli-bilgi.mts";
import { kayitlariOku, kok, sshKomutu } from "./sunucu.mts";
import {
  goruntuyuGonder,
  sifreyiEsitle,
  siteAgi,
  siteVeritabaniniHazirla,
  veritabaniKutusu,
  veritabaniKutusunuKur,
} from "./sunucu-veritabani.mts";

const ortam: Ortam = "deneme";
const ornek = siteKlasorunuOku(`${kok}/siteler/ornek-magaza`).kimlik;
const a = {
  kodAdi: ornek.kodAdi,
  numara: siteNumaralariniOku()[ornek.kodAdi] as number,
  surum: ornek.cekirdekSurumu,
};
// Deneme sitesinin numarası kayda yazılmaz; gerçek sitelere verilmeyen ayrılmış numarayı kullanır.
const b = { kodAdi: "vt-deneme", numara: denemeSiteNumarasi, surum: ornek.cekirdekSurumu };

const sonuclar: { ad: string; gecti: boolean }[] = [];
const olc = (ad: string, gecti: boolean, ayrinti = "") => {
  sonuclar.push({ ad, gecti });
  console.log(`${gecti ? "tamam " : "HATA  "} ${ad}${ayrinti ? `  (${ayrinti})` : ""}`);
};

const calistir = (ipv4: string, betik: string): { durum: number; cikti: string; hata: string } => {
  const sonuc = sshKomutu(ipv4, "bash -s", { girdi: betik, sure: 300_000 });
  return { durum: sonuc.status ?? 1, cikti: sonuc.stdout, hata: sonuc.stderr };
};

// Geçici kutuda çalışan bağlantı denemesi: gizli bilgi dosyasındaki adresle, istenirse başka bir
// veritabanına bağlanmayı dener. Adres yazdırılmaz; hata iletisi kısaltılır.
const yoklamaBetigi = `
const pg = require("/uygulama/node_modules/pg");
const fs = require("node:fs");
const adres = new URL(fs.readFileSync(process.env.VERITABANI_ADRESI_DOSYASI, "utf8").trim());
if (process.argv[1]) adres.pathname = "/" + process.argv[1];
const istemci = new pg.Client({ connectionString: adres.href, connectionTimeoutMillis: 5000 });
istemci.connect()
  .then(() => istemci.query("select current_database() as veritabani"))
  .then(({ rows }) => ({ baglandi: true, veritabani: rows[0].veritabani }))
  .catch((hata) => ({ baglandi: false, hata: String(hata.message).slice(0, 120) }))
  .then((sonuc) => { process.stdout.write(JSON.stringify(sonuc)); return istemci.end().catch(() => {}); });
`;

type Yoklama = { baglandi?: boolean; veritabani?: string; hata?: string };

const yokla = (
  ipv4: string,
  etiket: string,
  site: { kodAdi: string; numara: number },
  { dosya, hedef }: { dosya?: string; hedef?: string } = {},
): Yoklama => {
  const kullanici = kutuKullanicisi(ortam, site.numara);
  const kaynak =
    dosya ?? `${gizliKlasor(ortam, site.kodAdi)}/${gizliBilgiler.VERITABANI_ADRESI.dosya}`;
  const ic = "/run/secrets/veritabani_adresi";
  const betik = `set -eu
docker run --rm --network ${siteAgi(ortam, site.kodAdi)} --user ${kullanici}:${kullanici} --read-only --cap-drop ALL --security-opt no-new-privileges:true -v ${kaynak}:${ic}:ro -e VERITABANI_ADRESI_DOSYASI=${ic} ${etiket} node -e '${yoklamaBetigi.replaceAll("'", "'\\''")}' ${hedef ?? ""}
`;
  const { cikti } = calistir(ipv4, betik);
  try {
    return JSON.parse(cikti) as Yoklama;
  } catch {
    return { baglandi: false, hata: cikti.trim().slice(0, 120) || "çıktı yok" };
  }
};

const temizle = (ipv4: string, eskiKopya: string): void => {
  const ad = siteVeritabaniAdi(b.kodAdi);
  const betik = `set +e
${eskiKopya ? `sudo rm -f ${eskiKopya}` : "true"}
printf '%s\\n' 'DROP DATABASE IF EXISTS "${ad}" WITH (FORCE);' 'DROP ROLE IF EXISTS "${ad}";' | docker exec -i ${veritabaniKutusu(ortam)} psql -U postgres -d postgres -q >/dev/null
${silmeBetigi(ortam, b.kodAdi).replace("set -eu", "true")}
`;
  const sonuc = calistir(ipv4, betik);
  if (sonuc.durum !== 0) console.error(`temizlik: ${sonuc.hata.trim()}`);
  // Deneme sitesi listeden çıkınca veritabanı kutusu onun ağı olmadan yeniden kurulur.
  try {
    veritabaniKutusunuKur(ipv4, ortam);
  } catch (hata) {
    console.error(`temizlik: ${(hata as Error).message}`);
  }
  calistir(ipv4, `docker network rm ${siteAgi(ortam, b.kodAdi)} >/dev/null 2>&1 || true`);
  console.log(`silindi     deneme sitesi ${b.kodAdi} (veritabanı, kullanıcı, gizli bilgi, ağ)`);
};

const [sunucu] = kayitlariOku();
if (!sunucu) {
  console.error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");
  process.exit(1);
}
const { ipv4 } = sunucu;
let eskiKopya = "";
try {
  console.log(`${sunucu.ad}: ${a.kodAdi} ile geçici ${b.kodAdi} deneme ortamında deneniyor...`);
  const ilkA = siteVeritabaniniHazirla(ipv4, ortam, a);
  const ilkB = siteVeritabaniniHazirla(ipv4, ortam, b);
  olc(
    "iki sitenin veritabanı açıldı, değişiklikleri uygulandı",
    ilkA.toplam > 0 && ilkB.toplam === ilkA.toplam && ilkB.yeni === ilkB.toplam,
    `${a.kodAdi} toplam ${ilkA.toplam}, ${b.kodAdi} yeni ${ilkB.yeni}`,
  );
  const ikinciA = siteVeritabaniniHazirla(ipv4, ortam, a);
  const ikinciB = siteVeritabaniniHazirla(ipv4, ortam, b);
  olc(
    "ikinci çalışmada bir şey değişmiyor",
    ikinciA.yeni === 0 && ikinciB.yeni === 0 && ikinciA.toplam === ilkA.toplam,
    `yeni ${ikinciA.yeni} ve ${ikinciB.yeni}`,
  );

  const etiket = goruntuyuGonder(ipv4, a.surum);
  for (const [site, oteki] of [
    [a, b],
    [b, a],
  ] as const) {
    const kendi = yokla(ipv4, etiket, site);
    olc(
      `${site.kodAdi} kendi veritabanına bağlanıyor`,
      kendi.baglandi === true && kendi.veritabani === siteVeritabaniAdi(site.kodAdi),
      kendi.veritabani ?? kendi.hata ?? "",
    );
    const otekine = yokla(ipv4, etiket, site, { hedef: siteVeritabaniAdi(oteki.kodAdi) });
    olc(
      `${site.kodAdi} ötekinin veritabanına giremiyor`,
      otekine.baglandi === false &&
        /no pg_hba\.conf entry|permission denied/.test(otekine.hata ?? ""),
      otekine.hata ?? "bağlandı",
    );
  }

  // Eski değerin kopyası gizli bilgi klasöründe, deneme sitesinin kullanıcısına açık tutulur;
  // geride kalırsa sunucu denetimi yakalar.
  const ub = kutuKullanicisi(ortam, b.numara);
  const dosyaB = `${gizliKlasor(ortam, b.kodAdi)}/${gizliBilgiler.VERITABANI_ADRESI.dosya}`;
  const kopya = calistir(
    ipv4,
    `set -eu\nk=$(sudo mktemp -p ${gizliKok} .deneme.XXXXXX)\nsudo cp ${dosyaB} "$k"\nsudo chown ${ub}:${ub} "$k"\nsudo chmod 0400 "$k"\necho "$k"\n`,
  );
  eskiKopya = kopya.durum === 0 ? kopya.cikti.trim() : "";
  if (!eskiKopya.startsWith(`${gizliKok}/.deneme.`))
    throw new Error("Eski değerin kopyası alınamadı.");
  const yenileme = calistir(ipv4, uretmeBetigi(ortam, b.kodAdi, b.numara, { yenile: true }));
  const esitlendi = yenileme.durum === 0 && sifreyiEsitle(ipv4, ortam, b.kodAdi);
  olc("deneme sitesinin gizli bilgisi yenilendi, şifresi eşitlendi", esitlendi);
  const yeni = yokla(ipv4, etiket, b);
  olc("yenilemeden sonra yeni şifreyle bağlanıyor", yeni.baglandi === true, yeni.hata ?? "");
  const eski = yokla(ipv4, etiket, b, { dosya: eskiKopya });
  olc(
    "yenilemeden sonra eski şifreyle bağlanamıyor",
    eski.baglandi === false && /password authentication failed/.test(eski.hata ?? ""),
    eski.hata ?? "bağlandı",
  );
  const sonrakiA = yokla(ipv4, etiket, a);
  olc(`${a.kodAdi} yenilemeden etkilenmedi`, sonrakiA.baglandi === true, sonrakiA.hata ?? "");
} catch (hata) {
  olc("deneme çalıştı", false, (hata as Error).message);
} finally {
  temizle(ipv4, eskiKopya);
}

const kalanlar = sonuclar.filter((sonuc) => !sonuc.gecti);
console.log(
  kalanlar.length === 0
    ? `Deneme yeşil: ${sonuclar.length} ölçüm geçti.`
    : `Deneme kırmızı: ${kalanlar.length} ölçüm kaldı.`,
);
process.exitCode = kalanlar.length === 0 ? 0 : 1;
