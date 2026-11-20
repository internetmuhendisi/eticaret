// Yönetici bildirimlerinin arka plan işleri (kart 0241, karar 0154); kaydı arka-plan-isleri/isler.ts'tedir. Bildirimin
// girdisinde alıcı adresi yoktur: alıcılar ve bildirimin açıklığı iş çalışırken ayardan okunur.
import { z } from "zod";
import { type IsTanimi, isEkle, isTanimla } from "../../arka-plan-isleri/kuyruk.ts";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { yoneticiBildirimleri } from "../../kayitlar/yonetici-bildirimi.ts";
import { bildirimiGonder } from "./gonderim.ts";
import { stokUyarilariniGonder } from "./stok-uyarisi.ts";

export const yoneticiBildirimiIsi = isTanimla({
  tur: "yonetici-bildirimi",
  sema: z.strictObject({
    bildirim: z.enum(yoneticiBildirimleri),
    anahtar: z.string().min(1).max(200),
    veri: z.record(z.string(), z.unknown()),
  }),
  calistir: ({ bildirim, anahtar, veri }, { vt }) =>
    bildirimiGonder(vt, calisanSite(), { bildirim, anahtar, veri }).then(() => undefined),
});

// Bekleyen stok uyarılarını toplayıp tek e-postayla gönderir; son gönderimden bir saat geçmediyse kendini o ana
// erteler.
export const stokUyarisiIsi: IsTanimi<Record<string, never>> = isTanimla({
  tur: "yonetici-stok-uyarisi",
  sema: z.strictObject({}),
  calistir: (_, { vt }): Promise<void> =>
    stokUyarilariniGonder(vt, calisanSite(), (islem, gecikmeSaniye, anahtar) =>
      isEkle(islem, stokUyarisiIsi, {}, { gecikmeSaniye, tekillikAnahtari: anahtar }),
    ).then(() => undefined),
});
