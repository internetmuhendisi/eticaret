// @vitest-environment jsdom
// Panelin ortak form yapısı (kart 0259, karar 0159): tek hatada odak alana, birden çok hatada ve alanı olmayan hatada
// özete; özetin sırası ekrandaki sıradır, satırı alana götürür; hatanın yolunda alan yoksa en yakın üst alan bulunur;
// kayıt sürerken ikinci gönderim yok sayılır ve düğmeler kapalıdır; kaydet çubuğu değişikliği söyler; kaydedilmemiş
// değişiklikle başka sayfaya giden bağlantı sorar ("Sayfada kal", "Kaydetmeden çık", "Kaydet ve çık"), sayfa
// kapanırken tarayıcı sorar. Panelin veri formları ortak yapıyı kullanır (tarama).
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { doldur } from "../../metinler/doldur.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { CikisKorumasi } from "../form/cikis-korumasi.tsx";
import {
  type AlanHatalari,
  AlanKabi,
  KaydetCubugu,
  PanelAlani,
  PanelFormu,
  usePanelFormu,
} from "../form/panel-formu.tsx";

const git = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: git, refresh: () => {} }) }));

const metin = metinOkuyucu("tr");

beforeEach(() => git.mockReset());
afterEach(cleanup);

// Deneme formu: iki alan ve bir liste kabı; gönderim verilen hataları gösterir ya da verilen işi bekler.
type Gonderim = { alanlar?: AlanHatalari; genel?: string[]; is?: () => Promise<boolean> };
const gonderimler: Gonderim[] = [];

function Deneme({
  degisti = false,
  kaydet,
}: {
  degisti?: boolean;
  kaydet?: () => Promise<boolean>;
}) {
  const [ad, setAd] = useState("");
  const pf = usePanelFormu({
    degisti: degisti || ad !== "",
    ...(kaydet === undefined ? {} : { kaydet }),
  });
  return (
    <PanelFormu
      durum={pf}
      gonder={async () => {
        const gonderim = gonderimler.shift() ?? {};
        if (gonderim.is !== undefined) {
          await pf.isle(gonderim.is);
          return;
        }
        pf.hatalariGoster(gonderim.alanlar ?? {}, gonderim.genel ?? []);
      }}
    >
      <PanelAlani ad="ad" etiket="Ad" zorunlu>
        {(alan) => (
          <GirisAlani
            {...alan}
            value={ad}
            onChange={(o) => {
              setAd(o.target.value);
              pf.alaniTemizle("ad");
            }}
          />
        )}
      </PanelAlani>
      <AlanKabi ad="liste" etiket="Liste">
        <p tabIndex={-1} data-hata-odagi="">
          {pf.hata("liste") ?? ""}
        </p>
      </AlanKabi>
      <PanelAlani ad="soyad" etiket="Soyad" zorunlu={false}>
        {(alan) => <GirisAlani {...alan} onChange={() => pf.alaniTemizle("soyad")} />}
      </PanelAlani>
      <KaydetCubugu kaydetEtiketi="Kaydet" vazgec={() => {}} durumYazisi degisiklikGerekli />
    </PanelFormu>
  );
}

const ciz = (ozellikler: Parameters<typeof Deneme>[0] = {}) =>
  render(
    <MetinSaglayici dil="tr">
      <Deneme {...ozellikler} />
    </MetinSaglayici>,
  );

const gonder = async () => {
  await act(async () => {
    fireEvent.submit(document.querySelector("form") as HTMLFormElement);
  });
};
const ozet = () => document.querySelector<HTMLElement>('[data-slot="hata-ozeti"]');

describe("hatalar ve odak", () => {
  it("tek alan hatasında özet yok, odak alana, hata alana bağlı", async () => {
    ciz({ degisti: true });
    gonderimler.push({ alanlar: { soyad: "boş olamaz" } });
    await gonder();
    expect(ozet()).toBeNull();
    const soyad = screen.getByLabelText("Soyad");
    expect(document.activeElement).toBe(soyad);
    expect(soyad.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(soyad.getAttribute("aria-describedby") ?? "")?.textContent).toBe(
      "boş olamaz",
    );
  });

  it("iki hatada özet ekrandaki sırayla, odak özette; satır alana götürür", async () => {
    ciz({ degisti: true });
    // Hatalar ters sırayla gelir: özet ekrandaki sırayı izler.
    gonderimler.push({ alanlar: { soyad: "boş olamaz", ad: "çok uzun" } });
    await gonder();
    const kutu = ozet();
    expect(document.activeElement).toBe(kutu);
    expect(kutu?.textContent).toContain(doldur(metin("yonetim.form.ozet.alanlar"), { sayi: "2" }));
    const satirlar = within(kutu as HTMLElement).getAllByRole("button");
    expect(satirlar.map((s) => s.textContent)).toEqual(["Ad: çok uzun", "Soyad: boş olamaz"]);
    fireEvent.click(satirlar[1] as HTMLElement);
    expect(document.activeElement).toBe(screen.getByLabelText("Soyad"));
  });

  it("düzeltilen alanın satırı özetten düşer; satır kalmayınca özet kalkar", async () => {
    ciz({ degisti: true });
    gonderimler.push({ alanlar: { ad: "çok uzun", soyad: "boş" } });
    await gonder();
    expect(within(ozet() as HTMLElement).getAllByRole("button")).toHaveLength(2);
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "x" } });
    expect(
      within(ozet() as HTMLElement)
        .getAllByRole("button")
        .map((s) => s.textContent),
    ).toEqual(["Soyad: boş"]);
    expect(screen.getByLabelText("Ad").getAttribute("aria-invalid")).toBeNull();
    fireEvent.change(screen.getByLabelText("Soyad"), { target: { value: "y" } });
    expect(ozet()).toBeNull();
  });

  it("alanı olmayan hata özette düz satır; yalnız o varsa başlık 'Kaydedilemedi' ve odak özette", async () => {
    ciz({ degisti: true });
    gonderimler.push({ alanlar: { yok: "kayıt bulunamadı" }, genel: ["bağlantı koptu"] });
    await gonder();
    const kutu = ozet() as HTMLElement;
    expect(document.activeElement).toBe(kutu);
    expect(kutu.textContent).toContain(metin("yonetim.form.ozet.kaydedilemedi"));
    expect(within(kutu).queryAllByRole("button")).toHaveLength(0);
    expect(kutu.textContent).toContain("bağlantı koptu");
    expect(kutu.textContent).toContain("kayıt bulunamadı");
  });

  it("hatanın yolunda alan yoksa en yakın üst alan bulunur, kabın hata odağına gidilir", async () => {
    ciz({ degisti: true });
    gonderimler.push({ alanlar: { "liste.2.ad": "boş olamaz" } });
    await gonder();
    expect(ozet()).toBeNull();
    expect(document.activeElement?.getAttribute("data-hata-odagi")).toBe("");
  });
});

describe("gönderim ve kaydet çubuğu", () => {
  it("kayıt sürerken ikinci gönderim yok sayılır, düğmeler kapalı", async () => {
    let bitir: (deger: boolean) => void = () => {};
    const bekleyen = new Promise<boolean>((coz) => {
      bitir = coz;
    });
    ciz({ degisti: true });
    let cagri = 0;
    gonderimler.push({
      is: () => {
        cagri += 1;
        return bekleyen;
      },
    });
    gonderimler.push({
      is: () => {
        cagri += 1;
        return Promise.resolve(true);
      },
    });
    await gonder();
    expect((screen.getByRole("button", { name: "Kaydet" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(
      (screen.getByRole("button", { name: metin("ortak.islem.vazgec") }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    await gonder();
    await act(async () => bitir(true));
    expect(cagri).toBe(1);
    expect((screen.getByRole("button", { name: "Kaydet" }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("değişiklik yokken düğmeler kapalı ve çubuk 'Değişiklik yok' der; yazınca açılır", () => {
    ciz();
    expect(screen.getByText(metin("yonetim.form.degisiklikYok"))).toBeDefined();
    expect((screen.getByRole("button", { name: "Kaydet" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "x" } });
    expect(screen.getByText(metin("yonetim.form.degisiklikVar"))).toBeDefined();
    expect((screen.getByRole("button", { name: "Kaydet" }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("zorunlu alanda yıldız (ekran okuyucudan gizli) ve aria-required, öteki alanda '(isteğe bağlı)'", () => {
    ciz();
    expect(screen.getByLabelText("Ad").getAttribute("aria-required")).toBe("true");
    expect(screen.getByText(metin("yonetim.form.zorunluIsareti")).getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(screen.getByLabelText("Soyad").getAttribute("aria-required")).toBeNull();
    expect(screen.getByText(metin("yonetim.form.istegeBagli"))).toBeDefined();
  });
});

const baskaSayfa = "kargo";
const buSayfa = "bu sayfa";

describe("çıkarken soru", () => {
  const korumali = (kaydet?: () => Promise<boolean>) =>
    render(
      <MetinSaglayici dil="tr">
        <CikisKorumasi>
          <a href="/yonetim/kargo">{baskaSayfa}</a>
          <a href={window.location.pathname}>{buSayfa}</a>
          <Deneme {...(kaydet === undefined ? {} : { kaydet })} />
        </CikisKorumasi>
      </MetinSaglayici>,
    );
  const tikla = (ad: string) => {
    const bag = screen.getByRole("link", { name: ad });
    const olay = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    act(() => {
      bag.dispatchEvent(olay);
    });
    return olay;
  };

  it("değişiklik yokken bağlantı sormaz; aynı sayfanın bağlantısı da sormaz", () => {
    korumali();
    expect(tikla("kargo").defaultPrevented).toBe(false);
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "x" } });
    expect(tikla("bu sayfa").defaultPrevented).toBe(false);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("değişiklikle başka sayfaya giderken sorar: Sayfada kal kalır, Kaydetmeden çık gider", () => {
    korumali();
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "x" } });
    expect(tikla("kargo").defaultPrevented).toBe(true);
    const pencere = screen.getByRole("alertdialog");
    expect(within(pencere).getByText(metin("yonetim.form.cikis.baslik"))).toBeDefined();
    // Formun kaydetme işi yok: "Kaydet ve çık" sunulmaz.
    expect(
      within(pencere).queryByRole("button", { name: metin("yonetim.form.cikis.kaydet") }),
    ).toBeNull();
    fireEvent.click(within(pencere).getByRole("button", { name: metin("yonetim.form.cikis.kal") }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(git).not.toHaveBeenCalled();
    tikla("kargo");
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: metin("yonetim.form.cikis.kaydetmeden"),
      }),
    );
    expect(git).toHaveBeenCalledWith("/yonetim/kargo");
  });

  it("Kaydet ve çık: kayıt olursa gider, olmazsa sayfada kalınır", async () => {
    const sonuclar = [false, true];
    const kaydet = vi.fn(async () => sonuclar.shift() ?? false);
    korumali(kaydet);
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "x" } });
    for (const beklenen of [0, 1]) {
      tikla("kargo");
      await act(async () => {
        fireEvent.click(
          within(screen.getByRole("alertdialog")).getByRole("button", {
            name: metin("yonetim.form.cikis.kaydet"),
          }),
        );
      });
      expect(git).toHaveBeenCalledTimes(beklenen);
    }
    expect(kaydet).toHaveBeenCalledTimes(2);
    expect(git).toHaveBeenCalledWith("/yonetim/kargo");
  });

  it("değişiklikle sayfa kapanırken tarayıcı sorar", () => {
    korumali();
    const temiz = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(temiz);
    expect(temiz.defaultPrevented).toBe(false);
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "x" } });
    const kirli = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(kirli);
    expect(kirli.defaultPrevented).toBe(true);
  });
});

describe("panelin formları ortak yapıda (tarama)", () => {
  // Elle <Form> yalnız ortak yapının kendisinde ve bilerek dışarıda kalanlarda: panelin girişi ve kod formu (panelin
  // çerçevesinin dışındadır) ve liste ekranının araması (veri formu değildir).
  const kok = resolve(import.meta.dirname, "../../..");
  const disaridaKalanlar = [
    "cekirdek/yonetim-paneli/form/panel-formu.tsx",
    "cekirdek/yonetim-paneli/giris-formu.tsx",
    "cekirdek/yonetim-paneli/kod-formu.tsx",
    "cekirdek/yonetim-paneli/liste/liste.tsx",
  ];
  // Yorum satırları sayılmaz.
  const elleFormVar = (icerik: string) =>
    icerik
      .split("\n")
      .filter((satir) => !satir.trim().startsWith("//"))
      .some((satir) => /<Form[\s>]/.test(satir));
  const dosyalar = (klasor: string): string[] =>
    readdirSync(klasor, { recursive: true, encoding: "utf8" })
      .filter((ad) => ad.endsWith(".tsx") && !ad.includes("testler"))
      .map((ad) => join(klasor, ad));

  it("panelin ve eklentilerin panel ekranları Form'u doğrudan kullanmaz", () => {
    const sorunlu = [
      ...dosyalar(join(kok, "cekirdek/yonetim-paneli")),
      ...dosyalar(join(kok, "cekirdek/eklentiler")).filter((yol) => yol.includes("/panel/")),
    ]
      .map((yol) => relative(kok, yol))
      .filter((yol) => !disaridaKalanlar.includes(yol))
      .filter((yol) => elleFormVar(readFileSync(join(kok, yol), "utf8")));
    expect(sorunlu).toEqual([]);
  });

  it("bozuk örnek: doğrudan Form kullanan dosya yakalanır", () => {
    expect(/<Form[\s>]/.test("return <Form onSubmit={gonder}>")).toBe(true);
    expect(/<Form[\s>]/.test("<FormAlani etiket={x}>")).toBe(false);
  });
});
