import type { Editor } from '@tiptap/react';
import { Bold, Italic, List, ListOrdered, Underline as UnderlineIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ToolbarButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({ label, active, onClick, children }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      className={cn(active && 'bg-muted text-foreground')}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

const HEADING_LEVELS = [1, 2, 3] as const;

export function EditorToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border pb-2">
      <ToolbarButton
        label="Bold"
        active={editor.isActive('bold')}
        onClick={() => {
          editor.chain().focus().toggleBold().run();
        }}
      >
        <Bold className="size-4" />
      </ToolbarButton>

      <ToolbarButton
        label="Italic"
        active={editor.isActive('italic')}
        onClick={() => {
          editor.chain().focus().toggleItalic().run();
        }}
      >
        <Italic className="size-4" />
      </ToolbarButton>

      <ToolbarButton
        label="Underline"
        active={editor.isActive('underline')}
        onClick={() => {
          editor.chain().focus().toggleUnderline().run();
        }}
      >
        <UnderlineIcon className="size-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border" />

      {HEADING_LEVELS.map((level) => (
        <ToolbarButton
          key={level}
          label={`Heading ${level}`}
          active={editor.isActive('heading', { level })}
          onClick={() => {
            editor.chain().focus().toggleHeading({ level }).run();
          }}
        >
          <span className="text-xs font-semibold">H{level}</span>
        </ToolbarButton>
      ))}

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton
        label="Bullet list"
        active={editor.isActive('bulletList')}
        onClick={() => {
          editor.chain().focus().toggleBulletList().run();
        }}
      >
        <List className="size-4" />
      </ToolbarButton>

      <ToolbarButton
        label="Numbered list"
        active={editor.isActive('orderedList')}
        onClick={() => {
          editor.chain().focus().toggleOrderedList().run();
        }}
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>
    </div>
  );
}
