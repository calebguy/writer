import { createRoute } from "honox/factory";
import { getWriter } from "../../helpers/api";
import { AppLayout } from "../../islands/layouts/app.layout";
import { Writer } from "../../islands/pages/Writer";
export default createRoute(async (c) => {
	const { address } = c.req.param();
	if (!address) {
		return c.redirect("/");
	}
	const writer = await getWriter(address as `0x${string}`);
	return c.render(
		<AppLayout pathname={c.req.path}>
			<div>
				<title>{address}</title>
				<meta
					name="description"
					content={`there are ${writer.entries.length} writers`}
				/>
				<div>checkout out this page</div>
				<div>{JSON.stringify(writer)}</div>
				<Writer />
			</div>
		</AppLayout>,
	);
});
