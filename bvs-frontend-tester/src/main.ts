import './style.css'

const ISSUER_PUBLIC_KEY = 'GBITOPOZ63GKSDNJSBVV3RXVCCF3TLWZJS2FKXERXA6LEND6XAC6DNBC';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';

// DOM Elements
const voteIdInput = document.getElementById('voteId') as HTMLInputElement;
const electionIdInput = document.getElementById('electionId') as HTMLInputElement;
const voterTokenInput = document.getElementById('voterToken') as HTMLInputElement;
const btnGenVoteId = document.getElementById('btnGenVoteId') as HTMLButtonElement;
const btnGenToken = document.getElementById('btnGenToken') as HTMLButtonElement;
const btnEmit = document.getElementById('btnEmit') as HTMLButtonElement;
const terminal = document.getElementById('terminal') as HTMLDivElement;
const txResult = document.getElementById('txResult') as HTMLDivElement;
const txHashEl = document.getElementById('txHash') as HTMLParagraphElement;
const btnStellarLink = document.getElementById('btnStellarLink') as HTMLAnchorElement;

// Helpers
const addLog = (message: string, type: 'system' | 'info' | 'warn' | 'error' = 'info') => {
  const line = document.createElement('p');
  line.className = `terminal-line ${type}`;
  const time = new Date().toLocaleTimeString();
  line.innerText = `[${time}] ${message}`;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
};

const generateUUID = () => {
  return crypto.randomUUID();
};

const generateToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
};

// Event Listeners
btnGenVoteId.addEventListener('click', () => {
  voteIdInput.value = generateUUID();
  addLog(`UUID generado: ${voteIdInput.value.substring(0, 8)}...`, 'system');
});

btnGenToken.addEventListener('click', () => {
  voterTokenInput.value = generateToken();
  addLog(`Voter Token generado: ${voterTokenInput.value.substring(0, 8)}...`, 'system');
});

btnEmit.addEventListener('click', async () => {
  const payload = {
    voteId: voteIdInput.value,
    electionId: electionIdInput.value,
    voterToken: voterTokenInput.value
  };

  if (!payload.voteId || !payload.voterToken) {
    addLog('Error: Por favor genera los datos antes de emitir.', 'error');
    return;
  }

  btnEmit.disabled = true;
  txResult.classList.add('hidden');
  addLog('Iniciando proceso de emisión...', 'info');
  addLog(`POST /api/v1/tickets/emit`, 'system');

  try {
    const response = await fetch('/api/v1/tickets/emit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const rawBody = await response.text();
    let data: Record<string, unknown> = {};
    if (rawBody) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        addLog(`Respuesta inválida del servidor (HTTP ${response.status})`, 'error');
        btnEmit.disabled = false;
        return;
      }
    } else if (!response.ok) {
      addLog(
        `Sin respuesta del backend (HTTP ${response.status}). ¿Está corriendo en :3000 y PostgreSQL en :5433?`,
        'error'
      );
      btnEmit.disabled = false;
      return;
    }

    if (response.ok) {
      addLog(`Backend aceptó la solicitud (HTTP ${response.status})`, 'info');
      addLog('Iniciando búsqueda de la transacción en Stellar Horizon...', 'warn');
      pollForTransaction(payload.voterToken);
    } else {
      const msg =
        (typeof data.message === 'string' && data.message) ||
        (typeof data.error === 'string' && data.error) ||
        rawBody ||
        `HTTP ${response.status}`;
      addLog(`Error del backend: ${msg}`, 'error');
      btnEmit.disabled = false;
    }
  } catch (err) {
    addLog(
      `Error de conexión: ${err}. Verifica que el backend esté en marcha (npm run dev en bvs-ticket-issuer).`,
      'error'
    );
    btnEmit.disabled = false;
  }
});

const pollForTransaction = async (voterToken: string) => {
  const expectedMemo = voterToken.substring(0, 28);
  let attempts = 0;
  const maxAttempts = 15;

  const check = async () => {
    attempts++;
    addLog(`Intento ${attempts}/${maxAttempts} de búsqueda...`, 'system');

    try {
      const resp = await fetch(`${HORIZON_URL}/accounts/${ISSUER_PUBLIC_KEY}/transactions?order=desc&limit=5`);
      const data = await resp.json();
      const transactions = data._embedded.records;

      const found = transactions.find((tx: any) => tx.memo === expectedMemo);

      if (found) {
        addLog(`¡Transacción encontrada! Hash: ${found.hash.substring(0, 16)}...`, 'info');
        showResult(found.hash);
        btnEmit.disabled = false;
      } else if (attempts < maxAttempts) {
        setTimeout(check, 3000);
      } else {
        addLog('Tiempo de espera agotado. Verifica manualmente en el explorer.', 'warn');
        btnEmit.disabled = false;
      }
    } catch (err) {
      addLog(`Error al consultar Horizon: ${err}`, 'error');
      if (attempts < maxAttempts) setTimeout(check, 5000);
      else btnEmit.disabled = false;
    }
  };

  check();
};

const showResult = (hash: string) => {
  txHashEl.innerText = hash;
  btnStellarLink.href = `https://stellar.expert/explorer/testnet/tx/${hash}`;
  txResult.classList.remove('hidden');
};
