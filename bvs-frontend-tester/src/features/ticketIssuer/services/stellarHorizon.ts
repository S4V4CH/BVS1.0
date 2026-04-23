import type { LogType } from '../models/types';

const ISSUER_PUBLIC_KEY = 'GBITOPOZ63GKSDNJSBVV3RXVCCF3TLWZJS2FKXERXA6LEND6XAC6DNBC';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';

type LogFn = (message: string, type: LogType) => void;

/**
 * Lectura pública vía Horizon (análogo a un “Web3 read” en el diagrama; aquí Stellar).
 */
export async function pollForTransaction(
  voterToken: string,
  addLog: LogFn,
  onFound: (txHash: string) => void,
  setEmitEnabled: (v: boolean) => void
): Promise<void> {
  const expectedMemo = voterToken.substring(0, 28);
  let attempts = 0;
  const maxAttempts = 15;

  const check = async () => {
    attempts++;
    addLog(`Intento ${attempts}/${maxAttempts} de búsqueda...`, 'system');

    try {
      const resp = await fetch(
        `${HORIZON_URL}/accounts/${ISSUER_PUBLIC_KEY}/transactions?order=desc&limit=5`
      );
      const data = (await resp.json()) as { _embedded?: { records: Array<{ memo: string; hash: string }> } };
      const transactions = data._embedded?.records ?? [];

      const found = transactions.find((tx) => tx.memo === expectedMemo);

      if (found) {
        addLog(`¡Transacción encontrada! Hash: ${found.hash.substring(0, 16)}...`, 'info');
        onFound(found.hash);
        setEmitEnabled(true);
      } else if (attempts < maxAttempts) {
        setTimeout(check, 3000);
      } else {
        addLog('Tiempo de espera agotado. Verifica manualmente en el explorer.', 'warn');
        setEmitEnabled(true);
      }
    } catch (err) {
      addLog(`Error al consultar Horizon: ${err}`, 'error');
      if (attempts < maxAttempts) setTimeout(check, 5000);
      else setEmitEnabled(true);
    }
  };

  check();
}
