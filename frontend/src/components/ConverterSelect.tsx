import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info, Check, Circle, AlertCircle, Settings2, ChevronDown, ChevronUp } from "lucide-react";
import { useAppStore } from "@/stores/app";
import { converterApi } from "@/lib/api";
import type { ConverterInfo } from "@/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CustomConverterSettings } from "@/components/CustomConverterSettings";
import { motion, AnimatePresence } from "framer-motion";

const converterColors: Record<string, string> = {
  markitdown: "bg-blue-500",
  docling: "bg-purple-500",
  marker: "bg-green-500",
  pypandoc: "bg-orange-500",
  unstructured: "bg-pink-500",
  mammoth: "bg-yellow-500",
  html2text: "bg-cyan-500",
  auto: "bg-gradient-to-r from-indigo-500 to-purple-500",
  custom: "bg-gradient-to-r from-amber-500 to-orange-500",
};

const converterBorderColors: Record<string, string> = {
  markitdown: "border-blue-500",
  docling: "border-purple-500",
  marker: "border-green-500",
  pypandoc: "border-orange-500",
  unstructured: "border-pink-500",
  mammoth: "border-yellow-500",
  html2text: "border-cyan-500",
  auto: "border-indigo-500",
  custom: "border-amber-500",
};

// File format info for each converter
const converterFileInfo: Record<string, string[]> = {
  markitdown: [
    "PDF", "DOCX", "DOC", "PPTX", "PPT", "XLSX", "XLS",
    "HTML", "CSV", "JSON", "XML", "TXT",
    "PNG", "JPG", "JPEG", "GIF", "WEBP", "TIFF", "HEIC",
    "MP3", "WAV", "M4A", "OGG", "FLAC", "ZIP"
  ],
  docling: [
    "PDF", "DOCX", "PPTX", "XLSX", "HTML", "HTM",
    "PNG", "JPG", "JPEG", "TIFF", "BMP"
  ],
  marker: ["PDF"],
  pypandoc: [
    "PDF", "DOCX", "DOC", "ODT", "RTF", "EPUB",
    "HTML", "HTM", "TEX", "LATEX", "RST", "ORG",
    "TEXTILE", "MEDIAWIKI", "JSON", "IPYNB"
  ],
  unstructured: [
    "PDF", "DOCX", "DOC", "PPTX", "PPT", "XLSX", "XLS",
    "HTML", "HTM", "EML", "MSG", "EPUB", "RTF", "TXT",
    "CSV", "TSV", "XML", "ODT", "RST",
    "PNG", "JPG", "JPEG", "TIFF", "BMP", "HEIC"
  ],
  mammoth: ["DOCX"],
  html2text: ["HTML", "HTM", "XHTML", "XML"],
  auto: ["All formats (auto-selects best converter)"],
};

interface ConverterItemProps {
  converter: ConverterInfo | { id: "auto" | "custom"; name: string; description: string };
  isSelected: boolean;
  onSelect: () => void;
  showExpandButton?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  customCount?: number;
}

function ConverterItem({
  converter,
  isSelected,
  onSelect,
  showExpandButton,
  isExpanded,
  onToggleExpand,
  customCount,
}: ConverterItemProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const isAuto = converter.id === "auto";
  const isCustom = converter.id === "custom";
  const fileFormats = converterFileInfo[converter.id] || [];

  return (
    <div
      onClick={onSelect}
      className={`relative flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected
          ? `${converterBorderColors[converter.id]} bg-primary/5`
          : "border-border hover:border-muted-foreground/50 hover:bg-muted/50"
      }`}
    >
      {/* Radio indicator */}
      <div className="flex-shrink-0 mt-0.5">
        {isSelected ? (
          <div className={`w-5 h-5 rounded-full ${converterColors[converter.id]} flex items-center justify-center`}>
            <Check className="h-3 w-3 text-white" />
          </div>
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{converter.name}</span>
          {!isAuto && !isCustom && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-600 dark:text-green-400 font-medium">
              Active
            </span>
          )}
          {isCustom && customCount !== undefined && customCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium">
              {customCount} rules
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {converter.description}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Expand button for custom settings */}
        {showExpandButton && isSelected && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.();
            }}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Info button */}
        {!isCustom && (
          <Popover open={infoOpen} onOpenChange={setInfoOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setInfoOpen(!infoOpen);
                }}
              >
                <Info className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-72 p-3"
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${converterColors[converter.id]}`} />
                  <h4 className="font-semibold text-sm">{converter.name}</h4>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Supported file formats:</p>
                  <div className="flex flex-wrap gap-1">
                    {fileFormats.map((format) => (
                      <span
                        key={format}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono"
                      >
                        {format}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Settings icon for custom */}
        {isCustom && (
          <Settings2 className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

export function ConverterSelect() {
  const {
    selectedConverter,
    setSelectedConverter,
    fileConverterMapping,
    customSettingsOpen,
    setCustomSettingsOpen,
  } = useAppStore();

  const { data: converters, isLoading, error } = useQuery({
    queryKey: ["converters"],
    queryFn: converterApi.getConverters,
  });

  // Count custom mappings
  const customCount = Object.values(fileConverterMapping).filter(
    (v) => v && v !== "auto"
  ).length;

  if (error) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">Conversion Library</label>
        <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          Failed to load converters
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Conversion Library</label>
      <ScrollArea className="h-[320px] pr-3">
        <div className="space-y-2">
          {/* Auto Select Option */}
          <ConverterItem
            converter={{
              id: "auto",
              name: "Auto Select",
              description: "Automatically chooses the best converter for each file type",
            }}
            isSelected={selectedConverter === "auto"}
            onSelect={() => setSelectedConverter("auto")}
          />

          {/* Custom Settings Option */}
          <div>
            <ConverterItem
              converter={{
                id: "custom",
                name: "Custom Settings",
                description: "Configure which converter to use for each file type",
              }}
              isSelected={selectedConverter === "custom"}
              onSelect={() => {
                setSelectedConverter("custom");
                if (selectedConverter !== "custom") {
                  setCustomSettingsOpen(true);
                }
              }}
              showExpandButton={true}
              isExpanded={customSettingsOpen}
              onToggleExpand={() => setCustomSettingsOpen(!customSettingsOpen)}
              customCount={customCount}
            />

            {/* Custom Settings Panel */}
            <AnimatePresence>
              {selectedConverter === "custom" && customSettingsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 p-3 rounded-lg border-2 border-amber-500/30 bg-amber-500/5">
                    <CustomConverterSettings />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Loading skeleton */}
          {isLoading && (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[72px] rounded-lg border-2 border-border bg-muted/30 animate-pulse" />
              ))}
            </>
          )}

          {/* Converter options */}
          {converters?.map((converter) => (
            <ConverterItem
              key={converter.id}
              converter={converter}
              isSelected={selectedConverter === converter.id}
              onSelect={() => setSelectedConverter(converter.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
