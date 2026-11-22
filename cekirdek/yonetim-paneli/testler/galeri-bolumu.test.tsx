// @vitest-environment jsdom
// Ürün ekranının galeri bölümü (kart 0266): ana görsel ilk görseldir (video değil), eksik alternatif metin ve küçük
// görsel yazıyla söylenir; seçilen birden çok dosya sırayla yükleme ucuna gider, yüklenen kendi kartında ilerlemeyle
// görünür, sıradaki "Sırada" yazar; reddedilen dosya adıyla ve nedeniyle yazılır, öteki dosyalar sürer; İptal sırayı
// durdurur; galerinin sınırını aşan dosya istek gitmeden reddedilir; Sil öğeyi kaldırır ve kayıtlı öğede çağırana
// söyler; Düzenle penceresi boş metni kabul etmez; "Video bağla" tanınmayan ve sitede kabul edilmeyen bağlantıyı
// reddeder, önizleme yalnız "Önizle"ye basınca çerezsiz oynatıcıyla yüklenir; öğenin hatası satırın Düzenle düğmesine
// bağlanır ve odak oraya gider; izni olmayana değiştiren düğme yoktur. Yükleme sahte XMLHttpRequest ile verilir.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { galeriOnerilenEnAz, galeriSinirlari } from "../../kayitlar/gorsel.ts";
import type { VideoSitesi } from "../../kayitlar/video-siteleri.ts";
import { doldur } from "../../metinler/doldur.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { PanelFormu, type PanelFormuDurumu, usePanelFormu } from "../form/panel-formu.tsx";
import { GaleriBolumu } from "../urunler/galeri-bolumu.tsx";
import type { GaleriFormOgesi } from "../urunler/galeri-formu.ts";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
vi.mock("../../../bilesenler/parcalar/bildirim", () => ({ bildirimGoster: () => {} }));

const metin = metinOkuyucu("tr");

class SahteIstek {
  static hepsi: SahteIstek[] = [];
  adres = "";
  govde: unknown;
  status = 0;
  response: ArrayBuffer | null = null;
  responseType = "";
  upload: { onprogress: ((olay: ProgressEvent) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  constructor() {
    SahteIstek.hepsi.push(this);
  }
  open(_yontem: string, adres: string) {
    this.adres = adres;
  }
  setRequestHeader() {}
  send(govde: unknown) {
    this.govde = govde;
  }
  abort() {
    this.onabort?.();
  }
  getAllResponseHeaders() {
    return "content-type: application/json\r\n";
  }
  yanitla(durum: number, govde: unknown) {
    this.status = durum;
    this.response = new TextEncoder().encode(JSON.stringify(govde)).buffer as ArrayBuffer;
    this.onload?.();
  }
}
const son = () => {
  const istek = SahteIstek.hepsi.at(-1);
  if (istek === undefined) throw new Error("İstek yok.");
  return istek;
};

beforeEach(() => {
  SahteIstek.hepsi = [];
  vi.stubGlobal("XMLHttpRequest", SahteIstek);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const kimlik = (n: number) => `${String(n).padStart(8, "0")}-1111-4111-8111-111111111111`;
const gorsel = (n: number, ek: Partial<GaleriFormOgesi> = {}): GaleriFormOgesi => ({
  anahtar: kimlik(n),
  kimlik: kimlik(n),
  tur: "gorsel",
  alternatifMetin: `Görsel ${n}`,
  dosya: kimlik(100 + n),
  genislik: 1200,
  yukseklik: 1200,
  ...ek,
});
const video: GaleriFormOgesi = {
  anahtar: kimlik(50),
  kimlik: kimlik(50),
  tur: "video",
  alternatifMetin: "Tanıtım",
  site: "youtube",
  videoKimligi: "dQw4w9WgXcQ",
};

let sonGaleri: GaleriFormOgesi[] = [];
const kaldirilanlar: string[] = [];
let formDurumu: PanelFormuDurumu | undefined;

function Deneme({
  ilk,
  izinli,
  videoSiteleri,
}: {
  ilk: GaleriFormOgesi[];
  izinli: boolean;
  videoSiteleri: readonly VideoSitesi[];
}) {
  const [galeri, setGaleri] = useState(ilk);
  const pf = usePanelFormu({ degisti: false });
  useEffect(() => {
    sonGaleri = galeri;
  }, [galeri]);
  formDurumu = pf;
  return (
    <PanelFormu durum={pf} gonder={async () => {}}>
      <GaleriBolumu
        galeri={galeri}
        degistir={setGaleri}
        kaldirildi={(k) => kaldirilanlar.push(k)}
        izinli={izinli}
        videoSiteleri={videoSiteleri}
        dosyaSinirlari={{ boyut: "10 MB", turler: "JPEG, PNG veya WebP" }}
      />
    </PanelFormu>
  );
}

const ciz = (
  ilk: GaleriFormOgesi[],
  { izinli = true, videoSiteleri = ["youtube"] as readonly VideoSitesi[] } = {},
) => {
  sonGaleri = ilk;
  kaldirilanlar.length = 0;
  return render(
    <MetinSaglayici dil="tr">
      <Deneme ilk={ilk} izinli={izinli} videoSiteleri={videoSiteleri} />
    </MetinSaglayici>,
  );
};

const g = (anahtar: string) => metin(`yonetim.urunEkrani.galeri.${anahtar}` as never);
const liste = () => screen.getByRole("list", { name: g("liste") });
const dosya = (ad: string) =>
  new File([new Uint8Array([0xff, 0xd8, 0xff])], ad, { type: "image/jpeg" });
const sec = (dosyalar: File[]) =>
  act(async () => {
    const girdi = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (girdi === null) throw new Error("Dosya girdisi yok.");
    fireEvent.change(girdi, { target: { files: dosyalar } });
  });
const yuklendi = (n: number, genislik = 1200) =>
  act(async () =>
    son().yanitla(200, {
      basarili: true,
      veri: { dosya: kimlik(200 + n), genislik, yukseklik: 600 },
    }),
  );

describe("galeri bölümü", () => {
  it("ana görsel ilk görseldir; eksik metin ve küçük görsel yazıyla söylenir", () => {
    ciz([
      video,
      gorsel(1, { genislik: galeriOnerilenEnAz - 1, yukseklik: 300 }),
      gorsel(2, { alternatifMetin: "" }),
    ]);
    const kartlar = within(liste()).getAllByRole("listitem");
    expect(kartlar).toHaveLength(3);
    expect(within(kartlar[0] as HTMLElement).queryByText(g("ana"))).toBeNull();
    expect(within(kartlar[1] as HTMLElement).getByText(g("ana"))).toBeDefined();
    expect(within(kartlar[1] as HTMLElement).getByText(g("kucuk"))).toBeDefined();
    expect(within(kartlar[2] as HTMLElement).getByText(g("altMetinEksik"))).toBeDefined();
    expect(within(kartlar[2] as HTMLElement).queryByText(g("kucuk"))).toBeNull();
    // Video kartı sitesini yazıyla söyler.
    expect(within(kartlar[0] as HTMLElement).getByText(/YouTube/)).toBeDefined();
  });

  it("birden çok dosya sırayla yüklenir; reddedilen adıyla yazılır, öteki sürer", async () => {
    ciz([gorsel(1)]);
    await sec([dosya("a.jpg"), dosya("b.jpg"), dosya("c.jpg")]);
    expect(SahteIstek.hepsi).toHaveLength(1);
    expect(son().adres).toBe("/kapi/yonetici/urun-gorseli-yukle");
    expect(
      screen.getByRole("progressbar", { name: doldur(g("yukleniyor"), { ad: "a.jpg" }) }),
    ).toBeDefined();
    expect(screen.getByText(doldur(g("sirada"), { ad: "b.jpg" }))).toBeDefined();
    // Sürerken yeni seçim ve video bağlama kapalıdır.
    expect((screen.getByRole("button", { name: g("sec") }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    await yuklendi(1);
    expect(SahteIstek.hepsi).toHaveLength(2);
    await act(async () =>
      son().yanitla(400, {
        basarili: false,
        hata: { kod: "dogrulama", ayrinti: [{ alan: "dosya", kod: "tur-izinsiz" }] },
      }),
    );
    await yuklendi(3, 500);
    expect(SahteIstek.hepsi).toHaveLength(3);
    expect(sonGaleri.map((oge) => oge.dosya)).toEqual([kimlik(101), kimlik(201), kimlik(203)]);
    expect(sonGaleri.slice(1).every((oge) => oge.kimlik === undefined)).toBe(true);
    const uyari = screen.getByRole("alert");
    expect(uyari.textContent).toContain(
      doldur(g("reddedildi"), {
        ad: "b.jpg",
        neden: doldur(metin("yonetim.dosya.hata.tur-izinsiz"), {
          turler: "JPEG, PNG veya WebP",
          boyut: "10 MB",
        }),
      }),
    );
    // Yeni görselin metni eksik, 500 pikseli küçük.
    const kartlar = within(liste()).getAllByRole("listitem");
    expect(within(kartlar[2] as HTMLElement).getByText(g("altMetinEksik"))).toBeDefined();
    expect(within(kartlar[2] as HTMLElement).getByText(g("kucuk"))).toBeDefined();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("İptal yüklemeyi ve sıradakileri durdurur", async () => {
    ciz([]);
    await sec([dosya("a.jpg"), dosya("b.jpg")]);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: metin("yonetim.dosya.iptal") }));
    });
    expect(SahteIstek.hepsi).toHaveLength(1);
    expect(sonGaleri).toEqual([]);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText(doldur(g("sirada"), { ad: "b.jpg" }))).toBeNull();
  });

  it("galerinin sınırını aşan dosya istek gitmeden reddedilir", async () => {
    ciz(Array.from({ length: galeriSinirlari.oge - 1 }, (_, i) => gorsel(i + 1)));
    await sec([dosya("son.jpg"), dosya("fazla.jpg")]);
    expect(SahteIstek.hepsi).toHaveLength(1);
    await yuklendi(1);
    expect(SahteIstek.hepsi).toHaveLength(1);
    expect(sonGaleri).toHaveLength(galeriSinirlari.oge);
    expect(screen.getByRole("alert").textContent).toContain("fazla.jpg");
  });

  it("Sil öğeyi kaldırır, kayıtlı öğeyi çağırana söyler", async () => {
    ciz([gorsel(1), gorsel(2)]);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: doldur(g("sil"), { ad: "Görsel 1" }) }));
    });
    expect(sonGaleri.map((oge) => oge.kimlik)).toEqual([kimlik(2)]);
    expect(kaldirilanlar).toEqual([kimlik(1)]);
    // Odak sonraki kartın Düzenle'sine geçer; son öğe silinince yükleme düğmesine.
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: doldur(g("duzenle"), { ad: "Görsel 2" }) }),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: doldur(g("sil"), { ad: "Görsel 2" }) }));
    });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: g("sec") }));
  });

  it("Düzenle penceresi boş metni kabul etmez, yazılanı uygular", async () => {
    ciz([gorsel(1)]);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: doldur(g("duzenle"), { ad: "Görsel 1" }) }),
      );
    });
    const pencere = screen.getByRole("dialog");
    const alan = within(pencere).getByRole("textbox", { name: new RegExp(g("altMetin")) });
    await act(async () => {
      fireEvent.change(alan, { target: { value: "  " } });
      fireEvent.click(within(pencere).getByRole("button", { name: g("uygula") }));
    });
    expect(within(pencere).getByText(g("altMetinGerekli"))).toBeDefined();
    expect(sonGaleri[0]?.alternatifMetin).toBe("Görsel 1");
    await act(async () => {
      fireEvent.change(alan, { target: { value: " Lacivert, önden " } });
      fireEvent.click(within(pencere).getByRole("button", { name: g("uygula") }));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(sonGaleri[0]?.alternatifMetin).toBe("Lacivert, önden");
  });

  it("Video bağla: tanınmayan ve kabul edilmeyen bağlantı reddedilir, önizleme basınca yüklenir", async () => {
    ciz([gorsel(1)]);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: g("videoBagla") }));
    });
    const pencere = screen.getByRole("dialog");
    const baglanti = within(pencere).getByRole("textbox", { name: new RegExp(g("baglanti")) });
    const baslik = within(pencere).getByRole("textbox", { name: new RegExp(g("videoBaslik")) });
    const ekle = () =>
      act(async () => {
        fireEvent.click(within(pencere).getByRole("button", { name: g("ekle") }));
      });
    await act(async () => {
      fireEvent.change(baglanti, { target: { value: "https://ornek.com/video" } });
    });
    await ekle();
    expect(
      within(pencere).getByText(metin("yonetim.urun.hata.video-adresi-gecersiz")),
    ).toBeDefined();
    expect(within(pencere).getByText(g("videoBaslikGerekli"))).toBeDefined();
    await act(async () => {
      fireEvent.change(baglanti, { target: { value: "https://vimeo.com/76979871" } });
      fireEvent.change(baslik, { target: { value: "Kullanım" } });
    });
    await ekle();
    expect(
      within(pencere).getByText(metin("yonetim.urun.hata.video-sitesi-izinsiz")),
    ).toBeDefined();
    await act(async () => {
      fireEvent.change(baglanti, { target: { value: "https://youtu.be/dQw4w9WgXcQ" } });
    });
    expect(pencere.querySelector("iframe")).toBeNull();
    await act(async () => {
      fireEvent.click(within(pencere).getByRole("button", { name: g("onizle") }));
    });
    expect(pencere.querySelector("iframe")?.getAttribute("src")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    await ekle();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(sonGaleri[1]).toMatchObject({
      tur: "video",
      video: "https://youtu.be/dQw4w9WgXcQ",
      alternatifMetin: "Kullanım",
      site: "youtube",
    });
    expect(sonGaleri[1]?.kimlik).toBeUndefined();
  });

  it("video sitesi yoksa Video bağla yoktur; izni olmayana değiştiren düğme yoktur", () => {
    const { unmount } = ciz([gorsel(1)], { videoSiteleri: [] });
    expect(screen.queryByRole("button", { name: g("videoBagla") })).toBeNull();
    unmount();
    ciz([gorsel(1)], { izinli: false });
    expect(screen.queryByRole("button", { name: g("sec") })).toBeNull();
    expect(screen.queryByRole("button", { name: doldur(g("sil"), { ad: "Görsel 1" }) })).toBeNull();
    expect(
      screen.queryByRole("button", { name: doldur(g("duzenle"), { ad: "Görsel 1" }) }),
    ).toBeNull();
  });

  it("öğenin hatası satırın Düzenle düğmesine bağlanır, odak oraya gider; galerinin hatası yükleme düğmesine", async () => {
    ciz([gorsel(1), gorsel(2)]);
    await act(async () => {
      formDurumu?.hatalariGoster({ "galeri.ogeler.1": "Metin uygun değil." }, []);
    });
    const duzenle = screen.getByRole("button", { name: doldur(g("duzenle"), { ad: "Görsel 2" }) });
    expect(document.activeElement).toBe(duzenle);
    expect(duzenle.getAttribute("aria-invalid")).toBe("true");
    // İpucu açıkken Radix kendi kimliğini ekler; hatanın kimliği listededir.
    const aciklamalar = (duzenle.getAttribute("aria-describedby") ?? "")
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent);
    expect(aciklamalar).toContain("Metin uygun değil.");
    await act(async () => {
      formDurumu?.hatalariGoster({ galeri: "Galeri değişti." }, []);
    });
    const yukle = screen.getByRole("button", { name: g("sec") });
    expect(document.activeElement).toBe(yukle);
    expect(yukle.getAttribute("aria-invalid")).toBe("true");
  });
});
