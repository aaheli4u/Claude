"use client";

import { Loader2, FilePlus, FilePen, FileSearch, Trash2, FolderInput } from "lucide-react";

interface StrReplaceArgs {
  command: "view" | "create" | "str_replace" | "insert" | "undo_edit";
  path: string;
  new_path?: string;
}

interface FileManagerArgs {
  command: "rename" | "delete";
  path: string;
  new_path?: string;
}

type ToolArgs = StrReplaceArgs | FileManagerArgs;

interface ToolCallBadgeProps {
  toolName: string;
  args: ToolArgs;
  state: "call" | "partial-call" | "result";
}

function getLabel(toolName: string, args: ToolArgs): { icon: React.ReactNode; text: string } {
  const filename = args.path?.split("/").pop() ?? args.path;

  if (toolName === "str_replace_editor") {
    const cmd = (args as StrReplaceArgs).command;
    switch (cmd) {
      case "create":
        return { icon: <FilePlus className="w-3 h-3" />, text: `Creating ${filename}` };
      case "str_replace":
      case "insert":
        return { icon: <FilePen className="w-3 h-3" />, text: `Editing ${filename}` };
      case "view":
        return { icon: <FileSearch className="w-3 h-3" />, text: `Reading ${filename}` };
      default:
        return { icon: <FilePen className="w-3 h-3" />, text: `Updating ${filename}` };
    }
  }

  if (toolName === "file_manager") {
    const cmd = (args as FileManagerArgs).command;
    if (cmd === "delete") {
      return { icon: <Trash2 className="w-3 h-3" />, text: `Deleting ${filename}` };
    }
    const newFilename = args.new_path?.split("/").pop() ?? args.new_path;
    return { icon: <FolderInput className="w-3 h-3" />, text: `Renaming ${filename} → ${newFilename}` };
  }

  return { icon: null, text: toolName };
}

export function ToolCallBadge({ toolName, args, state }: ToolCallBadgeProps) {
  const done = state === "result";
  const { icon, text } = getLabel(toolName, args);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      <div className={done ? "text-emerald-500" : "text-blue-500"}>
        {done ? (
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
        ) : (
          <Loader2 className="w-3 h-3 animate-spin" />
        )}
      </div>
      <span className="text-neutral-600">{icon}</span>
      <span className="text-neutral-700">{text}</span>
    </div>
  );
}
