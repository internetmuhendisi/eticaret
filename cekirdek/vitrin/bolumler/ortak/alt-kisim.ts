// Alt kısım bölümlerinin ortak sınıfları (kart 0108). Alt kısmın zemini ve yazısı çerçevededir
// (cekirdek/vitrin/ust-alt-kisim.tsx); bağlantılar o yazının rengini alır, ikincil yazı soluk rengidir.
export const altKisimSiniflari = {
  kutu: "mx-auto flex w-full max-w-icerik flex-col gap-3 px-4 py-6",
  baslik: "text-govde font-kalin",
  baglanti: "min-h-11 justify-start text-left text-alt-kisim-ustu",
  soluk: "text-alt-kisim-soluk",
} as const;
