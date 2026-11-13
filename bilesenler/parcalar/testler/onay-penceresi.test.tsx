// @vitest-environment jsdom
// Onay penceresi (kart 0143): uyarı penceresi olarak açılır, odak "Vazgeç"tedir, Escape ve Vazgeç onaylamadan kapatır,
// onay işi bitene kadar düğmeler kapalıdır ve pencere ancak iş bitince kapanır, odak açan düğmeye döner.
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dugme } from "../dugme.tsx";
import { OnayPenceresi } from "../onay-penceresi.tsx";

afterEach(cleanup);

const acmaYazisi = "Aç";

function Deneme({ onayla }: { onayla: () => void | Promise<void> }) {
  const [acik, setAcik] = useState(false);
  return (
    <>
      <Dugme onClick={() => setAcik(true)}>{acmaYazisi}</Dugme>
      <OnayPenceresi
        acik={acik}
        acikDegisince={setAcik}
        baslik="Silinsin mi?"
        aciklama="Geri getirilemez."
        onayEtiketi="Sil"
        vazgecEtiketi="Vazgeç"
        onayla={onayla}
      />
    </>
  );
}

describe("onay penceresi", () => {
  it("uyarı penceresi olarak açılır, odak Vazgeç'tedir; Escape onaylamadan kapatır, odak açana döner", async () => {
    const onayla = vi.fn();
    render(<Deneme onayla={onayla} />);
    const ac = screen.getByRole("button", { name: "Aç" });
    // jsdom tıklamada odak vermez; tarayıcıdaki gibi önce odaklanılır.
    ac.focus();
    fireEvent.click(ac);
    const pencere = screen.getByRole("alertdialog", { name: "Silinsin mi?" });
    expect(pencere.getAttribute("aria-describedby")).not.toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Vazgeç" }));
    fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onayla).not.toHaveBeenCalled();
    await waitFor(() => expect(document.activeElement).toBe(ac));
  });

  it("onay işi sürerken düğmeler kapalıdır, iş bitince pencere kapanır", async () => {
    let bitir: () => void = () => undefined;
    const onayla = vi.fn(
      () =>
        new Promise<void>((coz) => {
          bitir = coz;
        }),
    );
    render(<Deneme onayla={onayla} />);
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    expect(onayla).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alertdialog")).toBeDefined();
    expect((screen.getByRole("button", { name: "Sil" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Vazgeç" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    await act(async () => bitir());
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
