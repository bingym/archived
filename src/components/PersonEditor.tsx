import { useEffect, useState } from "react";
import { Button, Input, Modal, Typography } from "antd";
import { apiFetch } from "../auth";
import ImageUpload from "./ImageUpload";

export interface PersonForm {
  id: string;
  name: string;
  avatar: string | null;
  description: string | null;
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setId(initial?.id ?? "");
    setName(initial?.name ?? "");
    setAvatar(initial?.avatar ?? null);
    setDescription(initial?.description ?? "");
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
          body: { id: id.trim(), name: name.trim(), avatar, description: description || null },
        });
        onSaved(created);
      } else {
        const targetId = initial?.id ?? id;
        const updated = await apiFetch<PersonForm>(`/api/v1/people/${targetId}`, {
          method: "PUT",
          body: { name: name.trim(), avatar, description: description || null },
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
      title={mode === "create" ? "新建 Person" : "编辑 Person"}
      open
      onCancel={() => (saving ? undefined : onClose())}
      width={560}
      zIndex={1500}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={saving}>
          取消
        </Button>,
        <Button key="save" type="primary" loading={saving} onClick={() => void submit()}>
          保存
        </Button>,
      ]}
      maskClosable={!saving}
    >
      <div className="flex flex-col gap-4">
        <div>
          <Typography.Text strong className="block mb-1">
            ID（短代号，建议英文小写，无空格）
          </Typography.Text>
          <Input disabled={mode === "edit"} value={id} onChange={(e) => setId(e.target.value)} placeholder="elonmusk" />
        </div>
        <div>
          <Typography.Text strong className="block mb-1">
            Name
          </Typography.Text>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <ImageUpload label="Avatar" prefix="avatars" value={avatar} onChange={setAvatar} size={96} />
        <div>
          <Typography.Text strong className="block mb-1">
            Description
          </Typography.Text>
          <Input.TextArea rows={4} value={description ?? ""} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {error && <Typography.Text type="danger">{error}</Typography.Text>}
      </div>
    </Modal>
  );
}
