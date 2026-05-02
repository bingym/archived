import { useState } from "react";
import { setToken, useAuthToken } from "../auth";

export default function LoginButton() {
  const token = useAuthToken();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  if (token) {
    return (
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        onClick={() => setToken(null)}
      >
        Logout
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        onClick={() => {
          setInput("");
          setOpen(true);
        }}
      >
        Login
      </button>
      {open && (
        <div className="modal modal-open" style={{ zIndex: 2000 }}>
          <div className="modal-box max-w-sm">
            <h3 className="font-bold text-lg mb-2">Admin login</h3>
            <p className="text-sm text-gray-500 mb-3">
              输入 ADMIN_TOKEN 以解锁编辑功能。
            </p>
            <input
              type="password"
              className="input input-bordered w-full"
              placeholder="ADMIN_TOKEN"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim()) {
                  setToken(input.trim());
                  setOpen(false);
                }
              }}
            />
            <div className="modal-action">
              <button className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}>
                取消
              </button>
              <button
                className="btn btn-sm btn-primary"
                disabled={!input.trim()}
                onClick={() => {
                  setToken(input.trim());
                  setOpen(false);
                }}
              >
                登录
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
