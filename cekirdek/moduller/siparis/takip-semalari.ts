// Üye olmayanın sipariş takibi formunun şeması (kart 0238, karar 0150; .claude/rules/formlar.md). Vitrinin takip formu
// ile uç aynı şemayı kullanır. Bu dosya tarayıcıya gider: yalnız hafif şemaları içe aktarır (kart 0248).

import { z } from "zod";
import { epostaSemasi } from "../oturum/semalar.ts";
import { robotCevabiSemasi } from "../robot-korumasi/semalar.ts";
import { siparisNumarasiSemasi } from "./havale-bildirimi-semalari.ts";

export const siparisTakibiFormuSemasi = z.strictObject({
  numara: siparisNumarasiSemasi,
  eposta: epostaSemasi,
});

export const siparisTakibiGirdisi = siparisTakibiFormuSemasi.extend({
  robotCevabi: robotCevabiSemasi,
});
