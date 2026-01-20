import { useQuery } from "@tanstack/react-query";
import { RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore, FILE_EXTENSIONS } from "@/stores/app";
import { converterApi } from "@/lib/api";
import type { ConverterType } from "@/types";

const converterColors: Record<string, string> = {
  auto: "bg-gray-500",
  markitdown: "bg-blue-500",
  docling: "bg-purple-500",
  marker: "bg-green-500",
  pypandoc: "bg-orange-500",
  unstructured: "bg-pink-500",
  mammoth: "bg-yellow-500",
  html2text: "bg-cyan-500",
};

const categoryLabels: Record<string, string> = {
  documents: "Documents",
  web: "Web & Data",
  images: "Images",
  audio: "Audio",
  code: "Code & Markup",
  ebooks: "E-books",
  other: "Other",
};

interface ExtensionRowProps {
  ext: string;
  selectedConverter: ConverterType | "auto";
  converters: { id: string; name: string }[];
  onSelect: (converter: ConverterType | "auto") => void;
}

function ExtensionRow({ ext, selectedConverter, converters, onSelect }: ExtensionRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs sm:text-sm bg-muted px-1.5 py-0.5 rounded uppercase">
          .{ext}
        </span>
      </div>
      <Select value={selectedConverter} onValueChange={(v) => onSelect(v as ConverterType | "auto")}>
        <SelectTrigger className="w-[120px] sm:w-[140px] h-7 text-xs">
          <SelectValue>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${converterColors[selectedConverter]}`} />
              <span className="truncate">
                {selectedConverter === "auto" ? "Auto" : converters.find(c => c.id === selectedConverter)?.name || selectedConverter}
              </span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${converterColors.auto}`} />
              Auto Select
            </div>
          </SelectItem>
          {converters.map((converter) => (
            <SelectItem key={converter.id} value={converter.id}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${converterColors[converter.id] || "bg-gray-400"}`} />
                {converter.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface CategorySectionProps {
  category: string;
  extensions: readonly string[];
  converters: { id: string; name: string }[];
  fileConverterMapping: Record<string, ConverterType | "auto">;
  onSelect: (ext: string, converter: ConverterType | "auto") => void;
}

function CategorySection({
  category,
  extensions,
  converters,
  fileConverterMapping,
  onSelect,
}: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Count non-auto settings in this category
  const customCount = extensions.filter(
    (ext) => fileConverterMapping[ext] && fileConverterMapping[ext] !== "auto"
  ).length;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 sm:p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{categoryLabels[category]}</span>
          {customCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
              {customCount} custom
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isExpanded && (
        <div className="p-2 space-y-0.5">
          {extensions.map((ext) => (
            <ExtensionRow
              key={ext}
              ext={ext}
              selectedConverter={fileConverterMapping[ext] || "auto"}
              converters={converters}
              onSelect={(converter) => onSelect(ext, converter)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CustomConverterSettings() {
  const {
    fileConverterMapping,
    setFileConverterMapping,
    resetFileConverterMapping,
  } = useAppStore();

  const { data: converters = [] } = useQuery({
    queryKey: ["converters"],
    queryFn: converterApi.getConverters,
  });

  const converterList = converters.map((c) => ({ id: c.id, name: c.name }));

  // Count total custom settings
  const totalCustom = Object.values(fileConverterMapping).filter(
    (v) => v && v !== "auto"
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">File Type Settings</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure converter for each file type
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={resetFileConverterMapping}
          disabled={totalCustom === 0}
          className="h-7 text-xs gap-1.5"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </div>

      {totalCustom > 0 && (
        <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded">
          {totalCustom} file type(s) with custom converter settings
        </div>
      )}

      <ScrollArea className="h-[250px] pr-2">
        <div className="space-y-2">
          {Object.entries(FILE_EXTENSIONS).map(([category, extensions]) => (
            <CategorySection
              key={category}
              category={category}
              extensions={extensions}
              converters={converterList}
              fileConverterMapping={fileConverterMapping}
              onSelect={setFileConverterMapping}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
