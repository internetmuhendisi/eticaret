// Kapıya giden isteğin gövdesi her zaman sonuna kadar okunur (kart 0065, karar 0139): `no-store` yanıtın
// okunmayan gövdesi tarayıcıda isteği bitmemiş bırakıyordu (yalnız durum koduna bakılan 401).
import { afterEach, describe, expect, it, vi } from "vitest";
import { kapiyaIstek } from "../istemci";
import { hataliYanit } from "../zarf";

afterEach(() => {
  vi.restoreAllMocks();
});

const sahteYanit = (yanit: Response): Response => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(yanit);
  return yanit;
};

describe("kapiyaIstek", () => {
  it("çağıran gövdeyi okumasa da asıl yanıtın gövdesi sonuna kadar okunmuştur", async () => {
    const asil = sahteYanit(hataliYanit("oturum-yok"));
    const yanit = await kapiyaIstek("/kapi/musteri/hesabim", { cache: "no-store" });
    expect(asil.bodyUsed).toBe(true);
    expect(yanit.status).toBe(401);
    expect(yanit.ok).toBe(false);
  });

  it("isteği aynen geçirir; durum, başlıklar ve gövde aynı kalır", async () => {
    const asil = new Response(JSON.stringify({ basarili: true, veri: { eposta: "a@b.c" } }), {
      status: 200,
      statusText: "OK",
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
    const sahte = vi.spyOn(globalThis, "fetch").mockResolvedValue(asil);
    const istek = { method: "POST", body: "{}" };
    const yanit = await kapiyaIstek("/kapi/x", istek);
    expect(sahte).toHaveBeenCalledWith("/kapi/x", istek);
    expect(yanit.status).toBe(200);
    expect(yanit.statusText).toBe("OK");
    expect(yanit.headers.get("cache-control")).toBe("no-store");
    expect(await yanit.json()).toEqual({ basarili: true, veri: { eposta: "a@b.c" } });
  });

  it("gövdesiz durumda (204) yanıt kurulur", async () => {
    sahteYanit(new Response(null, { status: 204 }));
    const yanit = await kapiyaIstek("/kapi/x");
    expect(yanit.status).toBe(204);
    expect(await yanit.text()).toBe("");
  });

  it("ağ hatası çağırana aynen geçer", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("ağ"));
    await expect(kapiyaIstek("/kapi/x")).rejects.toThrow("ağ");
  });
});
