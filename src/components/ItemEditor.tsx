import { useEffect, useState } from "react";
import { apiFetch } from "../auth";
import ImageUpload from "./ImageUpload";
import ImageMultiUpload from "./ImageMultiUpload";

export type ItemKind = "books" | "articles" | "videos" | "podcasts" | "tweets" | "answers";

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "url" | "textarea" | "datetime" | "image" | "images";
}

const FIELDS: Record<ItemKind, FieldDef[]> = {
  books: [
    { key: "title", label: "Title", type: "text" },
    { key: "url", label: "URL", type: "url" },
    { key: "cover", label: "Cover", type: "image" },
  ],
  articles: [
    { key: "title", label: "Title", type: "text" },
    { key: "content", label: "Content (Markdown)", type: "textarea" },
  ],
  videos: [
    { key: "title", label: "Title", type: "text" },
    { key: "url", label: "URL", type: "url" },
  ],
  podcasts: [
    { key: "title", label: "Title", type: "text" },
    { key: "url", label: "URL", type: "url" },
  ],
  tweets: [
    { key: "datetime", label: "Datetime", type: "text" },
    { key: "content", label: "Content (HTML allowed)", type: "textarea" },
    { key: "imgs", label: "Images", type: "images" },
  ],
  answers: [
    { key: "datetime", label: "Datetime", type: "text" },
    { key: "question", label: "Question", type: "text" },
    { key: "content", label: "Answer (HTML allowed)", type: "textarea" },
  ],
};

const TITLES: Record<ItemKind, string> = {
  books: "书籍",
  articles: "文章",
  videos: "视频",
  podcasts: "播客",
  tweets: "推文",
  answers: "问答",
};

export interface ItemEditorProps {
  kind: ItemKind;
  personId: string;
  /** Pass an existing item (with id) to edit, otherwise create a new one. */
  initial?: Record<string, unknown> | null;
  onClose: () => void;
  onSaved: (item: Record<string, unknown>) => void;
}

function buildInitialState(kind: ItemKind, initial?: Record<string, unknown> | null) {
  const state: Record<string, unknown> = {};
  for (const f of FIELDS[kind]) {
    const v = initial?.[f.key];
    if (f.type === "images") {
      state[f.key] = Array.isArray(v) ? (v as string[]) : [];
    } else if (f.type === "image") {
      state[f.key] = (v as string | null | undefined) ?? null;
    } else {
      state[f.key] = (v as string | null | undefined) ?? "";
    }
  }
  return state;
}

export default function ItemEditor({ kind, personId, initial, onClose, onSaved }: ItemEditorProps) {
  const fields = FIELDS[kind];
  const [state, setState] = useState<Record<string, unknown>>(() => buildInitialState(kind, initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setState(buildInitialState(kind, initial));
  }, [kind, initial]);

  const isEdit = !!(initial && typeof initial.id === "number");
  const itemId = isEdit ? Number(initial!.id) : null;

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of fields) {
        const v = state[f.key];
        if (f.type === "images") {
          payload[f.key] = Array.isArray(v) ? v : [];
        } else if (f.type === "image") {
          payload[f.key] = v ?? null;
        } else {
          payload[f.key] = v === "" ? null : v;
        }
      }

      let saved: Record<string, unknown>;
      if (isEdit) {
        saved = await apiFetch<Record<string, unknown>>(`/api/v1/${kind}/${itemId}`, {
          method: "PUT",
          body: payload,
        });
      } else {
        saved = await apiFetch<Record<string, unknown>>(
          `/api/v1/people/${personId}/${kind}`,
          { method: "POST", body: payload }
        );
      }
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal modal-open" style={{ zIndex: 1500 }}>
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">
          {isEdit ? "编辑" : "新增"} {TITLES[kind]}
        </h3>
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-2">
          {fields.map((f) => {
            if (f.type === "image") {
              return (
                <ImageUpload
                  key={f.key}
                  label={f.label}
                  prefix={kind === "books" ? "covers" : "avatars"}
                  value={(state[f.key] as string | null) ?? null}
                  onChange={(k) => setState((s) => ({ ...s, [f.key]: k }))}
                />
              );
            }
            if (f.type === "images") {
              return (
                <ImageMultiUpload
                  key={f.key}
                  label={f.label}
                  value={(state[f.key] as string[]) ?? []}
                  onChange={(keys) => setState((s) => ({ ...s, [f.key]: keys }))}
                />
              );
            }
            if (f.type === "textarea") {
              return (
                <label key={f.key} className="form-control">
                  <span className="label-text mb-1">{f.label}</span>
                  <textarea
                    className="textarea textarea-bordered"
                    rows={f.key === "content" ? 12 : 4}
                    value={(state[f.key] as string) ?? ""}
                    onChange={(e) => setState((s) => ({ ...s, [f.key]: e.target.value }))}
                  />
                </label>
              );
            }
            return (
              <label key={f.key} className="form-control">
                <span className="label-text mb-1">{f.label}</span>
                <input
                  className="input input-bordered"
                  type={f.type === "url" ? "url" : "text"}
                  value={(state[f.key] as string) ?? ""}
                  onChange={(e) => setState((s) => ({ ...s, [f.key]: e.target.value }))}
                />
              </label>
            );
          })}
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
