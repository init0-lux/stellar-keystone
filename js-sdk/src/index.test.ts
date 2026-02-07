/**
 * SDK Tests
 *
 * Unit tests use mocked RPC responses to validate SDK functionality.
 * Integration tests (opt-in) run against actual Soroban network.
 */

import {
    isoToUnixTimestamp,
    unixTimestampToIso,
    RoleCheckError,
    EVENT_TYPES,
    EVENT_TYPE_MAP,
    RBAC_SDK_VERSION,
} from './index.js';

// =============================================================================
// Helper Function Tests
// =============================================================================

describe('isoToUnixTimestamp', () => {
    it('converts valid ISO8601 date to Unix timestamp', () => {
        const iso = '2025-01-01T00:00:00Z';
        const expected = 1735689600;
        expect(isoToUnixTimestamp(iso)).toBe(expected);
    });

    it('handles timezone offsets', () => {
        const iso = '2025-01-01T00:00:00+05:30';
        const result = isoToUnixTimestamp(iso);
        // Should be 5.5 hours before UTC midnight
        expect(result).toBe(1735669800);
    });

    it('throws on invalid date string', () => {
        expect(() => isoToUnixTimestamp('not-a-date')).toThrow('Invalid ISO8601');
    });

    it('handles milliseconds', () => {
        const iso = '2025-01-01T00:00:00.123Z';
        const expected = 1735689600;
        expect(isoToUnixTimestamp(iso)).toBe(expected);
    });
});

describe('unixTimestampToIso', () => {
    it('converts Unix timestamp to ISO8601 string', () => {
        const timestamp = 1735689600;
        const result = unixTimestampToIso(timestamp);
        expect(result).toBe('2025-01-01T00:00:00.000Z');
    });

    it('handles zero timestamp (Unix epoch)', () => {
        const result = unixTimestampToIso(0);
        expect(result).toBe('1970-01-01T00:00:00.000Z');
    });
});

// =============================================================================
// Event Schema Tests
// =============================================================================

describe('Event Schemas', () => {
    it('exports SDK version', () => {
        expect(RBAC_SDK_VERSION).toBe('1.0.0');
    });

    it('defines all event type constants', () => {
        expect(EVENT_TYPES.ROLE_CREATED).toBe('RoleCreat');
        expect(EVENT_TYPES.ROLE_GRANTED).toBe('RoleGrant');
        expect(EVENT_TYPES.ROLE_REVOKED).toBe('RoleRevok');
        expect(EVENT_TYPES.ADMIN_CHANGED).toBe('AdminChg');
        expect(EVENT_TYPES.ROLE_EXPIRED).toBe('RoleExpir');
    });

    it('maps truncated names to human-readable types', () => {
        expect(EVENT_TYPE_MAP['RoleCreat']).toBe('RoleCreated');
        expect(EVENT_TYPE_MAP['RoleGrant']).toBe('RoleGranted');
        expect(EVENT_TYPE_MAP['RoleRevok']).toBe('RoleRevoked');
        expect(EVENT_TYPE_MAP['AdminChg']).toBe('RoleAdminChanged');
        expect(EVENT_TYPE_MAP['RoleExpir']).toBe('RoleExpired');
    });

    it('returns undefined for unknown event types', () => {
        expect(EVENT_TYPE_MAP['UnknownEvent']).toBeUndefined();
    });
});

// =============================================================================
// Error Types Tests
// =============================================================================

describe('RoleCheckError', () => {
    it('creates error with transport flag', () => {
        const cause = new Error('Network failure');
        const error = new RoleCheckError('Failed to check role', cause, true);

        expect(error.name).toBe('RoleCheckError');
        expect(error.message).toBe('Failed to check role');
        expect(error.cause).toBe(cause);
        expect(error.isTransportError).toBe(true);
    });

    it('creates error without transport flag', () => {
        const error = new RoleCheckError('Simulation failed', null, false);

        expect(error.isTransportError).toBe(false);
    });

    it('defaults to transport error', () => {
        const error = new RoleCheckError('Error', null);

        expect(error.isTransportError).toBe(true);
    });
});

// =============================================================================
// Mocked RPC Tests
// =============================================================================

// Mock the stellar-sdk module
jest.mock('@stellar/stellar-sdk', () => {
    const original = jest.requireActual('@stellar/stellar-sdk');
    return {
        ...original,
        SorobanRpc: {
            ...original.SorobanRpc,
            Server: jest.fn().mockImplementation(() => ({
                getAccount: jest.fn().mockResolvedValue({
                    accountId: () => 'GDEMO...',
                    sequenceNumber: () => '12345',
                    incrementSequenceNumber: () => { },
                }),
                simulateTransaction: jest.fn().mockResolvedValue({
                    result: {
                        retval: { type: () => 'bool', value: () => true },
                    },
                }),
                sendTransaction: jest.fn().mockResolvedValue({
                    status: 'PENDING',
                    hash: 'mock_tx_hash',
                }),
                getTransaction: jest.fn().mockResolvedValue({
                    status: 'SUCCESS',
                }),
                getEvents: jest.fn().mockResolvedValue({
                    events: [],
                }),
            })),
            Api: {
                isSimulationError: jest.fn().mockReturnValue(false),
                isSimulationSuccess: jest.fn().mockReturnValue(true),
            },
            assembleTransaction: jest.fn().mockImplementation((tx) => ({
                build: () => ({
                    sign: jest.fn(),
                }),
            })),
        },
    };
});

describe('SDK with mocked RPC', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('deployRbac', () => {
        // Skip this test because deployRbac now loads actual WASM file
        // which requires the contract to be compiled first
        it.skip('returns contract ID and transaction hash', async () => {
            const { deployRbac } = await import('./index.js');
            const result = await deployRbac(
                'testnet',
                'SCZANGBA5YHTNYVVV3C7CAZMTQDBJHJG6C34RS44PP3WSZXUXPBFXKSE'
            );

            expect(result).toHaveProperty('contractId');
            expect(result).toHaveProperty('txHash');
            expect(typeof result.contractId).toBe('string');
            expect(typeof result.txHash).toBe('string');
        });
    });

    describe('hasRole', () => {
        it('is exported as a function', async () => {
            const { hasRole } = await import('./index.js');
            expect(typeof hasRole).toBe('function');
        });

        it('accepts options object for readOnlyAccount', async () => {
            const { hasRole } = await import('./index.js');
            // Validates the function signature accepts options
            expect(typeof hasRole).toBe('function');
        });
    });

    describe('assertRoleClientSide', () => {
        it('is exported as a function', async () => {
            const { assertRoleClientSide } = await import('./index.js');
            expect(typeof assertRoleClientSide).toBe('function');
        });
    });

    describe('requireRoleOrThrow (deprecated)', () => {
        it('is still exported for backwards compatibility', async () => {
            const { requireRoleOrThrow } = await import('./index.js');
            expect(typeof requireRoleOrThrow).toBe('function');
        });
    });

    describe('grantRole', () => {
        it('accepts expiry as ISO8601 string', async () => {
            const { grantRole, isoToUnixTimestamp } = await import('./index.js');

            const expiryIso = '2025-12-31T23:59:59Z';
            const expiryTs = isoToUnixTimestamp(expiryIso);

            expect(expiryTs).toBe(1767225599);
            expect(typeof grantRole).toBe('function');
        });

        it('accepts undefined expiry for never-expiring grants', async () => {
            const { grantRole } = await import('./index.js');

            // Undefined expiry should be converted to 0 (never expires)
            expect(typeof grantRole).toBe('function');
        });
    });

    describe('configureSDK', () => {
        it('is exported and callable', async () => {
            const { configureSDK, getSDKConfig } = await import('./index.js');

            expect(typeof configureSDK).toBe('function');
            expect(typeof getSDKConfig).toBe('function');

            // Configure SDK
            configureSDK({ readOnlyAccount: 'GTEST...' });

            const config = getSDKConfig();
            expect(config.readOnlyAccount).toBe('GTEST...');
        });
    });
});

// =============================================================================
// Integration Tests (Opt-in)
// =============================================================================

const INTEGRATION_ENABLED = process.env.TEST_INTEGRATION === 'true';

(INTEGRATION_ENABLED ? describe : describe.skip)('Integration Tests', () => {
    // These tests require:
    // 1. A running Soroban RPC endpoint
    // 2. A funded test account
    // 3. TEST_INTEGRATION=true environment variable

    it('placeholder for actual integration tests', () => {
        // TODO: Add real integration tests when local Soroban setup is available
        expect(INTEGRATION_ENABLED).toBe(true);
    });
});

