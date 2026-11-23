import type { FilterPatch } from '../domain/filters';

/**
 * Turns free text into structured filters. Returns null when nothing structured was found,
 * so the UI can stay silent. A model-backed implementation could replace the rule-based one;
 * its output must still go through the same FilterState validation (the URL codec).
 */
export interface QueryInterpreter {
  interpret(text: string): FilterPatch | null;
}
