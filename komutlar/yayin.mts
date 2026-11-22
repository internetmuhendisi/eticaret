// Sitenin sunucuya yayını ve geri dönüş (kart 0021, karar 0035). Komutlar (yayinla.mts,
// geri-don.mts, yayin-kaydi.mts, yayin-denemesi.mts) ve sunucu-gizli.mts bu dosyayı kullanır.
//
// - Yayın birimi: çekirdeğin görüntüsü + sitenin klasörü, ikisi de aynı kayıttan. Her yayının
//   numarası vardır; sunucuda kendi klasöründe (/srv/altyapi/yayin/<ortam>/<kod>/<no>/), kendi
//   görüntü etiketiyle (altyapi-yayin:<ortam>-<kod>-<no>) ve kendi kutusuyla (site-<ortam>-<kod>-<no>)
//   durur. etkin dosyası trafiği alan yayının numarasıdır.
// - Sıra: veritabanı değişiklikleri (0039), yeni kutu eski kutunun yanında açılır, sağlık ucu
//   kutunun içinden yoklanır, ön kapı yeni kutuya çevrilir, deneme adresi dışarıdan yoklanır,
//   eski kutu durdurulur. Bir adım geçmezse eski kutu hiç kesilmeden çalışmaya devam eder.
// - Yayın kaydı sunucuda, her site için ayrı dosyadadır (kayit.jsonl): her çalıştırma bir satır.
//   Geri dönüşün hedefi ve saklanacak yayınlar bu kayıttan hesaplanır.

import { spawnSync } from "node:child_process";
import type { Kimlik } from "../cekirdek/ayar-semasi/kimlik.ts";
import { hataIzlemeDegiskenleri } from "../cekirdek/izleme/hata-izleme-araci.ts";
import { dosyaKlasoruDegiskeni, kutudakiDosyaKlasoru } from "../cekirdek/kayitlar/dosya.ts";
import { siteOrtamiDegiskeni } from "../cekirdek/kayitlar/site.ts";
import {
  degisiklikKlasoru,
  type GeriDonusNotu,
  geriDonusNotlari,
} from "../cekirdek/veritabani/guncelle.ts";
import { goruntuyuDenetle } from "./cekirdek-goruntusu-denetle.mts";
import { kutuGizliTanimi, type Ortam, uretmeBetigi } from "./gizli-bilgi.mts";
import { projeAdresiniHazirla } from "./hata-izleme.mts";
import {
  arkaPlanKutuAdi,
  arkaPlanServisi,
  kaliciKutu,
  siteKutusuBellegi,
  siteKutusuBellekSiniri,
  siteSaglikYoklamasi,
} from "./kutu-kurali.mts";
import {
  denemeAdresi,
  kodAdiGecerli,
  onKapiyiKur,
  siteAgiAdi,
  siteKutusuAdi,
  yayindakiSiteleriOku,
  yayinKilidiyle,
  yayinKoku,
} from "./on-kapi.mts";
import { girisAnahtari, sshKomutu, sshSecenekleri, sunucuTanimi } from "./sunucu.mts";
import {
  goruntuyuGonder,
  sifreyiEsitle,
  siteVeritabaniniHazirla,
  sunucudaCalistir,
} from "./sunucu-veritabani.mts";
import {
  demoSitesi,
  projedekiSiteler,
  sunucudakiDemoAdresi,
  temaDemosuOrtami,
} from "./tema-demosu-adresi.mts";

// --- Adlar ve yerleşim ---

const kodAdiniDenetle = (kodAdi: string): string => {
  if (!kodAdiGecerli(kodAdi)) throw new Error(`Geçersiz kod adı: ${kodAdi}`);
  return kodAdi;
};
export const yayinKlasoru = (ortam: Ortam, kodAdi: string): string =>
  `${yayinKoku}/${ortam}/${kodAdiniDenetle(kodAdi)}`;
export const yayinGoruntusu = (ortam: Ortam, kodAdi: string, no: number): string =>
  `altyapi-yayin:${siteKutusuAdi(ortam, kodAdi, no).replace(/^site-/, "")}`;
const projeAdi = (ortam: Ortam, kodAdi: string, no: number): string =>
  `yayin-${siteKutusuAdi(ortam, kodAdi, no).replace(/^site-/, "")}`;

// Sitenin dosya klasörü (kart 0072, karar 0058): yalnız sitenin kutu kullanıcısına açık (0700),
// kutuya /dosyalar olarak bağlanır. Yayın klasöründen ayrıdır: yayınla değişmez, geri dönüşte kalır.
export const dosyaKoku = "/srv/altyapi/dosyalar";
export const sunucuDosyaKlasoru = (ortam: Ortam, kodAdi: string): string =>
  `${dosyaKoku}/${ortam}/${kodAdiniDenetle(kodAdi)}`;

// Sunucu denetiminin dosya klasörü kuralı. stat satırı: "%a %u %F" (izin, sahip, tür); bağlantılar:
// docker inspect --format '{{json .Mounts}}'.
export const dosyaKlasoruHatalari = (
  statSatiri: string,
  baglantilarJson: string,
  kullanici: number,
  klasor: string,
): string[] => {
  const hatalar: string[] = [];
  const [izin, sahip, ...tur] = statSatiri.trim().split(" ");
  if (tur.join(" ") !== "directory")
    hatalar.push(`klasör yok ya da klasör değil: ${statSatiri.trim() || "okunamadı"}`);
  else {
    if (izin !== "700") hatalar.push(`izin ${izin}, beklenen 700`);
    if (sahip !== String(kullanici)) hatalar.push(`sahibi ${sahip}, beklenen ${kullanici}`);
  }
  let baglantilar: { Source?: string; Destination?: string; RW?: boolean }[] = [];
  try {
    baglantilar = JSON.parse(baglantilarJson) ?? [];
  } catch {
    hatalar.push(`kutunun bağlantıları okunamadı: ${baglantilarJson.trim()}`);
  }
  const baglanti = baglantilar.find((b) => b.Destination === kutudakiDosyaKlasoru);
  if (baglanti === undefined) hatalar.push(`kutuda ${kutudakiDosyaKlasoru} bağlı değil`);
  else {
    if (baglanti.Source !== klasor)
      hatalar.push(`${kutudakiDosyaKlasoru} başka klasöre bağlı: ${baglanti.Source}`);
    if (baglanti.RW !== true) hatalar.push(`${kutudakiDosyaKlasoru} yazılamaz bağlı`);
  }
  return hatalar;
};

// Diskin doluluk sınırı (yüzde). Dosyalar sunucunun diskinde durur; dolarsa nesne deposuna geçilir
// (karar 0058). df -P çıktısının son satırı okunur.
export const diskDolulukSiniri = 85;
export const diskDolulugu = (dfCiktisi: string): number | undefined => {
  const yuzde = dfCiktisi.trim().split("\n").at(-1)?.split(/\s+/)[4];
  return yuzde !== undefined && /^[0-9]+%$/.test(yuzde) ? Number.parseInt(yuzde, 10) : undefined;
};

// Geri dönüş için saklanan son başarılı yayın sayısı (etkin olan dahil).
export const saklananYayinSayisi = 3;

// --- Sitenin kutusu ---

export const yayinKutusuTanimi = (
  ortam: Ortam,
  kodAdi: string,
  siteNumarasi: number,
  no: number,
  // Sitenin hata izleme projesinin gönderim adresi (kart 0022). Gizli değildir: tarayıcıya da
  // gider, yalnız o projeye hata göndermeye izin verir (karar 0036).
  hataIzlemeAdresi?: string,
  // Tema demosunun bu ortamdaki adresi (kart 0148): panelin "Demoyu gez" bağlantısı. Yoksa bağlantı çizilmez.
  temaDemosuAdresi?: string,
) => {
  const gizli = kutuGizliTanimi(ortam, kodAdi, siteNumarasi);
  const ag = siteAgiAdi(ortam, kodAdi);
  const uygulama = {
    image: yayinGoruntusu(ortam, kodAdi, no),
    container_name: siteKutusuAdi(ortam, kodAdi, no),
    ...kaliciKutu,
    ...siteKutusuBellekSiniri,
    user: gizli.servis.user,
    secrets: gizli.servis.secrets,
    // Kod adı klasör adıyla aynı olmalıdır (kimlik şeması), klasör aynı adla bağlanır.
    environment: {
      ...gizli.servis.environment,
      SITE_KLASORU: `/siteler/${kodAdi}`,
      [dosyaKlasoruDegiskeni]: kutudakiDosyaKlasoru,
      // Kutu ortamını bilir (kart 0104): bileşen kataloğu yalnız deneme ortamında açılır. Eski sürüm
      // değişkeni okumaz, zararsızdır.
      [siteOrtamiDegiskeni]: ortam,
      ...(hataIzlemeAdresi === undefined
        ? {}
        : {
            [hataIzlemeDegiskenleri.adres]: hataIzlemeAdresi,
            [hataIzlemeDegiskenleri.ortam]: ortam,
          }),
      ...temaDemosuOrtami(temaDemosuAdresi),
    },
    cap_drop: ["ALL"],
    cap_add: [] as string[],
    security_opt: ["no-new-privileges:true"],
    read_only: true,
    tmpfs: ["/tmp"],
    volumes: [
      `${yayinKlasoru(ortam, kodAdi)}/${no}/site:/siteler/${kodAdi}:ro`,
      `${sunucuDosyaKlasoru(ortam, kodAdi)}:${kutudakiDosyaKlasoru}`,
    ],
    networks: [ag],
    healthcheck: siteSaglikYoklamasi,
  };
  return {
    name: projeAdi(ortam, kodAdi, no),
    services: { uygulama, "arka-plan": arkaPlanServisi(uygulama) },
    secrets: gizli.gizliler,
    networks: { [ag]: { name: ag, external: true } },
  };
};

// --- Yayın kaydı ---

export type YayinKaydi = {
  no: number;
  tur: "yayin" | "geri-donus";
  // Trafiği alan yayının numarası (yayında kendisi, geri dönüşte dönülen yayın).
  etkin: number;
  kayit: string;
  surum: string;
  goruntu: string;
  zaman: string;
  sonuc: "basarili" | "basarisiz";
  neden?: string;
  // Yayın anında veritabanında uygulanmış değişiklik sayısı ve kayıttaki bütün değişikliklerin
  // geri dönüş notları. Veritabanına dokunulmadıysa null.
  degisiklikToplami: number | null;
  degisiklikNotlari: GeriDonusNotu[];
  // Yayının kutu tanımındaki bellek sınırı (kart 0094, karar 0165). Bu alandan önceki yayınların kutusu sınırsızdır;
  // geri dönüş yayının kendi tanımını açtığı için sunucu denetimi beklenen değeri buradan okur.
  bellekSiniri?: string;
};

export const kayitlariCoz = (metin: string): YayinKaydi[] =>
  metin
    .split("\n")
    .filter((satir) => satir.trim())
    .map((satir, sira) => {
      try {
        return JSON.parse(satir) as YayinKaydi;
      } catch {
        throw new Error(`Yayın kaydının ${sira + 1}. satırı okunamadı.`);
      }
    });

// Trafiğin geçtiği yayınların sırası: başarılı yayın üste eklenir, başarılı geri dönüş üsttekini
// kaldırır. Üstteki etkin yayındır, altındaki geri dönüşün hedefidir.
export const etkinYigini = (kayitlar: YayinKaydi[]): number[] => {
  const yigin: number[] = [];
  for (const kayit of kayitlar) {
    if (kayit.sonuc !== "basarili") continue;
    if (kayit.tur === "yayin") yigin.push(kayit.etkin);
    else yigin.pop();
  }
  return yigin;
};

// Etkin yayının sürümü: o yayını trafiğe veren son başarılı kaydın sürümü (yayında da geri
// dönüşte de kayıt dönülen yayının sürümünü taşır). Kayıt yoksa undefined. Sunucu denetimi
// sağlık ucunu bununla karşılaştırır (kart 0023): bilgisayardaki kimlik sonraki bir sürüme
// geçmiş olabilir, çalışan kutu ise kayıttaki sürümdedir.
export const etkinYayinSurumu = (kayitlar: YayinKaydi[], etkin: number): string | undefined =>
  kayitlar.findLast((kayit) => kayit.sonuc === "basarili" && kayit.etkin === etkin)?.surum;

// Etkin kutunun bellek sınırı: kutuyu kuran başarılı yayının kaydından (geri dönüş o yayının tanımını açar). Kayıt
// alanı taşımıyorsa kutu sınırsızdır.
export const etkinYayinBellegi = (kayitlar: YayinKaydi[], etkin: number): string | undefined =>
  kayitlar.find(
    (kayit) => kayit.tur === "yayin" && kayit.no === etkin && kayit.sonuc === "basarili",
  )?.bellekSiniri;

// Bugünkü kutu tanımının bellek sınırını yayının kaydındakiyle değiştirir (sunucu denetimi): kayıtta sınır yoksa
// tanımdan çıkar (kutu sınırsızdır), varsa bellek ve takasla birlikte bellek o değerdir.
export const kayittakiBellekle = <T extends { mem_limit?: string; memswap_limit?: string }>(
  tanim: T,
  bellek: string | undefined,
): Omit<T, "mem_limit" | "memswap_limit"> & { mem_limit?: string; memswap_limit?: string } => {
  const { mem_limit: _, memswap_limit: __, ...kalan } = tanim;
  return bellek === undefined ? kalan : { ...kalan, mem_limit: bellek, memswap_limit: bellek };
};

export const sonrakiNumara = (kayitlar: YayinKaydi[]): number =>
  Math.max(0, ...kayitlar.map((kayit) => kayit.no)) + 1;

// Geri dönüşün hedefi ve engeli. Veritabanında hedef yayından sonra uygulanmış değişikliklerden
// biri "yedekten" (ya da notsuz) ise dönülmez: eski kod yeni veritabanıyla çalışamayabilir.
export const geriDonusHedefi = (
  kayitlar: YayinKaydi[],
): { hedef: YayinKaydi; etkin: number } | { engel: string } => {
  const yigin = etkinYigini(kayitlar);
  const etkin = yigin.at(-1);
  const hedefNo = yigin.at(-2);
  if (etkin === undefined || hedefNo === undefined) {
    return { engel: "Dönülecek önceki bir başarılı yayın yok." };
  }
  const hedef = kayitlar.findLast(
    (kayit) => kayit.sonuc === "basarili" && kayit.tur === "yayin" && kayit.etkin === hedefNo,
  );
  if (!hedef || hedef.degisiklikToplami === null) {
    return { engel: `${hedefNo} numaralı yayının kaydı eksik.` };
  }
  const uygulananlar = kayitlar.filter((kayit) => kayit.degisiklikToplami !== null);
  const enYeni = uygulananlar.reduce<YayinKaydi | undefined>(
    (en, kayit) =>
      !en || (kayit.degisiklikToplami ?? 0) > (en.degisiklikToplami ?? 0) ? kayit : en,
    undefined,
  );
  const sonraGelenler = (enYeni?.degisiklikNotlari ?? []).slice(
    hedef.degisiklikToplami,
    enYeni?.degisiklikToplami ?? 0,
  );
  if (sonraGelenler.some((not) => not !== "geri alınabilir")) {
    return {
      engel: `${hedefNo} numaralı yayından sonra veritabanına geri alınamayan değişiklik uygulanmış ("yedekten"). Geri dönüş yedekten yapılmalı (kart 0024); hiçbir şeye dokunulmadı.`,
    };
  }
  return { hedef, etkin };
};

// Saklanacak yayınlar: etkin yığının son üçü. Geri kalanların klasörü ve görüntüsü silinir.
export const saklanacaklar = (kayitlar: YayinKaydi[]): number[] => [
  ...new Set(etkinYigini(kayitlar).slice(-saklananYayinSayisi)),
];

// --- Sunucuda çalışan betikler ---

const tekSatir = (metin: string): string => metin.replace(/\s+/g, " ").trim().slice(0, 400);

export const kayitlariOku = (ipv4: string, ortam: Ortam, kodAdi: string): YayinKaydi[] => {
  const dosya = `${yayinKlasoru(ortam, kodAdi)}/kayit.jsonl`;
  const sonuc = sshKomutu(ipv4, `sudo sh -c 'if [ -f ${dosya} ]; then cat ${dosya}; fi'`);
  if (sonuc.status !== 0) throw new Error(`Yayın kaydı okunamadı: ${sonuc.stderr.trim()}`);
  return kayitlariCoz(sonuc.stdout);
};

const kayitEkle = (ipv4: string, ortam: Ortam, kodAdi: string, kayit: YayinKaydi): void => {
  const k = yayinKlasoru(ortam, kodAdi);
  const satir = JSON.stringify(kayit);
  const sonuc = sshKomutu(
    ipv4,
    `sudo sh -c 'install -d -m 0755 -o root -g root ${yayinKoku} ${yayinKoku}/${ortam} ${k} && cat >> ${k}/kayit.jsonl'`,
    { girdi: `${satir}\n` },
  );
  if (sonuc.status !== 0) throw new Error(`Yayın kaydı yazılamadı: ${sonuc.stderr.trim()}`);
};

// Site klasörü bilgisayardan sunucudaki yayın klasörüne aktarılır; kök kullanıcıya aittir,
// kutu yalnız okuyabilir.
const klasoruYukle = (
  ipv4: string,
  ortam: Ortam,
  kodAdi: string,
  no: number,
  yerel: string,
): void => {
  const d = `${yayinKlasoru(ortam, kodAdi)}/${no}`;
  const uzak = `sudo sh -c 'set -e; rm -rf ${d}; install -d -m 0755 -o root -g root ${yayinKoku} ${yayinKoku}/${ortam} ${yayinKlasoru(ortam, kodAdi)} ${d} ${d}/site; tar -x --no-same-owner --no-same-permissions -C ${d}/site; chown -R root:root ${d}/site; chmod -R u=rwX,go=rX ${d}/site'`;
  const ssh = [
    "ssh",
    ...sshSecenekleri,
    "-i",
    girisAnahtari,
    "-o",
    "IdentitiesOnly=yes",
    `${sunucuTanimi.kullanici}@${ipv4}`,
    uzak,
  ];
  const sonuc = spawnSync("sh", ["-c", 'tar -C "$0" -cf - . | "$@"', yerel, ...ssh], {
    encoding: "utf8",
    timeout: 300_000,
  });
  if (sonuc.status !== 0) throw new Error(`Site klasörü aktarılamadı: ${sonuc.stderr.trim()}`);
};

// Yayının kutusunu açar ve sağlık ucunu kutunun içinden okur. Çıktının son satırı: saglik=<yanıt>.
export const kutuyuAcmaBetigi = (
  ortam: Ortam,
  kodAdi: string,
  no: number,
  tanim?: ReturnType<typeof yayinKutusuTanimi>,
  goruntuKimligi?: string,
): string => {
  const d = `${yayinKlasoru(ortam, kodAdi)}/${no}`;
  const kutu = siteKutusuAdi(ortam, kodAdi, no);
  const icerik = tanim ? `${JSON.stringify(tanim, null, 2)}\n` : "";
  // Dosya klasörü kutu açılmadan kurulur ya da sahibi ve izni yeniden verilir; içeriğine dokunulmaz.
  // Kullanıcı yayının kendi tanımından gelir. Tanımsız açılışta (geri dönüş) klasör zaten vardır.
  const kullanici = tanim?.services.uygulama.user.split(":")[0];
  if (kullanici !== undefined && !/^[0-9]+$/.test(kullanici)) {
    throw new Error(`Kutu kullanıcısı sayı değil: ${kullanici}`);
  }
  const dosyaKlasoruKurulumu =
    kullanici === undefined
      ? ""
      : `sudo install -d -m 0755 -o root -g root ${dosyaKoku} ${dosyaKoku}/${ortam}
sudo install -d -m 0700 -o ${kullanici} -g ${kullanici} ${sunucuDosyaKlasoru(ortam, kodAdi)}
`;
  if (icerik.includes("YAYIN_DOSYA_SONU")) throw new Error("Kutu tanımı ayrılmış satır içeriyor.");
  return `set -eu
d=${d}
${tanim ? `sudo tee "$d/compose.json" >/dev/null <<'YAYIN_DOSYA_SONU'\n${icerik}YAYIN_DOSYA_SONU\nsudo chmod 0644 "$d/compose.json"` : '[ -f "$d/compose.json" ] || { echo "HATA yayının kutu tanımı yok: $d" >&2; exit 1; }'}
${goruntuKimligi ? `docker tag ${goruntuKimligi} ${yayinGoruntusu(ortam, kodAdi, no)}` : `docker image inspect ${yayinGoruntusu(ortam, kodAdi, no)} >/dev/null 2>&1 || { echo "HATA yayının görüntüsü yok" >&2; exit 1; }`}
${dosyaKlasoruKurulumu}h=$(mktemp)
trap 'rm -f "$h"' EXIT
if ! docker compose -f "$d/compose.json" up -d --wait --wait-timeout 150 --quiet-pull </dev/null >/dev/null 2>"$h"; then
  echo "HATA yeni kutu sağlıklı açılmadı:" >&2
  tail -3 "$h" >&2
  docker logs --tail 5 ${kutu} >&2 2>&1 || true
  docker logs --tail 5 ${arkaPlanKutuAdi(kutu)} >&2 2>&1 || true
  exit 1
fi
printf 'saglik=%s\\n' "$(docker exec ${kutu} node -e "fetch('http://127.0.0.1:3000/kapi/herkese-acik/saglik').then((y)=>y.text()).then((t)=>process.stdout.write(t),()=>process.stdout.write('{}'))")"
`;
};

// Yayının kutusunu durdurur; klasörü ve görüntüsü kalır (geri dönüş için).
export const kutuyuDurdurmaBetigi = (ortam: Ortam, kodAdi: string, no: number): string => {
  const d = `${yayinKlasoru(ortam, kodAdi)}/${no}`;
  return `set -u
if [ -f ${d}/compose.json ]; then docker compose -f ${d}/compose.json down --timeout 10 </dev/null >/dev/null 2>&1 || true; fi
docker rm -f ${siteKutusuAdi(ortam, kodAdi, no)} ${arkaPlanKutuAdi(siteKutusuAdi(ortam, kodAdi, no))} >/dev/null 2>&1 || true
`;
};

// Yayını bütünüyle siler: kutu, görüntü etiketi, klasör.
export const yayiniSilmeBetigi = (ortam: Ortam, kodAdi: string, no: number): string =>
  `${kutuyuDurdurmaBetigi(ortam, kodAdi, no)}docker image rm ${yayinGoruntusu(ortam, kodAdi, no)} >/dev/null 2>&1 || true
sudo rm -rf ${yayinKlasoru(ortam, kodAdi)}/${no}
`;

// Sunucudaki yayın klasörlerinin numaraları. Okunamazsa hata: numara ve temizlik buna dayanır.
const sunucudakiYayinlar = (ipv4: string, ortam: Ortam, kodAdi: string): number[] => {
  const k = yayinKlasoru(ortam, kodAdi);
  const liste = sshKomutu(
    ipv4,
    `sudo sh -c 'if [ -d ${k} ]; then for d in ${k}/*/; do [ -d "$d" ] && basename "$d"; done; fi; true'`,
  );
  if (liste.status !== 0) throw new Error(`Yayın klasörleri okunamadı: ${liste.stderr.trim()}`);
  return liste.stdout
    .split("\n")
    .map((satir) => satir.trim())
    .filter((ad) => /^[1-9]\d*$/.test(ad))
    .map(Number);
};

// Yeni yayının numarası kayıttan, sunucudaki klasörlerden ve etkin yayından büyüktür: kayıt
// yazılamamış bir yayının numarası yeniden verilmez, çalışan kutunun klasörü silinmez.
export const yeniNumara = (kayitlar: YayinKaydi[], klasorler: number[], etkin?: number): number =>
  Math.max(sonrakiNumara(kayitlar), Math.max(0, ...klasorler, etkin ?? 0) + 1);

const etkinYaz = (ipv4: string, ortam: Ortam, kodAdi: string, no: number): void => {
  const sonuc = sshKomutu(
    ipv4,
    `sudo sh -c 'printf "%s\\n" ${no} > ${yayinKlasoru(ortam, kodAdi)}/.etkin.yeni && mv -f ${yayinKlasoru(ortam, kodAdi)}/.etkin.yeni ${yayinKlasoru(ortam, kodAdi)}/etkin'`,
  );
  if (sonuc.status !== 0) throw new Error(`etkin yazılamadı: ${sonuc.stderr.trim()}`);
};

// etkin yazıldı mı, sunucudan yeniden okunarak anlaşılır: yazma sunucuda olup bağlantı sonra
// koparsa yayın başarılı sayılır (etkin yeni yayını gösterirken yeni yayın silinmez).
const etkinYazVeDogrula = (ipv4: string, ortam: Ortam, kodAdi: string, no: number): void => {
  try {
    etkinYaz(ipv4, ortam, kodAdi, no);
  } catch (hata) {
    let sunucudaki: number | undefined;
    try {
      sunucudaki = yayindakiSiteleriOku(ipv4)[kodAdi];
    } catch {
      throw new Error(
        `${tekSatir((hata as Error).message)}; etkin dosyası da okunamadı, elle bakılmalı: ${yayinKlasoru(ortam, kodAdi)}/etkin`,
      );
    }
    if (sunucudaki !== no) throw hata;
  }
};

// --- Sağlık ---

type Saglik = { cekirdekSurumu?: string; veritabani?: string };

export const saglikCoz = (metin: string): Saglik => {
  try {
    const yanit = JSON.parse(metin) as { veri?: Saglik };
    return yanit.veri ?? {};
  } catch {
    return {};
  }
};

export const saglikHatasi = (saglik: Saglik, surum: string): string | undefined => {
  if (saglik.cekirdekSurumu !== surum) {
    return `sağlık ucu sürümü ${saglik.cekirdekSurumu ?? "söylemiyor"}, beklenen ${surum}`;
  }
  if (saglik.veritabani !== "ayakta") {
    return `sağlık ucu veritabanını ${saglik.veritabani ?? "bilmiyor"} gösteriyor`;
  }
  return undefined;
};

// Deneme adresini dışarıdan, ön kapı üzerinden ve şifreli bağlantıyla ister. Ad çözümlemesine
// bağlı kalmamak için doğrudan sunucunun adresine bağlanılır, sertifika adla denetlenir. Gövde
// yazı olarak ve bayt bayt (ham; logo gibi ikili dosyalar için, kart 0209) döner.
export const disaridanIste = async (
  ipv4: string,
  kodAdi: string,
  yol: string,
): Promise<{ durum: number; govde: string; ham: Buffer }> => {
  const { request } = await import("node:https");
  const adres = denemeAdresi(kodAdi);
  return new Promise((coz) => {
    const istek = request(
      { host: ipv4, servername: adres, port: 443, path: yol, headers: { host: adres } },
      (yanit) => {
        const parcalar: Buffer[] = [];
        yanit.on("data", (parca: Buffer) => {
          parcalar.push(parca);
        });
        yanit.on("end", () => {
          const ham = Buffer.concat(parcalar);
          coz({ durum: yanit.statusCode ?? 0, govde: ham.toString("utf8"), ham });
        });
      },
    );
    istek.on("error", () => coz({ durum: 0, govde: "", ham: Buffer.alloc(0) }));
    istek.setTimeout(10_000, () => istek.destroy());
    istek.end();
  });
};

// Sağlık ucu dışarıdan beklenen sürümü söyleyene kadar bekler (ilk yayında sertifika alınır).
const disaridanSaglik = async (
  ipv4: string,
  kodAdi: string,
  surum: string,
): Promise<string | undefined> => {
  let hata: string | undefined = "yanıt yok";
  for (let deneme = 0; deneme < 45 && hata; deneme++) {
    const yanit = await disaridanIste(ipv4, kodAdi, "/kapi/herkese-acik/saglik");
    hata =
      yanit.durum === 200
        ? saglikHatasi(saglikCoz(yanit.govde), surum)
        : `deneme adresi ${yanit.durum || "yanıt vermedi"}`;
    if (hata) await new Promise((bekle) => setTimeout(bekle, 2000));
  }
  return hata;
};

// --- Yayın ---

export type YayinGirdisi = {
  ipv4: string;
  ortam: Ortam;
  kimlik: Kimlik;
  siteNumarasi: number;
  // Bilgisayardaki site klasörü (yayınlanacak kayıttan çıkarılmış).
  klasor: string;
  // Bilgisayardaki görüntü etiketi ve görüntünün üretildiği kayıt.
  etiket: string;
  kayit: string;
  yaz?: (satir: string) => void;
};

const zaman = (): string => new Date().toISOString();
const hataMetni = (hata: unknown): string => tekSatir((hata as Error).message);

// Trafik yeni kutuya geçtikten sonraki adımlar (eski kutuyu durdurmak, eski yayınları silmek)
// yayının sonucunu değiştirmez: düşerlerse kayda uyarı olarak yazılır.
const sonAdim = (kayit: YayinKaydi, ad: string, adim: () => void): void => {
  try {
    adim();
  } catch (hata) {
    const uyari = `uyarı: ${ad}: ${hataMetni(hata)}`;
    kayit.neden = kayit.neden ? `${kayit.neden} | ${uyari}` : uyari;
  }
};

export const yayinla = (girdi: YayinGirdisi): Promise<YayinKaydi> =>
  yayinKilidiyle(girdi.ipv4, () => yayinlaKilitli(girdi));

const yayinlaKilitli = async (girdi: YayinGirdisi): Promise<YayinKaydi> => {
  const { ipv4, ortam, kimlik, siteNumarasi } = girdi;
  const { kodAdi, cekirdekSurumu: surum } = kimlik;
  const yaz = girdi.yaz ?? (() => {});
  const kayitlar = kayitlariOku(ipv4, ortam, kodAdi);
  const siteler = yayindakiSiteleriOku(ipv4);
  const onceki = siteler[kodAdi];
  const no = yeniNumara(kayitlar, sunucudakiYayinlar(ipv4, ortam, kodAdi), onceki);
  const notlar = geriDonusNotlari(degisiklikKlasoru);
  const kayit: YayinKaydi = {
    no,
    tur: "yayin",
    etkin: no,
    kayit: girdi.kayit,
    surum,
    goruntu: "",
    zaman: zaman(),
    sonuc: "basarisiz",
    degisiklikToplami: null,
    degisiklikNotlari: notlar,
    bellekSiniri: siteKutusuBellegi,
  };
  let kutuAcildi = false;
  let onKapiDegisti = false;
  let trafikGecti = false;
  try {
    yaz(`yayın       ${ortam}/${kodAdi} ${no} (sürüm ${surum}, kayıt ${girdi.kayit.slice(0, 12)})`);
    const hatalar = goruntuyuDenetle(girdi.etiket);
    if (hatalar.length > 0) throw new Error(`Görüntü denetimden geçmedi: ${hatalar.join("; ")}`);
    // Panelin "Demoyu gez" bağlantısı (kart 0148): demo sitesi projenin siteler/ klasöründen bulunur. Birden çok
    // demo varsa sunucuya dokunulmadan durulur.
    const temaDemosuAdresi = sunucudakiDemoAdresi(demoSitesi(projedekiSiteler()), ortam);
    // Hataları izlenmeyen bir site yayına çıkmaz: proje hazırlanamazsa yayın durur (kart 0022).
    // Veritabanı değişikliklerinden önce: araç yanıt vermezse veritabanına hiç dokunulmamış olur.
    const hataIzlemeAdresi = projeAdresiniHazirla(ipv4, ortam, kodAdi);
    yaz(`hazır       ${ortam}/${kodAdi} hata izleme projesi`);
    // Değişiklik adımı yarıda kalırsa hepsi uygulanmış sayılır: geri dönüş "yedekten" notunu kaçırmaz.
    kayit.degisiklikToplami = notlar.length;
    const { toplam } = siteVeritabaniniHazirla(
      ipv4,
      ortam,
      { kodAdi, numara: siteNumarasi, surum, etiket: girdi.etiket },
      yaz,
    );
    kayit.degisiklikToplami = toplam;
    const { kimlik: goruntu } = goruntuyuGonder(ipv4, girdi.etiket);
    kayit.goruntu = goruntu;

    kutuAcildi = true;
    klasoruYukle(ipv4, ortam, kodAdi, no, girdi.klasor);
    const cikti = sunucudaCalistir(
      ipv4,
      kutuyuAcmaBetigi(
        ortam,
        kodAdi,
        no,
        yayinKutusuTanimi(ortam, kodAdi, siteNumarasi, no, hataIzlemeAdresi, temaDemosuAdresi),
        goruntu,
      ),
    );
    const icHata = saglikHatasi(saglikCoz(cikti.match(/^saglik=(.*)$/m)?.[1] ?? ""), surum);
    if (icHata) throw new Error(`yeni kutu: ${icHata}`);
    yaz(`sağlıklı    ${siteKutusuAdi(ortam, kodAdi, no)}`);
    onKapiDegisti = true;
    onKapiyiKur(ipv4, { ...siteler, [kodAdi]: no });
    const disHata = await disaridanSaglik(ipv4, kodAdi, surum);
    if (disHata) throw new Error(`deneme adresi: ${disHata}`);
    etkinYazVeDogrula(ipv4, ortam, kodAdi, no);
    trafikGecti = true;
    kayit.sonuc = "basarili";
    yaz(`trafik      ${denemeAdresi(kodAdi)} → ${no}`);
  } catch (hata) {
    kayit.neden = hataMetni(hata);
    // Trafik eskisine geri verilir, yeni kutu ve yayın silinir; eski kutuya dokunulmaz.
    if (onKapiDegisti) {
      try {
        onKapiyiKur(ipv4, siteler);
      } catch (geri) {
        kayit.neden += ` | ön kapı eski hâline döndürülemedi (kurtarma: pnpm sunucu-kur --onayli): ${hataMetni(geri)}`;
      }
    }
    if (kutuAcildi) sshKomutu(ipv4, "bash -s", { girdi: yayiniSilmeBetigi(ortam, kodAdi, no) });
  }
  if (trafikGecti) {
    if (onceki !== undefined) {
      sonAdim(kayit, "eski kutu durdurulamadı", () =>
        sunucudaCalistir(ipv4, kutuyuDurdurmaBetigi(ortam, kodAdi, onceki)),
      );
    }
    sonAdim(kayit, "eski yayınlar silinemedi", () => {
      const saklanan = saklanacaklar([...kayitlar, kayit]);
      for (const eski of sunucudakiYayinlar(ipv4, ortam, kodAdi)) {
        if (!saklanan.includes(eski))
          sunucudaCalistir(ipv4, yayiniSilmeBetigi(ortam, kodAdi, eski));
      }
    });
  }
  kayit.zaman = zaman();
  kayitEkle(ipv4, ortam, kodAdi, kayit);
  return kayit;
};

// --- Geri dönüş ---

export const geriDon = (girdi: {
  ipv4: string;
  ortam: Ortam;
  kodAdi: string;
  yaz?: (satir: string) => void;
}): Promise<YayinKaydi> => yayinKilidiyle(girdi.ipv4, () => geriDonKilitli(girdi));

const geriDonKilitli = async (girdi: {
  ipv4: string;
  ortam: Ortam;
  kodAdi: string;
  yaz?: (satir: string) => void;
}): Promise<YayinKaydi> => {
  const { ipv4, ortam, kodAdi } = girdi;
  const yaz = girdi.yaz ?? (() => {});
  const kayitlar = kayitlariOku(ipv4, ortam, kodAdi);
  const siteler = yayindakiSiteleriOku(ipv4);
  const no = yeniNumara(kayitlar, sunucudakiYayinlar(ipv4, ortam, kodAdi), siteler[kodAdi]);
  const sonuc = geriDonusHedefi(kayitlar);
  const hedef = "hedef" in sonuc ? sonuc.hedef : undefined;
  const kayit: YayinKaydi = {
    no,
    tur: "geri-donus",
    etkin: hedef?.etkin ?? 0,
    kayit: hedef?.kayit ?? "",
    surum: hedef?.surum ?? "",
    goruntu: hedef?.goruntu ?? "",
    zaman: zaman(),
    sonuc: "basarisiz",
    degisiklikToplami: null,
    degisiklikNotlari: [],
  };
  let onKapiDegisti = false;
  let kutuAcildi = false;
  let trafikGecti = false;
  try {
    if ("engel" in sonuc) throw new Error(sonuc.engel);
    const { hedef, etkin } = sonuc;
    if (siteler[kodAdi] !== etkin) {
      throw new Error(
        `Sunucudaki etkin yayın (${siteler[kodAdi] ?? "yok"}) kayıttakiyle (${etkin}) aynı değil; hiçbir şeye dokunulmadı.`,
      );
    }
    if (!sunucudakiYayinlar(ipv4, ortam, kodAdi).includes(hedef.etkin)) {
      throw new Error(`${hedef.etkin} numaralı yayın sunucuda saklanmıyor; geri dönülemez.`);
    }
    yaz(`geri dönüş ${ortam}/${kodAdi} ${etkin} → ${hedef.etkin} (sürüm ${hedef.surum})`);
    kutuAcildi = true;
    const cikti = sunucudaCalistir(ipv4, kutuyuAcmaBetigi(ortam, kodAdi, hedef.etkin));
    const icHata = saglikHatasi(saglikCoz(cikti.match(/^saglik=(.*)$/m)?.[1] ?? ""), hedef.surum);
    if (icHata) throw new Error(`dönülen kutu: ${icHata}`);
    onKapiDegisti = true;
    onKapiyiKur(ipv4, { ...siteler, [kodAdi]: hedef.etkin });
    const disHata = await disaridanSaglik(ipv4, kodAdi, hedef.surum);
    if (disHata) throw new Error(`deneme adresi: ${disHata}`);
    etkinYazVeDogrula(ipv4, ortam, kodAdi, hedef.etkin);
    trafikGecti = true;
    kayit.sonuc = "basarili";
    yaz(`trafik      ${denemeAdresi(kodAdi)} → ${hedef.etkin}`);
  } catch (hata) {
    kayit.neden = hataMetni(hata);
    if (onKapiDegisti) {
      try {
        onKapiyiKur(ipv4, siteler);
      } catch (geri) {
        kayit.neden += ` | ön kapı eski hâline döndürülemedi (kurtarma: pnpm sunucu-kur --onayli): ${hataMetni(geri)}`;
      }
    }
    // Dönülen yayının kutusu durdurulur; klasörü ve görüntüsü kalır.
    if (kutuAcildi && hedef) {
      sshKomutu(ipv4, "bash -s", { girdi: kutuyuDurdurmaBetigi(ortam, kodAdi, hedef.etkin) });
    }
  }
  if (trafikGecti && "etkin" in sonuc) {
    sonAdim(kayit, "eski kutu durdurulamadı", () =>
      sunucudaCalistir(ipv4, kutuyuDurdurmaBetigi(ortam, kodAdi, sonuc.etkin)),
    );
  }
  kayit.zaman = zaman();
  kayitEkle(ipv4, ortam, kodAdi, kayit);
  return kayit;
};

// Yayındaki kutuyu yeniden başlatır (gizli bilgi yenilenince, sunucu-gizli.mts). Kutu yoksa false.
// Sitenin gizli bilgilerini yeniler ve veritabanı şifresini aynı adımda eşitler (kart 0039). Yayın
// kilidinin içinde çağrılır; yayındaki kutuyu çağıran yeniden başlatır (sunucu-gizli.mts, yedek.mts).
export const gizliyiYenileVeEsitle = (
  ipv4: string,
  ortam: Ortam,
  kodAdi: string,
  numara: number,
  yaz: (satir: string) => void,
): void => {
  const calisma = sshKomutu(ipv4, "bash -s", {
    girdi: uretmeBetigi(ortam, kodAdi, numara, { yenile: true }),
  });
  for (const satir of calisma.stdout.split("\n")) if (satir.trim()) yaz(satir);
  if (calisma.status !== 0) throw new Error(`Sunucuda kurulamadı: ${calisma.stderr.trim()}`);
  yaz(
    sifreyiEsitle(ipv4, ortam, kodAdi)
      ? `eşitlendi   ${ortam}/${kodAdi} veritabanı şifresi`
      : `bilgi       ${ortam} ortamında veritabanı kutusu yok, şifre eşitlenmedi`,
  );
};

export const etkinKutuyuYenidenBaslat = (ipv4: string, ortam: Ortam, kodAdi: string): boolean => {
  const no = yayindakiSiteleriOku(ipv4)[kodAdi];
  if (no === undefined) return false;
  const kutu = siteKutusuAdi(ortam, kodAdi, no);
  const arkaPlan = arkaPlanKutuAdi(kutu);
  // Eski sürüme dönülmüş yayında arka plan kutusu olmayabilir.
  sunucudaCalistir(
    ipv4,
    `set -eu\ndocker restart --timeout 10 ${kutu} >/dev/null\nif docker inspect ${arkaPlan} >/dev/null 2>&1; then docker restart --timeout 10 ${arkaPlan} >/dev/null; fi\n`,
  );
  return true;
};
