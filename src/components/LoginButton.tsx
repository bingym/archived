import { useState } from "react";
import { Button, Input, Modal, Typography } from "antd";
import { setToken, useAuthToken } from "../auth";

export default function LoginButton() {
  const token = useAuthToken();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  if (token) {
    return (
      <Button type="text" size="small" onClick={() => setToken(null)}>
        Logout
      </Button>
    );
  }

  const submit = () => {
    if (!input.trim()) return;
    setToken(input.trim());
    setOpen(false);
  };

  return (
    <>
      <Button
        type="primary"
        size="small"
        onClick={() => {
          setInput("");
          setOpen(true);
        }}
      >
        Login
      </Button>
      <Modal
        title="Admin login"
        open={open}
        onCancel={() => setOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setOpen(false)}>
            取消
          </Button>,
          <Button key="ok" type="primary" disabled={!input.trim()} onClick={submit}>
            登录
          </Button>,
        ]}
        destroyOnClose
        zIndex={2000}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          输入 ADMIN_TOKEN 以解锁编辑功能。
        </Typography.Paragraph>
        <Input.Password
          placeholder="ADMIN_TOKEN"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          onPressEnter={submit}
        />
      </Modal>
    </>
  );
}
