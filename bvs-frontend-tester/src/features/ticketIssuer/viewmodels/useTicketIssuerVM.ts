'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EmitPayload, LogType, TerminalLine } from '../models/types';
import { postEmitTicket } from '../services/ticketApi';
import { pollForTransaction } from '../services/stellarHorizon';

const generateUUID = () => crypto.randomUUID();

const generateToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join(
    ''
  );
};

const initialLines = (): TerminalLine[] => {
  const t = new Date().toLocaleTimeString();
  return [
    { id: 'init-1', time: t, message: 'SISTEMA INICIADO...', type: 'system' },
    { id: 'init-2', time: t, message: 'ESPERANDO ACCIÓN...', type: 'system' },
  ];
};

/**
 * ViewModel: estado, efectos y orquestación (misma lógica que el `main.ts` original).
 */
export function useTicketIssuerVM() {
  const [voteId, setVoteId] = useState('');
  const [electionId, setElectionId] = useState('ELEC-STUDENT-2024');
  const [voterToken, setVoterToken] = useState('');
  const [logs, setLogs] = useState<TerminalLine[]>(initialLines);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txResultVisible, setTxResultVisible] = useState(false);
  const [emitDisabled, setEmitDisabled] = useState(false);

  const terminalRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string, type: LogType = 'info') => {
    setLogs((prev) => {
      const time = new Date().toLocaleTimeString();
      return [...prev, { id: `${time}-${prev.length}`, time, message, type }];
    });
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const genVoteId = useCallback(() => {
    const v = generateUUID();
    setVoteId(v);
    addLog(`UUID generado: ${v.substring(0, 8)}...`, 'system');
  }, [addLog]);

  const genToken = useCallback(() => {
    const v = generateToken();
    setVoterToken(v);
    addLog(`Voter Token generado: ${v.substring(0, 8)}...`, 'system');
  }, [addLog]);

  const showResult = useCallback((hash: string) => {
    setTxHash(hash);
    setTxResultVisible(true);
  }, []);

  const onEmit = useCallback(async () => {
    const payload: EmitPayload = {
      voteId,
      electionId,
      voterToken,
    };

    if (!payload.voteId || !payload.voterToken) {
      addLog('Error: Por favor genera los datos antes de emitir.', 'error');
      return;
    }

    setEmitDisabled(true);
    setTxResultVisible(false);
    addLog('Iniciando proceso de emisión...', 'info');
    addLog('POST /api/v1/tickets/emit', 'system');

    try {
      const { ok, data } = await postEmitTicket(payload);

      if (ok) {
        addLog('Backend Aceptó la solicitud (202 ACCEPTED)', 'info');
        addLog('Iniciando búsqueda de la transacción en Stellar Horizon...', 'warn');
        void pollForTransaction(payload.voterToken, addLog, showResult, setEmitDisabled);
      } else {
        const msg = (data as { message?: string; error?: string }).message
          || (data as { message?: string; error?: string }).error;
        addLog(`Error del Backend: ${msg}`, 'error');
        setEmitDisabled(false);
      }
    } catch (err) {
      addLog(`Error de conexión: ${err}`, 'error');
      setEmitDisabled(false);
    }
  }, [voteId, electionId, voterToken, addLog, showResult]);

  return {
    voteId,
    electionId,
    voterToken,
    setElectionId,
    genVoteId,
    genToken,
    logs,
    onEmit,
    txHash,
    txResultVisible,
    emitDisabled,
    terminalRef,
  };
}
