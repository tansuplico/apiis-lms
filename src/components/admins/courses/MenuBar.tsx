// src/components/editor/MenuBar.tsx
import { menuBarStateSelector } from "@/data/menuBar";
import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import {
  BoldIcon,
  CaseSensitive,
  Code,
  FunnelX,
  ImageIcon,
  List,
  ListOrdered,
  Minus,
  RectangleHorizontal,
  Redo2,
  RemoveFormatting,
  Undo2,
} from "lucide-react";
import { useRef } from "react";

export const MenuBar = ({
  editor,
  onImageUpload,
}: {
  editor: Editor | null;
  onImageUpload: (file: File) => Promise<string>;
}) => {
  // ── Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Derived: editor state
  const editorState = useEditorState({
    editor,
    selector: menuBarStateSelector,
  });

  // ── Guard: no editor
  if (!editor || !editorState) {
    return null;
  }

  // ── Style helpers
  const buttonBase = `
    px-3 py-1.5 
    rounded-md 
    text-sm font-medium 
    transition-colors duration-150
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
  `;

  const activeStyle =
    "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800";
  const inactiveStyle =
    "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600";
  const disabledStyle = "opacity-50 cursor-not-allowed";

  // ── Render
  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      {/* Bold */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editorState.canBold}
        className={`
          ${buttonBase}
          ${editorState.isBold ? activeStyle : inactiveStyle}
          ${!editorState.canBold ? disabledStyle : ""}
        `}
      >
        <BoldIcon size={20} />
      </button>

      {/* Image upload */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        title="Upload Image"
      >
        <ImageIcon size={20} />
      </button>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file || !editor) return;
          const url = await onImageUpload(file);
          editor.chain().focus().setImage({ src: url }).run();
          e.target.value = "";
        }}
      />

      {/* Clear formatting */}
      <button
        onClick={() => editor.chain().focus().unsetAllMarks().run()}
        className={`${buttonBase} ${inactiveStyle}`}
      >
        <RemoveFormatting />
      </button>

      <button
        onClick={() => editor.chain().focus().clearNodes().run()}
        className={`${buttonBase} ${inactiveStyle}`}
      >
        <FunnelX size={20} />
      </button>

      {/* Paragraph */}
      <button
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={`
          ${buttonBase}
          ${editorState.isParagraph ? activeStyle : inactiveStyle}
        `}
        title="Paragraph"
      >
        <CaseSensitive size={20} />
      </button>

      {/* Headings */}
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`
          ${buttonBase}
          ${editorState.isHeading1 ? activeStyle : inactiveStyle}
        `}
      >
        H1
      </button>

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`
          ${buttonBase}
          ${editorState.isHeading2 ? activeStyle : inactiveStyle}
        `}
      >
        H2
      </button>

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`
          ${buttonBase}
          ${editorState.isHeading3 ? activeStyle : inactiveStyle}
        `}
      >
        H3
      </button>

      {/* Lists */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`
          ${buttonBase}
          ${editorState.isBulletList ? activeStyle : inactiveStyle}
        `}
        title="Unordered List"
      >
        <List size={20} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`
          ${buttonBase}
          ${editorState.isOrderedList ? activeStyle : inactiveStyle}
        `}
        title="Ordered List"
      >
        <ListOrdered size={20} />
      </button>

      {/* Blockquote */}
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`
          ${buttonBase}
          ${editorState.isBlockquote ? activeStyle : inactiveStyle}
        `}
        title="Quote Block"
      >
        <RectangleHorizontal size={20} />
      </button>

      {/* Code block */}
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`
          ${buttonBase}
          ${editorState.isCodeBlock ? activeStyle : inactiveStyle}
        `}
        title="Codeblock"
      >
        <Code size={20} />
      </button>

      {/* Horizontal rule */}
      <button
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={`${buttonBase} ${inactiveStyle}`}
      >
        <Minus size={20} />
      </button>

      {/* Undo / Redo */}
      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editorState.canUndo}
        className={`
          ${buttonBase}
          ${inactiveStyle}
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title="Undo"
      >
        <Undo2 size={20} />
      </button>

      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editorState.canRedo}
        className={`
          ${buttonBase}
          ${inactiveStyle}
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title="Redo"
      >
        <Redo2 size={20} />
      </button>
    </div>
  );
};
