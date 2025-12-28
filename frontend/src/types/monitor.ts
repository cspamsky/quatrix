export interface SystemStats {
    timestamp: number;
    cpu: {
        load: number;
        cores: number[];
        user?: number;
        system?: number;
    };
    memory: {
        total: number;
        used: number;
        free: number;
        percentage: number;
    };
    disk: {
        total: number;
        used: number;
        percentage: number;
    };
    uptime: number;
}
