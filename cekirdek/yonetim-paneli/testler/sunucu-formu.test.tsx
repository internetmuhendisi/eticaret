// @vitest-environment jsdom
// Panelde sunucunun verisinden kurulan form (kart 0223, sunucu-formu.ts): kayıttan sonra geç gelen yenileme arada
// yazılanı ezmez; sunucunun düzelttiği ya da başka yerde değişen veri, kaydedilmemiş değişiklik yoksa forma geçer.
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSunucuFormu } from "../sunucu-formu";

type Form = { sure: string };

const kur = (ilk: Form) =>
  renderHook(({ sunucu }: { sunucu: Form }) => useSunucuFormu<Form>(sunucu), {
    initialProps: { sunucu: ilk },
  });

describe("useSunucuFormu", () => {
  it("kayıttan sonra arada yazılan değer, kaydın yankısı olan yenilemeyle ezilmez", () => {
    const { result, rerender } = kur({ sure: "3" });
    act(() => result.current.setForm({ sure: "4" }));
    act(() => result.current.kaydedildi({ sure: "4" }));
    expect(result.current.degisti).toBe(false);
    // Yenileme gelmeden müşteri değeri yeniden değiştirir (eski değere döner).
    act(() => result.current.setForm({ sure: "3" }));
    rerender({ sunucu: { sure: "4" } });
    expect(result.current.form).toEqual({ sure: "3" });
    expect(result.current.degisti).toBe(true);
  });

  it("sunucunun düzelttiği değer, arada değişiklik yoksa forma geçer", () => {
    const { result, rerender } = kur({ sure: "3" });
    act(() => result.current.setForm({ sure: "04" }));
    act(() => result.current.kaydedildi({ sure: "04" }));
    rerender({ sunucu: { sure: "4" } });
    expect(result.current.form).toEqual({ sure: "4" });
    expect(result.current.degisti).toBe(false);
  });

  it("sunucunun düzelttiği değer gelince arada yazılan değer kalır", () => {
    const { result, rerender } = kur({ sure: "3" });
    act(() => result.current.setForm({ sure: "04" }));
    act(() => result.current.kaydedildi({ sure: "04" }));
    act(() => result.current.setForm({ sure: "7" }));
    rerender({ sunucu: { sure: "4" } });
    expect(result.current.form).toEqual({ sure: "7" });
    expect(result.current.degisti).toBe(true);
    act(() => result.current.vazgec());
    expect(result.current.form).toEqual({ sure: "4" });
  });

  it("başka yerde değişen veri: değişiklik yoksa forma geçer, varsa yazılan kalır", () => {
    const { result, rerender } = kur({ sure: "3" });
    rerender({ sunucu: { sure: "5" } });
    expect(result.current.form).toEqual({ sure: "5" });
    act(() => result.current.setForm({ sure: "8" }));
    rerender({ sunucu: { sure: "6" } });
    expect(result.current.form).toEqual({ sure: "8" });
    act(() => result.current.vazgec());
    expect(result.current.form).toEqual({ sure: "6" });
    expect(result.current.degisti).toBe(false);
  });

  it("kayıttan sonra eski veriyle yapılan çizim (aynı nesne) formu geri almaz", () => {
    const ilk = { sure: "3" };
    const { result, rerender } = kur(ilk);
    act(() => result.current.setForm({ sure: "4" }));
    act(() => result.current.kaydedildi({ sure: "4" }));
    rerender({ sunucu: ilk });
    expect(result.current.form).toEqual({ sure: "4" });
    expect(result.current.degisti).toBe(false);
  });

  it("yenileme kayıttan önceki değeri geri getirirse (sunucunun yazılışı) forma geçer", () => {
    const { result, rerender } = kur({ sure: "59,90" });
    act(() => result.current.setForm({ sure: "59,9" }));
    act(() => result.current.kaydedildi({ sure: "59,9" }));
    rerender({ sunucu: { sure: "59,90" } });
    expect(result.current.form).toEqual({ sure: "59,90" });
    expect(result.current.degisti).toBe(false);
  });

  it("aynı veri yeni nesneyle gelince hiçbir şey değişmez", () => {
    const { result, rerender } = kur({ sure: "3" });
    act(() => result.current.setForm({ sure: "9" }));
    rerender({ sunucu: { sure: "3" } });
    expect(result.current.form).toEqual({ sure: "9" });
    expect(result.current.degisti).toBe(true);
  });
});
