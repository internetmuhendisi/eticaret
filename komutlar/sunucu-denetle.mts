// Sunucuyu dışarıdan denetler (kart 0018, karar 0030). Her ölçüm gerçek bağlantıyla yapılır.
//
//   pnpm sunucu-denetle           sunucu/sunucular.json'daki her sunucuyu denetler
//   pnpm sunucu-denetle --hizli   kapı taramasını bütün kapılar yerine bilinen kapılarla yapar
//
// Ölçülenler:
// - Sunucu Hetzner'de Almanya'da çalışıyor ve dıştaki duvar ona bağlı.
// - Sunucu şifreyle girişi hiç önermiyor, yalnız anahtar kabul ediyor; kökle anahtarlı giriş reddediliyor.
// - Yönetici anahtarla girebiliyor; sshd'nin geçerli ayarı şifreyi ve kökü kapatıyor.
// - Silme koruması açık; sunucuya bağlı duvarlarda yalnız 22, 80 ve 443 kuralları var.
// - Dışarıdan bakınca 22, 80 ve 443 dışında her TCP kapısı yanıtsız (IPv4 ve IPv6). Ağ hatası
//   ya da tarama sırasında kesinti olursa sonuç güvenilmez sayılır ve kırmızıdır.
// - Docker çalışıyor ve bir kutu açabiliyor; güvenlik güncellemeleri ve içerideki duvar açık;
//   bekleyen bir yeniden başlatma iki günden uzun süredir yapılmamış değil.
// - Ön kapı: deneme adresleri sunucuya çözülüyor, şifreli açılıyor, http:// yönleniyor, arama
//   motorlarına kapalı, kutu ziyaretçinin gerçek adresini görüyor (on-kapi-olcumleri.mts, kart 0020).
// - Yayındaki her sitenin kutusu tanımıyla aynı ayarla ve sağlıklı çalışıyor (yayin.mts, kart 0021).
// - Her ortamın veritabanı kutusu sağlıklı çalışıyor: kök olmayan kullanıcı, salt okunur, yetkisiz,
//   yeniden başlayınca açılıyor, portu dışarıya açılmamış (sunucu-veritabani.mts, kart 0039).
// - Yayındaki her sitenin deneme adresi şifreli açılıyor, arama motorlarına kapalı, sağlık ucu
//   etkin yayının kaydındaki sürümü söylüyor (on-kapi-olcumleri.mts, kart 0023).
// - Hata izleme kutusu aynı kısıtlarla, yalnız kendi ağında ve internete kapalı çalışıyor; ön
//   kapıdan yalnız gönderim yolu açık (hata-izleme.mts, on-kapi-olcumleri.mts, kart 0022).
// - Gece yedeğinin zamanlayıcısı açık, betiği projedekiyle aynı, her sitenin son gece yedeği başarılı
//   ve 26 saatten yeni, depo yalnız kendi veri merkezinde görünüyor (yedek.mts, kart 0024).
// Bir ölçüm tutmazsa komut kırmızı biter.

import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import { Socket } from "node:net";
import { join } from "node:path";
import {
  degerBasinaParca,
  gizliKok,
  kayittaArama,
  kutuKullanicisi,
  siteNumaralariniOku,
  yerlesimHatalari,
} from "./gizli-bilgi.mts";
import {
  hataIzlemeAgHatalari,
  hataIzlemeAgUyeHatalari,
  hataIzlemeOrtamlari,
  hataIzlemeTanimi,
} from "./hata-izleme.mts";
import { kayitHatalari, kayitOlcumBetigi, sunucuKayitlari } from "./kurulus-tarifi.mts";
import { arkaPlanKutuAdi, arkaPlanKutusuVarMi, dosyaKlasoruVarMi } from "./kutu-kurali.mts";
import {
  hataIzlemeAgi,
  hataIzlemeKutusu,
  kutuKisitHatalari,
  kutuOlcumBicimi,
  siteKutusuAdi,
  yayindakiSiteleriOku,
  yayinOrtami,
} from "./on-kapi.mts";
import { onKapiyiOlc, yayindakiSiteleriOlc } from "./on-kapi-olcumleri.mts";
import { guvenliOturum, ustBilgiAcikOlanlarSql, ustBilgiHatalari } from "./site-ust-bilgi.mts";
import {
  acikKapilar,
  type DuvarKurali,
  duvarUygulanmasiniBekle,
  fazlaKurallar,
  girisAnahtari,
  girisYontemleri,
  hetzner,
  type KapiDurumu,
  kapiHatalari,
  kayitlariOku,
  kok,
  type SunucuKaydi,
  sshKomutu,
  sshSecenekleri,
  sunucuTanimi as t,
  yalnizAnahtarla,
  yenidenBaslatmaSiniri,
  yonetimKapisi,
} from "./sunucu.mts";
import {
  agHatalari,
  pgHbaOzeti,
  portuKapali,
  siteListesiniOku,
  veritabaniKlasoru,
  veritabaniKutusu,
  veritabaniOrtamlari,
  veritabaniTanimi,
} from "./sunucu-veritabani.mts";
import {
  diskDolulugu,
  diskDolulukSiniri,
  dosyaKlasoruHatalari,
  etkinYayinBellegi,
  etkinYayinSurumu,
  kayittakiBellekle,
  sunucuDosyaKlasoru,
  kayitlariOku as yayinKayitlariniOku,
  yayinKutusuTanimi,
} from "./yayin.mts";
import { depoAnahtarlari, kayittaYedekSizintisi, yedekDenetimi } from "./yedek.mts";

// Hızlı taramada bakılan kapılar: gerekenler ve yanlışlıkla açılması en olası olanlar.
const bilinenKapilar = [
  ...acikKapilar,
  21,
  23,
  25,
  53,
  111,
  2375,
  2376,
  2377,
  3000,
  3306,
  5432,
  6379,
  7946,
  8000,
  8080,
  8443,
  9000,
  9090,
  55432,
  58080,
];

const kapiyaBak = (adres: string, kapi: number, sure = 2500): Promise<KapiDurumu> =>
  new Promise((bitti) => {
    const soket = new Socket();
    const sonuc = (durum: KapiDurumu) => {
      soket.destroy();
      bitti(durum);
    };
    // Yanıtsızlık yalnız süre dolunca sayılır; başka her ağ hatası "hata"dır ve denetimi kırmızı yapar.
    soket.setTimeout(sure, () => sonuc("yanitsiz"));
    soket.once("connect", () => sonuc("acik"));
    soket.once("error", (hata: NodeJS.ErrnoException) =>
      sonuc(
        hata.code === "ECONNREFUSED" ? "reddetti" : hata.code === "ETIMEDOUT" ? "yanitsiz" : "hata",
      ),
    );
    soket.connect(kapi, adres);
  });

// Tarama sürerken yönetim kapısı 15 saniyede bir yoklanır. Bağlantı kesilirse yanıtsız kapılar
// duvardan değil kesintiden olabilir; bu durumda tarama güvenilmez sayılır.
const kapilariTara = async (adres: string, kapilar: number[]) => {
  const durumlar = new Map<number, KapiDurumu>();
  let kopma = 0;
  let sira = 0;
  const isci = async () => {
    while (sira < kapilar.length) {
      const kapi = kapilar[sira++] as number;
      durumlar.set(kapi, await kapiyaBak(adres, kapi));
    }
  };
  const nobet = setInterval(async () => {
    if ((await kapiyaBak(adres, yonetimKapisi, 5000)) !== "acik") kopma++;
  }, 15_000);
  try {
    await Promise.all(Array.from({ length: 500 }, isci));
  } finally {
    clearInterval(nobet);
  }
  if ((await kapiyaBak(adres, yonetimKapisi, 5000)) !== "acik") kopma++;
  return { durumlar, kopma };
};

// Sunucunun önerdiği giriş yöntemleri: hiçbir yöntem denenmeden sorulur.
const onerilenYontemler = (adres: string, kullanici: string) => {
  const sonuc = spawnSync(
    "ssh",
    [
      ...sshSecenekleri,
      "-v",
      "-o",
      "PreferredAuthentications=none",
      "-o",
      "PubkeyAuthentication=no",
      `${kullanici}@${adres}`,
      "true",
    ],
    { encoding: "utf8", timeout: 30_000 },
  );
  return girisYontemleri(sonuc.stderr);
};

const denetle = async (kayit: SunucuKaydi, hizli: boolean): Promise<string[]> => {
  const hatalar: string[] = [];
  const olcum = (tamam: boolean, metin: string, ayrinti = "") => {
    console.log(`${tamam ? "tamam" : "HATA "}  ${metin}${ayrinti ? `: ${ayrinti}` : ""}`);
    if (!tamam) hatalar.push(metin);
  };
  console.log(`\n${kayit.ad} (${kayit.ipv4})`);

  // Hetzner'deki durum.
  const { server: s } = await hetzner<{
    server: {
      status: string;
      location: { name: string; country: string };
      public_net: { firewalls: { id: number; status: string }[] };
      protection: { delete: boolean };
    };
  }>(`/servers/${kayit.hetzner_numarasi}`);
  olcum(s.status === "running", "sunucu çalışıyor", s.status);
  olcum(s.location.country === t.ulke, "sunucu Almanya'da", s.location.name);
  olcum(s.protection.delete, "silme koruması açık");
  const { firewalls } = await hetzner<{ firewalls: { id: number }[] }>(
    `/firewalls?name=${t.duvarAdi}`,
  );
  const duvar = firewalls[0];
  const bagliDuvarlar = await duvarUygulanmasiniBekle(kayit.hetzner_numarasi);
  olcum(
    duvar !== undefined && bagliDuvarlar.some((f) => f.id === duvar.id && f.status === "applied"),
    "dıştaki duvar sunucuya bağlı",
    bagliDuvarlar.map((f) => `${f.id} ${f.status}`).join(", "),
  );
  // Sunucuya bağlı bütün duvarların kuralları birleşir; hiçbiri fazla kapı açmamalı.
  // Bu ölçüm, denetimin çalıştığı ağ bazı kapılara çıkışı engellese bile fazla kuralı yakalar.
  const fazla: string[] = [];
  for (const { id } of bagliDuvarlar) {
    const { firewall } = await hetzner<{ firewall: { name: string; rules: DuvarKurali[] } }>(
      `/firewalls/${id}`,
    );
    fazla.push(...fazlaKurallar(firewall.rules).map((k) => `${firewall.name}: ${k}`));
  }
  olcum(fazla.length === 0, "dıştaki duvarda yalnız gereken kurallar var", fazla.join(", "));

  // Giriş.
  for (const kullanici of [kayit.kullanici, "root"]) {
    const yontemler = onerilenYontemler(kayit.ipv4, kullanici);
    olcum(
      yalnizAnahtarla(yontemler),
      `${kullanici} için şifreyle giriş önerilmiyor, yalnız anahtar`,
      yontemler?.join(",") ?? "yanıt okunamadı",
    );
  }
  const kokle = sshKomutu(kayit.ipv4, "true", { kullanici: "root" });
  olcum(
    kokle.status !== 0 && /Permission denied/.test(kokle.stderr),
    "kökle anahtarlı giriş reddediliyor",
    kokle.status === 0 ? "girildi" : "",
  );
  const giris = sshKomutu(kayit.ipv4, "id -un");
  olcum(
    giris.status === 0 && giris.stdout.trim() === kayit.kullanici,
    "yönetici anahtarla giriyor",
    giris.stderr.trim(),
  );

  if (giris.status === 0) {
    const ayar = sshKomutu(kayit.ipv4, "sudo sshd -T").stdout;
    for (const satir of [
      "passwordauthentication no",
      "kbdinteractiveauthentication no",
      "permitrootlogin no",
      "x11forwarding no",
    ]) {
      olcum(ayar.split("\n").includes(satir), `sshd geçerli ayarı: ${satir}`);
    }
    // Deneme görüntüsü ölçümden sonra silinir, sunucuda iz kalmaz.
    const docker = sshKomutu(
      kayit.ipv4,
      "docker run --rm hello-world; durum=$?; docker image rm hello-world >/dev/null; exit $durum",
    );
    const dockerTamam = docker.status === 0 && docker.stdout.includes("Hello from Docker!");
    olcum(
      dockerTamam,
      "Docker bir kutu açıp çalıştırıyor",
      dockerTamam ? "" : docker.stderr.trim(),
    );
    // Sunucu yeniden başlayınca kutuları Docker açar; Docker'ın kendisi açılışta başlamalı (kart 0038).
    const acilis = sshKomutu(kayit.ipv4, "systemctl is-enabled docker.service");
    olcum(
      acilis.status === 0 && acilis.stdout.trim() === "enabled",
      "Docker sunucu açılışında kendiliğinden başlıyor",
      acilis.stdout.trim() || acilis.stderr.trim(),
    );
    // Veritabanı kutusunun gerçek ayarı tanımıyla karşılaştırılır (kart 0039).
    for (const ortam of veritabaniOrtamlari) {
      const ad = veritabaniKutusu(ortam);
      const kutu = sshKomutu(
        kayit.ipv4,
        `docker inspect ${ad} --format '${kutuOlcumBicimi}|{{.State.Health.Status}}|{{json .HostConfig.PortBindings}}'`,
      );
      const alanlar = kutu.stdout.trim().split("|");
      const [saglik = "", portlar = ""] = alanlar.slice(-2);
      const hatalar =
        kutu.status === 0
          ? [
              ...kutuKisitHatalari(
                alanlar.slice(0, -2).join("|"),
                veritabaniTanimi(ortam, []).services.veritabani,
              ),
              ...(saglik === "healthy" ? [] : [`sağlık ${saglik || "yok"}`]),
              ...(portuKapali(portlar) ? [] : [`açık port ${portlar}`]),
            ]
          : [kutu.stderr.trim() || "kutu yok"];
      olcum(
        hatalar.length === 0,
        `${ortam} veritabanı kutusu sağlıklı: kök olmayan kullanıcı, salt okunur, yetkisiz, yeniden başlayınca açılır, portu kapalı`,
        hatalar.join("; "),
      );
      const ayar = sshKomutu(
        kayit.ipv4,
        `sudo sha256sum ${veritabaniKlasoru(ortam)}/ayar/pg_hba.conf | cut -d" " -f1; docker inspect -f '{{range $ag, $_ := .NetworkSettings.Networks}}{{$ag}} {{end}}' ${ad}`,
      );
      const [ozet = "", aglar = ""] = ayar.stdout.trim().split("\n");
      const ayarHatalari = [
        ...(ozet.trim() === pgHbaOzeti()
          ? []
          : ["bağlantı kuralı dosyası projedekiyle aynı değil"]),
        ...(ayar.status === 0 && aglar.trim()
          ? agHatalari(aglar.trim().split(" "), ortam, siteListesiniOku(kayit.ipv4, ortam))
          : ["ağlar okunamadı"]),
      ];
      olcum(
        ayarHatalari.length === 0,
        `${ortam} veritabanı kutusunun bağlantı kuralı projedekiyle aynı, yalnız sitelerin ağlarına bağlı`,
        ayarHatalari.join("; "),
      );
      // Her sitenin kullanıcısı başka sitelerin üst bilgisini okuyamıyor (kart 0037, karar 0053).
      // Liste veritabanındandır: gizli bilgisi olup veritabanı açılmamış site kırmızı olmaz, listede olmayan
      // veritabanı denetimsiz kalmaz. Çift alt çizgili adlar geri yüklemenin ara veritabanlarıdır (gece.sh).
      const liste = sshKomutu(
        kayit.ipv4,
        `docker exec ${ad} psql -U postgres -d postgres -Atc "select datname from pg_database where datname like 'site\\_%' and datname not like '%\\_\\_%'"`,
      );
      olcum(
        liste.status === 0,
        `${ortam} sitelerin veritabanı listesi okunuyor`,
        liste.stderr.trim(),
      );
      for (const site of liste.stdout.trim().split("\n").filter(Boolean)) {
        const gecerli = /^site_[a-z0-9_]+$/.test(site);
        const acik = gecerli
          ? sshKomutu(
              kayit.ipv4,
              `docker exec -i ${guvenliOturum} ${ad} psql -U postgres -d ${site} -At -v ON_ERROR_STOP=1 <<'UST_BILGI_SONU'\n${ustBilgiAcikOlanlarSql(site)}\nUST_BILGI_SONU`,
            )
          : undefined;
        const hatalar = ustBilgiHatalari(acik?.status === 0, acik?.stdout ?? "");
        olcum(
          hatalar.length === 0,
          `${ortam}/${site} başka sitelerin sayaçlarını ve listelerini göremiyor`,
          hatalar.length === 0
            ? ""
            : `${hatalar.join("; ")}. Kapatmak: pnpm sunucu-veritabani siteler/<kod-adi> ${ortam}`,
        );
      }
    }
    // Hata izleme kutusunun gerçek ayarı tanımıyla aynı (kart 0022): kısıtlar, sağlık, kapalı
    // port, yalnız kendi ağı; ağ dışarıya kapalı (kutu internete çıkamaz).
    for (const ortam of hataIzlemeOrtamlari) {
      const kutu = sshKomutu(
        kayit.ipv4,
        `docker inspect ${hataIzlemeKutusu} --format '${kutuOlcumBicimi}|{{.State.Health.Status}}|{{json .HostConfig.PortBindings}}|{{range $ag, $_ := .NetworkSettings.Networks}}{{$ag}} {{end}}' && docker network inspect -f '{{.Internal}}|{{range .Containers}}{{.Name}} {{end}}' ${hataIzlemeAgi}`,
      );
      const [satir = "", agSatiri = ""] = kutu.stdout.trim().split("\n");
      const [kapali = "", uyeler = ""] = agSatiri.split("|");
      const alanlar = satir.split("|");
      const [saglik = "", portlar = "", aglar = ""] = alanlar.slice(-3);
      const hatalar =
        kutu.status === 0
          ? [
              ...kutuKisitHatalari(
                alanlar.slice(0, -3).join("|"),
                hataIzlemeTanimi(ortam).services.bugsink,
              ),
              ...(saglik === "healthy" ? [] : [`sağlık ${saglik || "yok"}`]),
              ...(portuKapali(portlar) ? [] : [`açık port ${portlar}`]),
              ...hataIzlemeAgHatalari(aglar.trim().split(" ")),
              ...(kapali.trim() === "true" ? [] : ["ağ dışarıya açık"]),
              ...hataIzlemeAgUyeHatalari(uyeler.trim().split(" ")),
            ]
          : [kutu.stderr.trim() || "kutu yok"];
      olcum(
        hatalar.length === 0,
        `${ortam} hata izleme kutusu sağlıklı: kök olmayan kullanıcı, salt okunur, yetkisiz, yeniden başlayınca açılır, portu kapalı, internete kapalı, ağında yalnız ön kapı`,
        hatalar.join("; "),
      );
    }
    // Yayındaki her sitenin kutusu tanımıyla aynı ayarla çalışıyor (kart 0021).
    const yayindakiler = yayindakiSiteleriOku(kayit.ipv4);
    const numaralar = siteNumaralariniOku();
    for (const [kodAdi, no] of Object.entries(yayindakiler)) {
      const ad = siteKutusuAdi(yayinOrtami, kodAdi, no);
      const numara = numaralar[kodAdi];
      const kutuHatalari = (
        kutuAdi: string,
        tanim: (numara: number) => Parameters<typeof kutuKisitHatalari>[1],
      ): string[] => {
        const kutu = sshKomutu(
          kayit.ipv4,
          `docker inspect ${kutuAdi} --format '${kutuOlcumBicimi}|{{.State.Health.Status}}|{{json .HostConfig.PortBindings}}'`,
        );
        const alanlar = kutu.stdout.trim().split("|");
        const [saglik = "", portlar = ""] = alanlar.slice(-2);
        if (numara === undefined) return ["site numarası yok (sunucu/site-kullanicilari.json)"];
        if (kutu.status !== 0) return [kutu.stderr.trim() || "kutu yok"];
        return [
          ...kutuKisitHatalari(alanlar.slice(0, -2).join("|"), tanim(numara)),
          ...(saglik === "healthy" ? [] : [`sağlık ${saglik || "yok"}`]),
          ...(portuKapali(portlar) ? [] : [`açık port ${portlar}`]),
        ];
      };
      // Kutunun bellek sınırı onu kuran yayının tanımındakidir (kart 0094): eski yayının kutusu sınırsızdır.
      const yayinKayitlari = yayinKayitlariniOku(kayit.ipv4, yayinOrtami, kodAdi);
      const bellek = etkinYayinBellegi(yayinKayitlari, no);
      const hatalar = kutuHatalari(ad, (n) =>
        kayittakiBellekle(yayinKutusuTanimi(yayinOrtami, kodAdi, n, no).services.uygulama, bellek),
      );
      olcum(
        hatalar.length === 0,
        `${yayinOrtami}/${kodAdi} yayındaki kutusu (${no}) sağlıklı: kendi kullanıcısı, salt okunur, yetkisiz, yeniden başlayınca açılır, portu kapalı`,
        hatalar.join("; "),
      );
      // Etkin yayının sürümü kayıttan okunur: bilgisayardaki kimlik daha yeni olabilir (kart 0031).
      const surum = etkinYayinSurumu(yayinKayitlari, no);
      if (surum === undefined || arkaPlanKutusuVarMi(surum)) {
        const arkaPlanHatalari = kutuHatalari(arkaPlanKutuAdi(ad), (n) =>
          kayittakiBellekle(
            yayinKutusuTanimi(yayinOrtami, kodAdi, n, no).services["arka-plan"],
            bellek,
          ),
        );
        olcum(
          arkaPlanHatalari.length === 0,
          `${yayinOrtami}/${kodAdi} arka plan kutusu (${no}) sağlıklı: kendi kullanıcısı, salt okunur, yetkisiz, yeniden başlayınca açılır, portu kapalı`,
          arkaPlanHatalari.join("; "),
        );
      }
      // Dosya klasörü (kart 0072, karar 0058): yalnız sitenin kullanıcısına açık, kutuya yazılabilir
      // bağlı. Klasörü taşımayan eski yayında aranmaz.
      if (numara !== undefined && (surum === undefined || dosyaKlasoruVarMi(surum))) {
        const klasor = sunucuDosyaKlasoru(yayinOrtami, kodAdi);
        const durum = sshKomutu(
          kayit.ipv4,
          `sudo stat -c '%a %u %F' ${klasor} 2>/dev/null || true`,
        );
        // Site ve arka plan kutusu aynı klasörü alır; ikisinin bağlantısı da ölçülür.
        const dosyaHatalari = [ad, arkaPlanKutuAdi(ad)].flatMap((kutu) => {
          const baglantilar = sshKomutu(
            kayit.ipv4,
            `docker inspect ${kutu} --format '{{json .Mounts}}'`,
          );
          return dosyaKlasoruHatalari(
            durum.stdout,
            baglantilar.stdout,
            kutuKullanicisi(yayinOrtami, numara),
            klasor,
          ).map((hata) => `${kutu}: ${hata}`);
        });
        olcum(
          dosyaHatalari.length === 0,
          `${yayinOrtami}/${kodAdi} dosya klasörü yalnız sitenin kullanıcısına açık (0700), iki kutuya da yazılabilir bağlı`,
          dosyaHatalari.join("; "),
        );
      }
      // Kuruluş tarifinin sunucu kayıtları (kart 0343): gizli bilgiler, veritabanı ve kullanıcısı, ağ,
      // yayın ve dosya klasörü, ön kapı satırı yerinde, sahibi ve izniyle. Tarife eklenen kayıt burada da ölçülür.
      if (numara !== undefined) {
        const tarif = sunucuKayitlari(yayinOrtami, kodAdi, numara, {
          dosyaKlasoru: surum === undefined || dosyaKlasoruVarMi(surum),
        });
        const sonuc = sshKomutu(kayit.ipv4, "bash -s", {
          girdi: kayitOlcumBetigi(yayinOrtami, tarif),
        });
        const tarifHatalari =
          sonuc.status === 0
            ? kayitHatalari(tarif, sonuc.stdout)
            : [sonuc.stderr.trim() || "ölçülemedi"];
        olcum(
          tarifHatalari.length === 0,
          `${yayinOrtami}/${kodAdi} kuruluş tarifinin sunucu kayıtları yerinde`,
          tarifHatalari.join("; "),
        );
      }
    }
    // Dosyalar sunucunun diskindedir (kart 0072, karar 0058); dolmadan nesne deposuna geçilir.
    const disk = sshKomutu(kayit.ipv4, "df -P /srv/altyapi");
    const doluluk = diskDolulugu(disk.stdout);
    olcum(
      doluluk !== undefined && doluluk < diskDolulukSiniri,
      `disk yüzde ${diskDolulukSiniri}'ten az dolu`,
      doluluk === undefined ? `okunamadı: ${disk.stderr.trim()}` : `yüzde ${doluluk}`,
    );
    const guncelleme = sshKomutu(
      kayit.ipv4,
      "systemctl is-active unattended-upgrades && apt-config dump",
    );
    olcum(
      guncelleme.status === 0 &&
        guncelleme.stdout.includes('APT::Periodic::Unattended-Upgrade "1";'),
      "güvenlik güncellemeleri kendiliğinden kuruluyor",
    );
    olcum(
      guncelleme.stdout.includes('Unattended-Upgrade::Automatic-Reboot "true";'),
      "gereken yeniden başlatma gece kendiliğinden yapılıyor",
    );
    // Bekleyen yeniden başlatmanın yaşı (saniye); bekleyen yoksa 0.
    // ssh düşerse çıktı boş gelir; boş çıktı "bekleyen yok" sayılmaz.
    const bekleyenSonuc = sshKomutu(
      kayit.ipv4,
      "f=/var/run/reboot-required; [ -f $f ] && echo $(( $(date +%s) - $(stat -c %Y $f) )) || echo 0",
    );
    const bekleyenMetin = bekleyenSonuc.stdout.trim();
    const bekleyen = /^\d+$/.test(bekleyenMetin) ? Number(bekleyenMetin) : Number.NaN;
    olcum(
      bekleyenSonuc.status === 0 && Number.isFinite(bekleyen) && bekleyen < yenidenBaslatmaSiniri,
      "bekleyen yeniden başlatma iki günden eski değil",
      bekleyen > 0 ? `${Math.round(bekleyen / 3600)} saattir bekliyor` : "",
    );
    const icDuvar = sshKomutu(kayit.ipv4, "sudo ufw status");
    olcum(icDuvar.stdout.includes("Status: active"), "içerideki duvar açık");

    // Gizli bilgiler (karar 0031): yerleşim ve izinler, sonra kayıtta geçmediği.
    const yerlesim = sshKomutu(
      kayit.ipv4,
      `sudo find ${gizliKok} -printf '%y %m %U %p\\n' 2>/dev/null || true`,
    );
    const yerlesimSorunlari = yerlesimHatalari(
      yerlesim.stdout.trim().split("\n"),
      siteNumaralariniOku(),
    );
    olcum(
      yerlesim.status === 0 && yerlesimSorunlari.length === 0,
      "gizli bilgi klasörleri ve dosyaları yalnız sahiplerine açık",
      yerlesimSorunlari.slice(0, 5).join("; "),
    );
    // Dosya izni ek erişim iznini (ACL) göstermez; ek izin hiç olmamalı.
    // getfacl başarısız olursa (araç yok, sudo hatası) ölçüm yeşil sayılmaz: çıkış kodu ayrı okunur.
    const ekIzin = sshKomutu(
      kayit.ipv4,
      `o=$(sudo getfacl -R -s -p ${gizliKok}) || exit 3; printf '%s' "$o" | grep -c . || true`,
    );
    olcum(
      ekIzin.status === 0 && ekIzin.stdout.trim() === "0",
      "gizli bilgilerde ek erişim izni (ACL) yok",
      ekIzin.status === 0 ? "" : ekIzin.stderr.trim(),
    );
    // Kayıt geçmişinin tamamı (bütün dallar, reflog, birleştirmeler, saklananlar), izlenen ve
    // kayıtsız dosyalar sunucuya gider; değerler sunucudan çıkmaz. .gitignore'dakiler (.env)
    // aranmaz: bilgisayarın geliştirme değerleridir, sunucudakilerle ilgisi yoktur.
    const git = (argumanlar: string[]) =>
      spawnSync("git", ["-C", kok, ...argumanlar], { encoding: "utf8", maxBuffer: 512 * 2 ** 20 });
    const gecmis = git(["log", "-p", "-m", "--all", "--reflog", "--no-color"]);
    const izlenen = git(["grep", "-h", "--no-color", "-I", "-e", ""]);
    const kayitsiz = git(["ls-files", "--others", "--exclude-standard", "-z"]);
    const kayitsizIcerik = kayitsiz.stdout
      .split("\0")
      .filter(Boolean)
      // İç içe depo, klasöre bağlantı gibi dosya olmayanlar atlanır.
      .filter((yol) => lstatSync(join(kok, yol)).isFile())
      .map((yol) => readFileSync(join(kok, yol), "utf8"))
      .join("\n");
    const arama = sshKomutu(kayit.ipv4, kayittaArama, {
      girdi: [gecmis.stdout, izlenen.stdout, kayitsizIcerik].join("\n"),
      sure: 600_000,
    });
    const sayilar = arama.stdout.match(/deger=(\d+) parca=(\d+) eslesme=(\d+)/);
    olcum(
      [gecmis, izlenen, kayitsiz].every((s) => s.status === 0) &&
        sayilar !== null &&
        Number(sayilar[1]) > 0 &&
        Number(sayilar[2]) === Number(sayilar[1]) * degerBasinaParca &&
        sayilar[3] === "0",
      "sunucudaki gizli değerler projenin kayıtlarında ve dosyalarında geçmiyor",
      sayilar ? `${sayilar[1]} değer, ${sayilar[3]} eşleşme` : arama.stderr.trim(),
    );
    const { erisim, gizli } = depoAnahtarlari();
    const sizinti = kayittaYedekSizintisi(
      [gecmis.stdout, izlenen.stdout, kayitsizIcerik].join("\n"),
      [erisim, gizli],
    );
    olcum(
      gecmis.stdout.length > 0 && sizinti.length === 0,
      "yedek deposu ve açma anahtarları projenin kayıtlarında ve dosyalarında geçmiyor",
      sizinti.join("; "),
    );
  }

  // Gece yedeği (karar 0037).
  const yedekSorunlari = yedekDenetimi(kayit.ipv4);
  olcum(
    yedekSorunlari.length === 0,
    "gece yedeği çalışıyor, son yedek 26 saatten yeni, depo ayrı veri merkezinde",
    yedekSorunlari.join("; "),
  );

  // Ön kapı ve deneme adresleri (karar 0032).
  console.log("ön kapı");
  await onKapiyiOlc(kayit, olcum);
  // Yayındaki sitelerin dışarıdan görünüşü (kart 0023).
  console.log("yayındaki siteler");
  await yayindakiSiteleriOlc(kayit, olcum);

  // Kapılar. IPv4'te bütün kapılar; IPv6'da ilk 1024 kapı ve bilinen kapılar (aynı duvar
  // kuralları iki adrese birlikte uygulanır, kuralların kendisi yukarıda Hetzner'den denetlendi).
  const tumu = Array.from({ length: 65535 }, (_, i) => i + 1);
  const ilk1024 = Array.from({ length: 1024 }, (_, i) => i + 1);
  const taramalar: [string, string, number[]][] = [
    ["IPv4", kayit.ipv4, hizli ? bilinenKapilar : tumu],
    ["IPv6", kayit.ipv6, hizli ? bilinenKapilar : [...new Set([...ilk1024, ...bilinenKapilar])]],
  ];
  for (const [ad, adres, kapilar] of taramalar) {
    // Boş adres verilirse Node bu bilgisayarı tarar; kayıt eksikse açıkça söylenir.
    if (!adres) {
      olcum(
        false,
        `${ad}: kayıtta adres yok, taranamadı`,
        "pnpm sunucu-kur --onayli kaydı yeniler",
      );
      continue;
    }
    // Denetimi çalıştıran ağda bu adres türü yoksa (ör. IPv6'sız ev ağı) tarama yapılamaz.
    // Sonuç bilinmediği için kırmızıdır, ama sorunun sunucuda değil bu ağda olduğu söylenir.
    if ((await kapiyaBak(adres, yonetimKapisi, 5000)) === "hata") {
      olcum(
        false,
        `${ad}: taranamadı, bu ağdan ${ad} adresine çıkılamıyor`,
        "sorun sunucuda değil; denetimi bu adres türünü destekleyen bir ağdan çalıştırın",
      );
      continue;
    }
    console.log(`tarama  ${ad}: ${kapilar.length} TCP kapısı dışarıdan deneniyor...`);
    const { durumlar, kopma } = await kapilariTara(adres, kapilar);
    const kapiSorunlari = kapiHatalari(durumlar);
    if (kopma > 0) kapiSorunlari.push(`tarama sırasında ${kopma} kez bağlantı kesildi`);
    const gorunen = [...durumlar].filter(([, d]) => d !== "yanitsiz").map(([k, d]) => `${k} ${d}`);
    olcum(
      kapiSorunlari.length === 0,
      `${ad}: dışarıdan yalnız gereken kapılar açık`,
      [...kapiSorunlari, `görünen: ${gorunen.slice(0, 10).join(", ") || "yok"}`].join("; "),
    );
  }

  return hatalar;
};

try {
  const kayitlar = kayitlariOku();
  if (kayitlar.length === 0)
    throw new Error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");
  console.log(`giriş anahtarı ${girisAnahtari}`);
  let hataSayisi = 0;
  for (const kayit of kayitlar)
    hataSayisi += (await denetle(kayit, process.argv.includes("--hizli"))).length;
  console.log(
    hataSayisi === 0 ? "\nDenetim yeşil." : `\nDenetim kırmızı: ${hataSayisi} ölçüm tutmadı.`,
  );
  if (hataSayisi > 0) process.exitCode = 1;
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
