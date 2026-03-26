import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import { useEffect, useCallback } from "react";
import { Toggle } from "@/components/ui/toggle";
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Link as LinkIcon,
  Minus,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const ToolbarButton = ({
  onClick,
  isActive,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <Toggle
    size="sm"
    pressed={isActive}
    onPressedChange={onClick}
    disabled={disabled}
    title={title}
    className="h-7 w-7 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
  >
    {children}
  </Toggle>
);

const Toolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL을 입력하세요", previousUrl ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border p-1.5 bg-muted/30 rounded-t-md">
      {/* Undo / Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="실행 취소"
      >
        <Undo className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="다시 실행"
      >
        <Redo className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="제목 1"
      >
        <Heading1 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="제목 2"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="제목 3"
      >
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="굵게"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="기울임"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="밑줄"
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="취소선"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        title="인라인 코드"
      >
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Text align */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        isActive={editor.isActive({ textAlign: "left" })}
        title="왼쪽 정렬"
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        isActive={editor.isActive({ textAlign: "center" })}
        title="가운데 정렬"
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        isActive={editor.isActive({ textAlign: "right" })}
        title="오른쪽 정렬"
      >
        <AlignRight className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        isActive={editor.isActive({ textAlign: "justify" })}
        title="양쪽 정렬"
      >
        <AlignJustify className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="글머리 기호 목록"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="번호 매기기 목록"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="인용문"
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Link & HR */}
      <ToolbarButton
        onClick={setLink}
        isActive={editor.isActive("link")}
        title="링크"
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="구분선"
      >
        <Minus className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Color */}
      <div className="relative flex items-center" title="글자 색상">
        <input
          type="color"
          className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0.5"
          value={editor.getAttributes("textStyle").color ?? "#000000"}
          onChange={(e) =>
            editor.chain().focus().setColor(e.target.value).run()
          }
          title="글자 색상"
        />
      </div>
    </div>
  );
};

export const RichTextEditor = ({
  value,
  onChange,
  placeholder,
  className,
  minHeight = "200px",
}: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none px-3 py-2",
        style: `min-height: ${minHeight}`,
        "data-placeholder": placeholder ?? "",
      },
    },
  });

  // Sync external value changes (e.g., reset)
  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    const normalizedValue = value === "" ? "<p></p>" : value;
    if (currentHtml !== normalizedValue) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background text-sm shadow-sm",
        className,
      )}
    >
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <style>{`
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }
        .tiptap {
          outline: none;
        }
        .tiptap p { margin: 0 0 0.5em; }
        .tiptap h1 { font-size: 1.5em; font-weight: 700; margin: 0.5em 0; }
        .tiptap h2 { font-size: 1.25em; font-weight: 700; margin: 0.5em 0; }
        .tiptap h3 { font-size: 1.1em; font-weight: 600; margin: 0.5em 0; }
        .tiptap ul { list-style-type: disc; padding-left: 1.5em; margin: 0.5em 0; }
        .tiptap ol { list-style-type: decimal; padding-left: 1.5em; margin: 0.5em 0; }
        .tiptap blockquote { border-left: 3px solid hsl(var(--border)); padding-left: 1em; margin: 0.5em 0; color: hsl(var(--muted-foreground)); }
        .tiptap code { background: hsl(var(--muted)); border-radius: 3px; padding: 0.1em 0.3em; font-family: monospace; font-size: 0.9em; }
        .tiptap pre { background: hsl(var(--muted)); border-radius: 6px; padding: 0.75em 1em; margin: 0.5em 0; overflow-x: auto; }
        .tiptap pre code { background: none; padding: 0; }
        .tiptap hr { border: none; border-top: 1px solid hsl(var(--border)); margin: 0.75em 0; }
        .tiptap a { color: hsl(var(--primary)); text-decoration: underline; cursor: pointer; }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
