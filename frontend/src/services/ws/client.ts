import type { WsSendEvent, WsReceiveEvent } from "../../types/ws";

type ReceiveHandler = (ev: WsReceiveEvent) => void;
type TypeHandler<T extends WsReceiveEvent["type"]> =
	(ev: Extract<WsReceiveEvent, { type: T }>) => void;

export class WSClient {
	private baseUrl: string;
	private ws: WebSocket | null = null;

	private anyListeners = new Set<ReceiveHandler>();
	private typedListeners = new Map<WsReceiveEvent["type"], Set<ReceiveHandler>>();

	private heartbeatTimer: number | null = null;
	private lastPongAt = 0;
	private readonly heartbeatIntervalMs = 15_000;
	private readonly pongTimeoutMs = 45_000;

	private shouldReconnect = true;
	private reconnectAttempts = 0;
	private reconnectTimer: number | null = null;
	private readonly reconnectBaseDelayMs = 800;
	private readonly reconnectMaxDelayMs = 30_000;

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl;
	}

	connect() {
		this.shouldReconnect = true;

		this.clearReconnectTimer();
		this.clearHeartbeat();
		this.ws?.close();

		this.ws = new WebSocket(this.baseUrl);

		this.ws.onopen = () => {
			this.reconnectAttempts = 0;
			this.startHeartbeat();
		};

		this.ws.onmessage = (e) => this.handleMessage(e);

		this.ws.onclose = () => {
			this.clearHeartbeat();
			if (this.shouldReconnect) this.scheduleReconnect();
		};

		this.ws.onerror = () => { /* 任意でログ */ };
	}

	close() {
		this.shouldReconnect = false;
		this.clearReconnectTimer();
		this.clearHeartbeat();
		this.ws?.close();
		this.ws = null;
	}

	isConnected(): boolean {
		return this.ws?.readyState === WebSocket.OPEN;
	}
	
	send(event: WsSendEvent) {
		if (!this.isConnected()) return;
		try { this.ws!.send(JSON.stringify(event)); } catch {}
	}

	join(roomId: string) {
		this.send({ type: "join", roomId });
	}

	on(listener: ReceiveHandler): () => void {
		this.anyListeners.add(listener);
		return () => this.anyListeners.delete(listener);
	}

	onType<T extends WsReceiveEvent["type"]>(type: T, handler: TypeHandler<T>): () => void {
		const set = this.typedListeners.get(type) ?? new Set();
		set.add(handler as ReceiveHandler);
		this.typedListeners.set(type, set);
		return () => {
			const current = this.typedListeners.get(type);
			if (!current) return;
			current.delete(handler as ReceiveHandler);
			if (current.size === 0) this.typedListeners.delete(type);
		};
	}

	private handleMessage(e: MessageEvent) {
		let data: unknown;
		try { data = JSON.parse(e.data); } catch { return; }
		if (!data || typeof data !== "object" || !("type" in data)) return;

		const ev = data as WsReceiveEvent;

		if (ev.type === "pong") this.lastPongAt = Date.now();

		this.anyListeners.forEach((fn) => { try { fn(ev); } catch {} });
		const set = this.typedListeners.get(ev.type);
		set?.forEach((fn) => { try { fn(ev); } catch {} });
	}

	private startHeartbeat() {
		this.clearHeartbeat();
		this.lastPongAt = Date.now();

		this.heartbeatTimer = window.setInterval(() => {
			this.send({ type: "ping" });
			if (Date.now() - this.lastPongAt > this.pongTimeoutMs) {
				this.forceReconnect();
			}
		}, this.heartbeatIntervalMs);
	}

	private clearHeartbeat() {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = null;
		}
	}

	private scheduleReconnect() {
		this.clearReconnectTimer();
		const delay = Math.min(
			this.reconnectBaseDelayMs * Math.pow(2, this.reconnectAttempts),
			this.reconnectMaxDelayMs
		);
		this.reconnectAttempts += 1;

		this.reconnectTimer = window.setTimeout(() => {
			this.connect();
		}, delay);
	}

	private forceReconnect() {
		try { this.ws?.close(); } catch {}
	}

	private clearReconnectTimer() {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
	}
}
