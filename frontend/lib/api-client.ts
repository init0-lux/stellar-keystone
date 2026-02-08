import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) throw new Error('API Error');
    return res.json();
});

export interface StatsData {
    activeRoles: number;
    totalGrants: number;
    expiringSoon: number;
}

export interface RoleData {
    id: string;
    name: string;
    adminRole: string;
    memberCount: number;
    createdAt: string;
}

export interface MemberData {
    account: string;
    expiry: number | null;
    lastUpdated: string;
}

export interface ActivityData {
    id: number;
    eventType: string;
    payload: any;
    txHash: string;
    timestamp: string;
}

export interface ContractData {
    id: string;
    deployedAt: string;
    network: string;
    status: 'active' | 'inactive';
}

export function useStats(contractId?: string) {
    const { data, error, isLoading } = useSWR<StatsData>(
        contractId ? `/api/indexer/stats?contractId=${contractId}` : null,
        fetcher,
        { refreshInterval: 5000 } // Poll every 5 seconds
    );

    return {
        stats: data,
        isLoading,
        isError: error
    };
}

export function useRoles(contractId?: string) {
    const { data, error, isLoading, mutate } = useSWR<RoleData[]>(
        contractId ? `/api/indexer/roles?contractId=${contractId}` : null,
        fetcher
    );

    return {
        roles: data,
        isLoading,
        isError: error,
        refreshRoles: mutate
    };
}

export function useRoleMembers(contractId: string | undefined, roleId: string) {
    const { data, error, isLoading, mutate } = useSWR<MemberData[]>(
        contractId && roleId ? `/api/indexer/roles/${roleId}/members?contractId=${contractId}` : null,
        fetcher
    );

    return {
        members: data,
        isLoading,
        isError: error,
        refreshMembers: mutate
    };
}

export function useActivity(contractId?: string, limit = 10) {
    const { data, error, isLoading } = useSWR<ActivityData[]>(
        contractId ? `/api/indexer/activity?contractId=${contractId}&limit=${limit}` : null,
        fetcher,
        { refreshInterval: 5000 }
    );

    return {
        activity: data,
        isLoading,
        isError: error
    };
}

export function useContract(contractId?: string) {
    const { data, error, isLoading } = useSWR<ContractData>(
        contractId ? `/api/indexer/contract?contractId=${contractId}` : null,
        fetcher
    );

    return {
        contract: data,
        isLoading,
        isError: error
    };
}
