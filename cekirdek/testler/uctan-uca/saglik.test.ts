// Çalışan uygulamanın sağlık ucu zarfla cevap verir (kart 0013). Uygulamanın bağlantı
// bilgisini bulduğunu ve adres dosyasının ucu bağladığını gösterir.
import { expect, test } from "@playwright/test";
import { cekirdekSurumu } from "../../surum";

test("sağlık ucu uygulamanın ve veritabanının ayakta olduğunu söyler", async ({ request }) => {
  const yanit = await request.get("/kapi/herkese-acik/saglik");
  expect(yanit.status()).toBe(200);
  expect(await yanit.json()).toEqual({
    basarili: true,
    veri: { uygulama: "ayakta", veritabani: "ayakta", cekirdekSurumu },
  });
});
