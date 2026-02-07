/**
 * SDK Error Types
 *
 * Custom error classes for distinguishing between different failure modes.
 */

/**
 * Error thrown when a role check fails due to transport or simulation issues.
 *
 * This is distinct from a "user doesn't have the role" result.
 * A network failure should NOT be treated as "no permission".
 */
export class RoleCheckError extends Error {
    public readonly cause: unknown;
    public readonly isTransportError: boolean;

    constructor(
        message: string,
        cause: unknown,
        isTransportError: boolean = true
    ) {
        super(message);
        this.name = 'RoleCheckError';
        this.cause = cause;
        this.isTransportError = isTransportError;
    }
}

/**
 * Error thrown when SDK configuration is invalid.
 */
export class SDKConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SDKConfigError';
    }
}

/**
 * Error thrown when a contract call simulation fails.
 */
export class SimulationError extends Error {
    public readonly simulationResult: unknown;

    constructor(message: string, simulationResult?: unknown) {
        super(message);
        this.name = 'SimulationError';
        this.simulationResult = simulationResult;
    }
}

/**
 * Error thrown when a transaction fails on-chain.
 */
export class TransactionError extends Error {
    public readonly txHash?: string;
    public readonly status?: string;

    constructor(message: string, txHash?: string, status?: string) {
        super(message);
        this.name = 'TransactionError';
        this.txHash = txHash;
        this.status = status;
    }
}
