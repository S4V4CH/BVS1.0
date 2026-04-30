import React, { useState, useEffect, useRef } from 'react';
import { useTicketViewModel } from '../../viewmodels/useTicketViewModel';

export const Dashboard: React.FC = () => {
  const { 
    loading, 
    logs, 
    txHash, 
    addLog, 
    generateUUID, 
    generateToken, 
    emitTicket 
  } = useTicketViewModel();

  const [form, setForm] = useState({
    voteId: '',
    electionId: 'ELEC-STUDENT-2024',
    voterToken: ''
  });

  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleGenVoteId = () => {
    const id = generateUUID();
    setForm(f => ({ ...f, voteId: id }));
    addLog(`UUID generado: ${id.substring(0, 8)}...`, 'system');
  };

  const handleGenToken = () => {
    const token = generateToken();
    setForm(f => ({ ...f, voterToken: token }));
    addLog(`Voter Token generado: ${token.substring(0, 8)}...`, 'system');
  };

  return (
    <div id="app">
        <header>
            <div className="logo">
                <span className="icon">⚡</span>
                <h1>BVS <span>Ticket Issuer</span></h1>
            </div>
            <p className="subtitle">Microservicio de Emisión de Tickets Blockchain (MVVM)</p>
        </header>

        <main className="dashboard">
            <section className="card-generator glass">
                <h2>Generador de Cargas</h2>
                <div className="input-group">
                    <label>Vote ID (UUID V4)</label>
                    <div className="input-with-action">
                        <input type="text" value={form.voteId} readOnly placeholder="Generar UUID..." />
                        <button onClick={handleGenVoteId} className="btn-action">Auto-gen</button>
                    </div>
                </div>

                <div className="input-group">
                    <label>Election ID</label>
                    <input 
                      type="text" 
                      value={form.electionId} 
                      onChange={e => setForm(f => ({...f, electionId: e.target.value}))} 
                    />
                </div>

                <div className="input-group">
                    <label>Voter Token (Anonymous)</label>
                    <div className="input-with-action">
                        <input type="text" value={form.voterToken} readOnly placeholder="Generar Token..." />
                        <button onClick={handleGenToken} className="btn-action">Auto-gen</button>
                    </div>
                </div>

                <button 
                  onClick={() => emitTicket(form)} 
                  disabled={loading} 
                  className="btn-primary"
                >
                  {loading ? 'EMITIENDO...' : 'EMITIR TICKET'}
                </button>
            </section>

            <section className="card-terminal glass">
                <h2>Terminal de Trazabilidad</h2>
                <div ref={terminalRef} className="terminal-container">
                    {logs.map((log, i) => (
                      <p key={i} className={`terminal-line ${log.type}`}>
                        [{log.time}] {log.msg}
                      </p>
                    ))}
                    {logs.length === 0 && (
                      <>
                        <p className="terminal-line system">SISTEMA INICIADO...</p>
                        <p className="terminal-line system">ESPERANDO ACCIÓN...</p>
                      </>
                    )}
                </div>
                {txHash && (
                  <div className="tx-result">
                      <h3>Confirmación On-Chain</h3>
                      <p className="tx-hash-display">{txHash}</p>
                      <a 
                        href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="btn-link"
                      >
                        Ver en Stellar Explorer
                      </a>
                  </div>
                )}
            </section>
        </main>
    </div>
  );
};
