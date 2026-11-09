// Panelin sade dış düzeni: yalnız tasarım değerlerinin adlarıyla yazılmış Tailwind sınıfları (karar 0076).
// Açık ve koyu tema değerlerden gelir.
export const stil = {
  sarmal: "flex min-h-dvh flex-col p-2",
  icerik: "mx-auto flex w-full max-w-form flex-1 flex-col gap-4 p-2",
  altyapiAdi: "self-end text-kucuk text-soluk-yazi",
  form: "flex flex-col gap-4",
  // Karekod koyu temada da açık zeminde koyu durur: doğrulama uygulamaları ters renkli kodu okuyamayabilir.
  karekod: "block w-full max-w-karekod bg-karekod-zemin text-karekod",
  metinAnahtar: "wrap-anywhere font-kod",
  yedekKodlar: "m-0 grid list-none grid-cols-2 gap-2 p-0 font-kod tablet:grid-cols-3",
} as const;
