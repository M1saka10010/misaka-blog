export class SettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsValidationError";
  }
}

export function normalizeSettingsHttpsUrl(value: FormDataEntryValue | null, fieldName: string) {
  const input = String(value ?? "").trim();
  if (!input) return "";

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new SettingsValidationError(`${fieldName}格式无效，请填写完整的 HTTPS 地址`);
  }

  if (url.protocol !== "https:") {
    throw new SettingsValidationError(`${fieldName}必须使用 HTTPS`);
  }
  if (url.username || url.password) {
    throw new SettingsValidationError(`${fieldName}不能包含账户信息`);
  }

  return url.toString();
}
