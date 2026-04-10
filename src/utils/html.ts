const decodeHtmlEntities = (value: string) => {
  if (typeof document === "undefined") return value;

  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
};

const stripExecutableTags = (value: string) => {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?>[\s\S]*?<\/embed>/gi, "");
};

export const toRenderableHtml = (value?: string | null) => {
  if (!value) return "";

  const trimmed = value.trim();
  const decoded = /&lt;[a-z!/]/i.test(trimmed)
    ? decodeHtmlEntities(trimmed)
    : trimmed;

  return stripExecutableTags(decoded);
};
