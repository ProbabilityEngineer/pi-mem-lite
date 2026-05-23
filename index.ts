import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const ACTIONS = ["list", "search", "review", "remember", "propose", "approve", "update", "forget"] as const;
const KINDS = ["preference", "project", "lesson", "reference"] as const;
const SCOPES = ["global", "project"] as const;
const MEMORY_PROMPT_SNIPPET =
	"Memory routing: use memory for explicit durable preferences/lessons; propose inferred memories instead of silently saving them.";
const MEMORY_GUIDELINES = [
	"Use memory remember only when the user explicitly asks to remember something; use memory propose for inferred durable preferences or lessons; use memory review to inspect pending candidates.",
	"Memory is context, not authority; current user instructions and repo evidence override memory.",
];

type MemoryAction = (typeof ACTIONS)[number];
type MemoryKind = (typeof KINDS)[number];
type MemoryScope = (typeof SCOPES)[number];

type MemoryRecord = {
	id: string;
	created: string;
	updated: string;
	kind: MemoryKind;
	scope: MemoryScope;
	project?: string;
	text: string;
	evidence?: string;
	tags: string[];
	pinned: boolean;
};

type Params = {
	action: MemoryAction;
	id?: string;
	query?: string;
	text?: string;
	evidence?: string;
	kind?: MemoryKind;
	scope?: MemoryScope;
	tags?: string;
	pinned?: boolean;
	limit?: number;
};

type ToolCtx = { cwd?: string };

type CommandCtx = ToolCtx & {
	ui: { notify: (message: string, level?: "info" | "warning" | "error") => void };
};

function text(content: string, details: Record<string, unknown> = {}) {
	return { content: [{ type: "text" as const, text: content }], details };
}

function now() {
	return new Date().toISOString();
}

function storeDir() {
	return path.join(os.homedir(), ".pi", "agent", "pi-mem-lite");
}

function memoriesFile() {
	return path.join(storeDir(), "memories.jsonl");
}

function candidatesFile() {
	return path.join(storeDir(), "candidates.jsonl");
}

async function ensureStore() {
	await fs.mkdir(storeDir(), { recursive: true });
	for (const file of [memoriesFile(), candidatesFile()]) {
		try {
			await fs.access(file);
		} catch {
			await fs.writeFile(file, "");
		}
	}
}

async function readJsonl(file: string): Promise<MemoryRecord[]> {
	await ensureStore();
	const raw = await fs.readFile(file, "utf8");
	return raw
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => JSON.parse(line) as MemoryRecord);
}

async function writeJsonl(file: string, records: MemoryRecord[]) {
	await ensureStore();
	const body = records.map((record) => JSON.stringify(record)).join("\n");
	await fs.writeFile(file, body ? `${body}\n` : "");
}

function id(prefix: "mem" | "cand") {
	return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function requireField(value: unknown, name: string) {
	const str = String(value ?? "").trim();
	if (!str) throw new Error(`${name} is required`);
	return str;
}

function tags(value: string | undefined) {
	return (value ?? "")
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
}

function limit(value: unknown) {
	const n = Number(value ?? 20);
	return Math.max(1, Math.min(100, Number.isFinite(n) ? Math.floor(n) : 20));
}

function projectFor(cwd?: string) {
	return cwd ? path.resolve(cwd) : undefined;
}

function secretWarning(s: string) {
	return /(api[_-]?key|secret|token|password|private key|-----BEGIN)/i.test(s);
}

function format(record: MemoryRecord) {
	const tagText = record.tags.length ? ` tags=${record.tags.join(",")}` : "";
	const pin = record.pinned ? " pinned" : "";
	const project = record.scope === "project" && record.project ? ` project=${record.project}` : "";
	return `${record.id} [${record.kind}/${record.scope}${pin}]${tagText}${project}\n${record.text}${record.evidence ? `\nEvidence: ${record.evidence}` : ""}`;
}

function formatList(records: MemoryRecord[], empty: string) {
	return records.length ? records.map(format).join("\n\n---\n") : empty;
}

function searchTerms(query: string) {
	return query
		.toLowerCase()
		.split(/[^a-z0-9_-]+/)
		.map((term) => term.trim())
		.filter(Boolean)
		.map((term) => (term.length >= 5 ? term.slice(0, 5) : term));
}

function matches(record: MemoryRecord, q: string) {
	const haystack = [record.id, record.kind, record.scope, record.text, record.evidence ?? "", record.tags.join(" ")]
		.join("\n")
		.toLowerCase();
	const exact = q.trim().toLowerCase();
	if (exact && haystack.includes(exact)) return true;
	const terms = searchTerms(q);
	return terms.length > 0 && terms.every((term) => haystack.includes(term));
}

function merge(record: MemoryRecord, params: Params) {
	const updated = now();
	return {
		...record,
		updated,
		kind: params.kind ?? record.kind,
		scope: params.scope ?? record.scope,
		text: params.text ?? record.text,
		evidence: params.evidence ?? record.evidence,
		tags: params.tags === undefined ? record.tags : tags(params.tags),
		pinned: params.pinned ?? record.pinned,
	};
}

async function remember(params: Params, cwd?: string, candidate = false) {
	const body = requireField(params.text, "text");
	if (secretWarning(body) || secretWarning(params.evidence ?? "")) {
		throw new Error("Refusing to store likely secret material in memory");
	}
	const created = now();
	const scope = params.scope ?? "global";
	const record: MemoryRecord = {
		id: id(candidate ? "cand" : "mem"),
		created,
		updated: created,
		kind: params.kind ?? "preference",
		scope,
		project: scope === "project" ? projectFor(cwd) : undefined,
		text: body,
		evidence: params.evidence?.trim() || undefined,
		tags: tags(params.tags),
		pinned: params.pinned ?? false,
	};
	const file = candidate ? candidatesFile() : memoriesFile();
	const records = await readJsonl(file);
	records.push(record);
	await writeJsonl(file, records);
	return record;
}

async function approve(params: Params) {
	const target = requireField(params.id, "id");
	const candidates = await readJsonl(candidatesFile());
	const index = candidates.findIndex((record) => record.id === target);
	if (index < 0) throw new Error(`candidate ${target} not found`);
	const candidate = candidates[index];
	const approved = { ...candidate, id: id("mem"), updated: now() };
	const memories = await readJsonl(memoriesFile());
	memories.push(approved);
	candidates.splice(index, 1);
	await writeJsonl(memoriesFile(), memories);
	await writeJsonl(candidatesFile(), candidates);
	return approved;
}

async function update(params: Params) {
	const target = requireField(params.id, "id");
	const file = target.startsWith("cand_") ? candidatesFile() : memoriesFile();
	const records = await readJsonl(file);
	const index = records.findIndex((record) => record.id === target);
	if (index < 0) throw new Error(`memory ${target} not found`);
	const next = merge(records[index], params);
	if (secretWarning(next.text) || secretWarning(next.evidence ?? "")) {
		throw new Error("Refusing to store likely secret material in memory");
	}
	records[index] = next;
	await writeJsonl(file, records);
	return next;
}

async function forget(params: Params) {
	const target = requireField(params.id, "id");
	for (const file of [memoriesFile(), candidatesFile()]) {
		const records = await readJsonl(file);
		const next = records.filter((record) => record.id !== target);
		if (next.length !== records.length) {
			await writeJsonl(file, next);
			return target;
		}
	}
	throw new Error(`memory ${target} not found`);
}

async function execute(params: Params, cwd?: string) {
	if (params.action === "remember") return format(await remember(params, cwd, false));
	if (params.action === "propose") return format(await remember(params, cwd, true));
	if (params.action === "approve") return format(await approve(params));
	if (params.action === "update") return format(await update(params));
	if (params.action === "forget") return `Forgot ${await forget(params)}`;

	let records = await readJsonl(params.action === "review" ? candidatesFile() : memoriesFile());
	if (params.action === "search") {
		const q = requireField(params.query, "query");
		records = records.filter((record) => matches(record, q));
	}
	const empty =
		params.action === "search"
			? "No matching memories."
			: params.action === "review"
				? "No memory candidates."
				: "No memories stored.";
	return formatList(records.slice(0, limit(params.limit)), empty);
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("memory", {
		description: "Show recent approved memories.",
		handler: async (_args: string, ctx: CommandCtx) => {
			try {
				const records = await readJsonl(memoriesFile());
				ctx.ui.notify(formatList(records.slice(0, 10), "No memories stored."), "info");
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.registerCommand("memory-search", {
		description: "Search approved memories.",
		handler: async (args: string, ctx: CommandCtx) => {
			try {
				ctx.ui.notify(await execute({ action: "search", query: args }, ctx.cwd), "info");
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.registerCommand("memory-remember", {
		description: "Remember an explicit durable preference or lesson.",
		handler: async (args: string, ctx: CommandCtx) => {
			try {
				ctx.ui.notify(await execute({ action: "remember", text: args, kind: "preference", pinned: true }, ctx.cwd), "info");
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.registerCommand("memory-review", {
		description: "Show proposed memory candidates.",
		handler: async (_args: string, ctx: CommandCtx) => {
			try {
				const records = await readJsonl(candidatesFile());
				ctx.ui.notify(formatList(records.slice(0, 20), "No memory candidates."), "info");
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.registerTool({
		name: "memory",
		label: "Memory",
		description: "Explicit lightweight persistent memory: list/search/review/remember/propose/approve/update/forget.",
		promptSnippet: MEMORY_PROMPT_SNIPPET,
		promptGuidelines: MEMORY_GUIDELINES,
		parameters: Type.Object({
			action: Type.String({ enum: [...ACTIONS] as string[] }),
			id: Type.Optional(Type.String()),
			query: Type.Optional(Type.String()),
			text: Type.Optional(Type.String()),
			evidence: Type.Optional(Type.String()),
			kind: Type.Optional(Type.String({ enum: [...KINDS] as string[] })),
			scope: Type.Optional(Type.String({ enum: [...SCOPES] as string[] })),
			tags: Type.Optional(Type.String()),
			pinned: Type.Optional(Type.Boolean()),
			limit: Type.Optional(Type.Number()),
		}),
		async execute(_id: string, params: Params, _signal: AbortSignal, _update: unknown, ctx: ToolCtx) {
			try {
				return text(await execute(params, ctx.cwd), { action: params.action });
			} catch (error) {
				return text(error instanceof Error ? error.message : String(error), { code: 2 });
			}
		},
	} as any);
}
