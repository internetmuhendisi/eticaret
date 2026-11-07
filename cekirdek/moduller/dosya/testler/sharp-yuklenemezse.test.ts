// Görsel kütüphanesi yüklenemezse (örneğin görüntüde yerli dosyası eksik) kaydetme hatayı olduğu
// gibi verir, "bozuk dosya" demez: sebep hata katmanında görünür (kart 0073'ün bağımsız kontrolü).
import { describe, expect, it, vi } from "vitest";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { dosyaKaydet } from "../servis.ts";

vi.mock("sharp", () => {
  throw new Error("görsel kütüphanesi yüklenemedi");
});

describe("görsel kütüphanesi yoksa", () => {
  it("kaydetme hata verir, bozuk dosya sonucu dönmez", async () => {
    const vt = { $client: {} } as unknown as Veritabani;
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    // Vitest taklit edilen modülün hatasını kendi iletisiyle sarar: hata fırlatılır, sonuç dönmez.
    await expect(dosyaKaydet(vt, png, "/var/empty")).rejects.toThrow();
  });
});
