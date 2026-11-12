// @vitest-environment jsdom
// Sıralanabilir liste (kart 0141): yukarı ve aşağı düğmeleri, klavyeyle taşıma, odak, duyurular. Sürükleme ve
// klavyeyle taşımanın gerçek tarayıcıda denenmesi cekirdek/testler/uctan-uca/bilesenler.test.ts'tedir.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dugme } from "../dugme.tsx";
import { type SiralamaMetinleri, SiralanabilirListe } from "../siralanabilir-liste.tsx";

afterEach(cleanup);

const uygulaAdi = "Sırayı uygula";

const metinler: SiralamaMetinleri = {
  tasi: (ad) => `Taşı: ${ad}`,
  yukari: (ad) => `Yukarı al: ${ad}`,
  asagi: (ad) => `Aşağı al: ${ad}`,
  talimat: "Boşlukla alın, oklarla taşıyın.",
  alindi: (ad, sira, toplam) => `${ad} alındı ${sira}/${toplam}`,
  tasindi: (ad, sira, toplam) => `${ad} taşındı ${sira}/${toplam}`,
  birakildi: (ad, sira, toplam) => `${ad} bırakıldı ${sira}/${toplam}`,
  vazgecildi: (ad, sira, toplam) => `${ad} vazgeçildi ${sira}/${toplam}`,
};

function Liste({
  kaydet,
  gecikmeli = false,
}: {
  kaydet?: (sira: string[]) => void;
  // Kullanan yeni sırayı hemen değil, "Sırayı uygula"ya basınca verir.
  gecikmeli?: boolean;
}) {
  const [ogeler, setOgeler] = useState(["Slider", "Kampanya", "Bülten"]);
  const [bekleyen, setBekleyen] = useState<string[] | null>(null);
  const uygula = () => {
    if (bekleyen !== null) setOgeler(bekleyen);
  };
  return (
    <>
      <Dugme onClick={uygula}>{uygulaAdi}</Dugme>
      <SiralanabilirListe
        ogeler={ogeler}
        anahtar={(oge) => oge}
        ad={(oge) => oge}
        siralaninca={(yeni) => {
          kaydet?.(yeni);
          if (gecikmeli) setBekleyen(yeni);
          else setOgeler(yeni);
        }}
        etiket="Bölümler"
        metinler={metinler}
        satir={(oge, islemler) => (
          <span>
            {oge}
            {islemler.ilk ? " ilk" : ""}
            {islemler.son ? " son" : ""}
          </span>
        )}
      />
    </>
  );
}

const sira = () =>
  within(screen.getByRole("list", { name: "Bölümler" }))
    .getAllByRole("listitem")
    .map((oge) => oge.textContent);

describe("sıralanabilir liste", () => {
  it("satırlar sırasıyla, ilk ve son bilgisiyle; tutamak ve düğmelerin adı satırın adını taşır", () => {
    render(<Liste />);
    expect(sira()).toEqual(["Slider ilk", "Kampanya", "Bülten son"]);
    expect(screen.getByRole("button", { name: "Taşı: Kampanya" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yukarı al: Slider" }).hasAttribute("disabled")).toBe(
      true,
    );
    expect(screen.getByRole("button", { name: "Aşağı al: Bülten" }).hasAttribute("disabled")).toBe(
      true,
    );
    expect(screen.getByRole("button", { name: "Aşağı al: Slider" }).hasAttribute("disabled")).toBe(
      false,
    );
  });

  it("aşağı ve yukarı al yeni sırayı verir, duyurur, odak taşınan satırın düğmesinde kalır", () => {
    const kaydet = vi.fn();
    render(<Liste kaydet={kaydet} />);
    const asagi = screen.getByRole("button", { name: "Aşağı al: Slider" });
    asagi.focus();
    fireEvent.click(asagi);
    expect(kaydet).toHaveBeenLastCalledWith(["Kampanya", "Slider", "Bülten"]);
    expect(sira()).toEqual(["Kampanya ilk", "Slider", "Bülten son"]);
    expect(screen.getByText("Slider taşındı 2/3")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Aşağı al: Slider" }));

    // Son sıraya inen satırın aşağı düğmesi kapanır, odak yukarı düğmesine geçer.
    fireEvent.click(screen.getByRole("button", { name: "Aşağı al: Slider" }));
    expect(sira()).toEqual(["Kampanya ilk", "Bülten", "Slider son"]);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Yukarı al: Slider" }));

    fireEvent.click(screen.getByRole("button", { name: "Yukarı al: Bülten" }));
    expect(kaydet).toHaveBeenLastCalledWith(["Bülten", "Kampanya", "Slider"]);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Aşağı al: Bülten" }));
  });

  it("kullanan yeni sırayı geç verirse odak, satır yeni yerine gelince konur", () => {
    render(<Liste gecikmeli />);
    const asagi = screen.getByRole("button", { name: "Aşağı al: Kampanya" });
    asagi.focus();
    fireEvent.click(asagi);
    // Sıra henüz değişmedi: odak yerinde kalır, eski sıradaki başka düğmeye geçmez.
    expect(sira()).toEqual(["Slider ilk", "Kampanya", "Bülten son"]);
    expect(document.activeElement).toBe(asagi);
    fireEvent.click(screen.getByRole("button", { name: uygulaAdi }));
    expect(sira()).toEqual(["Slider ilk", "Bülten", "Kampanya son"]);
    // Kampanya son sıraya indi, aşağı düğmesi kapandı: odak yukarı düğmesindedir, gövdeye düşmez.
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Yukarı al: Kampanya" }),
    );
  });

  it("tutamak sürükleme kullanım bilgisini ekran okuyucuya bağlar", () => {
    render(<Liste />);
    const tutamak = screen.getByRole("button", { name: "Taşı: Slider" });
    const aciklama = document.getElementById(tutamak.getAttribute("aria-describedby") ?? "");
    expect(aciklama?.textContent).toBe(metinler.talimat);
    expect(tutamak.getAttribute("aria-roledescription")).toBeTruthy();
  });

  it("klavyeyle boşlukla alınan satır boşlukla bırakılır ve duyurulur", async () => {
    const kaydet = vi.fn();
    render(<Liste kaydet={kaydet} />);
    const tutamak = screen.getByRole("button", { name: "Taşı: Slider" });
    tutamak.focus();
    await act(async () => {
      fireEvent.keyDown(tutamak, { code: "Space" });
    });
    await act(async () => {
      fireEvent.keyDown(tutamak, { code: "ArrowDown" });
    });
    await act(async () => {
      fireEvent.keyDown(tutamak, { code: "Space" });
    });
    // jsdom satırların yerini ölçemez (hepsi 0), satır yerinde kalır; taşımanın gerçek sonucu tarayıcı
    // testindedir. Burada yalnız sürüklemenin klavyeyle başlayıp bittiği ve bırakmanın duyurulduğu ölçülür.
    expect(document.body.textContent).toContain("Slider bırakıldı 1/3");
  });
});
