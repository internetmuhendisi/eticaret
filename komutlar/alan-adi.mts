// Altyapının alan adında deneme adreslerini ve sitelerin alt adreslerini sunucuya bağlar (kart 0020 ve
// 0344, kararlar 0032 ve 0202).
//
//   pnpm alan-adi            Hiçbir şeyi değiştirmez. Cloudflare'deki kayıtları okur, eklenecek, değişecek ya
//                            da silinecek kaydı söyler.
//   pnpm alan-adi --onayli   Yalnız söylenen kayıtları ekler ya da düzeltir.
//   pnpm alan-adi --onayli --sil   Artık hiçbir sitenin istemediği kendi kayıtlarını da siler. Silmek bir sitenin
//                            asıl adresini kapatabilir (yanlış daldan çalıştırılan komut o sitenin klasörünü görmez),
//                            bu yüzden ayrıca istenir.
//
// Kendi alan adı olan sitenin kayıtlarını mağaza sahibi açar; komut açılacak kayıtları ve şu anki durumlarını yazar.
//
// Alan adı değişikliği geri alınamaz sayılır; --onayli yalnız kullanıcı değişikliği onayladıktan sonra yazılır.
// İstenen kayıtlar: deneme adreslerinin joker kaydı ve siteler/ klasöründe asıl adresi alt adres olan her sitenin
// A ve AAAA kaydı (alan-adi-plani.mts). Komut yalnız kendi açıklamasını taşıyan kayıtları değiştirir ve siler,
// alan adının başka hiçbir kaydına dokunmaz; aynı adda başka bir kayıt varsa durur.

import {
  alanAdiPlani,
  istenenKayitlar,
  kendiAlanAdiKayitlari,
  siteAciklamaOneki,
} from "./alan-adi-plani.mts";
import { bolgeyiBul, isiUygula, kayitlariGetir } from "./cloudflare.mts";
import { asilAdresCakismalari, asilAdresiCoz } from "./on-kapi.mts";
import { herkeseAcikCozulme } from "./on-kapi-olcumleri.mts";
import { kayitlariOku } from "./sunucu.mts";
import { projedekiSiteler } from "./tema-demosu-adresi.mts";

const calis = async (onayli: boolean, sil: boolean): Promise<void> => {
  const [sunucu] = kayitlariOku();
  if (!sunucu?.ipv4 || !sunucu.ipv6) {
    throw new Error("sunucu/sunucular.json'da adresleri olan sunucu yok. Önce: pnpm sunucu-kur");
  }
  const kimlikler = projedekiSiteler().map((site) => site.kimlik);
  const cakismalar = asilAdresCakismalari(kimlikler);
  if (cakismalar.length > 0) throw new Error(cakismalar.join("\n"));
  // Kendi alan adları: açılacak kayıtlar ve bugünkü durum.
  for (const kayit of kendiAlanAdiKayitlari(sunucu.ipv4, sunucu.ipv6, kimlikler)) {
    console.log(
      `mağaza      ${kayit.kodAdi}: mağaza sahibi açar: ${kayit.type} ${kayit.name} → ${kayit.content} (vekilsiz)`,
    );
  }
  for (const { kodAdi, adresler } of kimlikler) {
    const asil = adresler.canli === undefined ? undefined : asilAdresiCoz(adresler.canli);
    if (asil === undefined || "hata" in asil || asil.tur !== "kendi") continue;
    for (const [ad, hata] of await herkeseAcikCozulme(asil, sunucu)) {
      console.log(
        `durum       ${kodAdi}: ${ad} ${hata === undefined ? "sunucuya çözülüyor" : hata}`,
      );
    }
  }
  const bolge = await bolgeyiBul();
  console.log(`alan adı    ${bolge.name} (${bolge.status})`);

  const istenenler = istenenKayitlar(sunucu.ipv4, sunucu.ipv6, kimlikler);
  const mevcut = await kayitlariGetir(
    bolge.id,
    istenenler.map((k) => k.name),
    [siteAciklamaOneki],
  );
  const { isler, hatalar } = alanAdiPlani(istenenler, mevcut, siteAciklamaOneki);
  if (hatalar.length > 0) throw new Error(hatalar.join("\n"));

  for (const istenen of istenenler) {
    if (
      !isler.some(
        (is) =>
          is.tur !== "sil" && is.kayit.name === istenen.name && is.kayit.type === istenen.type,
      )
    ) {
      console.log(`aynı        ${istenen.type} ${istenen.name} → ${istenen.content}`);
    }
  }
  if (isler.length === 0) {
    console.log("Alan adı kayıtları zaten doğru, değişiklik yok.");
    return;
  }
  for (const is of isler) console.log(is.metin);
  if (!onayli) {
    console.log("Hiçbir şey değiştirilmedi. Onaydan sonra: pnpm alan-adi --onayli");
    return;
  }
  const silinecekler = isler.filter((is) => is.tur === "sil");
  if (silinecekler.length > 0 && !sil) {
    console.log(
      `Silinecek ${silinecekler.length} kayıt silinmedi: bir sitenin asıl adresi olabilir. Siteler doğruysa: pnpm alan-adi --onayli --sil`,
    );
  }
  for (const is of isler.filter((i) => i.tur !== "sil" || sil)) {
    await isiUygula(bolge.id, is);
    console.log(`yapıldı     ${is.metin.slice(12)}`);
  }
};

try {
  await calis(process.argv.includes("--onayli"), process.argv.includes("--sil"));
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
