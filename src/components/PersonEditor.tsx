import { useEffect, useState } from "react";
import { Button, Flex, Form, Input, Modal, Space, Switch, Typography } from "antd";
import { apiFetch } from "../auth";
import ImageUpload from "./ImageUpload";

export interface PersonForm {
  id: string;
  name: string;
  avatar: string | null;
  description: string | null;
  visible?: boolean;
}

interface Props {
  mode: "create" | "edit";
  initial?: Partial<PersonForm>;
  onClose: () => void;
  onSaved: (p: PersonForm) => void;
}

export default function PersonEditor({ mode, initial, onClose, onSaved }: Props) {
  const [id, setId] = useState(initial?.id ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [avatar, setAvatar] = useState<string | null>(initial?.avatar ?? null);
  const [description, setDescription] = useState(initial?.description ?? "");
  // 编辑态默认沿用现值；新建态默认可见。
  const [visible, setVisible] = useState<boolean>(initial?.visible ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setId(initial?.id ?? "");
    setName(initial?.name ?? "");
    setAvatar(initial?.avatar ?? null);
    setDescription(initial?.description ?? "");
    setVisible(initial?.visible ?? true);
  }, [initial]);

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      if (mode === "create") {
        if (!id.trim() || !name.trim()) {
          throw new Error("id 和 name 必填");
        }
        const created = await apiFetch<PersonForm>("/api/v1/people", {
          method: "POST",
          body: {
            id: id.trim(),
            name: name.trim(),
            avatar,
            description: description || null,
            visible,
          },
        });
        onSaved(created);
      } else {
        const targetId = initial?.id ?? id;
        const updated = await apiFetch<PersonForm>(`/api/v1/people/${targetId}`, {
          method: "PUT",
          body: {
            name: name.trim(),
            avatar,
            description: description || null,
            visible,
          },
        });
        onSaved(updated);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={mode === "create" ? "新建人物" : "编辑人物"}
      open
      onCancel={() => (saving ? undefined : onClose())}
      width={560}
      zIndex={1500}
      footer={
        <Flex justify="flex-end">
          <Space>
            <Button onClick={onClose} disabled={saving}>
              取消
            </Button>
            <Button type="primary" loading={saving} onClick={() => void submit()}>
              保存
            </Button>
          </Space>
        </Flex>
      }
      mask={{ closable: !saving }}
      destroyOnHidden
    >
      <Form layout="vertical" requiredMark="optional" style={{ marginTop: 8 }}>
        <Form.Item label="ID（短代号，英文小写、无空格）" tooltip="创建后不可修改">
          <Input disabled={mode === "edit"} value={id} onChange={(e) => setId(e.target.value)} placeholder="例如 elonmusk" />
        </Form.Item>
        <Form.Item label="姓名">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="显示名称" />
        </Form.Item>
        <Form.Item label="头像">
          <ImageUpload prefix="avatars" value={avatar} onChange={setAvatar} size={96} />
        </Form.Item>
        <Form.Item label="简介">
          <Input.TextArea rows={4} value={description ?? ""} onChange={(e) => setDescription(e.target.value)} placeholder="可选" />
        </Form.Item>
        <Form.Item
          label="对未登录访客可见"
          tooltip="关闭后，未登录的访客将看不到此人物（列表与详情都返回 404）。已登录管理员仍可访问与编辑。"
        >
          <Switch
            checked={visible}
            onChange={setVisible}
            checkedChildren="可见"
            unCheckedChildren="隐藏"
          />
        </Form.Item>
        {error && (
          <Typography.Text type="danger" role="alert">
            {error}
          </Typography.Text>
        )}
      </Form>
    </Modal>
  );
}
