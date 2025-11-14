import { useCallback, useEffect } from "react";
import { WSClient } from "../services/ws/client";
import type { WsSendEvent, WsReceiveEvent } from "../types/ws";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws";

// アプリ全体で単一接続にしたいのでシングルトン化
export const wsClient = new WSClient(WS_URL);

/**
 * WebSocket の接続ライフサイクルとユーティリティを提供するフック
 *
 * - 初回マウントで接続
 * - アンマウント時に自動切断はしない（アプリ共通接続のため）
 *   明示的に切りたい画面で wsClient.close() を呼ぶこと
 */
export function useWebSocket(options?: { autoConnect?: boolean }) {
	const autoConnect = options?.autoConnect ?? true;

	useEffect(() => {
		if (!autoConnect) return;

		if (!wsClient.isConnected()) {
			wsClient.connect();
		}
		// ここで close しないのは「アプリ全体で1本」にしたいから
	}, [autoConnect]);

	// 型安全なラッパー
	const send = useCallback((e: WsSendEvent) => wsClient.send(e), []);
	const join = useCallback((roomId: string) => wsClient.join(roomId), []);
	const on = useCallback(
		(handler: (e: WsReceiveEvent) => void) => wsClient.on(handler),
		[]
	);
	const onType = useCallback(
		<T extends WsReceiveEvent["type"]>(
			type: T,
			handler: (e: Extract<WsReceiveEvent, { type: T }>) => void
		) => wsClient.onType(type, handler),
		[]
	);
	const isConnected = useCallback(() => wsClient.isConnected(), []);

	// 明示的制御用（必要な画面で呼び出し）
	const connect = useCallback(() => {
		wsClient.connect();
	}, []);
	const close = useCallback(() => wsClient.close(), []);

	return { client: wsClient, send, join, on, onType, isConnected, connect, close };
}
