import { useRef, useState } from "react";
import { Button, Typography } from "antd";
import { resolveImg, uploadImage, type UploadPrefix } from "../lib/img";

interface Props {
  value: string | null;
  onChange: (key: string | null) => void;
  prefix: Exclude<UploadPrefix, "tweets">;
  label?: string;
  size?: number;
  className?: string;
}

export default function ImageUpload({ value, onChange, prefix, label, size = 96, className = "" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePick = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const key = await uploadImage(file, prefix);
      onChange(key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`flex flex-col items-start gap-2 ${className}`}>
      {label && <span className="text-sm font-semibold text-gray-700">{label}</span>}
      <div className="flex items-center gap-3">
        <div
          className="rounded border overflow-hidden flex items-center justify-center bg-[#f5f5f5]"
          style={{ width: size, height: size }}
        >
          {value ? (
            <img
              src={resolveImg(value)}
              alt={label ?? "image"}
              style={{ width: size, height: size, objectFit: "cover" }}
            />
          ) : (
            <Typography.Text type="secondary" className="text-xs">
              无图
            </Typography.Text>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handlePick(f);
              e.target.value = "";
            }}
          />
          <Button type="default" size="small" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? "上传中…" : value ? "替换" : "上传"}
          </Button>
          {value && (
            <Button type="link" size="small" disabled={uploading} onClick={() => onChange(null)} style={{ padding: 0, height: "auto" }}>
              移除
            </Button>
          )}
        </div>
      </div>
      {error && <Typography.Text type="danger">{error}</Typography.Text>}
    </div>
  );
}
