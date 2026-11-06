// Süre karşılaştıran testlerin tek ölçümü (karar 0048). İki iş sırayla ve çok tekrarla ölçülür:
// paralel testlerin yükü ikisine de aynı biner, en kısa süre gerçek hesabın süresine yaklaşır.
const tekrar = 20;

const sureOlc = async (is: () => Promise<unknown>): Promise<number> => {
  const baslangic = performance.now();
  await is();
  return performance.now() - baslangic;
};

export const siraylaEnKisaSureler = async (
  birinci: () => Promise<unknown>,
  ikinci: () => Promise<unknown>,
): Promise<[number, number]> => {
  const birinciler: number[] = [];
  const ikinciler: number[] = [];
  for (let i = 0; i < tekrar; i += 1) {
    birinciler.push(await sureOlc(birinci));
    ikinciler.push(await sureOlc(ikinci));
  }
  return [Math.min(...birinciler), Math.min(...ikinciler)];
};
