import { useRef, useState } from "react";
import { Button, Flex, Typography, theme } from "antd";
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
  const { token } = theme.useToken();
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
    <Flex vertical align="flex-start" gap={token.marginXS} className={className}>
      {label && (
        <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
          {label}
        </Typography.Text>
      )}
      <Flex align="center" gap={token.marginSM}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: token.borderRadius,
            border: `1px solid ${token.colorBorder}`,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: token.colorFillAlter,
          }}
        >
          {value ? (
            <img src={resolveImg(value, { width: size * 2, fit: "cover" })} alt={label ?? "image"} style={{ width: size, height: size, objectFit: "cover" }} />
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              无图
            </Typography.Text>
          )}
        </div>
        <Flex vertical gap={token.marginXXS}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handlePick(f);
              e.target.value = "";
            }}
          />
          <Button size="small" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? "上传中…" : value ? "替换" : "上传"}
          </Button>
          {value && (
            <Button type="link" size="small" disabled={uploading} onClick={() => onChange(null)} style={{ padding: 0, height: "auto" }}>
              移除
            </Button>
          )}
        </Flex>
      </Flex>
      {error && <Typography.Text type="danger">{error}</Typography.Text>}
    </Flex>
  );
}
