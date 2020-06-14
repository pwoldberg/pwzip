export as namespace PWZip;

export = Zip;

declare class Zip {
    open(file: string): void;
    extract(): void;
    close(): void;
}
