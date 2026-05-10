import { useRef, useState } from "react";
import { Button, Flex, Typography, theme } from "antd";
import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import { deleteImage, isR2Key, resolveImg, uploadImage } from "../lib/img";

interface Props {
  value: string[];
  onChange: (keys: string[]) => void;
  label?: string;
  size?: number;
  max?: number;
}

export default function ImageMultiUpload({ value, onChange, label, size = 96, max = 9 }: Props) {
  const { token } = theme.useToken();
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
    <Flex vertical gap={token.marginXS}>
      {label && (
        <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
          {label}
        </Typography.Text>
      )}
      <Flex wrap="wrap" gap={token.marginSM}>
        {value.map((k) => (
          <div
            key={k}
            style={{
              position: "relative",
              width: size,
              height: size,
              borderRadius: token.borderRadius,
              border: `1px solid ${token.colorBorder}`,
              overflow: "hidden",
              background: token.colorFillAlter,
            }}
          >
            <img src={resolveImg(k, { width: size * 2, fit: "cover" })} alt="" style={{ width: size, height: size, objectFit: "cover" }} />
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
              style={{ display: "none" }}
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length) void handlePick(files);
                e.target.value = "";
              }}
            />
            <Button
              type="dashed"
              style={{ width: size, height: size, padding: 0 }}
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              title="添加图片"
            >
              {uploading ? "…" : <PlusOutlined style={{ fontSize: 20 }} />}
            </Button>
          </>
        )}
      </Flex>
      {error && <Typography.Text type="danger">{error}</Typography.Text>}
    </Flex>
  );
}
