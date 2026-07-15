export type NpmPackMetadata = Readonly<{
    filename: string;
}>;

export function parseNpmPackMetadata(packOutput: string): NpmPackMetadata;
