import { useEffect, useState } from "react";
import { Button, Flex, Form, Input, Modal, Space, Switch, Typography } from "antd";
import { apiFetch } from "../auth";
import ImageUpload from "./ImageUpload";
import ImageMultiUpload from "./ImageMultiUpload";

export type ItemKind = "books" | "articles" | "videos" | "podcasts" | "tweets" | "answers";

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "url" | "textarea" | "datetime" | "image" | "images" | "boolean";
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
    { key: "metadata", label: "Meta（元数据）", type: "textarea" },
    { key: "imgs", label: "Images", type: "images" },
    { key: "starred", label: "星标", type: "boolean" },
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
    } else if (f.type === "boolean") {
      state[f.key] = v === true || v === 1 || v === "1";
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
        } else if (f.type === "boolean") {
          payload[f.key] = Boolean(v);
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
    <Modal
      title={`${isEdit ? "编辑" : "新增"} ${TITLES[kind]}`}
      open
      onCancel={() => (saving ? undefined : onClose())}
      width={720}
      zIndex={1500}
      styles={{ body: { maxHeight: "70vh", overflowY: "auto", paddingTop: 8 } }}
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
    >
      <Form layout="vertical" requiredMark="optional">
        {fields.map((f) => {
          if (f.type === "image") {
            return (
              <Form.Item key={f.key} label={f.label}>
                <ImageUpload
                  prefix={kind === "books" ? "covers" : "avatars"}
                  value={(state[f.key] as string | null) ?? null}
                  onChange={(k) => setState((s) => ({ ...s, [f.key]: k }))}
                />
              </Form.Item>
            );
          }
          if (f.type === "images") {
            return (
              <Form.Item key={f.key} label={f.label}>
                <ImageMultiUpload
                  value={(state[f.key] as string[]) ?? []}
                  onChange={(keys) => setState((s) => ({ ...s, [f.key]: keys }))}
                />
              </Form.Item>
            );
          }
          if (f.type === "textarea") {
            return (
              <Form.Item key={f.key} label={f.label}>
                <Input.TextArea
                  rows={f.key === "content" ? 6 : 2}
                  value={(state[f.key] as string) ?? ""}
                  onChange={(e) => setState((s) => ({ ...s, [f.key]: e.target.value }))}
                  style={{ resize:"none" }}
                />
              </Form.Item>
            );
          }
          if (f.type === "boolean") {
            return (
              <Form.Item key={f.key} label={f.label}>
                <Switch checked={Boolean(state[f.key])} onChange={(checked) => setState((s) => ({ ...s, [f.key]: checked }))} />
              </Form.Item>
            );
          }
          return (
            <Form.Item key={f.key} label={f.label}>
              <Input
                type={f.type === "url" ? "url" : "text"}
                value={(state[f.key] as string) ?? ""}
                onChange={(e) => setState((s) => ({ ...s, [f.key]: e.target.value }))}
              />
            </Form.Item>
          );
        })}
        {error && (
          <Typography.Text type="danger" role="alert">
            {error}
          </Typography.Text>
        )}
      </Form>
    </Modal>
  );
}
