# Function: isSessionValid()

```ts
function isSessionValid(session): boolean;
```

Defined in: [types.ts:103](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L103)

Check if a session is currently valid (not expired, not revoked, has budget).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `session` | [`SessionKey`](Interface.SessionKey.md) |

## Returns

`boolean`
