'use client';

import { useTicketIssuerVM } from '../viewmodels/useTicketIssuerVM';

export function TicketIssuerView() {
  const {
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
  } = useTicketIssuerVM();

  return (
    <div id="app">
      <header>
        <div className="logo">
          <span className="icon">⚡</span>
          <h1>
            BVS <span>Ticket Issuer</span>
          </h1>
        </div>
        <p className="subtitle">Microservicio de Emisión de Tickets Blockchain</p>
      </header>

      <main className="dashboard">
        <section className="card-generator glass">
          <h2>Generador de Cargas</h2>
          <div className="input-group">
            <label htmlFor="voteId">Vote ID (UUID V4)</label>
            <div className="input-with-action">
              <input type="text" id="voteId" value={voteId} readOnly placeholder="Generar UUID..." />
              <button type="button" id="btnGenVoteId" className="btn-action" onClick={genVoteId}>
                Auto-gen
              </button>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="electionId">Election ID</label>
            <input
              type="text"
              id="electionId"
              value={electionId}
              onChange={(e) => setElectionId(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="voterToken">Voter Token (Anonymous)</label>
            <div className="input-with-action">
              <input type="text" id="voterToken" value={voterToken} readOnly placeholder="Generar Token..." />
              <button type="button" id="btnGenToken" className="btn-action" onClick={genToken}>
                Auto-gen
              </button>
            </div>
          </div>

          <button type="button" id="btnEmit" className="btn-primary" onClick={() => void onEmit()} disabled={emitDisabled}>
            EMITIR TICKET
          </button>
        </section>

        <section className="card-terminal glass">
          <h2>Terminal de Trazabilidad</h2>
          <div id="terminal" className="terminal-container" ref={terminalRef}>
            {logs.map((line) => (
              <p key={line.id} className={`terminal-line ${line.type}`}>
                [{line.time}] {line.message}
              </p>
            ))}
          </div>
          <div id="txResult" className={`tx-result ${!txResultVisible ? 'hidden' : ''}`}>
            <h3>Confirmación On-Chain</h3>
            <p id="txHash" className="tx-hash-display">
              {txHash ?? '---'}
            </p>
            <a
              id="btnStellarLink"
              href={txHash ? `https://stellar.expert/explorer/testnet/tx/${txHash}` : '#'}
              target="_blank"
              rel="noreferrer"
              className="btn-link"
            >
              Ver en Stellar Explorer
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
