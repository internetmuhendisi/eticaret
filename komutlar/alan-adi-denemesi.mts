// Asıl adresin gerçek sunucuda baştan sona denenmesi (kart 0344, karar 0202).
//
//   pnpm alan-adi-denemesi            Hiçbir şeyi değiştirmez, yapılacakları söyler.
//   pnpm alan-adi-denemesi --onayli   Dener ve sonunda her şeyi kaldırır.
//
// Geçici bir alt adres (kapi--deneme.eticaretmagazasi.com) altyapının iki tireli adıdır, hiçbir site bu adı
// alamaz. Komut alan adına onun A ve AAAA kaydını açar, adres sunucuya çözülene kadar bekler, ön kapıya asıl
// adres satırını ve ona yönlenen geçici bir deneme adresini (kapi--deneme.deneme.eticaretmagazasi.com) yoklama
// kutusuna bağlı olarak ekler, sertifikayı bekler, sunucu denetiminin asıl adres ölçümlerini çalıştırır. Sonunda,
// deneme düşse de, ön kapıyı yeniden kurar (geçici satırlar silinir) ve iki kaydı siler, ikisinin de gittiğini
// ölçer. Alan adı değişikliği geri alınamaz sayılır: --onayli yalnız kullanıcının onayından sonra yazılır.

import { alanAdiPlani, type KayitIstegi } from "./alan-adi-plani.mts";
import { bolgeyiBul, isiUygula, kayitlariGetir } from "./cloudflare.mts";
import {
  adCozumleri,
  adCozumuBetigi,
  altyapiAlanAdi,
  cozulmeHatasi,
  denemeAlani,
  denemeYonlendirmeSatiri,
  onKapiKlasoru,
  onKapiSatirDosyasi,
  onKapiyiKur,
  siteSatiri,
  yayinKilidiyle,
  yoklamaHedefi,
} from "./on-kapi.mts";
import { asilAdresiOlc } from "./on-kapi-olcumleri.mts";
import { kayitlariOku, sshKomutu } from "./sunucu.mts";

const satirAdi = "kapi--deneme";
const asil = `${satirAdi}.${altyapiAlanAdi}`;
const deneme = `${satirAdi}.${denemeAlani}`;
const aciklama = "altyapi: alan adı denemesi (kart 0344)";

const bekle = (ms: number) => new Promise((coz) => setTimeout(coz, ms));

const calis = async (onayli: boolean): Promise<boolean> => {
  const [sunucu] = kayitlariOku();
  if (!sunucu?.ipv4 || !sunucu.ipv6) throw new Error("sunucu/sunucular.json'da sunucu yok.");
  const istenenler: KayitIstegi[] = [
    { type: "A", name: asil, content: sunucu.ipv4, proxied: false, comment: aciklama },
    { type: "AAAA", name: asil, content: sunucu.ipv6, proxied: false, comment: aciklama },
  ];
  const bolge = await bolgeyiBul();
  const mevcut = await kayitlariGetir(bolge.id, [asil], [aciklama]);
  const acilis = alanAdiPlani(istenenler, mevcut, aciklama);
  if (acilis.hatalar.length > 0) throw new Error(acilis.hatalar.join("\n"));
  for (const is of acilis.isler) console.log(is.metin);
  console.log(`ön kapı     ${asil} ve ${deneme} geçici olarak yoklama kutusuna bağlanacak`);
  if (!onayli) {
    console.log("Hiçbir şey değiştirilmedi. Onaydan sonra: pnpm alan-adi-denemesi --onayli");
    return true;
  }

  const sonuclar: { tamam: boolean; metin: string; ayrinti: string }[] = [];
  const olcum = (tamam: boolean, metin: string, ayrinti = "") => {
    sonuclar.push({ tamam, metin, ayrinti });
    console.log(
      `${tamam ? "tamam" : "HATA "}  ${metin}${ayrinti && !tamam ? ` (${ayrinti})` : ""}`,
    );
  };
  try {
    for (const is of acilis.isler) {
      await isiUygula(bolge.id, is);
      console.log(`yapıldı     ${is.metin.slice(12)}`);
    }
    // Sunucunun çözücüsü yeni adı görene kadar beklenir (ön kapı çözülmeyen adı eklemez, karar 0202).
    let cozulme: string | undefined = "denenmedi";
    for (let i = 0; i < 40 && cozulme; i++) {
      if (i > 0) await bekle(15_000);
      const cikti = sshKomutu(sunucu.ipv4, "bash -s", { girdi: adCozumuBetigi([asil]) }).stdout;
      const { v4 = [], v6 = [] } = adCozumleri(cikti).get(asil) ?? {};
      cozulme = cozulmeHatasi(v4, v6, sunucu.ipv4, sunucu.ipv6);
    }
    olcum(cozulme === undefined, `${asil} sunucunun çözücüsünde sunucuya çözülüyor`, cozulme ?? "");
    if (cozulme) return sonuclar.every((s) => s.tamam);

    const satirlar = [
      denemeYonlendirmeSatiri(deneme, asil, yoklamaHedefi),
      siteSatiri(asil, yoklamaHedefi, { ad: "Alan adı denemesi" }),
    ].join("\n");
    await yayinKilidiyle(sunucu.ipv4, () =>
      onKapiyiKur(sunucu.ipv4, undefined, { [satirAdi]: satirlar }),
    );
    console.log(`kuruldu     ön kapıda ${asil} ve ${deneme}`);

    // Sertifika ilk istekte alınır; Caddy'nin işi bitene kadar beklenir.
    let acik = false;
    for (let i = 0; i < 24 && !acik; i++) {
      if (i > 0) await bekle(5000);
      const sonuc = sshKomutu(
        sunucu.ipv4,
        `curl -s -o /dev/null -w '%{http_code}' --max-time 10 --resolve ${asil}:443:127.0.0.1 https://${asil}/ || true`,
      );
      acik = sonuc.stdout.trim() === "200";
    }
    olcum(acik, `${asil} sertifikasını aldı ve şifreli açılıyor`);
    await asilAdresiOlc(sunucu, olcum, {
      onek: "alan adı denemesi",
      asil: { tur: "alt", ad: asil },
      deneme,
      aramaAcik: false,
    });
  } finally {
    // Deneme düşse de geçici satırlar ve kayıtlar kaldırılır; biri düşse de öteki denenir. Komut kesilirse
    // (Ctrl-C) bir sonraki çalıştırma kalan kayıtları görür ve sonunda kaldırır.
    try {
      await yayinKilidiyle(sunucu.ipv4, () => onKapiyiKur(sunucu.ipv4));
      const satirKaldi = sshKomutu(
        sunucu.ipv4,
        `sudo test -e ${onKapiKlasoru}/${onKapiSatirDosyasi(satirAdi)} && echo var || echo yok`,
      ).stdout.trim();
      olcum(satirKaldi === "yok", "geçici ön kapı satırı kaldırıldı", satirKaldi);
    } catch (hata) {
      olcum(
        false,
        "geçici ön kapı satırı kaldırıldı",
        `${(hata as Error).message}; kurtarma: pnpm sunucu-kur --onayli`,
      );
    }
    try {
      const kalan = await kayitlariGetir(bolge.id, [asil], [aciklama]);
      for (const is of alanAdiPlani([], kalan, aciklama).isler) {
        await isiUygula(bolge.id, is);
        console.log(`yapıldı     ${is.metin.slice(12)}`);
      }
      const sonra = await kayitlariGetir(bolge.id, [asil], [aciklama]);
      olcum(
        sonra.length === 0,
        `${asil} kayıtları kaldırıldı`,
        sonra.map((k) => k.type).join(", "),
      );
    } catch (hata) {
      olcum(
        false,
        `${asil} kayıtları kaldırıldı`,
        `${(hata as Error).message}; yeniden: pnpm alan-adi-denemesi --onayli`,
      );
    }
  }
  return sonuclar.every((s) => s.tamam);
};

try {
  const tamam = await calis(process.argv.includes("--onayli"));
  if (!tamam) {
    console.error("Deneme kırmızı.");
    process.exitCode = 1;
  }
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
