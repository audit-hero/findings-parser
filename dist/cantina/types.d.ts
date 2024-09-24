export interface CantinaProps {
    cantinaManaged: CantinaManagedEntity[];
    cantinaCompetitions: CantinaCompetitionsEntity[];
    cantinaSolo: CantinaSoloEntity[];
    spearbitGuild: SpearbitGuildEntity[];
}
export interface CantinaManagedEntity {
    id: string;
    client: Client;
    timeline: Timeline;
    title: string;
    scope: string;
    kind: string;
    issues?: IssuesEntity[] | null;
    categories?: (string | null)[] | null;
    pdfLink: string;
    repoLinks?: string[] | null;
    commitHashes?: string[] | null;
    team?: TeamEntity[] | null;
}
export interface Client {
    name: string;
    website?: string | null;
    logo: string;
}
export interface Timeline {
    start: string;
    end: string;
}
export interface IssuesEntity {
    category: string;
    count: number;
    fixed: number;
    acknowledged: number;
}
export interface TeamEntity {
    name: string;
    image: string;
    verified: boolean;
    guild: string;
    username: string;
    role: string;
}
export interface CantinaCompetitionsEntity {
    id: string;
    client: Client1;
    timeline: Timeline;
    title: string;
    scope: string;
    kind: string;
    issues?: IssuesEntity[] | null;
    categories?: string[] | null;
    pdfLink: string;
    repoLinks?: string[] | null;
    commitHashes?: string[] | null;
    team?: null[] | null;
}
export interface Client1 {
    name: string;
    website: string;
    logo: string;
}
export interface CantinaSoloEntity {
    id: string;
    client: Client1;
    timeline: Timeline;
    title: string;
    scope: string;
    kind: string;
    issues?: IssuesEntity[] | null;
    categories?: string[] | null;
    pdfLink: string;
    repoLinks?: string[] | null;
    commitHashes?: string[] | null;
    team?: TeamEntity[] | null;
}
export interface SpearbitGuildEntity {
    id: string;
    client: Client;
    timeline: Timeline;
    title: string;
    scope: string;
    kind: string;
    issues?: IssuesEntity[] | null;
    categories?: string[] | null;
    pdfLink: string;
    repoLinks?: string[] | null;
    commitHashes?: string[] | null;
    team?: TeamEntity[] | null;
}
