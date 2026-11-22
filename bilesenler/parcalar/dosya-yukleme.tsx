"use client";
// Dosya yükleme (kart 0094, karar 0165; .claude/rules/formlar.md: görsel ve dosya yüklemesi tek ortak bileşenle,
// ilerleme ve iptal her yerde). Düğme tarayıcının dosya seçicisini açar; seçilen dosya kullanana verilir, isteği
// kullanan gönderir. Yükleme sürerken ilerleme çubuğu (oranı ekran okuyucuda okunur) ve "İptal" görünür; seçme
// düğmesi aria-disabled olur, odak kaybolmaz. Aynı dosya yeniden seçilebilir. Metinleri kullanan sayfa verir.
// Alanın hatası ve açıklaması düğmeye bağlanır (aria-describedby, aria-invalid): form alanın odağını bulur.
// Birden çok dosya (`coklu`, kart 0266) seçilebilir; `birakma` verilirse düğmeler kesik çizgili bir alanın içindedir ve
// dosyalar alanın üstüne sürüklenip bırakılabilir (yalnız fareyle; düğme klavyeyle ve dokunarak aynı işi yapar).
import { type ButtonHTMLAttributes, type ReactNode, useEffect, useRef, useState } from "react";
import { Ikon } from "../ikonlar/ikon.tsx";
import type { IkonAdi } from "../ikonlar/sozluk.ts";
import { Dugme, type DugmeTuru } from "./dugme.tsx";
import { IlerlemeCubugu } from "./ilerleme-cubugu.tsx";
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
  ikon,
  disabled = false,
  coklu = false,
  birakma,
  className,
  children,
  ...dugmeOzellikleri
}: Pick<ButtonHTMLAttributes<HTMLButtonElement>, "id" | "aria-describedby" | "aria-invalid"> & {
  secEtiketi: string;
  // Tarayıcının dosya seçicisinde önerilen türler (MIME listesi). Sunucu yine içerikten denetler.
  kabul: string;
  // Seçilen ya da bırakılan dosyalar (tek seçimde bir dosya).
  onSecildi: (dosyalar: File[]) => void;
  coklu?: boolean;
  // Bırakma alanının yazıları: başlık ("Görselleri buraya bırakın ya da seçin") ve açıklama.
  birakma?: { baslik: string; aciklama?: string };
  // null: yükleme yok; oran 0–1.
  yukleme: YuklemeDurumu;
  ilerlemeEtiketi: string;
  iptalEtiketi: string;
  onIptal: () => void;
  tur?: DugmeTuru;
  // Düğmenin yazısının önündeki ikon (sözlükten).
  ikon?: IkonAdi;
  disabled?: boolean;
  className?: string;
  // Seçme düğmesinin yanında duran öteki düğmeler (ör. "Logoyu kaldır"); yükleme sürerken gizlenmez, kullanan karar
  // verir.
  children?: ReactNode;
}) {
  const girdi = useRef<HTMLInputElement>(null);
  const kap = useRef<HTMLDivElement>(null);
  const suruyor = yukleme !== null;
  const [uzerinde, setUzerinde] = useState(false);
  const birak = (dosyalar: FileList | null | undefined) => {
    const liste = Array.from(dosyalar ?? []);
    if (liste.length === 0 || suruyor || disabled) return;
    onSecildi(coklu ? liste : liste.slice(0, 1));
  };
  // İptal yalnız yükleme sürerken vardır: odak ondayken yükleme biterse (iptal edildi ya da tamamlandı) odak seçme
  // düğmesine döner, gövdeye düşmez.
  const iptalOdakta = useRef(false);
  useEffect(() => {
    if (suruyor || !iptalOdakta.current) return;
    iptalOdakta.current = false;
    kap.current?.querySelector<HTMLButtonElement>("[data-dosya-sec]")?.focus();
  }, [suruyor]);
  return (
    <div ref={kap} data-slot="dosya-yukleme" className={sinif("flex flex-col gap-3", className)}>
      <input
        ref={girdi}
        type="file"
        accept={kabul}
        multiple={coklu}
        hidden
        tabIndex={-1}
        onChange={(olay) => {
          const dosyalar = olay.currentTarget.files;
          const liste = Array.from(dosyalar ?? []);
          // Aynı dosya yeniden seçilebilsin: değer temizlenir.
          olay.currentTarget.value = "";
          if (liste.length > 0) onSecildi(coklu ? liste : liste.slice(0, 1));
        }}
      />
      {/* biome-ignore lint/a11y/noStaticElementInteractions: bırakma yalnız fare içindir; aynı işi içindeki düğme yapar. */}
      <div
        data-slot="dosya-birakma-alani"
        data-uzerinde={uzerinde ? "" : undefined}
        onDragOver={(olay) => {
          if (birakma === undefined) return;
          olay.preventDefault();
          setUzerinde(true);
        }}
        onDragLeave={() => setUzerinde(false)}
        onDrop={(olay) => {
          if (birakma === undefined) return;
          olay.preventDefault();
          setUzerinde(false);
          birak(olay.dataTransfer?.files);
        }}
        className={
          birakma === undefined
            ? "contents"
            : sinif(
                "flex flex-col items-center justify-center gap-2 rounded-orta border-2 border-dashed border-alan-kenari bg-yuzey p-4 text-center",
                uzerinde && "border-yazi",
              )
        }
      >
        {birakma === undefined ? null : (
          <>
            <Ikon ad="yukle" />
            <span className="font-kalin">{birakma.baslik}</span>
            {birakma.aciklama === undefined ? null : (
              <span className="text-kucuk text-soluk-yazi">{birakma.aciklama}</span>
            )}
          </>
        )}
        <div
          className={sinif(
            "flex flex-wrap items-center gap-3",
            birakma !== undefined && "justify-center",
          )}
        >
          <Dugme
            data-dosya-sec=""
            tur={tur}
            disabled={disabled}
            aria-disabled={suruyor ? true : undefined}
            // Sürerken kapalı görünür (yalnız aria-disabled: odak alır, basılınca bir şey olmaz).
            className="aria-disabled:cursor-not-allowed aria-disabled:bg-yuzey aria-disabled:text-soluk-yazi"
            onClick={() => {
              if (!suruyor) girdi.current?.click();
            }}
            {...dugmeOzellikleri}
          >
            {ikon === undefined ? null : <Ikon ad={ikon} />}
            {secEtiketi}
          </Dugme>
          {suruyor ? (
            <Dugme
              tur="sade"
              onClick={onIptal}
              onFocus={() => {
                iptalOdakta.current = true;
              }}
              onBlur={() => {
                iptalOdakta.current = false;
              }}
            >
              {iptalEtiketi}
            </Dugme>
          ) : null}
          {children}
        </div>
      </div>
      {suruyor ? (
        <IlerlemeCubugu oran={yukleme.oran} etiket={ilerlemeEtiketi} className="max-w-metin" />
      ) : null}
    </div>
  );
}
