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
//   - görüntüdeki parça yalnız kendi sitesine yönetici açar, şifre girişte geçer (kart 0048).
// Sonunda ortamı kapatır ve deneme sitesini siler. Bir ölçüm kalırsa kırmızı biter.
// Çalıştırma: pnpm yerel-ortam-testi [--acik-birak]
//   --acik-birak: ortamı ve deneme sitesini açık bırakır; kapatmak: pnpm yerel-ortam-kapat

import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { siteKlasorunuOku } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { arkaPlanDosyalari } from "../cekirdek/kayitlar/arka-plan.ts";
import { dosyaKlasoruDegiskeni } from "../cekirdek/kayitlar/dosya.ts";
import { istekSinirlari } from "../cekirdek/kayitlar/kapi.ts";
import { metinOkuyucu } from "../cekirdek/metinler/metin.ts";
import { soruyuCoz } from "../cekirdek/moduller/robot-korumasi/testler/soru-coz.ts";
import { siteVeritabaniAdi } from "../cekirdek/veritabani/baglanti.ts";
import { arkaPlanKutuAdi, kutuKuraliDogru, yenidenBaslama } from "./kutu-kurali.mts";
import {
  denemeSitesiAc,
  dosyaBirimi,
  gonder,
  iste,
  kilitle,
  kok,
  kutuAdi,
  kutudakiDosyaKlasoru,
  type OrtamSitesi,
  ortamiAc,
  ortamiKapat,
  postaKutusuAdresi,
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
  const { kodAdi, cekirdekSurumu } = site.kimlik;
  // Ad mağaza sahibinin ayarıdır (kart 0071); deneme sitesinde kimlikteki addan farklıdır.
  const magazaAdi = site.baslangic.magazaAdi;
  const vitrin = await iste(kodAdi, "/");
  olc(
    `${kodAdi}: vitrin kendi adını gösteriyor`,
    vitrin.durum === 200 && baslik(vitrin.govde) === magazaAdi,
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
  olc(
    `${kodAdi}: arka plan kutusu örnek işi çalıştırıyor, hatalı işi yeniden deneyip bırakıyor`,
    deneme.includes("basarili=bitti 1") && deneme.includes("hatali=hata 2"),
    deneme.trim().replaceAll("\n", ", "),
  );
  const yakalanan = (await (
    await fetch(`${postaKutusuAdresi()}/api/v1/search?query=${encodeURIComponent(`to:"${alici}"`)}`)
  ).json()) as { messages?: { From?: { Address?: string } }[] };
  const gonderenAdresi = siteKlasorunuOku(site.klasor).ayarlar.epostaGonderenAdresi;
  if (gonderenAdresi) {
    olc(
      `${kodAdi}: e-posta yerel posta kutusuna düştü, gönderen sitenin adresi`,
      deneme.includes("eposta=gonderildi") &&
        yakalanan.messages?.length === 1 &&
        yakalanan.messages[0]?.From?.Address === gonderenAdresi,
      `${yakalanan.messages?.length ?? 0} e-posta`,
    );
  } else {
    olc(
      `${kodAdi}: gönderen adresi olmayan site e-posta göndermiyor`,
      deneme.includes("eposta=gonderilmedi") && (yakalanan.messages?.length ?? 0) === 0,
      `${yakalanan.messages?.length ?? 0} e-posta`,
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
  let konular: string[] = [];
  for (let tur = 0; tur < 30 && konular.length === 0; tur++) {
    const { messages = [] } = (await (
      await fetch(
        `${postaKutusuAdresi()}/api/v1/search?query=${encodeURIComponent(`to:"${eposta}"`)}`,
      )
    ).json()) as { messages?: { Subject: string }[] };
    konular = messages.map(({ Subject }) => Subject);
    if (konular.length === 0) await new Promise((coz) => setTimeout(coz, 1000));
  }
  // Konudaki ad mağaza sahibinin ayarıdır (kart 0071).
  const { baslangic } = siteKlasorunuOku(join(kok, "siteler", kodAdi));
  olc(
    `${kodAdi}: hoş geldin e-postası yerel posta kutusuna ulaşıyor`,
    konular.length === 1 && konular[0]?.includes(baslangic.magazaAdi ?? "") === true,
    konular.join(", ") || "e-posta yok",
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
  for (let tur = 0; tur < 30 && baglanti === undefined; tur++) {
    const { messages = [] } = (await (
      await fetch(
        `${postaKutusuAdresi()}/api/v1/search?query=${encodeURIComponent(`to:"${eposta}"`)}`,
      )
    ).json()) as { messages?: { ID: string }[] };
    for (const { ID } of messages) {
      const { Text } = (await (
        await fetch(`${postaKutusuAdresi()}/api/v1/message/${ID}`)
      ).json()) as { Text: string };
      const bulunan = /https?:\/\/\S+#anahtar=\S+/.exec(Text)?.[0];
      if (bulunan !== undefined) baglanti = new URL(bulunan);
    }
    if (baglanti === undefined) await new Promise((coz) => setTimeout(coz, 1000));
  }
  olc(
    `${kodAdi}: sıfırlama e-postası ulaşıyor, bağlantı sitenin adresinde`,
    baglanti?.hostname === `${kodAdi}.localhost`,
    baglanti?.host ?? "bağlantı yok",
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

const calistir = async (): Promise<void> => {
  let siteler: OrtamSitesi[] = [];
  try {
    const deneme = denemeSitesiAc();
    siteler = await ortamiAc([join(kok, "siteler", "ornek-magaza"), deneme]);
    const [ornek, denemeSitesi] = siteler as [OrtamSitesi, OrtamSitesi];
    console.log("");
    await sitesiniOlc(ornek, denemeSitesi);
    await sitesiniOlc(denemeSitesi, ornek);
    // Giriş ucunun sınırı aşağıda doldurulur, bu ölçüm ondan önce gelir.
    await yoneticiOlc(denemeSitesi.kimlik.kodAdi, ornek.kimlik.kodAdi);

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
    const panelBasligi = metinOkuyucu("tr")("yonetim.anasayfa.baslik");
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
