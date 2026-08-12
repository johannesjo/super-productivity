export type ParityStatus = 'implemented' | 'partial' | 'absent' | 'retained';
export interface ParityEntry {
    /** Capability name, matching the docs/parity.md table row. */
    feature: string;
    /** Where the capability lives (owning file relative to repo root). */
    owner: string;
    /** Where the behavior is tested (spec path relative to repo root, or none). */
    tests?: string;
}
export interface ParityArea {
    area: string;
    status: ParityStatus;
    entries: ParityEntry[];
}
export declare const PARITY_LEDGER: ParityArea[];
/** Every unique owner referenced across areas (for spec assertions). */
export declare const parityOwners: () => string[];
export declare const parityOwnerFiles: () => string[];
