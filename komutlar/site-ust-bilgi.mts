// Sitenin kullanıcısından kapatılan üst bilgi (kart 0037, karar 0053). Siteler aynı PostgreSQL'dedir; bu izinler
// kalkmazsa bir site başka sitelerin adlarını, sayaçlarını ve oturumlarını okuyabilir. İzinler sitenin kendi
// veritabanındaki sistem kayıtlarındadır: her veritabanında ayrı kaldırılır, yedekten açılan veritabanına gelmez.
// Site kullanıcısı veritabanının sahibidir ama sistem kayıtlarının sahibi değildir, izni geri veremez.
// Kapanmayan: numaradan kullanıcı adı (regrole dönüşümü), toplam işlem sayacı. Sınır karar 0053'te yazılı.

// Görünümler işlevleri çağıranın iznini kullandığı için pg_stat_* görünümleri de bununla kapanır.
const kapaliIslevDeseni = "^pg_stat_get_";
const kapaliIslevler = [
  // Bütün veritabanlarının numarasını tek sorguda verir.
  "pg_tablespace_databases",
  // Ayar açılırsa site başına yazma hareketini gösterebilir.
  "pg_wal_summary_contents",
  "pg_available_wal_summaries",
  "pg_lock_status",
  "pg_prepared_xact",
  // Bütün sitelerin toplam boyutunu verir.
  "pg_tablespace_size",
];
const kapaliGorunumler = [
  "pg_database",
  "pg_roles",
  "pg_user",
  "pg_group",
  "pg_auth_members",
  "pg_shdepend",
  "pg_shdescription",
  "pg_shseclabel",
  "pg_db_role_setting",
  "pg_locks",
  "pg_prepared_xacts",
  "pg_stat_activity",
  "pg_stat_database",
  "pg_stat_database_conflicts",
];

const metinListesi = (adlar: readonly string[]): string => adlar.map((ad) => `'${ad}'`).join(", ");

const islevSarti = `p.pronamespace = 'pg_catalog'::regnamespace
    AND (p.proname ~ '${kapaliIslevDeseni}' OR p.proname IN (${metinListesi(kapaliIslevler)}))`;

// Sitenin veritabanına bağlanan her yönetici oturumu bu ayarla açılır (docker exec -e PGOPTIONS, karar 0053).
// Site kullanıcısı veritabanının sahibidir: "ALTER DATABASE ... SET search_path" ile public şemasındaki işlevini
// sistem işlevinin önüne alabilir, yönetici oturumu o işlevi çalıştırınca süper kullanıcı olurdu.
// "SET role" ile de yönetici oturumunu kendi rolüne çevirebilirdi. Bağlantı ayarı veritabanı ayarını ezer.
export const guvenliOturumAyari = "-c search_path=pg_catalog -c role=none";
export const guvenliOturum = `-e PGOPTIONS='${guvenliOturumAyari}'`;

// Yönetici olarak sitenin veritabanında çalışır, guvenliOturum ile. Tekrar çalıştırılabilir. Aynı anda iki
// çalıştırma sıraya girer. Bir işlev ya da görünüm bulunamazsa
// (PostgreSQL sürümü değişince) sessizce geçilmez: açık kalanları denetim söyler.
export const ustBilgiKapatmaSql = (): string => `DO $kapat$
DECLARE r record;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('site-ust-bilgi'));
  FOR r IN
    SELECT p.oid::regprocedure AS islev FROM pg_catalog.pg_proc p
    WHERE ${islevSarti}
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.islev);
  END LOOP;
  FOR r IN
    SELECT c.oid::regclass AS gorunum FROM pg_catalog.pg_class c
    WHERE c.relnamespace = 'pg_catalog'::regnamespace AND c.relname IN (${metinListesi(kapaliGorunumler)})
  LOOP
    EXECUTE format('REVOKE ALL ON %s FROM PUBLIC', r.gorunum);
  END LOOP;
END
$kapat$;
`;

// Yönetici olarak sitenin veritabanında çalışır: site kullanıcısına açık kalanların adlarını tek satırda döner,
// boş satır her şeyin kapalı olduğunu gösterir. Tek sütun izni de açık sayılır. Test ve sunucu denetimi aynı
// sorguyu kullanır, guvenliOturum ile.
export const ustBilgiAcikOlanlarSql = (
  kullanici: string,
): string => `SELECT coalesce(string_agg(ad, ',' ORDER BY ad), '') FROM (
  SELECT DISTINCT p.proname::text AS ad FROM pg_catalog.pg_proc p
  WHERE ${islevSarti} AND has_function_privilege('${kullanici}', p.oid, 'EXECUTE')
  UNION ALL
  SELECT c.relname::text FROM pg_catalog.pg_class c
  WHERE c.relnamespace = 'pg_catalog'::regnamespace AND c.relname IN (${metinListesi(kapaliGorunumler)})
    AND has_any_column_privilege('${kullanici}', c.oid, 'SELECT')
) acik;`;

// Sunucu denetiminin kararı. Okunamayan sonuç kırmızıdır.
export const ustBilgiHatalari = (basarili: boolean, cikti: string): string[] => {
  if (!basarili) return ["okunamadı"];
  const acik = cikti.trim();
  return acik === "" ? [] : [`açık: ${acik}`];
};
