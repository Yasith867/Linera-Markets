import { Layout } from "@/components/layout";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertMarketSchema } from "@shared/schema";
import { useCreateMarket } from "@/hooks/use-markets";
import { CalendarIcon, Plus, Trash2, Rocket, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { clsx } from "clsx";
import { useMockMode } from "@/lib/linera";

type FormValues = z.infer<typeof insertMarketSchema>;

export default function CreateMarket() {
  const [, setLocation] = useLocation();
  const createMarketMutation = useCreateMarket();
  
  const { identity } = useMockMode();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(insertMarketSchema),
    defaultValues: {
      question: "",
      creatorId: identity || "mock-user",
      options: ["Yes", "No"],
      closeTime: new Date(Date.now() + 86400000), // 24h from now
      category: "Cricket",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options" as never, // Type hack for string array
  });

  const onSubmit = (data: FormValues) => {
    createMarketMutation.mutate(data, {
      onSuccess: (market) => {
        setLocation(`/markets/${market.id}`);
      },
      onError: (error: any) => {
        console.error("Market creation error:", error);
      }
    });
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto animate-enter">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-gradient">Create Market</h1>
          <p className="text-muted-foreground mt-2">Launch a new prediction market on the network.</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Question Section */}
          <div className="bg-card border border-white/5 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">1</span>
              Market Question
            </h3>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">What do you want to predict?</label>
              <textarea
                {...form.register("question")}
                placeholder="e.g., Will Bitcoin hit $100k by 2025?"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none h-24"
              />
              {form.formState.errors.question && (
                <p className="text-sm text-red-400">{form.formState.errors.question.message}</p>
              )}
            </div>
          </div>

          {/* Options Section */}
          <div className="bg-card border border-white/5 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs">2</span>
              Prediction Options
            </h3>
            
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      {...form.register(`options.${index}` as const)}
                      placeholder={`Option ${index + 1}`}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    />
                  </div>
                  {fields.length > 2 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => append("")}
                className="flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1"
              >
                <Plus className="w-4 h-4" />
                Add Another Option
              </button>
              
              {form.formState.errors.options && (
                <p className="text-sm text-red-400">{form.formState.errors.options.message}</p>
              )}
            </div>
          </div>

          {/* Settings Section */}
          <div className="bg-card border border-white/5 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs">3</span>
              Market Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Close Time</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="datetime-local"
                    {...form.register("closeTime")}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                  />
                </div>
                {form.formState.errors.closeTime && (
                  <p className="text-sm text-red-400">{form.formState.errors.closeTime.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={createMarketMutation.isPending}
              className="group relative px-8 py-4 bg-gradient-to-r from-emerald-500 to-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <div className="relative flex items-center gap-2">
                {createMarketMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Market...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    Launch Market
                  </>
                )}
              </div>
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
