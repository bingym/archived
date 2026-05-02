import { useState } from "react";
import { Button, Flex, Form, Input, Modal, Space, Typography } from "antd";
import { setToken, useAuthToken } from "../auth";

const { Text } = Typography;

export default function LoginButton() {
  const token = useAuthToken();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  if (token) {
    return (
      <Button onClick={() => setToken(null)}>
        退出登录
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
      <Button type="primary" onClick={() => { setInput(""); setOpen(true); }}>
        登录
      </Button>
      <Modal
        title="管理员登录"
        open={open}
        onCancel={() => setOpen(false)}
        destroyOnHidden
        zIndex={2000}
        mask={{ closable: true }}
        footer={
          <Flex justify="flex-end">
            <Space>
              <Button onClick={() => setOpen(false)}>取消</Button>
              <Button type="primary" disabled={!input.trim()} onClick={submit}>
                登录
              </Button>
            </Space>
          </Flex>
        }
      >
        <Form layout="vertical" requiredMark={false} style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
            输入 ADMIN_TOKEN 以解锁编辑功能。
          </Text>
          <Form.Item
            label="Token"
            extra={<Text type="secondary" style={{ fontSize: 12 }}>仅存储在本地浏览器，不会上传到除本站点 API 以外的地址。</Text>}
          >
            <Input.Password
              placeholder="ADMIN_TOKEN"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
              onPressEnter={submit}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
