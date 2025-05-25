export interface baseLayer {
    name: string;
    activator: string;
    start: () => void;
    stop: () => void;
}