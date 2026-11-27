// Kartla ödemenin iadesi (kart 0235, karar 0147). Çekirdeğin iade servisi (cekirdek/moduller/siparis/iade.ts) iadeyi
// "bekliyor" yazdıktan sonra bağlantı noktasından (cekirdek/eklentiler/odeme-yontemleri.ts) kartlaIadeEt'i çağırır.
//
// - Para kalem kalem döner: her sepet kaleminin işlemi (ödemenin kalem_islemleri) kendi tutarıyla, en çok kalemin
//   ödenen kalanı kadar. Kalemlere sığmayan fark (tam iadede taksit farkı, elle tutar, kuruluşun yuvarlaması) kalanı
//   olan kalemlere sırayla dağıtılır. Kalem işlemi bilinmeyen eski ödemede tek parça ödemenin kimliğiyle gider.
// - Kuruluşa her zaman iade gider, iptal gitmez: kısmi iadeyle aynı gün iptalin birlikte doğru sonucu yoktur.
// - Her parça önce yazılır (kart_iadeleri, conversationId = satırın kimliği), gönderilmeden önce tek güncellemeyle
//   "belirsiz"e alınır: aynı parça iki kez gönderilmez (aynı anda iki çağrı da olsa). Yanıt gelince tamam ya da red olur;
//   yanıt gelmezse belirsiz kalır, tarama günlük rapordan sorar.
// - Sonuç: bütün parçalar tamamsa "tamam"; hiçbiri tamam ya da belirsiz değilse "red" (para dönmedi); öteki durumlar
//   "belirsiz" (iade bekler; reddedilen parça mağaza sahibinin yeniden denemesiyle yeniden gönderilir).
// - Eklenti kapansa da iade çalışır: para ödendiği yoldan döner.
import { and, asc, eq, gte, inArray, lt, ne, or, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { kartlaOdemeAyari } from "../../kayitlar/eklentiler.ts";
import { takvimGunu } from "../../metinler/bicimleyici.ts";
import { iadeServisi } from "../../moduller/siparis/iade.ts";
import { siparisIadeleri, siparisler } from "../../moduller/siparis/model.ts";
import { yoneticiBildirimiYaz } from "../../moduller/yonetici-bildirimi/servis.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import type { EklentiliIadeIstegi, EklentiliIadeSonucu } from "../odeme-yontemleri.ts";
import { kurulusAnahtarlari } from "./baslat.ts";
import { gununIslemleri, iadeEt, KurulusHatasi } from "./iyzico.ts";
import { type KartIadesi, kartIadeleri, kartOdemeleri } from "./model.ts";

const kargoKalemi = "kargo";
const tumuKalemi = "tumu";

// İstenen tutarı kalemlere dağıtır. kalanlar: kalemin iade edilebilir kalanı (ödenen eksi önceki iadeler).
export const iadeyiDagit = (
  istek: Pick<EklentiliIadeIstegi, "tutar" | "kalemler" | "kargoTutari">,
  kalanlar: { kalem: string; kalan: number }[],
): { kalem: string; tutar: number }[] | undefined => {
  const kalan = new Map(kalanlar.map((satir) => [satir.kalem, satir.kalan]));
  const paylar = new Map<string, number>();
  const ekle = (kalem: string, tutar: number) => {
    const olabilir = Math.min(tutar, kalan.get(kalem) ?? 0);
    if (olabilir <= 0) return 0;
    paylar.set(kalem, (paylar.get(kalem) ?? 0) + olabilir);
    kalan.set(kalem, (kalan.get(kalem) ?? 0) - olabilir);
    return olabilir;
  };
  let dagitilacak = istek.tutar;
  const istenen = [...istek.kalemler.map((k) => ({ kalem: k.birim, tutar: k.tutar }))];
  if (istek.kargoTutari > 0) istenen.push({ kalem: kargoKalemi, tutar: istek.kargoTutari });
  for (const { kalem, tutar } of istenen) {
    dagitilacak -= ekle(kalem, Math.min(tutar, dagitilacak));
  }
  // Fark: önce istenen kalemlere, sonra öteki kalemlere (kargo en sona).
  const sira = [
    ...istenen.map((satir) => satir.kalem),
    ...kalanlar.map((satir) => satir.kalem).filter((kalem) => kalem !== kargoKalemi),
    kargoKalemi,
  ];
  for (const kalem of sira) {
    if (dagitilacak <= 0) break;
    dagitilacak -= ekle(kalem, dagitilacak);
  }
  if (dagitilacak > 0) return undefined;
  return [...paylar].map(([kalem, tutar]) => ({ kalem, tutar }));
};

// İadenin parçalarının durumundan sonuç.
const sonucuBul = (parcalar: Pick<KartIadesi, "durum">[]): EklentiliIadeSonucu => {
  if (parcalar.length > 0 && parcalar.every((parca) => parca.durum === "tamam")) return "tamam";
  if (parcalar.every((parca) => parca.durum === "red")) return "red";
  return "belirsiz";
};

// Gönderilecek parçaları gönderir. Her parça önce tek güncellemeyle "belirsiz"e alınır (yalnız alan gönderir).
const gonder = async (vt: Veritabani, iade: string) => {
  const anahtarlar = kurulusAnahtarlari();
  if (anahtarlar === undefined) {
    await vt
      .update(kartIadeleri)
      .set({ durum: "red", hata: "anahtar-yok", sonuc_zamani: sql`now()` })
      .where(and(eq(kartIadeleri.iade_kimligi, iade), eq(kartIadeleri.durum, "gonderilecek")));
    hatayiKaydet(new Error("Ödeme kuruluşunun anahtarları yok: iade gönderilemedi."), {
      islem: "kartla-iade",
      iade,
    });
    return;
  }
  const alinanlar = await vt
    .update(kartIadeleri)
    .set({ durum: "belirsiz", son_sorgu_zamani: sql`now()` })
    .where(and(eq(kartIadeleri.iade_kimligi, iade), eq(kartIadeleri.durum, "gonderilecek")))
    .returning();
  for (const parca of alinanlar) {
    const [odeme] = await vt
      .select({
        ortam: kartOdemeleri.ortam,
        odemeKimligi: kartOdemeleri.odeme_kimligi,
        paraBirimi: kartOdemeleri.para_birimi,
      })
      .from(kartOdemeleri)
      .where(eq(kartOdemeleri.kimlik, parca.kart_odemesi_kimligi));
    if (odeme?.odemeKimligi == null) continue;
    try {
      const yanit = await iadeEt(odeme.ortam as Site["ayarlar"]["kartlaOdemeOrtami"], anahtarlar, {
        parca: parca.kimlik,
        islem: parca.islem,
        odemeKimligi: odeme.odemeKimligi,
        tutar: parca.tutar,
        paraBirimi: odeme.paraBirimi,
      });
      await vt
        .update(kartIadeleri)
        .set(
          yanit.tur === "tamam"
            ? { durum: "tamam", hata: null, sonuc_zamani: sql`now()` }
            : { durum: "red", hata: yanit.hata, sonuc_zamani: sql`now()` },
        )
        .where(and(eq(kartIadeleri.kimlik, parca.kimlik), eq(kartIadeleri.durum, "belirsiz")));
      if (yanit.tur === "red") {
        hatayiKaydet(new Error(`Ödeme kuruluşu iadeyi reddetti: ${yanit.hata}`), {
          islem: "kartla-iade",
          iade,
        });
      }
    } catch (hata) {
      // Yanıt gelmedi ya da okunamadı: kuruluş iadeyi yapmış olabilir, parça belirsiz kalır (tarama sorar).
      hatayiKaydet(
        hata instanceof KurulusHatasi
          ? hata
          : new KurulusHatasi("İade gönderilemedi.", { cause: hata }),
        {
          islem: "kartla-iade",
          iade,
        },
      );
    }
  }
};

export const kartlaIadeEt = async (
  vt: Veritabani,
  _site: Site,
  istek: EklentiliIadeIstegi,
): Promise<EklentiliIadeSonucu> => {
  const yazildi = await vt.transaction(async (islem) => {
    const [odeme] = await islem
      .select()
      .from(kartOdemeleri)
      .where(
        and(eq(kartOdemeleri.siparis_kimligi, istek.siparis), eq(kartOdemeleri.durum, "odendi")),
      )
      .for("update");
    if (odeme === undefined || odeme.odenen === null) return false;
    const mevcut = await islem
      .select()
      .from(kartIadeleri)
      .where(eq(kartIadeleri.iade_kimligi, istek.iade));
    if (mevcut.length > 0) {
      // Yeniden deneme: reddedilen parçalar yeniden gönderilir (tamam ve belirsiz parçaya dokunulmaz).
      await islem
        .update(kartIadeleri)
        .set({ durum: "gonderilecek", hata: null, sonuc_zamani: null })
        .where(and(eq(kartIadeleri.iade_kimligi, istek.iade), eq(kartIadeleri.durum, "red")));
      return true;
    }
    // Önceki iadelerin parçaları (reddedilenler dışında) kalemin kalanından düşülür.
    const oncekiler = await islem
      .select({ kalem: kartIadeleri.kalem, tutar: kartIadeleri.tutar })
      .from(kartIadeleri)
      .where(
        and(eq(kartIadeleri.kart_odemesi_kimligi, odeme.kimlik), ne(kartIadeleri.durum, "red")),
      );
    const iadeEdilen = (kalem: string) =>
      oncekiler.filter((satir) => satir.kalem === kalem).reduce((t, satir) => t + satir.tutar, 0);
    const toplamIade = oncekiler.reduce((t, satir) => t + satir.tutar, 0);
    const kalemIslemleri = odeme.kalem_islemleri;
    // Eski ödeme (kalem işlemi yok) ya da önceki iadesi tek parçayla gitmiş ödeme: tek parça.
    const tekParca =
      kalemIslemleri === null || oncekiler.some((satir) => satir.kalem === tumuKalemi);
    const dagilim = tekParca
      ? istek.tutar <= odeme.odenen - toplamIade
        ? [{ kalem: tumuKalemi, tutar: istek.tutar }]
        : undefined
      : iadeyiDagit(
          istek,
          kalemIslemleri.map((satir) => ({
            kalem: satir.kalem,
            kalan: satir.odenen - iadeEdilen(satir.kalem),
          })),
        );
    if (dagilim === undefined) {
      hatayiKaydet(new Error("İade tutarı ödemenin kalanına sığmıyor."), {
        islem: "kartla-iade",
        iade: istek.iade,
      });
      return false;
    }
    await islem.insert(kartIadeleri).values(
      dagilim.map((parca) => ({
        iade_kimligi: istek.iade,
        kart_odemesi_kimligi: odeme.kimlik,
        kalem: parca.kalem,
        islem:
          parca.kalem === tumuKalemi
            ? null
            : (kalemIslemleri?.find((s) => s.kalem === parca.kalem)?.islem ?? null),
        tutar: parca.tutar,
        durum: "gonderilecek",
      })),
    );
    return true;
  });
  if (!yazildi) return "red";
  await gonder(vt, istek.iade);
  const parcalar = await vt
    .select({ durum: kartIadeleri.durum })
    .from(kartIadeleri)
    .where(eq(kartIadeleri.iade_kimligi, istek.iade));
  const sonuc = sonucuBul(parcalar);
  // Kuruluş bir kısmını hemen reddettiyse iade bekler; tarama onu görmez (belirsiz parçası yok): yöneticiye burada
  // bildirilir (kart 0241, bağımsız kontrolün bulgusu). Anahtar iade başına aynı: ikinci bildirim gitmez.
  if (sonuc === "belirsiz" && parcalar.some((parca) => parca.durum === "red")) {
    await bekleyenIadeyiBildir(vt, istek.iade, "kismi-red");
  }
  return sonuc;
};

// Belirsiz parçaları kuruluşun günlük raporundan sorar (zamanlı tarama). Raporda başarılı iade satırı (conversationId =
// parçanın kimliği) bulunan parça tamamdır; iadeBulunamazsaGun içinde bulunamayanın hatası kaydedilir, parça belirsiz
// kalır ve sormaGun boyunca sorulur. Parçaları çözülen
// iadenin sonucu çekirdeğe bildirilir. Dönen sayı çözülen parça sayısıdır.
export const belirsizIadeleriSor = async (vt: Veritabani, site: Site): Promise<number> => {
  const anahtarlar = kurulusAnahtarlari();
  if (anahtarlar === undefined) return 0;
  const parcalar = await vt
    .select({ parca: kartIadeleri, ortam: kartOdemeleri.ortam })
    .from(kartIadeleri)
    .innerJoin(kartOdemeleri, eq(kartOdemeleri.kimlik, kartIadeleri.kart_odemesi_kimligi))
    .where(
      and(
        eq(kartIadeleri.durum, "belirsiz"),
        // Rapor bu kadar günden eskisini artık bulmaz: parça belirsiz kalır, hatası kaydedilmiştir.
        gte(
          kartIadeleri.olusturma_zamani,
          sql`now() - make_interval(days => ${kartlaOdemeAyari.sormaGun})`,
        ),
        or(
          sql`${kartIadeleri.son_sorgu_zamani} is null`,
          lt(
            kartIadeleri.son_sorgu_zamani,
            sql`now() - make_interval(mins => ${kartlaOdemeAyari.iadeSorguDakika})`,
          ),
        ),
      ),
    )
    .orderBy(asc(kartIadeleri.son_sorgu_zamani), asc(kartIadeleri.olusturma_zamani))
    .limit(kartlaOdemeAyari.taramaParti);
  if (parcalar.length === 0) return 0;
  const simdi = Date.now();
  const gunMs = 24 * 60 * 60 * 1000;
  // Raporun günleri: her parçanın gününden bugüne (parçalar en çok sormaGun eskidir).
  const gunler = new Map<string, Set<string>>();
  for (const { parca, ortam } of parcalar) {
    const ilk = parca.olusturma_zamani.getTime();
    for (let an = ilk; an <= simdi + gunMs; an += gunMs) {
      const gun = takvimGunu(new Date(Math.min(an, simdi)), site.ayarlar.saatDilimi);
      if (!gunler.has(ortam)) gunler.set(ortam, new Set());
      gunler.get(ortam)?.add(gun);
    }
  }
  const bulunanlar = new Set<string>();
  for (const [ortam, gunSet] of gunler) {
    for (const gun of gunSet) {
      try {
        const islemler = await gununIslemleri(
          ortam as Site["ayarlar"]["kartlaOdemeOrtami"],
          anahtarlar,
          gun,
        );
        for (const islem of islemler) {
          if (islem.tur === "iade" && islem.basarili && islem.oturum !== undefined)
            bulunanlar.add(islem.oturum);
        }
      } catch (hata) {
        hatayiKaydet(hata, { islem: "kartla-iade-taramasi", gun });
        return 0;
      }
    }
  }
  const iadeler = new Set<string>();
  let cozulen = 0;
  for (const { parca } of parcalar) {
    const bulundu = bulunanlar.has(parca.kimlik);
    const suresiDoldu =
      simdi - parca.olusturma_zamani.getTime() > kartlaOdemeAyari.iadeBulunamazsaGun * gunMs;
    // Bulunamayan parça hiçbir zaman kendiliğinden "red" sayılmaz (bağımsız kontrolün bulgusu): kuruluş parayı
    // döndürmüş olabilir, red yeniden gönderime ve ikinci iadeye yol açardı. Süresi geçince hatası bir kez kaydedilir;
    // iade bekler, mağaza sahibi kuruluşun panelinden bakar (karar 0147).
    if (!bulundu && suresiDoldu && parca.hata === null) {
      hatayiKaydet(new Error("İade parçası kuruluşun raporunda bulunamadı: elle bakılmalı."), {
        islem: "kartla-iade-taramasi",
        iade: parca.iade_kimligi,
      });
      // Yöneticiye bildirim (kart 0241): iade başına bir kez.
      await bekleyenIadeyiBildir(vt, parca.iade_kimligi, "raporda-yok");
    }
    const [degisen] = await vt
      .update(kartIadeleri)
      .set(
        bulundu
          ? { durum: "tamam", hata: null, sonuc_zamani: sql`now()`, son_sorgu_zamani: sql`now()` }
          : suresiDoldu
            ? { hata: "raporda-yok", son_sorgu_zamani: sql`now()` }
            : { son_sorgu_zamani: sql`now()` },
      )
      .where(and(eq(kartIadeleri.kimlik, parca.kimlik), eq(kartIadeleri.durum, "belirsiz")))
      .returning({ durum: kartIadeleri.durum });
    if (degisen !== undefined && degisen.durum !== "belirsiz") {
      cozulen += 1;
      iadeler.add(parca.iade_kimligi);
    }
  }
  await iadeSonuclariniBildir(vt, site, [...iadeler]);
  return cozulen;
};

// Kuruluşta takılan iadenin yönetici bildirimi (kart 0241): iade ve neden başına bir kez (anahtar).
const bekleyenIadeyiBildir = async (
  vt: Veritabani,
  iade: string,
  neden: "raporda-yok" | "kismi-red",
): Promise<void> => {
  const [satir] = await vt
    .select({ numara: siparisler.numara, siparis: siparisler.kimlik })
    .from(siparisIadeleri)
    .innerJoin(siparisler, eq(siparisler.kimlik, siparisIadeleri.siparis_kimligi))
    .where(eq(siparisIadeleri.kimlik, iade));
  if (satir === undefined) return;
  await yoneticiBildirimiYaz(vt, {
    bildirim: "bekleyen-iade",
    anahtar: `kartla-iade-${neden}:${iade}`,
    kayit: satir.siparis,
    veri: { numara: satir.numara, neden },
  });
};

// Parçaları çözülen iadelerin sonucunu çekirdeğe bildirir (yalnız bekleyen iade).
const iadeSonuclariniBildir = async (vt: Veritabani, site: Site, iadeler: string[]) => {
  if (iadeler.length === 0) return;
  const parcalar = await vt
    .select({ iade: kartIadeleri.iade_kimligi, durum: kartIadeleri.durum })
    .from(kartIadeleri)
    .innerJoin(siparisIadeleri, eq(siparisIadeleri.kimlik, kartIadeleri.iade_kimligi))
    .where(and(inArray(kartIadeleri.iade_kimligi, iadeler), eq(siparisIadeleri.durum, "bekliyor")));
  const servis = iadeServisi(site);
  for (const iade of iadeler) {
    const sonuc = sonucuBul(parcalar.filter((parca) => parca.iade === iade));
    if (sonuc === "belirsiz" && parcalar.some((p) => p.iade === iade && p.durum === "red")) {
      hatayiKaydet(new Error("İadenin bir kısmı döndü, bir kısmı reddedildi: yeniden denenmeli."), {
        islem: "kartla-iade-taramasi",
        iade,
      });
      await bekleyenIadeyiBildir(vt, iade, "kismi-red");
    }
    if (sonuc === "belirsiz") continue;
    try {
      await servis.iadeSonucunuIsle(vt, iade, sonuc, {
        tur: "sistem",
        ad: "kartla-odeme-taramasi",
      });
    } catch (hata) {
      hatayiKaydet(hata, { islem: "kartla-iade-taramasi", iade });
    }
  }
};
