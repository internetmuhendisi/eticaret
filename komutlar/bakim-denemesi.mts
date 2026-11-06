// Bakım sayfasının denemesi (kart 0043, karar 0038). Çalıştırma: pnpm bakim-denemesi
//
// Örnek Mağaza'nın deneme adresinde gerçekten ölçülür; site deneme sırasında birkaç kez kapanır.
// - Olağan durumda site açık; ön kapının sağlık yoklaması siteyi yanlışlıkla bakıma almıyor.
// - Kutu durunca sayfa 503, Retry-After, önbelleksiz, arama motorlarına kapalı; panel de sayfayı,
//   kapı istekleri zarfı görüyor; robots.txt açık; kutu açılınca site kendiliğinden dönüyor.
// - Veritabanı durunca sayfa görünüyor, açılınca kalkıyor.
// - Elle bakım vitrini ve paneli kapatıyor, sağlık ucu açık; ön kapı yeniden kurulunca da sürüyor;
//   kapatınca site dönüyor.
// - Bozuk ayar ön kapıyı düşürmüyor.
// - Sayfa üç genişlikte ve açık-koyu temada yatay kaydırmasız, konsol hatasız, başlıklı, okunur.
// Sonunda kutu ve veritabanı açık, elle bakım kapalıdır.

import { chromium } from "@playwright/test";
import {
  bakimDamgasi,
  bakimDegistir,
  bakimdakiSiteleriOku,
  denemeAdresi,
  kurmaBetigi,
  onKapiyiKur,
  saglikYolu,
  siteKutusuAdi,
  yayindakiSiteleriOku,
  yayinKilidiyle,
  yayinOrtami,
} from "./on-kapi.mts";
import { kayitlariOku, sshKomutu } from "./sunucu.mts";
import { veritabaniKutusu } from "./sunucu-veritabani.mts";

const kodAdi = "ornek-magaza";
const adres = `https://${denemeAdresi(kodAdi)}`;

const sonuclar: { ad: string; gecti: boolean }[] = [];
const olc = (ad: string, gecti: boolean, ayrinti = "") => {
  sonuclar.push({ ad, gecti });
  console.log(`${gecti ? "tamam " : "HATA  "} ${ad}${ayrinti ? `  (${ayrinti})` : ""}`);
};
const bekle = (ms: number) => new Promise((bitti) => setTimeout(bitti, ms));

type Yanit = { durum: number; govde: string; basliklar: Headers };
// Caddy ayarı yeniden okuyunca boştaki bağlantıyı kapatır; Node'un havuzundaki eski bağlantı bir kez
// hata verir (curl ve yeni süreç etkilenmiyor, ölçüldü). Yalnız ağ hatasında bir kez yeniden denenir,
// HTTP cevabı yeniden denenmez.
const iste = async (yol: string, yontem = "GET", yeniden = true): Promise<Yanit> => {
  try {
    const yanit = await fetch(`${adres}${yol}`, {
      method: yontem,
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      headers: { "cache-control": "no-cache" },
    });
    return { durum: yanit.status, govde: await yanit.text(), basliklar: yanit.headers };
  } catch (hata) {
    if (!yeniden) throw hata;
    await bekle(1000);
    return iste(yol, yontem, false);
  }
};
const bakimSayfasiMi = (yanit: Yanit) => yanit.durum === 503 && yanit.govde.includes(bakimDamgasi);

// Koşul sağlanana kadar yoklar; geçen saniyeyi, sağlanmazsa undefined döner.
const beklenene = async (
  kosul: (yanit: Yanit) => boolean,
  yol = "/",
  saniye = 90,
): Promise<number | undefined> => {
  const basla = Date.now();
  while (Date.now() - basla < saniye * 1000) {
    try {
      if (kosul(await iste(yol))) return Math.round((Date.now() - basla) / 1000);
    } catch {
      // Ağ hatası: bir sonraki yoklamada yeniden denenir.
    }
    await bekle(1000);
  }
  return undefined;
};

const [sunucu] = kayitlariOku();
if (!sunucu) {
  console.error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");
  process.exit(1);
}
const { ipv4 } = sunucu;
const no = yayindakiSiteleriOku(ipv4)[kodAdi];
if (no === undefined) {
  console.error(`${kodAdi} yayında değil.`);
  process.exit(1);
}
const kutu = siteKutusuAdi(yayinOrtami, kodAdi, no);
const vt = veritabaniKutusu(yayinOrtami);
const docker = (komut: string) => {
  const sonuc = sshKomutu(ipv4, `docker ${komut}`);
  if (sonuc.status !== 0) throw new Error(`docker ${komut}: ${sonuc.stderr.trim()}`);
};

const olaganDurum = async () => {
  // Reload'dan sonra yoklama birkaç tur dönsün; sağlık sınırına takılsaydı burada görünürdü.
  await bekle(15_000);
  let kotu = 0;
  for (let i = 0; i < 30; i++) {
    if ((await iste("/")).durum !== 200) kotu++;
    await bekle(2000);
  }
  olc("olağan durumda yoklama siteyi bakıma almıyor (60 saniye)", kotu === 0, `${kotu}/30 kötü`);
  const panel = await iste("/yonetim");
  olc("olağan durumda panel açık", panel.durum === 200, String(panel.durum));
};

const kutuDurunca = async () => {
  docker(`stop --timeout 5 ${kutu}`);
  try {
    const ana = await iste("/");
    olc("kutu durunca sayfa 503 ile geliyor", bakimSayfasiMi(ana), String(ana.durum));
    olc(
      "sayfa sitenin adını ve ortak metni taşıyor",
      ana.govde.includes("Örnek Mağaza") && ana.govde.includes("Bakımdayız"),
    );
    olc("Retry-After var", ana.basliklar.get("retry-after") === "300");
    olc("önbelleğe alınmıyor", ana.basliklar.get("cache-control") === "no-store");
    olc(
      "arama motorlarına kapalı",
      /noindex/.test(ana.basliklar.get("x-robots-tag") ?? ""),
      ana.basliklar.get("x-robots-tag") ?? "başlık yok",
    );
    olc(
      "Türkçe karakterler bozulmuyor",
      /text\/html; charset=utf-8/.test(ana.basliklar.get("content-type") ?? ""),
    );
    const panel = await iste("/yonetim");
    olc("panel de sayfayı gösteriyor", bakimSayfasiMi(panel), String(panel.durum));
    const gonderim = await iste("/", "POST");
    olc("POST da sayfayı alıyor", bakimSayfasiMi(gonderim), String(gonderim.durum));
    const kapi = await iste(saglikYolu);
    olc(
      "kapı isteği zarfla cevap alıyor",
      kapi.durum === 503 && JSON.parse(kapi.govde).hata?.kod === "hizmet-kullanilamiyor",
      `${kapi.durum} ${kapi.govde.slice(0, 80)}`,
    );
    const robots = await iste("/robots.txt");
    olc("robots.txt kutu kapalıyken de açık", robots.durum === 200, String(robots.durum));
  } finally {
    docker(`start ${kutu}`);
  }
  const sure = await beklenene((y) => y.durum === 200);
  olc("kutu açılınca site kendiliğinden dönüyor", sure !== undefined, `${sure ?? "?"} sn`);
};

const veritabaniDurunca = async () => {
  docker(`stop --timeout 10 ${vt}`);
  try {
    const sure = await beklenene(bakimSayfasiMi);
    olc("veritabanı durunca sayfa görünüyor", sure !== undefined, `${sure ?? "?"} sn`);
    const saglik = await iste(saglikYolu);
    olc(
      "sağlık ucu gerçek durumu söylüyor",
      saglik.durum === 503 && JSON.parse(saglik.govde).hata?.kod === "hizmet-kullanilamiyor",
      String(saglik.durum),
    );
  } finally {
    docker(`start ${vt}`);
  }
  const sure = await beklenene((y) => y.durum === 200);
  olc("veritabanı açılınca site dönüyor", sure !== undefined, `${sure ?? "?"} sn`);
};

const elleBakim = async () => {
  await bakimDegistir(ipv4, kodAdi, true);
  try {
    const ana = await iste("/");
    olc("elle bakım vitrini kapatıyor", bakimSayfasiMi(ana), String(ana.durum));
    const panel = await iste("/yonetim");
    olc("elle bakım paneli de kapatıyor", bakimSayfasiMi(panel), String(panel.durum));
    const saglik = await iste(saglikYolu);
    olc("elle bakımda sağlık ucu açık", saglik.durum === 200, String(saglik.durum));
    const ilkZaman = bakimdakiSiteleriOku(ipv4).get(kodAdi);
    await yayinKilidiyle(ipv4, () => onKapiyiKur(ipv4));
    olc("ön kapı yeniden kurulunca bakım sürüyor", bakimSayfasiMi(await iste("/")));
    olc("bakımın başlangıcı değişmiyor", bakimdakiSiteleriOku(ipv4).get(kodAdi) === ilkZaman);
    await sayfaOlcumleri();
  } finally {
    await bakimDegistir(ipv4, kodAdi, false);
  }
  const ana = await iste("/");
  olc("elle bakım kapanınca site dönüyor", ana.durum === 200, String(ana.durum));
  olc("işaret kalktı", !bakimdakiSiteleriOku(ipv4).has(kodAdi));
};

const bozukAyar = () => {
  const betik = kurmaBetigi({ [kodAdi]: "bozuk-satir {\n" });
  const sonuc = sshKomutu(ipv4, "bash -s", { girdi: betik });
  olc("bozuk ayar kurulumdan önce durduruluyor", sonuc.status !== 0);
};

// WCAG'ın göreli parlaklık formülüyle kontrast oranı (tarayıcıda hesaplanan renklerle).
const kontrast = (on: string, arka: string): number => {
  const kanal = (renk: string) => (renk.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const parlaklik = (renk: string) => {
    const [r = 0, g = 0, b = 0] = kanal(renk).map((d) => {
      const c = d / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [a, b] = [parlaklik(on), parlaklik(arka)].sort((x, y) => y - x) as [number, number];
  return (a + 0.05) / (b + 0.05);
};

const sayfaOlcumleri = async () => {
  const tarayici = await chromium.launch();
  try {
    for (const genislik of [360, 768, 1280]) {
      for (const tema of ["light", "dark"] as const) {
        const sayfa = await tarayici.newPage({
          viewport: { width: genislik, height: 800 },
          colorScheme: tema,
        });
        const konsol: string[] = [];
        sayfa.on("console", (ileti) => {
          // 503 cevabını tarayıcı kendisi yazar; sayfanın kendi hatası değildir.
          if (ileti.type() === "error" && !/503/.test(ileti.text())) konsol.push(ileti.text());
        });
        sayfa.on("pageerror", (hata) => konsol.push(hata.message));
        await sayfa.goto(adres);
        const olcu = await sayfa.evaluate(() => {
          const belge = document.documentElement;
          const stil = getComputedStyle(document.body);
          return {
            kaydirma: belge.scrollWidth > belge.clientWidth,
            lang: belge.lang,
            baslik: document.title,
            h1: document.querySelectorAll("h1").length,
            main: document.querySelectorAll("main").length,
            yazi: stil.color,
            zemin: stil.backgroundColor,
          };
        });
        const oran = kontrast(olcu.yazi, olcu.zemin);
        const ad = `sayfa ${genislik}px ${tema}`;
        olc(
          `${ad}: yatay kaydırma yok, konsol temiz`,
          !olcu.kaydirma && konsol.length === 0,
          konsol.join("; "),
        );
        olc(
          `${ad}: dil, başlık, tek h1, main, kontrast en az 4.5`,
          olcu.lang === "tr" &&
            olcu.baslik.includes("Örnek Mağaza") &&
            olcu.h1 === 1 &&
            olcu.main === 1 &&
            oran >= 4.5,
          `kontrast ${oran.toFixed(1)}`,
        );
        await sayfa.close();
      }
    }
    // Dört kat yakınlaştırma: 1280 genişliğin dörtte biri (kural: erisilebilirlik.md).
    const yakin = await tarayici.newPage({ viewport: { width: 320, height: 256 } });
    await yakin.goto(adres);
    const kaydirma = await yakin.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    olc("dört kat yakınlaştırmada yatay kaydırma yok", !kaydirma);
    await yakin.close();
  } finally {
    await tarayici.close();
  }
};

try {
  console.log(
    `${sunucu.ad}: ${adres} üzerinde bakım sayfası deneniyor (site birkaç kez kapanacak)...`,
  );
  // Yeni satır önce kurulur: deneme bu kaydın ön kapı ayarını ölçer.
  await yayinKilidiyle(ipv4, () => onKapiyiKur(ipv4));
  await olaganDurum();
  await kutuDurunca();
  await veritabaniDurunca();
  await elleBakim();
  bozukAyar();
  const son = await iste("/");
  olc("bozuk ayardan sonra site açık", son.durum === 200, String(son.durum));
} catch (hata) {
  sonuclar.push({ ad: "deneme çalıştı", gecti: false });
  console.log(`HATA   deneme çalıştı  (${(hata as Error).message})`);
} finally {
  // Ne olursa olsun site açık kalsın.
  sshKomutu(ipv4, `docker start ${vt} ${kutu} >/dev/null 2>&1; true`);
  if (bakimdakiSiteleriOku(ipv4).has(kodAdi)) await bakimDegistir(ipv4, kodAdi, false);
}

const kalanlar = sonuclar.filter((sonuc) => !sonuc.gecti);
console.log(
  kalanlar.length === 0
    ? `Deneme yeşil: ${sonuclar.length} ölçüm geçti.`
    : `Deneme kırmızı: ${kalanlar.length} ölçüm kaldı.`,
);
process.exitCode = kalanlar.length === 0 ? 0 : 1;
