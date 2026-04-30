# Patrones de Diseño Estructurales en BVS Ticket Issuer

Este documento consolida el análisis técnico de los 6 patrones de diseño estructurales aplicados rigurosamente en el código del microservicio.

---

## 1. Command

### Explicación general
El patrón Command encapsula una solicitud como un objeto independiente (una caja inmutable de datos) que viaja por el sistema sin ejecutar lógica por sí misma. En este proyecto se usa específicamente para desacoplar el controlador web (quien recibe los datos de internet) de la compleja lógica central de negocio, logrando que el sistema completo hable un único lenguaje estandarizado al transaccionar.

### Actores en bvs-ticket-issuer
- **Client** — `index.ts`. Es quien configura el ecosistema inicial; crea las bases de datos, junta al *Receiver* y se lo pasa al *Invoker* para que actúen en simbiosis.
- **Invoker** — `EmitTicketController.ts`. Recibe el JSON de internet, decide cuándo estructurar formalmente el Comando e *invoca* la orden definitiva de ejecución hacia el interior.
- **Command / Contract** — `EmitTicketUseCase.ts`. Archivo estructural que define la anatomía de la carga útil o DTO (`EmitTicketCommand`) y las firmas de acción (`IEmitTicketUseCase`).
- **Receiver** — `EmitTicketHandler.ts`. Es el experto transaccional; contiene la lógica detallada (Stellar, Prisma) sobre cómo interpretar y procesar los propósitos empaquetados en cada Comando.

---

### Flujo paso a paso

#### Paso 1 — El Client configura la estructura
El cliente arranca la aplicación, arma las piezas pesadas y le inyecta el `Receiver` al `Invoker` para que se pasen la petición sin depender de librerías en bruto.
```typescript
// src/index.ts
  // 5. Instanciar el Caso de Uso central resolviendo todas sus dependencias (Receiver) 
  const emitTicketUseCase = new EmitTicketHandler(
    repository,
    blockchainPort,
    eventNotifier,
    chain
  );

  // 6. Instanciar el Controlador (Invoker) entregándole el Caso de Uso (Receiver)
  const emitController = new EmitTicketController(emitTicketUseCase);
```

#### Paso 2 — El Invoker arma el Command y dispara la acción
El controlador desempaqueta HTTP en sucio y ensambla limpiamente el Comando (dictado por Zod), dando la orden de ejecución (`execute`) directa a su trabajador blindado.
```typescript
// src/infrastructure/web/controllers/EmitTicketController.ts
  async handleEmit(request: FastifyRequest, reply: FastifyReply) {
    try {
      // 1. Invoker recolecta intenciones que servirán como "Comando"
      const payload = emitSchema.parse(request.body);

      // 2. Invoker emite la orden despachándola al Receiver
      await this.useCase.execute(payload);
      
      return reply.status(202).send({ status: 'ACCEPTED', /*...*/ });
// ...
```

#### Paso 3 — El Receiver captura el Command y hace su trabajo
Intercepta el objeto, tomándolo como su única fuente absoluta de verdad para operar la base de datos o Stellar.
```typescript
// src/application/use-cases/EmitTicketHandler.ts
  public async execute(command: EmitTicketCommand): Promise<void> {    
    // ... hace validaciones con su cadena interna

    const ticket = TicketEmission.create({
      voteId: command.voteId,
      electionId: command.electionId,
      voterToken: command.voterToken
    });

    // ... lógica real (guardar off-chain, intentar emitir y notificar)
  }
```

---

## 2. Chain of Responsibility

### Explicación general
Permite pasar datos a través de una serie de inspectores o "eslabones". En este proyecto se usa específicamente para extraer el masivo muro de validación por IFs (vulnerables) fuera de la clase central de negocio, creando clases dedicadas, simples y aisladas que verifican micro-reglas de seguridad (como examinar una expresión regular UUID) y detienen un flujo sospechoso antes de consultar Bases de Datos.

### Actores en bvs-ticket-issuer
- **Handler (Base)** — `ValidatorChain.ts`. Clase e interfaz abstracta. Formula cómo los inspectores deben rechazar peticiones y pasárselas al siguiente colega de la cadena.
- **ConcreteHandler** — `Rules.ts`. Almacena lógicamente cómo lucen físicamente esas reglas minúsculas que heredan del padre universal. Solo evalúan reglas limitadas.
- **Director** — `index.ts`. Entidad externa responsable de decidir qué validadores irán primero que otros concatenándolos.

---

### Flujo paso a paso

#### Paso 1 — El Director arma y amarra la cadena
En el archivo principal, se preparan las clases de validación por separado y se encadenan usando apuntadores `setNext()`.
```typescript
// src/index.ts
  // 4. Encadenar Validadores (Aplicación)
  const uuidVal = new ValidUUIDFormatValidator();
  const tokenVal = new VoterTokenPresentValidator();
  
  uuidVal.setNext(tokenVal); 
  
  const chain = new ValidatorChain(uuidVal);
```

#### Paso 2 — El Handler de negocio inicia la inspección
Cuando va a nacer un ticket transaccional, en lugar de preguntar si está válido a mano, se suelta el paquete de datos en la puerta del túnel (cadena). Si retorna un registro de error, interrumpe el ciclo nativo y lo rebota a la web.
```typescript
// src/application/use-cases/EmitTicketHandler.ts
  async execute(command: EmitTicketCommand): Promise<void> {
    logger.info({ voteId: command.voteId }, "Received EmitTicketCommand");

    // 1. Ejecutar validaciones de la cadena (Chain of Responsibility)
    const validationResult = await this.validatorChain.handle(command);
    if (!validationResult.isValid) {
      logger.warn({ voteId: command.voteId, errors: validationResult.errors }, "Validation failed");
      throw new ValidationError(validationResult.errors.join(', '));
    }
// ...
```

#### Paso 3 — El ConcreteHandler revisa el paquete particular
Un eslabón revisa si el VoteID cumple ser un formato UUID. Aísla fallos de ser necesario, añadiéndolos al carrusel de excepciones en curso.
```typescript
// src/application/validations/Rules.ts
export class ValidUUIDFormatValidator extends Validator {
  protected async process(command: EmitTicketCommand, errors: string[]): Promise<void> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(command.voteId)) {
      errors.push(`El VoteID '${command.voteId}' no tiene formato UUID v4 válido.`);
    }
  }
}
```

---

## 3. Factory Method

### Explicación general
Oculta y domina en monopolio la lógica sobre cómo se debe fabricar o "construir" un objeto complejo. En este proyecto se utiliza específicamente para bloquear que otro programador fuerce el nacimiento de un objeto `TicketEmission` desde cero pasándole estados adulterados o peligrosos, garantizando en su lugar inicializaciones perfectas (estados PENDING y fechas inyectadas atómicamente).

### Actores en bvs-ticket-issuer
- **Creator** — `EmitTicketHandler.ts`. Es la capa o cliente que reclama al universo tener un nuevo Ticket en memoria.
- **ConcreteCreator (Fábrica)** — `TicketEmission.ts` (específicamente `.create()` y `.reconstitute()`). Rutinas de ensamblaje matemático que resuelven internamente los vacíos o los faltantes al construir la instancia.
- **Product** — `TicketEmission` original. Estructura e instancia blindada que representa en sistema la entidad viva de un voto emitido.

---

### Flujo paso a paso

#### Paso 1 — El Creator invoca las líneas de fábrica
El programador no usa la palabra clave `new Ticket()`, pide servicialmente crear la caja usando el método expuesto y pasándole solo lo básico.
```typescript
// src/application/use-cases/EmitTicketHandler.ts
    // 3. Reconstituir la Entidad de Dominio en estado PENDING
    const ticket = TicketEmission.create({
      voteId: command.voteId,
      electionId: command.electionId,
      voterToken: command.voterToken
    });
```

#### Paso 2 — El ConcreteCreator arma, rellena y devuelve el objeto sellado
La clase blinda su constructor para acceso directo (`private constructor`). Y su public factory Method toma total control rellenando artificialmente todos los campos nulos base para inicializar el objeto del Ticket purificado.
```typescript
// bvs-ticket-issuer/src/models/entities/TicketEmission.ts
  // Factory para nuevas emisiones
  public static create(props: Omit<TicketProps, 'status' | 'txHash' | 'errorMessage' | 'createdAt' | 'updatedAt'>): TicketEmission {
    if (!props.voteId || !props.electionId || !props.voterToken) {
      throw new Error("Missing required fields for TicketEmission");
    }
    
    return new TicketEmission({
      ...props,
      status: 'PENDING',
      txHash: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
```

---

## 4. Strategy

### Explicación general
Strategy permite definir una colección de algoritmos diversos y volverlos cajas opacas separadas e intercambiables temporalmente según conveniencia sin necesidad de perturbar al componente que los llama. En este proyecto se usa para externalizar el arduo proceso matemático de aplicar rúbricas secretas (SecretKeys de archivo .env) sobre una firma electrónica ante Stellar. Esto facilita la migración hacia firmas más fuertes usando Hardware Custodiado en el futuro, sin modificar una línea del adaptador de red Blockchain central.

### Actores en bvs-ticket-issuer
- **Strategy (El Contrato)** — `SigningStrategy.ts`. Estipula universalmente qué métodos necesita algo o alguien que desee llamarse "Poderoso firmador".
- **ConcreteStrategy** — `LocalKeyStrategy.ts`. Algoritmo específico que resuelve localmente la inyección de la llave y ejecuta el cruce del SDK firmante en RAM interna.
- **Context (Ambiente)** — `StellarAdapter.ts`. Utiliza ciegamente a la estrategia enchufada sin cuestionarlo e interroga el retorno para sus peticiones de red.

---

### Flujo paso a paso

#### Paso 1 — [Strategy] dicta formalidades obligatorias 
Interfaz limitante sin librerías implementadas. Toda estrategia de firma debe saber devolver la cuenta pública asociada y saber devolver y manipular mutando la propia estructura original del Transaction.
```typescript
// src/infrastructure/blockchain/strategies/SigningStrategy.ts
import { Transaction } from '@stellar/stellar-sdk';

export interface SigningStrategy {
  getPublicKey(): Promise<string>;
  sign(transaction: Transaction): Promise<Transaction>;
}
```

#### Paso 2 — [ConcreteStrategy] Resuelve concretamente aplicando matemáticas
Desarrolla puramente un formato de los dictados. Usa la llave en frío inyectada.
```typescript
// src/infrastructure/blockchain/strategies/LocalKeyStrategy.ts
export class LocalKeyStrategy implements SigningStrategy {
  private keypair: Keypair;

  constructor(secretKey: string) {
    this.keypair = Keypair.fromSecret(secretKey);
  }

  async sign(transaction: Transaction): Promise<Transaction> {
    transaction.sign(this.keypair);
    return transaction;
  }
}
```

#### Paso 3 — [Context] transfiere su responsabilidad y esfuerzo de la clave secreta
En lo crudo del intento, `StellarAdapter` se niega a codificar firmas estelares o tocar claves que expongan su infraestructura pura. Solo delega la transaccion al estratega.
```typescript
// src/infrastructure/blockchain/StellarAdapter.ts
      const transaction = new StellarSdk.TransactionBuilder(accountResponse, {
        /* configuraciones nativas y timebounds ... */
      }).build();

      const signedTx = await this.signingStrategy.sign(transaction as any);
      const rawResponse = await this.server.submitTransaction(signedTx);
      
      return rawResponse.hash;
```

---

## 5. Adapter (Ports & Adapters)

### Explicación general
Actúa literalmente como un enchufe pasador para disfrazar tecnología compleja. En este proyecto blindamos al Caso de Uso o la Capa de Negocio para que nunca sepa en lo absoluto qué rayos es `StellarSdk` o si está enviando un Blockchain Builder; se inyecta tras una adaptación de `strings`. Al requerir el uso de SDK extranjeros, el adaptador encierra la librería y muta todas su formas crudas para imitar amigablemente a la interfaz estandarizada o de puertos deseada.

### Actores en bvs-ticket-issuer
- **Target (El Puerto ideal)** — `BlockchainPort.ts`. Interfaz que define explícitamente cuáles son los nombres predecibles y sencillos de las llamadas o puertos a los que nuestra gran mente central querrá accionar.
- **Adapter** — `StellarAdapter.ts`. Componente central de la infraestructura que hace un pacto "implements" forzándose a obedecer el lenguaje genérico y abstracto de nuestro Target abstracto (nuestro enchufe local).
- **Adaptee (Tecnología Enemiga / Externa)** — `@stellar/stellar-sdk` con todo su monstruoso Server Explorer.

---

### Flujo paso a paso

#### Paso 1 — [Target] declara un lenguaje amistoso en BVS
Todo nuestro proyecto creerá que la Blockchain Testnet mundial no pesa nada y simplemente es una cajita que recibe un pequeño Payload y dice que le va a devolver una String asíncrona de confirmación de hashes.
```typescript
// bvs-ticket-issuer/src/models/services/StellarService.ts
export interface EmitTransactionPayload {
  voteId: string;
  electionId: string;
  voterToken: string;
}

export interface IBlockchainPort {
  emitVoteTransaction(payload: EmitTransactionPayload): Promise<string>;
}
```

#### Paso 2 — [Adapter] acata la firma estricta frente al exterior de su entorno
Se sella a la fuerza la creación de un método exactamente igual a lo que requirió la zona o Puerto. Además oculta el instanciamiento salvaje de servidores lejanos en su constructor privado.
```typescript
// src/infrastructure/blockchain/StellarAdapter.ts
export class StellarAdapter implements IBlockchainPort {
  private server: StellarSdk.Horizon.Server;
  
  constructor(/* inyectores*/) {
     this.server = new StellarSdk.Horizon.Server(networkUrl);
  }

  async emitVoteTransaction(payload: EmitTransactionPayload): Promise<string> {
```

#### Paso 3 — [Adapter] amasa y procesa el Adaptee pesado en silencio
Envuelto en una coraza abstracta, el código sucio interactúa con diccionarios de redes globales, Base fees, Timebounds y constructores pesados, sin molestar a nadie.
```typescript
// src/infrastructure/blockchain/StellarAdapter.ts
      
      const accountResponse = await this.server.loadAccount(sourcePublicKey);
      const memo = StellarSdk.Memo.text(payload.voterToken.substring(0, 28));

      // Adaptee complejo y sucio
      const transaction = new StellarSdk.TransactionBuilder(accountResponse, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
        timebounds: await this.server.fetchTimebounds(100),
      })
      .addOperation(StellarSdk.Operation.payment({
        destination: sourcePublicKey, 
        asset: StellarSdk.Asset.native(),
        amount: "0.0000100"
      }))
      .addMemo(memo)
      .build();

      const signedTx = await this.signingStrategy.sign(transaction as any);
      const rawResponse = await this.server.submitTransaction(signedTx);
      
      return rawResponse.hash; // Traduce o "adapta" al mundo abstracto original un String final
```

---

## 6. Observer (Variante Event/Webhook Notifier)

### Explicación general
El patrón Observer (Observador) permite la apertura a notificar y lanzar avisos multidireccionales a diferentes entidades interesadas sobre un cambio de estado en otro objeto subscrito, desacoplando así la línea principal que dispara las alertas de una espera dependiente. Se usa específicamente aquí para el "HttpEventNotifier/Webhook", avisando remotamente o vía internet al sistema superior del Censo cuando la firma en blockchain falló o rebotó tras largas validaciones, omitiendo paralizar el proceso local interno esperando resoluciones externas de lectura o subidas en plataformas de terceros.

### Actores en bvs-ticket-issuer
- **Subject / Publisher** — `EmitTicketHandler.ts`. Encierra la lógica de vida, cuando se terminan sus procesos cardinales, dispara e insta al cartero global a transmitir la campanada asíncrona ("Notificar Éxito / Fallido").
- **Observer (Event Interface)** — `EventNotifier.ts`. Molde abstracto que especifica obligatoriamente los argumentos para dar por entendida la naturaleza de una notificación en BVS.
- **ConcreteObserver / Subscriptor** — `HttpEventNotifier.ts`. Cartero realizado que reenvía peticiones `fetch` POST ciegos contra destinos Webhooks configurados ante un disparador general.

---

### Flujo paso a paso

#### Paso 1 — [Observer] dicta la morfología del anuncio
Fuerza a todos los que deseen notificar o escuchar la finalización un ticket que posean una estructura predecible de mensajería (El status fallido o confirmado).
```typescript
// bvs-ticket-issuer/src/models/services/EventService.ts
export interface EventPayload {
  voteId: string;
  status: 'CONFIRMED' | 'FAILED';
  txHash?: string;
  errorMessage?: string;
}

export interface IEventNotifier {
  notifyEmissionResult(payload: EventPayload): Promise<void>;
}
```

#### Paso 2 — [ConcreteObserver] aplica un flujo de Webhook a prueba de balas para no estallar
Atrapa lo prometido y suelta al vacío una petición HTTP `POST` pasándole toda su carga a URL de destino guardada y esperando su acatamiento sin emitir throw letales que estresen o paralicen al padre (Subject).
```typescript
// src/infrastructure/events/HttpEventNotifier.ts
export class HttpEventNotifier implements IEventNotifier {
  constructor(private readonly webhookUrl: string) {}

  async notifyEmissionResult(payload: EventPayload): Promise<void> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voteId: payload.voteId,
          status: payload.status,
          txHash: payload.txHash || undefined
        })
      });

      if (!response.ok) {
        logger.error({ status: response.status }, "Webhook responded with non-ok status");
      }
      // ... bloquea excepciones que afecten al flujo central.
```

#### Paso 3 — [Subject] dispara la bengala u observador sin titubear al llegar al borde operativo
Independientemente si Stellar triunfó arrojando el Hash, o fue rechazado como un error 400 por no poseer XLM sufieciente, el handler usa a los observadores adscritos pasándoles su respectiva realidad de emisión informando el fallo exterior y finaliza plácidamente su misión.
```typescript
// src/application/use-cases/EmitTicketHandler.ts
      
      // 5. Éxito: Actualizar a CONFIRMED off-chain
      ticket.markAsConfirmed(txHash);
      await this.repository.update(ticket);
      
      // 6. SUJETO DISPARA EL OBSERVADOR: Notificar a quien quiera interesarle este resultado
      await this.eventNotifier.notifyEmissionResult({
        voteId: ticket.voteId,
        status: 'CONFIRMED',
        txHash
      });
```
