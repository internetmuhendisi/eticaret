// @vitest-environment jsdom
// Form alanının etiketi ve hatası alana bağlıdır (kart 0027).
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FormAlani } from "../form-alani";
import { GirisAlani } from "../giris-alani";
import { OnayKutusu } from "../onay-kutusu";

afterEach(cleanup);

describe("form alanı", () => {
  it("etiket alana bağlıdır, hatasız alan geçersiz işaretlenmez", () => {
    render(<FormAlani etiket="Ad">{(alan) => <GirisAlani {...alan} />}</FormAlani>);
    const alan = screen.getByLabelText("Ad");
    expect(alan.getAttribute("aria-invalid")).toBeNull();
    expect(alan.getAttribute("aria-describedby")).toBeNull();
  });

  it("hata yazıyla görünür ve alana bağlanır", () => {
    render(
      <FormAlani etiket="Ad" hata="Ad boş olamaz.">
        {(alan) => <GirisAlani {...alan} />}
      </FormAlani>,
    );
    const alan = screen.getByLabelText("Ad");
    expect(alan.getAttribute("aria-invalid")).toBe("true");
    const hata = document.getElementById(alan.getAttribute("aria-describedby") ?? "");
    expect(hata?.textContent).toBe("Ad boş olamaz.");
  });

  it("açıklama ve hata birlikte alana bağlanır", () => {
    render(
      <FormAlani etiket="Ad" aciklama="En az iki harf." hata="Ad boş olamaz.">
        {(alan) => <GirisAlani {...alan} />}
      </FormAlani>,
    );
    const baglilar = screen.getByLabelText("Ad").getAttribute("aria-describedby")?.split(" ") ?? [];
    expect(baglilar.map((id) => document.getElementById(id)?.textContent)).toEqual([
      "En az iki harf.",
      "Ad boş olamaz.",
    ]);
  });
});

describe("onay kutusu", () => {
  it("etiket kutuya bağlıdır, işaretsiz gelir, hatasız geçersiz işaretlenmez", () => {
    render(<OnayKutusu etiket="Kabul ediyorum" name="onay" />);
    const kutu = screen.getByLabelText("Kabul ediyorum") as HTMLInputElement;
    expect(kutu.type).toBe("checkbox");
    expect(kutu.checked).toBe(false);
    expect(kutu.getAttribute("aria-invalid")).toBeNull();
  });

  it("hata yazıyla görünür ve kutuya bağlanır", () => {
    render(<OnayKutusu etiket="Kabul ediyorum" name="onay" hata="İşaretleyin." />);
    const kutu = screen.getByLabelText("Kabul ediyorum");
    expect(kutu.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(kutu.getAttribute("aria-describedby") ?? "")?.textContent).toBe(
      "İşaretleyin.",
    );
  });
});
