import { useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical, Eye, EyeOff, Trash2, Copy, ChevronDown, ChevronRight, Plus,
} from "lucide-react";
import { CitySection, SectionType, SECTION_LABELS, newSection } from "@/lib/citySections";
import RichTextEditor from "@/components/admin/RichTextEditor";
import ImageUpload from "@/components/admin/ImageUpload";

type Props = {
  value: CitySection[];
  onChange: (next: CitySection[]) => void;
};

export default function SectionBuilder({ value, onChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = value.findIndex((s) => s.id === active.id);
    const newIndex = value.findIndex((s) => s.id === over.id);
    onChange(arrayMove(value, oldIndex, newIndex));
  };

  const update = (id: string, patch: Partial<CitySection>) =>
    onChange(value.map((s) => (s.id === id ? ({ ...s, ...patch } as CitySection) : s)));

  const updateSettings = (id: string, settingsPatch: any) =>
    onChange(value.map((s) => (s.id === id ? ({ ...s, settings: { ...s.settings, ...settingsPatch } } as CitySection) : s)));

  const remove = (id: string) => onChange(value.filter((s) => s.id !== id));
  const duplicate = (id: string) => {
    const i = value.findIndex((s) => s.id === id);
    if (i < 0) return;
    const orig = value[i];
    const copy = { ...orig, id: crypto.randomUUID(), settings: { ...orig.settings } } as CitySection;
    const next = [...value]; next.splice(i + 1, 0, copy);
    onChange(next);
  };
  const add = (type: SectionType) => onChange([...value, newSection(type)]);

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={value.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {value.map((s) => (
            <SortableCard
              key={s.id}
              section={s}
              onToggle={() => update(s.id, { enabled: !s.enabled })}
              onRemove={() => remove(s.id)}
              onDuplicate={() => duplicate(s.id)}
              onSettings={(p) => updateSettings(s.id, p)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {value.length === 0 && (
        <div className="border hairline border-dashed px-6 py-10 text-center text-ink-muted text-[12px]">
          No sections yet. Add your first block below — public page will use the default layout until you do.
        </div>
      )}

      <AddSectionMenu onAdd={add} />
    </div>
  );
}

function SortableCard({
  section, onToggle, onRemove, onDuplicate, onSettings,
}: {
  section: CitySection;
  onToggle: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onSettings: (patch: any) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const [open, setOpen] = useState(false);
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={`border hairline bg-background ${section.enabled ? "" : "opacity-60"}`}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button {...attributes} {...listeners} className="text-ink-faint hover:text-ink cursor-grab active:cursor-grabbing" title="Drag to reorder">
          <GripVertical className="w-4 h-4" />
        </button>
        <button onClick={() => setOpen((v) => !v)} className="text-ink-muted hover:text-ink">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <span className="text-[10px] tracking-tag uppercase text-ink-muted">{SECTION_LABELS[section.type]}</span>
        <span className="text-[12px] text-ink truncate ml-2">{labelFor(section)}</span>
        <span className="flex-1" />
        <button onClick={onToggle} title={section.enabled ? "Disable" : "Enable"} className="text-ink-muted hover:text-ink p-1.5">
          {section.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
        <button onClick={onDuplicate} title="Duplicate" className="text-ink-muted hover:text-ink p-1.5">
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button onClick={onRemove} title="Delete" className="text-ink-muted hover:text-destructive p-1.5">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && (
        <div className="border-t hairline px-4 py-4 space-y-4">
          <SectionSettings section={section} onChange={onSettings} />
        </div>
      )}
    </div>
  );
}

function labelFor(s: CitySection) {
  switch (s.type) {
    case "rich_text": return s.settings.heading || "Untitled text";
    case "projects":  return `${s.settings.heading || "Projects"} · ${s.settings.limit} items${s.settings.featuredOnly ? " · featured" : ""}`;
    case "journal":   return `${s.settings.heading || "Practice"} · ${s.settings.limit} posts`;
    case "gallery":   return `${s.settings.images?.length || 0} images · ${s.settings.columns} cols`;
    case "spacer":    return `${s.settings.height}px`;
  }
}

function SectionSettings({ section, onChange }: { section: CitySection; onChange: (p: any) => void }) {
  const lab = "block text-[10px] tracking-tag uppercase text-ink-muted mb-1.5";
  const inp = "w-full bg-background border hairline px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-ink";

  if (section.type === "rich_text") {
    return (
      <>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lab}>Eyebrow</label><input className={inp} value={section.settings.eyebrow || ""} onChange={(e) => onChange({ eyebrow: e.target.value })} /></div>
          <div><label className={lab}>Heading</label><input className={inp} value={section.settings.heading || ""} onChange={(e) => onChange({ heading: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lab}>Background</label>
            <select className={inp} value={section.settings.background || "warm"} onChange={(e) => onChange({ background: e.target.value })}>
              <option value="paper">White</option><option value="warm">Warm white</option><option value="mid">Stone</option>
            </select>
          </div>
          <div>
            <label className={lab}>Alignment</label>
            <select className={inp} value={section.settings.align || "left"} onChange={(e) => onChange({ align: e.target.value })}>
              <option value="left">Left</option><option value="center">Center</option>
            </select>
          </div>
        </div>
        <div>
          <label className={lab}>Content</label>
          <RichTextEditor value={section.settings.html} onChange={(html) => onChange({ html })} placeholder="Write the content of this block…" />
        </div>
      </>
    );
  }

  if (section.type === "projects") {
    return (
      <>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lab}>Eyebrow</label><input className={inp} value={section.settings.eyebrow || ""} onChange={(e) => onChange({ eyebrow: e.target.value })} /></div>
          <div><label className={lab}>Heading</label><input className={inp} value={section.settings.heading || ""} onChange={(e) => onChange({ heading: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className={lab}>Limit</label><input type="number" min={1} max={24} className={inp} value={section.settings.limit} onChange={(e) => onChange({ limit: parseInt(e.target.value || "6", 10) })} /></div>
          <div><label className={lab}>Category filter</label><input className={inp} value={section.settings.category || ""} onChange={(e) => onChange({ category: e.target.value })} placeholder="any" /></div>
          <div><label className={lab}>Style filter</label><input className={inp} value={section.settings.style || ""} onChange={(e) => onChange({ style: e.target.value })} placeholder="any" /></div>
        </div>
        <label className="inline-flex items-center gap-2 text-[12px] text-ink">
          <input type="checkbox" checked={section.settings.featuredOnly} onChange={(e) => onChange({ featuredOnly: e.target.checked })} />
          Featured only
        </label>
      </>
    );
  }

  if (section.type === "journal") {
    return (
      <>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lab}>Eyebrow</label><input className={inp} value={section.settings.eyebrow || ""} onChange={(e) => onChange({ eyebrow: e.target.value })} /></div>
          <div><label className={lab}>Heading</label><input className={inp} value={section.settings.heading || ""} onChange={(e) => onChange({ heading: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lab}>Limit</label><input type="number" min={1} max={12} className={inp} value={section.settings.limit} onChange={(e) => onChange({ limit: parseInt(e.target.value || "3", 10) })} /></div>
          <div><label className={lab}>Category filter</label><input className={inp} value={section.settings.category || ""} onChange={(e) => onChange({ category: e.target.value })} placeholder="any" /></div>
        </div>
        <label className="inline-flex items-center gap-2 text-[12px] text-ink">
          <input type="checkbox" checked={section.settings.onlyTaggedWithCity} onChange={(e) => onChange({ onlyTaggedWithCity: e.target.checked })} />
          Only show entries tagged with this city
        </label>
      </>
    );
  }

  if (section.type === "gallery") {
    const imgs = section.settings.images || [];
    return (
      <>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lab}>Heading</label><input className={inp} value={section.settings.heading || ""} onChange={(e) => onChange({ heading: e.target.value })} /></div>
          <div>
            <label className={lab}>Columns</label>
            <select className={inp} value={section.settings.columns} onChange={(e) => onChange({ columns: parseInt(e.target.value, 10) })}>
              <option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
            </select>
          </div>
        </div>
        <div className="space-y-3">
          {imgs.map((url, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-16 h-16 bg-stone overflow-hidden flex-shrink-0">
                {url && <img src={url} alt="" className="w-full h-full object-cover" />}
              </div>
              <input className={`${inp} flex-1`} value={url} onChange={(e) => {
                const next = [...imgs]; next[i] = e.target.value; onChange({ images: next });
              }} placeholder="Image URL" />
              <button onClick={() => onChange({ images: imgs.filter((_, j) => j !== i) })} className="text-ink-muted hover:text-destructive p-2">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <ImageUpload label="Add image" value={null} onChange={(url) => url && onChange({ images: [...imgs, url] })} folder="cities" />
        </div>
      </>
    );
  }

  if (section.type === "spacer") {
    return (
      <div>
        <label className={lab}>Height — {section.settings.height}px</label>
        <input type="range" min={20} max={240} step={10} value={section.settings.height} onChange={(e) => onChange({ height: parseInt(e.target.value, 10) })} className="w-full" />
      </div>
    );
  }

  return null;
}

function AddSectionMenu({ onAdd }: { onAdd: (t: SectionType) => void }) {
  const [open, setOpen] = useState(false);
  const types: SectionType[] = ["rich_text", "projects", "journal", "gallery", "spacer"];
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full border hairline border-dashed px-4 py-3 text-[11px] tracking-tag uppercase text-ink-muted hover:text-ink hover:border-ink inline-flex items-center justify-center gap-2">
        <Plus className="w-3.5 h-3.5" /> Add section
      </button>
      {open && (
        <div className="absolute z-10 left-0 right-0 mt-1 border hairline bg-background shadow-sm">
          {types.map((t) => (
            <button key={t} onClick={() => { onAdd(t); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-[12px] text-ink hover:bg-off-white">
              {SECTION_LABELS[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
