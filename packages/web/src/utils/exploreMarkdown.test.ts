import { describe, expect, test } from "bun:test";
import {
	renderExploreMarkdown,
	type ExploreWriterDetail,
} from "./exploreMarkdown";

const WRITER_ADDRESS = "0xbad5bf2565e6187632571a1feffa1667734aa8c8";

function writerWithStaleCounts(): ExploreWriterDetail {
	return {
		address: WRITER_ADDRESS,
		title: "SimplyTheBeth Ideas",
		admin: "0x30c2bac95e8f3dfa3d6aef1cd43cd72fd227cbf8",
		publicCount: 0,
		privateCount: 0,
		publicWritable: false,
		entries: [
			{
				onChainId: 1,
				version: "br:",
				decompressed: "# Bot_Lyfe\n\nBody",
			},
			{
				onChainId: 0,
				version: "br:",
				decompressed:
					"# Meg Stalter's PR campaign linking Hacks series finale to her debut on Broadway in Oh Mary",
			},
		],
	};
}

describe("renderExploreMarkdown", () => {
	test("counts public entries from writer details instead of stale summary fields", () => {
		const markdown = renderExploreMarkdown({
			origin: "https://www.writer.place",
			writers: [writerWithStaleCounts()],
		});

		expect(markdown).toContain("- Public entries: 2");
		expect(markdown).toContain("- Private entries: 0");
		expect(markdown).not.toContain("- Public entries: 0\n- Private entries: 0");
		expect(markdown).toContain(
			`[Bot_Lyfe](https://www.writer.place/writer/${WRITER_ADDRESS}/1)`,
		);
		expect(markdown).toContain(
			`[Meg Stalter's PR campaign linking Hacks series finale to her debut on Broadway in Oh Mary](https://www.writer.place/writer/${WRITER_ADDRESS}/0)`,
		);
	});

	test("counts encrypted entries separately when details include them", () => {
		const writer = writerWithStaleCounts();
		const markdown = renderExploreMarkdown({
			origin: "https://www.writer.place",
			writers: [
				{
					...writer,
					entries: [
						...(writer.entries ?? []),
						{
							onChainId: 2,
							version: "enc:v5:br:",
							raw: "enc:v5:br:encrypted",
						},
					],
				},
			],
		});

		expect(markdown).toContain("- Public entries: 2");
		expect(markdown).toContain("- Private entries: 1");
	});
});
