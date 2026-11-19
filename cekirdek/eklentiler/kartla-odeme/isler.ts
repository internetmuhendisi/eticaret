// Kartla ödeme eklentisinin arka plan işleri (kart 0215, karar 0142); kaydı arka-plan-isleri/isler.ts'tedir. İşlerin
// girdisinde kişisel veri yoktur. Eklenti kapalıyken de çalışırlar: başlatılmış ödeme tamamlanır, son günlerin
// ödemeleri karşılaştırılır (servisin kuralı).
import { z } from "zod";
import { isTanimla } from "../../arka-plan-isleri/kuyruk.ts";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { gunluk } from "../../izleme/gunluk.ts";
import { takvimGunu } from "../../metinler/bicimleyici.ts";
import { belirsizIadeleriSor } from "./iade.ts";
import { kartlaOdemeServisi } from "./servis.ts";

// Sonucu bilinmeyen ödemeleri sorar: müşteri dönmediyse ve bildirim gelmediyse sipariş yine kurulur.
export const kartlaOdemeTaramasiIsi = isTanimla({
  tur: "kartla-odeme-taramasi",
  sema: z.strictObject({}),
  calistir: async (_, { vt }) => {
    const islenen = await kartlaOdemeServisi(calisanSite()).bekleyenleriSor(vt);
    gunluk.bilgi("kartla ödeme taraması", { islenen });
  },
});

// Bir önceki günün (sitenin takvimiyle) ödemelerini ödeme kuruluşunun kaydıyla karşılaştırır.
export const kartlaOdemeKarsilastirmasiIsi = isTanimla({
  tur: "kartla-odeme-karsilastirmasi",
  sema: z.strictObject({ gun: z.iso.date().optional() }),
  calistir: async ({ gun }, { vt }) => {
    const site = calisanSite();
    const dun =
      gun ?? takvimGunu(new Date(Date.now() - 24 * 60 * 60 * 1000), site.ayarlar.saatDilimi);
    const uyusmazliklar = await kartlaOdemeServisi(site).karsilastir(vt, dun);
    gunluk.bilgi("kartla ödeme karşılaştırması", {
      gun: dun,
      uyusmazlik: uyusmazliklar?.length ?? "yapilmadi",
    });
  },
});

// Yanıtı gelmeyen iade parçalarını günlük rapordan sorar (kart 0235): para döndüyse iade tamamlanır.
export const kartlaIadeTaramasiIsi = isTanimla({
  tur: "kartla-iade-taramasi",
  sema: z.strictObject({}),
  calistir: async (_, { vt }) => {
    const cozulen = await belirsizIadeleriSor(vt, calisanSite());
    gunluk.bilgi("kartla iade taraması", { cozulen });
  },
});
