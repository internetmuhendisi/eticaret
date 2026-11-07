// Yerel posta kutusuna tek bir deneme e-postası (kart 0032, karar 0050).
// Çalıştırma: pnpm eposta-denemesi siteler/<kod-adi> <adres>
// Önce: pnpm veritabani-baslat, pnpm veritabani-guncelle siteler/<kod-adi>
// Gönderici yalnız yerel adresi kabul eder; e-posta dışarı gitmez. Toplu gönderim yoktur.
import { eq } from "drizzle-orm";
import { calistiriciKur } from "../cekirdek/arka-plan-isleri/calistirici.ts";
import { epostaDurumu } from "../cekirdek/kayitlar/eposta.ts";
import { epostaGonderIsi } from "../cekirdek/moduller/eposta/isler.ts";
import { epostaKayitlari } from "../cekirdek/moduller/eposta/model.ts";
import { epostaGonder } from "../cekirdek/moduller/eposta/servis.ts";
import { baglan, veritabaniAdresi } from "../cekirdek/veritabani/baglanti.ts";
import { siteVeAdres } from "./site-veritabani.mts";

const [klasor, alici] = process.argv.slice(2);
if (!klasor || !alici) {
  console.error("Kullanım: pnpm eposta-denemesi siteler/<kod-adi> <adres>");
  process.exit(1);
}
siteVeAdres("eposta-denemesi");
const { POSTA_SMTP_PORTU: smtpPortu, POSTA_KUTUSU_PORTU: kutuPortu } = process.env;
Object.assign(process.env, {
  SITE_KLASORU: klasor,
  EPOSTA_SUNUCUSU: `smtp://localhost:${smtpPortu}`,
});
const vt = baglan(veritabaniAdresi());
try {
  const kimlik = await epostaGonder(vt, { kime: alici, sablon: "deneme" });
  const calistirici = calistiriciKur({ vt, isler: [epostaGonderIsi] });
  const oku = async () =>
    (
      await vt
        .select({ durum: epostaKayitlari.durum, neden: epostaKayitlari.son_hata })
        .from(epostaKayitlari)
        .where(eq(epostaKayitlari.kimlik, kimlik))
    )[0];
  // Sırada daha eski bir e-posta işi olabilir: kendi kaydı işlenene kadar sürer.
  let kayit = await oku();
  while (kayit?.durum === epostaDurumu.bekliyor && (await calistirici.birIsCalistir())) {
    kayit = await oku();
  }
  console.log(`durum       ${kayit?.durum ?? "yok"}${kayit?.neden ? ` (${kayit.neden})` : ""}`);
  console.log(`posta kutusu http://localhost:${kutuPortu}`);
} finally {
  await vt.$client.end();
}
