import { useState } from 'react';
import { TicketService } from '../models/TicketService';
import type { TicketRequest } from '../models/TicketService';

export const useTicketViewModel = () => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<{msg: string, type: string, time: string}[]>([]);
  const [txHash, setTxHash] = useState<string | null>(null);
  
  const ticketService = new TicketService();

  const addLog = (message: string, type: 'system' | 'info' | 'warn' | 'error' = 'info') => {
    setLogs(prev => [...prev, { 
      msg: message, 
      type, 
      time: new Date().toLocaleTimeString() 
    }]);
  };

  const generateUUID = () => crypto.randomUUID();
  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 32 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  };

  const emitTicket = async (request: TicketRequest) => {
    if (!request.voteId || !request.voterToken) {
      addLog('Error: Datos incompletos.', 'error');
      return;
    }

    setLoading(true);
    setTxHash(null);
    addLog('Iniciando proceso de emisión...', 'info');

    try {
      await ticketService.emitTicket(request);
      addLog(`Backend Aceptó la solicitud (202 ACCEPTED)`, 'info');
      addLog('Buscando en Stellar Horizon...', 'warn');
      
      const hash = await ticketService.pollStellarTransaction(request.voterToken);
      setTxHash(hash);
      addLog(`¡Transacción confirmada en Stellar!`, 'info');
      
    } catch (err: any) {
      addLog(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    logs,
    txHash,
    addLog,
    generateUUID,
    generateToken,
    emitTicket
  };
};
