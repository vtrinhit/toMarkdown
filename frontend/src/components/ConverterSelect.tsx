import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/stores/app";
import { converterApi } from "@/lib/api";
import type { ConverterType } from "@/types";

const converterColors: Record<string, string> = {
  markitdown: "bg-blue-500",
  docling: "bg-purple-500",
  marker: "bg-green-500",
  pypandoc: "bg-orange-500",
  unstructured: "bg-pink-500",
  mammoth: "bg-yellow-500",
  html2text: "bg-cyan-500",
  auto: "bg-gradient-to-r from-indigo-500 to-purple-500",
};

export function ConverterSelect() {
  const { selectedConverter, setSelectedConverter } = useAppStore();

  const { data: converters } = useQuery({
    queryKey: ["converters"],
    queryFn: converterApi.getConverters,
  });

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Conversion Library</label>
      <Select
        value={selectedConverter}
        onValueChange={(value: ConverterType) => setSelectedConverter(value)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select converter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${converterColors.auto}`} />
              <div>
                <span className="font-medium">Auto Select</span>
                <span className="text-muted-foreground ml-2 text-xs">
                  Best converter for each file
                </span>
              </div>
            </div>
          </SelectItem>
          {converters?.map((converter) => (
            <SelectItem key={converter.id} value={converter.id}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    converterColors[converter.id] || "bg-gray-500"
                  }`}
                />
                <div className="flex flex-col">
                  <span className="font-medium">{converter.name}</span>
                  <span className="text-muted-foreground text-xs line-clamp-1 max-w-[300px]">
                    {converter.description}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Converter Description */}
      {selectedConverter !== "auto" && converters && (
        <p className="text-xs text-muted-foreground">
          {converters.find((c) => c.id === selectedConverter)?.description}
        </p>
      )}
    </div>
  );
}
