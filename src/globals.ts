export interface BaseLayer {
	name: string;
	activator: string;
	start: () => void;
	stop: () => void;
}
