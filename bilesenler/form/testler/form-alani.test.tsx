// @vitest-environment jsdom
// Form alanının etiketi ve hatası alana bağlıdır (kart 0027).
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FormAlani } from "../form-alani";
import { GirisAlani } from "../giris-alani";

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
});
