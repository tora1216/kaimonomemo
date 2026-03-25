/** ルームIDを URL → localStorage → 新規生成 の順で取得/生成する */
export function getOrCreateRoomId(): string {
  const params = new URLSearchParams(window.location.search);
  const urlRoom = params.get("room");
  if (urlRoom && /^[A-Z0-9]{6,8}$/.test(urlRoom)) {
    localStorage.setItem("kaimono_room_id", urlRoom);
    return urlRoom;
  }
  const stored = localStorage.getItem("kaimono_room_id");
  if (stored) return stored;
  const newId = Math.random().toString(36).slice(2, 8).toUpperCase();
  localStorage.setItem("kaimono_room_id", newId);
  return newId;
}

/** このデバイスで保存済みの合言葉を返す。未設定なら null */
export function getStoredPassphrase(roomId: string): string | null {
  return localStorage.getItem(`kaimono_pass_${roomId}`);
}

/** 合言葉をデバイスに保存する（空文字は削除） */
export function storePassphrase(roomId: string, pass: string): void {
  if (pass.trim()) {
    localStorage.setItem(`kaimono_pass_${roomId}`, pass.trim());
  } else {
    localStorage.removeItem(`kaimono_pass_${roomId}`);
  }
}

/** ルームID + 合言葉から Firestore のルームキーを生成する */
export function buildFirestoreKey(roomId: string, pass: string): string {
  const p = pass.trim().toLowerCase().replace(/\s+/g, "_");
  return p ? `${roomId}_${p}` : roomId;
}

/** ルームIDを含む共有URLを返す（合言葉はURLに含めない） */
export function getRoomShareUrl(roomId: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomId);
  // 合言葉は URL に含めない
  url.searchParams.delete("key");
  return url.toString();
}

/** URLにルームIDがあり、このデバイスに合言葉が未保存なら true（初回参加） */
export function isFirstJoin(roomId: string): boolean {
  return (
    new URLSearchParams(window.location.search).has("room") &&
    getStoredPassphrase(roomId) === null
  );
}
