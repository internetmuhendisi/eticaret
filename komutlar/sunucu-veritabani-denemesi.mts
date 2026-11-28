// Sunucudaki veritabanının denemesi (kart 0039, karar 0034). Çalıştırma: pnpm sunucu-veritabani-denemesi
//
// Örnek Mağaza'nın deneme veritabanı (yoksa açılır, deneme sonunda kalır) ile geçici bir deneme
// sitesinin veritabanı sunucuda yan yana kurulur. Örnek Mağaza'nın veritabanı yalnız kullanılacak görüntü yayındaki
// çekirdeğin aynısıysa ya da site hiç yayınlanmamışsa kullanılır (kart 0058): yoksa ona dokunulmaz, nedeni yazılır,
// yerine ikinci bir geçici site açılır ve ölçümler iki geçici siteyle yapılır. Ölçülenler:
// - İki sitenin veritabanı açılıyor, değişiklikleri uygulanıyor; ikinci çalışmada bir şey değişmiyor.
// - Her site kendi veritabanına bağlanıyor, ötekinin veritabanına giremiyor (iki yönde).
// - Deneme sitesinin gizli bilgisi yenilenince yeni şifreyle bağlanıyor, eski şifreyle bağlanamıyor;
//   Örnek Mağaza etkilenmiyor.
// Bağlantıları sitenin kutu kullanıcısıyla, sitenin ağında ve gizli bilgi dosyasıyla açılan geçici
// kutular dener; değerler ekrana basılmaz. Sonunda deneme sitesinin veritabanı, kullanıcısı,
// gizli bilgileri ve ağı silinir (ikinci geçici site açıldıysa onunki de).

import { spawnSync } from "node:child_process";
import { siteKlasorunuOku } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { gizliBilgiler } from "../cekirdek/kayitlar/gizli-bilgiler.ts";
import { siteVeritabaniAdi } from "../cekirdek/veritabani/baglanti.ts";
import { cekirdekIzi } from "./cekirdek-izi.mts";
import {
  denemeSiteNumarasi,
  gizliKlasor,
  gizliKok,
  ikinciDenemeSiteNumarasi,
  kutuKullanicisi,
  type Ortam,
  silmeBetigi,
  siteNumaralariniOku,
  uretmeBetigi,
} from "./gizli-bilgi.mts";
import { kayitlariOku, kok, sshKomutu } from "./sunucu.mts";
import {
  goruntununKaydi,
  goruntuyuGonder,
  sifreyiEsitle,
  siteAgi,
  siteVeritabaniniHazirla,
  surumEtiketi,
  veritabaniKutusu,
  veritabaniKutusunuKur,
  yayindakiCekirdekMi,
} from "./sunucu-veritabani.mts";
import { etkinYigini, kayitlariOku as yayinKayitlariOku } from "./yayin.mts";

const ortam: Ortam = "deneme";
const ornek = siteKlasorunuOku(`${kok}/siteler/ornek-magaza`).kimlik;
// Görüntü sunucuya denemenin kendi etiketiyle gider: sürümün etiketi (altyapi-cekirdek:<sürüm>) sunucuda yayındaki
// görüntüyü gösterir, bilgisayardaki aynı adlı görüntü onu başka bir görüntüye kaydırırdı (kart 0058). Etiket
// sonunda iki yerde de silinir.
const surumunEtiketi = surumEtiketi(ornek.cekirdekSurumu);
const denemeEtiketi = `${surumunEtiketi}-vt-deneme`;
const ornekSite = {
  kodAdi: ornek.kodAdi,
  numara: siteNumaralariniOku()[ornek.kodAdi] as number,
  surum: ornek.cekirdekSurumu,
  etiket: denemeEtiketi,
};
// Deneme sitelerinin numarası kayda yazılmaz; gerçek sitelere verilmeyen ayrılmış numaraları kullanırlar. İkincisi
// yalnız Örnek Mağaza kullanılamayınca açılır.
const b = {
  kodAdi: "vt-deneme",
  numara: denemeSiteNumarasi,
  surum: ornek.cekirdekSurumu,
  etiket: denemeEtiketi,
};
const yedek = {
  kodAdi: "vt-deneme-2",
  numara: ikinciDenemeSiteNumarasi,
  surum: ornek.cekirdekSurumu,
  etiket: denemeEtiketi,
};
let a = ornekSite;

const sonuclar: { ad: string; gecti: boolean }[] = [];
const olc = (ad: string, gecti: boolean, ayrinti = "") => {
  if (kesildi) throw new Error("Deneme kesildi.");
  sonuclar.push({ ad, gecti });
  console.log(`${gecti ? "tamam " : "HATA  "} ${ad}${ayrinti ? `  (${ayrinti})` : ""}`);
};

// Ctrl-C: o anki ssh süreci de sinyali alır ve adım yarıda kesilir. Deneme bunu ssh'in sonucundan
// (sinyal ya da 255) anlar ve sonraki adıma geçmez. İşleyiciler yalnız Node'un hemen kapanmasını
// önler (eşzamanlı akışta adımlar sürerken çalışmazlar); böylece temizlik yine çalışır ve deneme
// sitesi sunucuda kalmaz.
let kesildi = false;
for (const sinyal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.on(sinyal, () => {
    kesildi = true;
  });
}

const calistir = (
  ipv4: string,
  betik: string,
  { temizlik = false } = {},
): { durum: number; cikti: string; hata: string } => {
  if (kesildi && !temizlik) throw new Error("Deneme kesildi.");
  const sonuc = sshKomutu(ipv4, "bash -s", { girdi: betik, sure: 300_000 });
  // ssh kesilince sinyali kendisi yakalayıp 255 ile çıkar; bağlantı hatası da 255'tir. İkisinde de
  // deneme sonraki adıma geçmez.
  if (sonuc.signal || sonuc.status === 255) kesildi = true;
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

const temizle = (ipv4: string, eskiKopya: string, gecicilere: string[]): void => {
  for (const kodAdi of gecicilere) {
    const ad = siteVeritabaniAdi(kodAdi);
    const betik = `set +e
${eskiKopya ? `sudo rm -f ${eskiKopya}` : "true"}
printf '%s\\n' 'DROP DATABASE IF EXISTS "${ad}" WITH (FORCE);' 'DROP ROLE IF EXISTS "${ad}";' | docker exec -i ${veritabaniKutusu(ortam)} psql -U postgres -d postgres -q >/dev/null
${silmeBetigi(ortam, kodAdi).replace("set -eu", "true")}
`;
    const sonuc = calistir(ipv4, betik, { temizlik: true });
    if (sonuc.durum !== 0) console.error(`temizlik: ${sonuc.hata.trim()}`);
  }
  // Deneme sitesi listeden çıkınca veritabanı kutusu onun ağı olmadan yeniden kurulur.
  try {
    veritabaniKutusunuKur(ipv4, ortam);
  } catch (hata) {
    console.error(`temizlik: ${(hata as Error).message}`);
  }
  // Denemenin etiketi: sunucuda yalnız bu ad kaldırılır (görüntüyü başka etiket ya da kutu kullanıyorsa kalır).
  calistir(ipv4, `docker image rm ${denemeEtiketi} >/dev/null 2>&1 || true`, { temizlik: true });
  spawnSync("docker", ["image", "rm", denemeEtiketi], { stdio: "ignore" });
  for (const kodAdi of gecicilere) {
    calistir(ipv4, `docker network rm ${siteAgi(ortam, kodAdi)} >/dev/null 2>&1 || true`, {
      temizlik: true,
    });
    console.log(`silindi     deneme sitesi ${kodAdi} (veritabanı, kullanıcı, gizli bilgi, ağ)`);
  }
};

const [sunucu] = kayitlariOku();
if (!sunucu) {
  console.error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");
  process.exit(1);
}
const { ipv4 } = sunucu;
let eskiKopya = "";
const geciciler = [b.kodAdi];
try {
  // Önce denemenin etiketi konur, karar o etiketin görüntüsünden verilir: sunucuya giden görüntü kararın baktığıdır.
  const etiketle = spawnSync("docker", ["image", "tag", surumunEtiketi, denemeEtiketi], {
    encoding: "utf8",
  });
  if (etiketle.status !== 0) {
    throw new Error(`${surumunEtiketi} bu bilgisayarda yok: ${etiketle.stderr.trim()}`);
  }
  // Örnek Mağaza'nın veritabanına yalnız yayındaki çekirdeğin görüntüsüyle dokunulur (kart 0058).
  const yayinKayitlari = yayinKayitlariOku(ipv4, ortam, ornek.kodAdi);
  const etkin = etkinYigini(yayinKayitlari).at(-1);
  const yayin = yayinKayitlari.find(
    (k) => k.tur === "yayin" && k.sonuc === "basarili" && k.no === etkin,
  );
  const karar = yayindakiCekirdekMi(
    {
      surum: ornek.cekirdekSurumu,
      goruntuKaydi: goruntununKaydi(denemeEtiketi),
      // Etkin yayının kaydı bulunamazsa site yayında sayılır ve kullanılmaz.
      yayin: etkin === undefined ? undefined : (yayin ?? { surum: "bilinmiyor", kayit: "" }),
    },
    (kayit) => cekirdekIzi(kok, kayit),
  );
  if (!karar.kullanilir) {
    console.log(
      `dokunulmadı ${ornek.kodAdi}: ${karar.neden}; veritabanı değiştirilmez, yerine geçici ${yedek.kodAdi} açılıyor (kart 0058)`,
    );
    a = yedek;
    geciciler.unshift(yedek.kodAdi);
  }
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

  const { etiket } = goruntuyuGonder(ipv4, denemeEtiketi);
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
  // Kesilen denemede olc de durur; sonuç doğrudan yazılır.
  sonuclar.push({ ad: "deneme çalıştı", gecti: false });
  console.log(`HATA   deneme çalıştı  (${(hata as Error).message})`);
} finally {
  temizle(ipv4, eskiKopya, geciciler);
}

const kalanlar = sonuclar.filter((sonuc) => !sonuc.gecti);
console.log(
  kalanlar.length === 0
    ? `Deneme yeşil: ${sonuclar.length} ölçüm geçti.`
    : `Deneme kırmızı: ${kalanlar.length} ölçüm kaldı.`,
);
process.exitCode = kalanlar.length === 0 ? 0 : 1;
