export function formatDatetime(dt: string | null | undefined): string {
  if (!dt) return "";
  if (/^\d+$/.test(dt)) {
    let ts = Number(dt);
    if (dt.length === 10) ts = ts * 1000;
    const d = new Date(ts);
    return d.toISOString().replace("T", " ").replace("Z", "");
  }
  return dt;
}
