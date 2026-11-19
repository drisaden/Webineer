"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarClock,
  Check,
  Copy,
  Eye,
  GripVertical,
  HelpCircle,
  ImageIcon,
  LayoutTemplate,
  ListChecks,
  Loader2,
  Megaphone,
  Minus,
  Monitor,
  PanelsTopLeft,
  Plus,
  Quote,
  Redo2,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Type,
  Undo2,
  UserRound,
  Video,
  ClipboardList,
  BarChart3,
  Columns3,
  GalleryHorizontal,
  Gift,
  Heading1,
  Lock,
  MapPin,
  MousePointerClick,
  Share2,
  Star,
  Tags,
  X,
} from "lucide-react";
import { MediaUploadField } from "@/components/uploads/media-upload-field";
import { Button } from "@/components/ui/button";
import { Notice, SelectInput, TextArea, TextInput, Toggle } from "@/components/webinars/workflow/form-controls";
import { BLOCK_BY_TYPE, BLOCK_DEFINITIONS, MAX_BLOCK_ITEMS, MAX_NESTED_BLOCKS, MAX_PAGE_BLOCKS, blockId, createBlock, defaultPageDesign } from "@/lib/page-design/defaults";
import { ICON_LABEL, PAGE_ICONS } from "@/lib/page-design/icons";
import { pageDesignPlanIssue, type PageBuilderLimits } from "@/lib/page-design/plan";
import { ALL_TEMPLATES, templateNeedsPaidPlan } from "@/lib/page-design/templates";
import { cloneWithNewIds, countBlocks, findBlock, findParent, insertIntoColumn, mapBlock, moveInColumn, moveToColumn, removeBlockById, resizeColumns, treeHasType, containsType } from "@/lib/page-design/tree";
import { isSingleBlock, pageDesignSchema } from "@/lib/page-design/schema";
import type { PublicRegistrationView } from "@/lib/webinar-workflow/public-view";
import { cn } from "@/lib/utils";
import type { PageBlock, PageBlockType, PageDesign, PageIcon, PageTheme, RegistrationSettings } from "@/types";
import { PageBlocksLayout, PageBlockView, pageThemeStyle } from "./blocks";

const BLOCK_ICONS: Record<PageBlockType, typeof Type> = {
  hero: Sparkles,
  text: Type,
  image: ImageIcon,
  media: PanelsTopLeft,
  video: Video,
  countdown: CalendarClock,
  presenters: UserRound,
  benefits: ListChecks,
  faq: HelpCircle,
  testimonials: Quote,
  cta: Megaphone,
  form: ClipboardList,
  divider: Minus,
  heading: Heading1,
  button: MousePointerClick,
  iconbox: Star,
  pricing: Gift,
  stats: BarChart3,
  timeline: ListChecks,
  gallery: GalleryHorizontal,
  logos: Tags,
  tabs: PanelsTopLeft,
  social: Share2,
  map: MapPin,
  columns: Columns3,
};

const DEVICES = [
  { id: "desktop", label: "Desktop", icon: Monitor, width: "100%" },
  { id: "tablet", label: "Tablet", icon: Tablet, width: "768px" },
  { id: "mobile", label: "Mobile", icon: Smartphone, width: "390px" },
] as const;

type SaveState = { status: "idle" | "saving" | "saved" } | { status: "error"; message: string };

interface Props {
  webinarId: string;
  slug: string | null;
  title: string;
  isDraft: boolean;
  registration: RegistrationSettings;
  baseVersion: number;
  view: PublicRegistrationView;
  limits: PageBuilderLimits;
}

/* ───────────────────────── small controls ───────────────────────── */

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-primaryText">{label}</legend>
      <div className="inline-flex w-full rounded-xl border border-border bg-[#F7F9FC] p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn("flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors", value === option.value ? "bg-white text-primaryText shadow-sm" : "text-secondaryText hover:text-primaryText")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ColorField({ label, value, onChange, emptyLabel }: { label: string; value: string; onChange: (value: string) => void; emptyLabel?: string }) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-primaryText">{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={`${label} picker`} value={valid ? value : "#ffffff"} onChange={(event) => onChange(event.target.value.toUpperCase())} className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-white p-1" />
        <input
          aria-label={`${label} hex`}
          className="input-field min-w-0 flex-1 font-mono text-sm"
          value={value}
          placeholder={emptyLabel ?? "#RRGGBB"}
          maxLength={7}
          onChange={(event) => {
            const next = event.target.value.trim();
            if (/^#?[0-9a-fA-F]{0,6}$/.test(next)) onChange(next === "" ? "" : next.startsWith("#") ? next.toUpperCase() : `#${next.toUpperCase()}`);
          }}
        />
        {emptyLabel && value && (
          <button type="button" onClick={() => onChange("")} className="shrink-0 rounded-lg border border-border px-2 py-2 text-xs text-secondaryText hover:bg-[#F7F9FC]">
            {emptyLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 border-b border-border px-4 py-4 last:border-b-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondaryText">{title}</h3>
      {children}
    </div>
  );
}

/* ───────────────────────── palette ───────────────────────── */

function PaletteItem({ type, disabled, locked, onAdd }: { type: PageBlockType; disabled: boolean; locked?: boolean; onAdd: () => void }) {
  const definition = BLOCK_BY_TYPE[type];
  const Icon = BLOCK_ICONS[type];
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `palette:${type}`, data: { from: "palette", type }, disabled: disabled || locked });
  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={disabled || locked}
      onClick={onAdd}
      title={locked ? "Needs a paid plan. Upgrade in Billing." : disabled ? "Already on the page, or the page is full" : `${definition.description}. Drag onto the page or click to add.`}
      data-palette={type}
      className={cn(
        "relative flex min-h-[44px] cursor-grab touch-none flex-col items-center gap-1.5 rounded-xl border border-border bg-white px-2 py-3 text-center text-xs font-medium text-primaryText transition-all hover:border-[#16D6B2] hover:shadow-soft active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40",
        isDragging && "opacity-40",
      )}
      {...listeners}
      {...attributes}
    >
      <Icon className="h-5 w-5 text-[#17294B]" aria-hidden />
      {definition.label}
      {locked && <Lock className="absolute right-1.5 top-1.5 h-3 w-3 text-secondaryText" aria-label="Paid plan" />}
    </button>
  );
}

/* ───────────────────────── canvas ───────────────────────── */

function CanvasBlock({
  block,
  selected,
  sortable,
  dropBefore,
  onSelect,
  onMove,
  onDuplicate,
  onRemove,
  canMoveUp,
  canMoveDown,
  children,
}: {
  block: PageBlock;
  selected: boolean;
  sortable: boolean;
  dropBefore: boolean;
  onSelect: () => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: (() => void) | null;
  onRemove: (() => void) | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id, data: { from: "canvas" }, disabled: !sortable });
  const label = BLOCK_BY_TYPE[block.type].label;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-canvas-block={block.type}
      data-block-id={block.id}
      data-selected={selected || undefined}
      className={cn("group/block relative rounded-[inherit]", isDragging && "z-10 opacity-60")}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      {dropBefore && <div className="pointer-events-none absolute -top-3 left-0 right-0 z-20 h-1 rounded-full bg-[#16D6B2]" aria-hidden />}
      {/* The page content is display-only inside the builder: clicks select the block instead. */}
      <div className="pointer-events-none">{children}</div>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-2xl outline outline-2 outline-offset-2 transition-[outline-color]",
          selected ? "outline-[#16D6B2]" : "outline-transparent group-hover/block:outline-[#9FB3D1]",
        )}
        aria-hidden
      />
      <div className={cn("absolute -top-3 left-3 z-20 flex items-center gap-1 rounded-full bg-[#041B5E] px-2 py-0.5 text-[11px] font-medium text-white shadow transition-opacity", selected ? "opacity-100" : "opacity-0 group-hover/block:opacity-100")}>
        {label}
      </div>
      <div className={cn("absolute -top-4 right-3 z-20 flex items-center gap-0.5 rounded-full border border-border bg-white p-0.5 text-[#17294B] shadow transition-opacity", selected ? "opacity-100" : "opacity-0 group-hover/block:opacity-100 focus-within:opacity-100")}>
        {sortable && (
          <button type="button" aria-label={`Drag ${label} block`} className="cursor-grab touch-none rounded-full p-1.5 hover:bg-[#EEF5FF] active:cursor-grabbing" {...listeners} {...attributes}>
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        <button type="button" aria-label={`Move ${label} block up`} disabled={!canMoveUp} onClick={(e) => (e.stopPropagation(), onMove(-1))} className="rounded-full p-1.5 hover:bg-[#EEF5FF] disabled:opacity-30">
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button type="button" aria-label={`Move ${label} block down`} disabled={!canMoveDown} onClick={(e) => (e.stopPropagation(), onMove(1))} className="rounded-full p-1.5 hover:bg-[#EEF5FF] disabled:opacity-30">
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        {onDuplicate && (
          <button type="button" aria-label={`Duplicate ${label} block`} onClick={(e) => (e.stopPropagation(), onDuplicate())} className="rounded-full p-1.5 hover:bg-[#EEF5FF]">
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
        {onRemove && (
          <button type="button" aria-label={`Delete ${label} block`} onClick={(e) => (e.stopPropagation(), onRemove())} className="rounded-full p-1.5 text-[#B33A3A] hover:bg-[#FFF6F6]">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function CanvasEnd({ active }: { active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-end" });
  return (
    <div
      ref={setNodeRef}
      data-testid="canvas-end"
      className={cn(
        "mx-auto mt-5 flex w-full items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-sm transition-colors",
        isOver ? "border-[#16D6B2] bg-[#EAFBF5] text-[#0F7B52]" : active ? "border-[#9FB3D1] text-secondaryText" : "border-transparent text-transparent",
      )}
    >
      Drop here to add at the end
    </div>
  );
}

/* ───────────────────────── block settings ───────────────────────── */

interface ColumnTools {
  limits: PageBuilderLimits;
  isPlaced: (type: PageBlockType) => boolean;
  full: boolean;
  select: (id: string) => void;
  add: (columnId: string, type: PageBlockType) => void;
  move: (id: string, direction: -1 | 1) => void;
  moveTo: (id: string, columnId: string, index: number) => void;
  remove: (id: string) => void;
  resize: (count: number) => void;
}

function VisibilityControls({ block, onChange }: { block: PageBlock; onChange: (next: PageBlock, coalesce?: string) => void }) {
  const show = block.show ?? { desktop: true, tablet: true, mobile: true };
  const set = (device: "desktop" | "tablet" | "mobile", value: boolean) => {
    const next = { ...show, [device]: value };
    onChange({ ...block, show: next.desktop && next.tablet && next.mobile ? undefined : next }, `${block.id}:show`);
  };
  return (
    <PanelSection title="Show on">
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Devices this block is shown on">
        {([["desktop", "Desktop", Monitor], ["tablet", "Tablet", Tablet], ["mobile", "Phone", Smartphone]] as const).map(([key, label, Icon]) => (
          <button key={key} type="button" aria-pressed={show[key]} data-show={key} onClick={() => set(key, !show[key])} className={cn("flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-medium", show[key] ? "border-[#16D6B2] bg-[#EAFBF5] text-[#0F7B52]" : "border-border bg-white text-secondaryText")}>
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </button>
        ))}
      </div>
      <p className="text-xs text-secondaryText">Turn a device off to hide this block there. Check it in the device preview.</p>
    </PanelSection>
  );
}

function ColumnsEditor({ block, tools }: { block: PageBlock; tools: ColumnTools }) {
  const columns = block.columns ?? [];
  const [dragId, setDragId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const endDrag = () => (setDragId(null), setOverKey(null));
  const dropAt = (columnId: string, index: number) => {
    if (dragId) tools.moveTo(dragId, columnId, index);
    endDrag();
  };
  const addable = BLOCK_DEFINITIONS.filter((d) => d.type !== "columns" && (!d.advanced || tools.limits.advancedElements));
  return (
    <div className="space-y-3" data-testid="columns-editor">
      <Segmented label="Columns" value={String(columns.length) as "1" | "2" | "3" | "4"} onChange={(v) => tools.resize(Number(v))} options={[{ value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }]} />
      {columns.map((column, ci) => (
        <div
          key={column.id}
          className={cn("space-y-2 rounded-xl border bg-[#F7F9FC] p-3", overKey === `${column.id}:end` ? "border-[#0AEBCB]" : "border-border")}
          data-column={ci + 1}
          data-column-drop={ci + 1}
          onDragOver={(e) => { if (dragId) { e.preventDefault(); setOverKey(`${column.id}:end`); } }}
          onDrop={(e) => { e.preventDefault(); dropAt(column.id, column.blocks.length); }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-secondaryText">Column {ci + 1}</p>
          {column.blocks.length === 0 && <p className="text-xs text-secondaryText">Empty. Add an element below.</p>}
          {column.blocks.map((child, i) => (
            <div
              key={child.id}
              draggable
              data-child-row={child.type}
              onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", child.id); setDragId(child.id); }}
              onDragEnd={endDrag}
              onDragOver={(e) => { if (dragId && dragId !== child.id) { e.preventDefault(); e.stopPropagation(); setOverKey(child.id); } }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); dropAt(column.id, i); }}
              className={cn("flex cursor-grab items-center gap-1 rounded-lg bg-white px-2 py-1", dragId === child.id && "opacity-40", overKey === child.id && "ring-2 ring-[#0AEBCB]")}
            >
              <GripVertical className="h-4 w-4 shrink-0 text-secondaryText" aria-hidden />
              <button type="button" onClick={() => tools.select(child.id)} data-child-edit={child.type} className="min-h-[44px] flex-1 truncate text-left text-sm font-medium text-[#17294B]">
                {BLOCK_BY_TYPE[child.type].label}
              </button>
              <button type="button" aria-label={`Move ${BLOCK_BY_TYPE[child.type].label} up`} disabled={i === 0} onClick={() => tools.move(child.id, -1)} className="rounded p-1.5 text-secondaryText disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label={`Move ${BLOCK_BY_TYPE[child.type].label} down`} disabled={i === column.blocks.length - 1} onClick={() => tools.move(child.id, 1)} className="rounded p-1.5 text-secondaryText disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
              {child.type !== "form" && <button type="button" aria-label={`Remove ${BLOCK_BY_TYPE[child.type].label}`} onClick={() => tools.remove(child.id)} className="rounded p-1.5 text-[#B33A3A]"><Trash2 className="h-3.5 w-3.5" /></button>}
            </div>
          ))}
          {column.blocks.length < MAX_NESTED_BLOCKS && !tools.full && (
            <select
              aria-label={`Add an element to column ${ci + 1}`}
              data-add-to-column={ci + 1}
              className="input-field min-h-[44px] text-sm"
              value=""
              onChange={(e) => {
                const type = e.target.value as PageBlockType;
                if (type) tools.add(column.id, type);
              }}
            >
              <option value="">+ Add element…</option>
              {addable.map((d) => (
                <option key={d.type} value={d.type} disabled={Boolean(d.single) && tools.isPlaced(d.type)}>
                  {d.label}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
      {tools.full && <Notice tone="warning">The page has reached its element limit.</Notice>}
      <p className="text-xs text-secondaryText">Drag an element by its row to reorder it or move it to another column. On touch screens use the arrows.</p>
    </div>
  );
}

function BlockSettings({ block, view, onChange, tools }: { block: PageBlock; view: PublicRegistrationView; onChange: (next: PageBlock, coalesce?: string) => void; tools: ColumnTools }) {
  const definition = BLOCK_BY_TYPE[block.type];
  const has = (field: (typeof definition.fields)[number]) => definition.fields.includes(field);
  const set = <K extends keyof PageBlock>(key: K, value: PageBlock[K], coalesce = true) => onChange({ ...block, [key]: value }, coalesce ? `${block.id}:${String(key)}` : undefined);
  const setStyle = <K extends keyof PageBlock["style"]>(key: K, value: PageBlock["style"][K]) => onChange({ ...block, style: { ...block.style, [key]: value } }, `${block.id}:style:${String(key)}`);
  const labels = definition.itemLabels;
  const setItems = (items: PageBlock["items"], coalesce?: string) => onChange({ ...block, items }, coalesce);

  return (
    <div data-testid="block-settings">
      <PanelSection title="Content">
        {has("heading") && (
          <TextInput
            label="Heading"
            value={block.heading}
            onChange={(v) => set("heading", v)}
            maxLength={200}
            optional={block.type !== "text"}
            placeholder={block.type === "hero" ? view.headline || "Uses the registration headline" : block.type === "form" ? "Reserve your seat" : ""}
            hint={block.type === "hero" ? "Leave empty to use the registration headline." : undefined}
          />
        )}
        {has("text") && (
          <TextArea
            label={block.type === "hero" ? "Intro text" : "Text"}
            value={block.text}
            onChange={(v) => set("text", v)}
            rows={4}
            maxLength={4000}
            optional
            placeholder={block.type === "hero" ? view.description || "Uses the registration description" : block.type === "form" ? view.title : ""}
          />
        )}
        {has("image") && (
          <>
            <MediaUploadField label="Image" optional value={block.imageUrl} onChange={(v) => set("imageUrl", v, false)} hint={block.type === "hero" ? "Leave empty to use the webinar cover image." : undefined} />
            <TextInput label="Image description" optional value={block.imageAlt} onChange={(v) => set("imageAlt", v)} maxLength={200} hint="Read aloud by screen readers." />
          </>
        )}
        {has("imageSide") && (
          <Segmented label="Image position" value={block.imageSide} onChange={(v) => set("imageSide", v, false)} options={[{ value: "left", label: "Left" }, { value: "right", label: "Right" }]} />
        )}
        {has("button") && <TextInput label="Button text" optional value={block.buttonLabel} onChange={(v) => set("buttonLabel", v)} maxLength={60} hint={block.type === "pricing" ? "Shown on every option. Each option can have its own link below." : "Scrolls to the registration form unless a link is set. Leave empty to hide the button."} />}
        {has("link") && (
          <TextInput
            label={block.type === "map" ? "Map link" : "Link"}
            optional
            value={block.link ?? ""}
            onChange={(v) => set("link", v.trim())}
            maxLength={1000}
            placeholder="https://"
            hint={block.type === "button" ? "Leave empty to scroll to the registration form." : "Must start with https://"}
          />
        )}
        {has("columns") && <ColumnsEditor block={block} tools={tools} />}
        {has("embed") && (
          <>
            <Toggle label="Show an embedded map" checked={block.embed ?? false} onChange={(v) => set("embed", v, false)} />
            {block.embed && <p className="text-xs text-secondaryText">The map is loaded from Google Maps, so the browser of anyone viewing the page connects to Google. Use the address above, or turn this off to show a plain link.</p>}
          </>
        )}
        {has("showDate") && <Toggle label="Show the session date" checked={block.showDate} onChange={(v) => set("showDate", v, false)} />}
        {has("height") && (
          <div>
            <label htmlFor="block-height" className="mb-2 flex items-center justify-between text-sm font-medium text-primaryText">
              Height <span className="text-xs font-normal text-secondaryText">{block.height}px</span>
            </label>
            <input id="block-height" type="range" min={8} max={160} step={4} value={block.height} onChange={(e) => set("height", Number(e.target.value))} className="w-full accent-[#16D6B2]" />
          </div>
        )}
        {block.type === "video" && <Notice>Shows the video preview configured under the webinar&apos;s Registration settings.</Notice>}
        {block.type === "presenters" && <Notice>Lists the host and presenters from the webinar&apos;s Configuration.</Notice>}
        {block.type === "countdown" && <Notice>Counts down to the next scheduled session.</Notice>}
        {has("items") && labels && (
          <div className="space-y-3">
            {block.items.map((item, index) => (
              <div key={item.id} className="space-y-2 rounded-xl border border-border bg-[#F7F9FC] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-secondaryText">
                    {labels.noun} {index + 1}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <button type="button" aria-label={`Move ${labels.noun} ${index + 1} up`} disabled={index === 0} onClick={() => setItems(arrayMove(block.items, index, index - 1))} className="rounded p-1 text-secondaryText hover:bg-white disabled:opacity-30">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" aria-label={`Move ${labels.noun} ${index + 1} down`} disabled={index === block.items.length - 1} onClick={() => setItems(arrayMove(block.items, index, index + 1))} className="rounded p-1 text-secondaryText hover:bg-white disabled:opacity-30">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" aria-label={`Remove ${labels.noun} ${index + 1}`} onClick={() => setItems(block.items.filter((x) => x.id !== item.id))} className="rounded p-1 text-[#B33A3A] hover:bg-white">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
                <input aria-label={`${labels.title} ${index + 1}`} className="input-field text-sm" placeholder={labels.title} maxLength={200} value={item.title} onChange={(e) => setItems(block.items.map((x) => (x.id === item.id ? { ...x, title: e.target.value } : x)), `${item.id}:title`)} />
                <textarea aria-label={`${labels.text} ${index + 1}`} className="input-field resize-y text-sm" placeholder={labels.text} rows={2} maxLength={1500} value={item.text} onChange={(e) => setItems(block.items.map((x) => (x.id === item.id ? { ...x, text: e.target.value } : x)), `${item.id}:text`)} />
                {definition.itemFields?.includes("icon") && (
                  <select aria-label={`Icon ${index + 1}`} className="input-field min-h-[44px] text-sm" value={item.icon ?? "check"} onChange={(e) => setItems(block.items.map((x) => (x.id === item.id ? { ...x, icon: e.target.value as PageIcon } : x)))}>
                    {PAGE_ICONS.map((icon) => <option key={icon} value={icon}>{ICON_LABEL[icon]}</option>)}
                  </select>
                )}
                {definition.itemFields?.includes("image") && (
                  <MediaUploadField label="Picture" optional value={item.imageUrl ?? ""} onChange={(v) => setItems(block.items.map((x) => (x.id === item.id ? { ...x, imageUrl: v } : x)))} />
                )}
                {definition.itemFields?.includes("link") && (
                  <input aria-label={`Link ${index + 1}`} className="input-field text-sm" placeholder="Link (https://…)" maxLength={1000} value={item.link ?? ""} onChange={(e) => setItems(block.items.map((x) => (x.id === item.id ? { ...x, link: e.target.value.trim() } : x)), `${item.id}:link`)} />
                )}
              </div>
            ))}
            {block.items.length < MAX_BLOCK_ITEMS && (
              <button type="button" onClick={() => setItems([...block.items, { id: blockId("i"), title: "", text: "" }])} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[#9FB3D1] px-3 py-2 text-sm font-medium text-[#17294B] hover:bg-[#F7F9FC]">
                <Plus className="h-4 w-4" /> Add {labels.noun}
              </button>
            )}
          </div>
        )}
      </PanelSection>

      <VisibilityControls block={block} onChange={onChange} />

      {block.type !== "divider" && block.type !== "columns" && (
        <PanelSection title="Style">
          {block.type !== "image" && (
            <>
              <ColorField label="Background" value={block.style.background} onChange={(v) => setStyle("background", v)} emptyLabel="None" />
              <ColorField label="Text colour" value={block.style.textColor} onChange={(v) => setStyle("textColor", v)} emptyLabel="Page default" />
              <Segmented label="Alignment" value={block.style.align} onChange={(v) => setStyle("align", v)} options={[{ value: "left", label: "Left" }, { value: "center", label: "Centre" }]} />
              <Segmented label="Inner spacing" value={block.style.padding} onChange={(v) => setStyle("padding", v)} options={[{ value: "none", label: "None" }, { value: "sm", label: "S" }, { value: "md", label: "M" }, { value: "lg", label: "L" }]} />
            </>
          )}
          <Segmented label="Width" value={block.style.width === "wide" ? "normal" : block.style.width} onChange={(v) => setStyle("width", v)} options={[{ value: "narrow", label: "Narrow" }, { value: "normal", label: "Full" }]} />
          <div>
            <label htmlFor="block-radius" className="mb-2 flex items-center justify-between text-sm font-medium text-primaryText">
              Rounded corners <span className="text-xs font-normal text-secondaryText">{block.style.radius}px</span>
            </label>
            <input id="block-radius" type="range" min={0} max={40} step={2} value={block.style.radius} onChange={(e) => setStyle("radius", Number(e.target.value))} className="w-full accent-[#16D6B2]" />
          </div>
          {block.type !== "image" && <Toggle label="Soft shadow" description="Needs a background colour." checked={block.style.shadow} onChange={(v) => setStyle("shadow", v)} />}
        </PanelSection>
      )}
    </div>
  );
}

/* ───────────────────────── templates ───────────────────────── */

const KIND_LABEL = { form: "Form only", standard: "Standard", long: "Long page" } as const;

function TemplateGallery({ onTemplate, limits }: { onTemplate: (id: string) => void; limits: PageBuilderLimits }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const [kind, setKind] = useState<"all" | "form" | "standard" | "long">("all");
  const [category, setCategory] = useState("All");
  const categories = useMemo(() => ["All", ...Array.from(new Set(ALL_TEMPLATES.map((t) => t.category ?? "Any webinar")))], []);
  const shown = ALL_TEMPLATES.filter((t) => (kind === "all" || t.kind === kind) && (category === "All" || (t.category ?? "Any webinar") === category));
  return (
    <div className="space-y-3" data-testid="template-gallery">
      <div className="grid grid-cols-2 gap-2">
        <SelectInput label="Type" value={kind} onChange={(v) => setKind(v)} options={[{ value: "all", label: "All types" }, { value: "form", label: "Form only" }, { value: "standard", label: "Standard" }, { value: "long", label: "Long page" }]} />
        <SelectInput label="For" value={category} onChange={(v) => setCategory(v)} options={categories.map((c) => ({ value: c, label: c === "All" ? "Everything" : c }))} />
      </div>
      {shown.length === 0 && <p className="text-xs text-secondaryText">No templates match.</p>}
      {shown.map((template) => {
        const built = template.build();
        const locked = templateNeedsPaidPlan(template) && !limits.advancedElements;
        return (
          <div key={template.id} className="rounded-xl border border-border bg-white p-3" data-template-card={template.id}>
            <div className="flex gap-3">
              <div aria-hidden className="flex h-14 w-12 shrink-0 flex-col gap-0.5 overflow-hidden rounded-lg border border-border p-1" style={{ background: built.theme.background }}>
                {built.blocks.slice(0, 5).map((b) => (
                  <span key={b.id} className="block h-2 rounded-sm" style={{ background: b.style.background || built.theme.accent, opacity: b.style.background ? 1 : 0.5 }} />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-primaryText">
                  {template.name}
                  <span className="rounded-full bg-[#EEF5FF] px-1.5 py-0.5 text-[10px] font-medium text-[#17294B]">{KIND_LABEL[template.kind ?? "standard"]}</span>
                  {locked && <span className="inline-flex items-center gap-0.5 rounded-full bg-[#FFF6E5] px-1.5 py-0.5 text-[10px] font-medium text-[#8A5A0E]"><Lock className="h-2.5 w-2.5" aria-hidden /> Paid plan</span>}
                </p>
                <p className="mt-0.5 text-xs text-secondaryText">{template.description}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end gap-1">
              {confirm === template.id ? (
                <>
                  <button type="button" onClick={() => (onTemplate(template.id), setConfirm(null))} data-template-confirm={template.id} className="min-h-[36px] rounded-lg bg-[#041B5E] px-3 text-xs font-medium text-white">Replace my page</button>
                  <button type="button" onClick={() => setConfirm(null)} className="min-h-[36px] rounded-lg border border-border px-3 text-xs text-secondaryText">Cancel</button>
                </>
              ) : (
                <button type="button" disabled={locked} onClick={() => setConfirm(template.id)} data-template={template.id} className="min-h-[36px] rounded-lg border border-border px-3 text-xs font-medium text-[#17294B] hover:bg-[#F7F9FC] disabled:opacity-40">Use</button>
              )}
            </div>
            {confirm === template.id && <p className="mt-2 text-xs text-[#8A5A0E]">This replaces the blocks and colours on the page. You can undo it.</p>}
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── page settings ───────────────────────── */

function PageSettings({ design, onChange, onTemplate, limits }: { design: PageDesign; onChange: (next: PageDesign, coalesce?: string) => void; onTemplate: (id: string) => void; limits: PageBuilderLimits }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const setTheme = <K extends keyof PageTheme>(key: K, value: PageTheme[K]) => onChange({ ...design, theme: { ...design.theme, [key]: value } }, `theme:${String(key)}`);
  return (
    <div data-testid="page-settings">
      <PanelSection title="Design">
        <Toggle
          label="Use this design on the live page"
          description="Turn off to show the standard layout. Your design stays saved."
          checked={design.enabled}
          onChange={(v) => onChange({ ...design, enabled: v })}
        />
        <Segmented
          label="Layout"
          value={design.layout}
          onChange={(v) => onChange({ ...design, layout: v })}
          options={[
            { value: "sidebar", label: "Form beside content" },
            { value: "stacked", label: "Single column" },
          ]}
        />
        <SelectInput
          label="Content width"
          value={design.theme.maxWidth}
          onChange={(v) => setTheme("maxWidth", v)}
          options={[
            { value: "md", label: "Narrow" },
            { value: "lg", label: "Standard" },
            { value: "xl", label: "Wide" },
            { value: "full", label: "Full width" },
          ]}
        />
      </PanelSection>
      <PanelSection title="Colours & type">
        <ColorField label="Page background" value={design.theme.background} onChange={(v) => /^#[0-9A-F]{6}$/i.test(v) && setTheme("background", v)} />
        <ColorField label="Text" value={design.theme.text} onChange={(v) => /^#[0-9A-F]{6}$/i.test(v) && setTheme("text", v)} />
        <ColorField label="Accent (buttons, highlights)" value={design.theme.accent} onChange={(v) => /^#[0-9A-F]{6}$/i.test(v) && setTheme("accent", v)} />
        <ColorField label="Text on accent" value={design.theme.accentText} onChange={(v) => /^#[0-9A-F]{6}$/i.test(v) && setTheme("accentText", v)} />
        <SelectInput
          label="Heading font"
          value={design.theme.headingFont}
          onChange={(v) => setTheme("headingFont", v)}
          options={[
            { value: "brand", label: "Webineer display" },
            { value: "sans", label: "Clean sans-serif" },
            { value: "serif", label: "Classic serif" },
          ]}
        />
      </PanelSection>
      <PanelSection title="Start from a template">
        <TemplateGallery onTemplate={onTemplate} limits={limits} />
      </PanelSection>
    </div>
  );
}

/* ───────────────────────── builder ───────────────────────── */

export function PageBuilder({ webinarId, slug, title, isDraft, registration: initialRegistration, baseVersion: initialVersion, view, limits }: Props) {
  const startedFromSaved = Boolean(initialRegistration.page);
  const [design, setDesign] = useState<PageDesign>(() => initialRegistration.page ?? defaultPageDesign());
  // Undo/redo stacks live in a ref (they're only touched from event handlers); the counts drive the buttons.
  const historyRef = useRef<{ past: PageDesign[]; future: PageDesign[] }>({ past: [], future: [] });
  const [history, setHistory] = useState({ past: 0, future: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"blocks" | "page">("blocks");
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [dirty, setDirty] = useState(!startedFromSaved);
  const [preview, setPreview] = useState<{ device: (typeof DEVICES)[number]["id"]; nonce: number } | null>(null);
  const [dragging, setDragging] = useState<{ label: string; fromPalette: boolean } | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const registrationRef = useRef(initialRegistration);
  const versionRef = useRef(initialVersion);
  const coalesceRef = useRef<{ key: string; at: number } | null>(null);
  const designRef = useRef(design);

  const selected = findBlock(design.blocks, selectedId);
  const total = countBlocks(design.blocks);
  const problems = useMemo(() => {
    const parsed = pageDesignSchema.safeParse(design);
    const found = parsed.success ? [] : [...new Set(parsed.error.issues.map((issue) => issue.message))];
    const plan = pageDesignPlanIssue(design, limits);
    return plan ? [...found, plan] : found;
  }, [design, limits]);

  /** Apply a change and record it for undo. Rapid edits to the same field collapse into one step. */
  const commit = useCallback((next: PageDesign, coalesce?: string) => {
    const now = Date.now();
    const last = coalesceRef.current;
    const merge = Boolean(coalesce && last && last.key === coalesce && now - last.at < 1200);
    coalesceRef.current = coalesce ? { key: coalesce, at: now } : null;
    if (!merge) {
      historyRef.current = { past: [...historyRef.current.past.slice(-49), designRef.current], future: [] };
      setHistory({ past: historyRef.current.past.length, future: 0 });
    }
    designRef.current = next;
    setDesign(next);
    setDirty(true);
    setSaveState({ status: "idle" });
  }, []);

  const travel = useCallback((direction: "undo" | "redo") => {
    const h = historyRef.current;
    const target = direction === "undo" ? h.past[h.past.length - 1] : h.future[0];
    if (!target) return;
    historyRef.current =
      direction === "undo" ? { past: h.past.slice(0, -1), future: [designRef.current, ...h.future] } : { past: [...h.past, designRef.current], future: h.future.slice(1) };
    coalesceRef.current = null;
    designRef.current = target;
    setDesign(target);
    setHistory({ past: historyRef.current.past.length, future: historyRef.current.future.length });
    setDirty(true);
    setSaveState({ status: "idle" });
  }, []);
  const undo = useCallback(() => travel("undo"), [travel]);
  const redo = useCallback(() => travel("redo"), [travel]);

  const updateBlock = useCallback((next: PageBlock, coalesce?: string) => commit({ ...designRef.current, blocks: mapBlock(designRef.current.blocks, next.id, () => next) }, coalesce), [commit]);

  const insertBlock = useCallback(
    (type: PageBlockType, index?: number) => {
      const current = designRef.current;
      if (current.blocks.length >= MAX_PAGE_BLOCKS || countBlocks(current.blocks) >= limits.maxElements) return;
      if (BLOCK_BY_TYPE[type].advanced && !limits.advancedElements) return;
      if (isSingleBlock(type) && treeHasType(current.blocks, type)) return;
      const block = createBlock(type);
      const at = index === undefined || index < 0 ? current.blocks.length : index;
      const blocks = [...current.blocks.slice(0, at), block, ...current.blocks.slice(at)];
      commit({ ...current, blocks });
      setSelectedId(block.id);
    },
    [commit, limits],
  );

  const removeBlock = useCallback(
    (id: string) => {
      const current = designRef.current;
      const block = findBlock(current.blocks, id);
      // The registration form is required: it can't be deleted, nor can a columns block that holds it.
      if (!block || containsType(block, "form")) return;
      const parent = findParent(current.blocks, id);
      commit({ ...current, blocks: removeBlockById(current.blocks, id) });
      setSelectedId((s) => (s === id ? (parent?.parent.id ?? null) : s));
    },
    [commit],
  );

  const insertChild = useCallback(
    (columnId: string, type: PageBlockType) => {
      const current = designRef.current;
      if (countBlocks(current.blocks) >= limits.maxElements || type === "columns") return;
      if (BLOCK_BY_TYPE[type].advanced && !limits.advancedElements) return;
      if (isSingleBlock(type) && treeHasType(current.blocks, type)) return;
      const child = createBlock(type);
      commit({ ...current, blocks: insertIntoColumn(current.blocks, columnId, child) });
      setSelectedId(child.id);
    },
    [commit, limits],
  );

  const moveChild = useCallback((id: string, direction: -1 | 1) => commit({ ...designRef.current, blocks: moveInColumn(designRef.current.blocks, id, direction) }), [commit]);

  const duplicateBlock = useCallback(
    (id: string) => {
      const current = designRef.current;
      const index = current.blocks.findIndex((b) => b.id === id);
      const block = current.blocks[index];
      if (!block || isSingleBlock(block.type) || containsType(block, "form") || current.blocks.length >= MAX_PAGE_BLOCKS || countBlocks(current.blocks) + countBlocks([block]) > limits.maxElements) return;
      const copy = cloneWithNewIds(block, blockId);
      commit({ ...current, blocks: [...current.blocks.slice(0, index + 1), copy, ...current.blocks.slice(index + 1)] });
      setSelectedId(copy.id);
    },
    [commit, limits],
  );

  const moveBlock = useCallback(
    (id: string, direction: -1 | 1) => {
      const current = designRef.current;
      const from = current.blocks.findIndex((b) => b.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= current.blocks.length) return;
      commit({ ...current, blocks: arrayMove(current.blocks, from, to) });
    },
    [commit],
  );

  const applyTemplate = useCallback(
    (id: string) => {
      const template = ALL_TEMPLATES.find((t) => t.id === id);
      if (!template || (templateNeedsPaidPlan(template) && !limits.advancedElements)) return;
      commit({ enabled: true, ...template.build() });
      setSelectedId(null);
    },
    [commit, limits],
  );

  const save = useCallback(async (): Promise<boolean> => {
    const current = designRef.current;
    if (!pageDesignSchema.safeParse(current).success || pageDesignPlanIssue(current, limits)) {
      setSaveState({ status: "error", message: "Fix the problems listed in the panel before saving." });
      return false;
    }
    setSaveState({ status: "saving" });
    try {
      const res = await fetch(`/api/webinars/${webinarId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: { registration: { ...registrationRef.current, page: current } }, baseVersion: versionRef.current }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveState({ status: "error", message: res.status === 409 ? "This webinar was changed somewhere else. Reload the page to get the latest version, then redo your changes." : (data.error ?? "Couldn't save. Please try again.") });
        return false;
      }
      versionRef.current = data.config.version;
      registrationRef.current = data.config.registration;
      if (designRef.current === current) setDirty(false);
      setSaveState({ status: "saved" });
      return true;
    } catch {
      setSaveState({ status: "error", message: "You appear to be offline. Your changes are still here; try saving again." });
      return false;
    }
  }, [webinarId, limits]);

  const openPreview = useCallback(
    async (device: (typeof DEVICES)[number]["id"]) => {
      if (dirty && !(await save())) return;
      setPreview({ device, nonce: Date.now() });
    },
    [dirty, save],
  );

  // Keyboard: undo/redo, delete the selected block. Ignored while typing in a field.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
        return;
      }
      if (typing) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      } else if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault();
        removeBlock(selectedId);
      } else if (event.key === "Escape") {
        if (preview) setPreview(null);
        else setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview, redo, removeBlock, save, selectedId, undo]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /* drag and drop */
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const sidebarLayout = design.layout === "sidebar";
  const sortableIds = design.blocks.filter((b) => !(sidebarLayout && b.type === "form")).map((b) => b.id);

  const onDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { from?: string; type?: PageBlockType } | undefined;
    if (data?.from === "palette" && data.type) setDragging({ label: BLOCK_BY_TYPE[data.type].label, fromPalette: true });
    else {
      const block = designRef.current.blocks.find((b) => b.id === event.active.id);
      setDragging({ label: block ? BLOCK_BY_TYPE[block.type].label : "Block", fromPalette: false });
    }
  };
  const onDragOver = (event: DragOverEvent) => setOverId(event.over ? String(event.over.id) : null);
  const onDragEnd = (event: DragEndEvent) => {
    const fromPalette = (event.active.data.current as { from?: string } | undefined)?.from === "palette";
    setDragging(null);
    setOverId(null);
    const over = event.over ? String(event.over.id) : null;
    if (!over) return;
    const current = designRef.current;
    if (fromPalette) {
      const type = (event.active.data.current as { type: PageBlockType }).type;
      insertBlock(type, over === "canvas-end" ? undefined : current.blocks.findIndex((b) => b.id === over));
      return;
    }
    const from = current.blocks.findIndex((b) => b.id === event.active.id);
    const to = over === "canvas-end" ? current.blocks.length - 1 : current.blocks.findIndex((b) => b.id === over);
    if (from < 0 || to < 0 || from === to) return;
    commit({ ...current, blocks: arrayMove(current.blocks, from, to) });
  };

  const ctx = { view, theme: design.theme, mode: "builder" as const, preview: true, source: "hosted" as const };
  const tools: ColumnTools = {
    limits,
    isPlaced: (type) => treeHasType(design.blocks, type),
    full: total >= limits.maxElements,
    select: (id) => setSelectedId(id),
    add: insertChild,
    move: moveChild,
    moveTo: (id, columnId, index) => commit({ ...designRef.current, blocks: moveToColumn(designRef.current.blocks, id, columnId, index, MAX_NESTED_BLOCKS) }),
    remove: removeBlock,
    resize: (count) => selected && commit({ ...designRef.current, blocks: mapBlock(designRef.current.blocks, selected.id, (b) => resizeColumns(b, count, blockId)) }),
  };
  const selectedParent = selected ? findParent(design.blocks, selected.id) : null;
  const previewUrl = slug ? `/w/${slug}${isDraft ? "?preview=1" : ""}` : null;
  const activeDevice = DEVICES.find((d) => d.id === preview?.device);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => (setDragging(null), setOverId(null))}>
      <div className="flex h-screen flex-col bg-[#EEF2F7] text-primaryText" data-testid="page-builder">
        {/* top bar */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-white px-3">
          <Link href={`/dashboard/webinars/${webinarId}/setup?section=registration`} className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-medium text-[#17294B] hover:bg-[#EEF5FF]">
            <ArrowLeft className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Back to webinar</span>
          </Link>
          <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="truncate text-[11px] text-secondaryText">Landing page designer{design.enabled ? "" : " · standard layout is live"}</p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Undo" disabled={!history.past} onClick={undo} className="rounded-xl p-2 text-[#17294B] hover:bg-[#EEF5FF] disabled:opacity-30">
              <Undo2 className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Redo" disabled={!history.future} onClick={redo} className="rounded-xl p-2 text-[#17294B] hover:bg-[#EEF5FF] disabled:opacity-30">
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
          {previewUrl && (
            <div className="hidden items-center gap-0.5 rounded-xl border border-border p-0.5 md:flex" role="group" aria-label="Preview on a device">
              {DEVICES.map((device) => (
                <button key={device.id} type="button" title={`Preview on ${device.label.toLowerCase()}`} aria-label={`Preview on ${device.label.toLowerCase()}`} onClick={() => void openPreview(device.id)} className="rounded-lg p-1.5 text-[#17294B] hover:bg-[#EEF5FF]">
                  <device.icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          )}
          <span className="hidden min-w-[5.5rem] text-right text-xs text-secondaryText lg:block" role="status">
            {saveState.status === "saving" ? "Saving…" : saveState.status === "saved" && !dirty ? "All changes saved" : dirty ? "Unsaved changes" : ""}
          </span>
          <Button type="button" size="sm" onClick={() => void save()} disabled={saveState.status === "saving" || !dirty}>
            {saveState.status === "saving" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : <Check className="mr-1.5 h-4 w-4" aria-hidden />}
            Save
          </Button>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* side panel */}
          <aside className="flex w-[19.5rem] shrink-0 flex-col border-r border-border bg-white" aria-label="Designer panel">
            {selected ? (
              <>
                <div className="flex items-center gap-2 border-b border-border px-3 py-3">
                  <button type="button" onClick={() => setSelectedId(selectedParent?.parent.id ?? null)} aria-label={selectedParent ? "Back to columns" : "Back to blocks"} className="rounded-lg p-1.5 text-[#17294B] hover:bg-[#EEF5FF]">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <p className="flex-1 text-sm font-semibold">Edit {BLOCK_BY_TYPE[selected.type].label.toLowerCase()}</p>
                  {!containsType(selected, "form") && (
                    <button type="button" onClick={() => removeBlock(selected.id)} aria-label="Delete this block" className="rounded-lg p-1.5 text-[#B33A3A] hover:bg-[#FFF6F6]">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <BlockSettings key={selected.id} block={selected} view={view} onChange={updateBlock} tools={tools} />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 border-b border-border p-2" role="tablist">
                  {(["blocks", "page"] as const).map((key) => (
                    <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={cn("rounded-lg px-3 py-2 text-sm font-medium", tab === key ? "bg-[#EEF5FF] text-[#17294B]" : "text-secondaryText hover:text-primaryText")}>
                      {key === "blocks" ? "Blocks" : "Page"}
                    </button>
                  ))}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {tab === "blocks" ? (
                    <div className="space-y-4 p-4">
                      <p className="text-xs text-secondaryText">Drag a block onto the page, or click it to add it at the end. Click any block on the page to edit it.</p>
                      <div className="space-y-4" data-testid="block-palette">
                        {(["Basics", "Content", "Social proof", "Layout"] as const).map((group) => (
                          <div key={group}>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-secondaryText">{group}</p>
                            <div className="grid grid-cols-2 gap-2">
                              {BLOCK_DEFINITIONS.filter((d) => d.group === group).map((definition) => (
                                <PaletteItem
                                  key={definition.type}
                                  type={definition.type}
                                  locked={Boolean(definition.advanced) && !limits.advancedElements}
                                  disabled={design.blocks.length >= MAX_PAGE_BLOCKS || total >= limits.maxElements || (Boolean(definition.single) && treeHasType(design.blocks, definition.type))}
                                  onAdd={() => insertBlock(definition.type)}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                        <p className="text-xs text-secondaryText" data-testid="element-count">{total} of {limits.maxElements} elements used on this plan.</p>
                      </div>
                      {!startedFromSaved && history.past === 0 && <Notice>This is a starting layout. It goes live for this webinar when you save.</Notice>}
                    </div>
                  ) : (
                    <PageSettings design={design} onChange={commit} onTemplate={applyTemplate} limits={limits} />
                  )}
                </div>
              </>
            )}
            {(problems.length > 0 || saveState.status === "error") && (
              <div className="space-y-2 border-t border-border p-3">
                {saveState.status === "error" && <Notice tone="error">{saveState.message}</Notice>}
                {problems.map((problem) => (
                  <Notice key={problem} tone="warning">
                    {problem}
                  </Notice>
                ))}
              </div>
            )}
          </aside>

          {/* canvas */}
          <div className="min-w-0 flex-1 overflow-y-auto" onClick={() => setSelectedId(null)} data-testid="builder-canvas">
            <div className="light-scope min-h-full px-4 py-8 md:px-6" style={pageThemeStyle(design.theme)}>
              {!design.enabled && (
                <div className="mx-auto mb-5 max-w-6xl">
                  <Notice tone="warning">The standard layout is live. Turn on &ldquo;Use this design on the live page&rdquo; in the Page tab to publish this design.</Notice>
                </div>
              )}
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                <PageBlocksLayout
                  design={design}
                  renderBlock={(block) => {
                    const index = design.blocks.findIndex((b) => b.id === block.id);
                    const pinned = sidebarLayout && block.type === "form";
                    return (
                      <CanvasBlock
                        key={block.id}
                        block={block}
                        selected={block.id === selectedId}
                        sortable={!pinned}
                        dropBefore={Boolean(dragging?.fromPalette) && overId === block.id}
                        onSelect={() => setSelectedId(block.id)}
                        onMove={(direction) => moveBlock(block.id, direction)}
                        onDuplicate={isSingleBlock(block.type) ? null : () => duplicateBlock(block.id)}
                        onRemove={block.type === "form" ? null : () => removeBlock(block.id)}
                        canMoveUp={!pinned && index > 0}
                        canMoveDown={!pinned && index < design.blocks.length - 1}
                      >
                        <PageBlockView block={block} ctx={ctx} />
                      </CanvasBlock>
                    );
                  }}
                />
              </SortableContext>
              <div className={cn("mx-auto", design.theme.maxWidth === "md" && design.layout === "stacked" ? "max-w-3xl" : design.theme.maxWidth === "xl" ? "max-w-7xl" : "max-w-6xl")}>
                <CanvasEnd active={Boolean(dragging)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-[#16D6B2] bg-white px-3 py-2 text-sm font-medium text-[#17294B] shadow-[0_16px_40px_rgba(4,27,94,0.25)]">
            <LayoutTemplate className="h-4 w-4" aria-hidden /> {dragging.label}
          </div>
        )}
      </DragOverlay>

      {/* device preview of the saved page */}
      {preview && previewUrl && activeDevice && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0B1430]/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Page preview" data-testid="device-preview">
          <div className="flex h-14 shrink-0 items-center justify-between gap-3 px-4 text-white">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Eye className="h-4 w-4" aria-hidden /> Preview of the saved page
            </p>
            <div className="flex items-center gap-1 rounded-xl bg-white/10 p-1">
              {DEVICES.map((device) => (
                <button key={device.id} type="button" aria-pressed={preview.device === device.id} onClick={() => setPreview({ ...preview, device: device.id })} className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium", preview.device === device.id ? "bg-white text-[#17294B]" : "text-white/80 hover:text-white")}>
                  <device.icon className="h-3.5 w-3.5" aria-hidden /> {device.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <a href={previewUrl} target="_blank" rel="noopener" className="rounded-lg px-2 py-1.5 text-xs font-medium text-white/80 hover:text-white">
                Open in a new tab
              </a>
              <button type="button" onClick={() => setPreview(null)} aria-label="Close preview" className="rounded-lg p-2 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 justify-center overflow-auto px-4 pb-6">
            <iframe key={preview.nonce} src={previewUrl} title="Landing page preview" className="h-full rounded-2xl border-4 border-white/20 bg-white shadow-2xl transition-[width] duration-300" style={{ width: activeDevice.width, maxWidth: "100%" }} />
          </div>
        </div>
      )}
    </DndContext>
  );
}
