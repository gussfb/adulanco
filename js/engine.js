/**
 * Adulanco 3.5 — Motor de Cálculo
 * Engenharia reversa do VBA (Adulanco_3.1.xls, Mark Spekken 2004)
 *
 * Calcula Coeficiente de Variação (CV) para simulação de sobreposição
 * de faixas de aplicação de fertilizante sólido.
 */

const AdulancoEngine = (() => {

  /**
   * Calcula o Coeficiente de Variação (CV%) de um array de valores.
   * CV = (desvio_padrão / média) × 100
   * Corresponde a CalcCV() do VBA (Módulo2).
   *
   * @param {number[]} values - Array de valores (1-indexed no VBA, aqui 0-indexed)
   * @param {number} n - Quantidade de valores a considerar
   * @returns {number} CV em porcentagem
   */
  function calcCV(values, n) {
    if (n <= 1) return 0;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += values[i];
    }
    const mean = sum / n;
    if (mean === 0) return 0;
    let variance = 0;
    for (let i = 0; i < n; i++) {
      variance += (values[i] - mean) * (values[i] - mean);
    }
    variance /= (n - 1);
    return (Math.sqrt(variance) / mean) * 100;
  }

  /**
   * Simula sobreposição de passadas para uma dada largura de distribuição.
   * Corresponde a distribui() do VBA (Módulo2).
   *
   * @param {number} NC - Número de coletores
   * @param {number} CC - Coletor central (1-indexed)
   * @param {number} LD - Largura de distribuição em nº de coletores
   * @param {boolean} PI - true se par, false se ímpar
   * @param {number[]} PC - Peso dos coletores (1-indexed: PC[1]..PC[NC])
   * @returns {{cvAD: number, cvAE: number, cvC: number}}
   */
  function distribute(NC, CC, LD, PI, PC) {
    // SAED: array auxiliar para sistemas alternados (centrado na posição 150)
    // No VBA: SAED(1 To 500), inicializado com o perfil original centrado em 150
    const SAED = new Float64Array(501); // 0..500
    const VSC  = new Float64Array(NC + 1); // sistema contínuo (1..NC)

    // Inicializa com o perfil original centrado na posição 150
    for (let i = 1; i <= NC; i++) {
      SAED[150 - CC + i] = PC[i];
      VSC[i] = PC[i];
    }

    let SD = false; // flag de alternância de direção

    // Simula passadas adjacentes (espaçadas de LD coletores)
    for (let j = LD; j <= NC; j += LD) {
      for (let i = 1; i <= NC; i++) {
        let col, num;

        // --- Sistema Alternado Direito ---
        if (SD) {
          col = j + i; // X é removido (era posição de visualização)
          num = PC[i];
        } else {
          col = j + i + (CC - (NC - CC));
          if (!PI) {
            col = col - 1;
          }
          num = PC[NC - i + 1];
        }
        SAED[150 - CC + col] = (SAED[150 - CC + col] || 0) + num;

        // --- Sistema Alternado Esquerdo ---
        if (SD) {
          col = -j + i;
          num = PC[i];
        } else {
          col = -j + i + (CC - (NC - CC));
          if (!PI) {
            col = col - 1;
          }
          num = PC[NC - i + 1];
        }
        SAED[150 - CC + col] = (SAED[150 - CC + col] || 0) + num;

        // --- Sistema Contínuo (sempre mesma direção) ---
        // Passada à direita
        col = j + i;
        num = PC[i];
        if (col > 0 && col <= NC) {
          VSC[col] = (VSC[col] || 0) + num;
        }

        // Passada à esquerda
        col = -j + i;
        num = PC[i];
        if (col > 0 && col <= NC) {
          VSC[col] = (VSC[col] || 0) + num;
        }
      }
      SD = !SD;
    }

    // Extrai faixas para cálculo do CV
    const VLAD = []; // Alternado Direito: posições 151..150+LD
    const VLAE = []; // Alternado Esquerdo: posições 150-LD+1..150
    for (let i = 1; i <= LD; i++) {
      VLAD.push(SAED[150 + i] || 0);
      VLAE.push(SAED[150 - LD + i] || 0);
    }

    // Contínuo: primeiros LD coletores
    const VLC = [];
    for (let i = 1; i <= LD; i++) {
      VLC.push(VSC[i] || 0);
    }

    return {
      cvAD: calcCV(VLAD, LD),
      cvAE: calcCV(VLAE, LD),
      cvC:  calcCV(VLC, LD)
    };
  }

  /**
   * Calcula CV para todas as larguras possíveis.
   * Corresponde a Dist_todos() do VBA (Módulo2).
   *
   * @param {object} params
   * @param {number} params.numColetores - Nº de coletores
   * @param {number} params.numRepeticoes - Nº de repetições
   * @param {number} params.numPassadas - Nº de passadas
   * @param {number} params.coletorCentral - Coletor central (1-indexed)
   * @param {number} params.tamanhoColeta - Largura/dist entre coletores (cm)
   * @param {boolean} params.parImpar - true=Par, false=Ímpar
   * @param {number[]} params.medias - Médias por coletor (1-indexed)
   * @returns {object[]} Array de {coletor, largura, cvAD, cvAE, cvC, peso}
   */
  function calculateAll(params) {
    const { numColetores: NC, coletorCentral: CC, tamanhoColeta: TC,
            parImpar: PI, medias: PC } = params;

    const results = [];
    for (let ld = 1; ld <= NC; ld++) {
      const { cvAD, cvAE, cvC } = distribute(NC, CC, ld, PI, PC);
      results.push({
        coletor: ld,
        largura: (ld * TC / 100), // converte coletores → metros
        cvAD: cvAD,
        cvAE: cvAE,
        cvC:  cvC,
        peso: PC[ld] || 0
      });
    }
    return results;
  }

  /**
   * Encontra mínimos locais nas curvas de CV (até 3 por sistema).
   * Corresponde a Selec_Result() do VBA (Módulo4).
   *
   * @param {object[]} results - Array de resultados de calculateAll()
   * @returns {{altDir: number[], altEsq: number[], continuo: number[]}} Larguras ótimas (m)
   */
  function findOptimalWidths(results) {
    const minima = { altDir: [], altEsq: [], continuo: [] };

    // Percorre de trás para frente (como no VBA) procurando mínimos locais
    for (let i = results.length - 2; i >= 1; i--) {
      const r = results[i];
      const prev = results[i - 1];
      const next = results[i + 1];

      if (r.cvAD < prev.cvAD && r.cvAD < next.cvAD && minima.altDir.length < 3) {
        minima.altDir.push(r.largura);
      }
      if (r.cvAE < prev.cvAE && r.cvAE < next.cvAE && minima.altEsq.length < 3) {
        minima.altEsq.push(r.largura);
      }
      if (r.cvC < prev.cvC && r.cvC < next.cvC && minima.continuo.length < 3) {
        minima.continuo.push(r.largura);
      }
    }

    return minima;
  }

  /**
   * Interpolação linear para preencher zeros entre valores não-zero.
   * Corresponde a Interpolar() do VBA (Módulo6).
   *
   * @param {number[][]} data - Matriz [repetição][coletor] (0-indexed)
   * @param {number} numColetores
   * @param {number} numRepeticoes
   * @returns {number[][]} Dados interpolados
   */
  function interpolate(data, numColetores, numRepeticoes) {
    for (let rep = 0; rep < numRepeticoes; rep++) {
      for (let i = 1; i < numColetores; i++) {
        if (data[rep][i - 1] !== 0 && data[rep][i] === 0) {
          let j = i;
          while (j < numColetores && data[rep][j] === 0) {
            j++;
          }
          if (j < numColetores) {
            const val1 = data[rep][i - 1];
            const val2 = data[rep][j];
            const step = (val2 - val1) / (j - i + 1);
            for (let k = i; k <= j; k++) {
              data[rep][k] = val1 + step * (k - i + 1);
            }
          }
        }
      }
    }
    return data;
  }

  /**
   * Calcula totais e médias por coletor.
   *
   * @param {number[][]} data - Matriz [repetição][coletor] (0-indexed)
   * @param {number} numColetores
   * @param {number} numRepeticoes
   * @param {number} numPassadas
   * @returns {{totais: number[], medias: number[]}} Arrays 1-indexed
   */
  function calcTotaisMedias(data, numColetores, numRepeticoes, numPassadas) {
    const totais = new Array(numColetores + 1).fill(0);
    const medias = new Array(numColetores + 1).fill(0);

    for (let col = 0; col < numColetores; col++) {
      let soma = 0;
      for (let rep = 0; rep < numRepeticoes; rep++) {
        soma += (data[rep][col] || 0);
      }
      // Total = SUM(reps) / passadas (conforme fórmula do VBA)
      totais[col + 1] = soma / numPassadas;
      // Média = Total / repetições
      medias[col + 1] = totais[col + 1] / numRepeticoes;
    }

    return { totais, medias };
  }

  // API pública
  return {
    calcCV,
    distribute,
    calculateAll,
    findOptimalWidths,
    interpolate,
    calcTotaisMedias
  };

})();
