import { useRef, useState } from "react";
import { Button, Typography } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { deleteImage, isR2Key, resolveImg, uploadImage } from "../lib/img";

interface Props {
  value: string[];
  onChange: (keys: string[]) => void;
  label?: string;
  size?: number;
  max?: number;
}

export default function ImageMultiUpload({ value, onChange, label, size = 96, max = 9 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePick = async (files: FileList) => {
    setError(null);
    setUploading(true);
    try {
      const remaining = Math.max(0, max - value.length);
      const list = Array.from(files).slice(0, remaining);
      const keys = await Promise.all(list.map((f) => uploadImage(f, "tweets")));
      onChange([...value, ...keys]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (key: string) => {
    const next = value.filter((k) => k !== key);
    onChange(next);
    if (isR2Key(key)) {
      try {
        await deleteImage(key);
      } catch {
        // best-effort cleanup
      }
    }
  };

  const canAdd = value.length < max;

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-semibold text-gray-700">{label}</span>}
      <div className="flex flex-wrap gap-2">
        {value.map((k) => (
          <div
            key={k}
            className="relative rounded border overflow-hidden bg-[#f5f5f5]"
            style={{ width: size, height: size }}
          >
            <img src={resolveImg(k)} alt="" style={{ width: size, height: size, objectFit: "cover" }} />
            <Button
              type="primary"
              danger
              shape="circle"
              size="small"
              icon={<CloseOutlined />}
              style={{ position: "absolute", top: 4, right: 4, minWidth: 24, width: 24, height: 24, padding: 0 }}
              onClick={() => void handleRemove(k)}
              title="删除"
            />
          </div>
        ))}
        {canAdd && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length) void handlePick(files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className="rounded border-2 border-dashed border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600 transition flex items-center justify-center"
              style={{ width: size, height: size, fontSize: 28 }}
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              title="添加图片"
            >
              {uploading ? "…" : "+"}
            </button>
          </>
        )}
      </div>
      {error && <Typography.Text type="danger">{error}</Typography.Text>}
    </div>
  );
}
