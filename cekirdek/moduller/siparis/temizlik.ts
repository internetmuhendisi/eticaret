// Siparişteki kişisel bilgilerin silinmesi (kart 0234, karar 0145). Saklama süresi (kisiselVeriSaklamaYili, altyapı
// sahibinin ayarı) dolan siparişte ad, soyad, telefon, e-posta, sokak adresi, posta kodu, not ve kurumsal faturanın
// firma ve vergi bilgisi silinir; ülke, il ve ilçe, tutarlar, ürünler ve vergi dökümü kalır. Siparişin ödeme
// oturumunda ve havale bildirimlerinde aynı bilgiler silinir; açık takip anahtarları kapanır. Müşterinin iade
// talebindeki açıklama (serbest metin) silinir; teslimat ve fatura düzeltmelerinin bilgileri silinir (kart 0269); mağazanın ret açıklaması not gibi kalır (kart 0239). Faturanın PDF'i
// (ad ve adres taşır) siparişten ayrılır ve silinmiş işaretlenir; faturanın numarası ve tarihi kalır (kart 0268). Süre
// veritabanının saatiyle karşılaştırılır.
//
// Siparişin notları silinmez: not mağaza sahibinin yazısıdır, değiştirilemez (yalnız disiplin: nota kişisel bilgi
// yazılmaması mağaza sahibine bırakılır). Arka plan süreci yükler: içe aktarmalar uzantılıdır.
import { sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { kisiselVeriTemizlikPartisi } from "../../kayitlar/siparis.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";

// Adresin kalan alanları: ülke, il ve ilçe (sokak adresi boş yazılır, posta kodu kalkar).
const teslimatAdresi = sql`jsonb_build_object('ulke', teslimat->'adres'->'ulke', 'adres', '') || jsonb_strip_nulls(jsonb_build_object('il', teslimat->'adres'->'il', 'ilce', teslimat->'adres'->'ilce'))`;
const faturaAdresi = sql`jsonb_build_object('ulke', fatura->'adres'->'ulke', 'adres', '') || jsonb_strip_nulls(jsonb_build_object('il', fatura->'adres'->'il', 'ilce', fatura->'adres'->'ilce'))`;

// Bir çalışmada en çok bir parti; silinen sipariş sayısını döner.
export const kisiselVeriTemizligi = async (vt: Veritabani, site: Site): Promise<number> => {
  const yil = site.ayarlar.kisiselVeriSaklamaYili;
  return vt.transaction(async (islem) => {
    const secilen = await islem.execute<{ kimlik: string }>(sql`
      select kimlik from siparisler
      where kisisel_veri_silinme_zamani is null
        and olusturma_zamani < now() - make_interval(years => ${yil})
      order by olusturma_zamani
      limit ${kisiselVeriTemizlikPartisi}
      for update skip locked`);
    const kimlikler = secilen.rows.map((satir) => satir.kimlik);
    if (kimlikler.length === 0) return 0;
    const liste = sql.join(
      kimlikler.map((kimlik) => sql`${kimlik}::uuid`),
      sql`, `,
    );
    // Teslimat: ad, soyad ve telefon boş; adres yalnız ülke, il ve ilçe.
    const teslimat = sql`jsonb_build_object('ad', '', 'soyad', '', 'adres', ${teslimatAdresi})`;
    // Fatura: türü ve "adres aynı" kalır; kurumsalın firma ve vergi bilgisi boş, ayrı adresi silinmiş.
    const fatura = sql`jsonb_build_object('tur', fatura->'tur', 'adresAyni', fatura->'adresAyni') || case when fatura->>'tur' = 'kurumsal' then jsonb_build_object('firma', '', 'vergiDairesi', '', 'vergiNumarasi', '') else '{}'::jsonb end || case when jsonb_typeof(fatura->'adres') = 'object' then jsonb_build_object('adres', ${faturaAdresi}) else '{}'::jsonb end`;
    // Faturanın dosyası (kart 0268): önce silinmiş işaretlenir, sonra siparişten ayrılır.
    await islem.execute(sql`
      update dosyalar set silinme_zamani = now()
      where silinme_zamani is null
        and kimlik in (select fatura_dosyasi from siparisler where kimlik in (${liste}))`);
    await islem.execute(sql`
      update siparisler
      set eposta = '', teslimat = ${teslimat}, fatura = ${fatura}, "not" = null,
          fatura_dosyasi = null, kisisel_veri_silinme_zamani = now()
      where kimlik in (${liste})`);
    await islem.execute(sql`
      update odeme_oturumlari
      set eposta = '', teslimat = ${teslimat}, fatura = ${fatura}, "not" = null
      where kimlik in (select oturum_kimligi from siparisler where kimlik in (${liste}))`);
    await islem.execute(sql`
      update havale_bildirimleri set gonderen = '', "not" = null
      where siparis_kimligi in (${liste})`);
    // Müşterinin iade talebi açıklaması (kart 0239, bağımsız kontrolün bulgusu).
    await islem.execute(sql`
      update siparis_iade_talepleri set aciklama = null
      where siparis_kimligi in (${liste})`);
    // Teslimat ve fatura düzeltmelerinin önceki ve yeni bilgileri (kart 0269); geçmişin satırı kalır.
    await islem.execute(sql`
      delete from siparis_adres_duzeltmeleri where siparis_kimligi in (${liste})`);
    // Açık takip anahtarları da kapanır (kart 0238, bağımsız kontrolün bulgusu).
    await islem.execute(sql`
      delete from siparis_takip_erisimleri where siparis_kimligi in (${liste})`);
    return kimlikler.length;
  });
};
