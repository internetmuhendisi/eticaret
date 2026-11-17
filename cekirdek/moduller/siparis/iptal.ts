// Ödenmeyen havale siparişinin iptali (kart 0214, karar 0141). Arka plan süreci yükler (cekirdek/moduller/siparis/
// isler.ts): sipariş servisinin vitrin bağımlılıklarını (sitenin biçimleyicisi) çekmemek için ayrı dosyadadır; içe
// aktarmalar uzantılıdır.
//
// - Süresi dolmuş (odeme_son_zamani veritabanının saatiyle geçmiş), ödeme bekleyen ve bildirimsiz havale siparişi
//   iptal olur; bildirimli sipariş iptal olmaz (kullanıcı kararı: mağaza sahibi bakar).
// - Stok yalnız o siparişin stok geçmişinde düşürdüğü adet kadar geri konur (stokArtir, "siparis-iptali").
// - Her sipariş kendi işlemindedir: satır kilitlenir (SKIP LOCKED: başka çalışmanın tuttuğu atlanır), koşul kilitten
//   sonra yeniden sınanır; aynı sipariş iki kez iptal edilmez.
import { and, asc, eq, isNotNull, lte, sql } from "drizzle-orm";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { havaleIptalPartisi } from "../../kayitlar/siparis.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { stokGecmisi } from "../stok/model.ts";
import { stokServisi } from "../stok/servis.ts";
import { gecmiseYaz, havaleIptalYapani } from "./gecmis.ts";
import { havaleBildirimleri, siparisler } from "./model.ts";

const stok = stokServisi();

// Siparişin düşürdüğü stok geri konur: yalnız bu siparişin stok geçmişindeki düşürme adetleri (iptal ve iade aynı
// kural, .claude/rules/e-ticaret-is-kurallari.md).
const stoguGeriKoy = async (islem: VeritabaniIslemi, siparis: string, kim: DegisikligiYapan) => {
  const dusenler = await islem
    .select({
      birim: stokGecmisi.birim_kimligi,
      adet: sql<number>`sum(${stokGecmisi.onceki_miktar} - ${stokGecmisi.sonraki_miktar})::int`,
    })
    .from(stokGecmisi)
    .where(and(eq(stokGecmisi.kaynak_kimligi, siparis), eq(stokGecmisi.sebep, "siparis")))
    .groupBy(stokGecmisi.birim_kimligi);
  const kalemler = dusenler.filter((satir) => satir.adet > 0);
  if (kalemler.length === 0) return;
  await stok.stokArtir(islem, kim, kalemler, { sebep: "siparis-iptali", kaynak: siparis });
};

// Süresi dolmuş, ödeme bekleyen ve bildirimsiz havale siparişleri iptal olur. Bir çalışmada en çok bir parti;
// başka bir çalışmanın kilitlediği sipariş atlanır (o çalışma iptal eder). İptal edilen sipariş sayısı döner.
export const havaleIptalTaramasi = async (vt: Veritabani): Promise<number> => {
  let iptal = 0;
  const adaylar = await vt
    .select({ kimlik: siparisler.kimlik })
    .from(siparisler)
    .where(
      and(
        eq(siparisler.durum, "odeme-bekleniyor"),
        isNotNull(siparisler.odeme_son_zamani),
        lte(siparisler.odeme_son_zamani, sql`now()`),
        sql`not exists (select 1 from ${havaleBildirimleri} where ${havaleBildirimleri.siparis_kimligi} = ${siparisler.kimlik})`,
      ),
    )
    .orderBy(asc(siparisler.odeme_son_zamani))
    .limit(havaleIptalPartisi);
  for (const { kimlik } of adaylar) {
    // Her sipariş kendi işleminde. Biri hata verirse (kart 0214 kontrolü) hata kaydedilir, tarama sonrakilerle sürer:
    // aynı sipariş her saat ilk sırada kalıp arkasındakileri durdurmaz.
    const oldu = await iptalEt(vt, kimlik).catch((hata: unknown) => {
      hatayiKaydet(hata, { kaynak: "havale-iptali", siparis: kimlik });
      return false;
    });
    if (oldu) iptal += 1;
  }
  return iptal;
};

const iptalEt = (vt: Veritabani, kimlik: string): Promise<boolean> =>
  vt.transaction(async (islem) => {
    // Koşul kilitten sonra yeniden sınanır: arada bildirim yazıldıysa ya da başka çalışma iptal ettiyse atlanır.
    const [kilitli] = await islem
      .select({ kimlik: siparisler.kimlik })
      .from(siparisler)
      .where(
        and(
          eq(siparisler.kimlik, kimlik),
          eq(siparisler.durum, "odeme-bekleniyor"),
          lte(siparisler.odeme_son_zamani, sql`now()`),
        ),
      )
      .for("update", { skipLocked: true });
    if (kilitli === undefined) return false;
    const [bildirim] = await islem
      .select({ kimlik: havaleBildirimleri.kimlik })
      .from(havaleBildirimleri)
      .where(eq(havaleBildirimleri.siparis_kimligi, kimlik))
      .limit(1);
    if (bildirim !== undefined) return false;
    await islem.update(siparisler).set({ durum: "iptal" }).where(eq(siparisler.kimlik, kimlik));
    await stoguGeriKoy(islem, kimlik, havaleIptalYapani);
    await gecmiseYaz(islem, {
      siparis: kimlik,
      onceki: "odeme-bekleniyor",
      sonraki: "iptal",
      neden: "havale-suresi-doldu",
      kim: havaleIptalYapani,
    });
    return true;
  });
