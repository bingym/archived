import { useEffect, useState } from "react";
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
    <div className="modal modal-open" style={{ zIndex: 1500 }}>
      <div className="modal-box max-w-lg">
        <h3 className="font-bold text-lg mb-4">{mode === "create" ? "新建 Person" : "编辑 Person"}</h3>
        <div className="flex flex-col gap-4">
          <label className="form-control">
            <span className="label-text mb-1">ID（短代号，建议英文小写，无空格）</span>
            <input
              className="input input-bordered"
              disabled={mode === "edit"}
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="elonmusk"
            />
          </label>
          <label className="form-control">
            <span className="label-text mb-1">Name</span>
            <input
              className="input input-bordered"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <ImageUpload
            label="Avatar"
            prefix="avatars"
            value={avatar}
            onChange={setAvatar}
            size={96}
          />
          <label className="form-control">
            <span className="label-text mb-1">Description</span>
            <textarea
              className="textarea textarea-bordered"
              rows={4}
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <div className="modal-action">
          <button className="btn btn-sm btn-ghost" onClick={onClose} disabled={saving}>
            取消
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => void submit()} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={() => (saving ? null : onClose())} />
    </div>
  );
}
