# Class: SealClient

Defined in: client.ts:83

High-level client for interacting with the Seal smart wallet program.

## Example

```typescript
const client = new SealClient({ network: "devnet" });

// Create a wallet
const wallet = await client.createWallet(ownerKeypair, {
  dailyLimitSol: 10,
  perTxLimitSol: 1,
});

// Register an agent
const agent = await client.registerAgent(ownerKeypair, agentPubkey, {
  name: "Sage LP Bot",
  dailyLimitSol: 2,
  perTxLimitSol: 0.5,
});
```

## Constructors

### Constructor

```ts
new SealClient(config?): SealClient;
```

Defined in: client.ts:87

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`SealClientConfig`](Interface.SealClientConfig.md) |

#### Returns

`SealClient`

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-connection"></a> `connection` | `readonly` | `Connection` | client.ts:84 |
| <a id="property-programid"></a> `programId` | `readonly` | `PublicKey` | client.ts:85 |

## Methods

### addGuardian()

```ts
addGuardian(owner, guardian): Promise<SmartWallet>;
```

Defined in: client.ts:189

Add a guardian to the wallet for recovery.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `owner` | `Keypair` |
| `guardian` | `PublicKey` |

#### Returns

`Promise`\<[`SmartWallet`](Interface.SmartWallet.md)\>

***

### closeWallet()

```ts
closeWallet(owner): Promise<void>;
```

Defined in: client.ts:480

Permanently close the SmartWallet and return rent to owner.

Requirements:
- All agents must be deregistered first
- Only the owner can close

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `owner` | `Keypair` | Owner keypair |

#### Returns

`Promise`\<`void`\>

***

### createSession()

```ts
createSession(
   agentKeypair, 
   walletOwner, 
   options): Promise<{
  session: SessionKey;
  sessionKeypair: Keypair;
}>;
```

Defined in: client.ts:308

Create a new session key for an agent.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `agentKeypair` | `Keypair` | The agent keypair (must sign) |
| `walletOwner` | `PublicKey` | The wallet owner's public key |
| `options` | \{ `durationSecs`: `number`; `maxAmountSol`: `number`; `maxPerTxSol`: `number`; \} | Session configuration |
| `options.durationSecs` | `number` | - |
| `options.maxAmountSol` | `number` | - |
| `options.maxPerTxSol` | `number` | - |

#### Returns

`Promise`\<\{
  `session`: [`SessionKey`](Interface.SessionKey.md);
  `sessionKeypair`: `Keypair`;
\}\>

The session keypair and created SessionKey data

***

### createWallet()

```ts
createWallet(owner, options): Promise<SmartWallet>;
```

Defined in: client.ts:105

Create a new SmartWallet for the owner.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `owner` | `Keypair` | The owner keypair (will sign) |
| `options` | \{ `dailyLimitSol`: `number`; `funder?`: `Keypair`; `perTxLimitSol`: `number`; \} | Spending limits and optional sponsor |
| `options.dailyLimitSol` | `number` | - |
| `options.funder?` | `Keypair` | Optional sponsor keypair that pays rent + tx fees |
| `options.perTxLimitSol` | `number` | - |

#### Returns

`Promise`\<[`SmartWallet`](Interface.SmartWallet.md)\>

The created SmartWallet data

***

### deregisterAgent()

```ts
deregisterAgent(owner, agent): Promise<void>;
```

Defined in: client.ts:283

Deregister an agent (owner only).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `owner` | `Keypair` |
| `agent` | `PublicKey` |

#### Returns

`Promise`\<`void`\>

***

### executeViaSession()

```ts
executeViaSession(
   sessionKeypair, 
   walletOwner, 
   agent, 
   targetProgram, 
   amountLamports, 
   innerInstructionData, 
remainingAccounts): Promise<string>;
```

Defined in: client.ts:405

Execute a transaction via a session key.

This is the CORE method for autonomous agent operations.
The session key signs, and Seal validates/executes the CPI.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `sessionKeypair` | `Keypair` | The session keypair (signs the transaction) |
| `walletOwner` | `PublicKey` | The wallet owner's public key |
| `agent` | `PublicKey` | The agent's public key |
| `targetProgram` | `PublicKey` | The program to CPI into |
| `amountLamports` | `bigint` | Amount for spending limit tracking |
| `innerInstructionData` | `Buffer` | The instruction data for the target CPI |
| `remainingAccounts` | \{ `isSigner`: `boolean`; `isWritable`: `boolean`; `pubkey`: `PublicKey`; \}[] | Additional accounts for the CPI |

#### Returns

`Promise`\<`string`\>

Transaction signature

***

### getAgentConfig()

```ts
getAgentConfig(address): Promise<AgentConfig>;
```

Defined in: client.ts:259

Fetch an AgentConfig by its PDA address.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `address` | `PublicKey` |

#### Returns

`Promise`\<[`AgentConfig`](Interface.AgentConfig.md)\>

***

### getAgentConfigAddress()

```ts
getAgentConfigAddress(walletOwner, agent): PublicKey;
```

Defined in: client.ts:274

Get the agent config PDA for a wallet + agent pair.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `walletOwner` | `PublicKey` |
| `agent` | `PublicKey` |

#### Returns

`PublicKey`

***

### getSession()

```ts
getSession(address): Promise<SessionKey>;
```

Defined in: client.ts:351

Fetch a SessionKey by its PDA address.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `address` | `PublicKey` |

#### Returns

`Promise`\<[`SessionKey`](Interface.SessionKey.md)\>

***

### getWallet()

```ts
getWallet(address): Promise<SmartWallet>;
```

Defined in: client.ts:140

Fetch a SmartWallet by its PDA address.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `address` | `PublicKey` |

#### Returns

`Promise`\<[`SmartWallet`](Interface.SmartWallet.md)\>

***

### getWalletAddress()

```ts
getWalletAddress(owner): PublicKey;
```

Defined in: client.ts:155

Get the wallet PDA for an owner.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `owner` | `PublicKey` |

#### Returns

`PublicKey`

***

### recoverWallet()

```ts
recoverWallet(
   guardian, 
   walletOwner, 
newOwner): Promise<SmartWallet>;
```

Defined in: client.ts:449

Recover a wallet by rotating the owner (guardian-initiated).

⚠️ CRITICAL: In v1, ANY single guardian can do this unilaterally.
See SECURITY.md for details on the risks.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `guardian` | `Keypair` | Guardian keypair (must be registered on wallet) |
| `walletOwner` | `PublicKey` | Current wallet owner's public key |
| `newOwner` | `PublicKey` | The new owner's public key |

#### Returns

`Promise`\<[`SmartWallet`](Interface.SmartWallet.md)\>

***

### registerAgent()

```ts
registerAgent(
   owner, 
   agent, 
options): Promise<AgentConfig>;
```

Defined in: client.ts:217

Register a new agent on the wallet.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `owner` | `Keypair` | The owner keypair (must sign) |
| `agent` | `PublicKey` | The agent's public key |
| `options` | \{ `allowedPrograms?`: `PublicKey`[]; `dailyLimitSol`: `number`; `defaultSessionDurationSecs?`: `number`; `maxSessionDurationSecs?`: `number`; `name`: `string`; `perTxLimitSol`: `number`; \} | Agent configuration |
| `options.allowedPrograms?` | `PublicKey`[] | - |
| `options.dailyLimitSol` | `number` | - |
| `options.defaultSessionDurationSecs?` | `number` | - |
| `options.maxSessionDurationSecs?` | `number` | - |
| `options.name` | `string` | - |
| `options.perTxLimitSol` | `number` | - |

#### Returns

`Promise`\<[`AgentConfig`](Interface.AgentConfig.md)\>

The created AgentConfig

***

### revokeSession()

```ts
revokeSession(
   authority, 
   walletOwner, 
   agent, 
sessionPubkey): Promise<void>;
```

Defined in: client.ts:366

Revoke a session (owner or agent can do this).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `authority` | `Keypair` |
| `walletOwner` | `PublicKey` |
| `agent` | `PublicKey` |
| `sessionPubkey` | `PublicKey` |

#### Returns

`Promise`\<`void`\>

***

### updateSpendingLimits()

```ts
updateSpendingLimits(owner, options): Promise<SmartWallet>;
```

Defined in: client.ts:163

Update spending limits on a wallet.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `owner` | `Keypair` |
| `options` | \{ `newDailyLimitSol`: `number`; `newPerTxLimitSol`: `number`; \} |
| `options.newDailyLimitSol` | `number` |
| `options.newPerTxLimitSol` | `number` |

#### Returns

`Promise`\<[`SmartWallet`](Interface.SmartWallet.md)\>
