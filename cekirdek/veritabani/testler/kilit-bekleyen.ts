// Bu veritabanında kilit bekleyen bir sorgu görünene kadar bekler: yarış testleri ikinci isteğin
// gerçekten kilitte beklediğini görmeden birinciyi bitirmez (kart 0082, kart 0085). Site kullanıcısı
// öteki oturumları göremez (karar 0053): gözlem yönetici bağlantısıyla yapılır.
import { sql } from "drizzle-orm";
import { baglan, type Veritabani } from "../baglanti.ts";
import { yoneticiAdresi } from "./adresler.ts";

export const kilitBekleyeniGor = async (vt: Veritabani) => {
  const ad = (await vt.execute<{ ad: string }>(sql`select current_database() as ad`)).rows[0]?.ad;
  const yonetici = baglan(yoneticiAdresi("postgres"));
  try {
    // Yüklü kontrol hattında da yetsin: en çok 20 saniye (kart 0082 kontrolü).
    for (let deneme = 0; deneme < 800; deneme++) {
      const sonuc = await yonetici.execute<{ sayi: number }>(
        sql`select count(*)::int as sayi from pg_stat_activity where datname = ${ad} and wait_event_type = 'Lock'`,
      );
      if ((sonuc.rows[0]?.sayi ?? 0) > 0) return;
      await new Promise((bitti) => setTimeout(bitti, 25));
    }
    throw new Error("Kilit bekleyen sorgu görülmedi.");
  } finally {
    await yonetici.$client.end();
  }
};
