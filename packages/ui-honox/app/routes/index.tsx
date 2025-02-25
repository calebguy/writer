import { createRoute } from "honox/factory";
import Counter from "../islands/counter";
import { AppLayout } from "../islands/layouts/app.layout";

export default createRoute((c) => {
	const name = c.req.query("name") ?? "Hono";
	const pathname = c.req.path;
	const location = c.req.url;
	console.log("HELLOW", pathname, location);
	return c.render(
		<AppLayout pathname={pathname}>
			<div>
				<title>{name}</title>
				<h1>Hello, {name}!</h1>
				<div>{pathname}</div>
				<Counter />
			</div>
		</AppLayout>,
	);
});
