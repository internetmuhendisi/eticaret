"use client";
// Dosya yükleme (kart 0094, karar 0165; .claude/rules/formlar.md: görsel ve dosya yüklemesi tek ortak bileşenle,
// ilerleme ve iptal her yerde). Düğme tarayıcının dosya seçicisini açar; seçilen dosya kullanana verilir, isteği
// kullanan gönderir. Yükleme sürerken ilerleme çubuğu (oranı ekran okuyucuda okunur) ve "İptal" görünür; seçme
// düğmesi aria-disabled olur, odak kaybolmaz. Aynı dosya yeniden seçilebilir. Metinleri kullanan sayfa verir.
// Alanın hatası ve açıklaması düğmeye bağlanır (aria-describedby, aria-invalid): form alanın odağını bulur.
import { type ButtonHTMLAttributes, useRef } from "react";
import { Dugme, type DugmeTuru } from "./dugme.tsx";
import { sinif } from "./sinif.ts";

export type YuklemeDurumu = { oran: number } | null;

export function DosyaYukleme({
  secEtiketi,
  kabul,
  onSecildi,
  yukleme,
  ilerlemeEtiketi,
  iptalEtiketi,
  onIptal,
  tur = "cerceveli",
  disabled = false,
  className,
  ...dugmeOzellikleri
}: Pick<ButtonHTMLAttributes<HTMLButtonElement>, "id" | "aria-describedby" | "aria-invalid"> & {
  secEtiketi: string;
  // Tarayıcının dosya seçicisinde önerilen türler (MIME listesi). Sunucu yine içerikten denetler.
  kabul: string;
  onSecildi: (dosya: File) => void;
  // null: yükleme yok; oran 0–1.
  yukleme: YuklemeDurumu;
  ilerlemeEtiketi: string;
  iptalEtiketi: string;
  onIptal: () => void;
  tur?: DugmeTuru;
  disabled?: boolean;
  className?: string;
}) {
  const girdi = useRef<HTMLInputElement>(null);
  const suruyor = yukleme !== null;
  const yuzde = suruyor ? Math.round(Math.min(Math.max(yukleme.oran, 0), 1) * 100) : 0;
  return (
    <div data-slot="dosya-yukleme" className={sinif("flex flex-col gap-3", className)}>
      <input
        ref={girdi}
        type="file"
        accept={kabul}
        hidden
        tabIndex={-1}
        onChange={(olay) => {
          const dosya = olay.currentTarget.files?.[0];
          // Aynı dosya yeniden seçilebilsin: değer temizlenir.
          olay.currentTarget.value = "";
          if (dosya !== undefined) onSecildi(dosya);
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Dugme
          tur={tur}
          disabled={disabled}
          aria-disabled={suruyor ? true : undefined}
          onClick={() => {
            if (!suruyor) girdi.current?.click();
          }}
          {...dugmeOzellikleri}
        >
          {secEtiketi}
        </Dugme>
        {suruyor ? (
          <Dugme tur="sade" onClick={onIptal}>
            {iptalEtiketi}
          </Dugme>
        ) : null}
      </div>
      {suruyor ? (
        <div className="flex items-center">
          <div
            role="progressbar"
            aria-label={ilerlemeEtiketi}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={yuzde}
            className="h-2 w-full max-w-metin overflow-hidden rounded-dugme bg-yuzey"
          >
            <div
              className="h-full w-full origin-left bg-birincil transition-transform duration-kisa"
              style={{ transform: `scaleX(${yuzde / 100})` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
