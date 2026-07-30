import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { MarkdownEditor } from "~/components/markdown-editor";

interface PostEditorValue {
  id?: number;
  title: string;
  slug: string;
  summary: string;
  markdown: string;
  status: "draft" | "published";
  tags: string[];
}

export function PostEditorForm({ post, availableTags }: { post?: PostEditorValue; availableTags: string[] }) {
  const navigation = useNavigation();
  const saving = navigation.state === "submitting";
  const [selectedTags, setSelectedTags] = useState(post?.tags ?? []);
  const [tagQuery, setTagQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const normalizedQuery = tagQuery.trim().toLocaleLowerCase();
  const matchingTags = normalizedQuery
    ? availableTags
        .filter((tag) => !selectedTags.includes(tag) && tag.toLocaleLowerCase().startsWith(normalizedQuery))
        .slice(0, 8)
    : [];
  const exactMatch = availableTags.find((tag) => tag.toLocaleLowerCase() === normalizedQuery);
  const canCreateTag = Boolean(tagQuery.trim()) && !exactMatch;
  const suggestionCount = matchingTags.length + (canCreateTag ? 1 : 0);

  function removeTag(tagName: string) {
    setSelectedTags((currentTags) => currentTags.filter((tag) => tag !== tagName));
  }

  function selectTag(tagName: string) {
    setSelectedTags((currentTags) => currentTags.includes(tagName) || currentTags.length >= 12
      ? currentTags
      : [...currentTags, tagName]);
    setTagQuery("");
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
  }

  function selectActiveSuggestion() {
    if (!tagQuery.trim() || selectedTags.length >= 12) return;
    const selectedIndex = activeSuggestion >= 0 ? activeSuggestion : 0;
    if (matchingTags[selectedIndex]) {
      selectTag(matchingTags[selectedIndex]);
      return;
    }
    if (canCreateTag && selectedIndex === matchingTags.length) {
      selectTag(tagQuery.trim());
      return;
    }
    if (exactMatch && !selectedTags.includes(exactMatch)) selectTag(exactMatch);
  }

  return (
    <Form method="post" className="space-y-4">
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
          <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600">标题</span><input name="title" defaultValue={post?.title} required maxLength={160} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100" /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600">Slug</span><input name="slug" defaultValue={post?.slug} required maxLength={120} pattern="[a-z0-9\u3400-\u9fff-]+" className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100" /></label>
        </div>
        <label className="block"><span className="mb-1.5 flex items-center justify-between gap-3 text-xs font-medium text-slate-600"><span>摘要</span><span className="font-normal text-slate-400">留空则自动提取正文前 100 字</span></span><textarea name="summary" defaultValue={post?.summary} rows={2} maxLength={360} className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100" /></label>
        <fieldset>
          <legend className="sr-only">标签</legend>
          {selectedTags.map((tag) => <input key={tag} type="hidden" name="tags" value={tag} />)}
          {selectedTags.length ? <div className="mb-2 flex flex-wrap gap-1.5" aria-label="已选标签">
            {selectedTags.map((tag) => <button key={tag} type="button" onClick={() => removeTag(tag)} aria-label={`取消标签 ${tag}`} className="min-h-8 rounded-full bg-violet-100 px-2.5 text-xs font-medium text-violet-700 hover:bg-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">{tag}<span className="ml-1" aria-hidden="true">×</span></button>)}
          </div> : null}
          <div className="relative">
            <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-600" htmlFor="tag-search">
              <span>标签</span><span className="font-normal text-slate-400">{selectedTags.length}/12</span>
            </label>
            <input
              id="tag-search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={suggestionsOpen && suggestionCount > 0}
              aria-controls="tag-suggestions"
              aria-activedescendant={suggestionsOpen && activeSuggestion >= 0 ? `tag-suggestion-${activeSuggestion}` : undefined}
              value={tagQuery}
              disabled={selectedTags.length >= 12}
              onFocus={() => setSuggestionsOpen(Boolean(tagQuery.trim()))}
              onBlur={() => setSuggestionsOpen(false)}
              onChange={(event) => {
                setTagQuery(event.target.value);
                setSuggestionsOpen(Boolean(event.target.value.trim()));
                setActiveSuggestion(-1);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && suggestionCount > 0) {
                  event.preventDefault();
                  setSuggestionsOpen(true);
                  setActiveSuggestion((index) => (index + 1) % suggestionCount);
                } else if (event.key === "ArrowUp" && suggestionCount > 0) {
                  event.preventDefault();
                  setSuggestionsOpen(true);
                  setActiveSuggestion((index) => index < 0 ? suggestionCount - 1 : (index - 1 + suggestionCount) % suggestionCount);
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  selectActiveSuggestion();
                } else if (event.key === "Escape") {
                  setSuggestionsOpen(false);
                }
              }}
              maxLength={80}
              placeholder={selectedTags.length >= 12 ? "最多选择 12 个标签" : "输入标签名称进行搜索或新增"}
              className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            />
            {suggestionsOpen && suggestionCount > 0 ? (
              <div id="tag-suggestions" role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10">
                {matchingTags.map((tag, index) => (
                  <button
                    id={`tag-suggestion-${index}`}
                    key={tag}
                    type="button"
                    role="option"
                    aria-selected={activeSuggestion === index}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveSuggestion(index)}
                    onClick={() => selectTag(tag)}
                    className={`flex min-h-10 w-full items-center rounded-md px-3 text-left text-sm ${activeSuggestion === index ? "bg-violet-50 text-violet-700" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    {tag}
                  </button>
                ))}
                {canCreateTag ? (
                  <button
                    id={`tag-suggestion-${matchingTags.length}`}
                    type="button"
                    role="option"
                    aria-selected={activeSuggestion === matchingTags.length}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveSuggestion(matchingTags.length)}
                    onClick={() => selectTag(tagQuery.trim())}
                    className={`flex min-h-10 w-full items-center rounded-md px-3 text-left text-sm ${activeSuggestion === matchingTags.length ? "bg-violet-50 text-violet-700" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    新增标签“{tagQuery.trim()}”
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </fieldset>
      </section>
      <div><span className="mb-1.5 block text-sm font-medium">正文</span><MarkdownEditor name="markdown" initialMarkdown={post?.markdown} required /></div>
      <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg shadow-slate-900/10 backdrop-blur">
        <label className="flex items-center gap-3 text-sm"><span className="font-medium">发布状态</span><select name="status" defaultValue={post?.status ?? "draft"} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3"><option value="draft">草稿</option><option value="published">已发布</option></select></label>
        <div className="flex items-center gap-3">
          {post ? <button type="submit" name="intent" value="delete" formNoValidate disabled={saving} onClick={(event) => { if (!window.confirm(`永久删除“${post.title}”？此操作无法撤销。`)) event.preventDefault(); }} className="min-h-11 px-3 text-sm font-medium text-slate-500 hover:text-rose-600 disabled:opacity-50">删除文章</button> : null}
          <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60">{saving ? "正在保存…" : post ? "保存文章" : "创建文章"}</button>
        </div>
      </div>
    </Form>
  );
}
