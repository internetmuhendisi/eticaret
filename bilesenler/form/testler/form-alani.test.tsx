// @vitest-environment jsdom
// Form alanının etiketi ve hatası alana bağlıdır (kart 0027).
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { GirisAlani } from "../../parcalar/giris-alani.tsx";
import { OnayKutusu } from "../../parcalar/onay-kutusu.tsx";
import { Form } from "../form";
import { FormAlani } from "../form-alani";

afterEach(cleanup);

// Radix'in onay kutusu formdaki gizli alanın boyutunu ResizeObserver ile izler; jsdom'da yoktur, gerçek
// tarayıcıda vardır (tarayıcı testi cekirdek/testler/uctan-uca/bilesenler.test.ts).
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

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
    const kutu = screen.getByRole("checkbox", { name: "Kabul ediyorum" });
    expect(kutu.getAttribute("aria-checked")).toBe("false");
    expect(kutu.getAttribute("aria-invalid")).toBeNull();
  });

  it("yazıya dokunmak kutuyu işaretler, işaretli kutu form verisinde gelir", async () => {
    const kullanici = userEvent.setup();
    render(
      <Form data-testid="form" kodGerekliMetni="" yukleniyorMetni="">
        <OnayKutusu etiket="Kabul ediyorum" name="onay" />
      </Form>,
    );
    const form = screen.getByTestId("form") as HTMLFormElement;
    expect(new FormData(form).get("onay")).toBeNull();
    await kullanici.click(screen.getByText("Kabul ediyorum"));
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe("true");
    expect(new FormData(form).get("onay")).toBe("on");
    await kullanici.keyboard(" ");
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe("false");
    expect(new FormData(form).get("onay")).toBeNull();
  });

  it("hata yazıyla görünür ve kutuya bağlanır", () => {
    render(<OnayKutusu etiket="Kabul ediyorum" name="onay" hata="İşaretleyin." />);
    const kutu = screen.getByRole("checkbox", { name: "Kabul ediyorum" });
    expect(kutu.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(kutu.getAttribute("aria-describedby") ?? "")?.textContent).toBe(
      "İşaretleyin.",
    );
  });
});
