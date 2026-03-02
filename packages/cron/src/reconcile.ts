import { z } from "zod";

const schema = z.object({
	BASE_URL: z.string().url(),
	ADMIN_KEY: z.string().min(1),
	RECONCILE_LIMIT: z.coerce.number().int().min(1).max(500).default(100),
	RECONCILE_MIN_AGE_MINUTES: z.coerce
		.number()
		.int()
		.min(0)
		.max(24 * 60)
		.default(5),
	RECONCILE_WRITER_LIMIT: z.coerce
		.number()
		.int()
		.min(1)
		.max(500)
		.default(50),
	RECONCILE_WRITER_MIN_AGE_MINUTES: z.coerce
		.number()
		.int()
		.min(0)
		.max(24 * 60)
		.default(10),
});

const env = schema.parse(process.env);

export async function syncPendingReconcile() {
	const limit = env.RECONCILE_LIMIT;
	const minAgeMinutes = env.RECONCILE_MIN_AGE_MINUTES;
	const writerLimit = env.RECONCILE_WRITER_LIMIT;
	const writerMinAgeMinutes = env.RECONCILE_WRITER_MIN_AGE_MINUTES;
	const url = new URL("/admin/reconcile/pending", env.BASE_URL);
	url.searchParams.set("limit", String(limit));
	url.searchParams.set("minAgeMinutes", String(minAgeMinutes));
	url.searchParams.set("writerLimit", String(writerLimit));
	url.searchParams.set("writerMinAgeMinutes", String(writerMinAgeMinutes));

	console.log(
		`Calling pending reconcile (entries: limit=${limit}, minAgeMinutes=${minAgeMinutes}; writers: limit=${writerLimit}, minAgeMinutes=${writerMinAgeMinutes})...`,
	);
	const response = await fetch(url.toString(), {
		method: "POST",
		headers: {
			"x-admin-key": env.ADMIN_KEY,
		},
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(
			`Failed to call pending reconcile: ${response.status} ${body || response.statusText}`,
		);
	}

	const data = await response.json();
	console.log("Pending reconcile response:", data);
	return data;
}
