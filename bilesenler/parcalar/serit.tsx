"use client";
// Kaydırmalı şerit (kart 0103; shadcn/ui carousel, Embla). Öğeler yatay kayar; parmakla sürüklenir, önceki
// ve sonraki düğmeleriyle ya da odak şeridin içindeyken sol ve sağ ok tuşlarıyla geçilir. Ekran okuyucu için
// şeridin ve öğelerin rol tanımı ile düğmelerin adları kullanan sayfadan gelir. Düğmeler şeridin dışına
// taşmaz: telefonda sayfa yana kaymaz.
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import {
  createContext,
  type HTMLAttributes,
  type KeyboardEvent,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { IkonDugmesi } from "./dugme.tsx";
import { sinif } from "./sinif.ts";

type SeritApi = UseEmblaCarouselType[1];

export type SeritMetinleri = {
  // Şeridin adı, örneğin "Öne çıkan ürünler".
  etiket: string;
  // Rol tanımları: ekran okuyucu "kaydırmalı şerit" ve "öğe" gibi okur.
  seritTanimi: string;
  ogeTanimi: string;
  onceki: string;
  sonraki: string;
};

type SeritBaglami = {
  seridinRefi: UseEmblaCarouselType[0];
  api: SeritApi;
  metinler: SeritMetinleri;
  oncekineGit: () => void;
  sonrakineGit: () => void;
  oncekiVar: boolean;
  sonrakiVar: boolean;
};

const Baglam = createContext<SeritBaglami | null>(null);

const useSerit = () => {
  const baglam = useContext(Baglam);
  if (baglam === null) throw new Error("Şeridin parçaları <Serit> içinde kullanılır.");
  return baglam;
};

export function Serit({
  metinler,
  secenekler,
  className,
  children,
  ...ozellikler
}: Omit<HTMLAttributes<HTMLDivElement>, "aria-label"> & {
  metinler: SeritMetinleri;
  secenekler?: Parameters<typeof useEmblaCarousel>[0];
}) {
  const [seridinRefi, api] = useEmblaCarousel(secenekler);
  const [oncekiVar, setOncekiVar] = useState(false);
  const [sonrakiVar, setSonrakiVar] = useState(false);

  const guncelle = useCallback((a: SeritApi) => {
    if (a === undefined) return;
    setOncekiVar(a.canScrollPrev());
    setSonrakiVar(a.canScrollNext());
  }, []);

  useEffect(() => {
    if (api === undefined) return;
    guncelle(api);
    api.on("reInit", guncelle);
    api.on("select", guncelle);
    return () => {
      api.off("reInit", guncelle);
      api.off("select", guncelle);
    };
  }, [api, guncelle]);

  const oncekineGit = useCallback(() => api?.scrollPrev(), [api]);
  const sonrakineGit = useCallback(() => api?.scrollNext(), [api]);

  // Ok tuşları şeridi kaydırır; içteki parça tuşu kendisi kullanıyorsa (yazı alanında imleç, sekmeler,
  // menü) şerit karışmaz.
  const tus = (olay: KeyboardEvent<HTMLDivElement>) => {
    const hedef = olay.target as HTMLElement;
    if (
      olay.defaultPrevented ||
      hedef.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(hedef.tagName)
    ) {
      return;
    }
    if (olay.key === "ArrowLeft") {
      olay.preventDefault();
      oncekineGit();
    } else if (olay.key === "ArrowRight") {
      olay.preventDefault();
      sonrakineGit();
    }
  };

  return (
    <Baglam.Provider
      value={{ seridinRefi, api, metinler, oncekineGit, sonrakineGit, oncekiVar, sonrakiVar }}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: WAI-ARIA'nın kaydırmalı şerit kalıbı bölgedir; section öğesi bölge adı olmadan rol taşımaz. */}
      <div
        role="region"
        aria-roledescription={metinler.seritTanimi}
        aria-label={metinler.etiket}
        data-slot="serit"
        onKeyDown={tus}
        className={sinif("relative flex flex-col gap-2", className)}
        {...ozellikler}
      >
        {children}
      </div>
    </Baglam.Provider>
  );
}

export function SeritIcerigi({ className, ...ozellikler }: HTMLAttributes<HTMLDivElement>) {
  const { seridinRefi } = useSerit();
  return (
    <div ref={seridinRefi} className="overflow-hidden" data-slot="serit-icerigi">
      <div className={sinif("-ml-4 flex", className)} {...ozellikler} />
    </div>
  );
}

export function SeritOgesi({ className, ...ozellikler }: HTMLAttributes<HTMLDivElement>) {
  const { metinler } = useSerit();
  return (
    // biome-ignore lint/a11y/useSemanticElements: WAI-ARIA'nın kaydırmalı şerit kalıbında her öğe bir gruptur; fieldset form öğesidir.
    <div
      role="group"
      aria-roledescription={metinler.ogeTanimi}
      data-slot="serit-ogesi"
      className={sinif("min-w-0 shrink-0 grow-0 basis-full pl-4", className)}
      {...ozellikler}
    />
  );
}

export function SeritDugmeleri({ className }: { className?: string }) {
  const { metinler, oncekineGit, sonrakineGit, oncekiVar, sonrakiVar } = useSerit();
  return (
    <div data-slot="serit-dugmeleri" className={sinif("flex justify-end gap-2", className)}>
      <IkonDugmesi
        ikon="onceki"
        etiket={metinler.onceki}
        tur="cerceveli"
        disabled={!oncekiVar}
        onClick={oncekineGit}
      />
      <IkonDugmesi
        ikon="sonraki"
        etiket={metinler.sonraki}
        tur="cerceveli"
        disabled={!sonrakiVar}
        onClick={sonrakineGit}
      />
    </div>
  );
}
