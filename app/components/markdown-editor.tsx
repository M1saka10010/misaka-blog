import { useRef, useState } from "react";
import { Milkdown, MilkdownProvider, useEditor, useInstance } from "@milkdown/react";
import { defaultValueCtx, editorViewCtx, Editor, prosePluginsCtx, rootCtx, serializerCtx } from "@milkdown/kit/core";
import {
  commonmark,
  createCodeBlockCommand,
  insertImageCommand,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleLinkCommand,
  toggleStrongCommand,
  turnIntoTextCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from "@milkdown/kit/preset/commonmark";
import {
  addColAfterCommand,
  addColBeforeCommand,
  addRowAfterCommand,
  addRowBeforeCommand,
  gfm,
  insertTableCommand,
  toggleStrikethroughCommand,
} from "@milkdown/kit/preset/gfm";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { callCommand, getMarkdown } from "@milkdown/kit/utils";
import { deleteColumn, deleteRow, deleteTable } from "@milkdown/prose/tables";
import { Plugin, TextSelection, type Command as ProseCommand, type EditorState } from "@milkdown/prose/state";

type Command = { key: unknown };

function hasTrailingEmptyParagraph(editorState: EditorState) {
  const lastBlock = editorState.doc.lastChild;
  return lastBlock?.type.name === "paragraph" && lastBlock.content.size === 0;
}

const trailingParagraphPlugin = new Plugin({
  appendTransaction(transactions, _oldState, newState) {
    if (!transactions.some((transaction) => transaction.docChanged) || hasTrailingEmptyParagraph(newState)) return null;
    return newState.tr
      .insert(newState.doc.content.size, newState.schema.nodes.paragraph.create())
      .setMeta("addToHistory", false);
  },
  props: {
    handleKeyDown(editorView, event) {
      if (event.key !== "Backspace") return false;

      const { state } = editorView;
      const { $from, empty } = state.selection;
      if (!empty || $from.depth !== 1 || $from.parentOffset !== 0 || $from.parent.content.size !== 0) return false;

      const currentBlockIndex = $from.index(0);
      if (currentBlockIndex < 1) return false;

      const previousBlock = state.doc.child(currentBlockIndex - 1);
      if (previousBlock.type.name !== "blockquote" && previousBlock.type.name !== "code_block") return false;

      const currentBlockStart = $from.before(1);
      const previousBlockStart = currentBlockStart - previousBlock.nodeSize;
      const transaction = state.tr.delete(previousBlockStart, currentBlockStart);
      transaction.setSelection(TextSelection.near(transaction.doc.resolve(previousBlockStart + 1)));
      editorView.dispatch(transaction.scrollIntoView());
      return true;
    },
  },
  view(editorView) {
    if (!hasTrailingEmptyParagraph(editorView.state)) {
      editorView.dispatch(
        editorView.state.tr
          .insert(editorView.state.doc.content.size, editorView.state.schema.nodes.paragraph.create())
          .setMeta("addToHistory", false),
      );
    }
    return {};
  },
});

function EditorToolbar({ compact = false, onShowSource }: { compact?: boolean; onShowSource: (markdown: string) => void }) {
  const [loading, getEditor] = useInstance();
  const [imagePanelOpen, setImagePanelOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageError, setImageError] = useState("");
  const [previewFailed, setPreviewFailed] = useState(false);
  const [tablePanelOpen, setTablePanelOpen] = useState(false);
  const [toolbarMessage, setToolbarMessage] = useState("");
  const execute = (command: Command, payload?: unknown) => {
    if (loading) return;
    getEditor().action(callCommand(command.key as never, payload as never));
  };
  const executeProseCommand = (command: ProseCommand, successMessage: string) => {
    if (loading) return;
    const success = getEditor().action((context) => {
      const editorView = context.get(editorViewCtx);
      const result = command(editorView.state, editorView.dispatch, editorView);
      if (result) editorView.focus();
      return result;
    });
    setToolbarMessage(success ? successMessage : "请先把光标放到对应内容中");
  };
  const promptLink = () => {
    const href = window.prompt("请输入链接地址（https://）");
    if (href) execute(toggleLinkCommand, { href });
  };
  const validatedImageUrl = (() => {
    if (!imageUrl.trim()) return "";
    try {
      const parsedUrl = new URL(imageUrl.trim());
      return parsedUrl.protocol === "https:" && !parsedUrl.username && !parsedUrl.password
        ? parsedUrl.toString()
        : "";
    } catch {
      return "";
    }
  })();
  const insertImage = () => {
    if (!imageUrl.trim()) {
      setImageError("请填写图片地址");
      return;
    }
    if (!validatedImageUrl) {
      setImageError("请填写完整的 HTTPS 图片地址");
      return;
    }
    execute(insertImageCommand, { src: validatedImageUrl, alt: imageAlt.trim() });
    setImagePanelOpen(false);
    setImageUrl("");
    setImageAlt("");
    setImageError("");
    setPreviewFailed(false);
  };
  const showSource = () => {
    if (loading) return;
    onShowSource(getEditor().action(getMarkdown()));
  };
  const buttonClass = "min-h-9 min-w-9 rounded-md px-2 text-xs font-semibold text-slate-600 transition hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500";
  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 p-2 backdrop-blur" role="toolbar" aria-label="正文编辑工具栏">
      <div className="flex flex-wrap items-center gap-1">
        {!compact ? <><button type="button" className={buttonClass} disabled={loading} onClick={() => execute(wrapInHeadingCommand, 2)}>H2</button><button type="button" className={buttonClass} disabled={loading} onClick={() => execute(wrapInHeadingCommand, 3)}>H3</button><button type="button" className={buttonClass} disabled={loading} onClick={() => execute(turnIntoTextCommand)}>正文</button><span className="mx-1 h-5 w-px bg-slate-300" aria-hidden="true" /></> : null}
        <button type="button" className={buttonClass} disabled={loading} onClick={() => execute(toggleStrongCommand)}>粗体</button>
        <button type="button" className={buttonClass} disabled={loading} onClick={() => execute(toggleEmphasisCommand)}>斜体</button>
        <button type="button" className={buttonClass} disabled={loading} onClick={() => execute(toggleStrikethroughCommand)}>删除线</button>
        <button type="button" className={buttonClass} disabled={loading} onClick={() => execute(toggleInlineCodeCommand)}>行内代码</button>
        <button type="button" className={buttonClass} disabled={loading} onClick={promptLink}>链接</button>
        <span className="mx-1 h-5 w-px bg-slate-300" aria-hidden="true" />
        <button type="button" className={buttonClass} disabled={loading} onClick={() => execute(wrapInBulletListCommand)}>列表</button>
        {!compact ? <><button type="button" className={buttonClass} disabled={loading} onClick={() => execute(wrapInOrderedListCommand)}>编号</button><button type="button" className={buttonClass} disabled={loading} onClick={() => execute(wrapInBlockquoteCommand)}>引用</button><button type="button" className={buttonClass} disabled={loading} onClick={() => execute(createCodeBlockCommand)}>代码块</button><button type="button" className={buttonClass} disabled={loading} aria-expanded={imagePanelOpen} onClick={() => { setImagePanelOpen((open) => !open); setTablePanelOpen(false); setImageError(""); }}>图片</button><button type="button" className={buttonClass} disabled={loading} aria-expanded={tablePanelOpen} onClick={() => { setTablePanelOpen((open) => !open); setImagePanelOpen(false); setToolbarMessage(""); }}>表格</button></> : null}
        <button type="button" className="ml-auto min-h-9 rounded-md bg-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500" disabled={loading} onClick={showSource}>Markdown 源文</button>
      </div>
      {imagePanelOpen ? (
        <div role="dialog" aria-label="插入图片" className="mt-2 grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg shadow-slate-900/10 lg:grid-cols-[minmax(0,1fr)_12rem]">
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">图片地址</span>
              <input
                type="url"
                value={imageUrl}
                onChange={(event) => { setImageUrl(event.target.value); setImageError(""); setPreviewFailed(false); }}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); insertImage(); } }}
                placeholder="https://"
                className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">图片说明 <span className="font-normal text-slate-400">用于无障碍和加载失败时展示</span></span>
              <input
                value={imageAlt}
                onChange={(event) => setImageAlt(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); insertImage(); } }}
                maxLength={180}
                className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
            </label>
            {imageError ? <p role="alert" className="text-xs text-rose-600">{imageError}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setImagePanelOpen(false); setImageError(""); }} className="min-h-10 rounded-lg px-3 text-sm text-slate-600 hover:bg-slate-100">取消</button>
              <button type="button" onClick={insertImage} className="min-h-10 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500">插入图片</button>
            </div>
          </div>
          <div className="grid min-h-32 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {validatedImageUrl && !previewFailed ? (
              <img src={validatedImageUrl} alt={imageAlt || "图片预览"} onError={() => setPreviewFailed(true)} className="max-h-44 w-full object-contain" />
            ) : (
              <div className="px-3 text-center text-xs leading-5 text-slate-400">{previewFailed ? "图片无法加载，仍可检查地址后插入" : "填写 HTTPS 地址后在此预览"}</div>
            )}
          </div>
        </div>
      ) : null}
      {tablePanelOpen ? (
        <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg shadow-slate-900/10">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => { execute(insertTableCommand, { row: 3, col: 3 }); setToolbarMessage("已插入 3 × 3 表格"); }} className="min-h-9 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white hover:bg-violet-700">插入 3 × 3</button>
            <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />
            <button type="button" onClick={() => { execute(addRowBeforeCommand); setToolbarMessage("已在上方新增一行"); }} className={buttonClass}>上方加行</button>
            <button type="button" onClick={() => { execute(addRowAfterCommand); setToolbarMessage("已在下方新增一行"); }} className={buttonClass}>下方加行</button>
            <button type="button" onClick={() => { execute(addColBeforeCommand); setToolbarMessage("已在左侧新增一列"); }} className={buttonClass}>左侧加列</button>
            <button type="button" onClick={() => { execute(addColAfterCommand); setToolbarMessage("已在右侧新增一列"); }} className={buttonClass}>右侧加列</button>
            <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />
            <button type="button" onClick={() => executeProseCommand(deleteRow, "已删除当前行")} className="min-h-9 rounded-md px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">删除行</button>
            <button type="button" onClick={() => executeProseCommand(deleteColumn, "已删除当前列")} className="min-h-9 rounded-md px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">删除列</button>
            <button type="button" onClick={() => executeProseCommand(deleteTable, "已删除表格")} className="min-h-9 rounded-md px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">删除表格</button>
          </div>
          <p role="status" className="mt-2 text-xs text-slate-500">{toolbarMessage || "将光标放入表格后，可新增或删除行列；按 Tab 移动到下一个单元格。"}</p>
        </div>
      ) : null}
      {!imagePanelOpen && !tablePanelOpen && toolbarMessage ? <p role="status" className="px-2 pt-2 text-xs text-slate-500">{toolbarMessage}</p> : null}
    </div>
  );
}

function EditorContent({ initialMarkdown, onChange, onShowSource, compact }: { initialMarkdown: string; onChange: (value: string) => void; onShowSource: (markdown: string) => void; compact?: boolean }) {
  const initialMarkdownRef = useRef(initialMarkdown);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, initialMarkdownRef.current);
        ctx.update(prosePluginsCtx, (plugins) => [trailingParagraphPlugin, ...plugins]);
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => onChangeRef.current(markdown));
        ctx.get(listenerCtx).blur((currentContext) => {
          const editorView = currentContext.get(editorViewCtx);
          onChangeRef.current(currentContext.get(serializerCtx)(editorView.state.doc));
        });
      })
      .use(commonmark)
      .use(gfm)
      .use(listener), []);
  return <><EditorToolbar compact={compact} onShowSource={onShowSource} /><Milkdown /></>;
}

export function MarkdownEditor({ name, initialMarkdown = "", compact = false, required = false }: { name: string; initialMarkdown?: string; compact?: boolean; required?: boolean }) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [mode, setMode] = useState<"visual" | "source">("visual");
  const [editorVersion, setEditorVersion] = useState(0);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  function updateMarkdown(nextMarkdown: string) {
    if (hiddenInputRef.current) hiddenInputRef.current.value = nextMarkdown;
    setMarkdown(nextMarkdown);
  }

  function showSource(currentMarkdown: string) {
    updateMarkdown(currentMarkdown);
    setMode("source");
  }

  function showVisual() {
    setEditorVersion((version) => version + 1);
    setMode("visual");
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-100">
      <input ref={hiddenInputRef} type="hidden" name={name} defaultValue={initialMarkdown} required={required} />
      {mode === "visual" ? (
        <div className={`milkdown-editor overflow-y-auto [&_.milkdown]:min-h-full [&_.ProseMirror]:min-h-full [&_.ProseMirror]:px-5 [&_.ProseMirror]:py-5 [&_.ProseMirror]:text-base [&_.ProseMirror]:leading-7 [&_.ProseMirror]:text-slate-700 [&_.ProseMirror]:outline-none [&_.ProseMirror>*+*]:mt-4 [&_.ProseMirror_h2]:mt-8 [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:leading-tight [&_.ProseMirror_h2]:tracking-tight [&_.ProseMirror_h2]:text-slate-950 [&_.ProseMirror_h3]:mt-6 [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:leading-snug [&_.ProseMirror_h3]:text-slate-900 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-violet-400 [&_.ProseMirror_blockquote]:bg-violet-50 [&_.ProseMirror_blockquote]:px-4 [&_.ProseMirror_blockquote]:py-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:bg-slate-950 [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:font-mono [&_.ProseMirror_pre]:text-sm [&_.ProseMirror_pre]:text-slate-100 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:bg-slate-100 [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:font-mono [&_.ProseMirror_pre_code]:!rounded-none [&_.ProseMirror_pre_code]:!bg-transparent [&_.ProseMirror_pre_code]:!p-0 [&_.ProseMirror_pre_code]:!text-slate-100 [&_.ProseMirror_a]:text-violet-700 [&_.ProseMirror_a]:underline [&_.ProseMirror_.tableWrapper]:overflow-x-auto [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:text-sm [&_.ProseMirror_th]:min-w-28 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-slate-300 [&_.ProseMirror_th]:bg-slate-100 [&_.ProseMirror_th]:px-3 [&_.ProseMirror_th]:py-2 [&_.ProseMirror_th]:text-left [&_.ProseMirror_th]:font-semibold [&_.ProseMirror_td]:min-w-28 [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-slate-300 [&_.ProseMirror_td]:px-3 [&_.ProseMirror_td]:py-2 [&_.ProseMirror_.selectedCell]:bg-violet-100 ${compact ? "min-h-48 max-h-80" : "min-h-[36rem] max-h-[75vh]"}`}>
          <MilkdownProvider key={editorVersion}><EditorContent initialMarkdown={markdown} onChange={updateMarkdown} onShowSource={showSource} compact={compact} /></MilkdownProvider>
        </div>
      ) : (
        <div>
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/95 p-2 backdrop-blur">
            <p className="px-2 text-xs font-medium text-slate-500">直接编辑 Markdown 源文</p>
            <button type="button" onClick={showVisual} className="min-h-9 rounded-md bg-violet-600 px-3 text-xs font-semibold text-white hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500">返回可视化编辑</button>
          </div>
          <textarea
            value={markdown}
            onChange={(event) => updateMarkdown(event.target.value)}
            required={required}
            spellCheck={false}
            aria-label="Markdown 源文"
            className={`block w-full resize-y bg-slate-950 px-4 py-4 font-mono text-sm leading-7 text-slate-100 caret-violet-300 focus:outline-none ${compact ? "min-h-48" : "min-h-[32rem]"}`}
          />
        </div>
      )}
      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
        <span>{mode === "visual" ? "可视化编辑" : "Markdown 源文"}</span>
        <span>{markdown.length.toLocaleString()} 字符</span>
      </div>
    </div>
  );
}
